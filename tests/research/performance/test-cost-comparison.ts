#!/usr/bin/env bun

/**
 * Test: Compare cost and performance of isolation modes
 *
 * Checks what the API returns in result message:
 * - Duration
 * - Token usage
 * - Cost
 */

import { query } from './src/api/query.ts';

interface ResultMetrics {
  mode: string;
  timeToFirstToken: number | null;
  totalTime: number;
  resultData: any; // Full result message for inspection
}

async function testWithMetrics(
  mode: string,
  extraArgs: string[]
): Promise<ResultMetrics> {
  const start = Date.now();
  let firstTokenTime: number | null = null;
  let resultData: any = null;

  console.log(`\n🔍 Testing: ${mode}`);

  for await (const msg of query({
    prompt: 'Calculate 2+2 and explain in one sentence',
    options: {
      maxTurns: 1,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      _testCliArgs: extraArgs
    } as any
  })) {
    if (!firstTokenTime && msg.type === 'assistant') {
      firstTokenTime = Date.now() - start;
      console.log(`   ⚡ First token: ${firstTokenTime}ms`);
    }

    if (msg.type === 'result') {
      const totalTime = Date.now() - start;
      resultData = msg;

      console.log(`   ✅ Total: ${totalTime}ms`);
      console.log(`   📊 Result message fields:`);
      console.log(`      - type: ${msg.type}`);
      console.log(`      - subtype: ${msg.subtype}`);

      // Check for cost/usage fields
      const fields = Object.keys(msg).filter(k =>
        k !== 'type' && k !== 'subtype' && k !== 'session_id'
      );

      for (const field of fields) {
        console.log(`      - ${field}: ${JSON.stringify((msg as any)[field]).substring(0, 100)}`);
      }

      return {
        mode,
        timeToFirstToken: firstTokenTime,
        totalTime,
        resultData: msg
      };
    }
  }

  throw new Error('No result message received');
}

async function main() {
  console.log('='.repeat(70));
  console.log('Cost & Performance Comparison');
  console.log('='.repeat(70));

  // Test 1: Default (with all user config)
  const defaultResult = await testWithMetrics('Default (with user config)', []);

  // Test 2: Minimal (clean, isolated)
  const minimalResult = await testWithMetrics('Minimal (isolated)', [
    '--disable-slash-commands',
    '--strict-mcp-config',
    '--no-session-persistence',
    '--setting-sources', ''
  ]);

  // Comparison
  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON');
  console.log('='.repeat(70));

  console.log('\n📊 Performance:');
  console.log(`   Default: ${defaultResult.totalTime}ms`);
  console.log(`   Minimal: ${minimalResult.totalTime}ms`);
  console.log(`   Speedup: ${((1 - minimalResult.totalTime / defaultResult.totalTime) * 100).toFixed(1)}%`);

  // Check for cost fields
  console.log('\n💰 Cost Data (from result message):');

  const costFields = ['total_cost_usd', 'input_tokens', 'output_tokens', 'total_tokens', 'usage'];

  for (const field of costFields) {
    const defaultValue = (defaultResult.resultData as any)[field];
    const minimalValue = (minimalResult.resultData as any)[field];

    if (defaultValue !== undefined || minimalValue !== undefined) {
      console.log(`\n   ${field}:`);
      console.log(`      Default: ${JSON.stringify(defaultValue)}`);
      console.log(`      Minimal: ${JSON.stringify(minimalValue)}`);
    }
  }

  // Show full result structure
  console.log('\n📋 Full Default Result Message:');
  console.log(JSON.stringify(defaultResult.resultData, null, 2));

  console.log('\n📋 Full Minimal Result Message:');
  console.log(JSON.stringify(minimalResult.resultData, null, 2));

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test complete');
  console.log('='.repeat(70));
}

main().catch(console.error);
