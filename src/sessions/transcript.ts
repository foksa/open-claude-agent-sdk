/**
 * Transcript parsing and conversation-chain reconstruction, shared by
 * getSessionMessages, getSubagentMessages and forkSession.
 *
 * Mirrors the official SDK: builds the chain via parentUuid links, re-links
 * compaction-preserved messages, merges parallel tool-use siblings, and
 * surfaces queued commands Claude read as user messages.
 */

import type { SessionMessage } from '../types/index.ts';

/**
 * JSONL entry with fields we need for chain building.
 */
export interface TranscriptEntry {
  type: string;
  uuid: string;
  parentUuid?: string;
  sessionId?: string;
  timestamp?: string;
  subtype?: string;
  compactMetadata?: {
    preservedMessages?: { uuids: string[]; anchorUuid: string };
    preservedSegment?: { headUuid: string; anchorUuid: string; tailUuid: string };
  };
  message?: unknown;
  attachment?: unknown;
  origin?: Origin;
  promptSource?: unknown;
  isSidechain?: boolean;
  isMeta?: boolean;
  isCompactSummary?: boolean;
  isVisibleInTranscriptOnly?: boolean;
  interruptedByShutdown?: boolean;
  isQueuedCommand?: boolean;
  isCompletedLocalCommand?: boolean;
  toolDenialUnanswered?: unknown;
  teamName?: string;
  /** v0.3.323+: host-run tool calls (`hostHiddenToolUseIds`, `ranByToolUseId`, …) */
  [key: string]: unknown;
}

export type Origin = {
  kind: string;
  subkind?: unknown;
  fireReason?: unknown;
  [key: string]: unknown;
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * A voice call's spoken turn (`system`/`voice_call_talk`) read as the user
 * message it stands for, or as the queued command it folded into (official
 * `gu`, v0.3.323+). Anything else comes back unchanged.
 */
export function voiceCallTalkAsMessage(entry: unknown): unknown {
  if (!isPlainObject(entry) || entry.type !== 'system' || entry.subtype !== 'voice_call_talk')
    return entry;
  const { subtype: _s, level: _l, msgV: _m, content, blocks, fold, ...rest } = entry;
  if (
    typeof content !== 'string' ||
    !isPlainObject(rest.origin) ||
    rest.origin.kind !== 'voice-call'
  )
    return entry;
  const spoken = Array.isArray(blocks) ? blocks : content;
  if (fold === undefined)
    return { ...rest, type: 'user', message: { role: 'user', content: spoken } };
  if (!isPlainObject(fold) || !isPlainObject(fold.command)) return entry;
  const { isMeta: _meta, origin, ...fields } = rest;
  const { command, ...foldRest } = fold;
  return {
    ...foldRest,
    ...fields,
    type: 'attachment',
    attachment: { ...command, type: 'queued_command', prompt: spoken, origin },
  };
}

/**
 * A row the host wrote for a tool call it ran on Claude's behalf
 * (official `qu`, v0.3.323+).
 */
export type HostRow = Record<string, unknown> & { type: 'host-row'; ranByToolUseId: string };

export function isHostRow(entry: unknown): entry is HostRow {
  return (
    isPlainObject(entry) && entry.type === 'host-row' && typeof entry.ranByToolUseId === 'string'
  );
}

/**
 * Parse JSONL content into transcript entries.
 * Only keeps entries that have a uuid and a relevant type; host rows go to
 * `hostRows` when given.
 */
export function parseTranscript(
  content: string,
  deliveries?: DeliveryState,
  hostRows?: HostRow[]
): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  let offset = 0;
  const len = content.length;

  while (offset < len) {
    const nlIdx = content.indexOf('\n', offset);
    const end = nlIdx >= 0 ? nlIdx : len;
    const line = content.substring(offset, end).trim();
    offset = end + 1;

    if (!line) continue;

    try {
      const entry = voiceCallTalkAsMessage(JSON.parse(line)) as Record<string, unknown>;
      if (
        typeof entry.type === 'string' &&
        MAIN_TYPES.has(entry.type) &&
        typeof entry.uuid === 'string'
      ) {
        entries.push(entry as TranscriptEntry);
      } else if (hostRows && isHostRow(entry)) {
        hostRows.push(entry);
      }
      if (deliveries && typeof entry === 'object' && entry !== null) {
        trackDelivery(entry, deliveries);
      }
    } catch {
      // skip malformed lines
    }
  }
  return entries;
}

const MAIN_TYPES: ReadonlySet<string> = new Set([
  'user',
  'assistant',
  'progress',
  'system',
  'attachment',
]);

// ============================================================================
// Mid-turn deliveries (v0.3.285)
// ============================================================================

/**
 * Which queued messages the CLI absorbed into a running turn, gathered from
 * `queue-operation` remove/absorbed_mid_turn rows while parsing. A message
 * absorbed this way was read by Claude even if no reply follows it (the
 * process stopped, or another prompt came next). Mirrors the official SDK.
 */
export type DeliveryState = {
  counts: Map<string, number>;
  copies: Map<string, string>;
  mixed: Set<string>;
  deliveryCopies: Map<string, string[]>;
  deliveryCopyUuids: Set<string>;
};

export function createDeliveryState(): DeliveryState {
  return {
    counts: new Map(),
    copies: new Map(),
    mixed: new Set(),
    deliveryCopies: new Map(),
    deliveryCopyUuids: new Set(),
  };
}

const deliveryKey = (id: string) => `delivery:${id}`;
const uuidKey = (id: string) => `uuid:${id}`;
const entryKey = (id: string) => `entry:${id}`;

