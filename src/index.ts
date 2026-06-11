/**
 * Open Claude Agent SDK
 * A lightweight alternative to Claude Agent SDK - uses local CLI
 */

export const version = '0.35.0';

// Session utilities — re-exported from official SDK (read/write JSONL files directly)
export {
  AbortError,
  deleteSession,
  filterEscalatingDefaultMode,
  foldSessionSummary,
  forkSession,
  getSessionInfo,
  getSubagentMessages,
  InMemorySessionStore,
  importSessionToStore,
  listSubagents,
  renameSession,
  resolveSettings,
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  startup,
  tagSession,
} from '@anthropic-ai/claude-agent-sdk';
export { query } from './api/query.ts';
// MCP utilities — our own open source implementations
export { createSdkMcpServer, tool } from './mcp.ts';
// Session management — matches official SDK API
export { getSessionMessages } from './sessions/getSessionMessages.ts';
export { listSessions } from './sessions/listSessions.ts';
// Re-export all types
export type * from './types/index.ts';
