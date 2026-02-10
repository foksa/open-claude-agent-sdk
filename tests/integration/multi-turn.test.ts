/**
 * Comparison tests for multi-turn conversations
 * Same tests run with both open and official SDKs
 */

import { expect } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import type { SDKUserMessage } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

testWithBothSDKs('multi-turn conversation via streamInput', async (sdk) => {
  const queryFn = sdk === 'open' ? openQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello in one word',
    options: {
      maxTurns: 5,
    },
  });

  let sessionId = '';
  let firstResultSeen = false;
  let secondResultSeen = false;
  const messages = [];

  for await (const msg of q) {
    messages.push(msg);

    if (msg.type === 'system') {
      sessionId = msg.session_id;
    }

    if (msg.type === 'result' && !firstResultSeen) {
      firstResultSeen = true;
      expect(msg.subtype).toBe('success');
      expect(msg.result).toBeTruthy();

      // Continue conversation with follow-up
      const followUp: SDKUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Now say goodbye in one word',
        },
        session_id: sessionId,
        parent_tool_use_id: null,
      };

      await q.streamInput([followUp]);
    } else if (msg.type === 'result' && firstResultSeen) {
      secondResultSeen = true;
      expect(msg.subtype).toBe('success');
      expect(msg.result).toBeTruthy();
      q.close();
      break;
    }
  }

  expect(firstResultSeen).toBe(true);
  expect(secondResultSeen).toBe(true);
  expect(messages.length).toBeGreaterThan(2);
  console.log(`   [${sdk}] Multi-turn: ${messages.length} messages`);
});
