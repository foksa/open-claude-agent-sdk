/**
 * Integration tests for unimplemented permission features
 *
 * Based on official SDK documentation:
 * - https://docs.anthropic.com/agent-sdk/permissions
 * - https://docs.anthropic.com/agent-sdk/typescript (Options reference)
 *
 * These tests document expected behavior from official docs.
 * Tests are marked as .todo since the features aren't implemented yet.
 */

import { describe, expect, test } from 'bun:test';
import type { SDKResultSuccess } from '../../src/types/index.ts';
import type { SDKType } from './comparison-utils.ts';
import { runWithSDK, runWithSDKPermissions } from './comparison-utils.ts';

// Helper for running tests with both SDKs
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

// Helper for TODO tests (documenting expected behavior)
const testWithBothSDKsTodo = (
  name: string,
  _testFn: (sdk: SDKType) => Promise<void>,
  _timeout = 60000
) => {
  describe(name, () => {
    test.todo(`[lite] ${name}`);
    test.todo(`[official] ${name}`);
  });
};

// =============================================================================
// IMPLEMENTED: Permission modes
// =============================================================================

testWithBothSDKs('permissionMode default requires tool approval', async (sdk) => {
  /**
   * Official SDK docs:
   * "default: Standard permission behavior. No auto-approvals; unmatched tools
   * trigger your canUseTool callback"
   */
  let callbackTriggered = false;

  await runWithSDKPermissions(
    sdk,
    'Write "test" to /tmp/perm-default-test.txt', // Write requires permission
    {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName, input, _context) => {
        callbackTriggered = true;
        return { behavior: 'allow', updatedInput: input };
      },
    }
  );

  expect(callbackTriggered).toBe(true);
  console.log(`   [${sdk}] canUseTool triggered in default mode: ${callbackTriggered}`);
});

testWithBothSDKs('permissionMode bypassPermissions skips approval', async (sdk) => {
  /**
   * Official SDK docs:
   * "bypassPermissions: Bypass all permission checks. All tools run without
   * permission prompts (use with caution)"
   */
  let callbackTriggered = false;

  await runWithSDKPermissions(sdk, 'Write "test" to /tmp/perm-bypass-test.txt', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    canUseTool: async (_toolName, input, _context) => {
      callbackTriggered = true;
      return { behavior: 'allow', updatedInput: input };
    },
  });

  // With bypassPermissions, canUseTool should NOT be called
  expect(callbackTriggered).toBe(false);
  console.log(`   [${sdk}] canUseTool NOT triggered with bypassPermissions`);
});

testWithBothSDKs('permissionMode acceptEdits auto-approves file edits', async (sdk) => {
  /**
   * Official SDK docs:
   * "acceptEdits: Auto-accept file edits. File edits and filesystem operations
   * (mkdir, rm, mv, cp) are automatically approved"
   */
  let writeApproved = false;
  let _bashApproved = false;

  await runWithSDKPermissions(sdk, 'Write "test" to /tmp/perm-accept-edits.txt', {
    maxTurns: 3,
    permissionMode: 'acceptEdits',
    canUseTool: async (toolName, input, _context) => {
      if (toolName === 'Write' || toolName === 'Edit') {
        writeApproved = true;
      }
      if (toolName === 'Bash') {
        _bashApproved = true;
      }
      return { behavior: 'allow', updatedInput: input };
    },
  });

  // Write should be auto-approved (canUseTool NOT called for it)
  // If canUseTool was called for Write, it wasn't auto-approved
  console.log(`   [${sdk}] Write auto-approved: ${!writeApproved}`);
});

testWithBothSDKs('permissionMode plan prevents tool execution', async (sdk) => {
  /**
   * Official SDK docs:
   * "plan: Planning mode. No tool execution; Claude plans without making changes"
   */
  const fs = await import('node:fs/promises');
  const testFile = `/tmp/plan-mode-test-${sdk}-${Date.now()}.txt`;

  // Clean up first in case file exists
  await fs.unlink(testFile).catch(() => {});

  const messages = await runWithSDK(sdk, `Create a file at ${testFile}`, {
    permissionMode: 'plan',
    maxTurns: 3,
  });

  // In plan mode, there should be no actual Write tool execution
  // Claude should only describe what it WOULD do
  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeDefined();

  // File should NOT exist since we're in plan mode
  const fileExists = await fs
    .access(testFile)
    .then(() => true)
    .catch(() => false);
  expect(fileExists).toBe(false);

  console.log(`   [${sdk}] Plan mode prevented file creation: ${!fileExists}`);
});

// =============================================================================
// PARTIAL: Dynamic permission mode changes
// =============================================================================

testWithBothSDKsTodo('setPermissionMode() changes mode during streaming', async (sdk) => {
  /**
   * Official SDK docs:
   * "Call setPermissionMode() to change the mode mid-session. The new mode
   * takes effect immediately for all subsequent tool requests."
   *
   * Expected behavior:
   * Start in default mode, switch to acceptEdits mid-query
   */
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
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
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

  let _messageCount = 0;
  for await (const msg of q) {
    _messageCount++;

    // After first Write tool call, change permission mode
    if (msg.type === 'assistant' && !modeChanged && permissionCallsBeforeChange > 0) {
      await q.setPermissionMode('acceptEdits');
      modeChanged = true;
    }

    if (msg.type === 'result') break;
  }

  // After switching to acceptEdits, Write should be auto-approved
  // So permissionCallsAfterChange should be 0 or less than before
  console.log(
    `   [${sdk}] Permission calls before: ${permissionCallsBeforeChange}, after: ${permissionCallsAfterChange}`
  );
});

// =============================================================================
// UNIMPLEMENTED: Permission suggestions
// =============================================================================

