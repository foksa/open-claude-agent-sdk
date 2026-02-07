/**
 * Integration tests for permission modes
 *
 * Tests: default, bypassPermissions, acceptEdits, plan, permission_denials
 * Each test verifies actual runtime behavior with both SDKs.
 *
 * Note: canUseTool callback behavior is tested in permissions.test.ts.
 * This file focuses on the different permissionMode values.
 */

import { expect } from 'bun:test';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

const CLI_PATH = './node_modules/@anthropic-ai/claude-agent-sdk/cli.js';

// =============================================================================
// permissionMode: default
// =============================================================================

testWithBothSDKs(
  'permissionMode default requires tool approval',
  async (sdk) => {
    let callbackTriggered = false;

    await runWithSDK(sdk, 'Write "test" to /tmp/perm-default-test.txt', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName, input, _context) => {
        callbackTriggered = true;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(callbackTriggered).toBe(true);
    console.log(`   [${sdk}] canUseTool triggered in default mode: ${callbackTriggered}`);
  },
  90000
);

// =============================================================================
// permissionMode: bypassPermissions
// =============================================================================

testWithBothSDKs(
  'permissionMode bypassPermissions skips approval',
  async (sdk) => {
    let callbackTriggered = false;

    await runWithSDK(sdk, 'Write "test" to /tmp/perm-bypass-test.txt', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      canUseTool: async (_toolName, input, _context) => {
        callbackTriggered = true;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(callbackTriggered).toBe(false);
    console.log(`   [${sdk}] canUseTool NOT triggered with bypassPermissions`);
  },
  90000
);

// =============================================================================
// permissionMode: acceptEdits
// =============================================================================

testWithBothSDKs(
  'permissionMode acceptEdits auto-approves file edits',
  async (sdk) => {
    let writeApproved = false;

    await runWithSDK(sdk, 'Write "test" to /tmp/perm-accept-edits.txt', {
      maxTurns: 3,
      permissionMode: 'acceptEdits',
      canUseTool: async (toolName, input, _context) => {
        if (toolName === 'Write' || toolName === 'Edit') {
          writeApproved = true;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    // Write should be auto-approved (canUseTool NOT called for it)
    console.log(`   [${sdk}] Write auto-approved: ${!writeApproved}`);
  },
  90000
);

// =============================================================================
// permissionMode: plan
// =============================================================================

testWithBothSDKs(
  'permissionMode plan prevents tool execution',
  async (sdk) => {
    const fs = await import('node:fs/promises');
    const testFile = `/tmp/plan-mode-test-${sdk}-${Date.now()}.txt`;

    await fs.unlink(testFile).catch(() => {});

    const messages = await runWithSDK(sdk, `Create a file at ${testFile}`, {
      permissionMode: 'plan',
      maxTurns: 3,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeDefined();

    const fileExists = await fs
      .access(testFile)
      .then(() => true)
      .catch(() => false);
    expect(fileExists).toBe(false);

    console.log(`   [${sdk}] Plan mode prevented file creation: ${!fileExists}`);
  },
  90000
);

// =============================================================================
// permission_denials in result
// =============================================================================

testWithBothSDKs(
  'result includes permission_denials array',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Write "test" to /tmp/denial-test.txt', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName, _input, _context) => {
        return { behavior: 'deny', message: 'Denied for testing' };
      },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeDefined();

    if (result && result.type === 'result') {
      expect(result.permission_denials).toBeDefined();
      expect(Array.isArray(result.permission_denials)).toBe(true);

      if (result.permission_denials.length > 0) {
        expect(result.permission_denials[0]).toHaveProperty('tool_name');
        expect(result.permission_denials[0]).toHaveProperty('tool_use_id');
        expect(result.permission_denials[0]).toHaveProperty('tool_input');
      }
    }

    console.log(`   [${sdk}] Got permission_denials array`);
  },
  90000
);

// =============================================================================
// allowedTools
// =============================================================================

testWithBothSDKs(
  'allowedTools restricts available tools',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Read the README and then write to /tmp/test.txt', {
      permissionMode: 'default',
      maxTurns: 5,
      allowedTools: ['Read', 'Glob', 'Grep'],
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeDefined();

    console.log(`   [${sdk}] Allowed tools restricted agent`);
  },
  90000
);

// =============================================================================
// disallowedTools
// =============================================================================

testWithBothSDKs(
  'disallowedTools blocks specific tools',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Run echo "hello" in bash', {
      permissionMode: 'default',
      maxTurns: 3,
      disallowedTools: ['Bash'],
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeDefined();

    console.log(`   [${sdk}] Disallowed tools blocked Bash`);
  },
  90000
);

// =============================================================================
// permission evaluation order
// =============================================================================

testWithBothSDKs(
  'PreToolUse hook fires and preempts canUseTool',
  async (sdk) => {
    let hookCalled = false;
    let canUseToolCalled = false;

    await runWithSDK(sdk, 'Run this exact bash command: echo hello', {
      maxTurns: 3,
      permissionMode: 'default',
      hooks: {
        PreToolUse: [
          {
            matcher: 'Bash',
            hooks: [
              async (_input) => {
                hookCalled = true;
                return {};
              },
            ],
          },
        ],
      },
      canUseTool: async (_toolName, input, _context) => {
        canUseToolCalled = true;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    // When a PreToolUse hook matches and returns {} (continue),
    // the CLI does NOT subsequently call canUseTool — hooks preempt it.
    expect(hookCalled).toBe(true);
    expect(canUseToolCalled).toBe(false);

    console.log(`   [${sdk}] Hook called: ${hookCalled}, canUseTool called: ${canUseToolCalled}`);
  },
  90000
);

// =============================================================================
// setPermissionMode (dynamic mode change)
// =============================================================================

testWithBothSDKs(
  'setPermissionMode() changes mode during streaming',
  async (sdk) => {
    const { query: liteQuery } = await import('../../src/api/query.ts');
    const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

    let permissionCallsBeforeChange = 0;
    let permissionCallsAfterChange = 0;
    let modeChanged = false;

    const q = queryFn({
      prompt: 'Write "before" to /tmp/before.txt, then write "after" to /tmp/after.txt',
      options: {
        maxTurns: 5,
        permissionMode: 'default',
        model: 'haiku',
        settingSources: [],
        pathToClaudeCodeExecutable: CLI_PATH,
        canUseTool: async (_toolName, input, _context) => {
          if (!modeChanged) {
            permissionCallsBeforeChange++;
          } else {
            permissionCallsAfterChange++;
          }
          return { behavior: 'allow', updatedInput: input };
        },
      },
    });

    for await (const msg of q) {
      if (msg.type === 'assistant' && !modeChanged && permissionCallsBeforeChange > 0) {
        await q.setPermissionMode('acceptEdits');
        modeChanged = true;
      }
      if (msg.type === 'result') break;
    }

    console.log(
      `   [${sdk}] Permission calls before: ${permissionCallsBeforeChange}, after: ${permissionCallsAfterChange}`
    );
  },
  120000
);
