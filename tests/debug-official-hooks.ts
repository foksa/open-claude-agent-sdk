/**
 * Debug: See what official SDK sends for hooks
 */

import { spawn } from 'node:child_process';
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { HookCallbackMatcher } from '@anthropic-ai/claude-agent-sdk';

// Monkey-patch spawn to see what args are used
const originalSpawn = spawn;
(global as any).originalSpawn = originalSpawn;

console.log('Testing official SDK with hooks...\n');

const hooks: Record<string, HookCallbackMatcher[]> = {
  PreToolUse: [
    {
      matcher: { toolNames: ['Read'] },
      hooks: [
        async (input, toolUseId, context) => {
          console.log('✓ PreToolUse hook called!');
          return { continue: true };
        }
      ]
    }
  ]
};

(async () => {
  const q = query({
    prompt: 'Read the package.json file',
    options: {
      maxTurns: 2,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      hooks
    }
  });

  for await (const msg of q) {
    console.log('Message:', msg.type);
    if (msg.type === 'result') {
      break;
    }
  }
})();
