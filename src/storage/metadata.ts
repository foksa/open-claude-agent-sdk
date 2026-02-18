import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import type { SessionMetadata } from '../types/index.ts';
import { getProjectStoragePath, isValidSessionId, sessionFilePath } from './paths.ts';

/**
 * Get rich metadata for a single session without loading the full transcript.
 *
 * Streams the JSONL file and extracts: first prompt, slug, customTitle,
 * model, gitBranch, token usage, agentName.
 *
 * @param sessionId - UUID of the session
 * @param projectPath - Absolute path to the project
 */
export async function getSessionMetadata(
  sessionId: string,
  projectPath: string
): Promise<SessionMetadata> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const storagePath = getProjectStoragePath(projectPath);
  const filePath = sessionFilePath(sessionId, storagePath);

  const fileStat = await stat(filePath);

  let firstPrompt: string | undefined;
  let slug: string | undefined;
  let customTitle: string | undefined;
  let model: string | undefined;
  let gitBranch: string | undefined;
  let isAgent = false;
  let agentName: string | undefined;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let messageCount = 0;
  const seenRequestIds = new Set<string>();

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({
    input: stream,
    crlfDelay: Number.POSITIVE_INFINITY,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      messageCount++;

      // custom-title can appear anywhere, last one wins
      if (entry.type === 'custom-title' && entry.customTitle) {
        customTitle = entry.customTitle;
      }

      // slug appears on user/assistant entries
      if (entry.slug && !slug) {
        slug = entry.slug;
      }

      // gitBranch from first entry that has it
      if (entry.gitBranch && !gitBranch) {
        gitBranch = entry.gitBranch;
      }

      // first user prompt
      if (entry.type === 'user' && entry.message?.role === 'user' && !firstPrompt) {
        const content = entry.message.content;
        if (typeof content === 'string') {
          firstPrompt = content;
        } else if (Array.isArray(content)) {
          const textBlock = content.find((b: { type: string }) => b.type === 'text');
          if (textBlock?.text) firstPrompt = textBlock.text;
        }
      }

      // model from first assistant message
      if (entry.type === 'assistant' && entry.message?.model && !model) {
        model = entry.message.model;
      }

      // accumulate token usage from assistant messages, deduplicate by requestId
      if (entry.type === 'assistant' && entry.message?.usage) {
        const rid = entry.requestId;
        if (!rid || !seenRequestIds.has(rid)) {
          if (rid) seenRequestIds.add(rid);
          const u = entry.message.usage;
          totalInputTokens +=
            (u.input_tokens || 0) +
            (u.cache_read_input_tokens || 0) +
            (u.cache_creation_input_tokens || 0);
          totalOutputTokens += u.output_tokens || 0;
        }
      }

      // agent info from system entries
      if (entry.type === 'system' && entry.agentName) {
        isAgent = true;
        agentName = entry.agentName;
      }
    } catch {
      // skip malformed lines
    }
  }

  const displayName =
    agentName || customTitle || firstPrompt?.slice(0, 80) || slug || sessionId.slice(0, 8);

  return {
    sessionId,
    displayName,
    createdAt: fileStat.birthtime,
    lastModifiedAt: fileStat.mtime,
    messageCount,
    firstPrompt,
    slug,
    customTitle,
    model,
    gitBranch,
    totalCost:
      totalInputTokens + totalOutputTokens > 0 ? totalInputTokens + totalOutputTokens : undefined,
    isAgent,
    agentName,
  };
}
