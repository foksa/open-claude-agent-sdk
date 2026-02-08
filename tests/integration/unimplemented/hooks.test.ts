/**
 * Todo tests for hook events requiring specific triggers
 *
 * Implemented hook tests are in tests/integration/hooks.test.ts.
 * These tests document hook events that require triggers not practical
 * in standard integration tests (subagents, compaction, teams, etc.)
 *
 * Hook events that only work declaratively (.claude/settings.json):
 *   - SessionStart/SessionEnd — known limitation in official SDK
 *     See: github.com/anthropics/claude-agent-sdk-typescript/issues/83
 */

import { expect } from 'bun:test';
import type { HookInput } from '../../../src/types/index.ts';
import { runWithSDK, testWithBothSDKsTodo } from '../comparison-utils.ts';

/** Auto-approve all tool usage */
const autoApprove = async (_toolName: string, input: Record<string, unknown>) => {
  return { behavior: 'allow' as const, updatedInput: input };
};

// =============================================================================
// TRIGGER-DEPENDENT: PostToolUseFailure
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

  expect(sessionEndCalled).toBe(true);
});

// =============================================================================
// TRIGGER-DEPENDENT: Notification
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
// SubagentStart / SubagentStop — moved to tests/integration/subagents.test.ts
// =============================================================================

// =============================================================================
// TRIGGER-DEPENDENT: PreCompact
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
