/**
 * Integration tests for sandbox configuration
 *
 * Note: Full sandbox functionality requires Docker. These tests verify
 * that the CLI accepts sandbox options without error.
 *
 * Unit tests for CLI argument building are in tests/unit/sandbox.test.ts
 */

import { describe, expect, test } from 'bun:test';
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

testWithBothSDKs('sandbox option is accepted by CLI', async (sdk) => {
  // This test verifies that the sandbox option is passed to CLI correctly
  // via --settings JSON flag (same as official SDK)

  const messages = await runWithSDK(sdk, 'Say hello', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    sandbox: {
      enabled: true,
    },
  });

  // We should get messages (CLI accepts the --settings flag)
  console.log(`   [${sdk}] Sandbox option accepted, got ${messages.length} messages`);

  const result = messages.find((m) => m.type === 'result');
  if (result) {
    console.log(`   [${sdk}] Result type: ${result.subtype}`);
  }

  expect(messages.length).toBeGreaterThan(0);
});

testWithBothSDKs('sandbox with autoAllowBashIfSandboxed=false is accepted', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Say hello', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    sandbox: {
      enabled: true,
      autoAllowBashIfSandboxed: false,
    },
  });

  console.log(
    `   [${sdk}] Sandbox with autoAllowBash=false accepted, got ${messages.length} messages`
  );

  const result = messages.find((m) => m.type === 'result');
  if (result) {
    console.log(`   [${sdk}] Result type: ${result.subtype}`);
  }

  expect(messages.length).toBeGreaterThan(0);
});
