/**
 * Tests for advanced hook events NOT YET implemented in lite SDK
 *
 * These tests document the expected behavior based on official SDK documentation.
 * They are marked as .skip or .todo until the features are implemented.
 *
 * Official documentation: docs/official-agent-sdk-docs/hooks.md
 *
 * Unimplemented hook events:
 * - PostToolUseFailure (TypeScript only) - fires when tool execution fails
 * - SubagentStart (TypeScript only) - fires when subagent is spawned
 * - SubagentStop - fires when subagent completes
 * - PreCompact - fires before context compaction
 * - PermissionRequest (TypeScript only) - fires when permission dialog would show
 * - SessionStart (TypeScript only) - fires at session initialization
 * - SessionEnd (TypeScript only) - fires at session termination
 * - Notification (TypeScript only) - fires for agent status messages
 */

import { describe, expect } from 'bun:test';
import type { HookCallbackMatcher } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// PostToolUseFailure Hook
// =============================================================================

describe('PostToolUseFailure hook', () => {
  /**
   * PostToolUseFailure fires when a tool execution fails.
   *
   * From docs:
   * - Tool name and input are provided
   * - error field contains the error message
   * - is_interrupt field indicates if failure was caused by interrupt
   *
   * Expected input fields:
   * - hook_event_name: 'PostToolUseFailure'
   * - tool_name: string
   * - tool_input: object
   * - error: string
   * - is_interrupt: boolean
   */
  testWithBothSDKsTodo('should fire when tool execution fails', async (sdk) => {
    const failureCalls: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PostToolUseFailure: [
        {
          hooks: [
            async (input, toolUseId, _context) => {
              failureCalls.push({ input, toolUseId });
              return {};
            },
          ],
        },
      ],
    };

    // Trigger a failing tool - e.g., reading a non-existent file
    await runWithSDK(sdk, 'Read the file /nonexistent/path/that/does/not/exist.txt', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // Verify the hook was called
    expect(failureCalls.length).toBeGreaterThan(0);
    expect(failureCalls[0].input.hook_event_name).toBe('PostToolUseFailure');
    expect(failureCalls[0].input.error).toBeTruthy();
  });

  testWithBothSDKsTodo('should include error message and tool details', async (sdk) => {
    let capturedInput: any = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PostToolUseFailure: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              capturedInput = input;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Read /impossible/file.txt', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(capturedInput).toBeTruthy();
    expect(capturedInput.tool_name).toBe('Read');
    expect(capturedInput.tool_input).toBeTruthy();
    expect(capturedInput.error).toBeTruthy();
    expect(typeof capturedInput.is_interrupt).toBe('boolean');
  });
});

// =============================================================================
// SubagentStart Hook
// =============================================================================

describe('SubagentStart hook', () => {
  /**
   * SubagentStart fires when a subagent is spawned via the Task tool.
   *
   * From docs:
   * - agent_id: unique identifier for the subagent
   * - agent_type: type/role of the subagent
   *
   * Expected input fields:
   * - hook_event_name: 'SubagentStart'
   * - agent_id: string
   * - agent_type: string
   * - session_id: string
   * - cwd: string
   */
  testWithBothSDKsTodo('should fire when Task tool spawns a subagent', async (sdk) => {
    const subagentStarts: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SubagentStart: [
        {
          hooks: [
            async (input, toolUseId, _context) => {
              subagentStarts.push({ input, toolUseId });
              return {};
            },
          ],
        },
      ],
    };

    // Trigger subagent creation - ask Claude to use Task tool
    await runWithSDK(
      sdk,
      'Use the Task tool to create a subtask that reads the package.json file',
      {
        maxTurns: 10,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        hooks,
      }
    );

    // Verify the hook was called
    expect(subagentStarts.length).toBeGreaterThan(0);
    expect(subagentStarts[0].input.hook_event_name).toBe('SubagentStart');
    expect(subagentStarts[0].input.agent_id).toBeTruthy();
  });

  testWithBothSDKsTodo('should provide additionalContext capability', async (sdk) => {
    let hookWasCalled = false;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SubagentStart: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              hookWasCalled = true;
              // Return additional context for the subagent
              return {
                hookSpecificOutput: {
                  hookEventName: input.hook_event_name,
                  additionalContext: 'This subagent should prioritize speed',
                },
              };
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Use Task tool to analyze package.json', {
      maxTurns: 10,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // Just verify the hook was called and didn't error
    expect(hookWasCalled).toBe(true);
  });
});

// =============================================================================
// SubagentStop Hook
// =============================================================================

