#!/usr/bin/env bun

/**
 * Trace what's different between Official and Lite SDK
 * by checking the CLI subprocess args and stdin
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

interface CapturedData {
  cliArgs: string[];
  stdinMessages: any[];
  firstResultUsage: any;
}

async function captureWithDirectSpawn(label: string): Promise<CapturedData> {
  return new Promise((resolve, reject) => {
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

    console.log(`\n${label}:`);
    console.log('Args:', args.join(' '));

    const proc = spawn(embeddedCli, args, {
      stdio: ['pipe', 'pipe', 'inherit']
    });

    const stdinMessages: any[] = [];
    let firstResultUsage: any = null;

    // Monitor stdin
    const originalWrite = proc.stdin!.write.bind(proc.stdin!);
    proc.stdin!.write = function(chunk: any, ...rest: any[]): boolean {
      const msg = chunk.toString().trim();
      try {
        const parsed = JSON.parse(msg);
        stdinMessages.push(parsed);
        console.log(`  → stdin: ${parsed.type}`);
      } catch {}
      return originalWrite(chunk, ...rest);
    } as any;

    // Monitor stdout
    const rl = createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity
    });

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);
        if (msg.type === 'result') {
          firstResultUsage = msg.usage;
          proc.kill();
          resolve({
            cliArgs: args,
            stdinMessages,
            firstResultUsage
          });
        }
      } catch {}
    });

    proc.on('error', reject);

    // Send user message after CLI is ready
    setTimeout(() => {
      proc.stdin!.write(JSON.stringify({
        type: 'user',
        message: { role: 'user', content: 'Hi' },
        session_id: '',
        parent_tool_use_id: null
      }) + '\n');
    }, 100);

    setTimeout(() => reject(new Error('Timeout')), 10000);
  });
}

async function captureSDK(sdk: 'official' | 'lite'): Promise<CapturedData> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Capturing ${sdk.toUpperCase()} SDK`);
  console.log('='.repeat(60));

  return new Promise(async (resolve, reject) => {
    const Module = require('module');
    const originalRequire = Module.prototype.require;

    let captured: CapturedData = {
      cliArgs: [],
      stdinMessages: [],
      firstResultUsage: null
    };

    // Intercept child_process
    Module.prototype.require = function(id: string) {
      if (id === 'node:child_process' || id === 'child_process') {
        const cp = originalRequire.apply(this, arguments);
        const originalSpawn = cp.spawn;

        cp.spawn = function(command: string, args: string[], ...rest: any[]) {
          console.log('CLI command:', command);
          console.log('CLI args:', args.join(' '));
          captured.cliArgs = args;

          const proc = originalSpawn.apply(this, [command, args, ...rest]);

          if (proc.stdin) {
            const origWrite = proc.stdin.write.bind(proc.stdin);
            proc.stdin.write = function(chunk: any, ...rest: any[]): boolean {
              const msg = chunk.toString().trim();
              try {
                const parsed = JSON.parse(msg);
                captured.stdinMessages.push(parsed);
                console.log(`  → stdin: ${parsed.type}${parsed.subtype ? ':' + parsed.subtype : ''}`);
              } catch {}
              return origWrite(chunk, ...rest);
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

    try {
      if (sdk === 'official') {
        const { query } = await import('@anthropic-ai/claude-agent-sdk');
        for await (const msg of query({ prompt: 'Hi', options })) {
          if (msg.type === 'result') {
            captured.firstResultUsage = (msg as any).usage;
            break;
          }
        }
      } else {
        const { query } = await import('../../src/api/query.ts');
        for await (const msg of query({ prompt: 'Hi', options })) {
          if (msg.type === 'result') {
            captured.firstResultUsage = (msg as any).usage;
            break;
          }
        }
      }

      Module.prototype.require = originalRequire;
      resolve(captured);
    } catch (err) {
      Module.prototype.require = originalRequire;
      reject(err);
    }
  });
}

async function main() {
  console.log('API Call Tracing');
  console.log('='.repeat(70));

  const officialData = await captureSDK('official');
  await new Promise(r => setTimeout(r, 500));

  const liteData = await captureSDK('lite');

  console.log('\n' + '='.repeat(70));
  console.log('COMPARISON');
  console.log('='.repeat(70));

  console.log('\n📋 CLI Args:');
  console.log('Official:', officialData.cliArgs.length, 'args');
  console.log('Lite:', liteData.cliArgs.length, 'args');

  if (officialData.cliArgs.join(' ') === liteData.cliArgs.join(' ')) {
    console.log('✅ Identical CLI args');
  } else {
    console.log('❌ Different CLI args!');
    console.log('\nOfficial args:', officialData.cliArgs.join(' '));
    console.log('Lite args:', liteData.cliArgs.join(' '));
  }

  console.log('\n📋 Stdin Messages:');
  console.log('Official:', officialData.stdinMessages.length, 'messages');
  console.log('Lite:', liteData.stdinMessages.length, 'messages');

  for (let i = 0; i < Math.max(officialData.stdinMessages.length, liteData.stdinMessages.length); i++) {
    const oMsg = officialData.stdinMessages[i];
    const lMsg = liteData.stdinMessages[i];

    if (!oMsg || !lMsg) {
      console.log(`\n❌ Message ${i + 1}: Only in ${oMsg ? 'Official' : 'Lite'}`);
      continue;
    }

    const oStr = JSON.stringify(oMsg);
    const lStr = JSON.stringify(lMsg);

    if (oStr === lStr) {
      console.log(`  Message ${i + 1}: ✅ Identical (${oMsg.type})`);
    } else {
      console.log(`  Message ${i + 1}: ❌ Different (${oMsg.type} vs ${lMsg.type})`);
      console.log('    Official:', oStr.substring(0, 100));
      console.log('    Lite:', lStr.substring(0, 100));
    }
  }

  console.log('\n📋 Usage (First Result):');
  if (officialData.firstResultUsage && liteData.firstResultUsage) {
    const oCache = officialData.firstResultUsage.cache_creation_input_tokens +
                   officialData.firstResultUsage.cache_read_input_tokens;
    const lCache = liteData.firstResultUsage.cache_creation_input_tokens +
                   liteData.firstResultUsage.cache_read_input_tokens;

    console.log(`Official: ${oCache} cache tokens`);
    console.log(`Lite: ${lCache} cache tokens`);
    console.log(`Difference: +${lCache - oCache} tokens`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ Trace complete');
}

main().catch(console.error);
