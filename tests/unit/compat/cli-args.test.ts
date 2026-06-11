/**
 * CLI arguments compatibility tests
 *
 * Verifies that open SDK passes the same CLI arguments as official SDK.
 */

import { describe, expect, test } from 'bun:test';
import { capture, officialQuery, openQuery } from './capture-utils.ts';

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

      expect(open.args).toContain('--model');
      expect(open.args).toContain(model);
      expect(official.args).toContain('--model');
      expect(official.args).toContain(model);

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

      expect(open.args).toContain('--max-turns');
      expect(open.args).toContain('5');
      expect(official.args).toContain('--max-turns');
      expect(official.args).toContain('5');

      console.log('   maxTurns args match');
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

      expect(open.args).toContain('--permission-mode');
      expect(open.args).toContain('acceptEdits');
      expect(official.args).toContain('--permission-mode');
      expect(official.args).toContain('acceptEdits');

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
      expect(open.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      // Find the settings value
      const openSettingsIdx = open.args.indexOf('--settings');
      const officialSettingsIdx = official.args.indexOf('--settings');

      const openSettings = JSON.parse(open.args[openSettingsIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialSettingsIdx + 1]);

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

      expect(open.args).toContain('--resume');
      expect(open.args).toContain(sessionId);
      expect(official.args).toContain('--resume');
      expect(official.args).toContain(sessionId);

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

      expect(open.args).toContain('--max-thinking-tokens');
      expect(open.args).toContain('10000');
      expect(official.args).toContain('--max-thinking-tokens');
      expect(official.args).toContain('10000');

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

      expect(open.args).toContain('--allowedTools');
      expect(official.args).toContain('--allowedTools');

      // Find the allowedTools value
      const openIdx = open.args.indexOf('--allowedTools');
      const officialIdx = official.args.indexOf('--allowedTools');

      // Values should match (order may differ)
      const openValue = open.args[openIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

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

      expect(open.args).toContain('--disallowedTools');
      expect(official.args).toContain('--disallowedTools');

      // Find the disallowedTools value
      const openIdx = open.args.indexOf('--disallowedTools');
      const officialIdx = official.args.indexOf('--disallowedTools');

      // Values should match (order may differ)
      const openValue = open.args[openIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

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

      expect(open.args).toContain('--effort');
      expect(open.args).toContain('low');
      expect(official.args).toContain('--effort');
      expect(official.args).toContain('low');

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

      expect(open.args).toContain('--thinking');
      expect(open.args).toContain('adaptive');
      expect(official.args).toContain('--thinking');
      expect(official.args).toContain('adaptive');

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

      expect(open.args).toContain('--max-thinking-tokens');
      expect(open.args).toContain('5000');
      expect(official.args).toContain('--max-thinking-tokens');
      expect(official.args).toContain('5000');

      // Should NOT have --thinking flag
      expect(open.args).not.toContain('--thinking');
      expect(official.args).not.toContain('--thinking');

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

      expect(open.args).toContain('--thinking');
      expect(open.args).toContain('disabled');
      expect(official.args).toContain('--thinking');
      expect(official.args).toContain('disabled');

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
      expect(open.args).toContain('--thinking');
      expect(open.args).toContain('adaptive');
      expect(official.args).toContain('--thinking');
      expect(official.args).toContain('adaptive');

      // Neither should have --max-thinking-tokens
      expect(open.args).not.toContain('--max-thinking-tokens');
      expect(official.args).not.toContain('--max-thinking-tokens');

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

      expect(open.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      const openIdx = open.args.indexOf('--settings');
      const officialIdx = official.args.indexOf('--settings');

      const openSettings = JSON.parse(open.args[openIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialIdx + 1]);

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

      expect(open.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      const openIdx = open.args.indexOf('--settings');
      const officialIdx = official.args.indexOf('--settings');

      expect(open.args[openIdx + 1]).toBe(settings);
      expect(official.args[officialIdx + 1]).toBe(settings);

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

      expect(open.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      const openIdx = open.args.indexOf('--settings');
      const officialIdx = official.args.indexOf('--settings');

      const openSettings = JSON.parse(open.args[openIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialIdx + 1]);

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

      expect(open.args).toContain('--task-budget');
      expect(open.args).toContain('10000');
      expect(official.args).toContain('--task-budget');
      expect(official.args).toContain('10000');

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

      expect(open.args).toContain('--permission-mode');
      expect(open.args).toContain('auto');
      expect(official.args).toContain('--permission-mode');
      expect(official.args).toContain('auto');

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

      const openIdx = open.args.indexOf('--settings');
      const officialIdx = official.args.indexOf('--settings');

      const openSettings = JSON.parse(open.args[openIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialIdx + 1]);

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

      const openIdx = open.args.indexOf('--settings');
      const officialIdx = official.args.indexOf('--settings');

      const openSettings = JSON.parse(open.args[openIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialIdx + 1]);

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
      const openPluginDirs: string[] = [];
      const officialPluginDirs: string[] = [];

      for (let i = 0; i < open.args.length; i++) {
        if (open.args[i] === '--plugin-dir') openPluginDirs.push(open.args[i + 1]);
      }
      for (let i = 0; i < official.args.length; i++) {
        if (official.args[i] === '--plugin-dir') officialPluginDirs.push(official.args[i + 1]);
      }

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

      const collectFlag = (args: string[], flag: string) => {
        const values: string[] = [];
        for (let i = 0; i < args.length; i++) {
          if (args[i] === flag) values.push(args[i + 1]);
        }
        return values;
      };

      expect(collectFlag(open.args, '--plugin-dir-no-mcp')).toEqual(['./path/to/plugin1']);
      expect(collectFlag(official.args, '--plugin-dir-no-mcp')).toEqual(['./path/to/plugin1']);
      expect(collectFlag(open.args, '--plugin-dir')).toEqual(['/absolute/path/to/plugin2']);
      expect(collectFlag(official.args, '--plugin-dir')).toEqual(['/absolute/path/to/plugin2']);

      console.log('   plugins --plugin-dir-no-mcp args match');
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

      const openIdx = open.args.indexOf('--managed-settings');
      const officialIdx = official.args.indexOf('--managed-settings');

      expect(openIdx).toBeGreaterThan(-1);
      expect(officialIdx).toBeGreaterThan(-1);
      expect(JSON.parse(open.args[openIdx + 1])).toEqual(managedSettings);
      expect(JSON.parse(official.args[officialIdx + 1])).toEqual(managedSettings);

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

      const openIdx = open.args.indexOf('--allowedTools');
      const officialIdx = official.args.indexOf('--allowedTools');

      expect(openIdx).toBeGreaterThan(-1);
      expect(officialIdx).toBeGreaterThan(-1);
      expect(open.args[openIdx + 1]).toBe('Skill');
      expect(official.args[officialIdx + 1]).toBe('Skill');

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

      const openIdx = open.args.indexOf('--allowedTools');
      const officialIdx = official.args.indexOf('--allowedTools');

      expect(openIdx).toBeGreaterThan(-1);
      expect(officialIdx).toBeGreaterThan(-1);
      expect(open.args[openIdx + 1]).toBe('Skill(pdf),Skill(docx)');
      expect(official.args[officialIdx + 1]).toBe('Skill(pdf),Skill(docx)');

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

      const openIdx = open.args.indexOf('--allowedTools');
      const officialIdx = official.args.indexOf('--allowedTools');

      expect(openIdx).toBeGreaterThan(-1);
      expect(officialIdx).toBeGreaterThan(-1);
      expect(open.args[openIdx + 1]).toBe('Bash,Read,Skill(pdf)');
      expect(official.args[officialIdx + 1]).toBe('Bash,Read,Skill(pdf)');

      console.log('   skills + allowedTools combined --allowedTools match');
    },
    { timeout: 60000 }
  );
});
