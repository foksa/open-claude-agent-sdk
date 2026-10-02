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
import { buildConversationChain, type ChainEnds, type TranscriptEntry } from './transcript.ts';

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

/** Fields reset on every forked entry (official SDK). */
const FORK_RESET = {
  isSidechain: false,
  teamName: undefined,
  agentName: undefined,
  sessionKind: undefined,
  slug: undefined,
  sourceToolAssistantUUID: undefined,
};

/** The message uuids a compact boundary preserved. */
function preservedUuids(entry: Entry): unknown[] {
  const meta = entry.compactMetadata as Record<string, unknown> | undefined;
  if (typeof meta !== 'object' || meta === null) return [];
  const messages = 'preservedMessages' in meta ? meta.preservedMessages : undefined;
  const segment = 'preservedSegment' in meta ? meta.preservedSegment : undefined;
  return [
    ...(typeof messages === 'object' &&
    messages !== null &&
    'uuids' in messages &&
    Array.isArray(messages.uuids)
      ? messages.uuids
      : []),
    ...(typeof segment === 'object' && segment !== null
      ? [
          'headUuid' in segment ? segment.headUuid : undefined,
          'tailUuid' in segment ? segment.tailUuid : undefined,
        ]
      : []),
  ];
}

/**
 * Leave out of a sliced transcript what isn't on the way to its last entry
 * and came after the chain started: compact boundaries whose preserved
 * messages are all off that path, and branches that would otherwise still
 * end the conversation (a rewound-away retry, a progress row or fork briefing
 * after a rewind). Mirrors the official SDK (v0.3.284).
 */
function leaveOutDeadBranches(slice: Entry[]): Entry[] {
  const last = slice.at(-1);
  if (!last) return slice;
  const asMain = slice.map((e) => ({ ...e, ...FORK_RESET }));
  const chain = buildConversationChain([
    ...asMain,
    {
      type: 'system',
      uuid: randomUUID(),
      parentUuid: last.uuid,
      sessionId: last.sessionId,
      timestamp: last.timestamp,
    },
  ]);
  const index = new Map<string, number>();
  slice.forEach((e, i) => {
    if (!index.has(e.uuid)) index.set(e.uuid, i);
  });
  const start = chain[0] && index.get(chain[0].uuid);
  if (start === undefined) return slice;

  const chainIds = new Set(chain.map((e) => e.uuid));
  const byUuid = new Map(slice.map((e) => [e.uuid, e]));
  const live = new Set<string>();
  for (const uuid of [last.uuid, ...chainIds]) {
    for (
      let e = byUuid.get(uuid);
      e && !live.has(e.uuid);
      e = e.parentUuid ? byUuid.get(e.parentUuid) : undefined
    ) {
      live.add(e.uuid);
    }
  }
  const leftOut = new Set<string>();
  const isDead = (e: TranscriptEntry) => !live.has(e.uuid) && (index.get(e.uuid) ?? start) >= start;
  const leaveOut = (from: TranscriptEntry) => {
    for (
      let e = byUuid.get(from.uuid);
      e && isDead(e) && !leftOut.has(e.uuid);
      e = e.parentUuid ? byUuid.get(e.parentUuid) : undefined
    ) {
      leftOut.add(e.uuid);
    }
    for (const e of slice) if (e.parentUuid && leftOut.has(e.parentUuid)) leftOut.add(e.uuid);
  };

  for (const e of slice) {
    if (
      e.type === 'system' &&
      e.subtype === 'compact_boundary' &&
      isDead(e) &&
      !preservedUuids(e).some((u) => typeof u === 'string' && live.has(u))
    ) {
      leaveOut(e);
    }
  }
  // Until the remaining rows rebuild exactly the chain, drop the dead branch
  // that ends the conversation instead
  for (;;) {
    const ends: ChainEnds = {};
    const rebuilt = buildConversationChain(
      asMain.filter((e) => !leftOut.has(e.uuid)),
      ends
    );
    if (rebuilt.length === chainIds.size && rebuilt.every((e) => chainIds.has(e.uuid))) break;
    if (!ends.terminal || !isDead(ends.terminal)) break;
    leaveOut(ends.terminal);
  }
  return leftOut.size === 0 ? slice : slice.filter((e) => !leftOut.has(e.uuid));
}

/** Point a compact boundary's preserved-message ids at the forked uuids. */
function remapCompactMetadata(entry: Entry, ids: Map<string, string>): Partial<Entry> | undefined {
  const meta = entry.compactMetadata as Record<string, unknown> | undefined;
  if (entry.type !== 'system' || typeof meta !== 'object' || meta === null || Array.isArray(meta))
    return undefined;
  const { preservedMessages, preservedSegment } = meta;
  if (preservedMessages === undefined && preservedSegment === undefined) return undefined;
  const map = (v: unknown) => (typeof v === 'string' ? (ids.get(v) ?? v) : v);
  const remap = (value: unknown, keys: string[]) => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return value;
    const out: Record<string, unknown> = { ...value };
    for (const key of keys) {
      const v = out[key];
      if (key in out) out[key] = Array.isArray(v) ? v.map(map) : map(v);
    }
    return out;
  };
  return {
    compactMetadata: {
      ...meta,
      ...(preservedMessages !== undefined && {
        preservedMessages: remap(preservedMessages, ['anchorUuid', 'uuids', 'allUuids']),
      }),
      ...(preservedSegment !== undefined && {
        preservedSegment: remap(preservedSegment, ['headUuid', 'anchorUuid', 'tailUuid']),
      }),
    },
  } as Partial<Entry>;
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
    entries = leaveOutDeadBranches(entries.slice(0, cut + 1));
  }

  const newIds = new Map<string, string>();
  for (const e of entries) newIds.set(e.uuid, randomUUID());
  const messages = entries.filter((e) => e.type !== 'progress');
  const messageIds = new Map(messages.map((e) => [e.uuid, newIds.get(e.uuid) as string]));
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
      ...remapCompactMetadata(entry, messageIds),
      ...(remappedSource !== undefined && {
        attachment: Object.assign({}, entry.attachment, { source_uuid: remappedSource }),
      }),
      uuid: newIds.get(entry.uuid),
      parentUuid,
      logicalParentUuid:
        logicalParent == null ? logicalParent : (newIds.get(logicalParent) ?? null),
      sessionId: forkedSessionId,
      timestamp: i === messages.length - 1 ? now : entry.timestamp,
      ...FORK_RESET,
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
