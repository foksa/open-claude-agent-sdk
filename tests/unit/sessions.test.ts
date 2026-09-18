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
import { getSessionMessages as officialGetSessionMessages } from '@anthropic-ai/claude-agent-sdk';
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
    expect(messages[0].parent_agent_id).toBeNull();
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

describe('getSessionMessages queued commands (v0.3.276)', () => {
  const QUEUED_SESSION_ID = '33333333-3333-3333-3333-333333333333';
  const QUEUED_FILE = join(STORAGE_DIR, `${QUEUED_SESSION_ID}.jsonl`);
  const base = { sessionId: QUEUED_SESSION_ID, timestamp: '2026-09-18T00:00:00.000Z' };
  const toolUse = { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'sleep 5' } };
  const toolResult = { type: 'tool_result', tool_use_id: 'toolu_1', content: 'done' };

  async function readBoth() {
    const [open, official] = await Promise.all([
      getSessionMessages(QUEUED_SESSION_ID, { dir: TEST_PROJECT }),
      officialGetSessionMessages(QUEUED_SESSION_ID, { dir: TEST_PROJECT }),
    ]);
    return { open, official };
  }

  test('surfaces a message sent while a tool ran, matching official SDK', async () => {
    await writeFile(
      QUEUED_FILE,
      jsonl(
        { ...base, type: 'user', uuid: 'u1', message: { role: 'user', content: 'Run it' } },
        {
          ...base,
          type: 'assistant',
          uuid: 'a1',
          parentUuid: 'u1',
          message: { id: 'msg_1', role: 'assistant', content: [toolUse] },
        },
        {
          ...base,
          type: 'user',
          uuid: 'tr1',
          parentUuid: 'a1',
          message: { role: 'user', content: [toolResult] },
        },
        {
          ...base,
          type: 'attachment',
          uuid: 'att1',
          parentUuid: 'tr1',
          attachment: { type: 'queued_command', prompt: 'Also check logs', source_uuid: 'sent-1' },
        },
        {
          ...base,
          type: 'attachment',
          uuid: 'att2',
          parentUuid: 'att1',
          attachment: {
            type: 'queued_command',
            prompt: '<task-notification>done</task-notification>',
            commandMode: 'task-notification',
          },
        },
        {
          ...base,
          type: 'assistant',
          uuid: 'a2',
          parentUuid: 'att2',
          message: { id: 'msg_2', role: 'assistant', content: [{ type: 'text', text: 'OK' }] },
        }
      )
    );

    const { open, official } = await readBoth();
    expect(open.map((m) => m.uuid)).toEqual(['u1', 'a1', 'tr1', 'sent-1', 'att2', 'a2']);
    const queued = open.find((m) => m.uuid === 'sent-1') as Record<string, unknown>;
    expect(queued.type).toBe('user');
    expect(queued.isQueuedCommand).toBe(true);
    expect(queued.message).toEqual({ role: 'user', content: 'Also check logs' });
    const notification = open.find((m) => m.uuid === 'att2') as Record<string, unknown>;
    expect(notification.origin).toEqual({ kind: 'task-notification' });
    expect(open).toEqual(official);
  });

  test('leaves a queued message Claude never read out, matching official SDK', async () => {
    await writeFile(
      QUEUED_FILE,
      jsonl(
        { ...base, type: 'user', uuid: 'u1', message: { role: 'user', content: 'Hi' } },
        {
          ...base,
          type: 'assistant',
          uuid: 'a1',
          parentUuid: 'u1',
          message: { id: 'msg_1', role: 'assistant', content: [{ type: 'text', text: 'Hello' }] },
        },
        {
          ...base,
          type: 'attachment',
          uuid: 'att1',
          parentUuid: 'a1',
          attachment: { type: 'queued_command', prompt: 'unread' },
        },
        {
          ...base,
          type: 'user',
          uuid: 'u2',
          parentUuid: 'att1',
          message: { role: 'user', content: 'Next prompt' },
        }
      )
    );

    const { open, official } = await readBoth();
    expect(open.map((m) => m.uuid)).toEqual(['u1', 'a1', 'u2']);
    expect(open).toEqual(official);
  });
});

