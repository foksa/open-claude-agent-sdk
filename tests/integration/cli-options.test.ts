/**
 * Integration tests for new CLI options
 *
 * Tests runtime behavior of options that need real CLI execution.
 * CLI arg correctness is already verified in unit/sdk-compatibility.test.ts.
 */

import { expect } from 'bun:test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runWithSDK, type SDKType, testWithBothSDKs } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

// ============================================================================
// tools option
// ============================================================================

testWithBothSDKs(
  'tools option restricts available tools',
  async (sdk: SDKType) => {
    // Only allow Read, Grep, Glob — ask model to list what it has
    const messages = await runWithSDK(
      sdk,
      'List every tool available to you. Output only the tool names, one per line.',
      {
        maxTurns: 1,
        permissionMode: 'default',
        tools: ['Read', 'Grep', 'Glob'],
      }
    );

    const result = expectSuccessResult(messages);
    const text = result.result ?? '';

    // Should mention at least one of our allowed tools
    const hasAllowedTool = text.includes('Read') || text.includes('Grep') || text.includes('Glob');
    expect(hasAllowedTool).toBe(true);

    // Bash and Write should not be in the tool list
    // Check the assistant messages for tool_use blocks — none should be Bash
    const toolUses = messages
      .filter((m) => m.type === 'assistant')
      .flatMap((m) => {
        const msg = m as { message?: { content?: Array<{ type: string; name?: string }> } };
        return (msg.message?.content ?? []).filter((c) => c.type === 'tool_use');
      });
    for (const tool of toolUses) {
      expect(tool.name).not.toBe('Bash');
      expect(tool.name).not.toBe('Write');
    }

    console.log(`   [${sdk}] tools restriction works`);
  },
  90000
);

testWithBothSDKs(
  'tools empty array disables all built-in tools',
  async (sdk: SDKType) => {
    const messages = await runWithSDK(sdk, 'Say "hi" and nothing else.', {
      maxTurns: 1,
      permissionMode: 'default',
      tools: [],
    });

    const _result = expectSuccessResult(messages);

    // No tool use should appear in the messages when tools are disabled
    const toolUses = messages
      .filter((m) => m.type === 'assistant')
      .flatMap((m) => {
        const msg = m as { message?: { content?: Array<{ type: string }> } };
        return (msg.message?.content ?? []).filter((c) => c.type === 'tool_use');
      });
    expect(toolUses.length).toBe(0);

    console.log(`   [${sdk}] tools=[] — no tool_use in response`);
  },
  90000
);

// ============================================================================
// additionalDirectories
// ============================================================================

testWithBothSDKs(
  'additionalDirectories allows reading files from extra dirs',
  async (sdk: SDKType) => {
    // Create a temp dir with a unique file
    const tempDir = mkdtempSync(join(tmpdir(), 'sdk-test-adddir-'));
    const testContent = `UNIQUE_TOKEN_${Date.now()}_${sdk}`;
    writeFileSync(join(tempDir, 'test-data.txt'), testContent);

    const messages = await runWithSDK(
      sdk,
      `Read the file ${join(tempDir, 'test-data.txt')} and output its exact contents. Nothing else.`,
      {
        maxTurns: 3,
        permissionMode: 'default',
        canUseTool: async () => ({ behavior: 'allow' as const }),
        additionalDirectories: [tempDir],
      }
    );

    const result = expectSuccessResult(messages);
    const text = result.result ?? '';
    expect(text).toContain(testContent);

    console.log(`   [${sdk}] additionalDirectories — file read from extra dir`);
  },
  90000
);

// ============================================================================
// fallbackModel
// ============================================================================

testWithBothSDKs(
  'fallbackModel option is accepted and query succeeds',
  async (sdk: SDKType) => {
    // fallbackModel only triggers on API-level failures (rate limits, overload)
    // which can't be reliably triggered in tests. Verify the option is accepted.
    const messages = await runWithSDK(sdk, 'Say "ok".', {
      maxTurns: 1,
      permissionMode: 'default',
      fallbackModel: 'sonnet',
    });

    expectSuccessResult(messages);

    console.log(`   [${sdk}] fallbackModel — option accepted, query succeeded`);
  },
  90000
);
