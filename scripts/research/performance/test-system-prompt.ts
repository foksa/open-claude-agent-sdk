#!/usr/bin/env bun

/**
 * Test: Does --system-prompt REPLACE CLAUDE.md or is it additive?
 */

import { query } from './src/api/query.ts';

async function testSystemPrompt(name: string, args: string[]) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${name}`);
  console.log(`Args: ${args.join(' ')}`);
  console.log('='.repeat(60));

  for await (const msg of query({
    prompt: 'What is bun? Answer in one sentence.',
    options: {
      maxTurns: 1,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      _testCliArgs: args,
    } as any,
  })) {
    if (msg.type === 'result') {
      const tokens = (msg as any).usage?.cache_creation_input_tokens || 0;
      const response = (msg as any).result || '';

      console.log(`\n📊 Cache creation: ${tokens} tokens`);
      console.log(`📝 Response: ${response.substring(0, 150)}...`);

      // Check if response mentions JavaScript runtime (from CLAUDE.md)
      if (
        response.toLowerCase().includes('javascript') ||
        response.toLowerCase().includes('runtime')
      ) {
        console.log('✅ Knows about JavaScript/runtime (CLAUDE.md loaded?)');
      } else {
        console.log('❌ No mention of JavaScript/runtime (CLAUDE.md not loaded?)');
      }
    }
  }
}

async function main() {
  console.log('🔍 System Prompt vs CLAUDE.md Test\n');

  // Test 1: No flags (loads CLAUDE.md)
  await testSystemPrompt('Test 1: Default (loads CLAUDE.md)', []);

  // Test 2: setting-sources="" (no CLAUDE.md)
  await testSystemPrompt('Test 2: setting-sources="" (no CLAUDE.md)', ['--setting-sources', '']);

  // Test 3: --system-prompt (REPLACES default system prompt)
  await testSystemPrompt('Test 3: --system-prompt (replaces default)', [
    '--system-prompt',
    'You are a helpful assistant. Answer concisely.',
  ]);

  // Test 4: --system-prompt + setting-sources=""
  await testSystemPrompt('Test 4: --system-prompt + setting-sources=""', [
    '--system-prompt',
    'You are a helpful assistant.',
    '--setting-sources',
    '',
  ]);

  // Test 5: --append-system-prompt (adds to default)
  await testSystemPrompt('Test 5: --append-system-prompt (adds to default)', [
    '--append-system-prompt',
    'Always be extra concise.',
  ]);

  console.log('\n' + '='.repeat(60));
  console.log('✅ Test complete');
  console.log('='.repeat(60));
}

main().catch(console.error);
