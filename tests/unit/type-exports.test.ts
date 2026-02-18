/**
 * Unit tests for type re-exports
 *
 * Verifies all types re-exported from src/types/index.ts are
 * importable and match the official SDK exports.
 */

import { describe, expect, test } from 'bun:test';

describe('v0.2.45 type re-exports', () => {
  test('SDKTaskStartedMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKTaskStartedMessage = {
      type: 'system',
      subtype: 'task_started',
      task_id: 'task-123',
      description: 'test task',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKTaskStartedMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('task_started');

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKPermissionDenial is importable', () => {
    const denial: import('../../src/types/index.ts').SDKPermissionDenial = {
      tool_name: 'Bash',
      tool_use_id: 'tu-123',
      tool_input: { command: 'rm -rf /' },
    };
    expect(denial.tool_name).toBe('Bash');
  });

  test('NonNullableUsage is importable', () => {
    const usage: import('../../src/types/index.ts').NonNullableUsage = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    };
    expect(usage.input_tokens).toBe(100);
  });

  test('PermissionRuleValue is importable', () => {
    const rule: import('../../src/types/index.ts').PermissionRuleValue = {
      toolName: 'Bash',
      ruleContent: 'npm test',
    };
    expect(rule.toolName).toBe('Bash');
  });

  test('AsyncHookJSONOutput and SyncHookJSONOutput are importable', () => {
    const asyncOutput: import('../../src/types/index.ts').AsyncHookJSONOutput = {
      async: true,
      asyncTimeout: 5000,
    };
    expect(asyncOutput.async).toBe(true);

    const syncOutput: import('../../src/types/index.ts').SyncHookJSONOutput = {
      continue: true,
      suppressOutput: false,
    };
    expect(syncOutput.continue).toBe(true);
  });

  test('BaseHookInput is importable', () => {
    const input: import('../../src/types/index.ts').BaseHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
    };
    expect(input.session_id).toBe('session-123');
  });

  test('SubagentStartHookSpecificOutput is importable', () => {
    const output: import('../../src/types/index.ts').SubagentStartHookSpecificOutput = {
      hookEventName: 'SubagentStart',
    };
    expect(output.hookEventName).toBe('SubagentStart');
  });
});