/** A non-empty string field of a queued-command attachment. */
function queuedCommandField(
  entry: { type?: unknown; attachment?: unknown },
  field: 'delivery_id' | 'source_uuid'
): string | undefined {
  const att = entry.type === 'attachment' ? entry.attachment : undefined;
  if (
    typeof att !== 'object' ||
    att === null ||
    (att as { type?: unknown }).type !== 'queued_command'
  )
    return undefined;
  const value = (att as Record<string, unknown>)[field];
  return typeof value === 'string' && value ? value : undefined;
}

function trackDelivery(entry: Record<string, unknown>, state: DeliveryState): void {
  if (
    entry.type === 'queue-operation' &&
    entry.operation === 'remove' &&
    entry.reason === 'absorbed_mid_turn' &&
    (typeof entry.deliveryId === 'string' || typeof entry.commandUuid === 'string')
  ) {
    const key =
      typeof entry.deliveryId === 'string' && entry.deliveryId !== ''
        ? deliveryKey(entry.deliveryId)
        : typeof entry.commandUuid === 'string'
          ? uuidKey(entry.commandUuid)
          : undefined;
    if (key !== undefined) state.counts.set(key, (state.counts.get(key) ?? 0) + 1);
    return;
  }
  if (typeof entry.type !== 'string' || typeof entry.uuid !== 'string') return;
  const deliveryId = queuedCommandField(entry, 'delivery_id');
  if (deliveryId !== undefined) {
    if (!state.deliveryCopyUuids.has(entry.uuid)) {
      state.deliveryCopyUuids.add(entry.uuid);
      const key = deliveryKey(deliveryId);
      const copies = state.deliveryCopies.get(key);
      if (copies) copies.push(entry.uuid);
      else state.deliveryCopies.set(key, [entry.uuid]);
    }
    return;
  }
  const sourceUuid = queuedCommandField(entry, 'source_uuid');
  if (sourceUuid === undefined) return;
  let serialized: string;
  try {
    serialized = JSON.stringify(entry.attachment);
  } catch {
    state.mixed.add(sourceUuid);
    return;
  }
  const previous = state.copies.get(sourceUuid);
  if (previous === undefined) state.copies.set(sourceUuid, serialized);
  else if (previous !== serialized) state.mixed.add(sourceUuid);
}

/** Finish tracking: counts keyed by delivery/uuid, plus `entry:<uuid>` for delivered copies. */
export function finishDeliveries(state: DeliveryState): Map<string, number> {
  for (const uuid of state.mixed) state.counts.delete(uuidKey(uuid));
  for (const [key, uuids] of state.deliveryCopies) {
    const count = state.counts.get(key) ?? 0;
    for (const uuid of uuids.slice(Math.max(0, uuids.length - count))) {
      state.counts.set(entryKey(uuid), 1);
    }
  }
  return state.counts;
}

/**
 * Per chain index, whether a queued command was absorbed mid-turn. With a
 * delivery id each copy is judged on its own; otherwise the last `count`
 * copies of a source uuid count as delivered.
 */
function deliveredReads(
  chain: TranscriptEntry[],
  delivered: Map<string, number> | undefined
): Map<number, boolean> {
  const result = new Map<number, boolean>();
  if (delivered === undefined || delivered.size === 0) return result;
  const indicesByKey = new Map<string, number[]>();
  chain.forEach((entry, i) => {
    const deliveryId = queuedCommandField(entry, 'delivery_id');
    const sourceUuid = queuedCommandField(entry, 'source_uuid');
    const key =
      deliveryId !== undefined
        ? deliveryKey(deliveryId)
        : sourceUuid !== undefined
          ? uuidKey(sourceUuid)
          : undefined;
    if (key === undefined || !delivered.has(key)) return;
    const indices = indicesByKey.get(key);
    if (indices) indices.push(i);
    else indicesByKey.set(key, [i]);
  });
  for (const [key, indices] of indicesByKey) {
    if (key.startsWith('delivery:')) {
      for (const i of indices) result.set(i, delivered.has(entryKey(chain[i].uuid)));
      continue;
    }
    const count = delivered.get(key) as number;
    indices.forEach((i, n) => {
      result.set(i, n >= indices.length - count);
    });
  }
  return result;
}

/**
 * Re-link messages a compaction preserved so the chain walks through them
 * instead of stopping at the compact boundary (mirrors official SDK).
 */
function relinkCompactedMessages(byUuid: Map<string, TranscriptEntry>): void {
  for (const entry of [...byUuid.values()]) {
    if (entry.type !== 'system' || entry.subtype !== 'compact_boundary') continue;
    const preserved = entry.compactMetadata?.preservedMessages;
    const segment = entry.compactMetadata?.preservedSegment;
    if (preserved) {
      if (preserved.uuids.length === 0 || preserved.uuids.some((u) => !byUuid.has(u))) continue;
      let parent = preserved.anchorUuid;
      for (const uuid of preserved.uuids) {
        const msg = byUuid.get(uuid) as TranscriptEntry;
        byUuid.set(uuid, { ...msg, parentUuid: parent });
        parent = uuid;
      }
      const first = preserved.uuids[0];
      const last = preserved.uuids[preserved.uuids.length - 1];
      for (const [uuid, msg] of byUuid) {
        if (msg.parentUuid === preserved.anchorUuid && uuid !== first) {
          byUuid.set(uuid, { ...msg, parentUuid: last });
        }
      }
    } else if (segment) {
      const head = byUuid.get(segment.headUuid);
      if (head) byUuid.set(segment.headUuid, { ...head, parentUuid: segment.anchorUuid });
      for (const [uuid, msg] of byUuid) {
        if (msg.parentUuid === segment.anchorUuid && uuid !== segment.headUuid) {
          byUuid.set(uuid, { ...msg, parentUuid: segment.tailUuid });
        }
      }
    }
  }
}