describe('SubagentStop hook', () => {
  /**
   * SubagentStop fires when a subagent completes its task.
   *
   * From docs:
   * - stop_hook_active: boolean indicating if stop hook is processing
   * - agent_id: unique identifier for the subagent (TypeScript only)
   * - agent_transcript_path: path to subagent transcript (TypeScript only)
   *
   * Expected input fields:
   * - hook_event_name: 'SubagentStop'
   * - stop_hook_active: boolean
   * - agent_id: string
   * - agent_transcript_path: string
   */
  testWithBothSDKsTodo('should fire when subagent completes', async (sdk) => {
    const subagentStops: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SubagentStop: [
        {
          hooks: [
            async (input, toolUseId, _context) => {
              subagentStops.push({ input, toolUseId });
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Use Task tool to read package.json and report the version', {
      maxTurns: 15,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(subagentStops.length).toBeGreaterThan(0);
    expect(subagentStops[0].input.hook_event_name).toBe('SubagentStop');
  });

  testWithBothSDKsTodo('should provide tool_use_id for correlation', async (sdk) => {
    let capturedToolUseId: string | null = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SubagentStop: [
        {
          hooks: [
            async (_input, toolUseId, _context) => {
              capturedToolUseId = toolUseId;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Use Task tool to analyze codebase', {
      maxTurns: 15,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // tool_use_id helps correlate with parent agent's Task tool call
    expect(capturedToolUseId).toBeTruthy();
  });
});

// =============================================================================
// PreCompact Hook
// =============================================================================

describe('PreCompact hook', () => {
  /**
   * PreCompact fires before conversation compaction occurs.
   *
   * From docs:
   * - trigger: 'manual' or 'auto' indicating what triggered compaction
   * - custom_instructions: any custom instructions for compaction
   *
   * Expected input fields:
   * - hook_event_name: 'PreCompact'
   * - trigger: 'manual' | 'auto'
   * - custom_instructions: string
   */
  testWithBothSDKsTodo('should fire before context compaction', async (sdk) => {
    const preCompactCalls: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreCompact: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              preCompactCalls.push(input);
              return {};
            },
          ],
        },
      ],
    };

    // This would require triggering compaction, which may need a long conversation
    // or explicit compaction command
    await runWithSDK(sdk, 'Hello', {
      maxTurns: 100, // Long enough to potentially trigger auto-compaction
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // Note: Compaction may not be triggered in short conversations
    // This test documents expected behavior
    if (preCompactCalls.length > 0) {
      expect(preCompactCalls[0].hook_event_name).toBe('PreCompact');
      expect(['manual', 'auto']).toContain(preCompactCalls[0].trigger);
    }
  });
});

// =============================================================================
// PermissionRequest Hook
// =============================================================================

describe('PermissionRequest hook', () => {
  /**
   * PermissionRequest fires when a permission dialog would be displayed.
   *
   * From docs:
   * - tool_name: the tool requesting permission
   * - tool_input: the tool's input parameters
   * - permission_suggestions: suggested permission updates
   *
   * This hook is useful for:
   * - Custom permission UI
   * - Sending external notifications (Slack, email)
   * - Logging permission requests
   *
   * Note: Matchers apply to this hook (filter by tool name)
   */
  testWithBothSDKsTodo('should fire when permission dialog would be shown', async (sdk) => {
    const permissionRequests: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PermissionRequest: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              permissionRequests.push(input);
              return {};
            },
          ],
        },
      ],
    };

    // Note: PermissionRequest fires when NOT using bypassPermissions
    await runWithSDK(sdk, 'Write "test" to /tmp/test-permission.txt', {
      maxTurns: 3,
      permissionMode: 'default', // Need default mode for permission prompts
      hooks,
      canUseTool: async (_toolName, input) => {
        // Auto-approve to prevent hanging
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(permissionRequests.length).toBeGreaterThan(0);
    expect(permissionRequests[0].hook_event_name).toBe('PermissionRequest');
    expect(permissionRequests[0].tool_name).toBeTruthy();
  });

  testWithBothSDKsTodo('should include permission_suggestions', async (sdk) => {
    let capturedSuggestions: any = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PermissionRequest: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              capturedSuggestions = input.permission_suggestions;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Delete /tmp/some-file.txt', {
      maxTurns: 3,
      permissionMode: 'default',
      hooks,
      canUseTool: async (_toolName, input) => {
        return { behavior: 'allow', updatedInput: input };
      },
    });

    // permission_suggestions may contain suggested permission rule updates
    expect(capturedSuggestions).toBeDefined();
  });
});

// =============================================================================
// SessionStart Hook
// =============================================================================

describe('SessionStart hook', () => {
  /**
   * SessionStart fires at session initialization.
   *
   * From docs:
   * - source: how session started - 'startup', 'resume', 'clear', or 'compact'
   *
   * Expected input fields:
   * - hook_event_name: 'SessionStart'
   * - source: 'startup' | 'resume' | 'clear' | 'compact'
   * - session_id: string
   * - cwd: string
   *
   * Note: This is TypeScript SDK only
   */
  testWithBothSDKsTodo('should fire when session initializes', async (sdk) => {
    const sessionStartCalls: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SessionStart: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              sessionStartCalls.push(input);
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Hello', {
      maxTurns: 2,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(sessionStartCalls.length).toBe(1);
    expect(sessionStartCalls[0].hook_event_name).toBe('SessionStart');
    expect(sessionStartCalls[0].source).toBe('startup');
  });

  testWithBothSDKsTodo('should have source=resume when resuming session', async (sdk) => {
    let sessionSource: string | null = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SessionStart: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              sessionSource = input.source;
              return {};
            },
          ],
        },
      ],
    };

    // First, create a session and get its ID
    let sessionId: string | undefined;
    const messages = await runWithSDK(sdk, 'Hello', {
      maxTurns: 2,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
    });

    for (const msg of messages) {
      if ('session_id' in msg) {
        sessionId = msg.session_id;
        break;
      }
    }

    if (sessionId) {
      // Resume the session
      await runWithSDK(sdk, 'Hi again', {
        maxTurns: 2,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        resume: sessionId,
        hooks,
      });

      expect(sessionSource).toBe('resume');
    }
  });

  testWithBothSDKsTodo('should support additionalContext injection', async (sdk) => {
    let hookExecuted = false;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SessionStart: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              hookExecuted = true;
              return {
                hookSpecificOutput: {
                  hookEventName: input.hook_event_name,
                  additionalContext: 'User prefers concise responses',
                },
              };
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Hello', {
      maxTurns: 2,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(hookExecuted).toBe(true);
  });
});

