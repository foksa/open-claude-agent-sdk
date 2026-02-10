/**
 * MCP Server utilities
 *
 * Our own implementations of createSdkMcpServer and tool helpers.
 * Uses @modelcontextprotocol/sdk (open source) for the McpServer class.
 * Compatible with official @anthropic-ai/claude-agent-sdk API.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult, ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';

// ============================================================================
// Types (compatible with official SDK)
// ============================================================================

/**
 * Zod-compatible raw shape type.
 * Matches the AnyZodRawShape from official SDK — any object whose values
 * have an `_output` property (Zod schema fields).
 */
// biome-ignore lint/suspicious/noExplicitAny: must match official SDK's AnyZodRawShape
type AnyZodRawShape = Record<string, { _output: any }>;

/**
 * Infer the output type from a Zod raw shape.
 */
type InferShape<T extends AnyZodRawShape> = {
  [K in keyof T]: T[K] extends { _output: infer O } ? O : never;
};

/**
 * Tool definition — matches official SDK's SdkMcpToolDefinition.
 */
export type SdkMcpToolDefinition<Schema extends AnyZodRawShape = AnyZodRawShape> = {
  name: string;
  description: string;
  inputSchema: Schema;
  annotations?: ToolAnnotations;
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>;
};

/**
 * SDK MCP server config — matches official SDK's McpSdkServerConfigWithInstance.
 */
type McpSdkServerConfigWithInstance = {
  type: 'sdk';
  name: string;
  instance: McpServer;
};

/**
 * Options for createSdkMcpServer.
 */
type CreateSdkMcpServerOptions = {
  name: string;
  version?: string;
  // biome-ignore lint/suspicious/noExplicitAny: must match official SDK signature
  tools?: Array<SdkMcpToolDefinition<any>>;
};

// ============================================================================
// Functions
// ============================================================================

/**
 * Create an in-process MCP server with custom tools.
 *
 * The returned server can be passed to `mcpServers` option in query().
 * Claude will discover the tools and call your handlers at runtime.
 *
 * @example
 * ```typescript
 * import { createSdkMcpServer, tool, query } from 'open-claude-agent-sdk';
 * import { z } from 'zod';
 *
 * const server = createSdkMcpServer({
 *   name: 'my-api',
 *   tools: [
 *     tool('lookup_user', 'Look up a user', { username: z.string() }, async (args) => ({
 *       content: [{ type: 'text', text: JSON.stringify(await db.getUser(args.username)) }]
 *     }))
 *   ]
 * });
 *
 * for await (const msg of query({
 *   prompt: 'Find user alice',
 *   options: { mcpServers: { 'my-api': server } }
 * })) { ... }
 * ```
 */
export function createSdkMcpServer(
  options: CreateSdkMcpServerOptions
): McpSdkServerConfigWithInstance {
  const server = new McpServer(
    { name: options.name, version: options.version ?? '1.0.0' },
    { capabilities: { tools: options.tools ? {} : undefined } }
  );

  if (options.tools) {
    for (const t of options.tools) {
      server.registerTool(
        t.name,
        {
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
        },
        t.handler
      );
    }
  }

  return { type: 'sdk', name: options.name, instance: server };
}

/**
 * Define a type-safe MCP tool with Zod schema validation.
 *
 * @example
 * ```typescript
 * import { tool } from 'open-claude-agent-sdk';
 * import { z } from 'zod';
 *
 * const myTool = tool(
 *   'get_weather',
 *   'Get weather for a city',
 *   { city: z.string().describe('City name') },
 *   async (args) => ({
 *     content: [{ type: 'text', text: `Weather in ${args.city}: sunny` }]
 *   })
 * );
 * ```
 */
export function tool<Schema extends AnyZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>,
  extras?: { annotations?: ToolAnnotations }
): SdkMcpToolDefinition<Schema> {
  return {
    name,
    description,
    inputSchema,
    handler,
    ...extras,
  };
}