function assistantMessageId(entry: TranscriptEntry): string | undefined {
  if (entry.type !== 'assistant') return undefined;
  const message = entry.message;
  if (typeof message !== 'object' || message === null) return undefined;
  const id = (message as { id?: unknown }).id;
  return typeof id === 'string' ? id : undefined;
}

/**
 * Parallel tool calls are written as one assistant entry per content block,
 * all sharing a `message.id`, each followed by its own tool result — so they
 * form sibling branches and the chain walk keeps only one. Re-insert the
 * off-chain siblings and their tool results after the on-chain entry for that
 * message id (mirrors official SDK).
 */
function mergeParallelToolUses(
  byUuid: Map<string, TranscriptEntry>,
  chain: TranscriptEntry[],
  inChain: Set<string>
): TranscriptEntry[] {
  const chainAssistants = chain.filter((e) => e.type === 'assistant');
  if (chainAssistants.length === 0) return chain;

  // message.id → last on-chain assistant entry with that id
  const anchorById = new Map<string, TranscriptEntry>();
  for (const entry of chainAssistants) {
    const id = assistantMessageId(entry);
    if (id) anchorById.set(id, entry);
  }

  const siblingsById = new Map<string, TranscriptEntry[]>();
  const toolResultsByParent = new Map<string, TranscriptEntry[]>();
  for (const entry of byUuid.values()) {
    const id = assistantMessageId(entry);
    if (id) {
      const list = siblingsById.get(id);
      if (list) list.push(entry);
      else siblingsById.set(id, [entry]);
    } else if (isToolResultMessage(entry)) {
      const parent = entry.parentUuid as string;
      const list = toolResultsByParent.get(parent);
      if (list) list.push(entry);
      else toolResultsByParent.set(parent, [entry]);
    }
  }

  const handled = new Set<string>();
  const insertAfter = new Map<string, TranscriptEntry[]>();
  let inserted = 0;
  for (const entry of chainAssistants) {
    const id = assistantMessageId(entry);
    if (!id || handled.has(id)) continue;
    handled.add(id);

    const siblings = siblingsById.get(id) ?? [entry];
    const offChainSiblings = siblings.filter((s) => !inChain.has(s.uuid));
    const offChainResults: TranscriptEntry[] = [];
    for (const sibling of siblings) {
      for (const result of toolResultsByParent.get(sibling.uuid) ?? []) {
        if (!inChain.has(result.uuid)) offChainResults.push(result);
      }
    }
    if (offChainSiblings.length === 0 && offChainResults.length === 0) continue;

    const byTimestamp = (a: TranscriptEntry, b: TranscriptEntry) =>
      (a.timestamp ?? '').localeCompare(b.timestamp ?? '');
    offChainSiblings.sort(byTimestamp);
    offChainResults.sort(byTimestamp);

    const extra = [...offChainSiblings, ...offChainResults];
    for (const e of extra) inChain.add(e.uuid);
    inserted += extra.length;
    insertAfter.set((anchorById.get(id) as TranscriptEntry).uuid, extra);
  }
  if (inserted === 0) return chain;

  const merged: TranscriptEntry[] = [];
  for (const entry of chain) {
    merged.push(entry);
    const extra = insertAfter.get(entry.uuid);
    if (extra) merged.push(...extra);
  }
  return merged;
}

/**
 * Build the main conversation chain from transcript entries.
 *
 * Algorithm (mirrors official SDK):
 * 1. Build uuid→entry and uuid→index maps; re-link compaction-preserved messages
 * 2. Find leaf nodes (entries not referenced as parentUuid by anything)
 * 3. From each leaf, walk up via parentUuid to find nearest user/assistant entry
 * 4. Select the best leaf: prefer non-sidechain/non-team/non-meta, highest index
 * 5. Walk from best leaf back to root via parentUuid links
 * 6. Re-insert parallel tool-use siblings the walk skipped
 */
