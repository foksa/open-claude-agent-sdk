/**
 * Integration tests for all hook events
 *
 * Hook infrastructure is generic — all events use the same registration
 * and callback mechanism. Events that don't fire in these tests simply
 * require specific triggers (subagents, compaction, teams, etc.) that
 * aren't practical in unit-style integration tests.
 *
 * All tests use permissionMode: 'default' with canUseTool callback
 * to auto-approve permissions. Do NOT use bypassPermissions unless
 * absolutely necessary — it prevents hooks like PermissionRequest
 * and PostToolUseFailure from firing.
 *
 * Hook events that reliably fire in a simple session:
 *   ✅ UserPromptSubmit — fires for every user message
 *   ✅ PreToolUse — fires before any tool call
 *   ✅ PostToolUse — fires after any tool call
 *   ✅ Stop — fires when agent stops
 *   ✅ PermissionRequest — fires for tools needing permission (Write, not Read)
 *
 * Hook events requiring specific triggers (verified identical in both SDKs):
 *   - PostToolUseFailure — CLI treats errors as successful responses, not failures
 *   - Notification — agent status messages
 *   - SubagentStart/SubagentStop — Task tool usage
 *   - PreCompact — context window near limit
 *   - Setup — session setup phase
 *   - TeammateIdle — team agent idle (SDK 0.2.34+)
 *   - TaskCompleted — task completion in teams (SDK 0.2.34+)
 *
 * Hook events that only work declaratively (.claude/settings.json):
 *   - SessionStart/SessionEnd — known limitation in official SDK
 *     See: github.com/anthropics/claude-agent-sdk-typescript/issues/83
 */

import { expect } from 'bun:test';
import type {
  HookInput,
  PreToolUseHookInput,
  UserPromptSubmitHookInput,
} from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs, testWithBothSDKsTodo } from './comparison-utils.ts';

/** Auto-approve all tool usage (replaces bypassPermissions) */
const autoApprove = async (_toolName: string, input: Record<string, unknown>) => {
  return { behavior: 'allow' as const, updatedInput: input };
};

// =============================================================================
// RELIABLY FIRING: PreToolUse
// =============================================================================

