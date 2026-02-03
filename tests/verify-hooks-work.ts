/**
 * Simple standalone test to verify hooks work
 * Run: bun tests/verify-hooks-work.ts
 */

import { query } from '../src/api/query.ts';

let hookWasCalled = false;
let hookInput: any = null;

const result = await query({
  prompt: 'Read the package.json file',
  options: {
    model: 'haiku',
    maxTurns: 2,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    settingSources: [],
    hooks: {
      PreToolUse: [
        {
          matcher: 'Read',
          hooks: [
            async (input, toolUseId, context) => {
              hookWasCalled = true;
              hookInput = input;
              console.log('✅ Hook called!');
              console.log('   Tool:', input.tool_name);
              console.log('   Event:', input.hook_event_name);
              return {};
            }
          ]
        }
      ]
    }
  }
});

// Consume all messages
for await (const msg of result) {
  if (msg.type === 'result') {
    console.log('\n📊 Test Results:');
    console.log('   Hook was called:', hookWasCalled ? '✅ YES' : '❌ NO');
    console.log('   Hook input received:', hookInput ? '✅ YES' : '❌ NO');

    if (!hookWasCalled) {
      console.error('\n❌ FAIL: Hook was never called!');
      process.exit(1);
    }

    console.log('\n✅ SUCCESS: Hooks are working correctly!');
    process.exit(0);
  }
}

console.error('\n❌ FAIL: No result message received');
process.exit(1);
