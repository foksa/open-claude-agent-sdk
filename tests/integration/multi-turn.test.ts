/**
 * Comparison tests for multi-turn conversations
 * Same tests run with both open and official SDKs
 *
 * Uses AsyncIterable prompt for proper multi-turn.
 */

import { expect } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import type { SDKMessage, SDKUserMessage } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

testWithBothSDKs(
  'multi-turn conversation via AsyncIterable prompt',
  async (sdk) => {
    const queryFn = sdk === 'open' ? openQuery : officialQuery;

    // AsyncIterable that yields two messages with a delay between them.
    // No dependency on output — both messages are sent unconditionally.
    async function* inputStream(): AsyncIterable<SDKUserMessage> {
      yield {
        type: 'user',
        message: { role: 'user', content: 'Say hello in one word' },
        session_id: '',
        parent_tool_use_id: null,
      };

      // Wait for CLI to process first message and respond
      await new Promise((r) => setTimeout(r, 5000));

      yield {
        type: 'user',
        message: { role: 'user', content: 'Now say goodbye in one word' },
        session_id: '',
        parent_tool_use_id: null,
      };
    }

    const q = queryFn({
      prompt: inputStream(),
      options: { maxTurns: 5 },
    });

    const messages: SDKMessage[] = [];
    let resultCount = 0;

    for await (const msg of q) {
      messages.push(msg);

      if (msg.type === 'result') {
        resultCount++;
        expect(msg.subtype).toBe('success');
        expect(msg.result).toBeTruthy();
        if (resultCount >= 2) {
          q.close();
          break;
        }
      }
    }

    expect(resultCount).toBeGreaterThanOrEqual(2);
    expect(messages.length).toBeGreaterThan(2);
    console.log(`   [${sdk}] Multi-turn: ${messages.length} messages, ${resultCount} results`);
  },
  120000
);
