/**
 * Integration tests for sandbox configuration
 *
 * Note: Sandbox functionality requires Docker and proper environment setup.
 * These tests verify that the CLI args are passed correctly.
 */

import { describe, expect, test } from 'bun:test';
import { buildCliArgs } from '../../src/core/spawn.ts';

describe('sandbox CLI arguments', () => {
  test('sandbox enabled adds --sandbox flag', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: true,
      },
    });

    expect(args).toContain('--sandbox');
  });

  test('sandbox with autoAllowBashIfSandboxed=false adds flag', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: false,
      },
    });

    expect(args).toContain('--sandbox');
    expect(args).toContain('--no-auto-allow-bash-if-sandboxed');
  });

  test('sandbox with autoAllowBashIfSandboxed=true does not add extra flag', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: true,
        autoAllowBashIfSandboxed: true,
      },
    });

    expect(args).toContain('--sandbox');
    expect(args).not.toContain('--no-auto-allow-bash-if-sandboxed');
  });

  test('no sandbox option does not add flags', () => {
    const args = buildCliArgs({});

    expect(args).not.toContain('--sandbox');
    expect(args).not.toContain('--no-auto-allow-bash-if-sandboxed');
  });

  test('sandbox.enabled=false does not add sandbox flag', () => {
    const args = buildCliArgs({
      sandbox: {
        enabled: false,
      },
    });

    expect(args).not.toContain('--sandbox');
  });
});
