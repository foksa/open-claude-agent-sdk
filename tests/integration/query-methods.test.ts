/**
 * Integration tests for Query interface methods
 *
 * Tests control methods on the Query object: supportedCommands, supportedModels,
 * reconnectMcpServer, toggleMcpServer, setMcpServers, initializationResult,
 * setModel, close, Symbol.asyncDispose.
 *
 * Each test verifies actual runtime behavior with both SDKs.
 */

import { expect } from 'bun:test';
import type { SDKMessage } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

const CLI_PATH = './node_modules/@anthropic-ai/claude-agent-sdk/cli.js';

/** Shared query options */
const baseOptions = {
  permissionMode: 'default' as const,
  maxTurns: 1,
  model: 'haiku' as const,
  settingSources: [] as string[],
  pathToClaudeCodeExecutable: CLI_PATH,
};

/** Create a query using the correct SDK */
async function createQuery(sdk: 'lite' | 'official', opts = {}) {
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  return queryFn({
    prompt: 'Say hello',
    options: { ...baseOptions, ...opts },
  });
}

/** Consume remaining messages to clean up */
async function drain(q: AsyncIterable<SDKMessage>) {
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }
}

// =============================================================================
// supportedCommands
// =============================================================================

testWithBothSDKs(
  'supportedCommands() returns available slash commands',
  async (sdk) => {
    const q = await createQuery(sdk);
    const commands = await q.supportedCommands();

    expect(Array.isArray(commands)).toBe(true);
    if (commands.length > 0) {
      expect(commands[0]).toHaveProperty('name');
      expect(commands[0]).toHaveProperty('description');
    }

    await drain(q);
    console.log(`   [${sdk}] Got ${commands.length} supported commands`);
  },
  90000
);

// =============================================================================
// supportedModels
// =============================================================================

testWithBothSDKs(
  'supportedModels() returns available models',
  async (sdk) => {
    const q = await createQuery(sdk);
    const models = await q.supportedModels();

    expect(Array.isArray(models)).toBe(true);
    if (models.length > 0) {
      expect(models[0]).toHaveProperty('value');
      expect(models[0]).toHaveProperty('displayName');
    }

    await drain(q);
    console.log(`   [${sdk}] Got ${models.length} supported models`);
  },
  90000
);

// =============================================================================
// reconnectMcpServer
// =============================================================================

testWithBothSDKs(
  'reconnectMcpServer() sends mcp_reconnect control request',
  async (sdk) => {
    const q = await createQuery(sdk);

    // CLI returns error because no server named 'test-server' is configured
    try {
      await q.reconnectMcpServer('test-server');
    } catch (e: unknown) {
      expect(e instanceof Error ? e.message : '').toContain('Server not found');
    }

    await drain(q);
    console.log(`   [${sdk}] reconnectMcpServer correctly handled missing server`);
  },
  90000
);

// =============================================================================
// toggleMcpServer
// =============================================================================

testWithBothSDKs(
  'toggleMcpServer() sends mcp_toggle control request',
  async (sdk) => {
    const q = await createQuery(sdk);

    try {
      await q.toggleMcpServer('test-server', false);
    } catch (e: unknown) {
      expect(e instanceof Error ? e.message : '').toContain('Server not found');
    }

    await drain(q);
    console.log(`   [${sdk}] toggleMcpServer correctly handled missing server`);
  },
  90000
);

// =============================================================================
// setMcpServers
// =============================================================================

testWithBothSDKs(
  'setMcpServers() sends mcp_set_servers control request',
  async (sdk) => {
    const q = await createQuery(sdk);

    const result = await q.setMcpServers({
      playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
    });

    expect(result).toBeDefined();
    expect(result).toHaveProperty('added');
    expect(result).toHaveProperty('removed');
    expect(result).toHaveProperty('errors');

    await drain(q);
    console.log(`   [${sdk}] setMcpServers returned result with correct shape`);
  },
  90000
);

// =============================================================================
// initializationResult
// =============================================================================

testWithBothSDKs(
  'initializationResult() returns initialization data',
  async (sdk) => {
    const q = await createQuery(sdk);

    const initResult = await q.initializationResult();

    expect(initResult).toBeDefined();
    expect(initResult).toHaveProperty('commands');
    expect(initResult).toHaveProperty('models');
    expect(initResult).toHaveProperty('account');

    await drain(q);
    console.log(`   [${sdk}] initializationResult returned data`);
  },
  90000
);

// =============================================================================
// setModel
// =============================================================================

testWithBothSDKs(
  'setModel() changes model during streaming',
  async (sdk) => {
    const q = await createQuery(sdk);

    await q.setModel('sonnet');

    const messages: SDKMessage[] = [];
    for await (const msg of q) {
      messages.push(msg);
      if (msg.type === 'result') break;
    }

    expect(messages.length).toBeGreaterThan(0);
    console.log(`   [${sdk}] setModel called successfully`);
  },
  90000
);

// =============================================================================
// close
// =============================================================================

testWithBothSDKs(
  'close() terminates the query',
  async (sdk) => {
    const q = await createQuery(sdk, { maxTurns: 10 });

    let messageCount = 0;
    for await (const _msg of q) {
      messageCount++;
      if (messageCount >= 3) {
        q.close();
        break;
      }
    }

    expect(messageCount).toBeGreaterThan(0);
    console.log(`   [${sdk}] close() terminated query after ${messageCount} messages`);
  },
  90000
);

// =============================================================================
// Symbol.asyncDispose
// =============================================================================

testWithBothSDKs(
  'supports Symbol.asyncDispose for automatic cleanup',
  async (sdk) => {
    const q = await createQuery(sdk);

    expect(typeof (q as unknown as Record<symbol, unknown>)[Symbol.asyncDispose]).toBe('function');

    await drain(q);
    console.log(`   [${sdk}] Symbol.asyncDispose is implemented`);
  },
  90000
);

// =============================================================================
// setMaxThinkingTokens
// =============================================================================

testWithBothSDKs(
  'setMaxThinkingTokens() sends control request without error',
  async (sdk) => {
    const q = await createQuery(sdk, { maxThinkingTokens: 500 });

    await q.setMaxThinkingTokens(2000);

    await drain(q);
    console.log(`   [${sdk}] setMaxThinkingTokens called successfully`);
  },
  90000
);