export function buildConversationChain(
  entries: TranscriptEntry[],
  found?: ChainEnds
): TranscriptEntry[] {
  const byUuid = new Map<string, TranscriptEntry>();
  for (const entry of entries) byUuid.set(entry.uuid, entry);
  relinkCompactedMessages(byUuid);

  const indexByUuid = new Map<string, number>();
  for (let i = 0; i < entries.length; i++) indexByUuid.set(entries[i].uuid, i);

  // Find parent UUIDs (entries that are referenced as parentUuid)
  const parentUuids = new Set<string>();
  for (const entry of byUuid.values()) {
    if (entry.parentUuid) parentUuids.add(entry.parentUuid);
  }

  // Leaf nodes = entries not referenced as parentUuid by anything
  const leaves = [...byUuid.values()].filter((e) => !parentUuids.has(e.uuid));
  const fileIndex = (e: TranscriptEntry) => indexByUuid.get(e.uuid) ?? -1;

  // v0.3.283: the conversation ends at the newest main-thread leaf, even when
  // that branch ends at a meta row or a local command's rows. Picking the
  // newest non-meta user/assistant instead could land on a rewound-away branch.
  const isMainThread = (e: TranscriptEntry) =>
    !e.isSidechain &&
    !e.teamName &&
    e.type !== 'progress' &&
    !(
      e.type === 'attachment' &&
      (e.attachment as { type?: unknown } | undefined)?.type === 'fork_briefing'
    );
  const mainParents = new Set<string>();
  for (const entry of byUuid.values()) {
    if (entry.parentUuid && isMainThread(entry)) mainParents.add(entry.parentUuid);
  }
  const mainLeaves = [...byUuid.values()]
    .filter((e) => isMainThread(e) && !mainParents.has(e.uuid))
    .sort((a, b) => fileIndex(b) - fileIndex(a));

  // Newest leaf first: its nearest user/assistant ancestor ends the chain.
  // Rows already walked from a newer leaf lead nowhere, so skip them.
  let best: TranscriptEntry | undefined;
  let bestLeaf: TranscriptEntry | undefined;
  const walked = new Set<string>();
  for (const leaf of mainLeaves) {
    const path: string[] = [];
    const seen = new Set<string>();
    let current: TranscriptEntry | undefined = leaf;
    while (current && !walked.has(current.uuid) && !seen.has(current.uuid)) {
      if (current.type === 'user' || current.type === 'assistant') {
        best = current;
        bestLeaf = leaf;
        break;
      }
      seen.add(current.uuid);
      path.push(current.uuid);
      current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
    }
    if (best) break;
    for (const uuid of path) walked.add(uuid);
  }

  // Fallback (no main-thread leaf reaches a message): the newest message
  // reachable from any leaf, preferring non-sidechain, non-team, non-meta
  const fromMainLeaf = best;
  if (!best) {
    const candidates: TranscriptEntry[] = [];
    for (const leaf of leaves) {
      let current: TranscriptEntry | undefined = leaf;
      const seen = new Set<string>();
      while (current) {
        if (seen.has(current.uuid)) break;
        seen.add(current.uuid);
        if (current.type === 'user' || current.type === 'assistant') {
          candidates.push(current);
          break;
        }
        current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
      }
    }

    if (candidates.length === 0) return [];

    const good = candidates.filter((e) => !e.isSidechain && !e.teamName && !e.isMeta);
    const pickBest = (list: TranscriptEntry[]) =>
      list.reduce((top, item) => (fileIndex(item) > fileIndex(top) ? item : top));
    best = good.length > 0 ? pickBest(good) : pickBest(candidates);
  }

  // Walk from best back to root
  const chain: TranscriptEntry[] = [];
  const inChain = new Set<string>();
  let current: TranscriptEntry | undefined = byUuid.get(best.uuid);
  while (current) {
    if (inChain.has(current.uuid)) break;
    inChain.add(current.uuid);
    chain.push(current);
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
  }
  chain.reverse();
  if (found) {
    found.terminal = best === fromMainLeaf ? bestLeaf : undefined;
    found.leaf = best;
    found.relinked = byUuid;
  }

  return mergeParallelToolUses(byUuid, chain, inChain);
}

/**
 * Where a chain ended: `leaf` is its last message, `terminal` the main-thread
 * leaf row that led to it (unset when the fallback picked the message).
 */
export type ChainEnds = {
  terminal?: TranscriptEntry;
  leaf?: TranscriptEntry;
  /** v0.3.323: entries by uuid after compaction re-linking */
  relinked?: Map<string, TranscriptEntry>;
};

function isQueuedCommandAttachment(entry: TranscriptEntry): boolean {
  const att = entry.attachment;
  return (
    entry.type === 'attachment' &&
    typeof att === 'object' &&
    att !== null &&
    (att as { type?: unknown }).type === 'queued_command'
  );
}

/**
 * Queued commands written after the chain's last message (under it, through
 * non-message rows) that no later off-chain message builds on: messages sent
 * while Claude was working that no reply followed. Oldest first (v0.3.285).
 */
export function trailingQueuedCommands(
  entries: TranscriptEntry[],
  chain: TranscriptEntry[],
  ends: ChainEnds
): TranscriptEntry[] {
  const { leaf, relinked } = ends;
  if (relinked === undefined || leaf === undefined) return [];
  // v0.3.323: a row also hangs under the parent compaction re-linked it to
  // (a prompt queued right after a compaction summary)
  const childrenByParent = new Map<string, TranscriptEntry[]>();
  for (const entry of entries) {
    if (entry.type === 'user' || entry.type === 'assistant') continue;
    for (const parent of new Set([entry.parentUuid, relinked.get(entry.uuid)?.parentUuid])) {
      if (!parent) continue;
      const children = childrenByParent.get(parent);
      if (children) children.push(entry);
      else childrenByParent.set(parent, [entry]);
    }
  }
  const byTimestamp = (a: TranscriptEntry, b: TranscriptEntry) =>
    (a.timestamp ?? '') < (b.timestamp ?? '')
      ? -1
      : (a.timestamp ?? '') > (b.timestamp ?? '')
        ? 1
        : 0;
  const seen = new Set(chain.map((e) => e.uuid));
  const byUuid = new Map(entries.map((e) => [e.uuid, e]));

  // Rows an off-chain main-thread message descends from
  const builtOn = new Set<string>();
  for (const entry of entries) {
    if (
      (entry.type === 'user' || entry.type === 'assistant') &&
      !entry.isSidechain &&
      !entry.teamName &&
      !seen.has(entry.uuid)
    ) {
      let parent = entry.parentUuid ? byUuid.get(entry.parentUuid) : undefined;
      while (parent && !seen.has(parent.uuid) && !builtOn.has(parent.uuid)) {
        builtOn.add(parent.uuid);
        parent = parent.parentUuid ? byUuid.get(parent.parentUuid) : undefined;
      }
    }
  }

  const trailing: TranscriptEntry[] = [];
  const stack: TranscriptEntry[] = [leaf];
  while (stack.length > 0) {
    const entry = stack.pop() as TranscriptEntry;
    if (entry !== leaf) {
      if (seen.has(entry.uuid)) continue;
      seen.add(entry.uuid);
      if (isQueuedCommandAttachment(entry) && !builtOn.has(entry.uuid)) trailing.push(entry);
    }
    const children = childrenByParent.get(entry.uuid) ?? [];
    const ordered = children.length > 1 ? [...children].sort(byTimestamp) : children;
    for (let i = ordered.length - 1; i >= 0; i--) {
      if (!seen.has(ordered[i].uuid)) stack.push(ordered[i]);
    }
  }
  return trailing;
}