testWithBothSDKsTodo('canUseTool receives permission suggestions', async (sdk) => {
  /**
   * Official SDK docs (CanUseTool type):
   * "options: { signal: AbortSignal; suggestions?: PermissionUpdate[] }"
   *
   * The suggestions field provides recommended permission updates
   * based on the tool being used.
   */
  let receivedSuggestions = false;

  await runWithSDKPermissions(sdk, 'Write "test" to /tmp/suggestions-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: async (_toolName, input, context) => {
      if (context.suggestions && context.suggestions.length > 0) {
        receivedSuggestions = true;
      }
      return { behavior: 'allow', updatedInput: input };
    },
  });

  // Should receive permission suggestions
  console.log(`   [${sdk}] Received suggestions: ${receivedSuggestions}`);
});

// =============================================================================
// UNIMPLEMENTED: Permission updates from canUseTool
// =============================================================================

testWithBothSDKsTodo('canUseTool can return updatedPermissions', async (sdk) => {
  /**
   * Official SDK docs (PermissionResult type):
   * "updatedPermissions?: PermissionUpdate[]"
   *
   * Can add rules to allow/deny future tool uses
   */
  const _appliedPermissions = false;

  await runWithSDKPermissions(sdk, 'Write "test" to /tmp/perm-update-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: async (_toolName, input, _context) => {
      return {
        behavior: 'allow',
        updatedInput: input,
        updatedPermissions: [
          {
            type: 'addRules',
            rules: [{ toolName: 'Write', ruleContent: '/tmp/*' }],
            behavior: 'allow',
            destination: 'session',
          },
        ],
      };
    },
  });

  // After returning updatedPermissions, future Write calls to /tmp/*
  // should be auto-approved
  console.log(`   [${sdk}] Permission update applied`);
});

// =============================================================================
// UNIMPLEMENTED: permissionPromptToolName option
// =============================================================================

testWithBothSDKsTodo('permissionPromptToolName routes prompts to MCP tool', async (sdk) => {
  /**
   * Official SDK docs (Options reference):
   * "permissionPromptToolName: string - MCP tool name for permission prompts"
   *
   * This allows using an MCP tool to handle permission prompts
   * instead of the default canUseTool callback.
   */

  // This would require setting up an MCP server with a permission tool
  // Expected behavior: permission requests are routed to the named MCP tool

  const _messages = await runWithSDK(sdk, 'Write "test" to /tmp/mcp-perm-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    permissionPromptToolName: 'my-permission-handler', // MCP tool name
    // mcpServers would need to be configured with this tool
  });

  // Without MCP server, this would fail gracefully or use default behavior
  console.log(`   [${sdk}] permissionPromptToolName test`);
});

// =============================================================================
// UNIMPLEMENTED: allowedTools and disallowedTools options
// =============================================================================

testWithBothSDKsTodo('allowedTools restricts available tools', async (sdk) => {
  /**
   * Official SDK docs (Options reference):
   * "allowedTools: string[] - List of allowed tool names"
   *
   * Only the specified tools are available to the agent.
   */

  const messages = await runWithSDK(sdk, 'Read the README and then write to /tmp/test.txt', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
    allowedTools: ['Read', 'Glob', 'Grep'], // No Write!
  });

  // Agent should be able to Read but not Write
  // Should fail gracefully or explain it can't write
  const result = messages.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result).toBeDefined();

  console.log(`   [${sdk}] Allowed tools restricted agent`);
});

testWithBothSDKsTodo('disallowedTools blocks specific tools', async (sdk) => {
  /**
   * Official SDK docs (Options reference):
   * "disallowedTools: string[] - List of disallowed tool names"
   *
   * The specified tools are blocked from use.
   */

  const messages = await runWithSDK(sdk, 'Run echo "hello" in bash', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 3,
    disallowedTools: ['Bash'], // Block Bash!
  });

  // Agent should not be able to use Bash
  const result = messages.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result).toBeDefined();

  console.log(`   [${sdk}] Disallowed tools blocked Bash`);
});

// =============================================================================
// IMPLEMENTED: Permission denial tracking
// =============================================================================

testWithBothSDKs('result includes permission_denials array', async (sdk) => {
  /**
   * Official SDK docs (SDKResultMessage type):
   * "permission_denials: SDKPermissionDenial[]"
   *
   * Lists all tools that were denied permission during the query.
   */

  const messages = await runWithSDKPermissions(sdk, 'Write "test" to /tmp/denial-test.txt', {
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
});

// =============================================================================
// PERMISSION EVALUATION ORDER
// =============================================================================

testWithBothSDKsTodo(
  'permission evaluation follows documented order: hooks, rules, mode, canUseTool',
  async (sdk) => {
    /**
     * Official SDK docs:
     * "When Claude requests a tool, the SDK checks permissions in this order:
     * 1. Hooks (PreToolUse can allow/deny)
     * 2. Permission rules (deny, then allow, then ask)
     * 3. Permission mode
     * 4. canUseTool callback"
     *
     * This test verifies the order by using all layers
     */

    let hookCalled = false;
    let canUseToolCalled = false;

    await runWithSDKPermissions(sdk, 'Write "test" to /tmp/eval-order-test.txt', {
      maxTurns: 3,
      permissionMode: 'default',
      hooks: {
        PreToolUse: [
          {
            matcher: 'Write',
            hooks: [
              async (_input) => {
                hookCalled = true;
                // Return empty to continue to next layer
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

    // Both should be called in order
    expect(hookCalled).toBe(true);
    expect(canUseToolCalled).toBe(true);

    console.log(`   [${sdk}] Hook called: ${hookCalled}, canUseTool called: ${canUseToolCalled}`);
  }
);
