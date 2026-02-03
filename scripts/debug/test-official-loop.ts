/**
 * Test if Official SDK's query loop continues after result
 */

import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';

console.log('Testing Official SDK query loop behavior...\n');

const q = officialQuery({
  prompt: 'Say hello',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 10,
  }
});

let messageCount = 0;
let resultCount = 0;

console.log('Starting for-await loop (NOT breaking on result)...\n');

try {
  for await (const msg of q) {
    messageCount++;
    console.log(`${messageCount}. ${msg.type}${msg.subtype ? `:${msg.subtype}` : ''}`);

    if (msg.type === 'result') {
      resultCount++;
      console.log(`   ⚠️  Result #${resultCount} - NOT breaking, loop should continue...`);
      // DO NOT BREAK!
    }
  }

  console.log(`\n✓ Loop ended naturally after ${messageCount} messages and ${resultCount} result(s)`);
  console.log('This means: Official SDK ends iteration after first result even without break!');

} catch (error: any) {
  console.error('Error:', error.message);
}
