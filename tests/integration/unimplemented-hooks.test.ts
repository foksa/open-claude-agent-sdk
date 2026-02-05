/**
 * Integration tests for unimplemented hook events
 *
 * Based on official SDK documentation:
 * - https://docs.anthropic.com/agent-sdk/typescript (Hook types)
 * - https://docs.anthropic.com/agent-sdk/hooks (Hook guide)
 *
 * The official SDK supports 12 hook events. Only some are implemented.
 * Tests are marked as .todo since the features aren't implemented yet.
 */

import { expect } from 'bun:test';
import { runWithSDK, testWithBothSDKs, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// IMPLEMENTED: PreToolUse hook
// =============================================================================

testWithBothSDKs('PreToolUse hook is called before tool execution', async (sdk) => {
  /**
   * Official SDK docs:
   * "PreToolUse: Intercept/modify tool calls before execution"
   */
  let hookCalled = false;
  let capturedToolName = '';

  await runWithSDK(sdk, 'Write "test" to /tmp/hook-pre-test.txt', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PreToolUse: [
        {
          hooks: [
            async (input: any) => {
              hookCalled = true;
              capturedToolName = input.tool_name;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(hookCalled).toBe(true);
  expect(capturedToolName).toBeTruthy();
  console.log(`   [${sdk}] PreToolUse called for: ${capturedToolName}`);
});

// =============================================================================
// IMPLEMENTED: PostToolUse hook
// =============================================================================

testWithBothSDKs('PostToolUse hook is called after tool execution', async (sdk) => {
  /**
   * Official SDK docs:
   * "PostToolUse: Process tool results after execution"
   */
  let hookCalled = false;
  let _capturedResult: any = null;

  await runWithSDK(sdk, 'Write "test" to /tmp/hook-post-test.txt', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PostToolUse: [
        {
          hooks: [
            async (input: any) => {
              hookCalled = true;
              _capturedResult = input.tool_response;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(hookCalled).toBe(true);
  console.log(`   [${sdk}] PostToolUse called with result`);
});

// =============================================================================
// IMPLEMENTED: Stop hook
// =============================================================================

testWithBothSDKs('Stop hook is called when agent stops', async (sdk) => {
  /**
   * Official SDK docs:
   * "Stop: Clean up on agent stop"
   */
  let stopHookCalled = false;

  await runWithSDK(sdk, 'Say hello', {
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      Stop: [
        {
          hooks: [
            async (_input: any) => {
              stopHookCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(stopHookCalled).toBe(true);
  console.log(`   [${sdk}] Stop hook was called`);
});

// =============================================================================
// UNIMPLEMENTED: PostToolUseFailure hook
// =============================================================================

testWithBothSDKsTodo('PostToolUseFailure hook is called when tool fails', async (sdk) => {
  /**
   * Official SDK docs:
   * "PostToolUseFailure: Handle tool failures
   *
   * PostToolUseFailureHookInput: {
   *   hook_event_name: 'PostToolUseFailure';
   *   tool_name: string;
   *   tool_input: unknown;
   *   error: string;
   *   is_interrupt?: boolean;
   * }"
   */
  let failureHookCalled = false;
  let capturedError = '';

  await runWithSDK(
    sdk,
    'Read /nonexistent/path/that/does/not/exist.txt', // This should fail
    {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      hooks: {
        PostToolUseFailure: [
          {
            hooks: [
              async (input: any) => {
                failureHookCalled = true;
                capturedError = input.error;
                return {};
              },
            ],
          },
        ],
      },
    }
  );

  expect(failureHookCalled).toBe(true);
  expect(capturedError).toBeTruthy();
  console.log(`   [${sdk}] PostToolUseFailure hook called with error: ${capturedError}`);
});

// =============================================================================
// UNIMPLEMENTED: SubagentStart hook
// =============================================================================

testWithBothSDKsTodo('SubagentStart hook is called when subagent starts', async (sdk) => {
  /**
   * Official SDK docs:
   * "SubagentStart: Track subagent lifecycle
   *
   * SubagentStartHookInput: {
   *   hook_event_name: 'SubagentStart';
   *   agent_id: string;
   *   agent_type: string;
   * }"
   *
   * Requires using the Task tool to spawn subagents
   */
  let subagentStartCalled = false;
  let capturedAgentId = '';

  await runWithSDK(sdk, 'Use the Task tool to have an agent research TypeScript best practices', {
    maxTurns: 5,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      SubagentStart: [
        {
          hooks: [
            async (input: any) => {
              subagentStartCalled = true;
              capturedAgentId = input.agent_id;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(subagentStartCalled).toBe(true);
  expect(capturedAgentId).toBeTruthy();
  console.log(`   [${sdk}] SubagentStart hook called for: ${capturedAgentId}`);
});

// =============================================================================
// UNIMPLEMENTED: SubagentStop hook
// =============================================================================

testWithBothSDKsTodo('SubagentStop hook is called when subagent stops', async (sdk) => {
  /**
   * Official SDK docs:
   * "SubagentStop: Handle subagent completion
   *
   * SubagentStopHookInput: {
   *   hook_event_name: 'SubagentStop';
   *   stop_hook_active: boolean;
   * }"
   */
  let subagentStopCalled = false;

  await runWithSDK(sdk, 'Use the Task tool to have an agent say hello', {
    maxTurns: 5,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      SubagentStop: [
        {
          hooks: [
            async (_input: any) => {
              subagentStopCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(subagentStopCalled).toBe(true);
  console.log(`   [${sdk}] SubagentStop hook was called`);
});

// =============================================================================
// UNIMPLEMENTED: SessionStart hook
// =============================================================================

testWithBothSDKsTodo('SessionStart hook is called at session start', async (sdk) => {
  /**
   * Official SDK docs:
   * "SessionStart: Initialize session state
   *
   * SessionStartHookInput: {
   *   hook_event_name: 'SessionStart';
   *   source: 'startup' | 'resume' | 'clear' | 'compact';
   * }"
   */
  let sessionStartCalled = false;
  let capturedSource = '';

  await runWithSDK(sdk, 'Say hello', {
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      SessionStart: [
        {
          hooks: [
            async (input: any) => {
              sessionStartCalled = true;
              capturedSource = input.source;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(sessionStartCalled).toBe(true);
  expect(capturedSource).toBe('startup');
  console.log(`   [${sdk}] SessionStart hook called with source: ${capturedSource}`);
});

// =============================================================================
// UNIMPLEMENTED: SessionEnd hook
// =============================================================================

testWithBothSDKsTodo('SessionEnd hook is called at session end', async (sdk) => {
  /**
   * Official SDK docs:
   * "SessionEnd: Clean up session resources
   *
   * SessionEndHookInput: {
   *   hook_event_name: 'SessionEnd';
   *   reason: ExitReason;
   * }"
   */
  let sessionEndCalled = false;
  let capturedReason = '';

  await runWithSDK(sdk, 'Say hello', {
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      SessionEnd: [
        {
          hooks: [
            async (input: any) => {
              sessionEndCalled = true;
              capturedReason = input.reason;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(sessionEndCalled).toBe(true);
  expect(capturedReason).toBeTruthy();
  console.log(`   [${sdk}] SessionEnd hook called with reason: ${capturedReason}`);
});

// =============================================================================
// UNIMPLEMENTED: Notification hook
// =============================================================================

testWithBothSDKsTodo('Notification hook receives agent notifications', async (sdk) => {
  /**
   * Official SDK docs:
   * "Notification: Display agent status
   *
   * NotificationHookInput: {
   *   hook_event_name: 'Notification';
   *   message: string;
   *   title?: string;
   * }"
   */
  let notificationCalled = false;
  let _capturedMessage = '';

  await runWithSDK(sdk, 'Do a complex task that would generate notifications', {
    maxTurns: 5,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      Notification: [
        {
          hooks: [
            async (input: any) => {
              notificationCalled = true;
              _capturedMessage = input.message;
              return {};
            },
          ],
        },
      ],
    },
  });

  // Notifications may or may not be generated depending on the task
  console.log(`   [${sdk}] Notification hook called: ${notificationCalled}`);
});

// =============================================================================
// UNIMPLEMENTED: PermissionRequest hook
// =============================================================================

testWithBothSDKsTodo('PermissionRequest hook handles permission prompts', async (sdk) => {
  /**
   * Official SDK docs:
   * "PermissionRequest: Custom permission UI
   *
   * PermissionRequestHookInput: {
   *   hook_event_name: 'PermissionRequest';
   *   tool_name: string;
   *   tool_input: unknown;
   *   permission_suggestions?: PermissionUpdate[];
   * }"
   *
   * This hook is called when a tool requires permission
   * and can return approve/block decision
   */
  let permissionRequestCalled = false;
  let capturedToolName = '';

  await runWithSDK(sdk, 'Write "test" to /tmp/permission-request-test.txt', {
    maxTurns: 3,
    permissionMode: 'default', // Need default mode to trigger permission requests
    hooks: {
      PermissionRequest: [
        {
          hooks: [
            async (input: any) => {
              permissionRequestCalled = true;
              capturedToolName = input.tool_name;
              return { decision: 'approve' };
            },
          ],
        },
      ],
    },
  });

  expect(permissionRequestCalled).toBe(true);
  expect(capturedToolName).toBe('Write');
  console.log(`   [${sdk}] PermissionRequest hook called for: ${capturedToolName}`);
});

// =============================================================================
// UNIMPLEMENTED: PreCompact hook
// =============================================================================

testWithBothSDKsTodo('PreCompact hook is called before context compaction', async (sdk) => {
  /**
   * Official SDK docs:
   * "PreCompact: Before context compaction
   *
   * PreCompactHookInput: {
   *   hook_event_name: 'PreCompact';
   *   trigger: 'manual' | 'auto';
   *   custom_instructions: string | null;
   * }"
   *
   * Called when context window is approaching limit and needs compaction
   */
  let preCompactCalled = false;
  let _capturedTrigger = '';

  // Would need a very long conversation to trigger auto-compact
  // Or use /compact command to trigger manually
  await runWithSDK(sdk, 'Generate a very long response that approaches context limits', {
    maxTurns: 10,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PreCompact: [
        {
          hooks: [
            async (input: any) => {
              preCompactCalled = true;
              _capturedTrigger = input.trigger;
              return {};
            },
          ],
        },
      ],
    },
  });

  // May or may not be called depending on context length
  console.log(`   [${sdk}] PreCompact hook called: ${preCompactCalled}`);
});

// =============================================================================
// IMPLEMENTED: UserPromptSubmit hook
// =============================================================================

testWithBothSDKs('UserPromptSubmit hook is called for user messages', async (sdk) => {
  /**
   * Official SDK docs:
   * "UserPromptSubmit: Validate/modify user input
   *
   * UserPromptSubmitHookInput: {
   *   hook_event_name: 'UserPromptSubmit';
   *   prompt: string;
   * }"
   */
  let hookCalled = false;
  let capturedPrompt = '';

  await runWithSDK(sdk, 'Say hello world', {
    maxTurns: 1,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      UserPromptSubmit: [
        {
          hooks: [
            async (input: any) => {
              hookCalled = true;
              capturedPrompt = input.prompt;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(hookCalled).toBe(true);
  expect(capturedPrompt).toContain('hello');
  console.log(`   [${sdk}] UserPromptSubmit hook called with prompt: ${capturedPrompt}`);
});

// =============================================================================
// Hook matchers
// =============================================================================

testWithBothSDKsTodo('hook matcher filters by tool name', async (sdk) => {
  /**
   * Official SDK docs:
   * "HookCallbackMatcher: { matcher?: string; hooks: HookCallback[] }
   *
   * The matcher is a regex pattern to filter which tools trigger the hook"
   *
   * Note: This test is marked TODO because the lite SDK's hook matcher
   * implementation may not be filtering correctly. The official SDK appears
   * to filter hooks by the matcher regex, but lite SDK may call all hooks.
   *
   * BUG: Lite SDK hook matcher filtering needs investigation.
   */
  let readHookCalled = false;
  let readToolName = '';

  await runWithSDK(sdk, 'Read package.json', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PreToolUse: [
        {
          matcher: 'Read', // Only match Read tool
          hooks: [
            async (input: any) => {
              readHookCalled = true;
              readToolName = input.tool_name;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(readHookCalled).toBe(true);
  expect(readToolName).toBe('Read');
  console.log(`   [${sdk}] Read hook called for: ${readToolName}`);
});

testWithBothSDKsTodo('hook matcher supports regex patterns', async (sdk) => {
  /**
   * Official SDK docs show regex matchers like "Edit|Write"
   *
   * Note: This test is marked TODO because the regex matcher behavior
   * may vary between lite and official SDK implementations.
   * The matcher is a regex string that filters which tools trigger hooks.
   */
  let fileOpHookCalled = false;
  const matchedTools: string[] = [];

  await runWithSDK(sdk, 'Write "test" to /tmp/regex-test.txt', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PreToolUse: [
        {
          matcher: 'Edit|Write', // Match either Edit or Write
          hooks: [
            async (input: any) => {
              fileOpHookCalled = true;
              matchedTools.push(input.tool_name);
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(fileOpHookCalled).toBe(true);
  expect(matchedTools).toContain('Write');
  console.log(`   [${sdk}] Regex matcher matched: ${matchedTools.join(', ')}`);
});

// =============================================================================
// Hook return values
// =============================================================================

testWithBothSDKsTodo('PreToolUse hook can deny tool execution', async (sdk) => {
  /**
   * Official SDK docs (SyncHookJSONOutput):
   * "hookSpecificOutput: {
   *   hookEventName: 'PreToolUse';
   *   permissionDecision?: 'allow' | 'deny' | 'ask';
   *   permissionDecisionReason?: string;
   *   updatedInput?: Record<string, unknown>;
   * }"
   */
  let toolExecuted = false;

  await runWithSDK(sdk, 'Write "test" to /tmp/hook-deny-test.txt', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write',
          hooks: [
            async (_input: any) => {
              return {
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'deny',
                  permissionDecisionReason: 'Blocked by test hook',
                },
              };
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write',
          hooks: [
            async (_input: any) => {
              toolExecuted = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  // PostToolUse should NOT be called if PreToolUse denied
  expect(toolExecuted).toBe(false);
  console.log(`   [${sdk}] Tool execution blocked by hook: ${!toolExecuted}`);
});

testWithBothSDKsTodo('PreToolUse hook can modify tool input', async (sdk) => {
  /**
   * Official SDK docs:
   * "updatedInput?: Record<string, unknown> - Modified tool input"
   */
  let capturedContent = '';

  await runWithSDK(sdk, 'Write "original" to /tmp/hook-modify-test.txt', {
    maxTurns: 3,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    hooks: {
      PreToolUse: [
        {
          matcher: 'Write',
          hooks: [
            async (input: any) => {
              // Modify the content being written
              return {
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'allow',
                  updatedInput: {
                    ...input.tool_input,
                    content: 'modified by hook',
                  },
                },
              };
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Write',
          hooks: [
            async (input: any) => {
              capturedContent = input.tool_input?.content;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(capturedContent).toBe('modified by hook');
  console.log(`   [${sdk}] Tool input modified to: ${capturedContent}`);
});
