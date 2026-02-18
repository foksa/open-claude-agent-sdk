import { appendFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';
import { getProjectStoragePath, isValidSessionId, sessionFilePath } from './paths.ts';

/**
 * Rename a session by appending a `custom-title` entry to its JSONL file.
 * This matches how Claude CLI's `/rename` command works.
 *
 * @param sessionId - UUID of the session to rename
 * @param name - New display name for the session
 * @param projectPath - Absolute path to the project
 */
export async function renameSession(
  sessionId: string,
  name: string,
  projectPath: string,
): Promise<void> {
  if (!isValidSessionId(sessionId)) {
    throw new Error(`Invalid session ID: ${sessionId}`);
  }

  const storagePath = getProjectStoragePath(projectPath);
  const filePath = sessionFilePath(sessionId, storagePath);

  // Verify the session file exists
  await access(filePath);

  const entry = JSON.stringify({
    type: 'custom-title',
    customTitle: name,
    sessionId,
  });

  await appendFile(filePath, `\n${entry}\n`);
}
