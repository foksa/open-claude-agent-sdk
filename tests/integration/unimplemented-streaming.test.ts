/**
 * Integration tests for unimplemented streaming features
 *
 * Based on official SDK documentation:
 * - https://docs.anthropic.com/agent-sdk/streaming-vs-single-mode (input modes)
 * - https://docs.anthropic.com/agent-sdk/streaming-output (partial messages)
 *
 * These tests document expected behavior from official docs.
 * Tests are marked as .todo since the features aren't implemented yet.
 */

import { expect } from 'bun:test';
import type { SDKMessage, SDKPartialAssistantMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// IMPLEMENTED: includePartialMessages option
// =============================================================================

testWithBothSDKs('includePartialMessages enables streaming events', async (sdk) => {
  /**
   * Official SDK docs:
   * "To receive incremental updates as text and tool calls are generated,
   * enable partial message streaming by setting includePartialMessages to true"
   */

  const messages = await runWithSDK(sdk, 'Count from 1 to 5 slowly', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    includePartialMessages: true,
  });

  // Should receive stream_event messages
  const streamEvents = messages.filter((m) => m.type === 'stream_event');
  expect(streamEvents.length).toBeGreaterThan(0);

  console.log(`   [${sdk}] Received ${streamEvents.length} stream_event messages`);
});

testWithBothSDKs('stream_event contains raw API event data', async (sdk) => {
  /**
   * Official SDK docs:
   * "SDKPartialAssistantMessage contains raw Claude API events:
   * - message_start
   * - content_block_start
   * - content_block_delta
   * - content_block_stop
   * - message_delta
   * - message_stop"
   */

  const messages = await runWithSDK(sdk, 'Say hello', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    includePartialMessages: true,
  });

  const streamEvents = messages.filter(
    (m): m is SDKPartialAssistantMessage => m.type === 'stream_event'
  );

  // Check for expected event types
  const eventTypes = new Set(streamEvents.map((e) => e.event?.type));

  // Should have at least some of these event types
  const expectedTypes = [
    'message_start',
    'content_block_start',
    'content_block_delta',
    'content_block_stop',
    'message_stop',
  ];
  const foundTypes = expectedTypes.filter((t) => eventTypes.has(t));

  expect(foundTypes.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Event types received: ${Array.from(eventTypes).join(', ')}`);
});

testWithBothSDKs('text_delta events contain text chunks', async (sdk) => {
  /**
   * Official SDK docs:
   * "Look for content_block_delta events where delta.type is text_delta,
   * which contain the actual text chunks"
   */

  const messages = await runWithSDK(sdk, 'Say "hello world"', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    includePartialMessages: true,
  });

  const streamEvents = messages.filter(
    (m): m is SDKPartialAssistantMessage => m.type === 'stream_event'
  );

  // Find text_delta events
  const textDeltas = streamEvents.filter(
    (e) => e.event?.type === 'content_block_delta' && e.event?.delta?.type === 'text_delta'
  );

  // Should have text content
  const accumulatedText = textDeltas.map((e) => e.event?.delta?.text || '').join('');

  expect(textDeltas.length).toBeGreaterThan(0);
  expect(accumulatedText.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Accumulated text: "${accumulatedText.substring(0, 50)}..."`);
});

// =============================================================================
// IMPLEMENTED: Basic streaming input mode (AsyncIterable prompt)
// =============================================================================

