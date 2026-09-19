/**
 * Fork a session into a new transcript with fresh ids — matches the official
 * SDK, including `upToMessageId` slicing and the fork title.
 */

import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ForkSessionOptions, ForkSessionResult } from '../types/index.ts';
import { HEAD_TAIL_BYTES, projectDirsForMutation, validateUuid } from './paths.ts';
import { readSidecarTitle } from './sessionInfo.ts';
import { firstPromptFromHead, lastStringField } from './text.ts';
import { buildConversationChain, type TranscriptEntry } from './transcript.ts';

type Entry = TranscriptEntry & Record<string, unknown>;

type ParsedTranscript = {
  transcript: Entry[];
  contentReplacements: unknown[];
  relocatedCwd: string | undefined;
  historySuppressed: boolean;
  atisLatch: string | undefined;
};

const TRANSCRIPT_TYPES = new Set(['user', 'assistant', 'attachment', 'system', 'progress']);

function parseForFork(buf: Buffer, sessionId: string): ParsedTranscript {
  const out: ParsedTranscript = {
    transcript: [],
    contentReplacements: [],
    relocatedCwd: undefined,
    historySuppressed: false,
    atisLatch: undefined,
  };
  let pos = 0;
  while (pos < buf.length) {
    let nl = buf.indexOf(10, pos);
    if (nl === -1) nl = buf.length;
    let start = pos;
    while (start < nl && buf[start] <= 32) start++;
    pos = nl + 1;
    if (start >= nl) continue;
    let entry: Record<string, unknown>;
    try {
      entry = JSON.parse(buf.toString('utf-8', start, nl));
    } catch {
      continue;
    }
    if (
      typeof entry.type === 'string' &&
      TRANSCRIPT_TYPES.has(entry.type) &&
      typeof entry.uuid === 'string'
    ) {
      out.transcript.push(entry as Entry);
    } else if (entry.type === 'history-suppression') {
      out.historySuppressed = true;
    } else if (
      entry.type === 'atis-latch' &&
      entry.sessionId === sessionId &&
      typeof entry.atis === 'string' &&
      /^[\x21-\x7e]*$/.test(entry.atis)
    ) {
      out.atisLatch = entry.atis;
    } else if (
      entry.type === 'content-replacement' &&
      entry.sessionId === sessionId &&
      Array.isArray(entry.replacements)
    ) {
      out.contentReplacements.push(...entry.replacements);
    } else if (
      entry.type === 'relocated' &&
      entry.sessionId === sessionId &&
      typeof entry.relocatedCwd === 'string' &&
      entry.relocatedCwd !== ''
    ) {
      out.relocatedCwd = entry.relocatedCwd;
    }
  }
  return out;
}

/** `source_uuid` of a queued-command attachment (the id the client sent the prompt with). */
function queuedSourceUuid(entry: Entry): string | undefined {
  const att =
    entry.type === 'attachment'
      ? (entry.attachment as Record<string, unknown> | undefined)
      : undefined;
  return typeof att === 'object' &&
    att !== null &&
    att.type === 'queued_command' &&
    typeof att.source_uuid === 'string' &&
    att.source_uuid
    ? att.source_uuid
    : undefined;
}

/** Index of the entry with `uuid`, falling back to a queued command's client-supplied id. */
function indexOfMessage(entries: Entry[], uuid: string): number {
  const direct = entries.findIndex((e) => e.uuid === uuid);
  return direct !== -1 ? direct : entries.findIndex((e) => queuedSourceUuid(e) === uuid);
}

function isVisibleMessage(e: Entry): boolean {
  return (e.type === 'user' || e.type === 'assistant') && !e.isMeta && !e.teamName;
}

/**
 * When the slice ends mid-branch (after an abandoned retry, say), drop
 * visible messages from other branches that came after the chain started.
 */