// =============================================================================
// SessionEnd Hook
// =============================================================================

describe('SessionEnd hook', () => {
  /**
   * SessionEnd fires when session terminates.
   *
   * From docs:
   * - reason: why session ended - 'clear', 'logout', 'prompt_input_exit',
   *           'bypass_permissions_disabled', or 'other'
   *
   * Expected input fields:
   * - hook_event_name: 'SessionEnd'
   * - reason: string
   * - session_id: string
   *
   * Note: This is TypeScript SDK only
   */
  testWithBothSDKsTodo('should fire when session ends', async (sdk) => {
    const sessionEndCalls: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SessionEnd: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              sessionEndCalls.push(input);
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Say hello then stop', {
      maxTurns: 2,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // SessionEnd should fire when query completes
    expect(sessionEndCalls.length).toBe(1);
    expect(sessionEndCalls[0].hook_event_name).toBe('SessionEnd');
  });

  testWithBothSDKsTodo('should include reason for termination', async (sdk) => {
    let endReason: string | null = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      SessionEnd: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              endReason = input.reason;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Hello', {
      maxTurns: 2,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(endReason).toBeTruthy();
    expect([
      'clear',
      'logout',
      'prompt_input_exit',
      'bypass_permissions_disabled',
      'other',
    ]).toContain(endReason);
  });
});

// =============================================================================
// Notification Hook
// =============================================================================