/**
 * User-message texts the CLI writes on Claude's behalf (interrupts, deferred
 * tool calls). They count as a reply, not a new prompt, when deciding whether
 * Claude read a queued message.
 */
const SYNTHETIC_USER_TEXTS = [
  '[Request interrupted by user]',
  '[Request interrupted by user for tool use]',
  '[Tool call did not complete: the turn was ended to deliver the message that follows. Nothing refused it; re-run it if still needed.]',
  "The user doesn't want to take this action right now. STOP what you are doing and wait for the user to tell you how to proceed.",
  '[Tool call skipped: the turn ended to deliver the message that follows before this call ran. Nothing refused it; re-run it if still needed.]',
];

const LOCAL_COMMAND_TAGS: [string, 'record' | 'output' | 'caveat'][] = [
  ['<command-name>', 'record'],
  ['<local-command-stdout>', 'output'],
  ['<local-command-stderr>', 'output'],
  ['<local-command-caveat>', 'caveat'],
];

function messageContent(entry: TranscriptEntry): unknown {
  const message = entry.message;
  return typeof message === 'object' && message !== null
    ? (message as { content?: unknown }).content
    : undefined;
}

export function isToolResultMessage(entry: TranscriptEntry): boolean {
  if (entry.type !== 'user' || !entry.parentUuid) return false;
  const content = messageContent(entry);
  if (!Array.isArray(content)) return false;
  return content.some((b) => typeof b === 'object' && b !== null && b.type === 'tool_result');
}

function isSyntheticUserMessage(entry: TranscriptEntry): boolean {
  if (entry.type !== 'user') return false;
  const content = messageContent(entry);
  if (typeof content === 'string') return SYNTHETIC_USER_TEXTS.some((t) => content.startsWith(t));
  if (!Array.isArray(content)) return false;
  return (
    content.length > 0 &&
    content.every((b) => {
      const text =
        b?.type === 'text'
          ? b.text
          : b?.type === 'tool_result' && b.is_error === true
            ? b.content
            : undefined;
      return typeof text === 'string' && SYNTHETIC_USER_TEXTS.some((t) => text.startsWith(t));
    })
  );
}

function localCommandKind(entry: TranscriptEntry): 'record' | 'output' | 'caveat' | undefined {
  if (entry.promptSource !== undefined) return undefined;
  const content = messageContent(entry);
  const text = Array.isArray(content)
    ? content.findLast((b) => b?.type === 'text')?.text
    : typeof content === 'string'
      ? content
      : undefined;
  if (typeof text !== 'string') return undefined;
  return LOCAL_COMMAND_TAGS.find(([tag]) => text.startsWith(tag))?.[1];
}

/**
 * Indices of the record/output messages of a completed local command
 * (`/cmd` run without Claude): a meta caveat followed by a command record and
 * its output, up to the next assistant message.
 */
function findCompletedLocalCommands(chain: TranscriptEntry[]): Set<number> {
  const result = new Set<number>();
  chain.forEach((entry, idx) => {
    if (entry.type !== 'user' || !entry.isMeta || localCommandKind(entry) !== 'caveat') return;
    let sawRecord = false;
    for (let i = idx + 1; i < chain.length; i++) {
      const next = chain[i];
      if (next.type === 'assistant') break;
      if (next.type !== 'user' || next.isMeta) continue;
      const kind = localCommandKind(next);
      if (kind === 'record' && !sawRecord) sawRecord = true;
      else if (kind !== 'output' || !sawRecord) break;
      result.add(i);
    }
  });
  return result;
}

/**
 * For each chain index, whether the next turn-relevant entry after it is a
 * reply from Claude (assistant message, tool result, or synthetic interrupt)
 * rather than a new user prompt — i.e. whether Claude read what came before.
 */
function findReadByClaude(chain: TranscriptEntry[], localCommands: Set<number>): boolean[] {
  const read: boolean[] = [];
  let next: 'reply' | 'prompt' | undefined;
  for (let i = chain.length - 1; i >= 0; i--) {
    const entry = chain[i];
    read[i] = next === 'reply';
    if (entry.type === 'assistant' || isToolResultMessage(entry) || isSyntheticUserMessage(entry)) {
      next = 'reply';
    } else if (
      entry.type === 'user' &&
      !entry.isMeta &&
      !entry.isCompactSummary &&
      !localCommands.has(i)
    ) {
      next = 'prompt';
    }
  }
  return read;
}

const RUN_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

function validRunId(v: unknown): string | undefined {
  return typeof v === 'string' && RUN_ID_RE.test(v) ? v : undefined;
}

/** Official `yR`: a task notification's origin keeps only its known fields. */
export function normalizeOrigin(origin: Origin | undefined): Origin | undefined {
  if (origin?.kind !== 'task-notification') return origin;
  const runId = validRunId(origin.runId);
  return {
    kind: 'task-notification',
    ...(origin.subkind !== undefined && { subkind: origin.subkind }),
    ...(origin.fireReason !== undefined && { fireReason: origin.fireReason }),
    ...(origin.producer !== undefined && { producer: origin.producer }),
    ...(runId !== undefined && { runId }),
    ...(origin.taskKind === 'mcp-task' && { taskKind: origin.taskKind }),
  };
}

/**
 * Origins whose meta messages are still shown as conversation messages:
 * channel, observer and Slack-ping pushes and peer messages (official SDK,
 * with its UDS inbox enabled).
 */
function isShownMetaOrigin(origin: Origin | undefined): boolean {
  const kind = origin?.kind;
  return (
    kind === 'channel' ||
    kind === 'observer' ||
    kind === 'observer-activity' ||
    kind === 'slack-ping' ||
    kind === 'voice-call' ||
    kind === 'peer'
  );
}

/**
 * A message the user sent (or a task notification queued) while Claude was
 * running a tool is stored as a `queued_command` attachment. Once Claude has
 * read it, surface it as a user message at that point in the conversation.
 */
