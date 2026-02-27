/**
 * Unit tests for session functions (listSessions, getSessionMessages).
 *
 * Tests the conversation chain building and pagination logic using
 * temporary JSONL files on disk.
 */

import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { getSessionMessages } from '../../src/sessions/getSessionMessages.ts';
import { listSessions } from '../../src/sessions/listSessions.ts';

/**
 * Test fixtures: temporary session files in a fake project directory.
 */
const TEST_PROJECT = '/tmp/open-sdk-test-sessions-project';
const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
const STORAGE_BASE = join(CONFIG_DIR, 'projects');
const STORAGE_DIR = join(STORAGE_BASE, TEST_PROJECT.replace(/[^a-zA-Z0-9]/g, '-'));

const SESSION_ID = '11111111-1111-1111-1111-111111111111';
const SESSION_FILE = join(STORAGE_DIR, `${SESSION_ID}.jsonl`);

function jsonl(...entries: object[]): string {
  return entries.map((e) => JSON.stringify(e)).join('\n');
}

beforeAll(async () => {
  await mkdir(STORAGE_DIR, { recursive: true });
});

afterAll(async () => {
  await rm(STORAGE_DIR, { recursive: true, force: true });
});

describe('getSessionMessages', () => {
  test('returns empty for invalid session ID', async () => {
    const result = await getSessionMessages('not-a-uuid');
    expect(result).toEqual([]);
  });

  test('returns empty for non-existent session', async () => {
    const result = await getSessionMessages('22222222-2222-2222-2222-222222222222');
    expect(result).toEqual([]);
  });

  test('parses simple linear conversation', async () => {
    const content = jsonl(
      {
        type: 'system',
        uuid: 'sys-1',
        sessionId: SESSION_ID,
        message: { role: 'system' },
      },
      {
        type: 'user',
        uuid: 'user-1',
        parentUuid: 'sys-1',
        sessionId: SESSION_ID,
        message: { role: 'user', content: 'Hello' },
      },
      {
        type: 'assistant',
        uuid: 'asst-1',
        parentUuid: 'user-1',
        sessionId: SESSION_ID,
        message: { role: 'assistant', content: 'Hi there!' },
      }
    );
    await writeFile(SESSION_FILE, content);

    const messages = await getSessionMessages(SESSION_ID, { dir: TEST_PROJECT });
    expect(messages.length).toBe(2);
    expect(messages[0].type).toBe('user');
    expect(messages[0].uuid).toBe('user-1');
    expect(messages[1].type).toBe('assistant');
    expect(messages[1].uuid).toBe('asst-1');
    expect(messages[0].parent_tool_use_id).toBeNull();
    expect(messages[0].session_id).toBe(SESSION_ID);
  });

  test('applies pagination with limit and offset', async () => {
    const content = jsonl(
      {
        type: 'user',
        uuid: 'u1',
        sessionId: SESSION_ID,
        message: { role: 'user', content: 'First' },
      },
      {
        type: 'assistant',
        uuid: 'a1',
        parentUuid: 'u1',
        sessionId: SESSION_ID,
        message: { role: 'assistant', content: 'Reply 1' },
      },
      {
        type: 'user',
        uuid: 'u2',
        parentUuid: 'a1',
        sessionId: SESSION_ID,
        message: { role: 'user', content: 'Second' },
      },
      {
        type: 'assistant',
        uuid: 'a2',
        parentUuid: 'u2',
        sessionId: SESSION_ID,
        message: { role: 'assistant', content: 'Reply 2' },
      }
    );
    await writeFile(SESSION_FILE, content);

    // With limit
    const limited = await getSessionMessages(SESSION_ID, { dir: TEST_PROJECT, limit: 2 });
    expect(limited.length).toBe(2);
    expect(limited[0].uuid).toBe('u1');
    expect(limited[1].uuid).toBe('a1');

    // With offset
    const offset = await getSessionMessages(SESSION_ID, { dir: TEST_PROJECT, offset: 2 });
    expect(offset.length).toBe(2);
    expect(offset[0].uuid).toBe('u2');

    // With both
    const both = await getSessionMessages(SESSION_ID, {
      dir: TEST_PROJECT,
      limit: 1,
      offset: 1,
    });
    expect(both.length).toBe(1);
    expect(both[0].uuid).toBe('a1');
  });

  test('skips sidechain and meta messages', async () => {
    const content = jsonl(
      {
        type: 'user',
        uuid: 'u1',
        sessionId: SESSION_ID,
        message: { role: 'user', content: 'Main' },
      },
      {
        type: 'assistant',
        uuid: 'a1',
        parentUuid: 'u1',
        sessionId: SESSION_ID,
        message: { role: 'assistant', content: 'Main reply' },
      },
      {
        type: 'user',
        uuid: 'side-u1',
        parentUuid: 'a1',
        sessionId: SESSION_ID,
        isSidechain: true,
        message: { role: 'user', content: 'Sidechain' },
      },
      {
        type: 'user',
        uuid: 'u2',
        parentUuid: 'a1',
        sessionId: SESSION_ID,
        message: { role: 'user', content: 'Continue' },
      },
      {
        type: 'assistant',
        uuid: 'a2',
        parentUuid: 'u2',
        sessionId: SESSION_ID,
        message: { role: 'assistant', content: 'Continue reply' },
      }
    );
    await writeFile(SESSION_FILE, content);

    const messages = await getSessionMessages(SESSION_ID, { dir: TEST_PROJECT });
    const uuids = messages.map((m) => m.uuid);
    expect(uuids).not.toContain('side-u1');
    expect(uuids).toContain('u1');
    expect(uuids).toContain('a2');
  });
});

describe('listSessions', () => {
  test('lists sessions for a project directory', async () => {
    const content = jsonl(
      {
        type: 'system',
        uuid: 'sys-1',
        sessionId: SESSION_ID,
        cwd: TEST_PROJECT,
      },
      {
        type: 'user',
        uuid: 'u1',
        parentUuid: 'sys-1',
        sessionId: SESSION_ID,
        message: { role: 'user', content: [{ type: 'text', text: 'Hello from test' }] },
      }
    );
    await writeFile(SESSION_FILE, content);

    const sessions = await listSessions({ dir: TEST_PROJECT });
    expect(sessions.length).toBeGreaterThanOrEqual(1);

    const found = sessions.find((s) => s.sessionId === SESSION_ID);
    expect(found).toBeDefined();
    expect(found?.sessionId).toBe(SESSION_ID);
    expect(found?.lastModified).toBeGreaterThan(0);
    expect(found?.fileSize).toBeGreaterThan(0);
  });

  test('returns empty for non-existent project', async () => {
    const sessions = await listSessions({ dir: '/tmp/non-existent-project-abc123' });
    expect(sessions).toEqual([]);
  });

  test('respects limit option', async () => {
    // Write two sessions
    const id2 = '22222222-2222-2222-2222-222222222222';
    const content1 = jsonl({
      type: 'user',
      uuid: 'u1',
      sessionId: SESSION_ID,
      message: { role: 'user', content: 'Session 1' },
    });
    const content2 = jsonl({
      type: 'user',
      uuid: 'u2',
      sessionId: id2,
      message: { role: 'user', content: 'Session 2' },
    });
    await writeFile(SESSION_FILE, content1);
    await writeFile(join(STORAGE_DIR, `${id2}.jsonl`), content2);

    const limited = await listSessions({ dir: TEST_PROJECT, limit: 1 });
    expect(limited.length).toBe(1);

    // Cleanup
    await rm(join(STORAGE_DIR, `${id2}.jsonl`), { force: true });
  });
});
