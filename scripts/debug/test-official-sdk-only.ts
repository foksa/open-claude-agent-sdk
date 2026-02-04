/**
 * Test ONLY the official SDK to verify if it has bugs
 * This proves whether failures are in official SDK or our tests
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

console.log('Testing OFFICIAL SDK hooks...\n');

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
              console.log(`✅ Official SDK hook called (call #${hookCalls})`);
              console.log(`   Tool: ${input.tool_name}`);
              return { continue: true };
            },
          ],
        },
      ],
    },
  },
});

for await (const msg of result) {
  if (msg.type === 'result') {
    console.log(`\n📊 Official SDK Test Results:`);
    console.log(`   Total hook calls: ${hookCalls}`);

    if (hookCalls === 0) {
      console.error('\n❌ OFFICIAL SDK BUG: Hooks never called!');
      process.exit(1);
    }

    console.log('\n✅ Official SDK hooks work correctly');
    process.exit(0);
  }
}
