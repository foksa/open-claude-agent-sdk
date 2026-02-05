/**
 * Subagents feature tests
 *
 * These tests document subagent features that exist in the official SDK but are
 * NOT YET implemented in the lite SDK. Tests are marked with .skip or .todo.
 *
 * Based on official documentation:
 * - docs/official-agent-sdk-docs/subagents.md
 *
 * Subagent Features to Implement:
 * 1. agents option - Programmatic subagent definitions
 * 2. AgentDefinition type - description, prompt, tools, model fields
 * 3. Task tool requirement - allowedTools must include "Task" for subagents
 * 4. Subagent invocation detection - parent_tool_use_id field
 * 5. Subagent resumption - agentId extraction and resume flow
 * 6. Tool restrictions per subagent
 * 7. Model override per subagent
 */

import { describe, expect, test } from 'bun:test';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

// =============================================================================
// Programmatic Agent Definition (agents option)
// =============================================================================

describe('Programmatic Agent Definition', () => {
  test.todo('agents option: should accept agent definitions in options', async () => {
    /**
     * Expected behavior from official SDK:
     *
     * ```typescript
     * for await (const message of query({
     *   prompt: "Review the authentication module",
     *   options: {
     *     allowedTools: ['Read', 'Grep', 'Glob', 'Task'],  // Task required!
     *     agents: {
     *       'code-reviewer': {
     *         description: 'Expert code review specialist',
     *         prompt: 'You are a code review specialist...',
     *         tools: ['Read', 'Grep', 'Glob'],
     *         model: 'sonnet'
     *       }
     *     }
     *   }
     * })) { ... }
     * ```
     *
     * Implementation notes:
     * - agents is a Record<string, AgentDefinition>
     * - Agent name becomes the key for invocation
     * - Task tool MUST be in allowedTools for subagent invocation
     */
  });

  test.todo('agents option: should be serialized to CLI correctly', async () => {
    /**
     * Need to verify how agents option is passed to CLI:
     * - Could be --agents flag with JSON
     * - Could be in stdin init message
     * - Compare with official SDK's capture CLI output
     */
  });
});

// =============================================================================
// AgentDefinition Type
// =============================================================================

describe('AgentDefinition Type', () => {
  test.todo('should export AgentDefinition type from SDK', async () => {
    /**
     * Expected type:
     *
     * ```typescript
     * import type { AgentDefinition } from "lite-claude-agent-sdk";
     *
     * const agent: AgentDefinition = {
     *   description: string,     // Required - when to use this agent
     *   prompt: string,          // Required - system prompt for agent
     *   tools?: string[],        // Optional - tool restrictions
     *   model?: 'sonnet' | 'opus' | 'haiku' | 'inherit'  // Optional
     * };
     * ```
     */
  });

  test.todo('description field: should tell Claude when to use this agent', async () => {
    /**
     * From docs:
     *
     * "description tells Claude when to use this subagent"
     *
     * Good description example:
     * "Expert code review specialist. Use for quality, security, and maintainability reviews."
     *
     * Claude uses this to decide automatic invocation
     */
  });

  test.todo('prompt field: should define agent behavior and expertise', async () => {
    /**
     * Example from docs:
     *
     * ```typescript
     * prompt: `You are a code review specialist with expertise in security, performance, and best practices.
     *
     * When reviewing code:
     * - Identify security vulnerabilities
     * - Check for performance issues
     * - Verify adherence to coding standards
     * - Suggest specific improvements
     *
     * Be thorough but concise in your feedback.`
     * ```
     */
  });

  test.todo('tools field: should restrict available tools for agent', async () => {
    /**
     * From docs:
     *
     * - Omit field: agent inherits all available tools (default)
     * - Specify tools: agent can only use listed tools
     *
     * Common combinations:
     * - Read-only: ["Read", "Grep", "Glob"]
     * - Test execution: ["Bash", "Read", "Grep"]
     * - Code modification: ["Read", "Edit", "Write", "Grep", "Glob"]
     */
  });

  test.todo('model field: should override model for this agent', async () => {
    /**
     * From docs:
     *
     * model?: 'sonnet' | 'opus' | 'haiku' | 'inherit'
     *
     * Use cases:
     * - "opus" for high-stakes reviews
     * - "haiku" for simple tasks (cost savings)
     * - "inherit" or omit to use main model
     */
  });
});

// =============================================================================
// Task Tool Requirement
// =============================================================================

describe('Task Tool Requirement', () => {
  test.todo('subagents require Task in allowedTools', async () => {
    /**
     * From docs:
     *
     * "The Task tool must be included in allowedTools since Claude invokes
     * subagents through the Task tool."
     *
     * ```typescript
     * allowedTools: ['Read', 'Grep', 'Glob', 'Task'],  // Task is required
     * agents: { ... }
     * ```
     *
     * Without Task, Claude cannot invoke subagents even if defined
     */
  });

  test.todo('subagents cannot spawn their own subagents', async () => {
    /**
     * From docs:
     *
     * "Subagents cannot spawn their own subagents. Don't include Task
     * in a subagent's tools array."
     *
     * If Task is in subagent's tools, it should be ignored or error
     */
  });
});

// =============================================================================
// Subagent Invocation
// =============================================================================

