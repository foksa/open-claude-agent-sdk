/**
 * Comparison tests for image upload via streaming input
 * Verifies that base64 image content blocks are passed through to CLI
 *
 * Uses AsyncIterable prompt for proper multi-turn.
 */

import { expect } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import type { SDKMessage, SDKUserMessage } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

// 10x10 solid red PNG (75 bytes)
// Generated programmatically — pure red (#FF0000) square
const RED_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAIAAAACUFjqAAAAEklEQVR4nGP4z8CAB+GTG8HSALfKY52fTcuYAAAAAElFTkSuQmCC';

testWithBothSDKs(
  'image upload via streaming input',
  async (sdk) => {
    const queryFn = sdk === 'open' ? openQuery : officialQuery;

    // AsyncIterable that yields a text message, then an image message.
    // No dependency on output — both messages are sent unconditionally.
    async function* inputStream(): AsyncIterable<SDKUserMessage> {
      yield {
        type: 'user',
        message: { role: 'user', content: 'Say "ready" in one word' },
        session_id: '',
        parent_tool_use_id: null,
      };

      // Wait for CLI to process first message and respond
      await new Promise((r) => setTimeout(r, 5000));

      yield {
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
        session_id: '',
        parent_tool_use_id: null,
      };
    }

    const q = queryFn({
      prompt: inputStream(),
      options: {
        maxTurns: 3,
        permissionMode: 'default',
        canUseTool: () => ({ behavior: 'allow' as const }),
      },
    });

    let firstResultSeen = false;
    let imageResponseResult = '';

    for await (const msg of q) {
      if (msg.type === 'result' && !firstResultSeen) {
        firstResultSeen = true;
      } else if (msg.type === 'result' && firstResultSeen) {
        imageResponseResult = (msg as SDKMessage & { result?: string }).result ?? '';
        q.close();
        break;
      }
    }

    expect(firstResultSeen).toBe(true);
    expect(imageResponseResult).toBeTruthy();
    expect(imageResponseResult.toLowerCase()).toContain('red');
    console.log(`   [${sdk}] Image upload: "${imageResponseResult.substring(0, 60)}"`);
  },
  120000
);
