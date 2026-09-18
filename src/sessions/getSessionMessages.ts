/**
 * Read a session's conversation messages from its JSONL transcript file.
 *
 * Parses the transcript, builds the conversation chain via parentUuid links,
 * and returns user/assistant messages in chronological order.
 *
 * Matches the official SDK signature.
 */

import type { GetSessionMessagesOptions, SessionMessage } from '../types/index.ts';
import { findSessionContent, validateUuid } from './utils.ts';

/**
 * JSONL entry with fields we need for chain building.
 */
interface TranscriptEntry {
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
  teamName?: string;
}

type Origin = { kind: string; subkind?: unknown; fireReason?: unknown; [key: string]: unknown };

/**
 * Parse JSONL content into transcript entries.
 * Only keeps entries that have a uuid and a relevant type.
 */
function parseTranscript(content: string): TranscriptEntry[] {
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
      const entry = JSON.parse(line);
      const type = entry.type;
      if (
        (type === 'user' ||
          type === 'assistant' ||
          type === 'progress' ||
          type === 'system' ||
          type === 'attachment') &&
        typeof entry.uuid === 'string'
      ) {
        entries.push(entry);
      }
    } catch {
      // skip malformed lines
    }
  }
  return entries;
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
function buildConversationChain(entries: TranscriptEntry[]): TranscriptEntry[] {
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

  // From each leaf, walk up to find nearest user/assistant entry
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

  // Prefer non-sidechain, non-team, non-meta candidates
  const good = candidates.filter((e) => !e.isSidechain && !e.teamName && !e.isMeta);

  // Pick the one with the highest index (latest in file)
  const pickBest = (list: TranscriptEntry[]) =>
    list.reduce((best, item) =>
      (indexByUuid.get(item.uuid) ?? -1) > (indexByUuid.get(best.uuid) ?? -1) ? item : best
    );
  const best = good.length > 0 ? pickBest(good) : pickBest(candidates);

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

  return mergeParallelToolUses(byUuid, chain, inChain);
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

function isToolResultMessage(entry: TranscriptEntry): boolean {
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

function normalizeOrigin(origin: Origin | undefined): Origin | undefined {
  if (origin?.kind !== 'task-notification') return origin;
  return {
    kind: 'task-notification',
    ...(origin.subkind !== undefined && { subkind: origin.subkind }),
    ...(origin.fireReason !== undefined && { fireReason: origin.fireReason }),
  };
}

/**
 * A message the user sent (or a task notification queued) while Claude was
 * running a tool is stored as a `queued_command` attachment. Once Claude has
 * read it, surface it as a user message at that point in the conversation.
 */
function queuedCommandToUser(
  entry: TranscriptEntry,
  readByClaude: boolean,
  seenUuids: Set<string>
): TranscriptEntry {
  if (!readByClaude || entry.type !== 'attachment') return entry;
  const att = entry.attachment as Record<string, unknown> | null | undefined;
  if (typeof att !== 'object' || att === null || att.type !== 'queued_command') return entry;
  const prompt = att.prompt;
  if (att.isMeta) return entry;
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

  const rawOrigin = att.origin as Origin | undefined;
  const origin =
    normalizeOrigin(typeof rawOrigin?.kind === 'string' ? rawOrigin : undefined) ??
    (att.commandMode === 'task-notification' ? { kind: 'task-notification' } : undefined);

  return {
    type: 'user',
    uuid,
    parentUuid: entry.parentUuid,
    sessionId: entry.sessionId,
    timestamp: entry.timestamp,
    message: { role: 'user', content: prompt },
    isMeta: false,
    ...(origin !== undefined && { origin }),
    isQueuedCommand: true,
    isSidechain: entry.isSidechain,
    teamName: entry.teamName,
  };
}

function normalizeChain(chain: TranscriptEntry[]): TranscriptEntry[] {
  const localCommands = findCompletedLocalCommands(chain);
  const read = findReadByClaude(chain, localCommands);
  const seenUuids = new Set(chain.map((e) => e.uuid));
  return chain.map((entry, i) =>
    localCommands.has(i)
      ? { ...entry, isCompletedLocalCommand: true }
      : queuedCommandToUser(entry, read[i], seenUuids)
  );
}

/**
 * Filter to keep conversation messages that aren't meta/sidechain/team.
 * When includeSystemMessages is true, also keeps system-type entries.
 */
function isConversationMessage(entry: TranscriptEntry, includeSystemMessages?: boolean): boolean {
  if (entry.type === 'system') return !!includeSystemMessages;
  if (entry.type !== 'user' && entry.type !== 'assistant') return false;
  if (entry.isMeta) return false;
  if (entry.isSidechain) return false;
  if (entry.teamName) return false;
  return true;
}

/**
 * Map a transcript entry to the SessionMessage format.
 */
function toSessionMessage(entry: TranscriptEntry): SessionMessage {
  const origin = entry.origin != null ? normalizeOrigin(entry.origin) : undefined;
  return {
    type: entry.type as 'user' | 'assistant',
    uuid: entry.uuid,
    session_id: entry.sessionId ?? '',
    message: entry.message,
    parent_tool_use_id: null,
    parent_agent_id: null,
    ...(entry.interruptedByShutdown === true && { interruptedByShutdown: true }),
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

export async function getSessionMessages(
  sessionId: string,
  options?: GetSessionMessagesOptions
): Promise<SessionMessage[]> {
  if (!validateUuid(sessionId)) return [];

  const content = await findSessionContent(sessionId, options?.dir);
  if (!content) return [];

  const entries = parseTranscript(content);
  const chain = buildConversationChain(entries);
  const messages = normalizeChain(chain)
    .filter((e) => isConversationMessage(e, options?.includeSystemMessages))
    .map(toSessionMessage);

  const offset = options?.offset ?? 0;
  if (options?.limit !== undefined && options.limit > 0) {
    return messages.slice(offset, offset + options.limit);
  }
  if (offset > 0) {
    return messages.slice(offset);
  }
  return messages;
}