describe('Subagent Invocation', () => {
  test.todo('automatic invocation: Claude decides based on description', async () => {
    /**
     * From docs:
     *
     * "Claude automatically decides when to invoke subagents based on the
     * task and each subagent's description."
     *
     * Write clear descriptions so Claude can match tasks appropriately
     */
  });

  test.todo('explicit invocation: mention agent by name in prompt', async () => {
    /**
     * From docs:
     *
     * "Use the code-reviewer agent to check the authentication module"
     *
     * This bypasses automatic matching and directly invokes the named agent
     */
  });

  test.todo('detecting invocation: check for Task tool_use', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * for (const block of msg.message?.content ?? []) {
     *   if (block.type === "tool_use" && block.name === "Task") {
     *     console.log(`Subagent invoked: ${block.input.subagent_type}`);
     *   }
     * }
     * ```
     *
     * Subagent invocation is a Task tool call with subagent_type in input
     */
  });

  test.todo('parent_tool_use_id: identifies messages from subagent context', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * if (msg.parent_tool_use_id) {
     *   console.log("  (running inside subagent)");
     * }
     * ```
     *
     * Messages from within a subagent's execution have parent_tool_use_id set
     */
  });
});

// =============================================================================
// Subagent Resumption
// =============================================================================

describe('Subagent Resumption', () => {
  test.todo('should extract agentId from message content', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * function extractAgentId(message: SDKMessage): string | undefined {
     *   if (!('message' in message)) return undefined;
     *   const content = JSON.stringify(message.message.content);
     *   const match = content.match(/agentId:\s*([a-f0-9-]+)/);
     *   return match?.[1];
     * }
     * ```
     *
     * Agent ID appears in Task tool results after subagent completes
     */
  });

  test.todo('should resume subagent with session_id and agentId', async () => {
    /**
     * From docs:
     *
     * Two-query flow:
     * 1. First query runs subagent, capture session_id and agentId
     * 2. Second query with resume: sessionId and agentId in prompt
     *
     * ```typescript
     * // Second query
     * for await (const message of query({
     *   prompt: `Resume agent ${agentId} and list the top 3 most complex endpoints`,
     *   options: {
     *     allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
     *     resume: sessionId  // Resume the same session
     *   }
     * })) { ... }
     * ```
     *
     * The resumed subagent retains full conversation history
     */
  });

  test.todo('subagent transcripts persist independently', async () => {
    /**
     * From docs:
     *
     * - Main conversation compaction doesn't affect subagent transcripts
     * - Transcripts stored in separate files
     * - Persist within session
     * - Auto-cleanup based on cleanupPeriodDays (default 30)
     */
  });
});

// =============================================================================
// Dynamic Agent Configuration
// =============================================================================

describe('Dynamic Agent Configuration', () => {
  test.todo('should support factory functions for agent definitions', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * function createSecurityAgent(level: 'basic' | 'strict'): AgentDefinition {
     *   const isStrict = level === 'strict';
     *   return {
     *     description: 'Security code reviewer',
     *     prompt: `You are a ${isStrict ? 'strict' : 'balanced'} security reviewer...`,
     *     tools: ['Read', 'Grep', 'Glob'],
     *     model: isStrict ? 'opus' : 'sonnet'
     *   };
     * }
     *
     * agents: {
     *   'security-reviewer': createSecurityAgent('strict')
     * }
     * ```
     *
     * Agents can be created dynamically at query time
     */
  });
});

// =============================================================================
// Built-in General Purpose Subagent
// =============================================================================

describe('Built-in General Purpose Subagent', () => {
  test.todo('general-purpose subagent available without definition', async () => {
    /**
     * From docs:
     *
     * "Claude can invoke the built-in general-purpose subagent at any time
     * via the Task tool without you defining anything"
     *
     * Just include Task in allowedTools, no agents definition needed
     */
  });
});

// =============================================================================
// Filesystem-based Agents (Alternative)
// =============================================================================

describe('Filesystem-based Agents', () => {
  test.todo('agents in .claude/agents/ should be auto-loaded', async () => {
    /**
     * From docs:
     *
     * Alternative to programmatic definition:
     * - Create .claude/agents/specialist.md
     * - Markdown file with frontmatter
     *
     * Programmatic agents take precedence over filesystem agents
     * with the same name
     */
  });
});

// =============================================================================
// Troubleshooting
// =============================================================================

describe('Subagent Troubleshooting', () => {
  test.todo('should fail gracefully if Task tool not in allowedTools', async () => {
    /**
     * Common issue from docs:
     *
     * "Claude not delegating to subagents"
     * Solution: Include Task tool in allowedTools
     */
  });

  test.todo('Windows: should handle long prompt failures', async () => {
    /**
     * From docs:
     *
     * "On Windows, subagents with very long prompts may fail due to
     * command line length limits (8191 chars)"
     *
     * Workaround: Use filesystem-based agents for complex instructions
     */
  });
});

// =============================================================================
// SDK Comparison Tests - Verify both SDKs behave the same
// =============================================================================

describe('Subagents SDK Comparison', () => {
  testWithBothSDKs('agents option should be accepted without error', async (sdk) => {
    if (sdk === 'lite') {
      // Skip for lite - agents option not implemented
      // When implemented, should pass agents to CLI correctly
      return;
    }

    // Official SDK should accept agents option
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 1,
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

  testWithBothSDKs('Task tool enables built-in general-purpose subagent', async (sdk) => {
    if (sdk === 'lite') {
      // Skip for lite - need to verify Task tool handling
      return;
    }

    // With Task in allowedTools, built-in subagent should be available
    const messages = await runWithSDK(sdk, 'What tools do you have?', {
      maxTurns: 1,
      allowedTools: ['Task'],
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
  });

  testWithBothSDKs('parent_tool_use_id field exists on messages', async (sdk) => {
    // Verify the field structure is supported in both SDKs
    // Even without invoking subagents, the type should support this field
    const messages = await runWithSDK(sdk, 'Say "test"', {
      maxTurns: 1,
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