function queuedCommandToUser(
  entry: TranscriptEntry,
  readByClaude: boolean,
  seenUuids: Set<string>,
  keepMeta: boolean
): TranscriptEntry {
  if (!readByClaude || entry.type !== 'attachment') return entry;
  const att = entry.attachment as Record<string, unknown> | null | undefined;
  if (typeof att !== 'object' || att === null || att.type !== 'queued_command') return entry;
  const prompt = att.prompt;
  const rawOrigin =
    typeof att.origin === 'object' &&
    att.origin !== null &&
    typeof (att.origin as Origin).kind === 'string'
      ? (att.origin as Origin)
      : undefined;
  if (att.isMeta && !keepMeta && !isShownMetaOrigin(rawOrigin)) return entry;
  if (typeof prompt !== 'string' && !Array.isArray(prompt)) return entry;

  // Forwarded intents (with a lineage) belong to another session's turn
  const intent = att.forwardedIntent as { lineage?: unknown } | undefined;
  if (
    typeof intent === 'object' &&
    intent !== null &&
    typeof intent.lineage === 'string' &&
    intent.lineage
  ) {
    return entry;
  }

  const uuid =
    typeof att.source_uuid === 'string' && att.source_uuid ? att.source_uuid : entry.uuid;
  if (uuid !== entry.uuid && seenUuids.has(uuid)) return entry;
  seenUuids.add(uuid);

  // Official `AU`: a task notification's `runId` may sit on the attachment
  const baseOrigin =
    normalizeOrigin(rawOrigin) ??
    (att.commandMode === 'task-notification' ? { kind: 'task-notification' } : undefined);
  const attRunId = validRunId(att.runId);
  const origin =
    attRunId !== undefined &&
    baseOrigin?.kind === 'task-notification' &&
    baseOrigin.runId === undefined
      ? { ...baseOrigin, runId: attRunId }
      : baseOrigin;

  return {
    type: 'user',
    uuid,
    parentUuid: entry.parentUuid,
    sessionId: entry.sessionId,
    timestamp: entry.timestamp,
    message: { role: 'user', content: prompt },
    isMeta: Boolean(att.isMeta),
    ...(origin !== undefined && { origin }),
    isQueuedCommand: true,
    isSidechain: entry.isSidechain,
    teamName: entry.teamName,
  };
}

// ============================================================================
// Host-run tool calls (v0.3.323+)
// ============================================================================

/** An assistant row with tool calls the host ran itself (official `Zl`). */
function isHostRunAssistant(entry: TranscriptEntry | undefined): boolean {
  return (
    entry?.type === 'assistant' &&
    (Array.isArray(entry.hostHiddenToolUseIds) || typeof entry.ranByToolUseId === 'string')
  );
}

function isBlock(v: unknown, type: string): v is Record<string, unknown> {
  return isPlainObject(v) && v.type === type;
}

function contentBlocks(message: Record<string, unknown>): unknown[] {
  return Array.isArray(message.content) ? message.content : [];
}

/**
 * After each host-run assistant row, keep the virtual rows the host wrote
 * under it, off the chain (official `uh`).
 */
export function withHostVirtualRows(
  chain: TranscriptEntry[],
  entries: TranscriptEntry[]
): TranscriptEntry[] {
  if (!chain.some(isHostRunAssistant)) return chain;
  const taken = new Set(chain.map((e) => e.uuid));
  const chainParents = new Set(chain.map((e) => e.parentUuid));
  const childOf = new Map<string | undefined, TranscriptEntry>();
  for (const e of entries) if (!taken.has(e.uuid)) childOf.set(e.parentUuid, e);
  const out: TranscriptEntry[] = [];
  for (const entry of chain) {
    out.push(entry);
    let next = childOf.get(entry.uuid);
    if (entry.isVirtual === true || next === undefined) continue;
    if (isHostRunAssistant(entry) && next.type === 'user') {
      taken.add(next.uuid);
      next = childOf.get(next.uuid);
    } else if (
      next.type === 'attachment' &&
      (entry.type !== 'user' || chainParents.has(entry.uuid))
    ) {
      continue;
    }
    while (next !== undefined && !taken.has(next.uuid)) {
      taken.add(next.uuid);
      if (
        next.isVirtual === true &&
        (isHostRunAssistant(next) || (next.type === 'user' && isHostRunAssistant(out.at(-1))))
      ) {
        out.push(next);
      } else if (next.type !== 'attachment') {
        break;
      }
      next = childOf.get(next.uuid);
    }
  }
  return out;
}

/**
 * Insert, after each assistant row that hid host-run calls, the calls and
 * results the host recorded as `host-row`s (official `ph`).
 */
export function withHostRows(
  chain: TranscriptEntry[],
  entries: TranscriptEntry[],
  hostRows: HostRow[]
): TranscriptEntry[] {
  if (hostRows.length === 0) return chain;
  const known = new Set(entries.map((e) => e.uuid));
  const withheld = new Set<unknown>();
  const results = new Map<unknown, HostRow>();
  const calls = new Map<unknown, HostRow[]>();
  for (const row of hostRows) {
    if (row.withheld === true) withheld.add(row.ranByToolUseId);
    else if (typeof row.rowUuid !== 'string' || known.has(row.rowUuid)) continue;
    else if (isBlock(row.block, 'tool_result')) results.set(row.block.tool_use_id, row);
    else if (isBlock(row.block, 'tool_use')) {
      known.add(row.rowUuid);
      const list = calls.get(row.ranByToolUseId) ?? [];
      list.push(row);
      calls.set(row.ranByToolUseId, list);
    }
  }
  return chain.flatMap((entry) => {
    const hidden =
      entry.isVirtual !== true && Array.isArray(entry.hostHiddenToolUseIds)
        ? entry.hostHiddenToolUseIds
        : [];
    const virtual = (row: HostRow, type: 'assistant' | 'user'): TranscriptEntry => ({
      type,
      uuid: row.rowUuid as string,
      parentUuid: null as unknown as undefined,
      sessionId: entry.sessionId,
      timestamp: typeof row.timestamp === 'string' ? row.timestamp : undefined,
      isVirtual: true,
      ranByToolUseId: row.ranByToolUseId,
      message: { role: type, content: [row.block] },
    });
    const inserted = hidden.flatMap((id) => {
      const rows = withheld.has(id) ? [] : (calls.get(id) ?? []);
      calls.delete(id);
      return rows.flatMap((call) => {
        const result = results.get((call.block as Record<string, unknown>).id);
        return result === undefined
          ? [virtual(call, 'assistant')]
          : [virtual(call, 'assistant'), virtual(result, 'user')];
      });
    });
    return [entry, ...inserted];
  });
}

