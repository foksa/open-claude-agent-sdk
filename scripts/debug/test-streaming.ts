/**
 * Test streaming with longer response
 */

import { query } from './src/index.ts';

console.log('Testing streaming with longer response...\n');

let streamEventCount = 0;
let assistantCount = 0;

try {
  for await (const msg of query({
    prompt: 'Write a short haiku about coding',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      includePartialMessages: true, // Enable streaming!
    },
  })) {
    if (msg.type === 'stream_event') {
      streamEventCount++;
      process.stdout.write('.'); // Show progress
    } else if (msg.type === 'assistant') {
      assistantCount++;
      console.log(`\n\n[assistant] Full message received`);
      if (msg.message?.content) {
        for (const block of msg.message.content) {
          if (block.type === 'text') {
            console.log(block.text);
          }
        }
      }
    } else if (msg.type === 'result') {
      console.log(`\n[result] ${msg.subtype}`);
      if (msg.subtype === 'success') {
        console.log(`Result: ${msg.result}`);
      }
      break;
    } else {
      console.log(`\n[${msg.type}]`);
    }
  }

  console.log(`\n✓ Streaming test passed!`);
  console.log(`  - stream_event messages: ${streamEventCount}`);
  console.log(`  - assistant messages: ${assistantCount}`);
} catch (error: any) {
  console.error('\n✗ Streaming test failed:', error.message);
  Bun.exit(1);
}