function pruneOtherBranches(
  slice: Entry[],
  chain: Entry[],
  firstIndex: Map<string, number>
): Entry[] {
  const last = slice.at(-1);
  const chainStart = chain[0] && firstIndex.get(chain[0].uuid);
  if (!last || isVisibleMessage(last) || chainStart === undefined) return slice;

  const byUuid = new Map(slice.map((e) => [e.uuid, e]));
  const keep = new Set(chain.map((e) => e.uuid));
  for (
    let e: Entry | undefined = last;
    e && !keep.has(e.uuid);
    e = e.parentUuid ? byUuid.get(e.parentUuid) : undefined
  ) {
    keep.add(e.uuid);
  }
  const lastKept = slice.findLastIndex((e) => isVisibleMessage(e) && keep.has(e.uuid));
  const drop = new Set<string>();
  for (const e of slice.slice(lastKept + 1)) {
    if (!isVisibleMessage(e) || keep.has(e.uuid)) continue;
    for (
      let u: Entry | undefined = e;
      u &&
      !keep.has(u.uuid) &&
      !drop.has(u.uuid) &&
      (firstIndex.get(u.uuid) ?? chainStart) >= chainStart;
      u = u.parentUuid ? byUuid.get(u.parentUuid) : undefined
    ) {
      drop.add(u.uuid);
    }
  }
  if (drop.size === 0) return slice;
  for (const e of slice) if (e.parentUuid && drop.has(e.parentUuid)) drop.add(e.uuid);
  return slice.filter((e) => !drop.has(e.uuid));
}

/** Remap `nameOnlyAnnouncements` ids of a deferred-tools record. */
function remapDeferredTools(entry: Entry, ids: Map<string, string>): Partial<Entry> | undefined {
  const att = entry.attachment as Record<string, unknown> | undefined;
  if (entry.type !== 'attachment' || typeof att !== 'object' || att === null) return undefined;
  if (att.type !== 'deferred_tools_record') return undefined;
  const announcements = att.nameOnlyAnnouncements;
  if (!Array.isArray(announcements)) return undefined;
  return {
    attachment: {
      ...att,
      nameOnlyAnnouncements: announcements.flatMap((id) =>
        typeof id === 'string' && ids.has(id) ? [ids.get(id)] : []
      ),
    },
  };
}

function buildForkEntries(
  parsed: ParsedTranscript,
  sessionId: string,
  options: ForkSessionOptions,
  defaultTitle: () => string | undefined
): { entries: Record<string, unknown>[]; forkedSessionId: string } {
  let entries = parsed.transcript.filter((e) => !e.isSidechain);
  if (entries.length === 0) throw new Error(`Session ${sessionId} has no messages to fork`);

  const upTo = options.upToMessageId;
  if (upTo) {
    const chain = buildConversationChain(entries) as Entry[];
    const firstIndex = new Map<string, number>();
    entries.forEach((e, i) => {
      if (!firstIndex.has(e.uuid)) firstIndex.set(e.uuid, i);
    });
    let chainEnd = -1;
    for (const e of chain) chainEnd = Math.max(chainEnd, firstIndex.get(e.uuid) ?? -1);
    const searchable = chain.concat(entries.slice(chainEnd + 1));
    const target = searchable[indexOfMessage(searchable, upTo)];
    const cut = target ? (firstIndex.get(target.uuid) ?? -1) : indexOfMessage(entries, upTo);
    if (cut === -1) throw new Error(`Message ${upTo} not found in session ${sessionId}`);
    entries = pruneOtherBranches(entries.slice(0, cut + 1), chain, firstIndex);
  }

  const newIds = new Map<string, string>();
  for (const e of entries) newIds.set(e.uuid, randomUUID());
  const messages = entries.filter((e) => e.type !== 'progress');
  if (messages.length === 0) throw new Error(`Session ${sessionId} has no messages to fork`);

  const byUuid = new Map<string, Entry>();
  for (const e of entries) byUuid.set(e.uuid, e);

  const forkedSessionId = randomUUID();
  const now = new Date().toISOString();
  const out: Record<string, unknown>[] = [];
  if (parsed.historySuppressed) {
    out.push({
      type: 'history-suppression',
      sessionId: forkedSessionId,
      cause: 'fork_inherit',
      ts: new Date().toISOString(),
    });
  }

  for (let i = 0; i < messages.length; i++) {
    const entry = messages[i];
    // Parent is the nearest non-progress ancestor (progress entries are dropped)
    let parentUuid: string | null = null;
    let cursor = entry.parentUuid;
    let visited: Set<string> | undefined;
    while (cursor) {
      const ancestor = byUuid.get(cursor);
      if (!ancestor) break;
      if (ancestor.type !== 'progress') {
        parentUuid = newIds.get(cursor) ?? null;
        break;
      }
      visited ??= new Set();
      if (visited.has(ancestor.uuid)) {
        parentUuid = newIds.get(ancestor.uuid) ?? null;
        break;
      }
      visited.add(ancestor.uuid);
      cursor = ancestor.parentUuid;
    }

    const logicalParent = entry.logicalParentUuid as string | null | undefined;
    const sourceUuid = queuedSourceUuid(entry);
    const remappedSource = sourceUuid === undefined ? undefined : newIds.get(sourceUuid);
    out.push({
      ...entry,
      ...(entry.type === 'system' && entry.subtype === 'model_refusal_fallback'
        ? { neutralizedByFork: true }
        : undefined),
      ...remapDeferredTools(entry, newIds),
      ...(remappedSource !== undefined && {
        attachment: Object.assign({}, entry.attachment, { source_uuid: remappedSource }),
      }),
      uuid: newIds.get(entry.uuid),
      parentUuid,
      logicalParentUuid:
        logicalParent == null ? logicalParent : (newIds.get(logicalParent) ?? null),
      sessionId: forkedSessionId,
      timestamp: i === messages.length - 1 ? now : entry.timestamp,
      isSidechain: false,
      teamName: undefined,
      agentName: undefined,
      sessionKind: undefined,
      slug: undefined,
      sourceToolAssistantUUID: undefined,
      forkedFrom: { sessionId, messageUuid: entry.uuid },
    });
  }

  if (parsed.contentReplacements.length > 0) {
    out.push({
      type: 'content-replacement',
      sessionId: forkedSessionId,
      replacements: parsed.contentReplacements,
      uuid: randomUUID(),
      timestamp: now,
    });
  }
  if (parsed.atisLatch !== undefined) {
    out.push({ type: 'atis-latch', sessionId: forkedSessionId, atis: parsed.atisLatch });
  }
  if (parsed.relocatedCwd) {
    out.push({ type: 'relocated', sessionId: forkedSessionId, relocatedCwd: parsed.relocatedCwd });
  }

  let title = options.title?.trim();
  if (!title) title = `${defaultTitle() || 'Forked session'} (fork)`;
  out.push({
    type: 'custom-title',
    sessionId: forkedSessionId,
    customTitle: title,
    uuid: randomUUID(),
    timestamp: now,
  });
  return { entries: out, forkedSessionId };
}

