import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { getProjectStoragePath, isValidSessionId, sessionFilePath } from './paths.ts';

/**
 * Delete a session by removing its JSONL file and companion directory.
 *
 * @param sessionId - UUID of the session to delete
 * @param projectPath - Absolute path to the project
 */
export async function deleteSession(sessionId: string, projectPath: string): Promise<void> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const storagePath = getProjectStoragePath(projectPath);
  const filePath = sessionFilePath(sessionId, storagePath);

  // Remove the JSONL file (throws if not found)
  await rm(filePath);

  // Remove companion directory (subagents, tool-results) if it exists
  const companionDir = join(storagePath, sessionId);
  await rm(companionDir, { recursive: true, force: true });
}
