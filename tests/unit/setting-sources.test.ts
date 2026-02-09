/**
 * Unit tests for settingSources option
 *
 * Verifies the option is passed as correct CLI args. Uses capture-cli — no API calls.
 */

import { describe, expect, test } from 'bun:test';
import { readFileSync, unlinkSync } from 'node:fs';
import { query } from '../../src/api/query.ts';

const CAPTURE_CLI = './src/tools/capture-cli.cjs';

async function captureArgs(settingSources: string[]): Promise<string[]> {
  const outputFile = `/tmp/capture-settings-${Date.now()}-${Math.random().toString(36).slice(2)}.json`;
  process.env.CAPTURE_OUTPUT_FILE = outputFile;

  try {
    for await (const msg of query({
      prompt: 'test',
      options: {
        model: 'haiku',
        settingSources,
        pathToClaudeCodeExecutable: CAPTURE_CLI,
        permissionMode: 'default',
      },
    })) {
      if (msg.type === 'result') break;
    }

    const captured = JSON.parse(readFileSync(outputFile, 'utf-8'));
    return captured.args;
  } finally {
    try {
      unlinkSync(outputFile);
    } catch {}
    delete process.env.CAPTURE_OUTPUT_FILE;
  }
}

describe('settingSources CLI args', () => {
  test('empty array passes no setting sources', async () => {
    const args = await captureArgs([]);
    // Empty settingSources should still be passed (as empty)
    expect(args).toBeDefined();
  });

  test('project source is passed to CLI', async () => {
    const args = await captureArgs(['project']);
    const joined = args.join(' ');
    expect(joined).toContain('project');
  });

  test('user source is passed to CLI', async () => {
    const args = await captureArgs(['user']);
    const joined = args.join(' ');
    expect(joined).toContain('user');
  });

  test('multiple sources are passed to CLI', async () => {
    const args = await captureArgs(['project', 'user']);
    const joined = args.join(' ');
    expect(joined).toContain('project');
    expect(joined).toContain('user');
  });
});
