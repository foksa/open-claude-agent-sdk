/**
 * Integration tests for listSessions() and getSessionMessages()
 *
 * These test the SDK-compatible session APIs that read session JSONL files
 * from disk. Each test creates a real session via query(), then verifies
 * the session functions return correct data — comparing open vs official SDK.
 */

import { describe, expect, test } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import {
  getSessionMessages as officialGetSessionMessages,
  getSubagentMessages as officialGetSubagentMessages,
  listSessions as officialListSessions,
  listSubagents as officialListSubagents,
} from '@anthropic-ai/claude-agent-sdk';
import {
  getSubagentMessages as openGetSubagentMessages,
  listSubagents as openListSubagents,
} from '../../src/index.ts';
import { getSessionMessages as openGetSessionMessages } from '../../src/sessions/getSessionMessages.ts';
import { listSessions as openListSessions } from '../../src/sessions/listSessions.ts';
import { runWithSDK } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

// ============================================================================
// listSessions
// ============================================================================

describe('listSessions', () => {
  test.concurrent(
    'finds session created by open SDK query',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-list-open-`);
      const token = `LIST_OPEN_${Date.now()}`;

      const messages = await runWithSDK('open', `Say "${token}" and nothing else.`, {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      // Both our and official listSessions should find it
      const [openSessions, officialSessions] = await Promise.all([
        openListSessions({ dir: tempCwd }),
        officialListSessions({ dir: tempCwd }),
      ]);

      const openFound = openSessions.find((s) => s.sessionId === sessionId);
      const officialFound = officialSessions.find((s) => s.sessionId === sessionId);

      expect(openFound).toBeDefined();
      expect(officialFound).toBeDefined();
      expect(openFound?.sessionId).toBe(officialFound?.sessionId);

      console.log(`   listSessions found session ${sessionId} in both SDKs`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'both SDKs return matching session data',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-list-match-`);
      const token = `LIST_MATCH_${Date.now()}`;

      // Create session with open SDK (which persists to disk via graceful close)
      const messages = await runWithSDK('open', `Say "${token}" and nothing else.`, {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      // Both SDKs should find it on disk
      const [openSessions, officialSessions] = await Promise.all([
        openListSessions({ dir: tempCwd }),
        officialListSessions({ dir: tempCwd }),
      ]);

      const openFound = openSessions.find((s) => s.sessionId === sessionId);
      const officialFound = officialSessions.find((s) => s.sessionId === sessionId);

      expect(openFound).toBeDefined();
      expect(officialFound).toBeDefined();

      if (openFound && officialFound) {
        // Session IDs must match
        expect(openFound.sessionId).toBe(officialFound.sessionId);
        // File sizes should match (both read same file)
        expect(openFound.fileSize).toBe(officialFound.fileSize);
        // Both should have non-empty summary
        expect(openFound.summary.length).toBeGreaterThan(0);
        expect(officialFound.summary.length).toBeGreaterThan(0);
      }

      console.log(`   Both SDKs match for session ${sessionId}`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'returns empty for non-existent project',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-list-empty-`);

      const [openSessions, officialSessions] = await Promise.all([
        openListSessions({ dir: tempCwd }),
        officialListSessions({ dir: tempCwd }),
      ]);

      expect(openSessions).toEqual([]);
      expect(officialSessions).toEqual([]);
    },
    { timeout: 10000 }
  );

  test.concurrent(
    'respects limit option',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-list-limit-`);

      // Create two sessions
      const messages1 = await runWithSDK('open', 'Say "first"', {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      expectSuccessResult(messages1);

      const messages2 = await runWithSDK('open', 'Say "second"', {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      expectSuccessResult(messages2);

      const [openAll, officialAll] = await Promise.all([
        openListSessions({ dir: tempCwd }),
        officialListSessions({ dir: tempCwd }),
      ]);
      expect(openAll.length).toBeGreaterThanOrEqual(2);
      expect(officialAll.length).toBeGreaterThanOrEqual(2);

      const [openLimited, officialLimited] = await Promise.all([
        openListSessions({ dir: tempCwd, limit: 1 }),
        officialListSessions({ dir: tempCwd, limit: 1 }),
      ]);
      expect(openLimited.length).toBe(1);
      expect(officialLimited.length).toBe(1);

      console.log(`   listSessions limit works: ${openAll.length} total, 1 with limit`);
    },
    { timeout: 120000 }
  );

  test.concurrent(
    'session metadata fields match between SDKs',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-list-meta-`);
      const token = `META_${Date.now()}`;

      const messages = await runWithSDK('open', `Say "${token}" and nothing else.`, {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      const [openSessions, officialSessions] = await Promise.all([
        openListSessions({ dir: tempCwd }),
        officialListSessions({ dir: tempCwd }),
      ]);

      const openSession = openSessions.find((s) => s.sessionId === sessionId);
      const officialSession = officialSessions.find((s) => s.sessionId === sessionId);

      expect(openSession).toBeDefined();
      expect(officialSession).toBeDefined();

      if (openSession && officialSession) {
        // Core fields must match
        expect(openSession.sessionId).toBe(officialSession.sessionId);
        expect(openSession.fileSize).toBeGreaterThan(0);
        expect(officialSession.fileSize).toBeGreaterThan(0);
        expect(openSession.lastModified).toBeGreaterThan(0);
        expect(officialSession.lastModified).toBeGreaterThan(0);

        // Summary should be non-empty for both
        expect(openSession.summary.length).toBeGreaterThan(0);
        expect(officialSession.summary.length).toBeGreaterThan(0);

        console.log(`   Metadata match — open summary: "${openSession.summary}"`);
        console.log(`   Metadata match — official summary: "${officialSession.summary}"`);
      }
    },
    { timeout: 90000 }
  );
});

// ============================================================================
// getSessionMessages
// ============================================================================

describe('getSessionMessages', () => {
  test.concurrent(
    'reads messages from a session created by query',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-getmsg-`);
      const token = `GETMSG_${Date.now()}`;

      const messages = await runWithSDK('open', `Say "${token}" and nothing else.`, {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      const [openMessages, officialMessages] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd }),
        officialGetSessionMessages(sessionId, { dir: tempCwd }),
      ]);

      // Both should return messages
      expect(openMessages.length).toBeGreaterThan(0);
      expect(officialMessages.length).toBeGreaterThan(0);

      // Same number of messages
      expect(openMessages.length).toBe(officialMessages.length);

      // First message should be user type
      expect(openMessages[0].type).toBe('user');
      expect(officialMessages[0].type).toBe('user');

      // Should have at least one assistant message
      const openAssistant = openMessages.find((m) => m.type === 'assistant');
      const officialAssistant = officialMessages.find((m) => m.type === 'assistant');
      expect(openAssistant).toBeDefined();
      expect(officialAssistant).toBeDefined();

      // UUIDs should match
      for (let i = 0; i < openMessages.length; i++) {
        expect(openMessages[i].uuid).toBe(officialMessages[i].uuid);
        expect(openMessages[i].type).toBe(officialMessages[i].type);
      }

      console.log(`   getSessionMessages returned ${openMessages.length} messages from both SDKs`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'returns empty for invalid session ID',
    async () => {
      const [openMessages, officialMessages] = await Promise.all([
        openGetSessionMessages('not-a-uuid'),
        officialGetSessionMessages('not-a-uuid'),
      ]);

      expect(openMessages).toEqual([]);
      expect(officialMessages).toEqual([]);
    },
    { timeout: 10000 }
  );

  test.concurrent(
    'returns empty for non-existent session',
    async () => {
      const fakeId = '99999999-9999-9999-9999-999999999999';
      const [openMessages, officialMessages] = await Promise.all([
        openGetSessionMessages(fakeId),
        officialGetSessionMessages(fakeId),
      ]);

      expect(openMessages).toEqual([]);
      expect(officialMessages).toEqual([]);
    },
    { timeout: 10000 }
  );

  test.concurrent(
    'pagination with limit and offset matches official SDK',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-getmsg-page-`);

      // Create a multi-turn session for pagination
      const messages1 = await runWithSDK('open', 'Say "hello" and nothing else.', {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result1 = expectSuccessResult(messages1);
      const sessionId = result1.session_id;

      // Continue the session with a second turn
      const messages2 = await runWithSDK('open', 'Now say "world" and nothing else.', {
        maxTurns: 1,
        permissionMode: 'default',
        resume: sessionId,
        cwd: tempCwd,
      });
      expectSuccessResult(messages2);

      // Get all messages first
      const [openAll, officialAll] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd }),
        officialGetSessionMessages(sessionId, { dir: tempCwd }),
      ]);
      expect(openAll.length).toBe(officialAll.length);
      expect(openAll.length).toBeGreaterThanOrEqual(4); // at least 2 user + 2 assistant

      // Test limit
      const [openLimited, officialLimited] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd, limit: 2 }),
        officialGetSessionMessages(sessionId, { dir: tempCwd, limit: 2 }),
      ]);
      expect(openLimited.length).toBe(2);
      expect(officialLimited.length).toBe(2);
      expect(openLimited[0].uuid).toBe(officialLimited[0].uuid);

      // Test offset
      const [openOffset, officialOffset] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd, offset: 1 }),
        officialGetSessionMessages(sessionId, { dir: tempCwd, offset: 1 }),
      ]);
      expect(openOffset.length).toBe(officialOffset.length);
      expect(openOffset.length).toBe(openAll.length - 1);

      // Test limit + offset
      const [openBoth, officialBoth] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd, limit: 1, offset: 1 }),
        officialGetSessionMessages(sessionId, { dir: tempCwd, limit: 1, offset: 1 }),
      ]);
      expect(openBoth.length).toBe(1);
      expect(officialBoth.length).toBe(1);
      expect(openBoth[0].uuid).toBe(officialBoth[0].uuid);

      console.log(
        `   Pagination: ${openAll.length} total, limit=2 → ${openLimited.length}, offset=1 → ${openOffset.length}`
      );
    },
    { timeout: 120000 }
  );

  test.concurrent(
    'message content is accessible',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-getmsg-content-`);
      const token = `CONTENT_${Date.now()}`;

      const messages = await runWithSDK('open', `Say "${token}" and nothing else.`, {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      const [openMessages, officialMessages] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd }),
        officialGetSessionMessages(sessionId, { dir: tempCwd }),
      ]);

      // User message should contain the prompt
      const openUser = openMessages.find((m) => m.type === 'user');
      const officialUser = officialMessages.find((m) => m.type === 'user');
      expect(openUser).toBeDefined();
      expect(officialUser).toBeDefined();

      // All messages should have parent_tool_use_id: null
      for (const m of openMessages) {
        expect(m.parent_tool_use_id).toBeNull();
      }
      for (const m of officialMessages) {
        expect(m.parent_tool_use_id).toBeNull();
      }

      console.log(`   Message content accessible, ${openMessages.length} messages returned`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'includeSystemMessages returns more messages than without',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-getmsg-system-`);

      const messages = await runWithSDK('open', 'Say "hello" and nothing else.', {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      // Without includeSystemMessages (default)
      const [openWithout, officialWithout] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd }),
        officialGetSessionMessages(sessionId, { dir: tempCwd }),
      ]);

      // With includeSystemMessages
      const [openWith, officialWith] = await Promise.all([
        openGetSessionMessages(sessionId, { dir: tempCwd, includeSystemMessages: true }),
        officialGetSessionMessages(sessionId, { dir: tempCwd, includeSystemMessages: true }),
      ]);

      // Both SDKs should return same counts
      expect(openWithout.length).toBe(officialWithout.length);
      expect(openWith.length).toBe(officialWith.length);

      // With system messages should have >= messages than without
      expect(openWith.length).toBeGreaterThanOrEqual(openWithout.length);

      // If system messages exist, verify they have type 'system'
      const systemMessages = openWith.filter((m) => m.type === 'system');
      const extraCount = openWith.length - openWithout.length;
      expect(systemMessages.length).toBe(extraCount);

      console.log(
        `   includeSystemMessages: ${openWithout.length} without, ${openWith.length} with (${systemMessages.length} system)`
      );
    },
    { timeout: 90000 }
  );
});

// ============================================================================
// listSubagents / getSubagentMessages
// ============================================================================

/** Auto-approve all tool usage */
const autoApprove = async (_toolName: string, input: Record<string, unknown>) => {
  return { behavior: 'allow' as const, updatedInput: input };
};

describe('listSubagents and getSubagentMessages', () => {
  test.concurrent(
    'listSubagents returns empty for session without subagents',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-subagent-`);

      const messages = await runWithSDK('open', 'Say "hello" and nothing else.', {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      const [openSubagents, officialSubagents] = await Promise.all([
        openListSubagents(sessionId, { dir: tempCwd }),
        officialListSubagents(sessionId, { dir: tempCwd }),
      ]);

      expect(openSubagents).toEqual([]);
      expect(officialSubagents).toEqual([]);

      console.log(`   listSubagents: both SDKs returned [] for no-subagent session`);
    },
    { timeout: 90000 }
  );

  test.concurrent(
    'listSubagents finds subagent after session with subagent execution',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-subagent-list-`);

      // Create a session that spawns a subagent via Task tool
      const messages = await runWithSDK(
        'open',
        'Use the Task tool to have the echo-agent say "hello from subagent". You MUST use the Task tool with subagent_type "echo-agent".',
        {
          maxTurns: 10,
          permissionMode: 'default',
          canUseTool: autoApprove,
          allowedTools: ['Task'],
          cwd: tempCwd,
          agents: {
            'echo-agent': {
              description: 'A simple agent that echoes back whatever it receives',
              prompt: 'You are a simple echo agent. Reply with exactly what the user asked.',
            },
          },
        }
      );
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      // Verify subagent messages were emitted during the query
      const subagentMessages = messages.filter(
        (m) => 'parent_tool_use_id' in m && m.parent_tool_use_id
      );
      console.log(`   Subagent messages during query: ${subagentMessages.length}`);

      // Now use listSubagents to find the subagent
      const [openSubagents, officialSubagents] = await Promise.all([
        openListSubagents(sessionId, { dir: tempCwd }),
        officialListSubagents(sessionId, { dir: tempCwd }),
      ]);

      // Both should find the same subagents
      expect(openSubagents.length).toBe(officialSubagents.length);

      if (openSubagents.length > 0) {
        // Subagent IDs should match
        expect(openSubagents.sort()).toEqual(officialSubagents.sort());

        console.log(
          `   listSubagents: found ${openSubagents.length} subagent(s): ${openSubagents}`
        );

        // Now retrieve the subagent's messages
        const agentId = openSubagents[0];
        const [openAgentMsgs, officialAgentMsgs] = await Promise.all([
          openGetSubagentMessages(sessionId, agentId, { dir: tempCwd }),
          officialGetSubagentMessages(sessionId, agentId, { dir: tempCwd }),
        ]);

        expect(openAgentMsgs.length).toBe(officialAgentMsgs.length);
        expect(openAgentMsgs.length).toBeGreaterThan(0);

        // Message types should match
        for (let i = 0; i < openAgentMsgs.length; i++) {
          expect(openAgentMsgs[i].type).toBe(officialAgentMsgs[i].type);
          expect(openAgentMsgs[i].uuid).toBe(officialAgentMsgs[i].uuid);
        }

        console.log(
          `   getSubagentMessages: ${openAgentMsgs.length} messages from agent "${agentId}"`
        );
      } else {
        console.log(`   listSubagents: no subagents found (subagent may not have persisted)`);
      }
    },
    { timeout: 120000 }
  );

  test.concurrent(
    'getSubagentMessages returns empty for non-existent agent',
    async () => {
      const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-subagent-msg-`);

      const messages = await runWithSDK('open', 'Say "hello" and nothing else.', {
        maxTurns: 1,
        permissionMode: 'default',
        cwd: tempCwd,
      });
      const result = expectSuccessResult(messages);
      const sessionId = result.session_id;

      const [openMessages, officialMessages] = await Promise.all([
        openGetSubagentMessages(sessionId, 'nonexistent-agent', { dir: tempCwd }),
        officialGetSubagentMessages(sessionId, 'nonexistent-agent', { dir: tempCwd }),
      ]);

      expect(openMessages).toEqual([]);
      expect(officialMessages).toEqual([]);

      console.log(`   getSubagentMessages: both SDKs returned [] for nonexistent agent`);
    },
    { timeout: 90000 }
  );
});
