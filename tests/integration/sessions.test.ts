/**
 * Integration tests for session management options
 *
 * Tests: continue, forkSession, sessionId, persistSession
 * Each test verifies actual agent behavior, not just flag acceptance.
 */

import { expect } from 'bun:test';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import type { SDKResultSuccess, SDKSystemMessage } from '../../src/types/index.ts';
import { runWithSDK, type SDKType, testWithBothSDKs } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

// ============================================================================
// continue
// ============================================================================

testWithBothSDKs(
  'continue resumes most recent conversation',
  async (sdk: SDKType) => {
    const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-continue-${sdk}-`);
    const token = `REMEMBER_${Date.now()}_${sdk}`;

    // First query: establish a session with a unique token
    const firstMessages = await runWithSDK(
      sdk,
      `Remember this exact token: ${token}. Just confirm you've noted it.`,
      { maxTurns: 1, permissionMode: 'default', cwd: tempCwd }
    );
    expectSuccessResult(firstMessages);

    // Second query with continue: should recall the token
    const secondMessages = await runWithSDK(
      sdk,
      'What was the exact token I asked you to remember? Output only the token.',
      { maxTurns: 1, permissionMode: 'default', continue: true, cwd: tempCwd }
    );

    const result = expectSuccessResult(secondMessages);
    expect(result.result).toContain(token);

    console.log(`   [${sdk}] continue — recalled token from previous session`);
  },
  120000
);

// ============================================================================
// forkSession
// ============================================================================

testWithBothSDKs(
  'forkSession retains context but creates new session',
  async (sdk: SDKType) => {
    const token = `FORK_${Date.now()}_${sdk}`;

    // First query: create a session with a unique token
    const messages1 = await runWithSDK(sdk, `Remember this token: ${token}. Just confirm.`, {
      maxTurns: 1,
      permissionMode: 'default',
    });

    const result1 = messages1.find(
      (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
    );
    expect(result1).toBeDefined();
    const originalSessionId = result1?.session_id;
    expect(originalSessionId).toBeDefined();

    // Fork: new session ID but retains context from original
    const messages2 = await runWithSDK(
      sdk,
      'What token did I ask you to remember? Output only the token.',
      {
        maxTurns: 1,
        permissionMode: 'default',
        resume: originalSessionId,
        forkSession: true,
      }
    );

    const result2 = messages2.find(
      (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
    );
    expect(result2).toBeDefined();

    // Different session ID
    expect(result2?.session_id).not.toBe(originalSessionId);
    // But retains context — knows the token
    expect(result2?.result).toContain(token);

    console.log(`   [${sdk}] forkSession — new session ID, retained context`);
  },
  120000
);

// ============================================================================
// sessionId
// ============================================================================

testWithBothSDKs(
  'sessionId allows resuming with custom ID',
  async (sdk: SDKType) => {
    const customId = crypto.randomUUID();
    const token = `SESSID_${Date.now()}_${sdk}`;

    // First query: create session with custom ID and unique token
    const messages1 = await runWithSDK(sdk, `Remember this token: ${token}. Just confirm.`, {
      maxTurns: 1,
      permissionMode: 'default',
      sessionId: customId,
    });

    const result1 = messages1.find(
      (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
    );
    expect(result1).toBeDefined();
    expect(result1?.session_id).toBe(customId);

    // Resume using the custom session ID — should retain context
    const messages2 = await runWithSDK(
      sdk,
      'What token did I ask you to remember? Output only the token.',
      { maxTurns: 1, permissionMode: 'default', resume: customId }
    );

    const result2 = expectSuccessResult(messages2);
    expect(result2.session_id).toBe(customId);
    expect(result2.result).toContain(token);

    console.log(`   [${sdk}] sessionId — custom UUID, resumed with context`);
  },
  120000
);

// ============================================================================
// persistSession
// ============================================================================

testWithBothSDKs(
  'persistSession false prevents session from being saved',
  async (sdk: SDKType) => {
    const tempCwd = mkdtempSync(`${tmpdir()}/sdk-test-persist-${sdk}-`);
    const token = `PERSIST_${Date.now()}_${sdk}`;

    // First query with persistSession: false
    const firstMessages = await runWithSDK(sdk, `Remember this token: ${token}. Confirm.`, {
      maxTurns: 1,
      permissionMode: 'default',
      persistSession: false,
      cwd: tempCwd,
    });
    expectSuccessResult(firstMessages);

    // Try to continue — should NOT find the previous session
    const secondMessages = await runWithSDK(
      sdk,
      'What token did I ask you to remember? Output only the token, or say NONE if unknown.',
      { maxTurns: 1, permissionMode: 'default', continue: true, cwd: tempCwd }
    );

    const result = expectSuccessResult(secondMessages);
    // Should NOT contain the token (session wasn't persisted)
    expect(result.result).not.toContain(token);

    console.log(`   [${sdk}] persistSession=false — session not saved`);
  },
  120000
);

// ============================================================================
// session_id in messages
// ============================================================================

testWithBothSDKs(
  'captures session ID from init message',
  async (sdk: SDKType) => {
    const messages = await runWithSDK(sdk, 'Say hello briefly', {
      permissionMode: 'default',
      maxTurns: 1,
    });

    const initMessage = messages.find(
      (m): m is SDKSystemMessage => m.type === 'system' && m.subtype === 'init'
    );

    expect(initMessage).toBeDefined();
    expect(initMessage?.session_id).toBeDefined();

    console.log(`   [${sdk}] Session ID from init: ${initMessage?.session_id}`);
  },
  90000
);

testWithBothSDKs(
  'all messages include consistent session_id',
  async (sdk: SDKType) => {
    const messages = await runWithSDK(sdk, 'Say "hello"', {
      permissionMode: 'default',
      maxTurns: 1,
    });

    const messagesWithSessionId = messages.filter((m) => (m as Record<string, unknown>).session_id);
    expect(messagesWithSessionId.length).toBe(messages.length);

    const sessionIds = new Set(
      messagesWithSessionId.map((m) => (m as Record<string, unknown>).session_id)
    );
    expect(sessionIds.size).toBe(1);

    console.log(`   [${sdk}] All ${messages.length} messages have consistent session_id`);
  },
  90000
);
