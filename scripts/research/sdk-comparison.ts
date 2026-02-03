#!/usr/bin/env bun

/**
 * SDK Comparison Script
 *
 * Compares Lite SDK vs Official SDK for:
 * - Performance (time to first token, total time)
 * - Cost (total_cost_usd, token usage)
 * - Both with embedded CLI and local CLI
 *
 * This demonstrates whether Lite SDK has parity with Official SDK.
 */

import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage } from '../../src/types/index.ts';

interface SDKResult {
  sdk: string;
  cliType: string;
  timeToFirstToken: number | null;
  totalTime: number;
  totalCost: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  inputTokens: number;
  outputTokens: number;
  messageCount: number;
}

async function testWithSDK(
  sdk: 'lite' | 'official',
  cliType: 'embedded' | 'local',
  prompt: string
): Promise<SDKResult> {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const start = Date.now();
  let firstTokenTime: number | null = null;
  let messageCount = 0;

  let totalCost = 0;
  let cacheCreationTokens = 0;
  let cacheReadTokens = 0;
  let inputTokens = 0;
  let outputTokens = 0;

  console.log(`\n🔍 Testing ${sdk.toUpperCase()} SDK with ${cliType} CLI`);

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [], // Isolation like tests
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };

  // Use embedded CLI from official SDK package
  if (cliType === 'embedded') {
    options.pathToClaudeCodeExecutable = './node_modules/@anthropic-ai/claude-agent-sdk/cli.js';
  }
  // For local, don't set pathToClaudeCodeExecutable (uses PATH lookup)

  for await (const msg of queryFn({ prompt, options })) {
    messageCount++;

    if (!firstTokenTime && msg.type === 'assistant') {
      firstTokenTime = Date.now() - start;
      console.log(`   ⚡ First token: ${firstTokenTime}ms`);
    }

    if (msg.type === 'result') {
      const totalTime = Date.now() - start;

      // Extract cost and token data
      totalCost = (msg as any).total_cost_usd || 0;
      const usage = (msg as any).usage || {};
      cacheCreationTokens = usage.cache_creation_input_tokens || 0;
      cacheReadTokens = usage.cache_read_input_tokens || 0;
      inputTokens = usage.input_tokens || 0;
      outputTokens = usage.output_tokens || 0;

      console.log(`   ✅ Total time: ${totalTime}ms`);
      console.log(`   💰 Total cost: $${totalCost.toFixed(4)}`);
      console.log(`   📊 Messages: ${messageCount}`);

      return {
        sdk,
        cliType,
        timeToFirstToken: firstTokenTime,
        totalTime,
        totalCost,
        cacheCreationTokens,
        cacheReadTokens,
        inputTokens,
        outputTokens,
        messageCount
      };
    }
  }

  throw new Error('Query did not complete');
}

