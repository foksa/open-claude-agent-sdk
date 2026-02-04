/**
 * Integration tests for sandbox configuration
 *
 * Note: Full sandbox functionality requires Docker. These tests verify:
 * 1. CLI argument building (unit tests)
 * 2. CLI accepts sandbox options without error (integration tests)
 */

import { describe, expect, test } from 'bun:test';
import { buildCliArgs } from '../../src/core/spawn.ts';
import type { SDKType } from './comparison-utils.ts';
import { runWithSDK } from './comparison-utils.ts';

// ============================================================================
// Unit tests for CLI argument building
// ============================================================================

describe('sandbox CLI arguments (unit)', () => {
  test('sandbox enabled adds --settings flag with JSON', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: true,
      },
    });

    expect(args).toContain('--settings');
    const settingsIndex = args.indexOf('--settings');
    const settingsValue = args[settingsIndex + 1];
    expect(settingsValue).toBe('{"sandbox":{"enabled":true}}');
  });

  test('sandbox with autoAllowBashIfSandboxed=false is included in JSON', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: false,
      },
    });

    expect(args).toContain('--settings');
    const settingsIndex = args.indexOf('--settings');
    const settingsValue = args[settingsIndex + 1];
    const parsed = JSON.parse(settingsValue);
    expect(parsed.sandbox.enabled).toBe(true);
    expect(parsed.sandbox.autoAllowBashIfSandboxed).toBe(false);
  });

  test('sandbox with autoAllowBashIfSandboxed=true is included in JSON', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
      },
    });

    expect(args).toContain('--settings');
    const settingsIndex = args.indexOf('--settings');
    const settingsValue = args[settingsIndex + 1];
    const parsed = JSON.parse(settingsValue);
    expect(parsed.sandbox.autoAllowBashIfSandboxed).toBe(true);
  });

  test('no sandbox option does not add --settings flag', () => {
    const args = buildCliArgs({});

    expect(args).not.toContain('--settings');
  });

  test('sandbox.enabled=false still passes sandbox config to CLI', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: false,
      },
    });

    // Even when disabled, we pass the config so CLI knows the intent
    expect(args).toContain('--settings');
    const settingsIndex = args.indexOf('--settings');
    const settingsValue = args[settingsIndex + 1];
    const parsed = JSON.parse(settingsValue);
    expect(parsed.sandbox.enabled).toBe(false);
  });
});

// ============================================================================
// Integration tests - spawn actual CLI with sandbox options
// ============================================================================

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