testWithBothSDKs('AsyncIterable prompt enables streaming input mode', async (sdk) => {
  /**
   * Official SDK docs:
   * "Streaming input mode is the preferred way to use the Claude Agent SDK.
   * Pass an AsyncIterable to prompt for multi-turn conversations."
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  async function* messageGenerator() {
    yield {
      type: 'user' as const,
      message: {
        role: 'user' as const,
        content: 'Say hello',
      },
      session_id: '',
      parent_tool_use_id: null,
    };
  }

  const messages: SDKMessage[] = [];
  for await (const msg of queryFn({
    prompt: messageGenerator(),
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  })) {
    messages.push(msg);
    if (msg.type === 'result') break;
  }

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeDefined();
  console.log(`   [${sdk}] Streaming input mode works with ${messages.length} messages`);
});

// =============================================================================
// UNIMPLEMENTED: Image attachments in streaming mode
// =============================================================================

testWithBothSDKsTodo('streaming input supports image attachments', async (sdk) => {
  /**
   * Official SDK docs:
   * "Streaming input mode benefits:
   * - Image Uploads: Attach images directly to messages for visual analysis"
   *
   * Expected behavior:
   * User can yield messages with image content in AsyncIterable
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  // Base64 encoded 1x1 red pixel PNG
  const tinyImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  async function* messageGenerator() {
    yield {
      type: 'user' as const,
      message: {
        role: 'user' as const,
        content: [
          {
            type: 'text' as const,
            text: 'What color is this image?',
          },
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/png' as const,
              data: tinyImageBase64,
            },
          },
        ],
      },
      session_id: '',
      parent_tool_use_id: null,
    };
  }

  const messages: SDKMessage[] = [];
  for await (const msg of queryFn({
    prompt: messageGenerator(),
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  })) {
    messages.push(msg);
    if (msg.type === 'result') break;
  }

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeDefined();
  console.log(`   [${sdk}] Image attachment processed`);
});

// =============================================================================
// UNIMPLEMENTED: Message queuing
// =============================================================================

testWithBothSDKsTodo('streaming input supports queued messages', async (sdk) => {
  /**
   * Official SDK docs:
   * "Queued Messages: Send multiple messages that process sequentially,
   * with ability to interrupt"
   *
   * Expected behavior:
   * Yield multiple messages from generator, they queue up and process in order
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const responseOrder: string[] = [];

  async function* messageGenerator() {
    yield {
      type: 'user' as const,
      message: { role: 'user' as const, content: 'Say "first"' },
      session_id: '',
      parent_tool_use_id: null,
    };

    // Second message queued immediately
    yield {
      type: 'user' as const,
      message: { role: 'user' as const, content: 'Say "second"' },
      session_id: '',
      parent_tool_use_id: null,
    };
  }

  for await (const msg of queryFn({
    prompt: messageGenerator(),
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 2,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  })) {
    if (msg.type === 'assistant') {
      // Track response content
      const content = (msg.message?.content || [])
        .filter((c: Record<string, unknown>) => c.type === 'text')
        .map((c: Record<string, unknown>) => c.text)
        .join('');
      responseOrder.push(content);
    }
    if (msg.type === 'result') break;
  }

  // Should have processed both messages in order
  expect(responseOrder.length).toBe(2);
  console.log(`   [${sdk}] Queued ${responseOrder.length} responses`);
});

// =============================================================================
// PARTIAL: Query.interrupt() method
// =============================================================================

testWithBothSDKsTodo('interrupt() cancels in-progress streaming', async (sdk) => {
  /**
   * Official SDK docs:
   * "interrupt(): Interrupts the query (only available in streaming input mode)"
   *
   * Expected behavior:
   * Calling interrupt() on Query object stops current generation
   */
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Write a very long story about a dragon. Make it at least 1000 words.',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
      includePartialMessages: true,
    },
  });

  let messageCount = 0;
  let interrupted = false;

  for await (const msg of q) {
    messageCount++;

    // After receiving a few stream events, interrupt
    if (messageCount > 10 && !interrupted) {
      await q.interrupt();
      interrupted = true;
    }

    if (msg.type === 'result') break;
  }

  expect(interrupted).toBe(true);
  console.log(`   [${sdk}] Interrupted after ${messageCount} messages`);
});

// =============================================================================
// STUBS: Query control methods
// =============================================================================

testWithBothSDKs('supportedCommands() returns available slash commands', async (sdk) => {
  /**
   * Official SDK docs:
   * "supportedCommands(): Returns available slash commands"
   *
   * Returns: SlashCommand[] with { name, description, argumentHint }
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

  // Get commands before consuming
  const commands = await q.supportedCommands();

  expect(Array.isArray(commands)).toBe(true);
  if (commands.length > 0) {
    expect(commands[0]).toHaveProperty('name');
    expect(commands[0]).toHaveProperty('description');
  }

  // Clean up
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] Got ${commands.length} supported commands`);
});

testWithBothSDKs('supportedModels() returns available models', async (sdk) => {
  /**
   * Official SDK docs:
   * "supportedModels(): Returns available models with display info"
   *
   * Returns: ModelInfo[] with { value, displayName, description }
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

  const models = await q.supportedModels();

  expect(Array.isArray(models)).toBe(true);
  if (models.length > 0) {
    expect(models[0]).toHaveProperty('value');
    expect(models[0]).toHaveProperty('displayName');
  }

  // Clean up
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] Got ${models.length} supported models`);
});

// Output style tests moved to output-styles.test.ts

testWithBothSDKs('mcpServerStatus() returns MCP server status', async (sdk) => {
  /**
   * Official SDK docs:
   * "mcpServerStatus(): Returns status of connected MCP servers"
   *
   * Returns: McpServerStatus[] with { name, status, serverInfo }
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

  const status = await q.mcpServerStatus();

  expect(Array.isArray(status)).toBe(true);

  // Clean up
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] Got ${status.length} MCP servers`);
});

testWithBothSDKs('accountInfo() returns account information', async (sdk) => {
  /**
   * Official SDK docs:
   * "accountInfo(): Returns account information"
   *
   * Returns: AccountInfo with { email, organization, subscriptionType, tokenSource, apiKeySource }
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

  const info = await q.accountInfo();

  expect(info).toBeDefined();
  // At minimum should have some account properties
  expect(typeof info).toBe('object');

  // Clean up
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  console.log(`   [${sdk}] Got account info`);
});

// =============================================================================
// STREAMING OUTPUT: Known limitations
// =============================================================================

testWithBothSDKsTodo('maxThinkingTokens disables stream events', async (sdk) => {
  /**
   * Official SDK docs:
   * "Known limitations:
   * - Extended thinking: when you explicitly set maxThinkingTokens,
   *   StreamEvent messages are not emitted"
   *
   * Expected behavior:
   * With maxThinkingTokens set, no stream_event messages received
   */

  const messages = await runWithSDK(sdk, 'Think step by step and say hello', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    includePartialMessages: true,
    maxThinkingTokens: 1000, // This should disable streaming
  });

  // Should NOT have stream_event messages
  const streamEvents = messages.filter((m) => m.type === 'stream_event');
  expect(streamEvents.length).toBe(0);

  // But should still have complete assistant message
  const assistantMsg = messages.find((m) => m.type === 'assistant');
  expect(assistantMsg).toBeDefined();

  console.log(`   [${sdk}] No stream events with thinking enabled`);
});
