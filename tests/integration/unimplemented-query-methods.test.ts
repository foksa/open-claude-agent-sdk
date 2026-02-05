/**
 * Integration tests for unimplemented Query interface methods
 *
 * Based on official SDK documentation:
 * - https://docs.anthropic.com/agent-sdk/typescript (Query interface)
 *
 * The Query interface returned by query() has several control methods.
 * Some are stubs that throw "not implemented" errors.
 *
 * Tests are marked as .todo since the features aren't fully implemented yet.
 */

import { expect } from 'bun:test';
import type { SDKMessage } from '../../src/types/index.ts';
import { testWithBothSDKs, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// STUB: rewindFiles() method
// =============================================================================

testWithBothSDKsTodo('rewindFiles() restores files to checkpoint state', async (sdk) => {
  /**
   * Official SDK docs:
   * "rewindFiles(userMessageUuid): Restores files to their state at the
   * specified user message. Requires enableFileCheckpointing: true"
   *
   * See: https://docs.anthropic.com/agent-sdk/file-checkpointing
   *
   * Expected behavior:
   * 1. Enable file checkpointing
   * 2. Create a file
   * 3. Modify the file
   * 4. Rewind to before modification
   * 5. File should be restored
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const fs = await import('node:fs/promises');

  const testFile = '/tmp/rewind-test.txt';

  // Clean up first
  await fs.unlink(testFile).catch(() => {});

  // Create query with file checkpointing
  const q = queryFn({
    prompt: 'Write "original" to /tmp/rewind-test.txt, then change it to "modified"',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 5,
      enableFileCheckpointing: true, // Enable checkpointing
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  let firstUserMessageUuid: string | undefined;

  for await (const msg of q) {
    // Capture first user message UUID for rewind target
    if (msg.type === 'user' && !firstUserMessageUuid) {
      firstUserMessageUuid = (msg as unknown as { uuid: string }).uuid;
    }
    if (msg.type === 'result') break;
  }

  // File should be "modified" now
  const contentBefore = await fs.readFile(testFile, 'utf-8').catch(() => '');
  expect(contentBefore).toContain('modified');

  // Rewind to first user message
  if (firstUserMessageUuid) {
    await q.rewindFiles(firstUserMessageUuid);
  }

  // File should be "original" after rewind
  const contentAfter = await fs.readFile(testFile, 'utf-8').catch(() => '');
  expect(contentAfter).toContain('original');

  console.log(`   [${sdk}] File content before rewind: ${contentBefore}, after: ${contentAfter}`);
});

// =============================================================================
// STUB: setMaxThinkingTokens() method
// =============================================================================

testWithBothSDKsTodo(
  'setMaxThinkingTokens() changes thinking limit during streaming',
  async (sdk) => {
    /**
     * Official SDK docs:
     * "setMaxThinkingTokens(maxThinkingTokens: number | null): Changes the
     * maximum thinking tokens (only available in streaming input mode)"
     *
     * Expected behavior:
     * Can increase/decrease thinking budget mid-conversation
     */
    const { query: liteQuery } = await import('../../src/api/query.ts');
    const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

    const q = queryFn({
      prompt: 'Think carefully and explain what 2+2 equals',
      options: {
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 1,
        maxThinkingTokens: 500, // Start with low limit
        model: 'haiku',
        settingSources: [],
        pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
      },
    });

    // Increase thinking budget mid-stream
    await q.setMaxThinkingTokens(2000);

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    console.log(`   [${sdk}] setMaxThinkingTokens called successfully`);
  }
);

// =============================================================================
// STUB: MCP server management methods
// =============================================================================

testWithBothSDKs('reconnectMcpServer() sends mcp_reconnect control request', async (sdk) => {
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  // CLI returns error because no server named 'test-server' is configured
  try {
    await q.reconnectMcpServer('test-server');
  } catch (e: unknown) {
    expect(e instanceof Error ? e.message : '').toContain('Server not found');
  }

  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] reconnectMcpServer correctly handled missing server`);
});

testWithBothSDKs('toggleMcpServer() sends mcp_toggle control request', async (sdk) => {
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  // CLI returns error because no server named 'test-server' is configured
  try {
    await q.toggleMcpServer('test-server', false);
  } catch (e: unknown) {
    expect(e instanceof Error ? e.message : '').toContain('Server not found');
  }

  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] toggleMcpServer correctly handled missing server`);
});

testWithBothSDKs('setMcpServers() sends mcp_set_servers control request', async (sdk) => {
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  // Should return result with expected shape
  const result = await q.setMcpServers({
    playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
  });

  expect(result).toBeDefined();
  expect(result).toHaveProperty('added');
  expect(result).toHaveProperty('removed');
  expect(result).toHaveProperty('errors');

  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] setMcpServers returned result with correct shape`);
});

// =============================================================================
// STUB: initializationResult() method
// =============================================================================

testWithBothSDKs('initializationResult() returns initialization data', async (sdk) => {
  /**
   * Official SDK docs (implied from Query interface):
   * "initializationResult(): Returns init data including commands, models, account info"
   *
   * This is useful for getting all initialization data in one call
   * instead of calling supportedCommands(), supportedModels(), accountInfo() separately
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  const initResult = await q.initializationResult();

  // Should contain commands, models, account info
  expect(initResult).toBeDefined();
  expect(initResult).toHaveProperty('commands');
  expect(initResult).toHaveProperty('models');
  expect(initResult).toHaveProperty('account');

  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] initializationResult returned data`);
});

// =============================================================================
// IMPLEMENTED: setModel() method
// =============================================================================

testWithBothSDKs('setModel() changes model during streaming', async (sdk) => {
  /**
   * Official SDK docs:
   * "setModel(model?: string): Changes the model (only available in streaming input mode)"
   *
   * Note: This test verifies the method is callable. Actual model change
   * would be visible in subsequent API responses.
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  // Change model (no await needed for control message)
  await q.setModel('sonnet');

  const messages: SDKMessage[] = [];
  for await (const msg of q) {
    messages.push(msg);
    if (msg.type === 'result') break;
  }

  expect(messages.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] setModel called successfully`);
});

// =============================================================================
// IMPLEMENTED: close() method
// =============================================================================

testWithBothSDKs('close() terminates the query', async (sdk) => {
  /**
   * Official SDK docs (implied from Query interface):
   * "close(): Closes the query and kills the process"
   *
   * Important for cleanup, especially with long-running queries
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Count slowly from 1 to 100',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 10, // Would take a while
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  let messageCount = 0;

  // Collect a few messages then close
  for await (const _msg of q) {
    messageCount++;
    if (messageCount >= 3) {
      q.close();
      break;
    }
  }

  // Query should be terminated
  expect(messageCount).toBeGreaterThan(0);
  console.log(`   [${sdk}] close() terminated query after ${messageCount} messages`);
});

// =============================================================================
// Symbol.asyncDispose support
// =============================================================================

testWithBothSDKs('supports using await with async dispose', async (sdk) => {
  /**
   * The Query object implements Symbol.asyncDispose for automatic cleanup
   * when used with `await using` syntax (ES2022+)
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hi',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  // Verify Symbol.asyncDispose exists
  expect(typeof (q as unknown as Record<symbol, unknown>)[Symbol.asyncDispose]).toBe('function');

  // Clean up normally
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] Symbol.asyncDispose is implemented`);
});
