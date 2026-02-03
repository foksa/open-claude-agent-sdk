#!/usr/bin/env bun

import { query } from '@anthropic-ai/claude-agent-sdk';
import { resolve } from 'path';

const PROXY_CLI = resolve('./tests/utils/proxy-cli.cjs');

async function main() {
  console.log('Testing Official SDK through proxy...');
  console.log('Proxy:', PROXY_CLI);

  const options: any = {
    model: 'haiku',
    maxTurns: 1,
    settingSources: [],
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    pathToClaudeCodeExecutable: PROXY_CLI,
  };

  for await (const msg of query({ prompt: 'Hi', options })) {
    if (msg.type === 'result') {
      console.log('Done');
      break;
    }
  }
}

main().catch(console.error);
