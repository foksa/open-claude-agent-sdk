#!/usr/bin/env bun

/**
 * Inspect what messages are being sent to CLI stdin
 * This helps identify why Lite SDK uses more cache tokens
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const embeddedCli = './node_modules/@anthropic-ai/claude-agent-sdk/cli.js';

const args = [
  '--print',
  '--output-format', 'stream-json',
  '--input-format', 'stream-json',
  '--verbose',
  '--permission-mode', 'bypassPermissions',
  '--model', 'haiku',
  '--max-turns', '1',
  '--setting-sources', ''
];

console.log('Spawning CLI with args:', args.join(' '));
console.log('='.repeat(70));

const proc = spawn(embeddedCli, args, {
  stdio: ['pipe', 'pipe', 'inherit']
});

// Monitor stdin writes
const originalWrite = proc.stdin!.write.bind(proc.stdin!);
let stdinMessageCount = 0;

proc.stdin!.write = function(chunk: any, ...rest: any[]): boolean {
  stdinMessageCount++;
  const msg = chunk.toString().trim();
  console.log(`\n📤 STDIN Message #${stdinMessageCount}:`);
  try {
    const parsed = JSON.parse(msg);
    console.log(JSON.stringify(parsed, null, 2));
  } catch {
    console.log(msg);
  }
  return originalWrite(chunk, ...rest);
} as any;

// Read stdout
const rl = createInterface({
  input: proc.stdout!,
  crlfDelay: Infinity
});

let stdoutMessageCount = 0;

rl.on('line', (line) => {
  stdoutMessageCount++;
  try {
    const msg = JSON.parse(line);

    if (msg.type === 'system' && msg.subtype === 'init') {
      console.log(`\n📥 STDOUT Message #${stdoutMessageCount}: system:init`);
      console.log(`   Tools: ${msg.tools?.length || 0} total`);
      console.log(`   Session ID: ${msg.session_id}`);
    } else if (msg.type === 'result') {
      console.log(`\n📥 STDOUT Message #${stdoutMessageCount}: result`);
      const usage = msg.usage || {};
      console.log(`   Cache Creation: ${usage.cache_creation_input_tokens || 0}`);
      console.log(`   Cache Read: ${usage.cache_read_input_tokens || 0}`);
      console.log(`   Input: ${usage.input_tokens || 0}`);
      console.log(`   Output: ${usage.output_tokens || 0}`);

      proc.kill();
    } else {
      console.log(`\n📥 STDOUT Message #${stdoutMessageCount}: ${msg.type}${msg.subtype ? ':' + msg.subtype : ''}`);
    }
  } catch (err) {
    console.log(`\n📥 STDOUT Message #${stdoutMessageCount}: [invalid JSON]`);
  }
});

// Send user message
setTimeout(() => {
  const userMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: 'Say hi in one word'
    },
    session_id: '',
    parent_tool_use_id: null
  };

  proc.stdin!.write(JSON.stringify(userMessage) + '\n');
}, 100);

proc.on('exit', (code) => {
  console.log('\n' + '='.repeat(70));
  console.log(`Process exited with code ${code}`);
  console.log(`Total STDIN messages sent: ${stdinMessageCount}`);
  console.log(`Total STDOUT messages received: ${stdoutMessageCount}`);
});
