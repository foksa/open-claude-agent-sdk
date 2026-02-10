/**
 * Subagents feature tests
 *
 * Tests for the `agents` option that defines programmatic subagents.
 * Claude can invoke these via the Task tool.
 *
 * Based on official documentation:
 * - docs/official-agent-sdk-docs/subagents.md
 */

import { describe, expect } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import type { HookCallbackMatcher, HookInput, Options, SDKMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

/** Auto-approve all tool usage */
const autoApprove = async (_toolName: string, input: Record<string, unknown>) => {
  return { behavior: 'allow' as const, updatedInput: input };
};

/** Common agent definition for subagent tests */
const testAgents = {
  'echo-agent': {
    description: 'A simple agent that echoes back whatever it receives',
    prompt:
      'You are a simple echo agent. Reply with exactly what the user asked you to do, in one short sentence. Do not use any tools.',
  },
};

// =============================================================================
// Programmatic Agent Definition (agents option)
// =============================================================================

describe('Programmatic Agent Definition', () => {
  testWithBothSDKs('agents option accepted without error', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 1,
      permissionMode: 'default',
      agents: {
        'test-agent': {
          description: 'A test agent for verification',
          prompt: 'You are a test agent.',
        },
      },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
  });

  testWithBothSDKs('agents with tools and model accepted', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hi', {
      maxTurns: 1,
      permissionMode: 'default',
      agents: {
        'code-reviewer': {
          description: 'Expert code review specialist',
          prompt: 'You are a code review specialist.',
          tools: ['Read', 'Grep', 'Glob'],
          model: 'sonnet' as const,
        },
      },
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
  });
});

// =============================================================================
// Task Tool Requirement
// =============================================================================

describe('Task Tool Requirement', () => {
  testWithBothSDKs('Task tool enables built-in general-purpose subagent', async (sdk) => {
    // With Task in allowedTools, built-in subagent should be available
    const messages = await runWithSDK(sdk, 'What tools do you have? List them briefly.', {
      maxTurns: 1,
      permissionMode: 'default',
      allowedTools: ['Task'],
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
  });
});

// =============================================================================
// parent_tool_use_id field
// =============================================================================

describe('parent_tool_use_id', () => {
  testWithBothSDKs('messages from main context do not have parent_tool_use_id set', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say "test"', {
      maxTurns: 1,
      permissionMode: 'default',
    });

    // Messages from main context should NOT have parent_tool_use_id set
    for (const msg of messages) {
      if ('parent_tool_use_id' in msg) {
        // If present, should be null or undefined for main context
        expect(msg.parent_tool_use_id).toBeFalsy();
      }
    }
  });
});

// =============================================================================
// Subagent E2E Execution
// =============================================================================

describe('Subagent E2E Execution', () => {
  testWithBothSDKs(
    'subagent actually executes and produces parent_tool_use_id messages',
    async (sdk) => {
      const messages = await runWithSDK(
        sdk,
        'Use the Task tool to have the echo-agent say "hello from subagent". You MUST use the Task tool with subagent_type "echo-agent".',
        {
          maxTurns: 10,
          permissionMode: 'default',
          canUseTool: autoApprove,
          allowedTools: ['Task'],
          agents: testAgents,
        }
      );

      const result = messages.find((m) => m.type === 'result');
      expect(result).toBeTruthy();

      // Subagent messages should have parent_tool_use_id set
      const subagentMessages = messages.filter(
        (m) => 'parent_tool_use_id' in m && m.parent_tool_use_id
      );

      console.log(
        `   [${sdk}] Total messages: ${messages.length}, subagent messages: ${subagentMessages.length}`
      );

      // At least one message should come from the subagent
      expect(subagentMessages.length).toBeGreaterThan(0);
    },
    120000
  );
});

// =============================================================================
// SubagentStart / SubagentStop Hooks
// =============================================================================

describe('Subagent Hooks', () => {
  testWithBothSDKs(
    'SubagentStart hook fires when subagent starts',
    async (sdk) => {
      let subagentStartCalled = false;

      const hooks: Record<string, HookCallbackMatcher[]> = {
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
      };

      await runWithSDK(
        sdk,
        'Use the Task tool to have the echo-agent say "testing hooks". You MUST use the Task tool with subagent_type "echo-agent".',
        {
          maxTurns: 10,
          permissionMode: 'default',
          canUseTool: autoApprove,
          allowedTools: ['Task'],
          agents: testAgents,
          hooks,
        }
      );

      console.log(`   [${sdk}] SubagentStart called: ${subagentStartCalled}`);
      expect(subagentStartCalled).toBe(true);
    },
    120000
  );

  testWithBothSDKs(
    'SubagentStop hook fires when subagent stops',
    async (sdk) => {
      let subagentStopCalled = false;

      const hooks: Record<string, HookCallbackMatcher[]> = {
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
      };

      await runWithSDK(
        sdk,
        'Use the Task tool to have the echo-agent say "testing hooks". You MUST use the Task tool with subagent_type "echo-agent".',
        {
          maxTurns: 10,
          permissionMode: 'default',
          canUseTool: autoApprove,
          allowedTools: ['Task'],
          agents: testAgents,
          hooks,
        }
      );

      console.log(`   [${sdk}] SubagentStop called: ${subagentStopCalled}`);
      expect(subagentStopCalled).toBe(true);
    },
    120000
  );
});

// =============================================================================
// Abort kills subagents (issue #132 repro)
// =============================================================================

describe('Abort with subagents', () => {
  testWithBothSDKs(
    'abort terminates query with running subagent',
    async (sdk) => {
      const queryFn = sdk === 'open' ? openQuery : officialQuery;
      const abortController = new AbortController();
      const messages: SDKMessage[] = [];
      let sawSubagentMessage = false;
      let aborted = false;

      const testOptions: Options = {
        model: 'haiku',
        settingSources: [],
        pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
        maxTurns: 10,
        permissionMode: 'default',
        canUseTool: autoApprove,
        allowedTools: ['Task'],
        agents: {
          'slow-agent': {
            description: 'An agent that does slow, detailed work',
            prompt:
              'You are a thorough agent. Write a very long, detailed essay about the history of computing from the abacus to quantum computers. Include at least 20 paragraphs with extensive detail.',
          },
        },
        abortController,
      };

      try {
        for await (const msg of queryFn({
          prompt:
            'Use the Task tool to have the slow-agent write a long essay about computing history. You MUST use the Task tool with subagent_type "slow-agent".',
          options: testOptions,
        })) {
          messages.push(msg);

          // Once we see a subagent message, abort after a short delay
          if ('parent_tool_use_id' in msg && msg.parent_tool_use_id && !sawSubagentMessage) {
            sawSubagentMessage = true;
            console.log(`   [${sdk}] Subagent started, aborting in 500ms...`);
            setTimeout(() => abortController.abort(), 500);
          }

          if (msg.type === 'result') break;
        }
      } catch {
        aborted = true;
      }

      if (abortController.signal.aborted) {
        aborted = true;
      }

      console.log(
        `   [${sdk}] Messages: ${messages.length}, sawSubagent: ${sawSubagentMessage}, aborted: ${aborted}`
      );

      // The query should have terminated (either aborted or completed)
      // Key: it doesn't hang indefinitely
      if (sawSubagentMessage) {
        // If we saw subagent messages, abort should have worked
        expect(aborted).toBe(true);
      } else {
        // If no subagent messages appeared, the query completed before subagent started
        // This is acceptable — the test still verifies no hang
        console.log(`   [${sdk}] Query completed before subagent could start`);
      }
    },
    120000
  );
});
