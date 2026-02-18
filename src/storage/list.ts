import { createReadStream } from 'node:fs';
import { readdir, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import type { SessionInfo } from '../types/index.ts';
import { getProjectStoragePath, isValidSessionId } from './paths.ts';

/**
 * Resolve a display name from collected JSONL fields.
 * Priority: agentName > customTitle > firstPrompt > slug > sessionId prefix
 */
function resolveDisplayName(
  fields: { agentName?: string; customTitle?: string; firstPrompt?: string; slug?: string },
  sessionId: string
): string {
  return (
    fields.agentName ||
    fields.customTitle ||
    fields.firstPrompt?.slice(0, 80) ||
    fields.slug ||
    sessionId.slice(0, 8)
  );
}

/**
 * Extract display-name fields from a session JSONL by streaming it.
 * Closes the stream early once we have enough info.
 */
async function extractDisplayInfo(
  filePath: string,
  sessionId: string
): Promise<{ displayName: string; messageCount: number }> {
  const fields: { agentName?: string; customTitle?: string; firstPrompt?: string; slug?: string } =
    {};
  let messageCount = 0;

  const stream = createReadStream(filePath, { encoding: 'utf8' });
  const rl = createInterface({ input: stream, crlfDelay: Number.POSITIVE_INFINITY });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const entry = JSON.parse(line);
      messageCount++;

      if (entry.type === 'custom-title' && entry.customTitle) {
        fields.customTitle = entry.customTitle;
      }
      if (entry.slug && !fields.slug) {
        fields.slug = entry.slug;
      }
      if (entry.type === 'user' && entry.message?.role === 'user' && !fields.firstPrompt) {
        const content = entry.message.content;
        if (typeof content === 'string') {
          fields.firstPrompt = content;
        } else if (Array.isArray(content)) {
          const textBlock = content.find((b: { type: string }) => b.type === 'text');
          if (textBlock?.text) fields.firstPrompt = textBlock.text;
        }
      }
      if (entry.type === 'system' && entry.agentName) {
        fields.agentName = entry.agentName;
      }
    } catch {
      // skip malformed lines
    }
  }

  return {
    displayName: resolveDisplayName(fields, sessionId),
    messageCount,
  };
}

/**
 * List all sessions for a project directory.
 *
 * @param projectPath - Absolute path to the project (e.g. `/Users/foo/my-project`)
 * @returns Array of session info sorted by lastModifiedAt descending (newest first)
 */
export async function listSessions(projectPath: string): Promise<SessionInfo[]> {
  const storagePath = getProjectStoragePath(projectPath);

  let files: string[];
  try {
    files = await readdir(storagePath);
  } catch {
    return [];
  }

  const jsonlFiles = files.filter((f) => {
    if (!f.endsWith('.jsonl')) return false;
    const id = f.slice(0, -6); // strip .jsonl
    return isValidSessionId(id);
  });

  const sessions = await Promise.all(
    jsonlFiles.map(async (f) => {
      const sessionId = f.slice(0, -6);
      const filePath = `${storagePath}/${f}`;

      const [fileStat, displayInfo] = await Promise.all([
        stat(filePath),
        extractDisplayInfo(filePath, sessionId),
      ]);

      return {
        sessionId,
        displayName: displayInfo.displayName,
        createdAt: fileStat.birthtime,
        lastModifiedAt: fileStat.mtime,
        messageCount: displayInfo.messageCount,
      } satisfies SessionInfo;
    })
  );

  sessions.sort((a, b) => b.lastModifiedAt.getTime() - a.lastModifiedAt.getTime());
  return sessions;
}
