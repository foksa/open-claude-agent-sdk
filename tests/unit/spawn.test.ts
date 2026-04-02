/**
 * Unit tests for spawn.ts - CLI argument building
 */

import { describe, expect, test } from 'bun:test';
import { buildCliArgs } from '../../src/core/argBuilder.ts';
import type { Options } from '../../src/types/index.ts';

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

  test('does not include --setting-sources when not specified', () => {
    const args = buildCliArgs({});

    const hasSS = args.some((a) => a.startsWith('--setting-sources'));
    expect(hasSS).toBe(false);
  });

  test('includes --setting-sources= with custom sources', () => {
    const args = buildCliArgs({ settingSources: ['user', 'project'] });

    expect(args).toContain('--setting-sources=user,project');
  });

  test('includes --setting-sources= with project only', () => {
    const args = buildCliArgs({ settingSources: ['project'] });

    expect(args).toContain('--setting-sources=project');
  });

  test('includes --setting-sources= with user only', () => {
    const args = buildCliArgs({ settingSources: ['user'] });

    expect(args).toContain('--setting-sources=user');
  });

  test('includes --setting-sources= with explicit empty array', () => {
    const args = buildCliArgs({ settingSources: [] });

    // Uses = syntax to prevent empty string consuming next CLI flag
    expect(args).toContain('--setting-sources=');
  });

  test('includes --setting-sources= with local source', () => {
    const args = buildCliArgs({ settingSources: ['local'] });

    expect(args).toContain('--setting-sources=local');
  });

  test('includes --setting-sources= with all sources', () => {
    const args = buildCliArgs({ settingSources: ['user', 'project', 'local'] });

    expect(args).toContain('--setting-sources=user,project,local');
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

  test('includes --effort when specified', () => {
    const args = buildCliArgs({ effort: 'low' });

    expect(args).toContain('--effort');
    expect(args).toContain('low');
  });

  test('includes --effort with all valid values', () => {
    for (const level of ['low', 'medium', 'high', 'max'] as const) {
      const args = buildCliArgs({ effort: level });
      const idx = args.indexOf('--effort');
      expect(idx).toBeGreaterThan(-1);
      expect(args[idx + 1]).toBe(level);
    }
  });

  test('thinking adaptive produces --thinking adaptive', () => {
    const args = buildCliArgs({ thinking: { type: 'adaptive' } });

    expect(args).toContain('--thinking');
    expect(args).toContain('adaptive');
    expect(args).not.toContain('--max-thinking-tokens');
  });

  test('thinking disabled produces --thinking disabled', () => {
    const args = buildCliArgs({ thinking: { type: 'disabled' } });

    expect(args).toContain('--thinking');
    expect(args).toContain('disabled');
    expect(args).not.toContain('--max-thinking-tokens');
  });

  test('thinking enabled produces --max-thinking-tokens', () => {
    const args = buildCliArgs({ thinking: { type: 'enabled', budgetTokens: 5000 } });

    expect(args).toContain('--max-thinking-tokens');
    expect(args).toContain('5000');
    expect(args).not.toContain('--thinking');
  });

  test('thinking enabled without budgetTokens falls back to --thinking adaptive', () => {
    const args = buildCliArgs({ thinking: { type: 'enabled' } });

    expect(args).toContain('--thinking');
    expect(args).toContain('adaptive');
    expect(args).not.toContain('--max-thinking-tokens');
    expect(args).not.toContain('undefined');
  });

  test('thinking option takes precedence over maxThinkingTokens', () => {
    const args = buildCliArgs({
      thinking: { type: 'enabled', budgetTokens: 8000 },
      maxThinkingTokens: 3000,
    });

    expect(args).toContain('--max-thinking-tokens');
    expect(args).toContain('8000');
    expect(args).not.toContain('3000');
  });

  test('maxThinkingTokens works without thinking option', () => {
    const args = buildCliArgs({ maxThinkingTokens: 10000 });

    expect(args).toContain('--max-thinking-tokens');
    expect(args).toContain('10000');
  });

  test('includes --settings with object when specified', () => {
    const args = buildCliArgs({ settings: { model: 'claude-sonnet-4-6' } } as Options);

    expect(args).toContain('--settings');
    const idx = args.indexOf('--settings');
    const parsed = JSON.parse(args[idx + 1]);
    expect(parsed.model).toBe('claude-sonnet-4-6');
  });

  test('includes --settings with string path when specified', () => {
    const args = buildCliArgs({ settings: '/path/to/settings.json' } as Options);

    expect(args).toContain('--settings');
    const idx = args.indexOf('--settings');
    expect(args[idx + 1]).toBe('/path/to/settings.json');
  });

  test('merges sandbox into settings object', () => {
    const args = buildCliArgs({
      settings: { model: 'claude-sonnet-4-6' },
      sandbox: { enabled: true },
    } as Options);

    expect(args).toContain('--settings');
    const idx = args.indexOf('--settings');
    const parsed = JSON.parse(args[idx + 1]);
    expect(parsed.model).toBe('claude-sonnet-4-6');
    expect(parsed.sandbox).toEqual({ enabled: true });
  });

  test('sandbox without settings produces --settings with sandbox only', () => {
    const args = buildCliArgs({ sandbox: { enabled: true } } as Options);

    expect(args).toContain('--settings');
    const idx = args.indexOf('--settings');
    const parsed = JSON.parse(args[idx + 1]);
    expect(parsed.sandbox).toEqual({ enabled: true });
  });

  test('includes --task-budget when taskBudget specified', () => {
    const args = buildCliArgs({ taskBudget: { total: 10000 } });

    expect(args).toContain('--task-budget');
    expect(args).toContain('10000');
  });

  test('does not include --task-budget when not specified', () => {
    const args = buildCliArgs({});

    expect(args).not.toContain('--task-budget');
  });

  test('includes --include-hook-events when set', () => {
    const args = buildCliArgs({ includeHookEvents: true });

    expect(args).toContain('--include-hook-events');
  });

  test('does not include --include-hook-events when not set', () => {
    const args = buildCliArgs({});

    expect(args).not.toContain('--include-hook-events');
  });

  test('_testCliArgs only works in test environment', () => {
    const originalEnv = process.env.NODE_ENV;

    // In test environment, it should work
    process.env.NODE_ENV = 'test';
    const argsWithTest = buildCliArgs({ _testCliArgs: ['--test-flag'] } as Options & {
      _testCliArgs?: string[];
    });
    expect(argsWithTest).toContain('--test-flag');

    // In production, it should be ignored
    process.env.NODE_ENV = 'production';
    const argsWithoutTest = buildCliArgs({ _testCliArgs: ['--test-flag'] } as Options & {
      _testCliArgs?: string[];
    });
    expect(argsWithoutTest).not.toContain('--test-flag');

    // Restore
    process.env.NODE_ENV = originalEnv;
  });
});