testWithBothSDKs('PreToolUse hook is called before tool execution', async (sdk) => {
  let hookCalled = false;
  let capturedToolName = '';

  await runWithSDK(sdk, 'Write "test" to /tmp/hook-pre-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      PreToolUse: [
        {
          hooks: [
            async (input) => {
              hookCalled = true;
              capturedToolName = (input as PreToolUseHookInput).tool_name;
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
// RELIABLY FIRING: PostToolUse
// =============================================================================

testWithBothSDKs('PostToolUse hook is called after tool execution', async (sdk) => {
  let hookCalled = false;

  await runWithSDK(sdk, 'Write "test" to /tmp/hook-post-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      PostToolUse: [
        {
          hooks: [
            async (_input: HookInput) => {
              hookCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(hookCalled).toBe(true);
  console.log(`   [${sdk}] PostToolUse called`);
});

// =============================================================================
// RELIABLY FIRING: Stop
// =============================================================================

testWithBothSDKs('Stop hook is called when agent stops', async (sdk) => {
  let stopHookCalled = false;

  await runWithSDK(sdk, 'Say hello', {
    maxTurns: 1,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      Stop: [
        {
          hooks: [
            async (_input: HookInput) => {
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
// RELIABLY FIRING: UserPromptSubmit
// =============================================================================

testWithBothSDKs('UserPromptSubmit hook is called for user messages', async (sdk) => {
  let hookCalled = false;
  let capturedPrompt = '';

  await runWithSDK(sdk, 'Say hello world', {
    maxTurns: 1,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      UserPromptSubmit: [
        {
          hooks: [
            async (input) => {
              hookCalled = true;
              capturedPrompt = (input as UserPromptSubmitHookInput).prompt;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(hookCalled).toBe(true);
  expect(capturedPrompt).toContain('hello');
  console.log(`   [${sdk}] UserPromptSubmit called with prompt: ${capturedPrompt}`);
});

// =============================================================================
// TRIGGER-DEPENDENT: PostToolUseFailure
// Tested with: sandbox violations, nonexistent files, denied permissions.
// None trigger this hook — CLI treats all tool errors as successful responses
// with error content, not as "failures". Denied permissions skip post-tool
// hooks entirely. This hook likely only fires for internal tool crashes or
// process interrupts — hard to trigger reliably. Identical in both SDKs.
// =============================================================================

testWithBothSDKsTodo('PostToolUseFailure hook fires on tool execution failure', async (sdk) => {
  let failureHookCalled = false;

  await runWithSDK(sdk, 'Read the file /etc/passwd', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: autoApprove,
    sandbox: { enabled: true },
    hooks: {
      PostToolUseFailure: [
        {
          hooks: [
            async (_input: HookInput) => {
              failureHookCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(failureHookCalled).toBe(true);
});

// =============================================================================
// DECLARATIVE-ONLY: SessionStart / SessionEnd
// These hooks only fire via .claude/settings.json, NOT programmatic hooks.
// Known official SDK limitation: github.com/anthropics/claude-agent-sdk-typescript/issues/83
// =============================================================================

testWithBothSDKsTodo('SessionStart hook is called at session start', async (sdk) => {
  let sessionStartCalled = false;

  await runWithSDK(sdk, 'Say hello', {
    maxTurns: 1,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      SessionStart: [
        {
          hooks: [
            async (_input: HookInput) => {
              sessionStartCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  // Note: Won't fire programmatically — requires declarative config
  expect(sessionStartCalled).toBe(true);
});

testWithBothSDKsTodo('SessionEnd hook is called at session end', async (sdk) => {
  let sessionEndCalled = false;

  await runWithSDK(sdk, 'Say hello', {
    maxTurns: 1,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      SessionEnd: [
        {
          hooks: [
            async (_input: HookInput) => {
              sessionEndCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  // Note: Won't fire programmatically — requires declarative config
  expect(sessionEndCalled).toBe(true);
});

// =============================================================================
// TRIGGER-DEPENDENT: Notification
// Fires for agent status messages — not guaranteed in short sessions
// =============================================================================

testWithBothSDKsTodo('Notification hook receives agent notifications', async (sdk) => {
  let notificationCalled = false;

  await runWithSDK(sdk, 'Do a complex task that would generate notifications', {
    maxTurns: 5,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      Notification: [
        {
          hooks: [
            async (_input: HookInput) => {
              notificationCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(notificationCalled).toBe(true);
});

// =============================================================================
// RELIABLY FIRING: PermissionRequest
// Fires before canUseTool for tools that need permission (e.g. Write).
// Read-only tools like Read are auto-allowed and don't trigger this hook.
// Order: PreToolUse → PermissionRequest → canUseTool
// =============================================================================

testWithBothSDKs('PermissionRequest hook fires for permission prompts', async (sdk) => {
  let permissionRequestCalled = false;

  await runWithSDK(sdk, 'Write the text "hello" to the file /tmp/hook-perm-test.txt', {
    maxTurns: 3,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      PermissionRequest: [
        {
          hooks: [
            async (_input: HookInput) => {
              permissionRequestCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(permissionRequestCalled).toBe(true);
  console.log(`   [${sdk}] PermissionRequest hook was called`);
});

// =============================================================================
// TRIGGER-DEPENDENT: SubagentStart / SubagentStop
// Requires Task tool spawning a subagent — expensive
// =============================================================================

testWithBothSDKsTodo('SubagentStart hook is called when subagent starts', async (sdk) => {
  let subagentStartCalled = false;

  await runWithSDK(sdk, 'Use the Task tool to have an agent research TypeScript best practices', {
    maxTurns: 5,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      SubagentStart: [
        {
          hooks: [
            async (_input: HookInput) => {
              subagentStartCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(subagentStartCalled).toBe(true);
});

testWithBothSDKsTodo('SubagentStop hook is called when subagent stops', async (sdk) => {
  let subagentStopCalled = false;

  await runWithSDK(sdk, 'Use the Task tool to have an agent say hello', {
    maxTurns: 5,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      SubagentStop: [
        {
          hooks: [
            async (_input: HookInput) => {
              subagentStopCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(subagentStopCalled).toBe(true);
});

// =============================================================================
// TRIGGER-DEPENDENT: PreCompact
// Requires long conversation approaching context limit
// =============================================================================

testWithBothSDKsTodo('PreCompact hook is called before context compaction', async (sdk) => {
  let preCompactCalled = false;

  await runWithSDK(sdk, 'Hello', {
    maxTurns: 2,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      PreCompact: [
        {
          hooks: [
            async (_input: HookInput) => {
              preCompactCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(preCompactCalled).toBe(true);
});

// =============================================================================
// TRIGGER-DEPENDENT: TeammateIdle (SDK 0.2.34+)
// Requires team features with multiple agents
// =============================================================================

testWithBothSDKsTodo('TeammateIdle hook fires when teammate is idle', async (sdk) => {
  let teammateIdleCalled = false;

  await runWithSDK(sdk, 'Hello', {
    maxTurns: 2,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      TeammateIdle: [
        {
          hooks: [
            async (_input: HookInput) => {
              teammateIdleCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(teammateIdleCalled).toBe(true);
});

// =============================================================================
// TRIGGER-DEPENDENT: TaskCompleted (SDK 0.2.34+)
// Requires task completion in team context
// =============================================================================

testWithBothSDKsTodo('TaskCompleted hook fires when task completes', async (sdk) => {
  let taskCompletedCalled = false;

  await runWithSDK(sdk, 'Hello', {
    maxTurns: 2,
    permissionMode: 'default',
    canUseTool: autoApprove,
    hooks: {
      TaskCompleted: [
        {
          hooks: [
            async (_input: HookInput) => {
              taskCompletedCalled = true;
              return {};
            },
          ],
        },
      ],
    },
  });

  expect(taskCompletedCalled).toBe(true);
});
