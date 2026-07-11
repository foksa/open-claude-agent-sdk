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
  message?: unknown;
  isSidechain?: boolean;
  isMeta?: boolean;
  teamName?: string;
}

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
 * Build the main conversation chain from transcript entries.
 *
 * Algorithm (mirrors official SDK):
 * 1. Build uuid→entry and uuid→index maps
 * 2. Find leaf nodes (entries not referenced as parentUuid by anything)
 * 3. From each leaf, walk up via parentUuid to find nearest user/assistant entry
 * 4. Select the best leaf: prefer non-sidechain/non-team, highest index
 * 5. Walk from best leaf back to root via parentUuid links
 * 6. Return entries in chronological order (root first)
 */
function buildConversationChain(entries: TranscriptEntry[]): TranscriptEntry[] {
  const byUuid = new Map<string, TranscriptEntry>();
  const indexByUuid = new Map<string, number>();
  for (let i = 0; i < entries.length; i++) {
    byUuid.set(entries[i].uuid, entries[i]);
    indexByUuid.set(entries[i].uuid, i);
  }

  // Find parent UUIDs (entries that are referenced as parentUuid)
  const parentUuids = new Set<string>();
  for (const entry of entries) {
    if (entry.parentUuid) {
      parentUuids.add(entry.parentUuid);
    }
  }

  // Leaf nodes = entries not referenced as parentUuid by anything
  const leaves = entries.filter((e) => !parentUuids.has(e.uuid));

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
  const seen = new Set<string>();
  let current: TranscriptEntry | undefined = best;
  while (current) {
    if (seen.has(current.uuid)) break;
    seen.add(current.uuid);
    chain.unshift(current);
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
  }

  return chain;
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
  return {
    type: entry.type as 'user' | 'assistant',
    uuid: entry.uuid,
    session_id: entry.sessionId ?? '',
    message: entry.message,
    parent_tool_use_id: null,
    parent_agent_id: null,
  };
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
  const messages = chain
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
