/**
 * New CLI options compatibility tests
 *
 * Verifies that newer CLI options (argBuilder flags) match official SDK.
 */

import { describe, expect, test } from 'bun:test';
import { argValue, argValues, hasFlag } from '../arg-utils.ts';
import { capture, officialQuery, openQuery } from './capture-utils.ts';

describe('new CLI options compatibility', () => {
  test.concurrent(
    'additionalDirectories --add-dir args match official SDK',
    async () => {
      const additionalDirectories = ['/path/to/dir1', '/path/to/dir2'];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { additionalDirectories }),
        capture(officialQuery, 'test', { additionalDirectories }),
      ]);

      // Both should have --add-dir flags
      const openAddDirs = argValues(open.args, '--add-dir');
      const officialAddDirs = argValues(official.args, '--add-dir');

      expect(openAddDirs).toEqual(officialAddDirs);
      expect(openAddDirs).toEqual(additionalDirectories);

      console.log('   additionalDirectories --add-dir args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'agent option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { agent: 'code-reviewer' }),
        capture(officialQuery, 'test', { agent: 'code-reviewer' }),
      ]);

      expect(open.args).toContain('--agent=code-reviewer');
      expect(official.args).toContain('--agent=code-reviewer');

      console.log('   agent args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'betas option args match official SDK',
    async () => {
      const betas = ['context-1m-2025-08-07'] as const;
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { betas }),
        capture(officialQuery, 'test', { betas }),
      ]);

      expect(hasFlag(open.args, '--betas')).toBe(true);
      expect(hasFlag(official.args, '--betas')).toBe(true);

      expect(argValue(open.args, '--betas')).toBe(argValue(official.args, '--betas'));

      console.log('   betas args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'continue option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { continue: true }),
        capture(officialQuery, 'test', { continue: true }),
      ]);

      expect(open.args).toContain('--continue');
      expect(official.args).toContain('--continue');

      console.log('   continue args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'fallbackModel option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', {
          model: 'claude-sonnet-4-20250514',
          fallbackModel: 'claude-haiku-4-20250414',
        }),
        capture(officialQuery, 'test', {
          model: 'claude-sonnet-4-20250514',
          fallbackModel: 'claude-haiku-4-20250414',
        }),
      ]);

      expect(open.args).toContain('--fallback-model=claude-haiku-4-20250414');
      expect(official.args).toContain('--fallback-model=claude-haiku-4-20250414');

      console.log('   fallbackModel args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'forkSession option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { forkSession: true }),
        capture(officialQuery, 'test', { forkSession: true }),
      ]);

      expect(open.args).toContain('--fork-session');
      expect(official.args).toContain('--fork-session');

      console.log('   forkSession args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sessionId option args match official SDK',
    async () => {
      const sessionId = 'abc-123-def-456';
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { sessionId }),
        capture(officialQuery, 'test', { sessionId }),
      ]);

      expect(open.args).toContain(`--session-id=${sessionId}`);
      expect(official.args).toContain(`--session-id=${sessionId}`);

      console.log('   sessionId args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'resumeSessionAt option args match official SDK',
    async () => {
      const resumeSessionAt = 'msg-uuid-789';
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { resumeSessionAt }),
        capture(officialQuery, 'test', { resumeSessionAt }),
      ]);

      expect(open.args).toContain(`--resume-session-at=${resumeSessionAt}`);
      expect(official.args).toContain(`--resume-session-at=${resumeSessionAt}`);

      console.log('   resumeSessionAt args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'resumeDropsTurn option args match official SDK',
    async () => {
      const resumeDropsTurn = 'prompt-uuid-321';
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { resumeDropsTurn }),
        capture(officialQuery, 'test', { resumeDropsTurn }),
      ]);

      expect(open.args).toContain(`--resume-drops-turn=${resumeDropsTurn}`);
      expect(official.args).toContain(`--resume-drops-turn=${resumeDropsTurn}`);

      console.log('   resumeDropsTurn args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'persistSession false args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { persistSession: false }),
        capture(officialQuery, 'test', { persistSession: false }),
      ]);

      expect(open.args).toContain('--no-session-persistence');
      expect(official.args).toContain('--no-session-persistence');

      console.log('   persistSession=false args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'strictMcpConfig option args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { strictMcpConfig: true }),
        capture(officialQuery, 'test', { strictMcpConfig: true }),
      ]);

      expect(open.args).toContain('--strict-mcp-config');
      expect(official.args).toContain('--strict-mcp-config');

      console.log('   strictMcpConfig args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'tools string array args match official SDK',
    async () => {
      const tools = ['Bash', 'Read', 'Edit'];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { tools }),
        capture(officialQuery, 'test', { tools }),
      ]);

      expect(hasFlag(open.args, '--tools')).toBe(true);
      expect(hasFlag(official.args, '--tools')).toBe(true);

      expect(argValue(open.args, '--tools')).toBe(argValue(official.args, '--tools'));

      console.log('   tools string array args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'tools empty array args match official SDK',
    async () => {
      const tools: string[] = [];
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { tools }),
        capture(officialQuery, 'test', { tools }),
      ]);

      expect(hasFlag(open.args, '--tools')).toBe(true);
      expect(hasFlag(official.args, '--tools')).toBe(true);

      expect(argValue(open.args, '--tools')).toBe('');
      expect(argValue(official.args, '--tools')).toBe('');

      console.log('   tools empty array args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'tools preset args match official SDK',
    async () => {
      const tools = { type: 'preset' as const, preset: 'claude_code' as const };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { tools }),
        capture(officialQuery, 'test', { tools }),
      ]);

      expect(hasFlag(open.args, '--tools')).toBe(true);
      expect(hasFlag(official.args, '--tools')).toBe(true);

      expect(argValue(open.args, '--tools')).toBe(argValue(official.args, '--tools'));

      console.log('   tools preset args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'permissionPromptToolName args match official SDK',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { permissionPromptToolName: 'my-tool' }),
        capture(officialQuery, 'test', { permissionPromptToolName: 'my-tool' }),
      ]);

      expect(open.args).toContain('--permission-prompt-tool=my-tool');
      expect(official.args).toContain('--permission-prompt-tool=my-tool');

      console.log('   permissionPromptToolName args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'extraArgs pass-through matches official SDK',
    async () => {
      const extraArgs = { 'custom-flag': 'value1', 'bool-flag': null };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { extraArgs }),
        capture(officialQuery, 'test', { extraArgs }),
      ]);

      expect(open.args).toContain('--custom-flag');
      expect(open.args).toContain('value1');
      expect(open.args).toContain('--bool-flag');
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
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { sandbox, extraArgs }),
        capture(officialQuery, 'test', { sandbox, extraArgs }),
      ]);

      // Both should have --settings (sandbox merged into extraArgs.settings)
      expect(hasFlag(open.args, '--settings')).toBe(true);
      expect(hasFlag(official.args, '--settings')).toBe(true);

      // Both should have --some-flag
      expect(open.args).toContain('--some-flag');
      expect(official.args).toContain('--some-flag');

      // Compare settings values
      const openSettings = JSON.parse(argValue(open.args, '--settings'));
      const officialSettings = JSON.parse(argValue(official.args, '--settings'));
      expect(openSettings.sandbox).toEqual(officialSettings.sandbox);

      console.log('   sandbox + extraArgs merged correctly');
    },
    { timeout: 60000 }
  );
});
