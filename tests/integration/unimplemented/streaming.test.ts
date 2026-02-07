/**
 * Todo tests for unimplemented streaming features
 *
 * Implemented streaming tests are in tests/integration/streaming.test.ts
 * (includePartialMessages, AsyncIterable, interrupt).
 * These tests document expected behavior that isn't implemented yet.
 */

import { expect } from 'bun:test';
import type { SDKMessage } from '../../../src/types/index.ts';
import { runWithSDK, testWithBothSDKsTodo } from '../comparison-utils.ts';

// =============================================================================
// UNIMPLEMENTED: Image attachments in streaming mode
// =============================================================================

testWithBothSDKsTodo('streaming input supports image attachments', async (sdk) => {
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const tinyImageBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

  async function* messageGenerator() {
    yield {
      type: 'user' as const,
      message: {
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: 'What color is this image?' },
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
      permissionMode: 'default',
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
      permissionMode: 'default',
      maxTurns: 2,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  })) {
    if (msg.type === 'assistant') {
      const content = (msg.message?.content || [])
        .filter((c: Record<string, unknown>) => c.type === 'text')
        .map((c: Record<string, unknown>) => c.text)
        .join('');
      responseOrder.push(content);
    }
    if (msg.type === 'result') break;
  }

  expect(responseOrder.length).toBe(2);
  console.log(`   [${sdk}] Queued ${responseOrder.length} responses`);
});

// =============================================================================
// STREAMING OUTPUT: Known limitations
// =============================================================================

testWithBothSDKsTodo('maxThinkingTokens disables stream events', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Think step by step and say hello', {
    permissionMode: 'default',
    maxTurns: 1,
    includePartialMessages: true,
    maxThinkingTokens: 1000,
  });

  const streamEvents = messages.filter((m) => m.type === 'stream_event');
  expect(streamEvents.length).toBe(0);

  const assistantMsg = messages.find((m) => m.type === 'assistant');
  expect(assistantMsg).toBeDefined();

  console.log(`   [${sdk}] No stream events with thinking enabled`);
});
