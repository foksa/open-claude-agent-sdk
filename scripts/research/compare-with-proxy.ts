#!/usr/bin/env bun

/**
 * Run both SDKs through proxy CLI to capture exact stdin messages
 */

import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { query as liteQuery } from '../../src/api/query.ts';

const PROXY_CLI = './tests/utils/proxy-cli.js';
const LOG_DIR = './tests/research/logs';

async function testSDK(sdk: 'official' | 'lite', label: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing ${label}`);
  console.log('='.repeat(60));

  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: PROXY_CLI,
  };

  for await (const msg of queryFn({ prompt: 'What is 2+2?', options })) {
    if (msg.type === 'result') {
      const usage = (msg as any).usage || {};
      console.log('Result received:');
      console.log(`  Cache creation: ${usage.cache_creation_input_tokens || 0}`);
      console.log(`  Cache read: ${usage.cache_read_input_tokens || 0}`);
      console.log(
        `  Total cache: ${(usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0)}`
      );
      break;
    }
  }
}

async function main() {
  console.log('🔍 SDK Comparison via Proxy CLI');
  console.log('This will log all stdin messages to files');
  console.log('='.repeat(60));

  // Get initial log count
  const logsBefore = readdirSync(LOG_DIR).filter((f) => f.startsWith('proxy-'));
  console.log(`\nExisting logs: ${logsBefore.length}`);

  // Test Official SDK
  const officialStart = Date.now();
  await testSDK('official', 'Official SDK');
  const officialTime = Date.now();

  // Wait a bit so we get different timestamps
  await new Promise((r) => setTimeout(r, 100));

  // Test Lite SDK
  const liteStart = Date.now();
  await testSDK('lite', 'Lite SDK');
  const liteTime = Date.now();

  // Find new log files
  const logsAfter = readdirSync(LOG_DIR).filter((f) => f.startsWith('proxy-'));
  const newLogs = logsAfter.filter((f) => !logsBefore.includes(f)).sort();

  console.log('\n' + '='.repeat(60));
  console.log('LOG FILES CREATED');
  console.log('='.repeat(60));

  if (newLogs.length < 2) {
    console.error('❌ Expected 2 new log files, found:', newLogs.length);
    return;
  }

  // Assume first is official, second is lite (by timestamp)
  const [officialLog, liteLog] = newLogs.slice(-2);

  console.log(`\nOfficial SDK log: ${officialLog}`);
  console.log(`Lite SDK log: ${liteLog}`);

  // Read and compare logs
  const officialContent = readFileSync(join(LOG_DIR, officialLog), 'utf-8');
  const liteContent = readFileSync(join(LOG_DIR, liteLog), 'utf-8');

  console.log('\n' + '='.repeat(60));
  console.log('STDIN MESSAGE COMPARISON');
  console.log('='.repeat(60));

  // Extract stdin messages
  const extractStdinMessages = (content: string) => {
    const messages: any[] = [];
    const stdinBlocks = content.split(/STDIN #\d+:/);

    for (let i = 1; i < stdinBlocks.length; i++) {
      const block = stdinBlocks[i];
      // Try to extract JSON
      const jsonMatch = block.match(/\{[\s\S]*?\n(?=\n|\[|STDIN|STDOUT|$)/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          messages.push(parsed);
        } catch (e) {
          // Ignore parse errors
        }
      }
    }

    return messages;
  };

  const officialMessages = extractStdinMessages(officialContent);
  const liteMessages = extractStdinMessages(liteContent);

  console.log(`\nOfficial SDK sent: ${officialMessages.length} stdin messages`);
  console.log(`Lite SDK sent: ${liteMessages.length} stdin messages`);

  if (officialMessages.length !== liteMessages.length) {
    console.log('\n❌ DIFFERENT number of messages!');
  } else {
    console.log('\n✅ Same number of messages');
  }

  // Compare each message
  for (let i = 0; i < Math.max(officialMessages.length, liteMessages.length); i++) {
    const oMsg = officialMessages[i];
    const lMsg = liteMessages[i];

    console.log(`\nMessage ${i + 1}:`);

    if (!oMsg || !lMsg) {
      console.log(`  ❌ Only in ${oMsg ? 'Official' : 'Lite'}`);
      continue;
    }

    const oStr = JSON.stringify(oMsg);
    const lStr = JSON.stringify(lMsg);

    if (oStr === lStr) {
      console.log(`  ✅ Identical (${oMsg.type})`);
    } else {
      console.log(`  ❌ Different!`);
      console.log(`     Type: ${oMsg.type} vs ${lMsg.type}`);

      // Show differences
      if (oMsg.type === lMsg.type) {
        const oKeys = Object.keys(oMsg).sort();
        const lKeys = Object.keys(lMsg).sort();

        const extraInLite = lKeys.filter((k) => !oKeys.includes(k));
        const missingInLite = oKeys.filter((k) => !lKeys.includes(k));

        if (extraInLite.length > 0) {
          console.log(`     Extra fields in Lite: ${extraInLite.join(', ')}`);
        }
        if (missingInLite.length > 0) {
          console.log(`     Missing fields in Lite: ${missingInLite.join(', ')}`);
        }

        // Compare common fields
        for (const key of oKeys) {
          if (lKeys.includes(key)) {
            const oVal = JSON.stringify(oMsg[key]);
            const lVal = JSON.stringify(lMsg[key]);
            if (oVal !== lVal) {
              console.log(`     Field '${key}' differs:`);
              console.log(`       Official: ${oVal.substring(0, 100)}`);
              console.log(`       Lite: ${lVal.substring(0, 100)}`);
            }
          }
        }
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Full logs available at:');
  console.log(`  Official: tests/research/logs/${officialLog}`);
  console.log(`  Lite: tests/research/logs/${liteLog}`);
  console.log('='.repeat(60));
}

main().catch(console.error);
