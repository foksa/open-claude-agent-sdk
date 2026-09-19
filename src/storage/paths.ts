import { join } from 'node:path';
import { getProjectsBaseDir, projectDirName } from '../sessions/paths.ts';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Encode a project path the same way Claude CLI does: replace every
 * non-alphanumeric character with `-`, hash-suffixing names over 200 chars.
 */
export function encodePath(projectPath: string): string {
  return projectDirName(projectPath);
}

/**
 * Returns the on-disk storage directory for a project (respects CLAUDE_CONFIG_DIR).
 * e.g. `/Users/foo/my-project` → `~/.claude/projects/-Users-foo-my-project`
 */
export function getProjectStoragePath(projectPath: string): string {
  return join(getProjectsBaseDir(), encodePath(projectPath));
}

/**
 * Validate that a string looks like a UUID session ID.
 */
export function isValidSessionId(id: string): boolean {
  return UUID_RE.test(id);
}

/**
 * Resolve the JSONL file path for a session.
 */
export function sessionFilePath(sessionId: string, storagePath: string): string {
  return join(storagePath, `${sessionId}.jsonl`);
}
