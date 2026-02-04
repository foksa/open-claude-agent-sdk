/**
 * settingSources option tests
 * Tests that settingSources option is passed correctly to the CLI
 */

import { test, expect, describe } from 'bun:test';
import { runWithSDK } from './comparison-utils.ts';
import type { SDKType } from './comparison-utils.ts';

// Run each test with both SDKs in parallel
const testWithBothSDKs = (name: string, testFn: (sdk: SDKType) => Promise<void>, timeout = 45000) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

testWithBothSDKs('settingSources accepts empty array (isolation mode)', async (sdk) => {
  // This is the default for tests - verify it works
  const messages = await runWithSDK(
    sdk,
    'Say "hello" and nothing else.',
    {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      settingSources: [],  // Explicit isolation - no filesystem settings
    }
  );

  // Should complete successfully
  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }

  // Should have an assistant response
  const assistantMsg = messages.find(m => m.type === 'assistant');
  expect(assistantMsg).toBeTruthy();
  console.log(`   [${sdk}] settingSources: [] accepted`);
});

testWithBothSDKs('settingSources accepts project source', async (sdk) => {
  // Test that settingSources: ['project'] is accepted by CLI
  // Note: This doesn't test actual skill loading (would need .claude/skills dir)
  // but verifies the option is passed correctly without error
  const messages = await runWithSDK(
    sdk,
    'Say "hello" and nothing else.',
    {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      settingSources: ['project'],  // Load project-level settings
    }
  );

  // Should complete successfully (CLI accepts the option)
  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }

  const assistantMsg = messages.find(m => m.type === 'assistant');
  expect(assistantMsg).toBeTruthy();
  console.log(`   [${sdk}] settingSources: ['project'] accepted`);
});

testWithBothSDKs('settingSources accepts user source', async (sdk) => {
  // Test that settingSources: ['user'] is accepted by CLI
  const messages = await runWithSDK(
    sdk,
    'Say "hello" and nothing else.',
    {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      settingSources: ['user'],  // Load user-level settings
    }
  );

  // Should complete successfully
  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }

  const assistantMsg = messages.find(m => m.type === 'assistant');
  expect(assistantMsg).toBeTruthy();
  console.log(`   [${sdk}] settingSources: ['user'] accepted`);
});

testWithBothSDKs('settingSources accepts multiple sources', async (sdk) => {
  // Test that multiple sources can be combined
  const messages = await runWithSDK(
    sdk,
    'Say "hello" and nothing else.',
    {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      settingSources: ['project', 'user'],  // Both sources
    }
  );

  // Should complete successfully
  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }

  const assistantMsg = messages.find(m => m.type === 'assistant');
  expect(assistantMsg).toBeTruthy();
  console.log(`   [${sdk}] settingSources: ['project', 'user'] accepted`);
});
