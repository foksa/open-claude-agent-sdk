/**
 * Test Lite SDK with AsyncIterable input (like Official SDK)
 */

import { query } from './src/index.ts';
import type { SDKUserMessage } from './src/types/index.ts';

console.log('Testing Lite SDK with AsyncIterable input...\n');

async function* messageGenerator() {
  // First message
  console.log('[Generator] Yielding first message...');
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: 'Say hello in one word',
    },
    session_id: '',
    parent_tool_use_id: null,
  } as SDKUserMessage;

  // Wait a bit
  await new Promise((resolve) => setTimeout(resolve, 3000));

  // Second message
  console.log('[Generator] Yielding second message...');
  yield {
    type: 'user',
    message: {
      role: 'user',
      content: 'Now say goodbye in one word',
    },
    session_id: '',
    parent_tool_use_id: null,
  } as SDKUserMessage;

  console.log('[Generator] Done yielding messages');
}

const q = query({
  prompt: messageGenerator(),
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 10,
  },
});

let resultCount = 0;

console.log('Starting query iteration...\n');

for await (const msg of q) {
  console.log(`[${msg.type}${msg.subtype ? `:${msg.subtype}` : ''}]`);

  if (msg.type === 'result') {
    resultCount++;
    console.log(`\n✅ Result #${resultCount}: ${msg.result}\n`);
  }
}

console.log(`\nReceived ${resultCount} result(s)`);
console.log(
  resultCount === 2 ? '✅ Multi-turn with AsyncIterable WORKS!' : '❌ Expected 2 results'
);
