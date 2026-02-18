/**
 * Session storage integration tests
 *
 * Tests the storage API for managing Claude Code sessions on disk.
 * Creates temp directories with fixture JSONL files to test all 5 functions.
 */

import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { mkdtemp, rm, readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getProjectStoragePath,
  listSessions,
  getSessionMetadata,
  renameSession,
  deleteSession,
} from '../../src/storage-entry.ts';
import { encodePath } from '../../src/storage/paths.ts';

// ============================================================================
// Path Encoding
// ============================================================================

describe('getProjectStoragePath / encodePath', () => {
  test('encodes path by replacing non-alphanumeric with dashes', () => {
    expect(encodePath('/Users/foo/my-project')).toBe('-Users-foo-my-project');
  });

  test('handles deep paths', () => {
    expect(encodePath('/home/user/code/org/repo')).toBe('-home-user-code-org-repo');
  });

  test('getProjectStoragePath returns full path under ~/.claude/projects/', () => {
    const result = getProjectStoragePath('/Users/foo/bar');
    expect(result).toContain('.claude/projects/-Users-foo-bar');
  });
});

// ============================================================================
// Fixture Helpers
// ============================================================================

const SESSION_ID_1 = '00000000-0000-4000-8000-000000000001';
const SESSION_ID_2 = '00000000-0000-4000-8000-000000000002';
const SESSION_ID_3 = '00000000-0000-4000-8000-000000000003';

function makeUserEntry(text: string, extra: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: 'user',
    sessionId: SESSION_ID_1,
    message: { role: 'user', content: [{ type: 'text', text }] },
    uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...extra,
  });
}

function makeAssistantEntry(text: string, model = 'claude-sonnet-4-5-20250929') {
  return JSON.stringify({
    type: 'assistant',
    sessionId: SESSION_ID_1,
    message: {
      role: 'assistant',
      model,
      content: [{ type: 'text', text }],
      usage: { input_tokens: 100, output_tokens: 50, cache_read_input_tokens: 200 },
    },
    uuid: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
  });
}

function makeCustomTitleEntry(title: string, sessionId: string) {
  return JSON.stringify({
    type: 'custom-title',
    customTitle: title,
    sessionId,
  });
}

// ============================================================================
// Test Suite with Temp Directory
// ============================================================================

