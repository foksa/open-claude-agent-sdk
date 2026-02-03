/**
 * Test ONLY the lite SDK to compare with official SDK
 */

import { query } from '../src/api/query.ts';

console.log('Testing LITE SDK hooks...\n');

let hookCalls = 0;

const result = await query({
  prompt: 'Read the package.json file',
  options: {
    model: 'haiku',
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    settingSources: [],
    hooks: {
      PreToolUse: [
        {
          matcher: 'Read',
          hooks: [
            async (input, toolUseId, context) => {
              hookCalls++;
              console.log(`✅ Lite SDK hook called (call #${hookCalls})`);
              console.log(`   Tool: ${input.tool_name}`);
              return { continue: true };
            }
          ]
        }
      ]
    }
  }
});

for await (const msg of result) {
  if (msg.type === 'result') {
    console.log(`\n📊 Lite SDK Test Results:`);
    console.log(`   Total hook calls: ${hookCalls}`);

    if (hookCalls === 0) {
      console.error('\n❌ LITE SDK BUG: Hooks never called!');
      process.exit(1);
    }

    console.log('\n✅ Lite SDK hooks work correctly');
    process.exit(0);
  }
}
