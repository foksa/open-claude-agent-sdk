/**
 * MCP (Model Context Protocol) feature tests
 *
 * These tests document MCP features that exist in the official SDK but are
 * NOT YET implemented in the lite SDK. Tests are marked with .skip or .todo.
 *
 * Based on official documentation:
 * - docs/official-agent-sdk-docs/mcp.md
 *
 * MCP Features to Implement:
 * 1. mcpServers option - Configure external MCP servers (stdio, HTTP, SSE)
 * 2. SDK MCP servers - In-process custom tools via createSdkMcpServer
 * 3. MCP tool search - Dynamic tool loading for large tool sets
 * 4. MCP server status - Query connection status via mcpServerStatus()
 * 5. MCP server control - reconnectMcpServer(), toggleMcpServer(), setMcpServers()
 * 6. allowedTools with MCP wildcards - e.g., "mcp__github__*"
 */

import { describe, test } from 'bun:test';
import type { SDKType } from './comparison-utils.ts';

// Helper for skipped comparison tests
const _testWithBothSDKsSkip = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe.skip(name, () => {
    test(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

// =============================================================================
// MCP Servers Configuration (mcpServers option)
// =============================================================================

describe('MCP Servers Configuration', () => {
  test.todo('mcpServers option: should pass stdio MCP server config to CLI', async () => {
    /**
     * Expected behavior from official SDK:
     *
     * ```typescript
     * const messages = await runWithSDK('official', 'List files', {
     *   mcpServers: {
     *     "filesystem": {
     *       command: "npx",
     *       args: ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]
     *     }
     *   },
     *   allowedTools: ["mcp__filesystem__*"],
     *   permissionMode: 'bypassPermissions',
     *   allowDangerouslySkipPermissions: true,
     * });
     * ```
     *
     * Implementation notes:
     * - mcpServers should be serialized to --mcp-config flag or stdin init message
     * - Server config includes: command, args, env
     * - Need to verify CLI args match official SDK behavior
     */
  });

  test.todo('mcpServers option: should pass HTTP MCP server config to CLI', async () => {
    /**
     * Expected behavior:
     *
     * ```typescript
     * mcpServers: {
     *   "remote-api": {
     *     type: "http",
     *     url: "https://api.example.com/mcp",
     *     headers: { Authorization: "Bearer token" }
     *   }
     * }
     * ```
     *
     * Implementation notes:
     * - HTTP servers use type: "http" or "sse"
     * - Headers can include auth tokens
     */
  });

  test.todo('mcpServers option: should support environment variable expansion', async () => {
    /**
     * Expected behavior:
     *
     * In .mcp.json or code:
     * ```json
     * {
     *   "env": { "GITHUB_TOKEN": "${GITHUB_TOKEN}" }
     * }
     * ```
     *
     * The SDK/CLI should expand ${VAR} syntax at runtime
     */
  });

  test.todo('mcpServers option: system init message should include mcp_servers status', async () => {
    /**
     * Expected behavior from official SDK docs:
     *
     * ```typescript
     * if (message.type === "system" && message.subtype === "init") {
     *   console.log("MCP servers:", message.mcp_servers);
     *   // Shows connection status for each server
     * }
     * ```
     *
     * Implementation notes:
     * - The system init message should contain mcp_servers array
     * - Each server has name, status ("connected" | "failed"), etc.
     */
  });
});

// =============================================================================
// SDK MCP Servers (In-Process Custom Tools)
// =============================================================================

describe('SDK MCP Servers (Custom Tools)', () => {
  test.todo('createSdkMcpServer: should create in-process MCP server', async () => {
    /**
     * Expected behavior from official SDK:
     *
     * ```typescript
     * import { createSdkMcpServer, tool, query } from "@anthropic-ai/claude-agent-sdk";
     * import { z } from "zod";
     *
     * const customServer = createSdkMcpServer({
     *   name: "my-custom-tools",
     *   version: "1.0.0",
     *   tools: [
     *     tool(
     *       "get_weather",
     *       "Get current temperature for a location",
     *       { latitude: z.number(), longitude: z.number() },
     *       async (args) => ({
     *         content: [{ type: "text", text: "72F" }]
     *       })
     *     )
     *   ]
     * });
     *
     * // Use in query
     * for await (const msg of query({
     *   prompt: streamingInput(),  // Required for MCP
     *   options: {
     *     mcpServers: { "my-custom-tools": customServer },
     *     allowedTools: ["mcp__my-custom-tools__get_weather"]
     *   }
     * })) { ... }
     * ```
     *
     * Implementation notes:
     * - createSdkMcpServer creates an in-process MCP server
     * - tool() helper creates type-safe tool definitions with Zod schemas
     * - REQUIRES streaming input mode (async generator)
     * - Tool names become: mcp__<server-name>__<tool-name>
     */
  });

  test.todo('tool helper: should define type-safe custom tools', async () => {
    /**
     * The tool() helper provides:
     * - Name and description
     * - Zod schema for input validation
     * - Handler function that returns { content: [...] }
     *
     * Schema types supported:
     * - z.string(), z.number(), z.boolean()
     * - z.object(), z.array()
     * - z.enum() for constrained values
     * - .describe() for parameter documentation
     */
  });

  test.todo('SDK MCP server: should handle tool call and return result', async () => {
    /**
     * When Claude calls an MCP tool:
     * 1. SDK receives tool_use in assistant message
     * 2. SDK invokes the handler function with parsed args
     * 3. Handler returns { content: [{ type: "text", text: "..." }] }
     * 4. SDK sends tool result back to Claude
     *
     * The tool result format matches MCP spec:
     * { content: Array<{ type: "text", text: string } | { type: "image", data: string }> }
     */
  });

  test.todo('SDK MCP server: should handle errors gracefully', async () => {
    /**
     * Error handling pattern from docs:
     *
     * ```typescript
     * tool("fetch_data", "...", { endpoint: z.string() }, async (args) => {
     *   try {
     *     const response = await fetch(args.endpoint);
     *     if (!response.ok) {
     *       return { content: [{ type: "text", text: `Error: ${response.status}` }] };
     *     }
     *     return { content: [{ type: "text", text: await response.text() }] };
     *   } catch (error) {
     *     return { content: [{ type: "text", text: `Failed: ${error.message}` }] };
     *   }
     * })
     * ```
     */
  });
});

// =============================================================================
// MCP Tool Permissions (allowedTools)
// =============================================================================

describe('MCP Tool Permissions', () => {
  test.todo('allowedTools: should support MCP tool wildcards', async () => {
    /**
     * Expected behavior:
     *
     * ```typescript
     * allowedTools: [
     *   "mcp__github__*",           // All tools from github server
     *   "mcp__db__query",           // Only query tool from db server
     *   "mcp__slack__send_message"  // Only send_message from slack
     * ]
     * ```
     *
     * Implementation notes:
     * - Wildcards (*) allow all tools from a server
     * - Without allowedTools or permissionMode change, Claude sees but can't use tools
     * - This is for security - explicit permission required
     */
  });

  test.todo('permissionMode with MCP: acceptEdits should auto-approve MCP tools', async () => {
    /**
     * From docs:
     * - permissionMode: "acceptEdits" auto-approves tool usage
     * - permissionMode: "bypassPermissions" skips all safety prompts
     *
     * These affect MCP tools the same as built-in tools
     */
  });
});

// =============================================================================
// MCP Tool Search (Dynamic Loading)
// =============================================================================

describe('MCP Tool Search', () => {
  test.todo('tool search: should activate when MCP tools exceed context threshold', async () => {
    /**
     * From docs:
     *
     * Tool search activates automatically when MCP tools would consume >10% of context.
     * Configurable via ENABLE_TOOL_SEARCH env var:
     * - "auto" (default): 10% threshold
     * - "auto:5": 5% threshold
     * - "true": always enabled
     * - "false": disabled
     *
     * ```typescript
     * options: {
     *   env: { ENABLE_TOOL_SEARCH: "auto:5" }
     * }
     * ```
     */
  });

  test.todo('tool search: tools should be marked with defer_loading', async () => {
    /**
     * When tool search is active:
     * 1. MCP tools get defer_loading: true
     * 2. Claude uses a search tool to find relevant MCP tools
     * 3. Only needed tools are loaded into context
     *
     * This saves tokens for large MCP deployments
     */
  });
});

// =============================================================================
// MCP Server Control Methods (Query Interface)
// =============================================================================

describe('MCP Server Control Methods', () => {
  test.todo('mcpServerStatus(): should return connection status for all servers', async () => {
    /**
     * From QueryImpl.ts stub:
     * ```typescript
     * async mcpServerStatus(): Promise<any[]>
     * ```
     *
     * Expected to return array of server statuses from the init message
     * Should work after control protocol initialization
     */
  });

  test.todo('reconnectMcpServer(): should reconnect a failed MCP server', async () => {
    /**
     * From QueryImpl.ts stub:
     * ```typescript
     * async reconnectMcpServer(serverName: string): Promise<void>
     * ```
     *
     * Use case: Server connection failed at startup, want to retry
     */
  });

  test.todo('toggleMcpServer(): should enable/disable MCP server', async () => {
    /**
     * From QueryImpl.ts stub:
     * ```typescript
     * async toggleMcpServer(serverName: string, enabled: boolean): Promise<void>
     * ```
     *
     * Use case: Temporarily disable a server without removing config
     */
  });

  test.todo('setMcpServers(): should dynamically update MCP server configuration', async () => {
    /**
     * From QueryImpl.ts stub:
     * ```typescript
     * async setMcpServers(servers: Record<string, any>): Promise<any>
     * ```
     *
     * Use case: Add/remove MCP servers during a conversation
     */
  });
});

// =============================================================================
// MCP Error Handling
// =============================================================================

describe('MCP Error Handling', () => {
  test.todo('should detect MCP server connection failures in init message', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * if (message.type === "system" && message.subtype === "init") {
     *   const failedServers = message.mcp_servers.filter(
     *     s => s.status !== "connected"
     *   );
     *   if (failedServers.length > 0) {
     *     console.warn("Failed to connect:", failedServers);
     *   }
     * }
     * ```
     */
  });

  test.todo('should handle MCP server timeout gracefully', async () => {
    /**
     * From docs:
     * - Default timeout is 60 seconds for server connections
     * - Slow servers may fail to connect
     * - Error should be reportable, not crash the SDK
     */
  });
});
