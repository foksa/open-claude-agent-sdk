#!/usr/bin/env bun

/**
 * Debug script to capture stdin messages sent to CLI
 */

import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';

async function testSDK(sdk: 'lite' | 'official') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${sdk.toUpperCase()} SDK`);
  console.log('='.repeat(60));

  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
  };

  for await (const msg of queryFn({ prompt: 'Say hi', options })) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      console.log('\nTools count:', (msg as any).tools?.length || 0);
      console.log('Tools:', (msg as any).tools?.slice(0, 5));
    }
    if (msg.type === 'result') {
      const usage = (msg as any).usage || {};
      console.log('\nCache creation tokens:', usage.cache_creation_input_tokens || 0);
      console.log('Cache read tokens:', usage.cache_read_input_tokens || 0);
      break;
    }
  }
}

async function main() {
  await testSDK('official');
  await testSDK('lite');
}

main().catch(console.error);
