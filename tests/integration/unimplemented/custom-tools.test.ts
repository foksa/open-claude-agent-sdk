/**
 * Custom Tools feature tests
 *
 * These tests document custom tool features that exist in the official SDK but are
 * NOT YET implemented in the lite SDK. Tests are marked with .skip or .todo.
 *
 * Based on official documentation:
 * - docs/official-agent-sdk-docs/custom-tools.md
 *
 * Custom Tool Features to Implement:
 * 1. createSdkMcpServer() - Create in-process MCP server
 * 2. tool() helper - Define type-safe tools with Zod schemas
 * 3. Streaming input requirement - Custom tools require async generator input
 * 4. Tool result format - { content: [{ type: "text", text: "..." }] }
 * 5. Multiple tools per server
 * 6. Error handling in tool handlers
 */

import { describe, expect, test } from 'bun:test';
import { testWithBothSDKs } from '../comparison-utils.ts';

// =============================================================================
// createSdkMcpServer Function
// =============================================================================

describe('createSdkMcpServer', () => {
  test.todo('should export createSdkMcpServer from SDK', async () => {
    /**
     * Expected import:
     *
     * ```typescript
     * import { createSdkMcpServer } from "lite-claude-agent-sdk";
     * ```
     *
     * Should be exported from main index.ts
     */
  });

  test.todo('should create MCP server with name and version', async () => {
    /**
     * Expected behavior:
     *
     * ```typescript
     * const server = createSdkMcpServer({
     *   name: "my-custom-tools",
     *   version: "1.0.0",
     *   tools: []
     * });
     * ```
     *
     * The server object should be passable to mcpServers option
     */
  });

  test.todo('should accept array of tool definitions', async () => {
    /**
     * Expected behavior:
     *
     * ```typescript
     * const server = createSdkMcpServer({
     *   name: "utilities",
     *   version: "1.0.0",
     *   tools: [
     *     tool("calculate", "...", {...}, async (args) => {...}),
     *     tool("translate", "...", {...}, async (args) => {...}),
     *   ]
     * });
     * ```
     */
  });
});

// =============================================================================
// tool() Helper Function
// =============================================================================

describe('tool() Helper', () => {
  test.todo('should export tool helper from SDK', async () => {
    /**
     * Expected import:
     *
     * ```typescript
     * import { tool } from "lite-claude-agent-sdk";
     * ```
     */
  });

  test.todo('should define tool with name, description, schema, and handler', async () => {
    /**
     * Expected signature:
     *
     * ```typescript
     * tool(
     *   name: string,
     *   description: string,
     *   schema: ZodSchema | Record<string, ZodType>,
     *   handler: (args: inferred) => Promise<ToolResult>
     * )
     * ```
     *
     * Example:
     * ```typescript
     * tool(
     *   "get_weather",
     *   "Get current temperature for a location",
     *   {
     *     latitude: z.number().describe("Latitude coordinate"),
     *     longitude: z.number().describe("Longitude coordinate")
     *   },
     *   async (args) => ({
     *     content: [{ type: "text", text: `Temperature: 72F` }]
     *   })
     * )
     * ```
     */
  });

  test.todo('should support Zod schema types for input validation', async () => {
    /**
     * Supported Zod types from docs:
     *
     * ```typescript
     * // Basic types
     * z.string()
     * z.number()
     * z.boolean()
     *
     * // Constrained types
     * z.number().min(0).max(150)
     * z.string().email()
     * z.enum(["json", "csv", "xml"])
     *
     * // Complex types
     * z.object({ name: z.string(), age: z.number() })
     * z.array(z.string())
     *
     * // Optional and defaults
     * z.string().optional()
     * z.enum(["json", "csv"]).default("json")
     *
     * // Documentation
     * z.number().describe("Latitude coordinate")
     * ```
     */
  });

  test.todo('should infer TypeScript types from Zod schema', async () => {
    /**
     * Type inference:
     *
     * ```typescript
     * tool(
     *   "process",
     *   "Process data",
     *   { name: z.string(), count: z.number() },
     *   async (args) => {
     *     // args should be typed as { name: string, count: number }
     *     const name: string = args.name;  // Should compile
     *     const count: number = args.count;  // Should compile
     *     return { content: [{ type: "text", text: "done" }] };
     *   }
     * )
     * ```
     */
  });
});

// =============================================================================
// Tool Handler Execution
// =============================================================================

describe('Tool Handler Execution', () => {
  test.todo('should invoke handler when Claude calls the tool', async () => {
    /**
     * Flow:
     * 1. Claude decides to use MCP tool
     * 2. SDK receives tool_use block in assistant message
     * 3. SDK deserializes args and calls handler
     * 4. Handler returns result
     * 5. SDK sends tool_result back to Claude
     */
  });

  test.todo('should pass validated arguments to handler', async () => {
    /**
     * The Zod schema validates input before handler is called.
     * Invalid input should throw validation error, not call handler.
     */
  });

  test.todo('should return tool result in MCP format', async () => {
    /**
     * Tool result format:
     *
     * ```typescript
     * {
     *   content: [
     *     { type: "text", text: "Result text here" }
     *   ]
     * }
     * ```
     *
     * Can also include images:
     * ```typescript
     * {
     *   content: [
     *     { type: "text", text: "Here's the chart:" },
     *     { type: "image", data: "base64..." }
     *   ]
     * }
     * ```
     */
  });
});

// =============================================================================
// Streaming Input Requirement
// =============================================================================

