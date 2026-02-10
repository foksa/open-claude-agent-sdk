/**
 * Comparison tests for canUseTool permission callback
 * Same tests run with both open and official SDKs
 *
 * IMPORTANT: canUseTool is only called for tools that require permission.
 * Tools NOT requiring permission (auto-approved): Read, Glob, Grep, AskUserQuestion
 * Tools requiring permission: Bash, Write, Edit, WebFetch, NotebookEdit
 *
 * See: https://code.claude.com/docs/en/settings
 */

import { expect } from 'bun:test';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

testWithBothSDKs('canUseTool callback allows tool execution', async (sdk) => {
  const allowedTools: string[] = [];

  const messages = await runWithSDK(
    sdk,
    'Write the text "hello world" to /tmp/permission-test.txt', // Write requires permission
    {
      maxTurns: 5,
      permissionMode: 'default',
      canUseTool: async (toolName, input, _context) => {
        allowedTools.push(toolName);
        return { behavior: 'allow', updatedInput: input };
      },
    }
  );

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }

  expect(allowedTools.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Allowed tools:`, allowedTools);
});

testWithBothSDKs('canUseTool callback denies tool execution', async (sdk) => {
  const deniedTools: string[] = [];

  const messages = await runWithSDK(
    sdk,
    'Write the text "test" to /tmp/permission-deny-test.txt', // Write requires permission
    {
      maxTurns: 5,
      permissionMode: 'default',
      canUseTool: async (toolName, _input, _context) => {
        deniedTools.push(toolName);
        return { behavior: 'deny', message: 'Permission denied by test' };
      },
    }
  );

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();

  expect(deniedTools.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Denied tools:`, deniedTools);
});

testWithBothSDKs('canUseTool callback receives correct parameters', async (sdk) => {
  let capturedToolName = '';
  let capturedInput: Record<string, unknown> | null = null;
  let capturedContext: { signal: AbortSignal; toolUseID: string } | null = null;

  await runWithSDK(
    sdk,
    'Write the text "params test" to /tmp/permission-params-test.txt', // Write requires permission
    {
      maxTurns: 5,
      permissionMode: 'default',
      canUseTool: async (toolName, input, context) => {
        if (!capturedToolName) {
          // Capture first tool call only
          capturedToolName = toolName;
          capturedInput = input;
          capturedContext = context;
        }
        return { behavior: 'allow', updatedInput: input };
      },
    }
  );

  expect(capturedToolName).toBeTruthy();
  expect(capturedInput).toBeTruthy();
  expect(capturedContext).toBeTruthy();
  expect(capturedContext.toolUseID).toBeTruthy();
  console.log(`   [${sdk}] Captured tool:`, capturedToolName, 'input:', capturedInput);
});

testWithBothSDKs('canUseTool callback with selective filtering', async (sdk) => {
  const toolsRequested: string[] = [];

  await runWithSDK(
    sdk,
    'Create a file at /tmp/selective-test.txt with "hello" then run: echo "done"', // Write and Bash require permission
    {
      maxTurns: 5,
      permissionMode: 'default',
      canUseTool: async (toolName, input, _context) => {
        toolsRequested.push(toolName);

        // Allow Write but deny Bash
        if (toolName === 'Write') {
          return { behavior: 'allow', updatedInput: input };
        }
        return { behavior: 'deny', message: 'Only Write is allowed' };
      },
    }
  );

  expect(toolsRequested.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Tools requested:`, toolsRequested);
});
