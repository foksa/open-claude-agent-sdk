#!/usr/bin/env bun

/**
 * Compare system:init messages from both SDKs
 * This will show us if tool definitions or other config differ
 */

import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';

async function captureSystemInit(sdk: 'lite' | 'official') {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
  };

  for await (const msg of queryFn({ prompt: 'Say hi', options })) {
    if (msg.type === 'system' && msg.subtype === 'init') {
      return msg;
    }
    if (msg.type === 'result') {
      break;
    }
  }

  return null;
}

async function main() {
  console.log('='.repeat(70));
  console.log('System:Init Message Comparison');
  console.log('='.repeat(70));

  console.log('\n📦 Capturing Official SDK system:init...');
  const officialInit: any = await captureSystemInit('official');

  console.log('📦 Capturing Lite SDK system:init...');
  const liteInit: any = await captureSystemInit('lite');

  if (!officialInit || !liteInit) {
    console.error('❌ Failed to capture system:init messages');
    return;
  }

  console.log('\n' + '='.repeat(70));
  console.log('OFFICIAL SDK system:init');
  console.log('='.repeat(70));
  console.log('Tools:', officialInit.tools?.length || 0);
  console.log('Session ID:', officialInit.session_id);
  console.log('CWD:', officialInit.cwd);

  console.log('\n' + '='.repeat(70));
  console.log('LITE SDK system:init');
  console.log('='.repeat(70));
  console.log('Tools:', liteInit.tools?.length || 0);
  console.log('Session ID:', liteInit.session_id);
  console.log('CWD:', liteInit.cwd);

  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON');
  console.log('='.repeat(70));

  // Compare tools
  const officialTools = officialInit.tools || [];
  const liteTools = liteInit.tools || [];

  console.log(`\nTools count: Official=${officialTools.length}, Lite=${liteTools.length}`);

  if (officialTools.length === liteTools.length) {
    console.log('✅ Same number of tools');

    const allSame = officialTools.every((tool: string, i: number) => tool === liteTools[i]);
    if (allSame) {
      console.log('✅ Tool list is identical');
    } else {
      console.log('❌ Tool lists differ');
      console.log('\nOfficial tools:', officialTools.slice(0, 10));
      console.log('Lite tools:', liteTools.slice(0, 10));
    }
  } else {
    console.log('❌ Different number of tools!');
    console.log('\nOfficial tools:', officialTools);
    console.log('Lite tools:', liteTools);
  }

  // Compare full messages
  const officialStr = JSON.stringify(officialInit);
  const liteStr = JSON.stringify(liteInit);

  console.log(`\nFull message size:`);
  console.log(`  Official: ${officialStr.length} chars`);
  console.log(`  Lite: ${liteStr.length} chars`);
  console.log(`  Diff: ${liteStr.length - officialStr.length} chars`);

  // Check for extra fields
  const officialKeys = Object.keys(officialInit).sort();
  const liteKeys = Object.keys(liteInit).sort();

  console.log(`\nMessage fields:`);
  console.log(`  Official: ${officialKeys.join(', ')}`);
  console.log(`  Lite: ${liteKeys.join(', ')}`);

  const extraInLite = liteKeys.filter((k) => !officialKeys.includes(k));
  const missingInLite = officialKeys.filter((k) => !liteKeys.includes(k));

  if (extraInLite.length > 0) {
    console.log(`\n⚠️  Extra fields in Lite:`, extraInLite);
  }
  if (missingInLite.length > 0) {
    console.log(`\n⚠️  Missing fields in Lite:`, missingInLite);
  }

  if (extraInLite.length === 0 && missingInLite.length === 0) {
    console.log('\n✅ Same fields in both');
  }
}

main().catch(console.error);
