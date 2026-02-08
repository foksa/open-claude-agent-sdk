/**
 * Integration tests for control protocol methods
 *
 * Tests real round-trip of control methods like accountInfo() and mcpServerStatus().
 * Unit tests verify wire format; these tests verify actual responses from CLI.
 */

import { expect } from 'bun:test';
import path from 'node:path';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';
import type { McpStdioServerConfig, Options } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

const CLI_PATH = path.resolve('./node_modules/@anthropic-ai/claude-agent-sdk/cli.js');

/** Run a query, invoke a control method, then consume remaining messages */
async function queryWithControlMethod<T>(
  sdk: 'lite' | 'official',
  method: (q: ReturnType<typeof liteQuery>) => Promise<T>,
  extraOptions?: Partial<Options>
): Promise<T> {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const q = queryFn({
    prompt: 'Say hello',
    options: {
      model: 'haiku',
      permissionMode: 'default',
      settingSources: [],
      pathToClaudeCodeExecutable: CLI_PATH,
      maxTurns: 1,
      ...extraOptions,
    },
  });

  const result = await method(q);

  // Consume remaining messages
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  return result;
}

testWithBothSDKs(
  'accountInfo() returns account data with expected shape',
  async (sdk) => {
    const info = await queryWithControlMethod(sdk, (q) => q.accountInfo());

    // accountInfo should return an object with account details
    expect(info).toBeDefined();
    expect(typeof info).toBe('object');

    // The response should have some account fields
    // (exact fields depend on the CLI version, but it shouldn't be null/undefined)
    console.log(`   [${sdk}] accountInfo() returned:`, JSON.stringify(info).slice(0, 200));
  },
  120000
);

testWithBothSDKs(
  'mcpServerStatus() returns valid response',
  async (sdk) => {
    const status = await queryWithControlMethod(sdk, (q) => q.mcpServerStatus());

    // mcpServerStatus should return something (empty object or status info)
    expect(status).toBeDefined();

    console.log(`   [${sdk}] mcpServerStatus() returned:`, JSON.stringify(status).slice(0, 200));
  },
  120000
);

// =============================================================================
// MCP Server Control Methods (happy-path with real SDK MCP server)
// =============================================================================

import { createSdkMcpServer, tool } from '../../src/types/index.ts';

/** A simple SDK MCP server for control method tests */
const createTestServer = () =>
  createSdkMcpServer({
    name: 'test-control',
    tools: [
      tool('ping', 'Returns pong', {}, async () => ({
        content: [{ type: 'text' as const, text: 'pong' }],
      })),
    ],
  });

testWithBothSDKs(
  'mcpServerStatus() shows SDK MCP server status',
  async (sdk) => {
    const server = createTestServer();

    const status = await queryWithControlMethod(sdk, (q) => q.mcpServerStatus(), {
      mcpServers: { 'test-control': server },
      canUseTool: async () => ({ behavior: 'allow' as const }),
    });

    expect(status).toBeDefined();
    console.log(`   [${sdk}] mcpServerStatus() with server:`, JSON.stringify(status).slice(0, 300));
  },
  120000
);

const MCP_SERVER = path.resolve('./tests/fixtures/mcp-server.mjs');
const mcpServerOptions = {
  mcpServers: {
    'test-server': { command: 'node', args: [MCP_SERVER] } as McpStdioServerConfig,
  },
};

testWithBothSDKs(
  'toggleMcpServer() disables and re-enables a stdio MCP server',
  async (sdk) => {
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
    const q = queryFn({
      prompt: 'Say hello',
      options: {
        model: 'haiku',
        permissionMode: 'default',
        settingSources: [],
        pathToClaudeCodeExecutable: CLI_PATH,
        maxTurns: 1,
        ...mcpServerOptions,
      },
    });

    await q.toggleMcpServer('test-server', false);
    console.log(`   [${sdk}] toggleMcpServer(false) succeeded`);

    await q.toggleMcpServer('test-server', true);
    console.log(`   [${sdk}] toggleMcpServer(true) succeeded`);

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }
  },
  120000
);

testWithBothSDKs(
  'reconnectMcpServer() reconnects a stdio MCP server',
  async (sdk) => {
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
    const q = queryFn({
      prompt: 'Say hello',
      options: {
        model: 'haiku',
        permissionMode: 'default',
        settingSources: [],
        pathToClaudeCodeExecutable: CLI_PATH,
        maxTurns: 1,
        ...mcpServerOptions,
      },
    });

    await q.reconnectMcpServer('test-server');
    console.log(`   [${sdk}] reconnectMcpServer() succeeded`);

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }
  },
  120000
);

testWithBothSDKs(
  'setMcpServers() updates server configuration',
  async (sdk) => {
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
    const q = queryFn({
      prompt: 'Say hello',
      options: {
        model: 'haiku',
        permissionMode: 'default',
        settingSources: [],
        pathToClaudeCodeExecutable: CLI_PATH,
        maxTurns: 1,
        canUseTool: async () => ({ behavior: 'allow' as const }),
      },
    });

    // Set a new stdio MCP server config
    const result = await q.setMcpServers({
      'new-server': {
        command: 'echo',
        args: ['hello'],
      } as McpStdioServerConfig,
    });

    expect(result).toBeDefined();
    console.log(`   [${sdk}] setMcpServers() returned:`, JSON.stringify(result).slice(0, 300));

    // Consume remaining messages
    for await (const msg of q) {
      if (msg.type === 'result') break;
    }
  },
  120000
);
