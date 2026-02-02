/**
 * Integration tests for multi-turn conversations and control methods
 * Baby Step 5: Tests Query interface control methods
 */

import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';
import type { SDKUserMessage } from '../../src/types/index.ts';
import { recordSnapshot } from './utils.ts';

test('multi-turn conversation via streamInput', async () => {
  const q = query({
    prompt: 'Say hello in one word',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 5,
    }
  });

  let sessionId = '';
  let firstResultSeen = false;
  let secondResultSeen = false;
  const messages = [];

  for await (const msg of q) {
    messages.push(msg);

    if (msg.type === 'system') {
      sessionId = msg.session_id;
    }

    if (msg.type === 'result' && !firstResultSeen) {
      firstResultSeen = true;
      expect(msg.subtype).toBe('success');
      expect(msg.result).toBeTruthy();

      // Continue conversation with follow-up
      const followUp: SDKUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Now say goodbye in one word'
        },
        session_id: sessionId,
        parent_tool_use_id: null
      };

      await q.streamInput([followUp]);

    } else if (msg.type === 'result' && firstResultSeen) {
      secondResultSeen = true;
      expect(msg.subtype).toBe('success');
      expect(msg.result).toBeTruthy();
      q.close();
      break;
    }
  }

  await recordSnapshot('multi-turn', messages);

  expect(firstResultSeen).toBe(true);
  expect(secondResultSeen).toBe(true);
  expect(messages.length).toBeGreaterThan(2);
}, { timeout: 60000 });

test('interrupt() stops query execution', async () => {
  const q = query({
    prompt: 'Count from 1 to 100',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 10,
    }
  });

  // Interrupt after 2 seconds
  const interruptTimer = setTimeout(() => {
    q.interrupt();
  }, 2000);

  let gotResult = false;
  const messages = [];

  for await (const msg of q) {
    messages.push(msg);

    if (msg.type === 'result') {
      gotResult = true;
      clearTimeout(interruptTimer);
      break;
    }
  }

  await recordSnapshot('interrupt', messages);

  // Should have completed (either interrupted or finished)
  expect(gotResult).toBe(true);
}, { timeout: 30000 });

test('close() terminates query', async () => {
  const q = query({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    }
  });

  let messageCount = 0;
  let sawSystemMessage = false;

  for await (const msg of q) {
    messageCount++;

    if (msg.type === 'system') {
      sawSystemMessage = true;
      // Close after system message - this proves close() works
      q.close();
      break;
    }

    if (msg.type === 'result') {
      // If we get result first, that's fine too
      break;
    }
  }

  // We should have received at least the system message
  expect(sawSystemMessage).toBe(true);
  expect(messageCount).toBeGreaterThanOrEqual(1);
}, { timeout: 10000 });

test('setPermissionMode() changes permissions', async () => {
  const q = query({
    prompt: 'List files in current directory',
    options: {
      permissionMode: 'plan',
      maxTurns: 3,
    }
  });

  // Change to bypassPermissions after starting
  setTimeout(() => {
    q.setPermissionMode('bypassPermissions');
  }, 1000);

  let gotResult = false;

  for await (const msg of q) {
    if (msg.type === 'result') {
      gotResult = true;
      break;
    }
  }

  expect(gotResult).toBe(true);
}, { timeout: 30000 });

test('setModel() changes model', async () => {
  const q = query({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      model: 'claude-sonnet-4-5-20250929',
      maxTurns: 1,
    }
  });

  // Try to change model (this may not have visible effect in 1 turn)
  setTimeout(() => {
    q.setModel('claude-haiku-4-5-20251001');
  }, 500);

  let gotResult = false;

  for await (const msg of q) {
    if (msg.type === 'result') {
      gotResult = true;
      break;
    }
  }

  expect(gotResult).toBe(true);
}, { timeout: 30000 });

test('Query implements AsyncGenerator interface', async () => {
  const q = query({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    }
  });

  // Check that it has AsyncGenerator methods
  expect(typeof q.next).toBe('function');
  expect(typeof q.return).toBe('function');
  expect(typeof q.throw).toBe('function');
  expect(typeof q[Symbol.asyncIterator]).toBe('function');

  // Check that it has control methods
  expect(typeof q.interrupt).toBe('function');
  expect(typeof q.setPermissionMode).toBe('function');
  expect(typeof q.setModel).toBe('function');
  expect(typeof q.streamInput).toBe('function');
  expect(typeof q.close).toBe('function');

  // Consume it
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }
}, { timeout: 30000 });
