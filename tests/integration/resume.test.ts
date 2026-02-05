/**
 * Integration tests for session resumption (--resume flag)
 */

import { describe, expect, test } from 'bun:test';
import type { SDKResultSuccess } from '../../src/types/index.ts';
import type { SDKType } from './comparison-utils.ts';
import { runWithSDK } from './comparison-utils.ts';

// Run each test with both SDKs in parallel
const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

testWithBothSDKs('resume option passes session ID to CLI', async (sdk) => {
  // First, run a query to get a session ID
  const messages = await runWithSDK(sdk, 'Say hello', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
  });

  // Find the result message to get the session ID
  const result = messages.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result).toBeDefined();
  expect(result?.session_id).toBeDefined();

  const sessionId = result?.session_id;
  console.log(`   [${sdk}] Got session ID: ${sessionId}`);

  // Now resume with that session ID
  const resumeMessages = await runWithSDK(sdk, 'What did I just say?', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    resume: sessionId,
  });

  // Should have result
  expect(resumeMessages.length).toBeGreaterThan(0);
  const resumeResult = resumeMessages.find((m) => m.type === 'result');
  expect(resumeResult).toBeDefined();

  // Session ID should be the same (resumed session)
  if (resumeResult?.type === 'result' && resumeResult.subtype === 'success') {
    expect(resumeResult.session_id).toBe(sessionId);
    console.log(`   [${sdk}] Resumed session successfully`);
  }
});