describe('getSessionMessages chain reconstruction parity', () => {
  const PARITY_SESSION_ID = '44444444-4444-4444-4444-444444444444';
  const PARITY_FILE = join(STORAGE_DIR, `${PARITY_SESSION_ID}.jsonl`);
  const at = (n: number) => ({
    sessionId: PARITY_SESSION_ID,
    timestamp: `2026-09-18T00:00:0${n}.000Z`,
  });
  const user = (uuid: string, parentUuid: string | undefined, content: unknown, n: number) => ({
    ...at(n),
    type: 'user',
    uuid,
    ...(parentUuid && { parentUuid }),
    message: { role: 'user', content },
  });
  const assistant = (
    uuid: string,
    parentUuid: string,
    id: string,
    content: unknown[],
    n: number
  ) => ({
    ...at(n),
    type: 'assistant',
    uuid,
    parentUuid,
    message: { id, role: 'assistant', content },
  });
  const toolUse = (id: string) => ({
    type: 'tool_use',
    id,
    name: 'Read',
    input: { file_path: id },
  });
  const toolResult = (id: string) => [{ type: 'tool_result', tool_use_id: id, content: 'ok' }];

  async function readBoth() {
    const [open, official] = await Promise.all([
      getSessionMessages(PARITY_SESSION_ID, { dir: TEST_PROJECT }),
      officialGetSessionMessages(PARITY_SESSION_ID, { dir: TEST_PROJECT }),
    ]);
    return { open, official };
  }

  test('keeps every parallel tool call and its result, matching official SDK', async () => {
    // Two tool_use blocks of one API message (msg_1) are written as sibling
    // entries; the second chains off the first's tool result.
    await writeFile(
      PARITY_FILE,
      jsonl(
        user('u1', undefined, 'Read both files', 0),
        assistant('a1', 'u1', 'msg_1', [toolUse('t1')], 1),
        assistant('a1b', 'a1', 'msg_1', [toolUse('t2')], 2),
        user('r1', 'a1', toolResult('t1'), 3),
        user('r2', 'a1b', toolResult('t2'), 4),
        assistant('a2', 'r2', 'msg_2', [{ type: 'text', text: 'Done' }], 5)
      )
    );

    const { open, official } = await readBoth();
    expect(official.map((m) => m.uuid)).toContain('r1');
    expect(open.map((m) => m.uuid)).toEqual(official.map((m) => m.uuid));
    expect(open).toEqual(official);
  });

  test('walks through messages preserved by compaction, matching official SDK', async () => {
    await writeFile(
      PARITY_FILE,
      jsonl(
        user('u1', undefined, 'Old question', 0),
        assistant('a1', 'u1', 'msg_1', [{ type: 'text', text: 'Old answer' }], 1),
        {
          ...at(2),
          type: 'system',
          subtype: 'compact_boundary',
          uuid: 'cb',
          compactMetadata: { preservedMessages: { uuids: ['u1', 'a1'], anchorUuid: 'summary' } },
        },
        { ...user('summary', 'cb', 'Summary of earlier conversation', 3), isCompactSummary: true },
        user('u2', 'summary', 'New question', 4),
        assistant('a2', 'u2', 'msg_2', [{ type: 'text', text: 'New answer' }], 5)
      )
    );

    const { open, official } = await readBoth();
    expect(official.map((m) => m.uuid)).toContain('u1');
    expect(open).toEqual(official);
  });

  test('walks through a preserved compaction segment, matching official SDK', async () => {
    await writeFile(
      PARITY_FILE,
      jsonl(
        user('u1', undefined, 'Old question', 0),
        assistant('a1', 'u1', 'msg_1', [{ type: 'text', text: 'Old answer' }], 1),
        {
          ...at(2),
          type: 'system',
          subtype: 'compact_boundary',
          uuid: 'cb',
          compactMetadata: {
            preservedSegment: { headUuid: 'u1', anchorUuid: 'summary', tailUuid: 'a1' },
          },
        },
        { ...user('summary', 'cb', 'Summary of earlier conversation', 3), isCompactSummary: true },
        user('u2', 'summary', 'New question', 4),
        assistant('a2', 'u2', 'msg_2', [{ type: 'text', text: 'New answer' }], 5)
      )
    );

    const { open, official } = await readBoth();
    expect(official.map((m) => m.uuid)).toContain('u1');
    expect(open).toEqual(official);
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
