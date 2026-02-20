/**
 * Unit tests for type re-exports
 *
 * Verifies all types re-exported from src/types/index.ts are
 * importable and match the official SDK exports.
 */

import { describe, expect, test } from 'bun:test';

describe('v0.2.49 type re-exports', () => {
  test('ConfigChangeHookInput is importable', () => {
    const input: import('../../src/types/index.ts').ConfigChangeHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'ConfigChange',
      source: 'user_settings',
    };
    expect(input.hook_event_name).toBe('ConfigChange');
    expect(input.source).toBe('user_settings');
  });

  test('ThinkingConfig types are importable', () => {
    const adaptive: import('../../src/types/index.ts').ThinkingAdaptive = { type: 'adaptive' };
    const enabled: import('../../src/types/index.ts').ThinkingEnabled = {
      type: 'enabled',
      budgetTokens: 5000,
    };
    const disabled: import('../../src/types/index.ts').ThinkingDisabled = { type: 'disabled' };

    const config: import('../../src/types/index.ts').ThinkingConfig = adaptive;
    expect(config.type).toBe('adaptive');
    expect(enabled.budgetTokens).toBe(5000);
    expect(disabled.type).toBe('disabled');
  });

  test('SDKRateLimitEvent is importable', () => {
    const event: import('../../src/types/index.ts').SDKRateLimitEvent = {
      type: 'rate_limit_event',
      session_id: 'session-123',
    };
    expect(event.type).toBe('rate_limit_event');
  });

  test('SDKPromptSuggestionMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKPromptSuggestionMessage = {
      type: 'prompt_suggestion',
      suggestion: 'What about X?',
      session_id: 'session-123',
    };
    expect(msg.type).toBe('prompt_suggestion');
    expect(msg.suggestion).toBe('What about X?');
  });

  test('Hook specific output types are importable', () => {
    const postToolUse: import('../../src/types/index.ts').PostToolUseHookSpecificOutput = {
      hookEventName: 'PostToolUse',
    };
    expect(postToolUse.hookEventName).toBe('PostToolUse');

    const notification: import('../../src/types/index.ts').NotificationHookSpecificOutput = {
      hookEventName: 'Notification',
    };
    expect(notification.hookEventName).toBe('Notification');
  });

  test('McpClaudeAIProxyServerConfig is importable', () => {
    const config: import('../../src/types/index.ts').McpClaudeAIProxyServerConfig = {
      type: 'claude_ai_proxy',
    };
    expect(config.type).toBe('claude_ai_proxy');
  });

  test('HOOK_EVENTS const includes ConfigChange', () => {
    const { HOOK_EVENTS } = require('../../src/types/index.ts');
    expect(HOOK_EVENTS).toContain('ConfigChange');
    expect(HOOK_EVENTS).toContain('PreToolUse');
    expect(HOOK_EVENTS).toContain('PostToolUse');
  });

  test('EXIT_REASONS const is importable', () => {
    const { EXIT_REASONS } = require('../../src/types/index.ts');
    expect(EXIT_REASONS).toContain('clear');
    expect(EXIT_REASONS).toContain('logout');
  });
});

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
