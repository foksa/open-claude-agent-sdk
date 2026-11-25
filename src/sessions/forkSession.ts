/**
 * Fork a session into a new transcript with fresh ids — matches the official
 * SDK, including `upToMessageId` slicing and the fork title.
 */

import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ForkSessionOptions, ForkSessionResult } from '../types/index.ts';
import {
  applyDataFlowRow,
  type DataFlow,
  dedupeLineage,
  flowFor,
  isPlainObject,
  isSafeString,
  type Lineage,
  MALFORMED,
  markIncomplete,
  mergeFlows,
  organizationUuid,
  parseDerivedFrom,
  parseOwner,
  sessionLineage,
  UNCOVERED_COMPACTION,
  UNTRACKED_ROW,
} from './dataFlow.ts';
import { HEAD_TAIL_BYTES, projectDirsForMutation, validateUuid } from './paths.ts';
import { readSidecarTitle } from './sessionInfo.ts';
import { firstPromptFromHead, lastTypedField } from './text.ts';
import { buildConversationChain, type ChainEnds, type TranscriptEntry } from './transcript.ts';

type Entry = TranscriptEntry & Record<string, unknown>;

type ParsedTranscript = {
  transcript: Entry[];
  contentReplacements: unknown[];
  relocatedCwd: string | undefined;
  historySuppressed: boolean;
  atisLatch: string | undefined;
  toolsUsed: string[] | undefined;
  dataFlow: DataFlow | undefined;
  derivedFrom: Lineage[] | undefined;
  hybridOrganizations: string[] | undefined;
  owner: ReturnType<typeof parseOwner>;
};

const TRANSCRIPT_TYPES = new Set(['user', 'assistant', 'attachment', 'system', 'progress']);

/** A BOM before a restricted session-owner row is dropped (official `uj`). */
function stripOwnerRowBom(line: string): string {
  return line.includes('"restricted"') &&
    /"type"\s*:\s*"session-owner"/.test(line) &&
    line.startsWith('\uFEFF')
    ? line.slice(1)
    : line;
}

function parseForFork(buf: Buffer, sessionId: string): ParsedTranscript {
  const out: ParsedTranscript = {
    transcript: [],
    contentReplacements: [],
    relocatedCwd: undefined,
    historySuppressed: false,
    atisLatch: undefined,
    toolsUsed: undefined,
    dataFlow: undefined,
    derivedFrom: undefined,
    hybridOrganizations: undefined,
    owner: undefined,
  };
  const flows = new Map<string, DataFlow>();
  const uncoveredCompactions = new Set<unknown>();
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
      entry = JSON.parse(stripOwnerRowBom(buf.toString('utf-8', start, nl)));
      // Official `hj`: one row at a time, in file order
      if (
        typeof entry.type === 'string' &&
        TRANSCRIPT_TYPES.has(entry.type) &&
        typeof entry.uuid === 'string'
      ) {
        out.transcript.push(entry as Entry);
        if (
          entry.type === 'system' &&
          entry.subtype === 'compact_boundary' &&
          entry.isSidechain !== true
        )
          uncoveredCompactions.add(entry.sessionId);
        if (entry.dataFlowOn !== true && !entry.isSidechain)
          for (const flow of flows.values()) markIncomplete(flow, UNTRACKED_ROW);
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
        entry.type === 'tools-used' &&
        entry.sessionId === sessionId &&
        Array.isArray(entry.tools)
      ) {
        out.toolsUsed = entry.tools.filter((t): t is string => typeof t === 'string' && t !== '');
      } else if (
        (entry.type === 'data-flow-records' || entry.type === 'data-flow-incomplete') &&
        typeof entry.sessionId === 'string' &&
        entry.agentId === undefined
      ) {
        applyDataFlowRow(entry, flowFor(flows, entry.sessionId), flows.values());
        if (entry.type === 'data-flow-records' && entry.snapshot === true)
          uncoveredCompactions.delete(entry.sessionId);
      } else if (entry.type === 'derived-from' && entry.sessionId === sessionId) {
        const { sessions, lost } = parseDerivedFrom(entry);
        out.derivedFrom = lost
          ? dedupeLineage([...(out.derivedFrom ?? []), ...sessions])
          : sessions;
        if (lost) markIncomplete(flowFor(flows, sessionId), MALFORMED);
      } else if (entry.type === 'hybrid-organization') {
        const org = organizationUuid(entry.organizationUuid);
        if (org !== undefined)
          out.hybridOrganizations = [...new Set([...(out.hybridOrganizations ?? []), org])];
      } else if (entry.type === 'session-owner') {
        const owner = parseOwner(entry);
        if (owner?.restricted) out.owner ??= owner;
      } else if (
        entry.type === 'content-replacement' &&
        entry.sessionId === sessionId &&
        Array.isArray(entry.replacements)
      ) {
        // v0.3.322: only plain objects are carried over
        out.contentReplacements.push(...entry.replacements.filter(isPlainObject));
      } else if (
        entry.type === 'relocated' &&
        entry.sessionId === sessionId &&
        typeof entry.relocatedCwd === 'string' &&
        entry.relocatedCwd !== ''
      ) {
        out.relocatedCwd = entry.relocatedCwd;
      }
    } catch {}
  }
  // Official `gj`: only when the forked session itself has data flow
  if (flows.has(sessionId)) {
    out.dataFlow = mergeFlows([...flows.values()]);
    if ([...flows.keys()].some((id) => uncoveredCompactions.has(id)))
      markIncomplete(out.dataFlow, UNCOVERED_COMPACTION);
  }
  return out;
}

