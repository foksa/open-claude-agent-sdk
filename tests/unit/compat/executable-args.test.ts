/**
 * executableArgs behavior tests
 *
 * Verifies that executableArgs are included for both native and JS binaries.
 *
 * Official SDK (node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs):
 *
 *   let r6 = $V(H),                                    // isNativeBinary check
 *       o6 = r6 ? H : W,                               // command: native path or runtime
 *       t6 = r6 ? [...J, ...c] : [...J, H, ...c],      // args: ALWAYS includes executableArgs (J)
 *
 * J = executableArgs, c = CLI args, H = script path, W = executable runtime
 * executableArgs are included in BOTH branches — native and JS.
 */

import { describe, expect, test } from 'bun:test';

describe('executableArgs included for both native and JS binaries', () => {
  test('spawnClaudeCodeProcess receives executableArgs for native binary', () => {
    const { DefaultProcessFactory } = require('../../../src/api/ProcessFactory.ts');
    const { writeFileSync, unlinkSync } = require('node:fs');
    const factory = new DefaultProcessFactory();

    // Create a temp file with no JS extension to simulate a native binary
    const nativeBinary = `/tmp/fake-claude-${Date.now()}`;
    writeFileSync(nativeBinary, '', { mode: 0o755 });

    let captured: { command: string; args: string[] } | null = null;
    try {
      factory.spawn({
        pathToClaudeCodeExecutable: nativeBinary,
        permissionMode: 'default',
        executableArgs: ['--inspect'],
        spawnClaudeCodeProcess: (opts: { command: string; args: string[] }) => {
          captured = opts;
          return { stdout: null, stderr: null, stdin: null };
        },
      });
    } finally {
      unlinkSync(nativeBinary);
    }

    expect(captured).not.toBeNull();
    expect(captured?.command).toBe(nativeBinary);
    expect(captured?.args).toContain('--inspect');
    expect(captured?.args).not.toContain(nativeBinary);

    console.log('   executableArgs included for native binary via spawnClaudeCodeProcess');
  });

  test('spawnClaudeCodeProcess receives executableArgs for JS binary', () => {
    const { DefaultProcessFactory } = require('../../../src/api/ProcessFactory.ts');
    const { writeFileSync, unlinkSync } = require('node:fs');
    const factory = new DefaultProcessFactory();

    // Create a temp .js file to simulate a JS binary (isNativeBinary() checks extension)
    const jsScript = `/tmp/fake-claude-${Date.now()}.js`;
    writeFileSync(jsScript, '#!/usr/bin/env node\n', { mode: 0o755 });
    let captured: { command: string; args: string[] } | null = null;

    try {
      factory.spawn({
        pathToClaudeCodeExecutable: jsScript,
        permissionMode: 'default',
        executableArgs: ['--max-old-space-size=4096'],
        spawnClaudeCodeProcess: (opts: { command: string; args: string[] }) => {
          captured = opts;
          return { stdout: null, stderr: null, stdin: null };
        },
      });
    } finally {
      unlinkSync(jsScript);
    }

    expect(captured).not.toBeNull();
    // JS binary: command is the runtime (node/bun), not the script
    expect(['node', 'bun']).toContain(captured?.command);
    // executableArgs should be in the args
    expect(captured?.args).toContain('--max-old-space-size=4096');
    // Script path should also be in args (after executableArgs)
    const hasScriptInArgs = captured?.args.some((a) => a.endsWith('.js'));
    expect(hasScriptInArgs).toBe(true);
    // executableArgs should come before script path
    const execArgIdx = captured?.args.indexOf('--max-old-space-size=4096');
    const scriptIdx = captured?.args.findIndex((a) => a.endsWith('.js'));
    expect(execArgIdx).toBeLessThan(scriptIdx);

    console.log('   executableArgs included for JS binary via spawnClaudeCodeProcess');
  });
});
