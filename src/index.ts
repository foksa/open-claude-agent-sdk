/**
 * Lite Claude Agent SDK
 * A lightweight alternative to Claude Agent SDK - 70x smaller, uses local CLI
 *
 * Baby Steps 1-4: One-shot query implementation
 * - Re-export types from official SDK for 100% compatibility
 * - Use our own lightweight CLI wrapper (replaced in Step 3!)
 */

export const version = '0.1.0';

// Export our own query implementation (Baby Step 3 complete!)
export { query } from './api/query.ts';

// Re-export all types
export type * from './types/index.ts';

// Re-export MCP utilities (these create SDK servers)
export { createSdkMcpServer, tool } from './types/index.ts';
