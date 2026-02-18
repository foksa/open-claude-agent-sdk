/**
 * Session storage entry point — manage Claude Code sessions on disk.
 *
 * Import from 'open-claude-agent-sdk/storage' to access session management
 * without pulling in the rest of the SDK.
 *
 * @example
 * ```typescript
 * import { listSessions, getSessionMetadata, renameSession } from 'open-claude-agent-sdk/storage';
 *
 * const sessions = await listSessions('/path/to/project');
 * const meta = await getSessionMetadata(sessions[0].sessionId, '/path/to/project');
 * await renameSession(sessions[0].sessionId, 'My Session', '/path/to/project');
 * ```
 */

export { getProjectStoragePath } from './storage/paths.ts';
export { listSessions } from './storage/list.ts';
export { getSessionMetadata } from './storage/metadata.ts';
export { renameSession } from './storage/rename.ts';
export { deleteSession } from './storage/delete.ts';
export type { SessionInfo, SessionMetadata } from './types/index.ts';