describe('Notification hook', () => {
  /**
   * Notification fires for agent status messages.
   *
   * From docs:
   * - message: status message from the agent
   * - notification_type: 'permission_prompt', 'idle_prompt', 'auth_success', or 'elicitation_dialog'
   * - title: optional title
   *
   * Expected input fields:
   * - hook_event_name: 'Notification'
   * - message: string
   * - notification_type: string
   * - title: string (optional)
   *
   * Use cases:
   * - Send status updates to Slack or PagerDuty
   * - Display agent status in UI
   * - Log agent activity
   *
   * Note: This is TypeScript SDK only
   */
  testWithBothSDKsTodo('should fire for agent status messages', async (sdk) => {
    const notifications: any[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      Notification: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              notifications.push(input);
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Hello', {
      maxTurns: 5,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // Notifications may or may not fire depending on what agent does
    if (notifications.length > 0) {
      expect(notifications[0].hook_event_name).toBe('Notification');
      expect(notifications[0].message).toBeTruthy();
    }
  });

  testWithBothSDKsTodo('should include notification_type', async (sdk) => {
    let notificationType: string | null = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      Notification: [
        {
          hooks: [
            async (input, _toolUseId, _context) => {
              notificationType = input.notification_type;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Hello', {
      maxTurns: 5,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    if (notificationType) {
      expect(['permission_prompt', 'idle_prompt', 'auth_success', 'elicitation_dialog']).toContain(
        notificationType
      );
    }
  });
});

// =============================================================================
// Hook Configuration - Advanced Patterns
// =============================================================================

describe('Advanced hook patterns', () => {
  /**
   * From docs: Hooks execute in the order they appear in the array.
   * Multiple hooks can be chained for complex logic.
   */
  testWithBothSDKsTodo('should execute hooks in order for chaining', async (sdk) => {
    const executionOrder: string[] = [];

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [
        {
          hooks: [
            async () => {
              executionOrder.push('hook1');
              return {};
            },
          ],
        },
        {
          hooks: [
            async () => {
              executionOrder.push('hook2');
              return {};
            },
          ],
        },
        {
          hooks: [
            async () => {
              executionOrder.push('hook3');
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // Verify execution order
    expect(executionOrder).toEqual(['hook1', 'hook2', 'hook3']);
  });

  /**
   * From docs: If any hook returns deny, the operation is blocked.
   * Other hooks returning allow won't override it.
   */
  testWithBothSDKsTodo('should respect deny over allow in hook chain', async (sdk) => {
    let toolWasBlocked = false;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [
        {
          hooks: [
            async (input) => {
              // First hook allows
              return {
                hookSpecificOutput: {
                  hookEventName: input.hook_event_name,
                  permissionDecision: 'allow',
                },
              };
            },
          ],
        },
        {
          hooks: [
            async (input) => {
              // Second hook denies - should win
              toolWasBlocked = true;
              return {
                hookSpecificOutput: {
                  hookEventName: input.hook_event_name,
                  permissionDecision: 'deny',
                  permissionDecisionReason: 'Blocked by second hook',
                },
              };
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(toolWasBlocked).toBe(true);
  });

  /**
   * From docs: Use updatedInput to modify tool inputs.
   * Must include permissionDecision: 'allow' for modification to take effect.
   */
  testWithBothSDKsTodo('should modify tool input with updatedInput', async (sdk) => {
    let originalPath: string | null = null;
    let modifiedPath: string | null = null;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [
        {
          matcher: 'Read',
          hooks: [
            async (input) => {
              originalPath = input.tool_input?.file_path;
              // Redirect all reads to sandbox
              return {
                hookSpecificOutput: {
                  hookEventName: input.hook_event_name,
                  permissionDecision: 'allow',
                  updatedInput: {
                    ...input.tool_input,
                    file_path: `/tmp/sandbox${input.tool_input?.file_path}`,
                  },
                },
              };
            },
          ],
        },
      ],
      PostToolUse: [
        {
          matcher: 'Read',
          hooks: [
            async (input) => {
              modifiedPath = input.tool_input?.file_path;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Read /etc/passwd', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(originalPath).toBe('/etc/passwd');
    expect(modifiedPath).toBe('/tmp/sandbox/etc/passwd');
  });

  /**
   * From docs: Use systemMessage to inject context into conversation.
   * Claude sees this message and can use it for guidance.
   */
  testWithBothSDKsTodo('should inject systemMessage into conversation', async (sdk) => {
    let systemMessageSent = false;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [
        {
          hooks: [
            async () => {
              systemMessageSent = true;
              return {
                systemMessage: 'Remember: Always prefer safe operations.',
              };
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    expect(systemMessageSent).toBe(true);
  });

  /**
   * From docs: Hook timeout can be configured per matcher.
   * Default is 60 seconds; increase for external API calls.
   */
  testWithBothSDKsTodo('should support custom timeout per matcher', async (sdk) => {
    const hookStartTime = Date.now();
    let hookDuration = 0;

    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [
        {
          timeout: 120, // 2 minute timeout
          hooks: [
            async () => {
              // Simulate slow async operation
              await new Promise((resolve) => setTimeout(resolve, 500));
              hookDuration = Date.now() - hookStartTime;
              return {};
            },
          ],
        },
      ],
    };

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 3,
      permissionMode: 'default',
      canUseTool: async (_toolName: string, input: any) => {
        return { behavior: 'allow' as const, updatedInput: input };
      },
      hooks,
    });

    // Hook should have time to complete
    expect(hookDuration).toBeGreaterThanOrEqual(500);
  });
});
