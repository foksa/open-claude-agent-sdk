/**
 * Unit tests for spawn.ts - CLI argument building
 */

import { afterAll, describe, expect, test } from 'bun:test';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { buildCliArgs } from '../../src/core/argBuilder.ts';
import type { Options } from '../../src/types/index.ts';
import { argValue, argValues, hasFlag } from './arg-utils.ts';

describe('buildCliArgs', () => {
  test('includes required CLI flags', () => {
    const args = buildCliArgs({});

    expect(args).toContain('--output-format');
    expect(args).toContain('stream-json');
    expect(args).toContain('--input-format');
    expect(args).toContain('--verbose');
  });

  test('omits --permission-mode when permissionMode is not set (v0.3.286)', () => {
    const args = buildCliArgs({});

    expect(hasFlag(args, '--permission-mode')).toBe(false);
  });

  test('passes explicit default permission mode', () => {
    const args = buildCliArgs({ permissionMode: 'default' });

    expect(args).toContain('--permission-mode=default');
  });

  test('passes custom permission mode', () => {
    const args = buildCliArgs({ permissionMode: 'bypassPermissions' });

    expect(args).toContain('--permission-mode=bypassPermissions');
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

    expect(args).toContain('--model=claude-sonnet-4-20250514');
  });

  test('includes --permission-prompts when specified', () => {
    const args = buildCliArgs({ permissionPrompts: 'none' });

    expect(args).toContain('--permission-prompts=none');
  });

  test('does not include --permission-prompts when not specified', () => {
    const args = buildCliArgs({});

    expect(hasFlag(args, '--permission-prompts')).toBe(false);
  });

  test('includes maxTurns when specified', () => {
    const args = buildCliArgs({ maxTurns: 5 });

    expect(args).toContain('--max-turns=5');
  });

  test('includes maxBudgetUsd when specified', () => {
    const args = buildCliArgs({ maxBudgetUsd: 1.5 });

    expect(args).toContain('--max-budget-usd=1.5');
  });

  test('includes --include-partial-messages when set', () => {
    const args = buildCliArgs({ includePartialMessages: true });

    expect(args).toContain('--include-partial-messages');
  });

  test('includes --permission-prompt-tool stdio when canUseTool is set', () => {
    const args = buildCliArgs({ canUseTool: async () => ({ behavior: 'allow' }) });

    expect(args).toContain('--permission-prompt-tool=stdio');
  });

  test('includes --json-schema for json_schema output format', () => {
    const schema = { type: 'object', properties: { name: { type: 'string' } } };
    const args = buildCliArgs({
      outputFormat: { type: 'json_schema', schema },
    });

    expect(args).toContain(`--json-schema=${JSON.stringify(schema)}`);
  });

  test('includes --allowedTools when specified', () => {
    const args = buildCliArgs({ allowedTools: ['Read', 'Write', 'Bash'] });

    expect(args).toContain('--allowedTools=Read,Write,Bash');
  });

  test('skills: all adds Skill to --allowedTools', () => {
    const args = buildCliArgs({ skills: 'all' });

    expect(args).toContain('--allowedTools=Skill');
  });

  test('skills: string[] adds Skill(name) entries to --allowedTools', () => {
    const args = buildCliArgs({ skills: ['pdf', 'docx'] });

    expect(args).toContain('--allowedTools=Skill(pdf),Skill(docx)');
  });

  test('skills: string[] appended after allowedTools in --allowedTools CSV', () => {
    const args = buildCliArgs({ allowedTools: ['Bash', 'Read'], skills: ['pdf'] });

    expect(args).toContain('--allowedTools=Bash,Read,Skill(pdf)');
  });

  test('skills: all appended after allowedTools in --allowedTools CSV', () => {
    const args = buildCliArgs({ allowedTools: ['Bash'], skills: 'all' });

    expect(args).toContain('--allowedTools=Bash,Skill');
  });

  test('does not include --allowedTools when neither allowedTools nor skills specified', () => {
    const args = buildCliArgs({});

    expect(hasFlag(args, '--allowedTools')).toBe(false);
  });

  test('plugins emit --plugin-dir per local plugin', () => {
    const args = buildCliArgs({
      plugins: [
        { type: 'local', path: './plugin1' },
        { type: 'local', path: '/abs/plugin2' },
      ],
    });

    expect(hasFlag(args, '--plugin-dir')).toBe(true);
    expect(argValue(args, '--plugin-dir')).toBe('./plugin1');
    expect(argValues(args, '--plugin-dir')).toHaveLength(2);
  });

  test('plugins with skipMcpDiscovery emit --plugin-dir-no-mcp', () => {
    const args = buildCliArgs({
      plugins: [
        { type: 'local', path: './plugin1', skipMcpDiscovery: true },
        { type: 'local', path: '/abs/plugin2' },
      ],
    });

    expect(hasFlag(args, '--plugin-dir-no-mcp')).toBe(true);
    expect(argValue(args, '--plugin-dir-no-mcp')).toBe('./plugin1');
    expect(hasFlag(args, '--plugin-dir')).toBe(true);
    expect(argValue(args, '--plugin-dir')).toBe('/abs/plugin2');
  });

  test("plugins with pluginDelivery: 'initialize' emit --await-initialize, not --plugin-dir", () => {
    const args = buildCliArgs({
      plugins: [{ type: 'local', path: './plugin1' }],
      pluginDelivery: 'initialize',
    });

    expect(args).toContain('--await-initialize');
    expect(hasFlag(args, '--plugin-dir')).toBe(false);
    expect(hasFlag(args, '--plugin-dir-no-mcp')).toBe(false);
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

    expect(args).toContain('--debug-file=/tmp/debug.log');
  });

  test('includes --debug when debug is true', () => {
    const args = buildCliArgs({ debug: true });

    expect(args).toContain('--debug');
  });

  test('prefers --debug-file over --debug', () => {
    const args = buildCliArgs({ debug: true, debugFile: '/tmp/debug.log' });

    expect(hasFlag(args, '--debug-file')).toBe(true);
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

    expect(args).toContain('--effort=low');
  });

  test('includes --effort with all valid values', () => {
    for (const level of ['low', 'medium', 'high', 'max'] as const) {
      const args = buildCliArgs({ effort: level });
      expect(hasFlag(args, '--effort')).toBe(true);
      expect(argValue(args, '--effort')).toBe(level);
    }
  });

  test('thinking adaptive produces --thinking adaptive', () => {
    const args = buildCliArgs({ thinking: { type: 'adaptive' } });

    expect(args).toContain('--thinking=adaptive');
    expect(hasFlag(args, '--max-thinking-tokens')).toBe(false);
  });

  test('thinking disabled produces --thinking disabled', () => {
    const args = buildCliArgs({ thinking: { type: 'disabled' } });

    expect(args).toContain('--thinking=disabled');
    expect(hasFlag(args, '--max-thinking-tokens')).toBe(false);
  });

  test('thinking enabled produces --max-thinking-tokens', () => {
    const args = buildCliArgs({ thinking: { type: 'enabled', budgetTokens: 5000 } });

    expect(args).toContain('--max-thinking-tokens=5000');
    expect(hasFlag(args, '--thinking')).toBe(false);
  });

  test('thinking enabled without budgetTokens falls back to --thinking adaptive', () => {
    const args = buildCliArgs({ thinking: { type: 'enabled' } });

    expect(args).toContain('--thinking=adaptive');
    expect(hasFlag(args, '--max-thinking-tokens')).toBe(false);
    expect(args).not.toContain('undefined');
  });

  test('thinking option takes precedence over maxThinkingTokens', () => {
    const args = buildCliArgs({
      thinking: { type: 'enabled', budgetTokens: 8000 },
      maxThinkingTokens: 3000,
    });

    expect(args).toContain('--max-thinking-tokens=8000');
    expect(args).not.toContain('3000');
  });

  test('maxThinkingTokens works without thinking option', () => {
    const args = buildCliArgs({ maxThinkingTokens: 10000 });

    expect(args).toContain('--max-thinking-tokens=10000');
  });

  test('includes --settings with object when specified', () => {
    const args = buildCliArgs({ settings: { model: 'claude-sonnet-4-6' } } as Options);

    expect(hasFlag(args, '--settings')).toBe(true);
    const parsed = JSON.parse(argValue(args, '--settings'));
    expect(parsed.model).toBe('claude-sonnet-4-6');
  });

  test('includes --settings with string path when specified', () => {
    const args = buildCliArgs({ settings: '/path/to/settings.json' } as Options);

    expect(hasFlag(args, '--settings')).toBe(true);
    expect(argValue(args, '--settings')).toBe('/path/to/settings.json');
  });

  test('merges sandbox into settings object', () => {
    const args = buildCliArgs({
      settings: { model: 'claude-sonnet-4-6' },
      sandbox: { enabled: true },
    } as Options);

    expect(hasFlag(args, '--settings')).toBe(true);
    const parsed = JSON.parse(argValue(args, '--settings'));
    expect(parsed.model).toBe('claude-sonnet-4-6');
    // failIfUnavailable defaults to true when enabled: true (v0.2.91+)
    expect(parsed.sandbox).toEqual({ enabled: true, failIfUnavailable: true });
  });

  test('sandbox without settings produces --settings with sandbox only', () => {
    const args = buildCliArgs({ sandbox: { enabled: true } } as Options);

    expect(hasFlag(args, '--settings')).toBe(true);
    const parsed = JSON.parse(argValue(args, '--settings'));
    // failIfUnavailable defaults to true when enabled: true (v0.2.91+)
    expect(parsed.sandbox).toEqual({ enabled: true, failIfUnavailable: true });
  });

  test('includes --task-budget when taskBudget specified', () => {
    const args = buildCliArgs({ taskBudget: { total: 10000 } });

    expect(args).toContain('--task-budget=10000');
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

  test('sandbox defaults failIfUnavailable to true when enabled', () => {
    const args = buildCliArgs({ sandbox: { enabled: true } } as Options);

    const parsed = JSON.parse(argValue(args, '--settings'));
    expect(parsed.sandbox.failIfUnavailable).toBe(true);
  });

  test('sandbox preserves explicit failIfUnavailable: false', () => {
    const args = buildCliArgs({
      sandbox: { enabled: true, failIfUnavailable: false },
    } as Options);

    const parsed = JSON.parse(argValue(args, '--settings'));
    expect(parsed.sandbox.failIfUnavailable).toBe(false);
  });

  test('sandbox does not add failIfUnavailable when not enabled', () => {
    const args = buildCliArgs({ sandbox: { enabled: false } } as Options);

    const parsed = JSON.parse(argValue(args, '--settings'));
    expect(parsed.sandbox.failIfUnavailable).toBeUndefined();
  });

  test('passes permissionMode auto', () => {
    const args = buildCliArgs({ permissionMode: 'auto' });

    expect(args).toContain('--permission-mode=auto');
  });

  test('includes --managed-settings when specified', () => {
    const settings = { permissions: { allow: [], deny: [] } };
    const args = buildCliArgs({ managedSettings: settings });

    expect(hasFlag(args, '--managed-settings')).toBe(true);
    expect(JSON.parse(argValue(args, '--managed-settings'))).toEqual(settings);
  });

  test('does not include --managed-settings when not specified', () => {
    const args = buildCliArgs({});
    expect(hasFlag(args, '--managed-settings')).toBe(false);
  });

  test('includes --project-config-root=<path> as a single arg when specified', () => {
    const args = buildCliArgs({ projectConfigRoot: '/repo/main' });
    expect(args).toContain('--project-config-root=/repo/main');
    expect(args).not.toContain('--project-config-root');
  });

  test('does not include --project-config-root when not specified', () => {
    const args = buildCliArgs({});
    expect(args.some((a) => a.startsWith('--project-config-root'))).toBe(false);
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

  // v0.3.295: named options are bound to their flag in one argument
  test('named options are sent as a single --flag=value argument', () => {
    const args = buildCliArgs({
      model: 'm',
      maxTurns: 2,
      additionalDirectories: ['/a', '/b'],
      disallowedTools: ['Bash'],
    });
    expect(args).toContain('--model=m');
    expect(args).toContain('--max-turns=2');
    expect(argValues(args, '--add-dir')).toEqual(['/a', '/b']);
    expect(args).toContain('--add-dir=/a');
    expect(args).toContain('--disallowedTools=Bash');
    for (const flag of ['--model', '--max-turns', '--add-dir', '--disallowedTools']) {
      expect(args).not.toContain(flag);
    }
  });

  test('tools: [] is sent as --tools=', () => {
    const args = buildCliArgs({ tools: [] });
    expect(args).toContain('--tools=');
    expect(args).not.toContain('--tools');
  });

  test('--mcp-config and --managed-settings keep the split form', () => {
    const args = buildCliArgs({
      mcpServers: { remote: { type: 'http', url: 'https://example.com/mcp' } },
      managedSettings: { model: 'm' },
    });
    const mcpIdx = args.indexOf('--mcp-config');
    expect(JSON.parse(args[mcpIdx + 1])).toEqual({
      mcpServers: { remote: { type: 'http', url: 'https://example.com/mcp' } },
    });
    const managedIdx = args.indexOf('--managed-settings');
    expect(JSON.parse(args[managedIdx + 1])).toEqual({ model: 'm' });
  });
});

describe('DEBUG_CLAUDE_AGENT_SDK', () => {
  // A scratch config dir, so the debug/ directory is never created under the
  // real ~/.claude (which may be read-only or absent where tests run)
  const configDir = mkdtempSync(join(tmpdir(), 'sdk-debug-config-'));
  afterAll(() => rmSync(configDir, { recursive: true, force: true }));

  function withDebugEnv(value: string | undefined, fn: () => void) {
    const saved = {
      DEBUG_CLAUDE_AGENT_SDK: process.env.DEBUG_CLAUDE_AGENT_SDK,
      CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR,
    };
    if (value === undefined) delete process.env.DEBUG_CLAUDE_AGENT_SDK;
    else process.env.DEBUG_CLAUDE_AGENT_SDK = value;
    process.env.CLAUDE_CONFIG_DIR = configDir;
    try {
      fn();
    } finally {
      for (const [key, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[key];
        else process.env[key] = v;
      }
    }
  }

  test('truthy value points the CLI at one sdk-<uuid>.txt debug file per process', () => {
    withDebugEnv('1', () => {
      const first = buildCliArgs({});
      const second = buildCliArgs({ debug: true });
      const file = argValue(first, '--debug-file');
      expect(file).toMatch(/[/\\]debug[/\\]sdk-[0-9a-f-]{36}\.txt$/);
      expect(argValue(second, '--debug-file')).toBe(file);
      expect(second).toContain('--debug');
      expect(first).not.toContain('--debug-to-stderr');
      // Created up front so the CLI can open the file in a fresh config dir
      expect(dirname(file)).toBe(join(configDir, 'debug'));
      expect(existsSync(dirname(file))).toBe(true);
    });
  });

  test('falsy value, explicit debugFile, or custom spawn add nothing', () => {
    withDebugEnv('0', () => {
      expect(buildCliArgs({})).not.toContain('--debug-file');
    });
    withDebugEnv('1', () => {
      const own = buildCliArgs({ debugFile: '/tmp/mine.txt' });
      expect(argValues(own, '--debug-file')).toHaveLength(1);
      const custom = buildCliArgs({ spawnClaudeCodeProcess: () => ({}) as never });
      expect(hasFlag(custom, '--debug-file')).toBe(false);
    });
  });
});