async function readTranscript(
  sessionId: string,
  dir: string | undefined
): Promise<{ buf: Buffer; projectDir: string } | null> {
  for (const projectDir of await projectDirsForMutation(dir)) {
    try {
      const buf = await readFile(join(projectDir, `${sessionId}.jsonl`));
      if (buf.length > 0) return { buf, projectDir };
    } catch {}
  }
  return null;
}

async function writeJsonl(filePath: string, entries: Record<string, unknown>[]): Promise<void> {
  const stream = createWriteStream(filePath, { mode: 0o600, flags: 'w' });
  const done = new Promise<void>((resolve, reject) => {
    stream.once('finish', resolve);
    stream.once('error', reject);
  });
  // `done` rejects on stream errors; every wait races it so a failure while
  // backpressured (ENOSPC, EACCES) surfaces instead of hanging on a 'drain'
  // that will never fire
  done.catch(() => {});
  try {
    for (const entry of entries) {
      if (!stream.write(`${JSON.stringify(entry)}\n`)) {
        await Promise.race([new Promise<void>((resolve) => stream.once('drain', resolve)), done]);
      }
    }
    stream.end();
    await done;
  } catch (err) {
    stream.destroy();
    throw err;
  }
}

export async function forkSession(
  sessionId: string,
  options: ForkSessionOptions = {}
): Promise<ForkSessionResult> {
  if (!validateUuid(sessionId)) throw new Error(`Invalid sessionId: ${sessionId}`);
  const found = await readTranscript(sessionId, options.dir);
  if (!found) {
    throw new Error(
      options.dir
        ? `Session ${sessionId} not found in project directory for ${options.dir}`
        : `Session ${sessionId} not found`
    );
  }
  const sidecarTitle = await readSidecarTitle(
    join(found.projectDir, `${sessionId}.jsonl`),
    sessionId
  );
  const { buf } = found;
  const { entries, forkedSessionId } = buildForkEntries(
    parseForFork(buf, sessionId),
    sessionId,
    options,
    () => {
      const head = buf.toString('utf-8', 0, Math.min(buf.length, HEAD_TAIL_BYTES));
      const tail = buf.toString('utf-8', Math.max(0, buf.length - HEAD_TAIL_BYTES));
      const tailTitle = lastStringField(tail, 'customTitle');
      return (
        (tailTitle !== undefined
          ? tailTitle
          : (sidecarTitle ?? lastStringField(head, 'customTitle'))) ||
        lastStringField(tail, 'aiTitle') ||
        lastStringField(head, 'aiTitle') ||
        firstPromptFromHead(head)
      );
    }
  );
  await writeJsonl(join(found.projectDir, `${forkedSessionId}.jsonl`), entries);
  return { sessionId: forkedSessionId };
}
