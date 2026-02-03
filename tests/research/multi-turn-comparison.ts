#!/usr/bin/env bun

/**
 * Multi-turn conversation comparison
 *
 * Tests if token/cost differences accumulate over multiple turns
 * or if they're just a one-time overhead.
 */

import { query as liteQuery, type Query } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKUserMessage } from '../../src/types/index.ts';

interface TurnResult {
  turnNumber: number;
  prompt: string;
  timeMs: number;
  cacheCreation: number;
  cacheRead: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

interface SDKResult {
  sdk: string;
  turns: TurnResult[];
  totalTime: number;
  totalCost: number;
  totalCacheCreation: number;
  totalCacheRead: number;
}

const prompts = [
  'What is 3+3?',
  'What is 5+5?',
  'What is 7+7?',
  'What is 9+9?',
  'What is 11+11?'
];

async function* createMessageStream(prompts: string[]): AsyncGenerator<SDKUserMessage> {
  for (const prompt of prompts) {
    yield {
      type: 'user',
      message: {
        role: 'user',
        content: prompt
      },
      session_id: '',
      parent_tool_use_id: null
    };
  }
}

async function testSDK(sdk: 'lite' | 'official'): Promise<SDKResult> {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${sdk.toUpperCase()} SDK - Multi-turn (${prompts.length} prompts)`);
  console.log('='.repeat(70));

  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const startTime = Date.now();

  const turns: TurnResult[] = [];
  let currentTurn = 0;
  let turnStart = Date.now();

  const options: any = {
    model: 'haiku',
    maxTurns: 10,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
  };

  const stream = createMessageStream(prompts);
  const queryInstance = queryFn({ prompt: stream, options }) as Query;

  for await (const msg of queryInstance) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      console.log(`\n📋 Session started`);
      console.log(`   Tools: ${(msg as any).tools?.length || 0}`);
    }

    if (msg.type === 'result') {
      const usage = (msg as any).usage || {};
      const cost = (msg as any).total_cost_usd || 0;
      const turnTime = Date.now() - turnStart;

      const turn: TurnResult = {
        turnNumber: currentTurn + 1,
        prompt: prompts[currentTurn],
        timeMs: turnTime,
        cacheCreation: usage.cache_creation_input_tokens || 0,
        cacheRead: usage.cache_read_input_tokens || 0,
        inputTokens: usage.input_tokens || 0,
        outputTokens: usage.output_tokens || 0,
        cost
      };

      turns.push(turn);

      console.log(`\n✅ Turn ${turn.turnNumber}: "${turn.prompt}"`);
      console.log(`   Time: ${turn.timeMs}ms`);
      console.log(`   Cost: $${turn.cost.toFixed(4)}`);
      console.log(`   Cache Creation: ${turn.cacheCreation}`);
      console.log(`   Cache Read: ${turn.cacheRead}`);
      console.log(`   Input: ${turn.inputTokens}, Output: ${turn.outputTokens}`);

      currentTurn++;

      // If we have more prompts, continue
      if (currentTurn < prompts.length) {
        turnStart = Date.now();
        // The stream generator will provide the next message
      } else {
        // All done
        break;
      }
    }
  }

  const totalTime = Date.now() - startTime;
  const totalCost = turns.reduce((sum, t) => sum + t.cost, 0);
  const totalCacheCreation = turns.reduce((sum, t) => sum + t.cacheCreation, 0);
  const totalCacheRead = turns.reduce((sum, t) => sum + t.cacheRead, 0);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`${sdk.toUpperCase()} Summary:`);
  console.log(`   Total Time: ${totalTime}ms`);
  console.log(`   Total Cost: $${totalCost.toFixed(4)}`);
  console.log(`   Total Cache Creation: ${totalCacheCreation}`);
  console.log(`   Total Cache Read: ${totalCacheRead}`);
  console.log(`   Turns Completed: ${turns.length}/${prompts.length}`);

  return {
    sdk,
    turns,
    totalTime,
    totalCost,
    totalCacheCreation,
    totalCacheRead
  };
}

async function main() {
  console.log('🔄 Multi-turn Conversation Comparison');
  console.log('Testing with continuous conversation over multiple turns');
  console.log(`Prompts: ${prompts.length}`);

  const results: SDKResult[] = [];

  // Test Official SDK
  try {
    const result = await testSDK('official');
    results.push(result);
  } catch (err) {
    console.error('❌ Official SDK failed:', err);
  }

  // Wait a bit to avoid cache collision
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test Lite SDK
  try {
    const result = await testSDK('lite');
    results.push(result);
  } catch (err) {
    console.error('❌ Lite SDK failed:', err);
  }

  // Comparison
  if (results.length === 2) {
    const [official, lite] = results;

    console.log('\n' + '='.repeat(70));
    console.log('COMPARISON');
    console.log('='.repeat(70));

    console.log('\n| Turn | Prompt | Official Time | Lite Time | Diff |');
    console.log('|------|--------|---------------|-----------|------|');

    for (let i = 0; i < official.turns.length; i++) {
      const oTurn = official.turns[i];
      const lTurn = lite.turns[i];
      const diff = lTurn.timeMs - oTurn.timeMs;
      const diffPct = ((diff / oTurn.timeMs) * 100).toFixed(1);

      console.log(
        `| ${oTurn.turnNumber} ` +
        `| ${oTurn.prompt.substring(0, 15).padEnd(15)} ` +
        `| ${oTurn.timeMs.toString().padEnd(13)}ms ` +
        `| ${lTurn.timeMs.toString().padEnd(9)}ms ` +
        `| ${diff > 0 ? '+' : ''}${diff}ms (${diff > 0 ? '+' : ''}${diffPct}%) |`
      );
    }

    console.log('\n| Turn | Official Cost | Lite Cost | Diff |');
    console.log('|------|---------------|-----------|------|');

    for (let i = 0; i < official.turns.length; i++) {
      const oTurn = official.turns[i];
      const lTurn = lite.turns[i];
      const diff = lTurn.cost - oTurn.cost;
      const diffPct = ((diff / oTurn.cost) * 100).toFixed(1);

      console.log(
        `| ${oTurn.turnNumber} ` +
        `| $${oTurn.cost.toFixed(4).padEnd(12)} ` +
        `| $${lTurn.cost.toFixed(4).padEnd(8)} ` +
        `| ${diff > 0 ? '+' : ''}$${diff.toFixed(4)} (${diff > 0 ? '+' : ''}${diffPct}%) |`
      );
    }

    console.log('\n| Turn | Official Cache | Lite Cache | Diff |');
    console.log('|------|----------------|------------|------|');

    for (let i = 0; i < official.turns.length; i++) {
      const oTurn = official.turns[i];
      const lTurn = lite.turns[i];
      const oCacheTotal = oTurn.cacheCreation + oTurn.cacheRead;
      const lCacheTotal = lTurn.cacheCreation + lTurn.cacheRead;
      const diff = lCacheTotal - oCacheTotal;

      console.log(
        `| ${oTurn.turnNumber} ` +
        `| ${oCacheTotal.toString().padEnd(14)} ` +
        `| ${lCacheTotal.toString().padEnd(10)} ` +
        `| ${diff > 0 ? '+' : ''}${diff} |`
      );
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('TOTALS');
    console.log('='.repeat(70));

    const timeDiff = lite.totalTime - official.totalTime;
    const timeDiffPct = ((timeDiff / official.totalTime) * 100).toFixed(1);

    const costDiff = lite.totalCost - official.totalCost;
    const costDiffPct = ((costDiff / official.totalCost) * 100).toFixed(1);

    const cacheDiff = (lite.totalCacheCreation + lite.totalCacheRead) -
                      (official.totalCacheCreation + official.totalCacheRead);

    console.log(`\n⏱️  Total Time:`);
    console.log(`   Official: ${official.totalTime}ms`);
    console.log(`   Lite:     ${lite.totalTime}ms`);
    console.log(`   Diff:     ${timeDiff > 0 ? '+' : ''}${timeDiff}ms (${timeDiff > 0 ? '+' : ''}${timeDiffPct}%)`);

    console.log(`\n💰 Total Cost:`);
    console.log(`   Official: $${official.totalCost.toFixed(4)}`);
    console.log(`   Lite:     $${lite.totalCost.toFixed(4)}`);
    console.log(`   Diff:     ${costDiff > 0 ? '+' : ''}$${costDiff.toFixed(4)} (${costDiff > 0 ? '+' : ''}${costDiffPct}%)`);

    console.log(`\n📊 Total Cache Tokens:`);
    console.log(`   Official: ${official.totalCacheCreation + official.totalCacheRead}`);
    console.log(`   Lite:     ${lite.totalCacheCreation + lite.totalCacheRead}`);
    console.log(`   Diff:     ${cacheDiff > 0 ? '+' : ''}${cacheDiff}`);

    console.log(`\n📈 Per-Turn Averages:`);
    const avgTimeDiff = timeDiff / prompts.length;
    const avgCostDiff = costDiff / prompts.length;
    const avgCacheDiff = cacheDiff / prompts.length;
    console.log(`   Avg Time Diff: ${avgTimeDiff > 0 ? '+' : ''}${avgTimeDiff.toFixed(0)}ms per turn`);
    console.log(`   Avg Cost Diff: ${avgCostDiff > 0 ? '+' : ''}$${avgCostDiff.toFixed(4)} per turn`);
    console.log(`   Avg Cache Diff: ${avgCacheDiff > 0 ? '+' : ''}${avgCacheDiff.toFixed(0)} tokens per turn`);

    // Verdict
    console.log('\n' + '='.repeat(70));
    const totalTurns = prompts.length;
    if (Math.abs(parseFloat(costDiffPct)) < 5) {
      console.log('✅ VERDICT: Lite SDK has PARITY with Official SDK');
      console.log(`   Cost difference is negligible over ${totalTurns} turns.`);
    } else if (Math.abs(parseFloat(costDiffPct)) < 20) {
      console.log('⚠️  VERDICT: Lite SDK has MINOR differences');
      console.log(`   Cost difference: ${costDiffPct}% over ${totalTurns} turns.`);
    } else {
      console.log('❌ VERDICT: Lite SDK has SIGNIFICANT differences');
      console.log(`   Cost difference: ${costDiffPct}% over ${totalTurns} turns.`);
      console.log('   Investigation needed!');
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Multi-turn comparison complete');
  console.log('='.repeat(70));
}

main().catch(console.error);
