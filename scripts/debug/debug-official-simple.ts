/**
 * Minimal test to debug official SDK hooks behavior
 */
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import type { HookCallbackMatcher, Options } from '../src/types/index.ts';

const hookCalls: string[] = [];

const hooks: Record<string, HookCallbackMatcher[]> = {
  PreToolUse: [
    {
      matcher: 'Read',
      hooks: [
        async (input, toolUseId, context) => {
          console.log('[DEBUG] PreToolUse hook called!', { tool_name: input.tool_name, toolUseId });
          hookCalls.push('PreToolUse-Read');
          return {}; // Return empty object as per examples
        },
      ],
    },
  ],
};

const options: Options = {
  model: 'haiku',
  maxTurns: 2,
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
  settingSources: [],
  pathToClaudeCodeExecutable: './tests/utils/proxy-cli.cjs',
  hooks,
};

console.log('[DEBUG] Starting query with options:', JSON.stringify(options, null, 2));

for await (const msg of officialQuery({ prompt: 'Read the package.json file', options })) {
  console.log(`[DEBUG] Message type: ${msg.type}`);
  if (msg.type === 'result') {
    console.log('[DEBUG] Result:', msg.subtype);
    break;
  }
}

console.log('[DEBUG] Hook calls:', hookCalls);
console.log('[DEBUG] Total hook calls:', hookCalls.length);

if (hookCalls.length === 0) {
  console.error('[ERROR] Hooks were NEVER called!');
  process.exit(1);
}
