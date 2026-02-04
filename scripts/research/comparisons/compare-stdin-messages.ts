#!/usr/bin/env bun

/**
 * Compare stdin messages between Official and Lite SDK
 * Capture what each SDK sends to CLI to identify differences
 */

import { type ChildProcess, spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const embeddedCli = './node_modules/@anthropic-ai/claude-agent-sdk/cli.js';

function spawnWithStdinLogging(label: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const args = [
      '--print',
      '--output-format',
      'stream-json',
      '--input-format',
      'stream-json',
      '--verbose',
      '--permission-mode',
      'bypassPermissions',
      '--model',
      'haiku',
      '--max-turns',
      '1',
      '--setting-sources',
      '',
    ];

    const proc = spawn(embeddedCli, args, {
      stdio: ['pipe', 'pipe', 'inherit'],
    });

    const stdinMessages: string[] = [];

    // Intercept stdin writes
    const originalWrite = proc.stdin!.write.bind(proc.stdin!);
    proc.stdin!.write = function (chunk: any, ...rest: any[]): boolean {
      const msg = chunk.toString().trim();
      stdinMessages.push(msg);
      return originalWrite(chunk, ...rest);
    } as any;

    // Read stdout until result
    const rl = createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity,
    });

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'result') {
          proc.kill();
          resolve(stdinMessages);
        }
      } catch (err) {
        // Ignore
      }
    });

    proc.on('error', reject);

    setTimeout(() => {
      reject(new Error('Timeout waiting for result'));
    }, 10000);
  });
}

async function captureOfficialSDK(): Promise<string[]> {
  console.log('\n📦 Capturing Official SDK stdin messages...');

  const { query } = await import('@anthropic-ai/claude-agent-sdk');

  return new Promise((resolve, reject) => {
    const stdinMessages: string[] = [];

    // Monkey-patch child_process.spawn to intercept
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function (id: string) {
      if (id === 'node:child_process' || id === 'child_process') {
        const cp = originalRequire.apply(this, arguments);
        const originalSpawn = cp.spawn;

        cp.spawn = function (...args: any[]) {
          const proc = originalSpawn.apply(this, args);

          if (proc.stdin) {
            const originalWrite = proc.stdin.write.bind(proc.stdin);
            proc.stdin.write = function (chunk: any, ...rest: any[]): boolean {
              const msg = chunk.toString().trim();
              if (msg && msg.startsWith('{')) {
                stdinMessages.push(msg);
              }
              return originalWrite(chunk, ...rest);
            } as any;
          }

          return proc;
        };

        return cp;
      }
      return originalRequire.apply(this, arguments);
    };

    const options: any = {
      model: 'haiku',
      maxTurns: 1,
      settingSources: [],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    };

    (async () => {
      for await (const msg of query({ prompt: 'Say hi', options })) {
        if (msg.type === 'result') {
          Module.prototype.require = originalRequire;
          resolve(stdinMessages);
          break;
        }
      }
    })().catch(reject);

    setTimeout(() => {
      Module.prototype.require = originalRequire;
      reject(new Error('Timeout'));
    }, 10000);
  });
}

async function captureLiteSDK(): Promise<string[]> {
  console.log('\n📦 Capturing Lite SDK stdin messages...');

  const { query } = await import('../../src/api/query.ts');

  return new Promise((resolve, reject) => {
    const stdinMessages: string[] = [];

    // Monkey-patch child_process.spawn
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    Module.prototype.require = function (id: string) {
      if (id === 'node:child_process' || id === 'child_process') {
        const cp = originalRequire.apply(this, arguments);
        const originalSpawn = cp.spawn;

        cp.spawn = function (...args: any[]) {
          const proc = originalSpawn.apply(this, args);

          if (proc.stdin) {
            const originalWrite = proc.stdin.write.bind(proc.stdin);
            proc.stdin.write = function (chunk: any, ...rest: any[]): boolean {
              const msg = chunk.toString().trim();
              if (msg && msg.startsWith('{')) {
                stdinMessages.push(msg);
              }
              return originalWrite(chunk, ...rest);
            } as any;
          }

          return proc;
        };

        return cp;
      }
      return originalRequire.apply(this, arguments);
    };

    const options: any = {
      model: 'haiku',
      maxTurns: 1,
      settingSources: [],
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    };

    (async () => {
      for await (const msg of query({ prompt: 'Say hi', options })) {
        if (msg.type === 'result') {
          Module.prototype.require = originalRequire;
          resolve(stdinMessages);
          break;
        }
      }
    })().catch(reject);

    setTimeout(() => {
      Module.prototype.require = originalRequire;
      reject(new Error('Timeout'));
    }, 10000);
  });
}

async function main() {
  console.log('='.repeat(70));
  console.log('STDIN Message Comparison');
  console.log('='.repeat(70));

  let officialMessages: string[] = [];
  let liteMessages: string[] = [];

  try {
    officialMessages = await captureOfficialSDK();
  } catch (err) {
    console.error('❌ Failed to capture Official SDK messages:', err);
  }

  try {
    liteMessages = await captureLiteSDK();
  } catch (err) {
    console.error('❌ Failed to capture Lite SDK messages:', err);
  }

  console.log('\n' + '='.repeat(70));
  console.log('OFFICIAL SDK STDIN MESSAGES');
  console.log('='.repeat(70));
  console.log(`Total messages: ${officialMessages.length}`);
  officialMessages.forEach((msg, i) => {
    try {
      const parsed = JSON.parse(msg);
      console.log(`\nMessage ${i + 1}:`);
      console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
    } catch {
      console.log(`\nMessage ${i + 1}: [invalid JSON]`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('LITE SDK STDIN MESSAGES');
  console.log('='.repeat(70));
  console.log(`Total messages: ${liteMessages.length}`);
  liteMessages.forEach((msg, i) => {
    try {
      const parsed = JSON.parse(msg);
      console.log(`\nMessage ${i + 1}:`);
      console.log(JSON.stringify(parsed, null, 2).substring(0, 500));
    } catch {
      console.log(`\nMessage ${i + 1}: [invalid JSON]`);
    }
  });

  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON');
  console.log('='.repeat(70));
  console.log(`Official: ${officialMessages.length} messages`);
  console.log(`Lite:     ${liteMessages.length} messages`);

  if (officialMessages.length === liteMessages.length) {
    console.log('\n✅ Same number of messages');

    for (let i = 0; i < officialMessages.length; i++) {
      const official = JSON.parse(officialMessages[i]);
      const lite = JSON.parse(liteMessages[i]);

      const officialStr = JSON.stringify(official);
      const liteStr = JSON.stringify(lite);

      if (officialStr === liteStr) {
        console.log(`\nMessage ${i + 1}: ✅ Identical`);
      } else {
        console.log(`\nMessage ${i + 1}: ❌ Different`);
        console.log(`   Official length: ${officialStr.length} chars`);
        console.log(`   Lite length: ${liteStr.length} chars`);
        console.log(`   Diff: ${liteStr.length - officialStr.length} chars`);
      }
    }
  } else {
    console.log('\n❌ Different number of messages - investigation needed!');
  }
}

main().catch(console.error);
