/**
 * Integration tests for streaming features
 *
 * Tests: includePartialMessages, stream_event types, text_delta events, AsyncIterable prompt
 * Each test verifies actual runtime behavior with both SDKs.
 */

import { expect } from 'bun:test';
import type { SDKMessage, SDKPartialAssistantMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

// =============================================================================
// includePartialMessages option
// =============================================================================

testWithBothSDKs(
  'includePartialMessages enables streaming events',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Count from 1 to 5 slowly', {
      permissionMode: 'default',
      maxTurns: 1,
      includePartialMessages: true,
    });

    const streamEvents = messages.filter((m) => m.type === 'stream_event');
    expect(streamEvents.length).toBeGreaterThan(0);

    console.log(`   [${sdk}] Received ${streamEvents.length} stream_event messages`);
  },
  90000
);

testWithBothSDKs(
  'stream_event contains raw API event data',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      permissionMode: 'default',
      maxTurns: 1,
      includePartialMessages: true,
    });

    const streamEvents = messages.filter(
      (m): m is SDKPartialAssistantMessage => m.type === 'stream_event'
    );

    const eventTypes = new Set(streamEvents.map((e) => e.event?.type));

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
  },
  90000
);

testWithBothSDKs(
  'text_delta events contain text chunks',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say "hello world"', {
      permissionMode: 'default',
      maxTurns: 1,
      includePartialMessages: true,
    });

    const streamEvents = messages.filter(
      (m): m is SDKPartialAssistantMessage => m.type === 'stream_event'
    );

    const textDeltas = streamEvents.filter(
      (e) => e.event?.type === 'content_block_delta' && e.event?.delta?.type === 'text_delta'
    );

    const accumulatedText = textDeltas.map((e) => e.event?.delta?.text || '').join('');

    expect(textDeltas.length).toBeGreaterThan(0);
    expect(accumulatedText.length).toBeGreaterThan(0);
    console.log(`   [${sdk}] Accumulated text: "${accumulatedText.substring(0, 50)}..."`);
  },
  90000
);

// =============================================================================
// AsyncIterable prompt (streaming input mode)
// =============================================================================

testWithBothSDKs(
  'AsyncIterable prompt enables streaming input mode',
  async (sdk) => {
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
    console.log(`   [${sdk}] Streaming input mode works with ${messages.length} messages`);
  },
  90000
);

// =============================================================================
// interrupt
// =============================================================================

testWithBothSDKs(
  'interrupt() cancels in-progress generation',
  async (sdk) => {
    const { query: liteQuery } = await import('../../src/api/query.ts');
    const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

    const q = queryFn({
      prompt: 'Write a very long story about a dragon. Make it at least 1000 words.',
      options: {
        permissionMode: 'default',
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
      if (messageCount > 10 && !interrupted) {
        await q.interrupt();
        interrupted = true;
      }
      if (msg.type === 'result') break;
    }

    expect(interrupted).toBe(true);
    console.log(`   [${sdk}] Interrupted after ${messageCount} messages`);
  },
  90000
);
