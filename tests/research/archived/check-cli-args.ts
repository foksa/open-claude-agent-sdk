#!/usr/bin/env bun

/**
 * Check what CLI args each SDK is using
 */

import { buildCliArgs } from '../../src/core/spawn.ts';

const options: any = {
  model: 'haiku',
  maxTurns: 1,
  settingSources: [],
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
  pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
};

console.log('Lite SDK CLI args:');
const args = buildCliArgs({ ...options, prompt: '' });
console.log(args.join(' '));
console.log('\nArg count:', args.length);
console.log('\nDetailed:');
args.forEach((arg, i) => {
  console.log(`  [${i}] ${arg}`);
});
