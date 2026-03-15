/**
 * Integration tests for session utility functions (v0.2.74-76)
 *
 * Tests: forkSession, renameSession, tagSession, getSessionInfo
 * These are standalone functions that read/write session JSONL files.
 * Each test creates a real session via query(), then exercises the utility.
 */

import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  forkSession as officialForkSession,
  getSessionInfo as officialGetSessionInfo,
  renameSession as officialRenameSession,
} from '@anthropic-ai/claude-agent-sdk';
import {
  forkSession as openForkSession,
  getSessionInfo as openGetSessionInfo,
  renameSession as openRenameSession,
  tagSession as openTagSession,
} from '../../src/index.ts';
import { listSessions as openListSessions } from '../../src/sessions/listSessions.ts';
import { runWithSDK } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

// Helper to create a session in a temp dir and return its ID
async function createSession(tempCwd: string, prompt = 'Say "hello" and nothing else.') {
  const messages = await runWithSDK('open', prompt, {
    maxTurns: 1,
    permissionMode: 'default',
    cwd: tempCwd,
  });
  return expectSuccessResult(messages).session_id;
}

// ============================================================================
// renameSession
// ============================================================================

describe('renameSession', () => {
  test.concurrent(
    'renames a session and both SDKs see the new title',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-rename-`);
      const sessionId = await createSession(tempCwd);
      const newTitle = `Renamed_${Date.now()}`;

      // Rename using open SDK
      await openRenameSession(sessionId, newTitle, { dir: tempCwd });

      // Both SDKs should see the new title
      const [openInfo, officialInfo] = await Promise.all([
        openGetSessionInfo(sessionId, { dir: tempCwd }),
        officialGetSessionInfo(sessionId, { dir: tempCwd }),
      ]);

      expect(openInfo).toBeDefined();
      expect(officialInfo).toBeDefined();
      expect(openInfo?.customTitle).toBe(newTitle);
      expect(officialInfo?.customTitle).toBe(newTitle);

      console.log(`   renameSession — title set to "${newTitle}"`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'official renameSession produces same result as open SDK',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-rename-official-`);
      const sessionId = await createSession(tempCwd);
      const newTitle = `OfficialRenamed_${Date.now()}`;

      // Rename using official SDK
      await officialRenameSession(sessionId, newTitle, { dir: tempCwd });

      // Both SDKs should see it
      const [openInfo, officialInfo] = await Promise.all([
        openGetSessionInfo(sessionId, { dir: tempCwd }),
        officialGetSessionInfo(sessionId, { dir: tempCwd }),
      ]);

      expect(openInfo?.customTitle).toBe(newTitle);
      expect(officialInfo?.customTitle).toBe(newTitle);

      console.log(`   official renameSession — both SDKs see "${newTitle}"`);
    },
    { timeout: 90000 }
  );
});

// ============================================================================
// tagSession
// ============================================================================

describe('tagSession', () => {
  test.concurrent(
    'tags a session and both SDKs see the tag',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-tag-`);
      const sessionId = await createSession(tempCwd);
      const tag = `tag_${Date.now()}`;

      // Tag using open SDK
      await openTagSession(sessionId, tag, { dir: tempCwd });

      // Both should see the tag
      const [openInfo, officialInfo] = await Promise.all([
        openGetSessionInfo(sessionId, { dir: tempCwd }),
        officialGetSessionInfo(sessionId, { dir: tempCwd }),
      ]);

      expect(openInfo?.tag).toBe(tag);
      expect(officialInfo?.tag).toBe(tag);

      console.log(`   tagSession — tag set to "${tag}"`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'clears a tag with null',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-tag-clear-`);
      const sessionId = await createSession(tempCwd);

      // Set a tag, then clear it
      await openTagSession(sessionId, 'temp-tag', { dir: tempCwd });
      await openTagSession(sessionId, null, { dir: tempCwd });

      const info = await openGetSessionInfo(sessionId, { dir: tempCwd });
      // After clearing, tag should be null/undefined
      expect(info?.tag).toBeFalsy();

      console.log('   tagSession — cleared tag with null');
    },
    { timeout: 90000 }
  );
});

// ============================================================================
// getSessionInfo
// ============================================================================

describe('getSessionInfo', () => {
  test.concurrent(
    'returns info matching between open and official SDK',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-info-`);
      const sessionId = await createSession(tempCwd);

      const [openInfo, officialInfo] = await Promise.all([
        openGetSessionInfo(sessionId, { dir: tempCwd }),
        officialGetSessionInfo(sessionId, { dir: tempCwd }),
      ]);

      expect(openInfo).toBeDefined();
      expect(officialInfo).toBeDefined();

      // Core fields must match
      expect(openInfo?.sessionId).toBe(officialInfo?.sessionId);
      expect(openInfo?.sessionId).toBe(sessionId);

      // Both should have non-empty summary
      expect(openInfo?.summary?.length).toBeGreaterThan(0);
      expect(officialInfo?.summary?.length).toBeGreaterThan(0);

      // Both should have lastModified
      expect(openInfo?.lastModified).toBeGreaterThan(0);
      expect(officialInfo?.lastModified).toBeGreaterThan(0);

      console.log(`   getSessionInfo — matching results for ${sessionId}`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'returns undefined for non-existent session',
    async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-info-missing-`);

      const [openInfo, officialInfo] = await Promise.all([
        openGetSessionInfo(fakeId, { dir: tempCwd }),
        officialGetSessionInfo(fakeId, { dir: tempCwd }),
      ]);

      expect(openInfo).toBeUndefined();
      expect(officialInfo).toBeUndefined();

      console.log('   getSessionInfo — undefined for missing session');
    },
    { timeout: 10000 }
  );
});

// ============================================================================
// forkSession
// ============================================================================

describe('forkSession', () => {
  test.concurrent(
    'forks a session and returns a new session ID',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-fork-fn-`);
      const sessionId = await createSession(tempCwd);

      // Fork using open SDK re-export
      const result = await openForkSession(sessionId, { dir: tempCwd });

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).not.toBe(sessionId);

      // New session should be listable
      const sessions = await openListSessions({ dir: tempCwd });
      const forked = sessions.find((s) => s.sessionId === result.sessionId);
      expect(forked).toBeDefined();

      console.log(`   forkSession — new session ${result.sessionId}`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'official forkSession produces same result structure',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-fork-official-`);
      const sessionId = await createSession(tempCwd);

      // Fork using official SDK
      const result = await officialForkSession(sessionId, { dir: tempCwd });

      expect(result).toBeDefined();
      expect(result.sessionId).toBeDefined();
      expect(result.sessionId).not.toBe(sessionId);

      // Should be findable by both SDKs
      const [openInfo, officialInfo] = await Promise.all([
        openGetSessionInfo(result.sessionId, { dir: tempCwd }),
        officialGetSessionInfo(result.sessionId, { dir: tempCwd }),
      ]);

      expect(openInfo).toBeDefined();
      expect(officialInfo).toBeDefined();

      console.log(`   official forkSession — new session ${result.sessionId}`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'forkSession with custom title',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-fork-title-`);
      const sessionId = await createSession(tempCwd);
      const forkTitle = `Fork_${Date.now()}`;

      const result = await openForkSession(sessionId, {
        dir: tempCwd,
        title: forkTitle,
      });

      const info = await openGetSessionInfo(result.sessionId, { dir: tempCwd });
      expect(info?.customTitle).toBe(forkTitle);

      console.log(`   forkSession — custom title "${forkTitle}"`);
    },
    { timeout: 90000 }
  );
});
