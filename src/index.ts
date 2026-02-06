/**
 * Lite Claude Agent SDK
 * A lightweight alternative to Claude Agent SDK - uses local CLI
 */

export const version = '0.1.0';

export { query } from './api/query.ts';

// Re-export all types
export type * from './types/index.ts';

// Re-export MCP utilities (these create SDK servers)
export { createSdkMcpServer, tool } from './types/index.ts';
