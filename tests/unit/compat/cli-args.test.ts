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

      expect(open.args).toContain('--setting-sources');
      expect(official.args).toContain('--setting-sources');

      // Find the setting-sources value
      const openIdx = open.args.indexOf('--setting-sources');
      const officialIdx = official.args.indexOf('--setting-sources');

      // Values should match (order may differ)
      const openValue = open.args[openIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

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
});