describe('storage API', () => {
  // We create a fake project path and manually place JSONL files
  // in the expected storage location (~/.claude/projects/{encoded-path}/)
  let tempDir: string;
  let projectPath: string;
  let storagePath: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'storage-test-'));
    // We use a unique project path so getProjectStoragePath resolves to a known location
    // But since getProjectStoragePath uses ~/.claude/projects/, we'll work directly
    // with a temp storage dir and test the functions that take storagePath.
    // Instead, let's create the structure that matches what getProjectStoragePath returns.
    projectPath = join(tempDir, 'fake-project');
    storagePath = getProjectStoragePath(projectPath);
    await mkdir(storagePath, { recursive: true });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
    // Also clean up the storage dir we created under ~/.claude/projects/
    await rm(storagePath, { recursive: true, force: true });
  });

  // --------------------------------------------------------------------------
  // listSessions
  // --------------------------------------------------------------------------

  describe('listSessions', () => {
    test('returns empty array for project with no sessions', async () => {
      const sessions = await listSessions(projectPath);
      expect(sessions).toEqual([]);
    });

    test('returns empty array for non-existent project', async () => {
      const sessions = await listSessions('/non/existent/path');
      expect(sessions).toEqual([]);
    });

    test('lists sessions from JSONL files', async () => {
      const content = [
        makeUserEntry('Hello, help me with tests'),
        makeAssistantEntry('Sure, I can help!'),
      ].join('\n');

      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const sessions = await listSessions(projectPath);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].sessionId).toBe(SESSION_ID_1);
      expect(sessions[0].displayName).toBe('Hello, help me with tests');
      expect(sessions[0].messageCount).toBe(2);
      expect(sessions[0].createdAt).toBeInstanceOf(Date);
      expect(sessions[0].lastModifiedAt).toBeInstanceOf(Date);
    });

    test('ignores non-UUID filenames', async () => {
      await writeFile(join(storagePath, 'sessions-index.json'), '{}');
      await writeFile(join(storagePath, 'not-a-uuid.jsonl'), '{}');
      await writeFile(
        join(storagePath, `${SESSION_ID_1}.jsonl`),
        makeUserEntry('test'),
      );

      const sessions = await listSessions(projectPath);
      expect(sessions).toHaveLength(1);
    });

    test('uses customTitle for displayName when present', async () => {
      const content = [
        makeUserEntry('original prompt'),
        makeCustomTitleEntry('My Custom Name', SESSION_ID_1),
      ].join('\n');

      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const sessions = await listSessions(projectPath);
      expect(sessions[0].displayName).toBe('My Custom Name');
    });

    test('uses slug for displayName when no customTitle or prompt', async () => {
      const content = JSON.stringify({
        type: 'user',
        sessionId: SESSION_ID_1,
        slug: 'sunny-coding-turtle',
        message: { role: 'user', content: [{ type: 'tool_result', content: 'result' }] },
        uuid: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      });

      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const sessions = await listSessions(projectPath);
      expect(sessions[0].displayName).toBe('sunny-coding-turtle');
    });

    test('falls back to session ID prefix', async () => {
      // Entry with no text prompt, no slug, no custom title
      const content = JSON.stringify({
        type: 'queue-operation',
        operation: 'dequeue',
        timestamp: new Date().toISOString(),
        sessionId: SESSION_ID_1,
      });

      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const sessions = await listSessions(projectPath);
      expect(sessions[0].displayName).toBe(SESSION_ID_1.slice(0, 8));
    });

    test('sorts by lastModifiedAt descending', async () => {
      await writeFile(
        join(storagePath, `${SESSION_ID_1}.jsonl`),
        makeUserEntry('first'),
      );
      // Small delay to ensure different mtime
      await new Promise((r) => setTimeout(r, 50));
      await writeFile(
        join(storagePath, `${SESSION_ID_2}.jsonl`),
        makeUserEntry('second'),
      );

      const sessions = await listSessions(projectPath);
      expect(sessions).toHaveLength(2);
      expect(sessions[0].sessionId).toBe(SESSION_ID_2);
      expect(sessions[1].sessionId).toBe(SESSION_ID_1);
    });
  });

  // --------------------------------------------------------------------------
  // getSessionMetadata
  // --------------------------------------------------------------------------

  describe('getSessionMetadata', () => {
    test('extracts full metadata from session', async () => {
      const content = [
        makeUserEntry('Build me a web app', { gitBranch: 'feat/web', slug: 'happy-building-otter' }),
        makeAssistantEntry('I will build a web app for you', 'claude-opus-4-6'),
        makeAssistantEntry('Here is the code'),
        makeCustomTitleEntry('Web App Project', SESSION_ID_1),
      ].join('\n');

      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const meta = await getSessionMetadata(SESSION_ID_1, projectPath);
      expect(meta.sessionId).toBe(SESSION_ID_1);
      expect(meta.displayName).toBe('Web App Project');
      expect(meta.firstPrompt).toBe('Build me a web app');
      expect(meta.slug).toBe('happy-building-otter');
      expect(meta.customTitle).toBe('Web App Project');
      expect(meta.model).toBe('claude-opus-4-6');
      expect(meta.gitBranch).toBe('feat/web');
      expect(meta.messageCount).toBe(4);
      expect(meta.totalCost).toBeGreaterThan(0);
      expect(meta.isAgent).toBe(false);
    });

    test('throws for invalid session ID', async () => {
      expect(getSessionMetadata('not-a-uuid', projectPath)).rejects.toThrow('Invalid session ID');
    });

    test('throws for non-existent session', async () => {
      expect(getSessionMetadata(SESSION_ID_1, projectPath)).rejects.toThrow();
    });

    test('handles agent sessions', async () => {
      const content = [
        JSON.stringify({ type: 'system', agentName: 'code-reviewer', sessionId: SESSION_ID_1 }),
        makeUserEntry('Review this code'),
      ].join('\n');

      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const meta = await getSessionMetadata(SESSION_ID_1, projectPath);
      expect(meta.isAgent).toBe(true);
      expect(meta.agentName).toBe('code-reviewer');
      expect(meta.displayName).toBe('code-reviewer');
    });

    test('totalCost is undefined when no assistant messages', async () => {
      const content = makeUserEntry('hello');
      await writeFile(join(storagePath, `${SESSION_ID_1}.jsonl`), content);

      const meta = await getSessionMetadata(SESSION_ID_1, projectPath);
      expect(meta.totalCost).toBeUndefined();
    });
  });

  // --------------------------------------------------------------------------
  // renameSession
  // --------------------------------------------------------------------------

  describe('renameSession', () => {
    test('appends custom-title entry to JSONL', async () => {
      await writeFile(
        join(storagePath, `${SESSION_ID_1}.jsonl`),
        makeUserEntry('original'),
      );

      await renameSession(SESSION_ID_1, 'New Name', projectPath);

      const content = await readFile(join(storagePath, `${SESSION_ID_1}.jsonl`), 'utf8');
      const lines = content.split('\n').filter(Boolean);
      const lastEntry = JSON.parse(lines[lines.length - 1]);
      expect(lastEntry.type).toBe('custom-title');
      expect(lastEntry.customTitle).toBe('New Name');
      expect(lastEntry.sessionId).toBe(SESSION_ID_1);
    });

    test('renamed session shows new name in listSessions', async () => {
      await writeFile(
        join(storagePath, `${SESSION_ID_1}.jsonl`),
        makeUserEntry('original prompt'),
      );

      await renameSession(SESSION_ID_1, 'Renamed Session', projectPath);

      const sessions = await listSessions(projectPath);
      expect(sessions[0].displayName).toBe('Renamed Session');
    });

    test('throws for invalid session ID', async () => {
      expect(renameSession('bad', 'name', projectPath)).rejects.toThrow('Invalid session ID');
    });

    test('throws for non-existent session', async () => {
      expect(renameSession(SESSION_ID_1, 'name', projectPath)).rejects.toThrow();
    });
  });

  // --------------------------------------------------------------------------
  // deleteSession
  // --------------------------------------------------------------------------

  describe('deleteSession', () => {
    test('removes JSONL file', async () => {
      await writeFile(
        join(storagePath, `${SESSION_ID_1}.jsonl`),
        makeUserEntry('to delete'),
      );

      await deleteSession(SESSION_ID_1, projectPath);

      const files = await readdir(storagePath);
      expect(files).not.toContain(`${SESSION_ID_1}.jsonl`);
    });

    test('removes companion directory', async () => {
      await writeFile(
        join(storagePath, `${SESSION_ID_1}.jsonl`),
        makeUserEntry('to delete'),
      );
      const companionDir = join(storagePath, SESSION_ID_1);
      await mkdir(join(companionDir, 'subagents'), { recursive: true });
      await writeFile(join(companionDir, 'subagents', 'sub.jsonl'), '{}');

      await deleteSession(SESSION_ID_1, projectPath);

      const files = await readdir(storagePath);
      expect(files).not.toContain(SESSION_ID_1);
      expect(files).not.toContain(`${SESSION_ID_1}.jsonl`);
    });

    test('throws for invalid session ID', async () => {
      expect(deleteSession('bad', projectPath)).rejects.toThrow('Invalid session ID');
    });

    test('throws for non-existent session', async () => {
      expect(deleteSession(SESSION_ID_1, projectPath)).rejects.toThrow();
    });
  });
});

// ============================================================================
// Real Session Smoke Test (optional, skipped if no real sessions exist)
// ============================================================================

describe('real sessions (smoke test)', () => {
  test('can list real sessions for this project', async () => {
    const projectPath = join(import.meta.dir, '../..');
    const sessions = await listSessions(projectPath);
    // This project should have sessions since we're developing it with Claude Code
    if (sessions.length > 0) {
      expect(sessions[0].sessionId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(sessions[0].displayName).toBeTruthy();
      expect(sessions[0].messageCount).toBeGreaterThan(0);

      // Also test metadata on first session
      const meta = await getSessionMetadata(sessions[0].sessionId, projectPath);
      expect(meta.sessionId).toBe(sessions[0].sessionId);
      expect(meta.messageCount).toBeGreaterThan(0);
    }
  });
});
