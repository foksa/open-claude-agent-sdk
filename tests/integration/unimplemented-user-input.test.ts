/**
 * Tests for user input features NOT YET fully tested in lite SDK
 *
 * These tests document the expected behavior based on official SDK documentation.
 * They cover canUseTool callback and AskUserQuestion tool handling.
 *
 * Official documentation: docs/official-agent-sdk-docs/user-input.md
 *
 * Features to test:
 * - canUseTool callback for tool approval
 * - AskUserQuestion tool for clarifying questions
 * - Permission result types (allow/deny)
 * - Input modification (updatedInput)
 * - Tool input context (suggestions, blockedPath, etc.)
 */

import { describe, expect } from 'bun:test';
import { runWithSDK, testWithBothSDKs, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// canUseTool Callback - Basic
// =============================================================================

describe('canUseTool - Basic approval', () => {
  /**
   * From docs:
   * - canUseTool fires when tool needs permission
   * - Receives toolName and input arguments
   * - Returns { behavior: 'allow', updatedInput } or { behavior: 'deny', message }
   */
  testWithBothSDKs('should receive canUseTool callback', async (sdk) => {
    const toolRequests: Array<{ toolName: string; input: any }> = [];

    await runWithSDK(sdk, 'Read the package.json file', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        toolRequests.push({ toolName, input });
        return { behavior: 'allow', updatedInput: input };
      },
    });

    console.log(`   [${sdk}] canUseTool calls:`, toolRequests.length);
    // Note: May not fire in all cases depending on permission mode
  });

  testWithBothSDKs('should allow tool execution with allow behavior', async (sdk) => {
    let wasAllowed = false;

    const messages = await runWithSDK(sdk, 'Read the package.json file', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Read') {
          wasAllowed = true;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    console.log(`   [${sdk}] Read allowed:`, wasAllowed);
  });

  testWithBothSDKs('should block tool execution with deny behavior', async (sdk) => {
    let _wasDenied = false;
    let deniedToolName: string | null = null;

    await runWithSDK(sdk, 'Read the package.json file', {
      maxTurns: 3,
      canUseTool: async (toolName, _input) => {
        _wasDenied = true;
        deniedToolName = toolName;
        return { behavior: 'deny', message: 'Tool denied for testing' };
      },
    });

    console.log(`   [${sdk}] Tool denied:`, deniedToolName);
  });
});

// =============================================================================
// canUseTool - Input Modification
// =============================================================================

