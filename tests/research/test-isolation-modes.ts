#!/usr/bin/env bun

/**
 * Test: Measure overhead from loading user MCP servers and skills
 *
 * This compares:
 * 1. Default (loads everything)
 * 2. Minimal (clean start, nothing loaded)
 * 3. Project-only (like official SDK)
 */

import { query } from './src/api/query.ts';
import type { SDKMessage } from './src/types/index.ts';

interface TestResult {
  mode: string;
  timeToFirstToken: number | null;
  totalTime: number;
  messageCount: number;
  messages: string[];
}

async function testMode(mode: 'default' | 'minimal' | 'project', args: string[]): Promise<TestResult> {
  const start = Date.now();
  let firstTokenTime: number | null = null;
  let messageCount = 0;
  const messages: string[] = [];

  console.log(`\n🔍 Testing mode: ${mode}`);
  console.log(`   CLI args: ${args.join(' ')}`);

  for await (const msg of query({
    prompt: 'Say hello in exactly one word',
    options: {
      maxTurns: 1,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      // Inject extra args for testing
      _testCliArgs: args
    } as any
  })) {
    messageCount++;
    messages.push(msg.type);

    if (!firstTokenTime && msg.type === 'assistant') {
      firstTokenTime = Date.now() - start;
      console.log(`   ⚡ First token: ${firstTokenTime}ms`);
    }

    if (msg.type === 'result') {
      const totalTime = Date.now() - start;
      console.log(`   ✅ Total time: ${totalTime}ms`);
      console.log(`   📊 Messages: ${messageCount}`);

      return {
        mode,
        timeToFirstToken: firstTokenTime,
        totalTime,
        messageCount,
        messages
      };
    }
  }

  throw new Error('Query did not complete');
}

async function main() {
  console.log('=' .repeat(60));
  console.log('SDK Overhead Investigation');
  console.log('=' .repeat(60));

  const results: TestResult[] = [];

  // Test 1: Default (current behavior - loads everything)
  try {
    const result = await testMode('default', []);
    results.push(result);
  } catch (err) {
    console.error('❌ Default mode failed:', err);
  }

  // Test 2: Minimal (clean start - nothing loaded)
  try {
    const result = await testMode('minimal', [
      '--disable-slash-commands',
      '--strict-mcp-config',
      '--no-session-persistence',
      '--setting-sources', ''
    ]);
    results.push(result);
  } catch (err) {
    console.error('❌ Minimal mode failed:', err);
  }

  // Test 3: Project-only (like official SDK)
  try {
    const result = await testMode('project', [
      '--setting-sources', 'project',
      '--strict-mcp-config',
      '--no-session-persistence'
    ]);
    results.push(result);
  } catch (err) {
    console.error('❌ Project mode failed:', err);
  }

  // Print comparison
  console.log('\n' + '=' .repeat(60));
  console.log('RESULTS COMPARISON');
  console.log('=' .repeat(60));

  console.log('\n| Mode | First Token | Total Time | Messages | Overhead |');
  console.log('|------|-------------|------------|----------|----------|');

  const baseline = results.find(r => r.mode === 'minimal');

  for (const result of results) {
    const overhead = baseline && result !== baseline
      ? `+${result.totalTime - baseline.totalTime}ms`
      : 'baseline';

    console.log(
      `| ${result.mode.padEnd(8)} ` +
      `| ${(result.timeToFirstToken || 0).toString().padEnd(11)} ` +
      `| ${result.totalTime.toString().padEnd(10)} ` +
      `| ${result.messageCount.toString().padEnd(8)} ` +
      `| ${overhead.padEnd(8)} |`
    );
  }

  console.log('\n' + '=' .repeat(60));

  // Show improvement
  const defaultResult = results.find(r => r.mode === 'default');
  const minimalResult = results.find(r => r.mode === 'minimal');

  if (defaultResult && minimalResult) {
    const improvement = defaultResult.totalTime - minimalResult.totalTime;
    const percentImprovement = (improvement / defaultResult.totalTime * 100).toFixed(1);

    console.log('📈 IMPROVEMENT');
    console.log('=' .repeat(60));
    console.log(`Default: ${defaultResult.totalTime}ms`);
    console.log(`Minimal: ${minimalResult.totalTime}ms`);
    console.log(`Saved: ${improvement}ms (${percentImprovement}% faster)`);
    console.log('=' .repeat(60));
  }

  console.log('\n✅ Investigation complete');
}

main().catch(console.error);
