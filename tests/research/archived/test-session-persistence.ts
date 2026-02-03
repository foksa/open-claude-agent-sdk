#!/usr/bin/env bun

/**
 * Test if --no-session-persistence affects caching
 */

import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';

async function testWithFlag(sdk: 'lite' | 'official', useFlag: boolean): Promise<number> {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
  };

  if (useFlag) {
    options._testCliArgs = ['--no-session-persistence'];
  }

  for await (const msg of queryFn({ prompt: 'Hi', options })) {
    if (msg.type === 'result') {
      const usage = (msg as any).usage || {};
      return (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
    }
  }

  return 0;
}

async function main() {
  console.log('='.repeat(60));
  console.log('Testing --no-session-persistence flag');
  console.log('='.repeat(60));

  const results: any[] = [];

  console.log('\n1. Official WITHOUT --no-session-persistence');
  const o1 = await testWithFlag('official', false);
  results.push({ sdk: 'official', flag: false, cache: o1 });
  console.log(`   Cache: ${o1}`);

  await new Promise(r => setTimeout(r, 500));

  console.log('\n2. Official WITH --no-session-persistence');
  const o2 = await testWithFlag('official', true);
  results.push({ sdk: 'official', flag: true, cache: o2 });
  console.log(`   Cache: ${o2}`);

  await new Promise(r => setTimeout(r, 500));

  console.log('\n3. Lite WITHOUT --no-session-persistence');
  const l1 = await testWithFlag('lite', false);
  results.push({ sdk: 'lite', flag: false, cache: l1 });
  console.log(`   Cache: ${l1}`);

  await new Promise(r => setTimeout(r, 500));

  console.log('\n4. Lite WITH --no-session-persistence');
  const l2 = await testWithFlag('lite', true);
  results.push({ sdk: 'lite', flag: true, cache: l2 });
  console.log(`   Cache: ${l2}`);

  console.log('\n' + '='.repeat(60));
  console.log('RESULTS');
  console.log('='.repeat(60));

  console.log('\n| SDK | --no-session-persistence | Cache Tokens |');
  console.log('|-----|--------------------------|--------------|');
  for (const r of results) {
    console.log(`| ${r.sdk.padEnd(8)} | ${(r.flag ? 'YES' : 'NO').padEnd(24)} | ${r.cache.toString().padEnd(12)} |`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('ANALYSIS');
  console.log('='.repeat(60));

  const diffWithout = l1 - o1;
  const diffWith = l2 - o2;

  console.log(`\nWithout flag: Lite is +${diffWithout} tokens`);
  console.log(`With flag: Lite is +${diffWith} tokens`);

  if (Math.abs(diffWith - diffWithout) < 100) {
    console.log('\n✅ Flag does NOT affect the cache difference');
  } else {
    console.log('\n⚠️  Flag DOES affect the cache difference');
  }
}

main().catch(console.error);
