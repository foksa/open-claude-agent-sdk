/**
 * Open Claude Agent SDK
 * A lightweight alternative to Claude Agent SDK - uses local CLI
 */

export const version = '0.20.0';

// Session utilities — re-exported from official SDK (read/write JSONL files directly)
// V2 Session API (unstable) — re-exported from official SDK
export {
  forkSession,
  getSessionInfo,
  getSubagentMessages,
  listSubagents,
  renameSession,
  tagSession,
  unstable_v2_createSession,
  unstable_v2_prompt,
  unstable_v2_resumeSession,
} from '@anthropic-ai/claude-agent-sdk';
export { query } from './api/query.ts';
// MCP utilities — our own open source implementations
export { createSdkMcpServer, tool } from './mcp.ts';
// Session management — matches official SDK API
export { getSessionMessages } from './sessions/getSessionMessages.ts';
export { listSessions } from './sessions/listSessions.ts';
// Re-export all types
export type * from './types/index.ts';
