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
  isConversationMessage,
  normalizeChain,
  paginate,
  parseTranscript,
  toSessionMessage,
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

  const chain = buildConversationChain(parseTranscript(content));
  const messages = normalizeChain(chain)
    .filter((e) => isConversationMessage(e, options?.includeSystemMessages))
    .map((e) => toSessionMessage(e));
  return paginate(messages, options);
}
