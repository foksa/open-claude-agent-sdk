/**
 * Unit tests for spawn.ts - CLI argument building
 */

import { describe, expect, test } from 'bun:test';
import { buildCliArgs } from '../../src/core/spawn.ts';

describe('buildCliArgs', () => {
  test('includes required CLI flags', () => {
    const args = buildCliArgs({});

    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--input-format');
    expect(args).toContain('--verbose');
  });

  test('includes default permission mode', () => {
    const args = buildCliArgs({});

    expect(args).toContain('--permission-mode');
    expect(args).toContain('default');
  });

  test('passes custom permission mode', () => {
    const args = buildCliArgs({ permissionMode: 'bypassPermissions' });

    expect(args).toContain('--permission-mode');
    expect(args).toContain('bypassPermissions');
  });

  test('includes --allow-dangerously-skip-permissions when set', () => {
    const args = buildCliArgs({ allowDangerouslySkipPermissions: true });

    expect(args).toContain('--allow-dangerously-skip-permissions');
  });

  test('does not include --allow-dangerously-skip-permissions when not set', () => {
    const args = buildCliArgs({});

    expect(args).not.toContain('--allow-dangerously-skip-permissions');
  });

  test('includes model when specified', () => {
    const args = buildCliArgs({ model: 'claude-sonnet-4-20250514' });

    expect(args).toContain('--model');
    expect(args).toContain('claude-sonnet-4-20250514');
  });

  test('includes maxTurns when specified', () => {
    const args = buildCliArgs({ maxTurns: 5 });

    expect(args).toContain('--max-turns');
    expect(args).toContain('5');
  });

  test('includes maxBudgetUsd when specified', () => {
    const args = buildCliArgs({ maxBudgetUsd: 1.5 });

    expect(args).toContain('--max-budget-usd');
    expect(args).toContain('1.5');
  });

  test('includes --include-partial-messages when set', () => {
    const args = buildCliArgs({ includePartialMessages: true });

    expect(args).toContain('--include-partial-messages');
  });

  test('includes --permission-prompt-tool stdio when canUseTool is set', () => {
    const args = buildCliArgs({ canUseTool: async () => ({ behavior: 'allow' }) });

    expect(args).toContain('--permission-prompt-tool');
    expect(args).toContain('stdio');
  });

  test('includes --json-schema for json_schema output format', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const args = buildCliArgs({
      outputFormat: { type: 'json_schema', schema },
    });

    expect(args).toContain('--json-schema');
    expect(args).toContain(JSON.stringify(schema));
  });

  test('includes --allowedTools when specified', () => {
    const args = buildCliArgs({ allowedTools: ['Read', 'Write', 'Bash'] });

    expect(args).toContain('--allowedTools');
    expect(args).toContain('Read,Write,Bash');
  });

  test('includes --setting-sources with default empty', () => {
    const args = buildCliArgs({});

    expect(args).toContain('--setting-sources');
    // Default is empty string (no settings loaded)
    const idx = args.indexOf('--setting-sources');
    expect(args[idx + 1]).toBe('');
  });

  test('includes --setting-sources with custom sources', () => {
    const args = buildCliArgs({ settingSources: ['user', 'project'] });

    expect(args).toContain('--setting-sources');
    expect(args).toContain('user,project');
  });

  test('includes --setting-sources with project only', () => {
    const args = buildCliArgs({ settingSources: ['project'] });

    expect(args).toContain('--setting-sources');
    const idx = args.indexOf('--setting-sources');
    expect(args[idx + 1]).toBe('project');
  });

  test('includes --setting-sources with user only', () => {
    const args = buildCliArgs({ settingSources: ['user'] });

    expect(args).toContain('--setting-sources');
    const idx = args.indexOf('--setting-sources');
    expect(args[idx + 1]).toBe('user');
  });

  test('includes --setting-sources with explicit empty array', () => {
    const args = buildCliArgs({ settingSources: [] });

    expect(args).toContain('--setting-sources');
    const idx = args.indexOf('--setting-sources');
    expect(args[idx + 1]).toBe('');
  });

  test('includes --setting-sources with local source', () => {
    const args = buildCliArgs({ settingSources: ['local'] });

    expect(args).toContain('--setting-sources');
    const idx = args.indexOf('--setting-sources');
    expect(args[idx + 1]).toBe('local');
  });

  test('includes --setting-sources with all sources', () => {
    const args = buildCliArgs({ settingSources: ['user', 'project', 'local'] });

    expect(args).toContain('--setting-sources');
    expect(args).toContain('user,project,local');
  });

  test('includes --debug-file when specified', () => {
    const args = buildCliArgs({ debugFile: '/tmp/debug.log' });

    expect(args).toContain('--debug-file');
    expect(args).toContain('/tmp/debug.log');
  });

  test('includes --debug when debug is true', () => {
    const args = buildCliArgs({ debug: true });

    expect(args).toContain('--debug');
  });

  test('prefers --debug-file over --debug', () => {
    const args = buildCliArgs({ debug: true, debugFile: '/tmp/debug.log' });

    expect(args).toContain('--debug-file');
    expect(args).not.toContain('--debug');
  });

  test('does not include cwd as CLI argument', () => {
    const args = buildCliArgs({ cwd: '/some/path' });

    // cwd should be passed to spawn(), not as CLI arg
    expect(args).not.toContain('--cwd');
    expect(args).not.toContain('/some/path');
  });

  test('_testCliArgs only works in test environment', () => {
    const originalEnv = process.env.NODE_ENV;

    // In test environment, it should work
    process.env.NODE_ENV = 'test';
    const argsWithTest = buildCliArgs({ _testCliArgs: ['--test-flag'] } as any);
    expect(argsWithTest).toContain('--test-flag');

    // In production, it should be ignored
    process.env.NODE_ENV = 'production';
    const argsWithoutTest = buildCliArgs({ _testCliArgs: ['--test-flag'] } as any);
    expect(argsWithoutTest).not.toContain('--test-flag');

    // Restore
    process.env.NODE_ENV = originalEnv;
  });
});