/** The queued command a row carries: an attachment's, or a voice-call turn's fold (official `N$`). */
function queuedCommand(entry: Entry): Record<string, unknown> | undefined {
  if (entry.type === 'system' && entry.subtype === 'voice_call_talk') {
    const fold = entry.fold;
    return typeof fold === 'object' &&
      fold !== null &&
      'command' in fold &&
      typeof fold.command === 'object' &&
      fold.command !== null
      ? (fold.command as Record<string, unknown>)
      : undefined;
  }
  const att = entry.type === 'attachment' ? entry.attachment : undefined;
  return typeof att === 'object' && att !== null && 'type' in att && att.type === 'queued_command'
    ? (att as Record<string, unknown>)
    : undefined;
}

/** `source_uuid` of a queued command (the id the client sent the prompt with; official `Yu`). */
function queuedSourceUuid(entry: Entry): string | undefined {
  const value = queuedCommand(entry)?.source_uuid;
  return typeof value === 'string' && value ? value : undefined;
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
  summarizedTurnPromptUuids: undefined,
  droppedPromptUuids: undefined,
  // v0.3.323+
  sentAsUuid: undefined,
  rowsAheadOfPutBack: undefined,
  // v0.3.316
  turnAttributionKey: undefined,
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
  // v0.3.323+: `runningTurnSends` is not carried into a fork
  const { preservedMessages, preservedSegment, runningTurnSends, ...rest } = meta;
  if (
    preservedMessages === undefined &&
    preservedSegment === undefined &&
    runningTurnSends === undefined
  )
    return undefined;
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
      ...rest,
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

/** Where a compact boundary's preserved messages hang (official `Ph`). */
function preservedAnchor(entry: Entry): { anchorUuid?: unknown } | undefined {
  const meta = entry.compactMetadata as Record<string, unknown> | undefined;
  if (typeof meta !== 'object' || meta === null) return undefined;
  const messages = 'preservedMessages' in meta ? meta.preservedMessages : undefined;
  const segment = 'preservedSegment' in meta ? meta.preservedSegment : undefined;
  const preserved = messages ?? segment;
  return typeof preserved === 'object' && preserved !== null && 'anchorUuid' in preserved
    ? (preserved as { anchorUuid?: unknown })
    : undefined;
}

/** A compaction that kept nothing and took no time (official `bj`). */
function isEmptyCompaction(entry: Entry): boolean {
  const meta = entry.compactMetadata as Record<string, unknown> | undefined;
  return (
    typeof meta === 'object' &&
    meta !== null &&
    'durationMs' in meta &&
    meta.durationMs === 0 &&
    preservedAnchor(entry)?.anchorUuid === entry.uuid
  );
}

function isRealCompaction(entry: Entry): boolean {
  return (
    entry.type === 'system' && entry.subtype === 'compact_boundary' && !isEmptyCompaction(entry)
  );
}

/**
 * A slice cut at a compaction boundary after its last message ends where
 * that compaction's kept messages do, so the fork keeps the conversation
 * before it (official `uMe`, v0.3.323).
 */
function trimToCompaction(slice: Entry[]): Entry[] {
  const lastMessage = slice.findLastIndex((e) => e.type === 'user' || e.type === 'assistant');
  const at = slice.findIndex((e, i) => i > lastMessage && isRealCompaction(e));
  const boundary = slice[at];
  if (boundary === undefined) return slice;
  const before = slice.slice(0, at);
  const kept = new Set(
    preservedAnchor(boundary)?.anchorUuid === boundary.uuid
      ? []
      : [...preservedUuids(boundary), boundary.logicalParentUuid]
  );
  const lastKept = before.findLastIndex((e) => kept.has(e.uuid));
  const previous = before.findLast((e) => e.type === 'system' && e.subtype === 'compact_boundary');
  const previousAnchor =
    lastKept >= 0 &&
    previous &&
    !isEmptyCompaction(previous) &&
    preservedUuids(previous).includes(before[lastKept]?.uuid)
      ? before.findLastIndex((e) => e.uuid === preservedAnchor(previous)?.anchorUuid)
      : -1;
  const end = Math.max(lastKept, previousAnchor);
  const trimmed = end < 0 ? before : before.slice(0, end + 1);
  return trimmed.some((e) => e.type !== 'progress') ? trimmed : slice;
}

/**
 * A fork cut at a compaction summary doesn't bring back the messages kept
 * after it: compactions anchored at the cut lose their preserved ids
 * (official `pMe`, v0.3.323).
 */
function forgetPreservedAt(uuid: string | undefined, slice: Entry[]): Entry[] {
  return slice.map((e) =>
    isRealCompaction(e) &&
    preservedAnchor(e)?.anchorUuid === uuid &&
    typeof e.compactMetadata === 'object'
      ? {
          ...e,
          compactMetadata: {
            ...e.compactMetadata,
            preservedMessages: undefined,
            preservedSegment: undefined,
            postTokens: undefined,
          },
        }
      : e
  );
}

/** Session whose API request produced an assistant row (official `fj`). */
function requestSessionId(entry: Entry): string | undefined {
  if (entry.type !== 'assistant') return undefined;
  const from = isPlainObject(entry.forkedFrom) ? entry.forkedFrom.sessionId : undefined;
  return [entry.requestSessionId, from, entry.sessionId].find(
    (v): v is string => typeof v === 'string'
  );
}

/** Session a row was forked from (official `lj`). */
function forkedFromSession(entry: Entry): string | undefined {
  return isPlainObject(entry.forkedFrom) && isSafeString(entry.forkedFrom.sessionId)
    ? entry.forkedFrom.sessionId
    : undefined;
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
    entries = leaveOutDeadBranches(
      forgetPreservedAt(entries[cut]?.uuid, trimToCompaction(entries.slice(0, cut + 1)))
    );
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
  for (const organizationUuid of parsed.hybridOrganizations ?? []) {
    out.push({ type: 'hybrid-organization', sessionId: forkedSessionId, organizationUuid });
  }
  if (parsed.owner?.restricted) {
    out.push({ type: 'session-owner', sessionId: forkedSessionId, ...parsed.owner });
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
      ...(remappedSource !== undefined &&
        (entry.type === 'attachment'
          ? { attachment: Object.assign({}, entry.attachment, { source_uuid: remappedSource }) }
          : // v0.3.323+: a voice-call turn carries its queued command in `fold`
            {
              fold: Object.assign({}, entry.fold, {
                command: { ...queuedCommand(entry), source_uuid: remappedSource },
              }),
            })),
      uuid: newIds.get(entry.uuid),
      parentUuid,
      logicalParentUuid:
        logicalParent == null ? logicalParent : (newIds.get(logicalParent) ?? null),
      sessionId: forkedSessionId,
      timestamp: i === messages.length - 1 ? now : entry.timestamp,
      ...FORK_RESET,
      requestSessionId: requestSessionId(entry),
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
  if (parsed.toolsUsed !== undefined) {
    out.push({ type: 'tools-used', sessionId: forkedSessionId, tools: parsed.toolsUsed });
  }
  if (parsed.dataFlow !== undefined) {
    if (parsed.dataFlow.incomplete !== undefined) {
      out.push({
        type: 'data-flow-incomplete',
        v: 1,
        sessionId: forkedSessionId,
        codes: parsed.dataFlow.incomplete,
      });
    }
    out.push({
      type: 'data-flow-records',
      v: 1,
      sessionId: forkedSessionId,
      records: parsed.dataFlow.records,
      snapshot: true,
    });
  }
  if (parsed.dataFlow !== undefined || parsed.derivedFrom !== undefined) {
    const lineage = dedupeLineage(parsed.derivedFrom ?? []);
    const known = new Set(lineage.map((l) => l.id));
    for (const entry of parsed.transcript) {
      const from = forkedFromSession(entry);
      if (from !== undefined && !known.has(from)) {
        known.add(from);
        lineage.push(sessionLineage(from, 'fork'));
      }
    }
    out.push({
      type: 'derived-from',
      v: 1,
      sessionId: forkedSessionId,
      sessions: dedupeLineage([...lineage, sessionLineage(sessionId, 'fork')]),
    });
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
      const tailTitle = lastTypedField(tail, 'custom-title');
      return (
        (tailTitle !== undefined
          ? tailTitle
          : (sidecarTitle ?? lastTypedField(head, 'custom-title'))) ||
        lastTypedField(tail, 'ai-title') ||
        lastTypedField(head, 'ai-title') ||
        firstPromptFromHead(head)
      );
    }
  );
  await writeJsonl(join(found.projectDir, `${forkedSessionId}.jsonl`), entries);
  return { sessionId: forkedSessionId };
}
