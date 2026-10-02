/**
 * MCP Server utilities
 *
 * Our own implementations of createSdkMcpServer and tool helpers.
 * Uses @modelcontextprotocol/sdk (open source) for the McpServer class.
 * Compatible with official @anthropic-ai/claude-agent-sdk API.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { normalizeObjectSchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { toJsonSchemaCompat } from '@modelcontextprotocol/sdk/server/zod-json-schema-compat.js';
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
  _meta?: Record<string, unknown>;
  handler: (args: InferShape<Schema>, extra: unknown) => Promise<CallToolResult>;
};

/**
 * SDK MCP server config — matches official SDK's McpSdkServerConfigWithInstance.
 */
type McpSdkServerConfigWithInstance = {
  type: 'sdk';
  name: string;
  instance: McpServer;
  /**
   * Per-server tool-call timeout in milliseconds. Overrides the
   * MCP_TOOL_TIMEOUT environment variable for this server. Only sent to the
   * CLI when it's a positive integer (matches official SDK's validation).
   */
  timeout?: number;
};

/**
 * Options for createSdkMcpServer.
 */
type CreateSdkMcpServerOptions = {
  name: string;
  version?: string;
  /** Server instructions surfaced to the model (MCP `instructions`). */
  instructions?: string;
  // biome-ignore lint/suspicious/noExplicitAny: must match official SDK signature
  tools?: Array<SdkMcpToolDefinition<any>>;
  /**
   * Per-server tool-call timeout in milliseconds. Overrides the
   * MCP_TOOL_TIMEOUT environment variable for this server. Hard wall-clock
   * limit per call. Values below 1000ms are ignored (falls through to
   * MCP_TOOL_TIMEOUT or the default). Applies when the server is first
   * registered; changing it for an already-registered server has no effect
   * until it is removed and re-added.
   */
  timeout?: number;
  /** Mark every tool as always loaded (never deferred behind tool search). */
  alwaysLoad?: boolean;
};

/**
 * Matches official SDK's validation: only a positive integer is sent to the
 * CLI, anything else falls through to MCP_TOOL_TIMEOUT or the default.
 */
function validTimeout(value: number | undefined): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

/** Warning code for a tool left out because its schema can't be converted (official SDK). */
const SCHEMA_UNCONVERTIBLE_CODE = 'CLAUDE_SDK_MCP_TOOL_SCHEMA_UNCONVERTIBLE';

const UNDEFINED_SCHEMA_HINT =
  'a schema this tool uses is not defined yet, or a zod 3 schema is nested inside a zod 4 one. Define every schema this tool uses before passing the server to query(), startup() or setMcpServers(). Build the whole schema with zod 3 or with zod 4, not a mix of the two. A zod 4 z.lazy whose function has thrown once stays broken, so create the schema, its tool and the server again to get the tool back.';

/**
 * Hint appended to the unconvertible-schema warning (official SDK text; its
 * zod-version-mismatch hint is omitted since we don't bundle our own zod).
 */
function schemaErrorHint(error: unknown): string {
  if (error instanceof ReferenceError) {
    return "Something this tool's schema reads, such as a z.lazy target or a default value, is not defined yet. Define every schema this tool uses before passing the server to query(), startup() or setMcpServers(). A zod 4 z.lazy whose function has thrown once stays broken, so create the schema, its tool and the server again to get the tool back.";
  }
  if (error instanceof TypeError) return `This can mean ${UNDEFINED_SCHEMA_HINT}`;
  return "Change this tool's schema so that every field can be converted.";
}

/**
 * Make a registered tool report itself disabled while its input schema can't
 * be converted to JSON Schema, so one bad tool drops out of `tools/list`
 * (with a single warning naming it) instead of failing the whole listing.
 * Mirrors the official SDK (v0.3.286).
 */
function guardSchemaConversion(
  registered: { enabled: boolean; inputSchema?: unknown },
  toolName: string,
  serverName: string
): void {
  if (
    !Object.getOwnPropertyDescriptor(registered, 'enabled')?.configurable ||
    !Object.isExtensible(registered)
  ) {
    return;
  }
  let enabled = registered.enabled;
  let convertedSchema: unknown;
  let warnedSchema: unknown;
  Object.defineProperty(registered, 'enabled', {
    configurable: true,
    enumerable: true,
    get() {
      if (!enabled || convertedSchema === registered.inputSchema) return enabled;
      try {
        // Same conversion McpServer's tools/list handler runs
        const obj = normalizeObjectSchema(registered.inputSchema as never);
        if (obj) toJsonSchemaCompat(obj, { strictUnions: true, pipeStrategy: 'input' });
        convertedSchema = registered.inputSchema;
        return true;
      } catch (error) {
        if (warnedSchema !== registered.inputSchema) {
          warnedSchema = registered.inputSchema;
          const reason = (error instanceof Error ? error.message : String(error)).replace(
            /\.$/,
            ''
          );
          const message = [
            `Tool "${toolName}" on SDK MCP server "${serverName}" was left out of the server's tool list, because its input schema cannot be converted to JSON Schema${reason ? `: ${reason}` : ''}. The server's other tools are unaffected.`,
            schemaErrorHint(error),
          ].join(' ');
          if (typeof process !== 'undefined' && typeof process.emitWarning === 'function') {
            process.emitWarning(message, { code: SCHEMA_UNCONVERTIBLE_CODE });
          } else {
            console.warn(message);
          }
        }
        return false;
      }
    },
    set(value: boolean) {
      enabled = value;
    },
  });
}

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
    { capabilities: { tools: options.tools ? {} : undefined }, instructions: options.instructions }
  );

  if (options.tools) {
    for (const t of options.tools) {
      const registered = server.registerTool(
        t.name,
        {
          description: t.description,
          inputSchema: t.inputSchema,
          annotations: t.annotations,
          _meta: options.alwaysLoad ? { 'anthropic/alwaysLoad': true, ...t._meta } : t._meta,
        },
        t.handler
      );
      guardSchemaConversion(registered, t.name, options.name);
    }
  }

  const timeout = validTimeout(options.timeout);
  return {
    type: 'sdk',
    name: options.name,
    instance: server,
    ...(timeout !== undefined && { timeout }),
  };
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
  extras?: { annotations?: ToolAnnotations; searchHint?: string; alwaysLoad?: boolean }
): SdkMcpToolDefinition<Schema> {
  // searchHint / alwaysLoad travel to the CLI as MCP `_meta` (official SDK keys)
  const meta: Record<string, unknown> = {};
  if (extras?.searchHint) meta['anthropic/searchHint'] = extras.searchHint;
  if (extras?.alwaysLoad) meta['anthropic/alwaysLoad'] = true;
  return {
    name,
    description,
    inputSchema,
    handler,
    annotations: extras?.annotations,
    _meta: Object.keys(meta).length > 0 ? meta : undefined,
  };
}
