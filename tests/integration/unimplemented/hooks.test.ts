/**
 * Todo tests for hook events requiring specific triggers
 *
 * Implemented hook tests are in tests/integration/hooks.test.ts.
 * These tests document hook events that require triggers not practical
 * in standard integration tests (subagents, compaction, teams, etc.)
 *
 * Moved to hooks.test.ts (E2E tested):
 *   - Stop, PostToolUseFailure
 *
 * Moved to subagents.test.ts (E2E tested):
 *   - SubagentStart, SubagentStop
 *
 * Investigated but not testable programmatically:
 *   - Setup — does not fire via programmatic hooks (tested, confirmed)
 *   - Notification — does not fire when canUseTool handles permissions
 *   - PermissionRequest — does not fire when canUseTool handles permissions
 *   - SessionStart/SessionEnd — declarative only (official SDK issue #83)
 */

import { expect } from 'bun:test';
import type { HookInput } from '../../../src/types/index.ts';
import { runWithSDK, testWithBothSDKsTodo } from '../comparison-utils.ts';

/** Auto-approve all tool usage */
const autoApprove = async (_toolName: string, input: Record<string, unknown>) => {
  return { behavior: 'allow' as const, updatedInput: input };
};

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
// Notification — does not fire when canUseTool handles permissions (investigated)
// SubagentStart / SubagentStop — moved to tests/integration/subagents.test.ts
// Setup — does not fire via programmatic hooks (investigated)
// PermissionRequest — does not fire when canUseTool handles permissions (investigated)
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
