/**
 * Comparison tests for image upload via streaming input
 * Verifies that base64 image content blocks are passed through to CLI
 */

import { expect } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';
import type { SDKUserMessage } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

// 10x10 solid red PNG (75 bytes)
// Generated programmatically — pure red (#FF0000) square
const RED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fTcuYAAAAAElFTkSuQmCC';

testWithBothSDKs('image upload via streaming input', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say "ready" in one word',
    options: {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: () => ({ behavior: 'allow' as const }),
    },
  });

  let sessionId = '';
  let firstResultSeen = false;
  let imageResponseResult = '';

  for await (const msg of q) {
    if (msg.type === 'system') {
      sessionId = msg.session_id;
    }

    if (msg.type === 'result' && !firstResultSeen) {
      firstResultSeen = true;

      // Send follow-up with image
      const imageMessage: SDKUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'What color is this image? Reply with just the color name.',
            },
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: RED_PNG_BASE64,
              },
            },
          ],
        },
        session_id: sessionId,
        parent_tool_use_id: null,
      };

      await q.streamInput([imageMessage]);
    } else if (msg.type === 'result' && firstResultSeen) {
      imageResponseResult = msg.result ?? '';
      q.close();
      break;
    }
  }

  expect(firstResultSeen).toBe(true);
  expect(imageResponseResult).toBeTruthy();
  // Claude should identify the color as red
  expect(imageResponseResult.toLowerCase()).toContain('red');
  console.log(`   [${sdk}] Image upload: "${imageResponseResult.substring(0, 60)}"`);
});