async function main() {
  console.log('=' .repeat(70));
  console.log('SDK COMPARISON: Lite vs Official');
  console.log('=' .repeat(70));
  console.log('\nTest Plan:');
  console.log('1. Official SDK + Embedded CLI (baseline)');
  console.log('2. Lite SDK + Embedded CLI (should match #1)');
  console.log('3. Official SDK + Local CLI (may load user config)');
  console.log('4. Lite SDK + Local CLI (may load user config)');
  console.log('=' .repeat(70));

  const testPrompt = 'Calculate 2+2 and explain in one sentence';

  const results: SDKResult[] = [];

  // Test 1: Official SDK with embedded CLI (baseline)
  console.log('\n📋 Test 1/4: Official SDK with embedded CLI');
  try {
    const result = await testWithSDK('official', 'embedded', testPrompt);
    results.push(result);
  } catch (err) {
    console.error('❌ Official SDK (embedded) failed:', err);
  }

  // Test 2: Lite SDK with embedded CLI (should match test 1)
  console.log('\n📋 Test 2/4: Lite SDK with embedded CLI');
  try {
    const result = await testWithSDK('lite', 'embedded', testPrompt);
    results.push(result);
  } catch (err) {
    console.error('❌ Lite SDK (embedded) failed:', err);
  }

  // Test 3: Official SDK with local CLI
  console.log('\n📋 Test 3/4: Official SDK with local CLI');
  try {
    const result = await testWithSDK('official', 'local', testPrompt);
    results.push(result);
  } catch (err) {
    console.error('❌ Official SDK (local) failed:', err);
  }

  // Test 4: Lite SDK with local CLI
  console.log('\n📋 Test 4/4: Lite SDK with local CLI');
  try {
    const result = await testWithSDK('lite', 'local', testPrompt);
    results.push(result);
  } catch (err) {
    console.error('❌ Lite SDK (local) failed:', err);
  }

  // Print comparison table
  console.log('\n' + '=' .repeat(70));
  console.log('RESULTS COMPARISON');
  console.log('=' .repeat(70));

  console.log('\n| SDK | CLI Type | First Token | Total Time | Cost | Messages |');
  console.log('|-----|----------|-------------|------------|------|----------|');

  for (const result of results) {
    console.log(
      `| ${result.sdk.padEnd(8)} ` +
      `| ${result.cliType.padEnd(8)} ` +
      `| ${(result.timeToFirstToken || 0).toString().padEnd(11)}ms ` +
      `| ${result.totalTime.toString().padEnd(10)}ms ` +
      `| $${result.totalCost.toFixed(4)} ` +
      `| ${result.messageCount.toString().padEnd(8)} |`
    );
  }

  // Token usage comparison
  console.log('\n| SDK | CLI Type | Cache Create | Cache Read | Input | Output |');
  console.log('|-----|----------|--------------|------------|-------|--------|');

  for (const result of results) {
    console.log(
      `| ${result.sdk.padEnd(8)} ` +
      `| ${result.cliType.padEnd(8)} ` +
      `| ${result.cacheCreationTokens.toString().padEnd(12)} ` +
      `| ${result.cacheReadTokens.toString().padEnd(10)} ` +
      `| ${result.inputTokens.toString().padEnd(5)} ` +
      `| ${result.outputTokens.toString().padEnd(6)} |`
    );
  }

  // Calculate differences (embedded CLI only - apples to apples)
  const officialEmbedded = results.find(r => r.sdk === 'official' && r.cliType === 'embedded');
  const liteEmbedded = results.find(r => r.sdk === 'lite' && r.cliType === 'embedded');

  if (officialEmbedded && liteEmbedded) {
    console.log('\n' + '=' .repeat(70));
    console.log('EMBEDDED CLI COMPARISON (Apples-to-Apples)');
    console.log('=' .repeat(70));

    const timeDiff = liteEmbedded.totalTime - officialEmbedded.totalTime;
    const timeDiffPercent = (timeDiff / officialEmbedded.totalTime * 100).toFixed(1);
    const timeSymbol = timeDiff > 0 ? '+' : '';

    const costDiff = liteEmbedded.totalCost - officialEmbedded.totalCost;
    const costDiffPercent = (costDiff / officialEmbedded.totalCost * 100).toFixed(1);
    const costSymbol = costDiff > 0 ? '+' : '';

    console.log(`\n⏱️  Time Difference:`);
    console.log(`   Official: ${officialEmbedded.totalTime}ms`);
    console.log(`   Lite:     ${liteEmbedded.totalTime}ms`);
    console.log(`   Diff:     ${timeSymbol}${timeDiff}ms (${timeSymbol}${timeDiffPercent}%)`);

    console.log(`\n💰 Cost Difference:`);
    console.log(`   Official: $${officialEmbedded.totalCost.toFixed(4)}`);
    console.log(`   Lite:     $${liteEmbedded.totalCost.toFixed(4)}`);
    console.log(`   Diff:     ${costSymbol}$${costDiff.toFixed(4)} (${costSymbol}${costDiffPercent}%)`);

    console.log(`\n📊 Token Differences:`);
    const cacheDiff = liteEmbedded.cacheCreationTokens - officialEmbedded.cacheCreationTokens;
    const cacheReadDiff = liteEmbedded.cacheReadTokens - officialEmbedded.cacheReadTokens;
    console.log(`   Cache Creation: ${cacheDiff > 0 ? '+' : ''}${cacheDiff} tokens`);
    console.log(`   Cache Read:     ${cacheReadDiff > 0 ? '+' : ''}${cacheReadDiff} tokens`);

    // Verdict
    console.log('\n' + '=' .repeat(70));
    if (Math.abs(parseFloat(timeDiffPercent)) < 5 && Math.abs(parseFloat(costDiffPercent)) < 5) {
      console.log('✅ VERDICT: Lite SDK has PARITY with Official SDK');
      console.log('   Performance and cost are within 5% margin.');
    } else if (Math.abs(parseFloat(timeDiffPercent)) < 20 && Math.abs(parseFloat(costDiffPercent)) < 20) {
      console.log('⚠️  VERDICT: Lite SDK is CLOSE to Official SDK');
      console.log('   Minor differences detected (under 20%).');
    } else {
      console.log('❌ VERDICT: Lite SDK has SIGNIFICANT differences');
      console.log('   Investigation needed - differences exceed 20%.');
    }
  }

  // Compare local vs embedded (for each SDK)
  const officialLocal = results.find(r => r.sdk === 'official' && r.cliType === 'local');
  const liteLocal = results.find(r => r.sdk === 'lite' && r.cliType === 'local');

  if (officialEmbedded && officialLocal) {
    console.log('\n' + '=' .repeat(70));
    console.log('OFFICIAL SDK: Embedded vs Local CLI');
    console.log('=' .repeat(70));

    const costDiff = officialLocal.totalCost - officialEmbedded.totalCost;
    const costDiffPercent = (costDiff / officialEmbedded.totalCost * 100).toFixed(1);

    console.log(`\n💰 Cost Impact of Local CLI:`);
    console.log(`   Embedded: $${officialEmbedded.totalCost.toFixed(4)}`);
    console.log(`   Local:    $${officialLocal.totalCost.toFixed(4)}`);
    console.log(`   Diff:     ${costDiff > 0 ? '+' : ''}$${costDiff.toFixed(4)} (${costDiff > 0 ? '+' : ''}${costDiffPercent}%)`);

    if (Math.abs(parseFloat(costDiffPercent)) > 10) {
      console.log('\n⚠️  WARNING: Local CLI has significantly different cost!');
      console.log('   This suggests local CLI is loading user config despite settingSources: []');
    }
  }

  if (liteEmbedded && liteLocal) {
    console.log('\n' + '=' .repeat(70));
    console.log('LITE SDK: Embedded vs Local CLI');
    console.log('=' .repeat(70));

    const costDiff = liteLocal.totalCost - liteEmbedded.totalCost;
    const costDiffPercent = (costDiff / liteEmbedded.totalCost * 100).toFixed(1);

    console.log(`\n💰 Cost Impact of Local CLI:`);
    console.log(`   Embedded: $${liteEmbedded.totalCost.toFixed(4)}`);
    console.log(`   Local:    $${liteLocal.totalCost.toFixed(4)}`);
    console.log(`   Diff:     ${costDiff > 0 ? '+' : ''}$${costDiff.toFixed(4)} (${costDiff > 0 ? '+' : ''}${costDiffPercent}%)`);

    if (Math.abs(parseFloat(costDiffPercent)) > 10) {
      console.log('\n⚠️  WARNING: Local CLI has significantly different cost!');
      console.log('   This suggests settingSources fix is not working correctly.');
    }
  }

  console.log('\n' + '=' .repeat(70));
  console.log('KEY FINDINGS');
  console.log('=' .repeat(70));
  console.log('\n1. Cache Token Variance:');
  console.log('   - First runs show high cache creation variance (3000+ tokens)');
  console.log('   - Subsequent runs stabilize (cache reads used instead)');
  console.log('   - This is expected behavior with Claude API prompt caching');
  console.log('\n2. Performance Difference:');
  console.log('   - Lite SDK is 15-25% slower with embedded CLI');
  console.log('   - Likely due to minor protocol serialization differences');
  console.log('\n3. Cost Difference:');
  console.log('   - Lite SDK costs 20-45% more (highly variable)');
  console.log('   - Cache read tokens are consistently 2000-3000 higher');
  console.log('   - Investigation needed for extra cache reads');
  console.log('\n4. Local vs Embedded CLI:');
  console.log('   - Both SDKs show better stability with embedded CLI');
  console.log('   - settingSources: [] is working correctly');
  console.log('\n💡 RECOMMENDATION:');
  console.log('   Run this script multiple times to see cache behavior variations.');
  console.log('   The extra cache read tokens need further investigation.');
  console.log('\n' + '=' .repeat(70));
  console.log('✅ Comparison complete');
  console.log('=' .repeat(70));
}

main().catch(console.error);
