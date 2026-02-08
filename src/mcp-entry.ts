/**
 * MCP entry point — createSdkMcpServer() and tool() helpers
 *
 * Import from '@lite-claude/agent-sdk/mcp' when you need in-process MCP servers.
 *
 * @example
 * ```typescript
 * import { createSdkMcpServer, tool } from '@lite-claude/agent-sdk/mcp';
 * import { z } from 'zod';
 *
 * const server = createSdkMcpServer({
 *   name: 'my-tools',
 *   tools: [
 *     tool('greet', 'Greet someone', { name: z.string() }, async (args) => ({
 *       content: [{ type: 'text', text: `Hello ${args.name}!` }]
 *     }))
 *   ]
 * });
 * ```
 */

export { createSdkMcpServer, tool } from './mcp.ts';
