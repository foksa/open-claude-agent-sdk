/**
 * New CLI options compatibility tests
 *
 * Verifies that newer CLI options (argBuilder flags) match official SDK.
 */

import { describe, expect, test } from 'bun:test';
import { capture, liteQuery, officialQuery } from './capture-utils.ts';

describe('new CLI options compatibility', () => {
  test.concurrent(
    'additionalDirectories --add-dir args match official SDK',
    async () => {
      const additionalDirectories = ['/path/to/dir1', '/path/to/dir2'];
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { additionalDirectories }),
        capture(officialQuery, 'test', { additionalDirectories }),
      ]);

      // Both should have --add-dir flags
      const liteAddDirs: string[] = [];
      const officialAddDirs: string[] = [];
      for (let i = 0; i < lite.args.length; i++) {
        if (lite.args[i] === '--add-dir') liteAddDirs.push(lite.args[i + 1]);
      }
      for (let i = 0; i < official.args.length; i++) {
        if (official.args[i] === '--add-dir') officialAddDirs.push(official.args[i + 1]);
      }

      expect(liteAddDirs).toEqual(officialAddDirs);
      expect(liteAddDirs).toEqual(additionalDirectories);

      console.log('   additionalDirectories --add-dir args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'agent option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { agent: 'code-reviewer' }),
        capture(officialQuery, 'test', { agent: 'code-reviewer' }),
      ]);

      expect(lite.args).toContain('--agent');
      expect(lite.args).toContain('code-reviewer');
      expect(official.args).toContain('--agent');
      expect(official.args).toContain('code-reviewer');

      console.log('   agent args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'betas option args match official SDK',
    async () => {
      const betas = ['context-1m-2025-08-07'] as const;
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { betas }),
        capture(officialQuery, 'test', { betas }),
      ]);

      expect(lite.args).toContain('--betas');
      expect(official.args).toContain('--betas');

      const liteIdx = lite.args.indexOf('--betas');
      const officialIdx = official.args.indexOf('--betas');
      expect(lite.args[liteIdx + 1]).toBe(official.args[officialIdx + 1]);

      console.log('   betas args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'continue option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { continue: true }),
        capture(officialQuery, 'test', { continue: true }),
      ]);

      expect(lite.args).toContain('--continue');
      expect(official.args).toContain('--continue');

      console.log('   continue args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'fallbackModel option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', {
          model: 'claude-sonnet-4-20250514',
          fallbackModel: 'claude-haiku-4-20250414',
        }),
        capture(officialQuery, 'test', {
          model: 'claude-sonnet-4-20250514',
          fallbackModel: 'claude-haiku-4-20250414',
        }),
      ]);

      expect(lite.args).toContain('--fallback-model');
      expect(lite.args).toContain('claude-haiku-4-20250414');
      expect(official.args).toContain('--fallback-model');
      expect(official.args).toContain('claude-haiku-4-20250414');

      console.log('   fallbackModel args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'forkSession option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { forkSession: true }),
        capture(officialQuery, 'test', { forkSession: true }),
      ]);

      expect(lite.args).toContain('--fork-session');
      expect(official.args).toContain('--fork-session');

      console.log('   forkSession args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sessionId option args match official SDK',
    async () => {
      const sessionId = 'abc-123-def-456';
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { sessionId }),
        capture(officialQuery, 'test', { sessionId }),
      ]);

      expect(lite.args).toContain('--session-id');
      expect(lite.args).toContain(sessionId);
      expect(official.args).toContain('--session-id');
      expect(official.args).toContain(sessionId);

      console.log('   sessionId args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'resumeSessionAt option args match official SDK',
    async () => {
      const resumeSessionAt = 'msg-uuid-789';
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { resumeSessionAt }),
        capture(officialQuery, 'test', { resumeSessionAt }),
      ]);

      expect(lite.args).toContain('--resume-session-at');
      expect(lite.args).toContain(resumeSessionAt);
      expect(official.args).toContain('--resume-session-at');
      expect(official.args).toContain(resumeSessionAt);

      console.log('   resumeSessionAt args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'persistSession false args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { persistSession: false }),
        capture(officialQuery, 'test', { persistSession: false }),
      ]);

      expect(lite.args).toContain('--no-session-persistence');
      expect(official.args).toContain('--no-session-persistence');

      console.log('   persistSession=false args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'strictMcpConfig option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { strictMcpConfig: true }),
        capture(officialQuery, 'test', { strictMcpConfig: true }),
      ]);

      expect(lite.args).toContain('--strict-mcp-config');
      expect(official.args).toContain('--strict-mcp-config');

      console.log('   strictMcpConfig args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'tools string array args match official SDK',
    async () => {
      const tools = ['Bash', 'Read', 'Edit'];
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { tools }),
        capture(officialQuery, 'test', { tools }),
      ]);

      expect(lite.args).toContain('--tools');
      expect(official.args).toContain('--tools');

      const liteIdx = lite.args.indexOf('--tools');
      const officialIdx = official.args.indexOf('--tools');
      expect(lite.args[liteIdx + 1]).toBe(official.args[officialIdx + 1]);

      console.log('   tools string array args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'tools empty array args match official SDK',
    async () => {
      const tools: string[] = [];
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { tools }),
        capture(officialQuery, 'test', { tools }),
      ]);

      expect(lite.args).toContain('--tools');
      expect(official.args).toContain('--tools');

      const liteIdx = lite.args.indexOf('--tools');
      const officialIdx = official.args.indexOf('--tools');
      expect(lite.args[liteIdx + 1]).toBe('');
      expect(official.args[officialIdx + 1]).toBe('');

      console.log('   tools empty array args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'tools preset args match official SDK',
    async () => {
      const tools = { type: 'preset' as const, preset: 'claude_code' as const };
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { tools }),
        capture(officialQuery, 'test', { tools }),
      ]);

      expect(lite.args).toContain('--tools');
      expect(official.args).toContain('--tools');

      const liteIdx = lite.args.indexOf('--tools');
      const officialIdx = official.args.indexOf('--tools');
      expect(lite.args[liteIdx + 1]).toBe(official.args[officialIdx + 1]);

      console.log('   tools preset args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'permissionPromptToolName args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { permissionPromptToolName: 'my-tool' }),
        capture(officialQuery, 'test', { permissionPromptToolName: 'my-tool' }),
      ]);

      expect(lite.args).toContain('--permission-prompt-tool');
      expect(lite.args).toContain('my-tool');
      expect(official.args).toContain('--permission-prompt-tool');
      expect(official.args).toContain('my-tool');

      console.log('   permissionPromptToolName args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'extraArgs pass-through matches official SDK',
    async () => {
      const extraArgs = { 'custom-flag': 'value1', 'bool-flag': null };
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { extraArgs }),
        capture(officialQuery, 'test', { extraArgs }),
      ]);

      expect(lite.args).toContain('--custom-flag');
      expect(lite.args).toContain('value1');
      expect(lite.args).toContain('--bool-flag');
      expect(official.args).toContain('--custom-flag');
      expect(official.args).toContain('value1');
      expect(official.args).toContain('--bool-flag');

      console.log('   extraArgs args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sandbox + extraArgs merged correctly matching official SDK',
    async () => {
      const sandbox = { enabled: true, autoAllowBashIfSandboxed: false };
      const extraArgs = { 'some-flag': 'val' };
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { sandbox, extraArgs }),
        capture(officialQuery, 'test', { sandbox, extraArgs }),
      ]);

      // Both should have --settings (sandbox merged into extraArgs.settings)
      expect(lite.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      // Both should have --some-flag
      expect(lite.args).toContain('--some-flag');
      expect(official.args).toContain('--some-flag');

      // Compare settings values
      const liteIdx = lite.args.indexOf('--settings');
      const officialIdx = official.args.indexOf('--settings');
      const liteSettings = JSON.parse(lite.args[liteIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialIdx + 1]);
      expect(liteSettings.sandbox).toEqual(officialSettings.sandbox);

      console.log('   sandbox + extraArgs merged correctly');
    },
    { timeout: 60000 }
  );
});
