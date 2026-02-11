/**
 * Lightweight entry point — query() only, no MCP dependencies
 *
 * Import from 'open-claude-agent-sdk/query' to avoid pulling in
 * ~660KB of MCP dependencies (ajv, zod-to-json-schema, @modelcontextprotocol/sdk).
 *
 * @example
 * ```typescript
 * import { query } from 'open-claude-agent-sdk/query';
 *
 * for await (const msg of query({ prompt: 'Hello' })) {
 *   console.log(msg);
 * }
 * ```
 */

export const version = '0.9.1';

export { query } from './api/query.ts';
// Re-export all types (type-only, zero runtime cost)
export type * from './types/index.ts';
