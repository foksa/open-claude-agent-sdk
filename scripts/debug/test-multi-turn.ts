/**
 * Test multi-turn for both Official and Lite SDK
 */

import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from './src/index.ts';

async function testSDK(name: string, queryFn: typeof officialQuery) {
  console.log(`\n=== Testing ${name} ===\n`);

  const q = queryFn({
    prompt: 'Say hello in one word',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 10,
    },
  });

  let sessionId = '';
  let firstResultSeen = false;

  try {
    for await (const msg of q) {
      console.log(`[${name}] ${msg.type}${msg.subtype ? `:${msg.subtype}` : ''}`);

      if (msg.type === 'system' && msg.session_id) {
        sessionId = msg.session_id;
      }

      if (msg.type === 'result' && !firstResultSeen) {
        firstResultSeen = true;
        console.log(`[${name}] First result:`, msg.result);
        console.log(`[${name}] Continuing conversation...`);

        // Continue conversation
        await q.streamInput([
          {
            type: 'user',
            message: {
              role: 'user',
              content: 'Now say goodbye in one word',
            },
            session_id: sessionId,
            parent_tool_use_id: null,
          },
        ]);

        console.log(`[${name}] streamInput() called, waiting for next messages...`);
      } else if (msg.type === 'result' && firstResultSeen) {
        console.log(`[${name}] Second result:`, msg.result);
        console.log(`[${name}] ✅ Multi-turn SUCCESS!`);
        q.close();
        break;
      }
    }
  } catch (error: any) {
    console.error(`[${name}] ❌ Error:`, error.message);
  }
}

// Test both
await testSDK('Official SDK', officialQuery);
await testSDK('Lite SDK', liteQuery);

console.log('\n=== Tests Complete ===\n');
