#!/usr/bin/env bun

/**
 * Test Official SDK with verbose logging to see what messages it gets
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function main() {
  console.log('Testing Official SDK (direct, no proxy)');

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  };

  let msgCount = 0;
  for await (const msg of query({ prompt: 'Say hi', options })) {
    msgCount++;
    console.log(`  Message ${msgCount}: ${msg.type}${msg.subtype ? ':' + msg.subtype : ''}`);

    if (msg.type === 'result') {
      break;
    }
  }

  console.log(`  Total: ${msgCount} messages`);
}

main().catch(console.error);