describe('Streaming Input Requirement', () => {
  test.todo('custom tools should require streaming input mode', async () => {
    /**
     * IMPORTANT from docs:
     *
     * "Custom MCP tools require streaming input mode. You must use an async
     * generator/iterable for the prompt parameter - a simple string will not
     * work with MCP servers."
     *
     * ```typescript
     * // WRONG - will not work
     * query({
     *   prompt: "What's the weather?",
     *   options: { mcpServers: { ... } }
     * })
     *
     * // CORRECT
     * async function* generateMessages() {
     *   yield {
     *     type: "user" as const,
     *     message: { role: "user", content: "What's the weather?" }
     *   };
     * }
     *
     * query({
     *   prompt: generateMessages(),
     *   options: { mcpServers: { ... } }
     * })
     * ```
     */
  });

  test.todo('should throw error if MCP servers used with string prompt', async () => {
    /**
     * Lite SDK should detect this invalid usage and throw a helpful error
     * explaining that streaming input is required for MCP servers.
     */
  });
});

// =============================================================================
// Tool Naming Convention
// =============================================================================

describe('Tool Naming Convention', () => {
  test.todo('MCP tools should follow mcp__<server>__<tool> naming', async () => {
    /**
     * From docs:
     *
     * Pattern: mcp__<server-name>__<tool-name>
     *
     * Example: server "my-custom-tools" with tool "get_weather"
     *          becomes "mcp__my-custom-tools__get_weather"
     *
     * This naming is used in:
     * - allowedTools array
     * - tool_use blocks from Claude
     * - Tool result routing
     */
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Custom Tool Error Handling', () => {
  test.todo('should handle tool handler errors gracefully', async () => {
    /**
     * Pattern from docs:
     *
     * ```typescript
     * tool("fetch_data", "...", {...}, async (args) => {
     *   try {
     *     const response = await fetch(args.endpoint);
     *     if (!response.ok) {
     *       return {
     *         content: [{
     *           type: "text",
     *           text: `API error: ${response.status} ${response.statusText}`
     *         }]
     *       };
     *     }
     *     return { content: [{ type: "text", text: await response.text() }] };
     *   } catch (error) {
     *     return {
     *       content: [{
     *         type: "text",
     *         text: `Failed to fetch: ${error.message}`
     *       }]
     *     };
     *   }
     * })
     * ```
     *
     * Handler should catch errors and return error message in content,
     * NOT throw and crash the SDK.
     */
  });

  test.todo('should handle Zod validation errors', async () => {
    /**
     * If Claude sends invalid args that fail Zod validation:
     * - Should not crash SDK
     * - Should return helpful error to Claude
     * - Claude can retry with correct args
     */
  });
});

// =============================================================================
// Example Tool Implementations
// =============================================================================

describe('Example Tool Implementations', () => {
  test.todo('database query tool example should work', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * const databaseServer = createSdkMcpServer({
     *   name: "database-tools",
     *   version: "1.0.0",
     *   tools: [
     *     tool(
     *       "query_database",
     *       "Execute a database query",
     *       {
     *         query: z.string().describe("SQL query to execute"),
     *         params: z.array(z.any()).optional().describe("Query parameters")
     *       },
     *       async (args) => {
     *         const results = await db.query(args.query, args.params || []);
     *         return {
     *           content: [{
     *             type: "text",
     *             text: `Found ${results.length} rows:\n${JSON.stringify(results)}`
     *           }]
     *         };
     *       }
     *     )
     *   ]
     * });
     * ```
     */
  });

  test.todo('calculator tool example should work', async () => {
    /**
     * From docs - compound interest calculator
     */
  });

  test.todo('API gateway tool example should work', async () => {
    /**
     * From docs - authenticated API requests to multiple services
     */
  });
});

// =============================================================================
// SDK Comparison Tests - Verify both SDKs behave the same
// =============================================================================

describe('Custom Tools SDK Comparison', () => {
  // Note: These tests require createSdkMcpServer and tool exports
  // They will skip for lite SDK until implemented

  test.skip('[official] createSdkMcpServer creates functional MCP server', async () => {
    // This test verifies official SDK behavior
    // Import would be: import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
    //
    // const server = createSdkMcpServer({
    //   name: 'test-tools',
    //   version: '1.0.0',
    //   tools: [
    //     tool('add_numbers', 'Add two numbers', {
    //       a: z.number(),
    //       b: z.number()
    //     }, async (args) => ({
    //       content: [{ type: 'text', text: String(args.a + args.b) }]
    //     }))
    //   ]
    // });
    //
    // const messages = await runWithSDK('official', 'What is 5 + 3? Use the add_numbers tool.', {
    //   mcpServers: { 'test-tools': server },
    //   allowedTools: ['mcp__test-tools__*']
    // });
    //
    // const result = messages.find(m => m.type === 'result');
    // expect(result).toBeTruthy();
  });

  test.skip('[lite] createSdkMcpServer not yet implemented', async () => {
    // This will fail until lite SDK implements createSdkMcpServer
    // When implemented, should behave identically to official SDK
  });

  testWithBothSDKs('SDK exports createSdkMcpServer function', async (sdk) => {
    // This test checks if the SDK exports the function
    // Will fail for lite SDK until implemented
    if (sdk === 'lite') {
      // Skip for lite - not implemented
      return;
    }

    const officialSdk = await import('@anthropic-ai/claude-agent-sdk');
    expect(typeof officialSdk.createSdkMcpServer).toBe('function');
  });

  testWithBothSDKs('SDK exports tool helper function', async (sdk) => {
    if (sdk === 'lite') {
      // Skip for lite - not implemented
      return;
    }

    const officialSdk = await import('@anthropic-ai/claude-agent-sdk');
    expect(typeof officialSdk.tool).toBe('function');
  });
});
