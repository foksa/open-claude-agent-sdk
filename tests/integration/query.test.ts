/**
 * Comparison tests: Same tests run with both lite and official SDKs
 * Validates that our SDK produces compatible results
 */

import { describe, expect, test } from 'bun:test';
import type { SDKType } from './comparison-utils.ts';
import { compareMessageStructures, runWithSDK } from './comparison-utils.ts';

// Run each test with both SDKs in parallel
const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 45000
) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

testWithBothSDKs('basic hello world query', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Say hello in one word', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
  });

  // Validate message structure
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0].type).toBe('system');
  expect(messages[messages.length - 1].type).toBe('result');

  // Check result is successful
  const result = messages[messages.length - 1];
  if (result.type === 'result') {
    expect(result.subtype).toBe('success');
    expect(result.is_error).toBe(false);
  }
});

testWithBothSDKs('streaming with includePartialMessages', async (sdk) => {
  let streamEventCount = 0;

  const messages = await runWithSDK(
    sdk,
    'Write a haiku about coding',
    {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      includePartialMessages: true,
    },
    (msg) => {
      if (msg.type === 'stream_event') {
        streamEventCount++;
      }
    }
  );

  // Should have stream_event messages
  expect(streamEventCount).toBeGreaterThan(0);
  console.log(`   [${sdk}] Got ${streamEventCount} stream_event messages`);

  // Should still end with result
  expect(messages[messages.length - 1].type).toBe('result');
});

testWithBothSDKs('plan mode', async (sdk) => {
  const messages = await runWithSDK(sdk, 'List the files in the current directory', {
    permissionMode: 'plan',
    maxTurns: 2,
  });

  expect(messages.length).toBeGreaterThan(0);

  // Check system message has correct permission mode
  const systemMsg = messages.find((m) => m.type === 'system');
  if (systemMsg && systemMsg.type === 'system') {
    expect(systemMsg.permissionMode).toBe('plan');
  }
});

testWithBothSDKs('custom model', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Say hi', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    model: 'claude-sonnet-4-5-20250929',
    maxTurns: 1,
  });

  // Check system message has correct model
  const systemMsg = messages.find((m) => m.type === 'system');
  if (systemMsg && systemMsg.type === 'system') {
    expect(systemMsg.model).toBe('claude-sonnet-4-5-20250929');
  }
});

// Structure comparison test - runs both and compares
test(
  'structure comparison: both SDKs produce similar message flow',
  async () => {
    const liteMessages = await runWithSDK('lite', 'Say hello', {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    });

    const officialMessages = await runWithSDK('official', 'Say hello', {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    });

    const comparison = compareMessageStructures(liteMessages, officialMessages);

    console.log('   Structure comparison:', {
      lite: `${comparison.liteCount} messages`,
      official: `${comparison.officialCount} messages`,
    });

    // Both should have system and result messages
    expect(comparison.bothHaveSystem).toBe(true);
    expect(comparison.bothHaveResult).toBe(true);

    // Message counts should be similar (within reasonable range)
    const ratio = comparison.liteCount / comparison.officialCount;
    expect(ratio).toBeGreaterThan(0.5);
    expect(ratio).toBeLessThan(2.0);
  },
  { timeout: 90000 }
);
