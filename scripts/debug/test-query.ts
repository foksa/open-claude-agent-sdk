/**
 * Quick test script to verify query implementation
 */

import { query } from './src/index.ts';

console.log('Testing lite query implementation...\n');

try {
  for await (const msg of query({
    prompt: 'Say hello in one word',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    }
  })) {
    console.log(`[${msg.type}] ${msg.type === 'assistant' ? 'Got assistant message' : msg.type === 'result' ? `Result: ${msg.subtype}` : ''}`);

    if (msg.type === 'result') {
      break;
    }
  }

  console.log('\n✓ Query test passed!');
} catch (error: any) {
  console.error('\n✗ Query test failed:', error.message);
  process.exit(1);
}
