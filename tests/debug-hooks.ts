/**
 * Debug script to see what hook configuration looks like
 */

import type { HookCallbackMatcher } from '../src/types/index.ts';

const hooks: Record<string, HookCallbackMatcher[]> = {
  PreToolUse: [
    {
      matcher: { toolNames: ['Read'] },
      hooks: [
        async (input, toolUseId, context) => {
          console.log('Hook called!');
          return { continue: true };
        }
      ]
    }
  ]
};

console.log('Hook configuration structure:');
console.log(JSON.stringify(hooks, null, 2));
console.log('\nHook matcher:', hooks.PreToolUse[0].matcher);
console.log('Hook function count:', hooks.PreToolUse[0].hooks.length);
