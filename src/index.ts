/**
 * Lite Claude Agent SDK
 * A lightweight alternative to Claude Agent SDK - uses local CLI
 */

export const version = '0.1.0';

export { query } from './api/query.ts';
// MCP utilities — our own open source implementations
export { createSdkMcpServer, tool } from './mcp.ts';
// Re-export all types
export type * from './types/index.ts';
