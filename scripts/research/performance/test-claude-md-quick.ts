#!/usr/bin/env bun

/**
 * Quick test: Check cache_creation_tokens with different setting-sources
 */

import { query } from './src/api/query.ts';

async function quickTest(name: string, settingSources: string) {
  console.log(`\n📊 ${name}`);

  for await (const msg of query({
    prompt: 'Say "test" in one word',
    options: {
      maxTurns: 1,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      _testCliArgs: settingSources ? ['--setting-sources', settingSources] : []
    } as any
  })) {
    if (msg.type === 'result') {
      const tokens = (msg as any).usage?.cache_creation_input_tokens || 0;
      console.log(`   Cache creation: ${tokens} tokens`);
      return tokens;
    }
  }
}

async function main() {
  console.log('🔍 Quick CLAUDE.md Test\n');

  const results = {
    default: await quickTest('Default (all settings)', ''),
    empty: await quickTest('Empty (no settings)', ''),
    user: await quickTest('User only', 'user'),
    project: await quickTest('Project only', 'project')
  };

  console.log('\n' + '='.repeat(50));
  console.log('RESULTS');
  console.log('='.repeat(50));
  console.log(`Default:  ${results.default} tokens`);
  console.log(`Empty:    ${results.empty} tokens (diff: ${results.default - results.empty})`);
  console.log(`User:     ${results.user} tokens (diff: ${results.default - results.user})`);
  console.log(`Project:  ${results.project} tokens (diff: ${results.default - results.project})`);

  console.log('\n💡 Conclusion:');
  if (results.empty < results.default) {
    console.log('✅ --setting-sources "" DOES block CLAUDE.md and other settings');
    console.log(`   Saves ${results.default - results.empty} tokens per query`);
  }

  if (results.project > results.empty) {
    console.log('✅ --setting-sources "project" DOES load CLAUDE.md');
    console.log(`   Adds ${results.project - results.empty} tokens from project settings`);
  }
}

main().catch(console.error);
