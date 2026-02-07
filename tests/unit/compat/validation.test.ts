/**
 * Option validation tests
 *
 * Verifies that invalid option combinations throw appropriate errors.
 */

import { describe, expect, test } from 'bun:test';
import { buildCliArgs } from '../../../src/core/argBuilder.ts';

describe('option validation', () => {
  test('fallbackModel same as model throws', () => {
    expect(() =>
      buildCliArgs({
        model: 'claude-sonnet-4-20250514',
        fallbackModel: 'claude-sonnet-4-20250514',
        permissionMode: 'default',
      })
    ).toThrow('Fallback model cannot be the same as the main model');
  });

  test('canUseTool + permissionPromptToolName throws', () => {
    expect(() =>
      buildCliArgs({
        canUseTool: async () => ({ behavior: 'allow' as const }),
        permissionPromptToolName: 'my-tool',
        permissionMode: 'default',
      })
    ).toThrow('canUseTool callback cannot be used with permissionPromptToolName');
  });
});
