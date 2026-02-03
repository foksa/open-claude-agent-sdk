#!/usr/bin/env bun

/**
 * Test simple query (no hooks) through proxy to see message flow
 */

import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { resolve } from 'path';

const PROXY_CLI = resolve('./tests/utils/proxy-cli.cjs');

async function testSDK(sdk: 'official' | 'lite') {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${sdk.toUpperCase()} SDK (simple query, no hooks)`);
  console.log('='.repeat(60));

  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: PROXY_CLI,
  };

  console.log(`  Using CLI: ${PROXY_CLI}`);

  let msgCount = 0;
  for await (const msg of queryFn({ prompt: 'Say hi', options })) {
    msgCount++;
    console.log(`  Message ${msgCount}: ${msg.type}${msg.subtype ? ':' + msg.subtype : ''}`);

    if (msg.type === 'result') {
      break;
    }
  }

  console.log(`  Total SDK messages: ${msgCount}`);
}

async function main() {
  // Test Official SDK
  await testSDK('official');

  // Wait a bit
  await new Promise(r => setTimeout(r, 500));

  // Test Lite SDK
  await testSDK('lite');

  // Show logs
  console.log('\n' + '='.repeat(60));
  console.log('Check logs for details:');
  console.log('='.repeat(60));
  await Bun.$`ls -1 tests/research/logs/*.log`;
}

main().catch(console.error);