/** The host's own content for `block`, when it matches it one-to-one (official `I$`). */
function hostContentFor(
  entry: TranscriptEntry,
  block: Record<string, unknown>,
  key: string
): unknown[] | undefined {
  const hostContent = Array.isArray(entry.hostContent) ? entry.hostContent : [];
  const same = hostContent.filter((b) => isBlock(b, String(block.type)));
  return same.length === 1 && same[0]?.[key] === block[key] && same[0]?.name === block.name
    ? hostContent
    : undefined;
}

/**
 * Show host-run calls as the host ran them: drop the hidden tool_use blocks
 * and their results from Claude's rows, and show the virtual rows with the
 * host's content (official `fh`).
 */
export function presentHostRunCalls(messages: TranscriptEntry[]): TranscriptEntry[] {
  const hiddenIn = new Map<unknown, Record<string, unknown>>();
  const pendingCall = new Map<unknown, TranscriptEntry>();
  const virtualCalls = new Set<unknown>();
  if (!messages.some(isHostRunAssistant)) return [...messages];
  const seenIds = new Set<unknown>();
  const repeatedIds = new Set<unknown>();
  for (const { type, message } of messages) {
    if (type === 'assistant' && isPlainObject(message)) {
      for (const b of contentBlocks(message)) {
        if (isBlock(b, 'tool_use')) (seenIds.has(b.id) ? repeatedIds : seenIds).add(b.id);
      }
    }
  }
  return messages.flatMap((entry) => {
    const { message } = entry;
    if (!isPlainObject(message)) return [entry];
    const blocks = contentBlocks(message);
    if (isHostRunAssistant(entry)) {
      const hidden = Array.isArray(entry.hostHiddenToolUseIds) ? entry.hostHiddenToolUseIds : [];
      const kept = blocks.filter((b) => {
        const hide =
          isBlock(b, 'tool_use') &&
          typeof b.id === 'string' &&
          hidden.includes(b.id) &&
          !repeatedIds.has(b.id);
        if (hide) hiddenIn.set((b as Record<string, unknown>).id, message);
        return !hide;
      });
      const [first] = blocks;
      if (kept.length < blocks.length) {
        const [hostFirst] = Array.isArray(entry.hostContent) ? entry.hostContent : [];
        if (
          blocks.length === 1 &&
          isBlock(first, 'tool_use') &&
          isBlock(hostFirst, 'tool_use') &&
          hostFirst.id === first.id
        ) {
          pendingCall.set(first.id, { ...entry, message: { ...message, content: [hostFirst] } });
        }
        return kept.length === 0 ? [] : [{ ...entry, message: { ...message, content: kept } }];
      }
      if (
        typeof entry.ranByToolUseId !== 'string' ||
        entry.isVirtual !== true ||
        blocks.length !== 1 ||
        !isBlock(first, 'tool_use')
      )
        return [entry];
      virtualCalls.add(first.id);
      return [
        {
          ...entry,
          message: {
            ...(hiddenIn.get(entry.ranByToolUseId) ?? message),
            content: hostContentFor(entry, first, 'id') ?? blocks,
          },
        },
      ];
    }
    if (entry.type !== 'user') return [entry];
    const results = blocks.filter((b) => isBlock(b, 'tool_result')) as Record<string, unknown>[];
    const only = results.length === 1 ? results[0] : undefined;
    const call = pendingCall.get(only?.tool_use_id);
    const hostContent =
      only !== undefined &&
      (call !== undefined
        ? only.is_error === true
        : entry.isVirtual === true && virtualCalls.has(only.tool_use_id))
        ? hostContentFor(entry, only, 'tool_use_id')
        : undefined;
    if (hostContent !== undefined) {
      const shown = { ...entry, message: { ...message, content: hostContent } };
      pendingCall.delete(only?.tool_use_id);
      return call === undefined ? [shown] : [call, shown];
    }
    const dropped = new Set(results.filter((r) => hiddenIn.has(r.tool_use_id)));
    if (dropped.size > 0) {
      return dropped.size === results.length
        ? []
        : [
            {
              ...entry,
              toolDenialKind: undefined,
              toolDenialUnanswered: undefined,
              message: { ...message, content: blocks.filter((b) => !dropped.has(b as never)) },
            },
          ];
    }
    return [entry];
  });
}

/**
 * @param keepMeta convert meta queued commands too (subagent transcripts)
 * @param trailingIds trailing queued commands (see trailingQueuedCommands), shown as read
 * @param delivered result of finishDeliveries(): queued commands absorbed mid-turn
 */
