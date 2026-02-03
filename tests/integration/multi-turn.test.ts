/**
 * Comparison tests for multi-turn conversations
 * Same tests run with both lite and official SDKs
 */

import { test, expect, describe } from 'bun:test';
import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import type { SDKUserMessage } from '../../src/types/index.ts';

const testWithBothSDKs = (name: string, testFn: (sdk: 'lite' | 'official') => Promise<void>, timeout = 60000) => {
  describe(name, () => {
    // Run lite and official tests in parallel
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

testWithBothSDKs('multi-turn conversation via streamInput', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
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

  expect(firstResultSeen).toBe(true);
  expect(secondResultSeen).toBe(true);
  expect(messages.length).toBeGreaterThan(2);
  console.log(`   [${sdk}] Multi-turn: ${messages.length} messages`);
});

testWithBothSDKs('interrupt() stops query execution', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
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

  for await (const msg of q) {
    if (msg.type === 'result') {
      gotResult = true;
      clearTimeout(interruptTimer);
      break;
    }
  }

  expect(gotResult).toBe(true);
  console.log(`   [${sdk}] Interrupt test completed`);
});

testWithBothSDKs('close() terminates query', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
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
      q.close();
      break;
    }

    if (msg.type === 'result') {
      break;
    }
  }

  expect(sawSystemMessage).toBe(true);
  expect(messageCount).toBeGreaterThanOrEqual(1);
  console.log(`   [${sdk}] Close test: ${messageCount} messages before close`);
});

testWithBothSDKs('setPermissionMode() changes permissions', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
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
  console.log(`   [${sdk}] setPermissionMode test completed`);
});

testWithBothSDKs('setModel() changes model', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
    prompt: 'Say hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      model: 'claude-sonnet-4-5-20250929',
      maxTurns: 1,
    }
  });

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
  console.log(`   [${sdk}] setModel test completed`);
});

testWithBothSDKs('Query implements AsyncGenerator interface', async (sdk) => {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  const q = queryFn({
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

  console.log(`   [${sdk}] AsyncGenerator interface verified`);
});
