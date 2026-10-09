/**
 * CLI arguments compatibility tests
 *
 * Verifies that open SDK passes the same CLI arguments as official SDK.
 */

import { describe, expect, test } from 'bun:test';
import { argValue, argValues, hasFlag } from '../arg-utils.ts';
import { capture, officialQuery, openQuery, queryError } from './capture-utils.ts';

describe('CLI arguments compatibility', () => {
  test.concurrent(
    'basic args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test'),
        capture(officialQuery, 'test'),
      ]);

      // Both should have required flags
      expect(open.args).toContain('--output-format');
      expect(open.args).toContain('stream-json');
      expect(official.args).toContain('--output-format');
      expect(official.args).toContain('stream-json');

      // Both should have input-format
      expect(open.args).toContain('--input-format');
      expect(official.args).toContain('--input-format');

      console.log('   Basic args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'model option args match official SDK',
    async () => {
      const model = 'claude-sonnet-4-20250514';
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { model }),
        capture(officialQuery, 'test', { model }),
      ]);

      expect(open.args).toContain(`--model=${model}`);
      expect(official.args).toContain(`--model=${model}`);

      console.log('   Model args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'maxTurns option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { maxTurns: 5 }),
        capture(officialQuery, 'test', { maxTurns: 5 }),
      ]);

      expect(open.args).toContain('--max-turns=5');
      expect(official.args).toContain('--max-turns=5');

      console.log('   maxTurns args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'maxTurns: 0 is omitted like official SDK (full arg list)',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { maxTurns: 0 }),
        capture(officialQuery, 'test', { maxTurns: 0 }),
      ]);

      expect(hasFlag(official.args, '--max-turns')).toBe(false);
      expect([...open.args].sort()).toEqual([...official.args].sort());
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'omitted permissionMode leaves --permission-mode off like official SDK (v0.3.286)',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', {}),
        capture(officialQuery, 'test', {}),
      ]);

      expect(hasFlag(official.args, '--permission-mode')).toBe(false);
      expect(hasFlag(open.args, '--permission-mode')).toBe(false);
      expect([...open.args].sort()).toEqual([...official.args].sort());
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'CLAUDE_CODE_SDK_READS_SESSION_STATE env matches official SDK (v0.3.284)',
    async () => {
      const userSet = { env: { ...process.env, claude_code_sdk_reads_session_state: '0' } };
      const [open, official, openUserSet, officialUserSet] = await Promise.all([
        capture(openQuery, 'test', {}),
        capture(officialQuery, 'test', {}),
        capture(openQuery, 'test', userSet),
        capture(officialQuery, 'test', userSet),
      ]);

      expect(open.env?.CLAUDE_CODE_SDK_READS_SESSION_STATE).toBe('1');
      expect(official.env?.CLAUDE_CODE_SDK_READS_SESSION_STATE).toBe('1');
      // A caller's own setting, in any case, is left alone
      expect(openUserSet.env?.CLAUDE_CODE_SDK_READS_SESSION_STATE).toBeUndefined();
      expect(officialUserSet.env?.CLAUDE_CODE_SDK_READS_SESSION_STATE).toBeUndefined();
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'permissionMode option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { permissionMode: 'acceptEdits' }),
        capture(officialQuery, 'test', { permissionMode: 'acceptEdits' }),
      ]);

      expect(open.args).toContain('--permission-mode=acceptEdits');
      expect(official.args).toContain('--permission-mode=acceptEdits');

      console.log('   permissionMode args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sandbox option args match official SDK',
    async () => {
      const sandbox = { enabled: true, autoAllowBashIfSandboxed: false };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { sandbox }),
        capture(officialQuery, 'test', { sandbox }),
      ]);

      // Both should use --settings with JSON
      expect(hasFlag(open.args, '--settings')).toBe(true);
      expect(hasFlag(official.args, '--settings')).toBe(true);

      // Find the settings value

      const openSettings = JSON.parse(argValue(open.args, '--settings'));
      const officialSettings = JSON.parse(argValue(official.args, '--settings'));

      expect(openSettings.sandbox).toEqual(officialSettings.sandbox);

      console.log('   sandbox args match');
      console.log('   Open sandbox:', openSettings.sandbox);
      console.log('   Official sandbox:', officialSettings.sandbox);
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'settingSources option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { settingSources: ['project', 'user'] }),
        capture(officialQuery, 'test', { settingSources: ['project', 'user'] }),
      ]);

      // Both use --setting-sources= format (single arg with = sign)
      const openSettingSources = open.args.find((a) => a.startsWith('--setting-sources='));
      const officialSettingSources = official.args.find((a) => a.startsWith('--setting-sources='));

      expect(openSettingSources).toBeTruthy();
      expect(officialSettingSources).toBeTruthy();

      // Values should match (order may differ)
      const openValue = (openSettingSources ?? '').split('=')[1].split(',').sort().join(',');
      const officialValue = (officialSettingSources ?? '')
        .split('=')[1]
        .split(',')
        .sort()
        .join(',');

      expect(openValue).toBe(officialValue);

      console.log('   settingSources args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'resume option args match official SDK',
    async () => {
      const sessionId = 'test-session-123';
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { resume: sessionId }),
        capture(officialQuery, 'test', { resume: sessionId }),
      ]);

      expect(open.args).toContain(`--resume=${sessionId}`);
      expect(official.args).toContain(`--resume=${sessionId}`);

      console.log('   resume args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'maxThinkingTokens option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { maxThinkingTokens: 10000 }),
        capture(officialQuery, 'test', { maxThinkingTokens: 10000 }),
      ]);

      expect(open.args).toContain('--max-thinking-tokens=10000');
      expect(official.args).toContain('--max-thinking-tokens=10000');

      console.log('   maxThinkingTokens args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'allowedTools option args match official SDK',
    async () => {
      const allowedTools = ['Read', 'Write', 'Bash'];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { allowedTools }),
        capture(officialQuery, 'test', { allowedTools }),
      ]);

      expect(hasFlag(open.args, '--allowedTools')).toBe(true);
      expect(hasFlag(official.args, '--allowedTools')).toBe(true);

      // Find the allowedTools value

      // Values should match (order may differ)
      const openValue = argValue(open.args, '--allowedTools').split(',').sort().join(',');
      const officialValue = argValue(official.args, '--allowedTools').split(',').sort().join(',');

      expect(openValue).toBe(officialValue);

      console.log('   allowedTools args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'disallowedTools option args match official SDK',
    async () => {
      const disallowedTools = ['Bash', 'Write'];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { disallowedTools }),
        capture(officialQuery, 'test', { disallowedTools }),
      ]);

      expect(hasFlag(open.args, '--disallowedTools')).toBe(true);
      expect(hasFlag(official.args, '--disallowedTools')).toBe(true);

      // Find the disallowedTools value

      // Values should match (order may differ)
      const openValue = argValue(open.args, '--disallowedTools').split(',').sort().join(',');
      const officialValue = argValue(official.args, '--disallowedTools')
        .split(',')
        .sort()
        .join(',');

      expect(openValue).toBe(officialValue);

      console.log('   disallowedTools args match');
    },
    { timeout: 60000 }
  );
  test.concurrent(
    'effort option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { effort: 'low' }),
        capture(officialQuery, 'test', { effort: 'low' }),
      ]);

      expect(open.args).toContain('--effort=low');
      expect(official.args).toContain('--effort=low');

      console.log('   effort args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'thinking adaptive option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { thinking: { type: 'adaptive' } }),
        capture(officialQuery, 'test', { thinking: { type: 'adaptive' } }),
      ]);

      expect(open.args).toContain('--thinking=adaptive');
      expect(official.args).toContain('--thinking=adaptive');

      console.log('   thinking adaptive args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'thinking enabled option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { thinking: { type: 'enabled', budgetTokens: 5000 } }),
        capture(officialQuery, 'test', { thinking: { type: 'enabled', budgetTokens: 5000 } }),
      ]);

      expect(open.args).toContain('--max-thinking-tokens=5000');
      expect(official.args).toContain('--max-thinking-tokens=5000');

      // Should NOT have --thinking flag
      expect(hasFlag(open.args, '--thinking')).toBe(false);
      expect(hasFlag(official.args, '--thinking')).toBe(false);

      console.log('   thinking enabled args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'thinking disabled option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { thinking: { type: 'disabled' } }),
        capture(officialQuery, 'test', { thinking: { type: 'disabled' } }),
      ]);

      expect(open.args).toContain('--thinking=disabled');
      expect(official.args).toContain('--thinking=disabled');

      console.log('   thinking disabled args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'thinking enabled without budgetTokens args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { thinking: { type: 'enabled' } }),
        capture(officialQuery, 'test', { thinking: { type: 'enabled' } }),
      ]);

      // Official SDK falls back to --thinking adaptive when no budgetTokens
      expect(open.args).toContain('--thinking=adaptive');
      expect(official.args).toContain('--thinking=adaptive');

      // Neither should have --max-thinking-tokens
      expect(hasFlag(open.args, '--max-thinking-tokens')).toBe(false);
      expect(hasFlag(official.args, '--max-thinking-tokens')).toBe(false);

      console.log('   thinking enabled (no budget) args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'promptSuggestions option is in init message (not CLI args)',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { promptSuggestions: true }),
        capture(officialQuery, 'test', { promptSuggestions: true }),
      ]);

      // Should NOT be a CLI flag
      expect(open.args).not.toContain('--prompt-suggestions');
      expect(official.args).not.toContain('--prompt-suggestions');

      // Should be in the init message
      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit?.request?.promptSuggestions).toBe(true);
      expect(officialInit?.request?.promptSuggestions).toBe(true);

      console.log('   promptSuggestions init message match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'toolConfig previewFormat env var matches official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', {
          toolConfig: { askUserQuestion: { previewFormat: 'html' } },
        }),
        capture(officialQuery, 'test', {
          toolConfig: { askUserQuestion: { previewFormat: 'html' } },
        }),
      ]);

      // Should be passed as env var, not CLI arg
      expect(open.args).not.toContain('--tool-config');
      expect(official.args).not.toContain('--tool-config');

      // Both should set the env var
      expect(open.env?.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT).toBe('html');
      expect(official.env?.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT).toBe('html');

      console.log('   toolConfig previewFormat env var match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'settings object args match official SDK',
    async () => {
      const settings = { model: 'claude-sonnet-4-6' };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { settings } as Parameters<typeof openQuery>[0]['options']),
        capture(officialQuery, 'test', { settings } as Parameters<
          typeof officialQuery
        >[0]['options']),
      ]);

      expect(hasFlag(open.args, '--settings')).toBe(true);
      expect(hasFlag(official.args, '--settings')).toBe(true);

      const openSettings = JSON.parse(argValue(open.args, '--settings'));
      const officialSettings = JSON.parse(argValue(official.args, '--settings'));

      expect(openSettings).toEqual(officialSettings);

      console.log('   settings object args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'settings string path args match official SDK',
    async () => {
      const settings = '/path/to/settings.json';
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { settings } as Parameters<typeof openQuery>[0]['options']),
        capture(officialQuery, 'test', { settings } as Parameters<
          typeof officialQuery
        >[0]['options']),
      ]);

      expect(hasFlag(open.args, '--settings')).toBe(true);
      expect(hasFlag(official.args, '--settings')).toBe(true);

      expect(argValue(open.args, '--settings')).toBe(settings);
      expect(argValue(official.args, '--settings')).toBe(settings);

      console.log('   settings string path args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'settings + sandbox merged args match official SDK',
    async () => {
      const settings = { model: 'claude-sonnet-4-6' };
      const sandbox = { enabled: true };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { settings, sandbox } as Parameters<
          typeof openQuery
        >[0]['options']),
        capture(officialQuery, 'test', { settings, sandbox } as Parameters<
          typeof officialQuery
        >[0]['options']),
      ]);

      expect(hasFlag(open.args, '--settings')).toBe(true);
      expect(hasFlag(official.args, '--settings')).toBe(true);

      const openSettings = JSON.parse(argValue(open.args, '--settings'));
      const officialSettings = JSON.parse(argValue(official.args, '--settings'));

      expect(openSettings).toEqual(officialSettings);

      console.log('   settings + sandbox merged args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'taskBudget option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { taskBudget: { total: 10000 } }),
        capture(officialQuery, 'test', { taskBudget: { total: 10000 } }),
      ]);

      expect(open.args).toContain('--task-budget=10000');
      expect(official.args).toContain('--task-budget=10000');

      console.log('   taskBudget args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'includeHookEvents args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { includeHookEvents: true }),
        capture(officialQuery, 'test', { includeHookEvents: true }),
      ]);

      expect(open.args).toContain('--include-hook-events');
      expect(official.args).toContain('--include-hook-events');

      console.log('   includeHookEvents args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'permissionMode auto args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { permissionMode: 'auto' }),
        capture(officialQuery, 'test', { permissionMode: 'auto' }),
      ]);

      expect(open.args).toContain('--permission-mode=auto');
      expect(official.args).toContain('--permission-mode=auto');

      console.log('   permissionMode auto args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sandbox failIfUnavailable default matches official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { sandbox: { enabled: true } }),
        capture(officialQuery, 'test', { sandbox: { enabled: true } }),
      ]);

      const openSettings = JSON.parse(argValue(open.args, '--settings'));
      const officialSettings = JSON.parse(argValue(official.args, '--settings'));

      // Both should default failIfUnavailable to true when enabled: true
      expect(openSettings.sandbox.failIfUnavailable).toBe(true);
      expect(officialSettings.sandbox.failIfUnavailable).toBe(true);
      expect(openSettings.sandbox).toEqual(officialSettings.sandbox);

      console.log('   sandbox failIfUnavailable default args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sandbox explicit failIfUnavailable false matches official SDK',
    async () => {
      const sandbox = { enabled: true, failIfUnavailable: false };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { sandbox }),
        capture(officialQuery, 'test', { sandbox }),
      ]);

      const openSettings = JSON.parse(argValue(open.args, '--settings'));
      const officialSettings = JSON.parse(argValue(official.args, '--settings'));

      expect(openSettings.sandbox.failIfUnavailable).toBe(false);
      expect(officialSettings.sandbox.failIfUnavailable).toBe(false);

      console.log('   sandbox explicit failIfUnavailable false args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'plugins --plugin-dir args match official SDK',
    async () => {
      const plugins = [
        { type: 'local' as const, path: './path/to/plugin1' },
        { type: 'local' as const, path: '/absolute/path/to/plugin2' },
      ];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { plugins }),
        capture(officialQuery, 'test', { plugins }),
      ]);

      // Both should have two --plugin-dir flags
      const openPluginDirs = argValues(open.args, '--plugin-dir');
      const officialPluginDirs = argValues(official.args, '--plugin-dir');

      expect(openPluginDirs).toEqual(officialPluginDirs);
      expect(openPluginDirs).toEqual(['./path/to/plugin1', '/absolute/path/to/plugin2']);

      console.log('   plugins --plugin-dir args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'plugins skipMcpDiscovery --plugin-dir-no-mcp args match official SDK',
    async () => {
      const plugins = [
        { type: 'local' as const, path: './path/to/plugin1', skipMcpDiscovery: true },
        { type: 'local' as const, path: '/absolute/path/to/plugin2' },
      ];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { plugins }),
        capture(officialQuery, 'test', { plugins }),
      ]);

      expect(argValues(open.args, '--plugin-dir-no-mcp')).toEqual(['./path/to/plugin1']);
      expect(argValues(official.args, '--plugin-dir-no-mcp')).toEqual(['./path/to/plugin1']);
      expect(argValues(open.args, '--plugin-dir')).toEqual(['/absolute/path/to/plugin2']);
      expect(argValues(official.args, '--plugin-dir')).toEqual(['/absolute/path/to/plugin2']);

      console.log('   plugins --plugin-dir-no-mcp args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    "plugins with pluginDelivery: 'initialize' sends --await-initialize instead of --plugin-dir",
    async () => {
      const plugins = [{ type: 'local' as const, path: './path/to/plugin1' }];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { plugins, pluginDelivery: 'initialize' }),
        capture(officialQuery, 'test', { plugins, pluginDelivery: 'initialize' }),
      ]);

      expect(open.args).toContain('--await-initialize');
      expect(official.args).toContain('--await-initialize');
      expect(hasFlag(open.args, '--plugin-dir')).toBe(false);
      expect(hasFlag(official.args, '--plugin-dir')).toBe(false);

      console.log("   plugins pluginDelivery: 'initialize' args match");
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'managedSettings --managed-settings args match official SDK',
    async () => {
      const managedSettings = { permissions: { allow: [], deny: [] } };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { managedSettings }),
        capture(officialQuery, 'test', { managedSettings }),
      ]);

      expect(hasFlag(open.args, '--managed-settings')).toBe(true);
      expect(hasFlag(official.args, '--managed-settings')).toBe(true);
      expect(JSON.parse(argValue(open.args, '--managed-settings'))).toEqual(managedSettings);
      expect(JSON.parse(argValue(official.args, '--managed-settings'))).toEqual(managedSettings);

      console.log('   managedSettings --managed-settings args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'skills: all adds Skill to --allowedTools, matches official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { skills: 'all' }),
        capture(officialQuery, 'test', { skills: 'all' }),
      ]);

      expect(hasFlag(open.args, '--allowedTools')).toBe(true);
      expect(hasFlag(official.args, '--allowedTools')).toBe(true);
      expect(argValue(open.args, '--allowedTools')).toBe('Skill');
      expect(argValue(official.args, '--allowedTools')).toBe('Skill');

      console.log('   skills: all --allowedTools Skill match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'skills: string[] adds Skill(name) to --allowedTools, matches official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { skills: ['pdf', 'docx'] }),
        capture(officialQuery, 'test', { skills: ['pdf', 'docx'] }),
      ]);

      expect(hasFlag(open.args, '--allowedTools')).toBe(true);
      expect(hasFlag(official.args, '--allowedTools')).toBe(true);
      expect(argValue(open.args, '--allowedTools')).toBe('Skill(pdf),Skill(docx)');
      expect(argValue(official.args, '--allowedTools')).toBe('Skill(pdf),Skill(docx)');

      console.log('   skills: string[] --allowedTools Skill(name) match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'skills: string[] combined with allowedTools matches official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { allowedTools: ['Bash', 'Read'], skills: ['pdf'] }),
        capture(officialQuery, 'test', { allowedTools: ['Bash', 'Read'], skills: ['pdf'] }),
      ]);

      expect(hasFlag(open.args, '--allowedTools')).toBe(true);
      expect(hasFlag(official.args, '--allowedTools')).toBe(true);
      expect(argValue(open.args, '--allowedTools')).toBe('Bash,Read,Skill(pdf)');
      expect(argValue(official.args, '--allowedTools')).toBe('Bash,Read,Skill(pdf)');

      console.log('   skills + allowedTools combined --allowedTools match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'permissionPrompts args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { permissionPrompts: 'none' }),
        capture(officialQuery, 'test', { permissionPrompts: 'none' }),
      ]);

      expect(hasFlag(open.args, '--permission-prompts')).toBe(true);
      expect(hasFlag(official.args, '--permission-prompts')).toBe(true);
      expect(argValue(open.args, '--permission-prompts')).toBe('none');
      expect(argValue(official.args, '--permission-prompts')).toBe('none');

      console.log('   permissionPrompts args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'projectConfigRoot args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { projectConfigRoot: '/tmp/project-root' }),
        capture(officialQuery, 'test', { projectConfigRoot: '/tmp/project-root' }),
      ]);

      expect(open.args).toContain('--project-config-root=/tmp/project-root');
      expect(official.args).toContain('--project-config-root=/tmp/project-root');

      console.log('   projectConfigRoot args match');
    },
    { timeout: 60000 }
  );

  /** Group `--flag value` pairs so arg order does not matter, then sort. */
  function argPairs(args: string[]): string[] {
    const pairs: string[] = [];
    for (let i = 0; i < args.length; i++) {
      const next = args[i + 1];
      if (
        args[i].startsWith('--') &&
        !args[i].includes('=') &&
        next !== undefined &&
        !next.startsWith('--')
      ) {
        pairs.push(`${args[i]} ${next}`);
        i++;
      } else {
        pairs.push(args[i]);
      }
    }
    return pairs.sort();
  }

  async function captureOrError(queryFn: typeof openQuery, options: Record<string, unknown>) {
    const error = await queryError(queryFn, options);
    if (error !== undefined) return { error };
    const { args } = await capture(queryFn, 'test', options);
    expect(args.length).toBeGreaterThan(0);
    return { args: argPairs(args) };
  }

  const parityCases: [string, Record<string, unknown>][] = [
    ['thinking adaptive + display', { thinking: { type: 'adaptive', display: 'summarized' } }],
    [
      'thinking enabled + budget + display',
      { thinking: { type: 'enabled', budgetTokens: 2048, display: 'omitted' } },
    ],
    [
      'thinking disabled ignores display',
      { thinking: { type: 'disabled', display: 'summarized' } as unknown },
    ],
    ['maxThinkingTokens 0 disables thinking', { maxThinkingTokens: 0 }],
    ['maxThinkingTokens budget', { maxThinkingTokens: 4096 }],
    [
      'extraArgs value starting with a dash',
      { extraArgs: { 'some-flag': '-x', other: 'plain', bare: null } },
    ],
    [
      'settings object + sandbox are merged',
      { settings: { model: 'haiku' }, sandbox: { enabled: true } },
    ],
    [
      'settings JSON string + sandbox are merged',
      { settings: '{"model":"haiku"}', sandbox: { enabled: false } },
    ],
    [
      'settings path + sandbox is rejected',
      { settings: '/tmp/settings.json', sandbox: { enabled: true } },
    ],
    ['settings path alone passes through', { settings: '/tmp/settings.json' }],
    [
      'skills deduplicated against allowedTools',
      { skills: ['pdf', 'xlsx'], allowedTools: ['Read', 'Skill(pdf)'] },
    ],
    ['skills with parentheses rejected', { skills: ['bad(name)'] }],
    ['skills wildcard rejected', { skills: ['*'] }],
    ['skills padded name rejected', { skills: [' pdf'] }],
    ['skills leading slash rejected', { skills: ['/pdf'] }],
    ['skills wildcard suffix rejected', { skills: ['plugin:*'] }],
    ['empty skills array', { skills: [] }],
    // v0.3.295: named options are sent as one `--flag=value` argument
    ['defaults', {}],
    [
      'named options as --flag=value',
      {
        model: 'claude-sonnet-4-5',
        fallbackModel: 'claude-haiku-4-5',
        agent: 'reviewer',
        permissionMode: 'plan',
        maxTurns: 3,
        maxBudgetUsd: 2.5,
        taskBudget: { total: 9000 },
        effort: 'high',
        betas: ['context-1m-2025-08-07'],
        allowedTools: ['Read'],
        disallowedTools: ['Bash'],
        skills: ['pdf'],
        additionalDirectories: ['/tmp/a', '/tmp/b'],
        projectConfigRoot: '/tmp/root',
        permissionPrompts: 'none',
        permissionPromptToolName: 'mcp__perm__ask',
        debugFile: '/tmp/debug.log',
        resume: 'abc',
        resumeSessionAt: 'def',
        outputFormat: { type: 'json_schema', schema: { type: 'object' } },
        thinking: { type: 'enabled', budgetTokens: 1024, display: 'summarized' },
        plugins: [
          { type: 'local', path: '/tmp/p1' },
          { type: 'local', path: '/tmp/p2', skipMcpDiscovery: true },
        ],
      },
    ],
    ['tools empty array as --tools=', { tools: [] }],
    ['tools preset as --tools=default', { tools: { type: 'preset', preset: 'claude_code' } }],
    ['canUseTool as --permission-prompt-tool=stdio', { canUseTool: async () => ({}) }],
    [
      'mcp-config and managed-settings keep the split form',
      {
        mcpServers: { remote: { type: 'http', url: 'https://example.com/mcp' } },
        managedSettings: { model: 'claude-sonnet-4-5' },
      },
    ],
  ];

  for (const [name, options] of parityCases) {
    test.concurrent(
      `${name} (matches official SDK)`,
      async () => {
        const [open, official] = await Promise.all([
          captureOrError(openQuery, options),
          captureOrError(officialQuery, options),
        ]);
        if (name.includes('rejected')) expect(official).toHaveProperty('error');
        expect(open).toEqual(official);
      },
      { timeout: 60000 }
    );
  }
});
