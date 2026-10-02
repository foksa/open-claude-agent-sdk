/**
 * Read a session's conversation messages from its JSONL transcript file.
 *
 * Matches the official SDK signature and output. Known gap: for transcripts
 * over 5MB the official SDK skips content before the last compact boundary
 * while streaming; we parse the whole file.
 */

import { readFile } from 'node:fs/promises';
import type { GetSessionMessagesOptions, SessionMessage } from '../types/index.ts';
import { findSessionFile, validateUuid } from './paths.ts';
import {
  buildConversationChain,
  type ChainEnds,
  createDeliveryState,
  finishDeliveries,
  isConversationMessage,
  normalizeChain,
  paginate,
  parseTranscript,
  toSessionMessage,
  trailingQueuedCommands,
} from './transcript.ts';

export async function getSessionMessages(
  sessionId: string,
  options?: GetSessionMessagesOptions
): Promise<SessionMessage[]> {
  if (!validateUuid(sessionId)) return [];

  const file = await findSessionFile(sessionId, options?.dir);
  if (!file) return [];

  let content: string;
  try {
    content = await readFile(file.filePath, 'utf8');
  } catch {
    return [];
  }

  const deliveries = createDeliveryState();
  const entries = parseTranscript(content, deliveries);
  const ends: ChainEnds = {};
  const chain = buildConversationChain(entries, ends);
  // Messages sent while Claude was working that no reply followed
  const trailing = trailingQueuedCommands(entries, chain, ends.leaf);
  const messages = normalizeChain(chain.concat(trailing), {
    trailingIds: new Set(trailing.map((e) => e.uuid)),
    delivered: finishDeliveries(deliveries),
  })
    .filter((e) => isConversationMessage(e, options?.includeSystemMessages))
    .map((e) => toSessionMessage(e));
  return paginate(messages, options);
}
