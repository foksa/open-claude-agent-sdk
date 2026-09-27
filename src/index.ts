/**
 * Open Claude Agent SDK
 * A lightweight alternative to Claude Agent SDK - uses local CLI
 */

export const version = '0.51.0';

export { query } from './api/query.ts';
// Runtime values the official SDK exports — our own implementations, so the
// package has no runtime dependency on @anthropic-ai/claude-agent-sdk
export {
  AbortError,
  EXIT_REASONS,
  HOOK_EVENTS,
  ORG_POLICY_LIMIT_PREFIXES,
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  USAGE_LIMIT_ERROR_PREFIXES,
  USAGE_TRANSITION_PREFIXES,
  USAGE_WARNING_PREFIXES,
} from './constants.ts';
// MCP utilities — our own open source implementations
export { createSdkMcpServer, tool } from './mcp.ts';
// Session management — matches official SDK API
export { forkSession } from './sessions/forkSession.ts';
export { getSessionInfo } from './sessions/getSessionInfo.ts';
export { getSessionMessages } from './sessions/getSessionMessages.ts';
export { listSessions } from './sessions/listSessions.ts';
export { deleteSession, renameSession, tagSession } from './sessions/mutations.ts';
export { getSubagentMessages, listSubagents } from './sessions/subagents.ts';
// Re-export all types
export type * from './types/index.ts';
