/**
 * CLI arguments compatibility tests
 *
 * Verifies that lite SDK passes the same CLI arguments as official SDK.
 */

import { describe, expect, test } from 'bun:test';
import { capture, liteQuery, officialQuery } from './capture-utils.ts';

describe('CLI arguments compatibility', () => {
  test.concurrent(
    'basic args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test'),
        capture(officialQuery, 'test'),
      ]);

      // Both should have required flags
      expect(lite.args).toContain('--output-format');
      expect(lite.args).toContain('stream-json');
      expect(official.args).toContain('--output-format');
      expect(official.args).toContain('stream-json');

      // Both should have input-format
      expect(lite.args).toContain('--input-format');
      expect(official.args).toContain('--input-format');

      console.log('   Basic args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'model option args match official SDK',
    async () => {
      const model = 'claude-sonnet-4-20250514';
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { model }),
        capture(officialQuery, 'test', { model }),
      ]);

      expect(lite.args).toContain('--model');
      expect(lite.args).toContain(model);
      expect(official.args).toContain('--model');
      expect(official.args).toContain(model);

      console.log('   Model args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'maxTurns option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { maxTurns: 5 }),
        capture(officialQuery, 'test', { maxTurns: 5 }),
      ]);

      expect(lite.args).toContain('--max-turns');
      expect(lite.args).toContain('5');
      expect(official.args).toContain('--max-turns');
      expect(official.args).toContain('5');

      console.log('   maxTurns args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'permissionMode option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { permissionMode: 'acceptEdits' }),
        capture(officialQuery, 'test', { permissionMode: 'acceptEdits' }),
      ]);

      expect(lite.args).toContain('--permission-mode');
      expect(lite.args).toContain('acceptEdits');
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
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { sandbox }),
        capture(officialQuery, 'test', { sandbox }),
      ]);

      // Both should use --settings with JSON
      expect(lite.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      // Find the settings value
      const liteSettingsIdx = lite.args.indexOf('--settings');
      const officialSettingsIdx = official.args.indexOf('--settings');

      const liteSettings = JSON.parse(lite.args[liteSettingsIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialSettingsIdx + 1]);

      expect(liteSettings.sandbox).toEqual(officialSettings.sandbox);

      console.log('   sandbox args match');
      console.log('   Lite sandbox:', liteSettings.sandbox);
      console.log('   Official sandbox:', officialSettings.sandbox);
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'settingSources option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { settingSources: ['project', 'user'] }),
        capture(officialQuery, 'test', { settingSources: ['project', 'user'] }),
      ]);

      expect(lite.args).toContain('--setting-sources');
      expect(official.args).toContain('--setting-sources');

      // Find the setting-sources value
      const liteIdx = lite.args.indexOf('--setting-sources');
      const officialIdx = official.args.indexOf('--setting-sources');

      // Values should match (order may differ)
      const liteValue = lite.args[liteIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

      expect(liteValue).toBe(officialValue);

      console.log('   settingSources args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'resume option args match official SDK',
    async () => {
      const sessionId = 'test-session-123';
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { resume: sessionId }),
        capture(officialQuery, 'test', { resume: sessionId }),
      ]);

      expect(lite.args).toContain('--resume');
      expect(lite.args).toContain(sessionId);
      expect(official.args).toContain('--resume');
      expect(official.args).toContain(sessionId);

      console.log('   resume args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'maxThinkingTokens option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { maxThinkingTokens: 10000 }),
        capture(officialQuery, 'test', { maxThinkingTokens: 10000 }),
      ]);

      expect(lite.args).toContain('--max-thinking-tokens');
      expect(lite.args).toContain('10000');
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
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { allowedTools }),
        capture(officialQuery, 'test', { allowedTools }),
      ]);

      expect(lite.args).toContain('--allowedTools');
      expect(official.args).toContain('--allowedTools');

      // Find the allowedTools value
      const liteIdx = lite.args.indexOf('--allowedTools');
      const officialIdx = official.args.indexOf('--allowedTools');

      // Values should match (order may differ)
      const liteValue = lite.args[liteIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

      expect(liteValue).toBe(officialValue);

      console.log('   allowedTools args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'disallowedTools option args match official SDK',
    async () => {
      const disallowedTools = ['Bash', 'Write'];
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { disallowedTools }),
        capture(officialQuery, 'test', { disallowedTools }),
      ]);

      expect(lite.args).toContain('--disallowedTools');
      expect(official.args).toContain('--disallowedTools');

      // Find the disallowedTools value
      const liteIdx = lite.args.indexOf('--disallowedTools');
      const officialIdx = official.args.indexOf('--disallowedTools');

      // Values should match (order may differ)
      const liteValue = lite.args[liteIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

      expect(liteValue).toBe(officialValue);

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
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { plugins }),
        capture(officialQuery, 'test', { plugins }),
      ]);

      // Both should have two --plugin-dir flags
      const litePluginDirs: string[] = [];
      const officialPluginDirs: string[] = [];

      for (let i = 0; i < lite.args.length; i++) {
        if (lite.args[i] === '--plugin-dir') litePluginDirs.push(lite.args[i + 1]);
      }
      for (let i = 0; i < official.args.length; i++) {
        if (official.args[i] === '--plugin-dir') officialPluginDirs.push(official.args[i + 1]);
      }

      expect(litePluginDirs).toEqual(officialPluginDirs);
      expect(litePluginDirs).toEqual(['./path/to/plugin1', '/absolute/path/to/plugin2']);

      console.log('   plugins --plugin-dir args match');
    },
    { timeout: 60000 }
  );
});