describe('canUseTool - Input modification', () => {
  /**
   * From docs:
   * - Can modify tool input via updatedInput
   * - Useful for sanitizing paths, adding constraints, redirecting
   */
  testWithBothSDKsTodo('should allow modifying tool input', async (sdk) => {
    let originalCommand: string | null = null;
    let modifiedCommand: string | null = null;

    await runWithSDK(sdk, 'Run the command: echo "hello"', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Bash') {
          originalCommand = input.command;
          // Modify command to sandbox
          const sandboxedInput = {
            ...input,
            command: input.command.replace('/tmp', '/tmp/sandbox'),
          };
          modifiedCommand = sandboxedInput.command;
          return { behavior: 'allow', updatedInput: sandboxedInput };
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    console.log(`   [${sdk}] Original:`, originalCommand, 'Modified:', modifiedCommand);
  });

  testWithBothSDKsTodo('should redirect file paths via updatedInput', async (sdk) => {
    let redirectedPath: string | null = null;

    await runWithSDK(sdk, 'Write "test" to /tmp/test-file.txt', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Write') {
          const sandboxedInput = {
            ...input,
            file_path: `/tmp/sandbox${input.file_path}`,
          };
          redirectedPath = sandboxedInput.file_path;
          return { behavior: 'allow', updatedInput: sandboxedInput };
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(redirectedPath).toContain('/tmp/sandbox');
  });
});

// =============================================================================
// canUseTool - Context Information
// =============================================================================

describe('canUseTool - Context information', () => {
  /**
   * From docs:
   * - Third argument is context: { signal, suggestions, blockedPath, decisionReason, toolUseID, agentID }
   */
  testWithBothSDKsTodo('should receive context with AbortSignal', async (sdk) => {
    let hasSignal = false;

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 3,
      canUseTool: async (_toolName, input, context) => {
        if (context?.signal) {
          hasSignal = true;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(hasSignal).toBe(true);
  });

  testWithBothSDKsTodo('should receive toolUseID for correlation', async (sdk) => {
    let receivedToolUseID: string | null = null;

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 3,
      canUseTool: async (_toolName, input, context) => {
        receivedToolUseID = context?.toolUseID || null;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(receivedToolUseID).toBeTruthy();
  });

  testWithBothSDKsTodo('should receive permission_suggestions', async (sdk) => {
    let receivedSuggestions: any = null;

    await runWithSDK(sdk, 'Write "test" to /tmp/test.txt', {
      maxTurns: 3,
      canUseTool: async (_toolName, input, context) => {
        receivedSuggestions = context?.suggestions;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    // Suggestions may contain recommended permission updates
    console.log(`   [${sdk}] Received suggestions:`, !!receivedSuggestions);
  });
});

// =============================================================================
// AskUserQuestion Tool
// =============================================================================

describe('AskUserQuestion - Clarifying questions', () => {
  /**
   * From docs:
   * - Claude uses AskUserQuestion tool for clarifying questions
   * - Triggers canUseTool with toolName === 'AskUserQuestion'
   * - Input contains questions array with question, header, options, multiSelect
   * - Return answers object mapping question text to selected option label
   */
  testWithBothSDKsTodo('should detect AskUserQuestion tool', async (sdk) => {
    let askUserQuestionReceived = false;

    await runWithSDK(sdk, 'Help me decide on the tech stack for a new mobile app', {
      maxTurns: 10,
      permissionMode: 'plan', // Plan mode encourages clarifying questions
      canUseTool: async (toolName, input) => {
        if (toolName === 'AskUserQuestion') {
          askUserQuestionReceived = true;
          // Return answers
          const answers: Record<string, string> = {};
          for (const q of input.questions || []) {
            answers[q.question] = q.options?.[0]?.label || 'Default';
          }
          return {
            behavior: 'allow',
            updatedInput: { questions: input.questions, answers },
          };
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    console.log(`   [${sdk}] AskUserQuestion received:`, askUserQuestionReceived);
  });

  testWithBothSDKsTodo('should handle questions array structure', async (sdk) => {
    let questionsReceived: any[] = [];

    await runWithSDK(sdk, 'Help me decide how to structure my project', {
      maxTurns: 10,
      permissionMode: 'plan',
      canUseTool: async (toolName, input) => {
        if (toolName === 'AskUserQuestion') {
          questionsReceived = input.questions || [];

          // Answer all questions with first option
          const answers: Record<string, string> = {};
          for (const q of questionsReceived) {
            answers[q.question] = q.options?.[0]?.label || 'Option 1';
          }
          return {
            behavior: 'allow',
            updatedInput: { questions: input.questions, answers },
          };
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    // Verify question structure
    if (questionsReceived.length > 0) {
      const firstQuestion = questionsReceived[0];
      expect(firstQuestion.question).toBeTruthy();
      expect(firstQuestion.header).toBeTruthy();
      expect(Array.isArray(firstQuestion.options)).toBe(true);
      expect(typeof firstQuestion.multiSelect).toBe('boolean');
    }
  });

  testWithBothSDKsTodo('should support multiSelect questions', async (sdk) => {
    let multiSelectQuestion: any = null;

    await runWithSDK(sdk, 'Help me decide which features to include in my app', {
      maxTurns: 10,
      permissionMode: 'plan',
      canUseTool: async (toolName, input) => {
        if (toolName === 'AskUserQuestion') {
          for (const q of input.questions || []) {
            if (q.multiSelect) {
              multiSelectQuestion = q;
            }
          }

          const answers: Record<string, string> = {};
          for (const q of input.questions || []) {
            if (q.multiSelect) {
              // Join multiple selections with comma
              answers[q.question] = q.options
                ?.slice(0, 2)
                .map((o: any) => o.label)
                .join(', ');
            } else {
              answers[q.question] = q.options?.[0]?.label;
            }
          }
          return {
            behavior: 'allow',
            updatedInput: { questions: input.questions, answers },
          };
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    console.log(`   [${sdk}] MultiSelect question found:`, !!multiSelectQuestion);
  });

  testWithBothSDKsTodo('should support free-text answers', async (sdk) => {
    await runWithSDK(sdk, 'Help me name my project', {
      maxTurns: 10,
      permissionMode: 'plan',
      canUseTool: async (toolName, input) => {
        if (toolName === 'AskUserQuestion') {
          const answers: Record<string, string> = {};
          for (const q of input.questions || []) {
            // Use free text instead of predefined option
            answers[q.question] = 'MyCustomProjectName';
          }
          return {
            behavior: 'allow',
            updatedInput: { questions: input.questions, answers },
          };
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    // Should complete without error
    expect(true).toBe(true);
  });
});

// =============================================================================
// Tool Input Types
// =============================================================================

describe('canUseTool - Tool input types', () => {
  /**
   * From docs:
   * Different tools have different input fields:
   * - Bash: command, description, timeout
   * - Write: file_path, content
   * - Edit: file_path, old_string, new_string
   * - Read: file_path, offset, limit
   */
  testWithBothSDKsTodo('should receive Bash tool input fields', async (sdk) => {
    let bashInput: any = null;

    await runWithSDK(sdk, 'Run: echo hello', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Bash') {
          bashInput = input;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    if (bashInput) {
      expect(bashInput.command).toBeTruthy();
      // description is optional
      // timeout is optional
    }
  });

  testWithBothSDKsTodo('should receive Write tool input fields', async (sdk) => {
    let writeInput: any = null;

    await runWithSDK(sdk, 'Write "test" to /tmp/test.txt', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Write') {
          writeInput = input;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    if (writeInput) {
      expect(writeInput.file_path).toBeTruthy();
      expect(writeInput.content).toBeTruthy();
    }
  });

  testWithBothSDKsTodo('should receive Edit tool input fields', async (sdk) => {
    let editInput: any = null;

    await runWithSDK(sdk, 'Edit package.json to change the version from current to 2.0.0', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Edit') {
          editInput = input;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    if (editInput) {
      expect(editInput.file_path).toBeTruthy();
      expect(editInput.old_string).toBeTruthy();
      expect(editInput.new_string).toBeTruthy();
    }
  });

  testWithBothSDKsTodo('should receive Read tool input fields', async (sdk) => {
    let readInput: any = null;

    await runWithSDK(sdk, 'Read the first 10 lines of package.json', {
      maxTurns: 5,
      canUseTool: async (toolName, input) => {
        if (toolName === 'Read') {
          readInput = input;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    });

    if (readInput) {
      expect(readInput.file_path).toBeTruthy();
      // offset and limit are optional
    }
  });
});

// =============================================================================
// Alternative User Input Methods
// =============================================================================

describe('User input - Alternative methods', () => {
  /**
   * From docs:
   * Other ways to get user input:
   * - streamInput() for follow-up messages during execution
   * - Custom tools for structured input beyond AskUserQuestion
   */
  testWithBothSDKsTodo('should use streamInput for follow-up messages', async (_sdk) => {
    // streamInput allows sending additional messages during execution
    // This is covered in multi-turn tests but documented here for completeness
    expect(true).toBe(true); // Placeholder
  });

  testWithBothSDKsTodo('should work with custom tools for structured input', async (_sdk) => {
    // Custom tools (via MCP) can provide richer input interfaces
    expect(true).toBe(true); // Placeholder
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('canUseTool - Edge cases', () => {
  testWithBothSDKsTodo('should handle rapid tool requests', async (sdk) => {
    let toolCount = 0;

    await runWithSDK(sdk, 'List all files in the current directory', {
      maxTurns: 10,
      canUseTool: async (_toolName, input) => {
        toolCount++;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    console.log(`   [${sdk}] Total tool requests:`, toolCount);
  });

  testWithBothSDKsTodo('should handle async operations in callback', async (sdk) => {
    let asyncComplete = false;

    await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 5,
      canUseTool: async (_toolName, input) => {
        // Simulate async operation (e.g., external API call)
        await new Promise((resolve) => setTimeout(resolve, 100));
        asyncComplete = true;
        return { behavior: 'allow', updatedInput: input };
      },
    });

    expect(asyncComplete).toBe(true);
  });

  testWithBothSDKsTodo('should handle errors in callback gracefully', async (sdk) => {
    // What happens if canUseTool throws an error?
    try {
      await runWithSDK(sdk, 'Read package.json', {
        maxTurns: 3,
        canUseTool: async (_toolName, _input) => {
          throw new Error('Simulated callback error');
        },
      });
    } catch (error) {
      // Should handle gracefully
      expect(error).toBeTruthy();
    }
  });
});