export function normalizeChain(
  chain: TranscriptEntry[],
  options: {
    keepMeta?: boolean;
    trailingIds?: Set<string>;
    delivered?: Map<string, number>;
  } = {}
): TranscriptEntry[] {
  const localCommands = findCompletedLocalCommands(chain);
  const read = findReadByClaude(chain, localCommands);
  const delivered = deliveredReads(chain, options.delivered);
  const seenUuids = new Set(chain.map((e) => e.uuid));
  return chain.map((entry, i) =>
    localCommands.has(i)
      ? { ...entry, isCompletedLocalCommand: true }
      : queuedCommandToUser(
          entry,
          delivered.get(i) ?? (read[i] || (options.trailingIds?.has(entry.uuid) ?? false)),
          seenUuids,
          options.keepMeta ?? false
        )
  );
}

/**
 * Filter to keep conversation messages that aren't meta/sidechain/team.
 * When includeSystemMessages is true, also keeps system-type entries.
 */
export function isConversationMessage(
  entry: TranscriptEntry,
  includeSystemMessages?: boolean
): boolean {
  const isMessage = entry.type === 'user' || entry.type === 'assistant';
  if (!isMessage && !(entry.type === 'system' && includeSystemMessages)) return false;
  if (closesQuietTurn(entry)) return false;
  if (entry.isMeta && !isShownMetaOrigin(entry.origin)) return false;
  if (entry.isSidechain) return false;
  if (entry.teamName) return false;
  return true;
}

const NO_RESPONSE_REQUESTED = 'No response requested.';

/**
 * The CLI's empty / "No response requested." reply that only closes a turn
 * nobody waits on (official `L$`, v0.3.323+). Not a conversation message.
 */
function closesQuietTurn(entry: TranscriptEntry): boolean {
  const message = entry.message;
  if (
    entry.type !== 'assistant' ||
    entry.closesQuietTurn !== true ||
    !isPlainObject(message) ||
    !Array.isArray(message.content)
  )
    return false;
  const content = message.content;
  const text =
    content.length === 1 && content[0]?.type === 'text' ? (content[0].text as unknown) : undefined;
  return text === '' || text === NO_RESPONSE_REQUESTED;
}

/** Tool-denial kinds `tool_result_meta` reports (official `f0`). */
const TOOL_DENIAL_KINDS = [
  'user-rejected',
  'permission-rule',
  'automode-blocked',
  'automode-unavailable',
  'automode-parsing-error',
  'interrupted',
  'cancelled',
];
/** `toolCallEnded` values `tool_result_meta` reports (official `m0`). */
const TOOL_CALL_ENDINGS = ['not_started'];

/**
 * `tool_result_meta` of a tool-result message: why the call didn't run, how
 * it ended, and whether a mod rewrote the result (v0.3.332).
 */
function toolResultMeta(entry: TranscriptEntry): Record<string, unknown>[] {
  const kind = TOOL_DENIAL_KINDS.find((k) => k === entry.toolDenialKind);
  const ended = TOOL_CALL_ENDINGS.find((k) => k === entry.toolCallEnded);
  const message = entry.message;
  const content =
    typeof message === 'object' && message !== null && 'content' in message
      ? (message as { content?: unknown }).content
      : undefined;
  const ids = (Array.isArray(content) ? content : []).flatMap((b) =>
    typeof b === 'object' && b !== null && 'type' in b && b.type === 'tool_result'
      ? ['tool_use_id' in b ? (b.tool_use_id as unknown) : undefined]
      : []
  );
  const nonExecution = ids.length === 1 ? kind : undefined;
  const callEnded = ids.length === 1 ? ended : undefined;
  const rewritten = Boolean(entry.toolResultRewritten);
  if (nonExecution === undefined && callEnded === undefined && !rewritten) return [];
  return ids.flatMap((id) =>
    typeof id === 'string'
      ? [
          {
            id,
            ...(nonExecution !== undefined && { non_execution_kind: nonExecution }),
            ...(callEnded !== undefined && { call_ended: callEnded }),
            ...(rewritten && { rewritten_by_plugin: true }),
          },
        ]
      : []
  );
}

/**
 * Map a transcript entry to the SessionMessage format.
 */
export function toSessionMessage(
  entry: TranscriptEntry,
  parentToolUseId?: string,
  parentAgentId?: string
): SessionMessage {
  const origin = entry.origin != null ? normalizeOrigin(entry.origin) : undefined;
  const meta = toolResultMeta(entry);
  return {
    type: entry.type as 'user' | 'assistant',
    uuid: entry.uuid,
    session_id: entry.sessionId ?? '',
    message: entry.message,
    parent_tool_use_id: parentToolUseId ?? null,
    parent_agent_id: parentAgentId ?? null,
    ...(entry.interruptedByShutdown === true && { interruptedByShutdown: true }),
    // Only the values the official SDK knows ("stream-closed") pass through
    ...(entry.toolDenialUnanswered === 'stream-closed' && {
      toolDenialUnanswered: entry.toolDenialUnanswered,
    }),
    ...(meta.length > 0 && { tool_result_meta: meta }),
    ...(entry.isCompactSummary === true && { isCompactSummary: true }),
    ...((entry.isMeta === true ||
      entry.isCompactSummary === true ||
      entry.isVisibleInTranscriptOnly === true) && { is_meta: true }),
    ...(entry.isQueuedCommand === true && { isQueuedCommand: true }),
    ...(entry.isCompletedLocalCommand === true && { isCompletedLocalCommand: true }),
    timestamp: entry.timestamp,
    ...(origin && { origin }),
  } as SessionMessage;
}

/** Apply `offset`/`limit` the way the official SDK does (limit <= 0 means none). */
export function paginate<T>(items: T[], options?: { limit?: number; offset?: number }): T[] {
  const offset = options?.offset ?? 0;
  if (options?.limit !== undefined && options.limit > 0)
    return items.slice(offset, offset + options.limit);
  if (offset > 0) return items.slice(offset);
  return items;
}
