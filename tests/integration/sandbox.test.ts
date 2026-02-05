/**
 * Integration tests for sandbox configuration
 *
 * Note: Full sandbox functionality requires Docker. These tests verify
 * that the CLI accepts sandbox options without error.
 *
 * Unit tests for CLI argument building are in tests/unit/sandbox.test.ts
 */

import { expect } from 'bun:test';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

testWithBothSDKs('sandbox option is accepted by CLI', async (sdk) => {
  // This test verifies that the sandbox option is passed to CLI correctly
  // via --settings JSON flag (same as official SDK)

  const messages = await runWithSDK(sdk, 'Say hello', {
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
