/**
 * Todo tests for unimplemented session management features
 *
 * Implemented session tests are in tests/integration/sessions.test.ts.
 * These tests document session features that aren't fully implemented yet.
 */

import { expect } from 'bun:test';
import type { SDKMessage, SDKResultSuccess, SDKSystemMessage } from '../../../src/types/index.ts';
import { runWithSDK, testWithBothSDKsTodo } from '../comparison-utils.ts';

// =============================================================================
// UNIMPLEMENTED: forkSession preserves original
// =============================================================================

testWithBothSDKsTodo('forkSession preserves original session for later resumption', async (sdk) => {
  const messages1 = await runWithSDK(sdk, 'I want to build a REST API', {
    permissionMode: 'default',
    maxTurns: 1,
  });

  const initMsg1 = messages1.find(
    (m): m is SDKSystemMessage => m.type === 'system' && m.subtype === 'init'
  );
  const originalSessionId = initMsg1?.session_id;

  await runWithSDK(sdk, 'Actually, make it GraphQL', {
    permissionMode: 'default',
    maxTurns: 1,
    resume: originalSessionId,
    forkSession: true,
  });

  const messages3 = await runWithSDK(sdk, 'What type of API did I want?', {
    permissionMode: 'default',
    maxTurns: 1,
    resume: originalSessionId,
    forkSession: false,
  });

  const result = messages3.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result?.result).toBeDefined();
  console.log(`   [${sdk}] Resumed response: ${result?.result?.substring(0, 100)}...`);
});

// =============================================================================
// UNIMPLEMENTED: continue option
// =============================================================================

testWithBothSDKsTodo('continue option resumes most recent conversation', async (sdk) => {
  await runWithSDK(sdk, 'Remember this number: 42', {
    permissionMode: 'default',
    maxTurns: 1,
  });

  const messages2 = await runWithSDK(sdk, 'What number did I ask you to remember?', {
    permissionMode: 'default',
    maxTurns: 1,
    continue: true,
  });

  const result2 = messages2.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result2?.result).toContain('42');
  console.log(`   [${sdk}] Continue response: ${result2?.result}`);
});

// =============================================================================
// UNIMPLEMENTED: resumeSessionAt option
// =============================================================================

testWithBothSDKsTodo('resumeSessionAt resumes at specific message UUID', async (sdk) => {
  const messages: SDKMessage[] = [];
  const msgs1 = await runWithSDK(sdk, 'First: my favorite color is blue', {
    permissionMode: 'default',
    maxTurns: 1,
  });
  messages.push(...msgs1);

  const initMsg = msgs1.find(
    (m): m is SDKSystemMessage => m.type === 'system' && m.subtype === 'init'
  );
  const sessionId = initMsg?.session_id;

  const msgs2 = await runWithSDK(sdk, 'Second: my favorite animal is a dog', {
    permissionMode: 'default',
    maxTurns: 1,
    resume: sessionId,
  });
  messages.push(...msgs2);

  const userMessage = msgs1.find((m) => m.type === 'user');
  const resumeAtUuid = (userMessage as Record<string, unknown>)?.uuid;

  const msgs3 = await runWithSDK(sdk, 'What is my favorite color?', {
    permissionMode: 'default',
    maxTurns: 1,
    resume: sessionId,
    resumeSessionAt: resumeAtUuid,
  });

  const result = msgs3.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result?.result).toContain('blue');
  console.log(`   [${sdk}] Resume at UUID response: ${result?.result}`);
});
