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
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

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
