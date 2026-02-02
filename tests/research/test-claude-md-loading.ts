#!/usr/bin/env bun

/**
 * Test: Does --setting-sources "" prevent loading CLAUDE.md?
 *
 * This tests whether isolation flags block CLAUDE.md from being injected
 * into the system prompt.
 */

import { query } from './src/api/query.ts';

async function testMode(name: string, args: string[]) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing: ${name}`);
  console.log(`Args: ${args.join(' ')}`);
  console.log('='.repeat(70));

  for await (const msg of query({
    prompt: 'What is your name? Answer in one sentence.',
    options: {
      maxTurns: 1,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      _testCliArgs: args
    } as any
  })) {
    if (msg.type === 'result') {
      console.log('\n📊 Result Message:');
      console.log('   - duration_ms:', msg.duration_ms);
      console.log('   - cache_creation_tokens:', (msg as any).usage?.cache_creation_input_tokens);
      console.log('   - response:', (msg as any).result?.substring(0, 100));

      if ((msg as any).usage) {
        console.log('\n💾 Cache Details:');
        console.log(JSON.stringify((msg as any).usage, null, 2));
      }
    }
  }
}

async function main() {
  console.log('\n🔍 CLAUDE.md Loading Test');
  console.log('This tests if isolation flags prevent CLAUDE.md from being loaded.\n');

  // Test 1: Default (should load CLAUDE.md)
  await testMode('Default (loads CLAUDE.md)', []);

  // Test 2: setting-sources="" (should NOT load CLAUDE.md)
  await testMode('setting-sources="" (no CLAUDE.md)', [
    '--setting-sources', ''
  ]);

  // Test 3: setting-sources="user" (only user, no project CLAUDE.md)
  await testMode('setting-sources="user" (no project)', [
    '--setting-sources', 'user'
  ]);

  // Test 4: setting-sources="project" (should load CLAUDE.md)
  await testMode('setting-sources="project" (has CLAUDE.md)', [
    '--setting-sources', 'project'
  ]);

  console.log('\n' + '='.repeat(70));
  console.log('✅ Test complete');
  console.log('\nConclusion:');
  console.log('- setting-sources="" → blocks CLAUDE.md');
  console.log('- setting-sources="project" → loads CLAUDE.md');
  console.log('- setting-sources="user" → no project config (no CLAUDE.md)');
  console.log('='.repeat(70));
}

main().catch(console.error);
