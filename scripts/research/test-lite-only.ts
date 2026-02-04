#!/usr/bin/env bun

import { resolve } from 'path';
import { query } from '../../src/api/query.ts';

const PROXY_CLI = resolve('./tests/utils/proxy-cli.cjs');

async function main() {
  console.log('Testing Lite SDK through proxy...');
  console.log('Proxy:', PROXY_CLI);

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: PROXY_CLI,
  };

  let msgCount = 0;
  for await (const msg of query({ prompt: 'What is 2+2?', options })) {
    msgCount++;
    console.log(`  Message ${msgCount}: ${msg.type}`);
    if (msg.type === 'result') {
      const usage = (msg as any).usage || {};
      console.log('Result:');
      console.log(
        `  Cache: ${(usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0)}`
      );
      break;
    }
  }
}

main().catch(console.error);
