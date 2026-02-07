/**
 * Unit tests for sandbox CLI argument building
 */

import { describe, expect, test } from 'bun:test';
import { buildCliArgs } from '../../src/core/argBuilder.ts';

describe('sandbox CLI arguments', () => {
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
