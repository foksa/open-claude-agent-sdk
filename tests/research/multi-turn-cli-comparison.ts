#!/usr/bin/env bun

/**
 * Multi-turn comparison: Embedded CLI vs Local CLI
 * Tests if the 3200 token difference exists with both CLI types
 */

import { query as liteQuery, type Query } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKUserMessage } from '../../src/types/index.ts';

interface TestResult {
  sdk: string;
  cliType: string;
  turn1Cache: number;
  turn2Cache: number;
  turn3Cache: number;
  avgCacheDiff?: number;
}

const prompts = ['What is 2+2?', 'What is 3+3?', 'What is 4+4?'];

async function* createMessageStream(prompts: string[]): AsyncGenerator<SDKUserMessage> {
  for (const prompt of prompts) {
    yield {
      type: 'user',
      message: { role: 'user', content: prompt },
      session_id: '',
      parent_tool_use_id: null
    };
  }
}

async function testSDK(sdk: 'lite' | 'official', cliType: 'embedded' | 'local'): Promise<TestResult> {
  console.log(`\n📊 Testing ${sdk.toUpperCase()} with ${cliType} CLI`);

  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const cacheTotals: number[] = [];

  const options: any = {
    model: 'haiku',
    maxTurns: 10,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };

  if (cliType === 'embedded') {
    options.pathToClaudeCodeExecutable = './node_modules/@anthropic-ai/claude-agent-sdk/cli.js';
  }

  const stream = createMessageStream(prompts);
  const queryInstance = queryFn({ prompt: stream, options }) as Query;

  for await (const msg of queryInstance) {
    if (msg.type === 'result') {
      const usage = (msg as any).usage || {};
      const cacheTotal = (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
      cacheTotals.push(cacheTotal);

      console.log(`   Turn ${cacheTotals.length}: ${cacheTotal} cache tokens`);

      if (cacheTotals.length >= 3) {
        break;
      }
    }
  }

  return {
    sdk,
    cliType,
    turn1Cache: cacheTotals[0] || 0,
    turn2Cache: cacheTotals[1] || 0,
    turn3Cache: cacheTotals[2] || 0,
  };
}

async function main() {
  console.log('='.repeat(70));
  console.log('Multi-turn CLI Comparison (3 turns)');
  console.log('='.repeat(70));

  const results: TestResult[] = [];

  // Test all combinations
  results.push(await testSDK('official', 'embedded'));
  await new Promise(r => setTimeout(r, 500));

  results.push(await testSDK('lite', 'embedded'));
  await new Promise(r => setTimeout(r, 500));

  results.push(await testSDK('official', 'local'));
  await new Promise(r => setTimeout(r, 500));

  results.push(await testSDK('lite', 'local'));

  // Calculate differences
  const officialEmbedded = results.find(r => r.sdk === 'official' && r.cliType === 'embedded')!;
  const liteEmbedded = results.find(r => r.sdk === 'lite' && r.cliType === 'embedded')!;
  const officialLocal = results.find(r => r.sdk === 'official' && r.cliType === 'local')!;
  const liteLocal = results.find(r => r.sdk === 'lite' && r.cliType === 'local')!;

  // Calculate average cache differences
  liteEmbedded.avgCacheDiff = Math.round((
    (liteEmbedded.turn1Cache - officialEmbedded.turn1Cache) +
    (liteEmbedded.turn2Cache - officialEmbedded.turn2Cache) +
    (liteEmbedded.turn3Cache - officialEmbedded.turn3Cache)
  ) / 3);

  liteLocal.avgCacheDiff = Math.round((
    (liteLocal.turn1Cache - officialLocal.turn1Cache) +
    (liteLocal.turn2Cache - officialLocal.turn2Cache) +
    (liteLocal.turn3Cache - officialLocal.turn3Cache)
  ) / 3);

  console.log('\n' + '='.repeat(70));
  console.log('RESULTS');
  console.log('='.repeat(70));

  console.log('\n| SDK | CLI Type | Turn 1 | Turn 2 | Turn 3 | Avg Diff vs Official |');
  console.log('|-----|----------|--------|--------|--------|---------------------|');

  for (const result of results) {
    const diffStr = result.avgCacheDiff ? `+${result.avgCacheDiff}` : '-';
    console.log(
      `| ${result.sdk.padEnd(8)} ` +
      `| ${result.cliType.padEnd(8)} ` +
      `| ${result.turn1Cache.toString().padEnd(6)} ` +
      `| ${result.turn2Cache.toString().padEnd(6)} ` +
      `| ${result.turn3Cache.toString().padEnd(6)} ` +
      `| ${diffStr.padEnd(19)} |`
    );
  }

  console.log('\n' + '='.repeat(70));
  console.log('ANALYSIS');
  console.log('='.repeat(70));

  console.log('\n🔍 Embedded CLI:');
  console.log(`   Official avg: ${Math.round((officialEmbedded.turn1Cache + officialEmbedded.turn2Cache + officialEmbedded.turn3Cache) / 3)}`);
  console.log(`   Lite avg:     ${Math.round((liteEmbedded.turn1Cache + liteEmbedded.turn2Cache + liteEmbedded.turn3Cache) / 3)}`);
  console.log(`   Difference:   +${liteEmbedded.avgCacheDiff} tokens per turn`);

  console.log('\n🔍 Local CLI:');
  console.log(`   Official avg: ${Math.round((officialLocal.turn1Cache + officialLocal.turn2Cache + officialLocal.turn3Cache) / 3)}`);
  console.log(`   Lite avg:     ${Math.round((liteLocal.turn1Cache + liteLocal.turn2Cache + liteLocal.turn3Cache) / 3)}`);
  console.log(`   Difference:   +${liteLocal.avgCacheDiff} tokens per turn`);

  console.log('\n' + '='.repeat(70));
  console.log('CONCLUSION');
  console.log('='.repeat(70));

  if (Math.abs(liteEmbedded.avgCacheDiff! - liteLocal.avgCacheDiff!) < 100) {
    console.log('\n✅ Cache difference is CONSISTENT across CLI types');
    console.log(`   Both embedded and local show ~${liteEmbedded.avgCacheDiff} extra tokens`);
    console.log('   → This is an SDK implementation issue, NOT a CLI issue');
  } else {
    console.log('\n⚠️  Cache difference VARIES by CLI type');
    console.log(`   Embedded: +${liteEmbedded.avgCacheDiff} tokens`);
    console.log(`   Local: +${liteLocal.avgCacheDiff} tokens`);
    console.log('   → This suggests CLI configuration affects caching');
  }

  // Check if ~3200 tokens (size of tool definitions)
  const avgDiff = (liteEmbedded.avgCacheDiff! + liteLocal.avgCacheDiff!) / 2;
  if (avgDiff > 3000 && avgDiff < 3400) {
    console.log('\n💡 The ~3200 token difference matches tool definition size');
    console.log('   Hypothesis: Lite SDK is missing tool definition cache hits');
  }
}

main().catch(console.error);
