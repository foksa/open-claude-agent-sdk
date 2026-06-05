/**
 * Unit tests for type re-exports
 *
 * Verifies all types re-exported from src/types/index.ts are
 * importable and match the official SDK exports.
 */

import { describe, expect, test } from 'bun:test';
import { AbortError } from '../../src/index.ts';
import { InMemorySessionStore, SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from '../../src/types/index.ts';

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
      rate_limit_info: { status: 'allowed' },
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKRateLimitEvent['uuid'],
      session_id: 'session-123',
    };
    expect(event.type).toBe('rate_limit_event');
  });

  test('SDKPromptSuggestionMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKPromptSuggestionMessage = {
      type: 'prompt_suggestion',
      suggestion: 'What about X?',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKPromptSuggestionMessage['uuid'],
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

describe('v0.2.50 type re-exports', () => {
  test('WorktreeCreateHookInput is importable', () => {
    const input: import('../../src/types/index.ts').WorktreeCreateHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'WorktreeCreate',
      name: 'feature-branch',
    };
    expect(input.hook_event_name).toBe('WorktreeCreate');
    expect(input.name).toBe('feature-branch');
  });

  test('WorktreeRemoveHookInput is importable', () => {
    const input: import('../../src/types/index.ts').WorktreeRemoveHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'WorktreeRemove',
      worktree_path: '/tmp/worktrees/feature-branch',
    };
    expect(input.hook_event_name).toBe('WorktreeRemove');
    expect(input.worktree_path).toBe('/tmp/worktrees/feature-branch');
  });

  test('HOOK_EVENTS const includes WorktreeCreate and WorktreeRemove', () => {
    const { HOOK_EVENTS } = require('../../src/types/index.ts');
    expect(HOOK_EVENTS).toContain('WorktreeCreate');
    expect(HOOK_EVENTS).toContain('WorktreeRemove');
  });

  test('HookEvent union includes worktree events', () => {
    const create: import('../../src/types/index.ts').HookEvent = 'WorktreeCreate';
    const remove: import('../../src/types/index.ts').HookEvent = 'WorktreeRemove';
    expect(create).toBe('WorktreeCreate');
    expect(remove).toBe('WorktreeRemove');
  });
});

describe('v0.2.62 type re-exports', () => {
  test('SDKTaskProgressMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKTaskProgressMessage = {
      type: 'system',
      subtype: 'task_progress',
      task_id: 'task-123',
      description: 'Working on analysis',
      usage: {
        total_tokens: 5000,
        tool_uses: 3,
        duration_ms: 12000,
      },
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKTaskProgressMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('task_progress');
    expect(msg.usage.total_tokens).toBe(5000);

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKSessionInfo is importable', () => {
    const info: import('../../src/types/index.ts').SDKSessionInfo = {
      sessionId: '12345678-1234-1234-1234-123456789012',
      summary: 'My test session',
      lastModified: Date.now(),
      fileSize: 4096,
      customTitle: 'Custom Title',
      firstPrompt: 'Hello world',
      gitBranch: 'main',
      cwd: '/home/user/project',
    };
    expect(info.sessionId).toBe('12345678-1234-1234-1234-123456789012');
    expect(info.summary).toBe('My test session');
  });

  test('SessionMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SessionMessage = {
      type: 'user',
      uuid: 'uuid-123',
      session_id: 'session-123',
      message: { role: 'user', content: 'Hello' },
      parent_tool_use_id: null,
    };
    expect(msg.type).toBe('user');
    expect(msg.parent_tool_use_id).toBeNull();
  });

  test('GetSessionMessagesOptions is importable', () => {
    const opts: import('../../src/types/index.ts').GetSessionMessagesOptions = {
      dir: '/home/user/project',
      limit: 10,
      offset: 5,
    };
    expect(opts.limit).toBe(10);
    expect(opts.offset).toBe(5);
  });

  test('ListSessionsOptions is importable', () => {
    const opts: import('../../src/types/index.ts').ListSessionsOptions = {
      dir: '/home/user/project',
      limit: 20,
    };
    expect(opts.dir).toBe('/home/user/project');
    expect(opts.limit).toBe(20);
  });

  test('listSessions function is importable from main entry', () => {
    const { listSessions } = require('../../src/index.ts');
    expect(typeof listSessions).toBe('function');
  });

  test('getSessionMessages function is importable from main entry', () => {
    const { getSessionMessages } = require('../../src/index.ts');
    expect(typeof getSessionMessages).toBe('function');
  });
});

describe('v0.2.63 type re-exports', () => {
  test('AgentInfo is importable', () => {
    const info: import('../../src/types/index.ts').AgentInfo = {
      name: 'Explore',
      description: 'Fast agent for exploring codebases',
    };
    expect(info.name).toBe('Explore');
    expect(info.description).toBeDefined();
  });

  test('AgentInfo with optional model field', () => {
    const info: import('../../src/types/index.ts').AgentInfo = {
      name: 'custom-agent',
      description: 'Custom agent',
      model: 'claude-sonnet-4-20250514',
    };
    expect(info.model).toBe('claude-sonnet-4-20250514');
  });

  test('SDKElicitationCompleteMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKElicitationCompleteMessage = {
      type: 'system',
      subtype: 'elicitation_complete',
      mcp_server_name: 'test-server',
      elicitation_id: 'elicit-123',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKElicitationCompleteMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.subtype).toBe('elicitation_complete');
    expect(msg.mcp_server_name).toBe('test-server');
    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKLocalCommandOutputMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKLocalCommandOutputMessage = {
      type: 'system',
      subtype: 'local_command_output',
      content: 'command output here',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKLocalCommandOutputMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('local_command_output');
    expect(msg.content).toBe('command output here');
    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('ElicitationHookInput is importable', () => {
    const input: import('../../src/types/index.ts').ElicitationHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'Elicitation',
      mcp_server_name: 'test-server',
      message: 'Please authenticate',
    };
    expect(input.hook_event_name).toBe('Elicitation');
  });

  test('FastModeState is importable', () => {
    const state: import('../../src/types/index.ts').FastModeState = 'on';
    expect(state).toBe('on');
    const off: import('../../src/types/index.ts').FastModeState = 'off';
    expect(off).toBe('off');
    const cooldown: import('../../src/types/index.ts').FastModeState = 'cooldown';
    expect(cooldown).toBe('cooldown');
  });

  test('OnElicitation callback type is importable', () => {
    const cb: import('../../src/types/index.ts').OnElicitation = async (_request, _options) => {
      return { action: 'accept' as const };
    };
    expect(typeof cb).toBe('function');
  });

  test('SDKRateLimitEvent is now re-exported from official SDK', () => {
    const event: import('../../src/types/index.ts').SDKRateLimitEvent = {
      type: 'rate_limit_event',
      rate_limit_info: { status: 'allowed_warning' },
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKRateLimitEvent['uuid'],
      session_id: 'session-123',
    };
    expect(event.type).toBe('rate_limit_event');
  });

  test('SDKPromptSuggestionMessage is now re-exported from official SDK', () => {
    const msg: import('../../src/types/index.ts').SDKPromptSuggestionMessage = {
      type: 'prompt_suggestion',
      suggestion: 'What about X?',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKPromptSuggestionMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('prompt_suggestion');
    expect(msg.suggestion).toBe('What about X?');
  });

  test('BaseOutputFormat is importable', () => {
    const fmt: import('../../src/types/index.ts').BaseOutputFormat = {
      type: 'json_schema',
    };
    expect(fmt.type).toBe('json_schema');
  });

  test('SandboxFilesystemConfig is importable', () => {
    const config: import('../../src/types/index.ts').SandboxFilesystemConfig = {
      type: 'read-write',
    };
    expect(config.type).toBe('read-write');
  });

  test('SDKSessionOptions is importable', () => {
    const opts: import('../../src/types/index.ts').SDKSessionOptions = {
      permissionMode: 'default',
    };
    expect(opts.permissionMode).toBe('default');
  });

  test('HOOK_EVENTS const includes Elicitation and ElicitationResult', () => {
    const { HOOK_EVENTS } = require('../../src/types/index.ts');
    expect(HOOK_EVENTS).toContain('Elicitation');
    expect(HOOK_EVENTS).toContain('ElicitationResult');
  });

  test('SDKControlInitializeResponse includes agents and fast_mode_state fields', () => {
    const response: import('../../src/types/index.ts').SDKControlInitializeResponse = {
      commands: [],
      agents: [{ name: 'Explore', description: 'Fast agent' }],
      output_style: 'concise',
      available_output_styles: ['concise', 'verbose'],
      models: [],
      account: {},
      fast_mode_state: 'off',
    };
    expect(response.agents).toHaveLength(1);
    expect(response.agents[0].name).toBe('Explore');
    expect(response.fast_mode_state).toBe('off');

    // Verify fast_mode_state is optional
    const responseWithout: import('../../src/types/index.ts').SDKControlInitializeResponse = {
      commands: [],
      agents: [],
      output_style: 'concise',
      available_output_styles: [],
      models: [],
      account: {},
    };
    expect(responseWithout.fast_mode_state).toBeUndefined();
  });
});

describe('v0.2.70 type re-exports', () => {
  test('ToolConfig is importable', () => {
    const config: import('../../src/types/index.ts').ToolConfig = {
      askUserQuestion: { previewFormat: 'html' },
    };
    expect(config.askUserQuestion?.previewFormat).toBe('html');
  });

  test('ToolConfig previewFormat accepts markdown', () => {
    const config: import('../../src/types/index.ts').ToolConfig = {
      askUserQuestion: { previewFormat: 'markdown' },
    };
    expect(config.askUserQuestion?.previewFormat).toBe('markdown');
  });

  test('InstructionsLoadedHookInput is importable', () => {
    const input: import('../../src/types/index.ts').InstructionsLoadedHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'InstructionsLoaded',
      file_path: '/project/CLAUDE.md',
      memory_type: 'Project',
    };
    expect(input.hook_event_name).toBe('InstructionsLoaded');
    expect(input.memory_type).toBe('Project');
  });

  test('BaseHookInput includes agent_id and agent_type fields', () => {
    const input: import('../../src/types/index.ts').BaseHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      agent_id: 'agent-456',
      agent_type: 'code-reviewer',
    };
    expect(input.agent_id).toBe('agent-456');
    expect(input.agent_type).toBe('code-reviewer');
  });

  test('ModelInfo includes supportsFastMode', () => {
    const model: import('../../src/types/index.ts').ModelInfo = {
      modelId: 'claude-opus-4-6',
      modelName: 'Claude Opus 4.6',
      provider: 'anthropic',
      canBeUsed: true,
      supportsFastMode: true,
    };
    expect(model.supportsFastMode).toBe(true);
  });
});

describe('v0.2.76 type re-exports', () => {
  test('PostCompactHookInput is importable', () => {
    const input: import('../../src/types/index.ts').PostCompactHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'PostCompact',
      trigger: 'auto',
      compact_summary: 'Summary of compacted conversation',
    };
    expect(input.hook_event_name).toBe('PostCompact');
    expect(input.trigger).toBe('auto');
    expect(input.compact_summary).toBe('Summary of compacted conversation');
  });

  test('HOOK_EVENTS const includes PostCompact', () => {
    const { HOOK_EVENTS } = require('../../src/types/index.ts');
    expect(HOOK_EVENTS).toContain('PostCompact');
  });

  test('ForkSessionOptions is importable', () => {
    const opts: import('../../src/types/index.ts').ForkSessionOptions = {
      dir: '/home/user/project',
      upToMessageId: 'msg-123',
      title: 'My fork',
    };
    expect(opts.upToMessageId).toBe('msg-123');
    expect(opts.title).toBe('My fork');
  });

  test('ForkSessionResult is importable', () => {
    const result: import('../../src/types/index.ts').ForkSessionResult = {
      sessionId: '12345678-1234-1234-1234-123456789012',
    };
    expect(result.sessionId).toBe('12345678-1234-1234-1234-123456789012');
  });

  test('GetSessionInfoOptions is importable', () => {
    const opts: import('../../src/types/index.ts').GetSessionInfoOptions = {
      dir: '/home/user/project',
    };
    expect(opts.dir).toBe('/home/user/project');
  });

  test('SessionMutationOptions is importable', () => {
    const opts: import('../../src/types/index.ts').SessionMutationOptions = {
      dir: '/home/user/project',
    };
    expect(opts.dir).toBe('/home/user/project');
  });

  test('Settings is importable', () => {
    const settings: import('../../src/types/index.ts').Settings = {
      model: 'claude-sonnet-4-6',
    };
    expect(settings.model).toBe('claude-sonnet-4-6');
  });

  test('SDKSession interface is importable', () => {
    // Just verify the type is importable (it's an interface, can't instantiate)
    type Session = import('../../src/types/index.ts').SDKSession;
    const check: Session extends { readonly sessionId: string } ? true : false = true;
    expect(check).toBe(true);
  });

  test('forkSession function is importable from main entry', () => {
    const { forkSession } = require('../../src/index.ts');
    expect(typeof forkSession).toBe('function');
  });

  test('renameSession function is importable from main entry', () => {
    const { renameSession } = require('../../src/index.ts');
    expect(typeof renameSession).toBe('function');
  });

  test('tagSession function is importable from main entry', () => {
    const { tagSession } = require('../../src/index.ts');
    expect(typeof tagSession).toBe('function');
  });

  test('getSessionInfo function is importable from main entry', () => {
    const { getSessionInfo } = require('../../src/index.ts');
    expect(typeof getSessionInfo).toBe('function');
  });
});

describe('v0.2.72 type re-exports', () => {
  test('SDKTaskProgressMessage has optional summary field', () => {
    const msg: import('../../src/types/index.ts').SDKTaskProgressMessage = {
      type: 'system',
      subtype: 'task_progress',
      task_id: 'task-123',
      description: 'Working on code review',
      usage: { total_tokens: 1000, tool_uses: 5, duration_ms: 3000 },
      summary: 'Reviewed 3 files and found 2 issues',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKTaskProgressMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.summary).toBe('Reviewed 3 files and found 2 issues');
  });

  test('SDKTaskProgressMessage works without summary field', () => {
    const msg: import('../../src/types/index.ts').SDKTaskProgressMessage = {
      type: 'system',
      subtype: 'task_progress',
      task_id: 'task-456',
      description: 'Running tests',
      usage: { total_tokens: 500, tool_uses: 2, duration_ms: 1500 },
      uuid: 'uuid-456' as import('../../src/types/index.ts').SDKTaskProgressMessage['uuid'],
      session_id: 'session-456',
    };
    expect(msg.summary).toBeUndefined();
  });
});

describe('v0.2.79 type re-exports', () => {
  test('SDKAPIRetryMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKAPIRetryMessage = {
      type: 'system',
      subtype: 'api_retry',
      attempt: 1,
      max_retries: 3,
      retry_delay_ms: 5000,
      error_status: 429,
      error: 'rate_limit',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKAPIRetryMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('api_retry');
    expect(msg.attempt).toBe(1);
    expect(msg.max_retries).toBe(3);
    expect(msg.retry_delay_ms).toBe(5000);
    expect(msg.error_status).toBe(429);

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKAPIRetryMessage error_status can be null', () => {
    const msg: import('../../src/types/index.ts').SDKAPIRetryMessage = {
      type: 'system',
      subtype: 'api_retry',
      attempt: 2,
      max_retries: 3,
      retry_delay_ms: 10000,
      error_status: null,
      error: 'unknown',
      uuid: 'uuid-456' as import('../../src/types/index.ts').SDKAPIRetryMessage['uuid'],
      session_id: 'session-456',
    };
    expect(msg.error_status).toBeNull();
  });

  test('ExitReason includes resume', () => {
    const reason: import('../../src/types/index.ts').ExitReason = 'resume';
    expect(reason).toBe('resume');
  });

  test('EXIT_REASONS const includes resume', () => {
    const { EXIT_REASONS } = require('../../src/types/index.ts');
    expect(EXIT_REASONS).toContain('resume');
  });
});

describe('v0.2.85 type re-exports', () => {
  test('EffortLevel is importable', () => {
    const level: import('../../src/types/index.ts').EffortLevel = 'high';
    expect(level).toBe('high');
    const all: import('../../src/types/index.ts').EffortLevel[] = ['low', 'medium', 'high', 'max'];
    expect(all).toHaveLength(4);
  });

  test('SDKControlReloadPluginsResponse is importable', () => {
    const response: import('../../src/types/index.ts').SDKControlReloadPluginsResponse = {
      commands: [],
      agents: [],
      plugins: [{ name: 'test-plugin', path: '/tmp/plugin' }],
      mcpServers: [],
      error_count: 0,
    };
    expect(response.plugins).toHaveLength(1);
    expect(response.error_count).toBe(0);
  });

  test('SDKSessionStateChangedMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKSessionStateChangedMessage = {
      type: 'system',
      subtype: 'session_state_changed',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKSessionStateChangedMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.subtype).toBe('session_state_changed');
  });

  test('PermissionDecisionClassification is importable', () => {
    const classification: import('../../src/types/index.ts').PermissionDecisionClassification =
      'ask';
    expect(classification).toBe('ask');
  });

  test('SDKControlRequest is importable', () => {
    const req: import('../../src/types/index.ts').SDKControlRequest = {
      type: 'control_request',
      request_id: 'req-123',
      request: { subtype: 'interrupt' },
    };
    expect(req.type).toBe('control_request');
  });

  test('SDKControlResponse is importable', () => {
    const resp: import('../../src/types/index.ts').SDKControlResponse = {
      type: 'control_response',
      response: { subtype: 'success', request_id: 'req-123' },
    };
    expect(resp.type).toBe('control_response');
  });

  test('CwdChangedHookInput is importable', () => {
    const input: import('../../src/types/index.ts').CwdChangedHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'CwdChanged',
      old_cwd: '/old/path',
      new_cwd: '/new/path',
    };
    expect(input.hook_event_name).toBe('CwdChanged');
  });

  test('FileChangedHookInput is importable', () => {
    const input: import('../../src/types/index.ts').FileChangedHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'FileChanged',
      file_path: '/home/user/test.ts',
    };
    expect(input.hook_event_name).toBe('FileChanged');
  });

  test('StopFailureHookInput is importable', () => {
    const input: import('../../src/types/index.ts').StopFailureHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'StopFailure',
    };
    expect(input.hook_event_name).toBe('StopFailure');
  });

  test('TaskCreatedHookInput is importable', () => {
    const input: import('../../src/types/index.ts').TaskCreatedHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'TaskCreated',
      task_id: 'task-456',
    };
    expect(input.hook_event_name).toBe('TaskCreated');
  });

  test('WorktreeCreateHookSpecificOutput is importable', () => {
    const output: import('../../src/types/index.ts').WorktreeCreateHookSpecificOutput = {
      hookEventName: 'WorktreeCreate',
    };
    expect(output.hookEventName).toBe('WorktreeCreate');
  });

  test('SDKControlInitializeResponse is now re-exported from official SDK', () => {
    const response: import('../../src/types/index.ts').SDKControlInitializeResponse = {
      commands: [],
      agents: [],
      output_style: 'concise',
      available_output_styles: ['concise'],
      models: [],
      account: {},
    };
    expect(response.output_style).toBe('concise');
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

describe('v0.2.88 type re-exports', () => {
  test('SDKControlGetContextUsageResponse is importable', () => {
    const response: import('../../src/types/index.ts').SDKControlGetContextUsageResponse = {
      categories: [{ name: 'messages', tokens: 1000, color: '#blue' }],
      totalTokens: 1000,
      maxTokens: 200000,
      rawMaxTokens: 200000,
      percentage: 0.5,
      gridRows: [],
      model: 'claude-sonnet-4-20250514',
      memoryFiles: [],
      mcpTools: [],
      agents: [],
      isAutoCompactEnabled: true,
      apiUsage: null,
    };
    expect(response.totalTokens).toBe(1000);
    expect(response.model).toBe('claude-sonnet-4-20250514');
  });

  test('PermissionDeniedHookInput is importable', () => {
    const input: import('../../src/types/index.ts').PermissionDeniedHookInput = {
      session_id: 'session-123',
      transcript_path: '/tmp/transcript.jsonl',
      cwd: '/home/user',
      hook_event_name: 'PermissionDenied',
      tool_name: 'Bash',
      tool_input: { command: 'rm -rf /' },
      tool_use_id: 'tool-123',
      reason: 'User denied',
    };
    expect(input.hook_event_name).toBe('PermissionDenied');
    expect(input.tool_name).toBe('Bash');
  });

  test('PermissionDeniedHookSpecificOutput is importable', () => {
    const output: import('../../src/types/index.ts').PermissionDeniedHookSpecificOutput = {
      hookEventName: 'PermissionDenied',
      retry: true,
    };
    expect(output.hookEventName).toBe('PermissionDenied');
    expect(output.retry).toBe(true);
  });
});

describe('v0.2.90 type re-exports', () => {
  test('HookPermissionDecision is importable', () => {
    const decision: import('../../src/types/index.ts').HookPermissionDecision = 'allow';
    expect(decision).toBe('allow');
  });

  test('SDKDeferredToolUse is importable', () => {
    const deferred: import('../../src/types/index.ts').SDKDeferredToolUse = {
      id: 'tool-123',
      name: 'Read',
      input: { file_path: '/tmp/test.txt' },
    };
    expect(deferred.name).toBe('Read');
  });

  test('GetSubagentMessagesOptions is importable', () => {
    const opts: import('../../src/types/index.ts').GetSubagentMessagesOptions = {
      dir: '/tmp/project',
      limit: 10,
      offset: 0,
    };
    expect(opts.limit).toBe(10);
  });

  test('ListSubagentsOptions is importable', () => {
    const opts: import('../../src/types/index.ts').ListSubagentsOptions = {
      dir: '/tmp/project',
    };
    expect(opts.dir).toBe('/tmp/project');
  });
});

describe('v0.2.91 type re-exports', () => {
  test('TerminalReason is importable', () => {
    const reason: import('../../src/types/index.ts').TerminalReason = 'completed';
    expect(reason).toBe('completed');
  });

  test('TerminalReason includes all values', () => {
    const reasons: import('../../src/types/index.ts').TerminalReason[] = [
      'blocking_limit',
      'rapid_refill_breaker',
      'prompt_too_long',
      'image_error',
      'model_error',
      'aborted_streaming',
      'aborted_tools',
      'stop_hook_prevented',
      'hook_stopped',
      'tool_deferred',
      'max_turns',
      'completed',
    ];
    expect(reasons).toHaveLength(12);
  });

  test('PermissionMode includes auto', () => {
    const mode: import('../../src/types/index.ts').PermissionMode = 'auto';
    expect(mode).toBe('auto');
  });
});

describe('v0.2.104 type re-exports', () => {
  test('SDKTaskUpdatedMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKTaskUpdatedMessage = {
      type: 'system',
      subtype: 'task_updated',
      task_id: 'task-123',
      patch: {
        status: 'completed',
        description: 'Analysis done',
      },
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKTaskUpdatedMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('task_updated');
    expect(msg.patch.status).toBe('completed');

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKSettingsParseError is importable', () => {
    const err: import('../../src/types/index.ts').SDKSettingsParseError = {
      file: '/home/user/.claude/settings.json',
      path: 'permissions.allow',
      message: 'Invalid pattern',
    };
    expect(err.path).toBe('permissions.allow');
    expect(err.message).toBe('Invalid pattern');
  });

  test('ConnectRemoteControlError is importable', () => {
    const err: import('../../src/types/index.ts').ConnectRemoteControlError = {
      kind: 'conflict',
      detail: 'Another session is already connected',
    };
    expect(err.kind).toBe('conflict');
  });

  test('InboundPrompt is importable', () => {
    const prompt: import('../../src/types/index.ts').InboundPrompt = {
      content: 'Hello from the UI',
      uuid: 'uuid-123',
    };
    expect(prompt.content).toBe('Hello from the UI');
  });

  test('AgentDefinition model is now string (not union)', () => {
    const agent: import('../../src/types/index.ts').AgentDefinition = {
      type: 'custom-agent',
      model: 'claude-opus-4-6',
    };
    expect(agent.model).toBe('claude-opus-4-6');
  });

  test('AgentDefinition has new fields', () => {
    const agent: import('../../src/types/index.ts').AgentDefinition = {
      type: 'custom-agent',
      initialPrompt: 'You are a code reviewer',
      background: true,
      memory: 'project',
      effort: 'high',
      permissionMode: 'default',
    };
    expect(agent.initialPrompt).toBe('You are a code reviewer');
    expect(agent.background).toBe(true);
    expect(agent.memory).toBe('project');
    expect(agent.effort).toBe('high');
    expect(agent.permissionMode).toBe('default');
  });

  test('SDKAssistantMessageError includes max_output_tokens', () => {
    const err: import('../../src/types/index.ts').SDKAssistantMessageError = 'max_output_tokens';
    expect(err).toBe('max_output_tokens');
  });

  test('ApiKeySource includes oauth', () => {
    const source: import('../../src/types/index.ts').ApiKeySource = 'oauth';
    expect(source).toBe('oauth');
  });
});

describe('v0.2.110 type re-exports', () => {
  test('SDKMemoryRecallMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKMemoryRecallMessage = {
      type: 'system',
      subtype: 'memory_recall',
      mode: 'select',
      memories: [{ path: '/home/user/.claude/memory/user_prefs.md', scope: 'personal' }],
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKMemoryRecallMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('memory_recall');
    expect(msg.mode).toBe('select');
    expect(msg.memories).toHaveLength(1);

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKMemoryRecallMessage synthesize mode', () => {
    const msg: import('../../src/types/index.ts').SDKMemoryRecallMessage = {
      type: 'system',
      subtype: 'memory_recall',
      mode: 'synthesize',
      memories: [
        {
          path: '<synthesis:/home/user/.claude/memory>',
          scope: 'personal',
          content: 'User prefers concise responses and uses TypeScript.',
        },
      ],
      uuid: 'uuid-456' as import('../../src/types/index.ts').SDKMemoryRecallMessage['uuid'],
      session_id: 'session-456',
    };
    expect(msg.mode).toBe('synthesize');
    expect(msg.memories[0].content).toBeDefined();
  });

  test('SDKPluginInstallMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKPluginInstallMessage = {
      type: 'system',
      subtype: 'plugin_install',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKPluginInstallMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('plugin_install');

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKNotificationMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKNotificationMessage = {
      type: 'system',
      subtype: 'notification',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKNotificationMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('notification');

    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SDKStatus includes requesting', () => {
    const status: import('../../src/types/index.ts').SDKStatus = 'requesting';
    expect(status).toBe('requesting');

    const allStatuses: import('../../src/types/index.ts').SDKStatus[] = [
      'compacting',
      'requesting',
      null,
    ];
    expect(allStatuses).toHaveLength(3);
  });

  test('SDKUserMessage has optional shouldQuery field', () => {
    const msg: import('../../src/types/index.ts').SDKUserMessage = {
      type: 'user',
      message: { role: 'user', content: 'Hello' },
      session_id: 'session-123',
      parent_tool_use_id: null,
      shouldQuery: false,
    };
    expect(msg.shouldQuery).toBe(false);

    // Works without shouldQuery too
    const msg2: import('../../src/types/index.ts').SDKUserMessage = {
      type: 'user',
      message: { role: 'user', content: 'Hello' },
      session_id: 'session-123',
      parent_tool_use_id: null,
    };
    expect(msg2.shouldQuery).toBeUndefined();
  });

  test('Options.systemPrompt accepts string array', () => {
    const opts: import('../../src/types/index.ts').Options = {
      systemPrompt: ['part1', 'part2'],
    };
    expect(Array.isArray(opts.systemPrompt)).toBe(true);
    if (Array.isArray(opts.systemPrompt)) {
      expect(opts.systemPrompt).toHaveLength(2);
    }
  });
});

describe('v0.2.114 type re-exports', () => {
  test('SDKMirrorErrorMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKMirrorErrorMessage = {
      type: 'system',
      subtype: 'mirror_error',
      error: 'Connection failed',
      key: { projectKey: 'my-project', sessionId: 'session-123' },
      uuid: 'uuid-456' as import('../../src/types/index.ts').SDKMirrorErrorMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('mirror_error');

    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('SessionStore, SessionKey, SessionStoreEntry are importable', () => {
    const key: import('../../src/types/index.ts').SessionKey = {
      projectKey: 'my-project',
      sessionId: 'session-123',
    };
    expect(key.projectKey).toBe('my-project');

    const entry: import('../../src/types/index.ts').SessionStoreEntry = {
      type: 'user',
      uuid: 'uuid-123',
      timestamp: new Date().toISOString(),
    };
    expect(entry.type).toBe('user');

    const store: import('../../src/types/index.ts').SessionStore = {
      append: async (_key, _entries) => {},
      load: async (_key) => null,
    };
    expect(typeof store.append).toBe('function');
  });

  test('McpServerToolPolicy is importable', () => {
    const policy: import('../../src/types/index.ts').McpServerToolPolicy = {
      name: 'my-tool',
      permission_policy: 'always_allow',
    };
    expect(policy.name).toBe('my-tool');
    expect(policy.permission_policy).toBe('always_allow');
  });

  test('McpHttpServerConfig accepts tools field', () => {
    const config: import('../../src/types/index.ts').McpHttpServerConfig = {
      type: 'http',
      url: 'https://example.com/mcp',
      tools: [{ name: 'search', permission_policy: 'always_ask' }],
    };
    expect(config.tools?.[0].name).toBe('search');
  });

  test('SDKMessageOrigin is importable', () => {
    const origin: import('../../src/types/index.ts').SDKMessageOrigin = {
      kind: 'human',
    };
    expect(origin.kind).toBe('human');

    const channelOrigin: import('../../src/types/index.ts').SDKMessageOrigin = {
      kind: 'channel',
      server: 'my-server',
    };
    expect(channelOrigin.kind).toBe('channel');
  });

  test('Options.title is accepted', () => {
    const opts: import('../../src/types/index.ts').Options = {
      title: 'My Custom Session Title',
    };
    expect(opts.title).toBe('My Custom Session Title');
  });

  test('InMemorySessionStore is importable and usable', () => {
    const store = new InMemorySessionStore();
    expect(typeof store.append).toBe('function');
    expect(typeof store.load).toBe('function');
  });

  test('SYSTEM_PROMPT_DYNAMIC_BOUNDARY is the expected string', () => {
    expect(SYSTEM_PROMPT_DYNAMIC_BOUNDARY).toBe('__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__');
  });
});

describe('v0.2.119 type re-exports', () => {
  test('SDKControlReadFileResponse is importable', () => {
    const resp: import('../../src/types/index.ts').SDKControlReadFileResponse = {
      contents: 'file content here',
      absPath: '/home/user/project/file.txt',
      truncated: false,
    };
    expect(resp.contents).toBe('file content here');
    expect(resp.absPath).toBe('/home/user/project/file.txt');
    expect(resp.truncated).toBe(false);
  });

  test('Options.managedSettings is accepted', () => {
    const opts: import('../../src/types/index.ts').Options = {
      managedSettings: { permissions: { allow: [], deny: [] } },
    };
    expect(opts.managedSettings).toBeDefined();
  });
});

describe('v0.2.121 type re-exports', () => {
  test('PostToolUseHookSpecificOutput accepts updatedToolOutput', () => {
    const output: import('../../src/types/index.ts').PostToolUseHookSpecificOutput = {
      hookEventName: 'PostToolUse',
      updatedToolOutput: 'replaced output',
    };
    expect(output.updatedToolOutput).toBe('replaced output');
  });

  test('PostToolBatchHookInput is importable', () => {
    const input: import('../../src/types/index.ts').PostToolBatchHookInput = {
      hook_event_name: 'PostToolBatch',
      tool_calls: [{ tool_name: 'Read', tool_input: {}, tool_use_id: 'tu_1' }],
      session_id: 'sess_1',
    };
    expect(input.hook_event_name).toBe('PostToolBatch');
    expect(input.tool_calls).toHaveLength(1);
  });

  test('PostToolBatchHookSpecificOutput is importable', () => {
    const output: import('../../src/types/index.ts').PostToolBatchHookSpecificOutput = {
      hookEventName: 'PostToolBatch',
      additionalContext: 'extra context',
    };
    expect(output.hookEventName).toBe('PostToolBatch');
  });

  test('PostToolBatchToolCall is importable', () => {
    const call: import('../../src/types/index.ts').PostToolBatchToolCall = {
      tool_name: 'Read',
      tool_input: { path: '/tmp/file' },
      tool_use_id: 'tu_1',
      tool_response: 'file contents',
    };
    expect(call.tool_name).toBe('Read');
  });

  test('UserPromptExpansionHookInput is importable', () => {
    const input: import('../../src/types/index.ts').UserPromptExpansionHookInput = {
      hook_event_name: 'UserPromptExpansion',
      expansion_type: 'slash_command',
      command_name: 'test',
      command_args: '',
      prompt: 'expanded prompt',
      session_id: 'sess_1',
    };
    expect(input.hook_event_name).toBe('UserPromptExpansion');
  });

  test('UserPromptExpansionHookSpecificOutput is importable', () => {
    const output: import('../../src/types/index.ts').UserPromptExpansionHookSpecificOutput = {
      hookEventName: 'UserPromptExpansion',
      additionalContext: 'more context',
    };
    expect(output.hookEventName).toBe('UserPromptExpansion');
  });

  test('SessionSummaryEntry is importable', () => {
    const entry: import('../../src/types/index.ts').SessionSummaryEntry = {
      sessionId: 'sess_1',
      mtime: Date.now(),
      data: { key: 'value' },
    };
    expect(entry.sessionId).toBe('sess_1');
  });

  test('AnyZodRawShape and InferShape are importable', () => {
    // Type-level only — just checks that imports resolve
    type _Shape = import('../../src/types/index.ts').AnyZodRawShape;
    type _Inferred = import('../../src/types/index.ts').InferShape<Record<string, never>>;
    expect(true).toBe(true);
  });

  test('AbortError is importable and instanceof Error', () => {
    const err = new AbortError('aborted');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('aborted');
  });
});

describe('v0.2.133 type re-exports', () => {
  test('SessionStoreFlush is importable', () => {
    const flush: import('../../src/types/index.ts').SessionStoreFlush = 'eager';
    expect(flush).toBe('eager');
  });

  test('Options.skills accepts string array', () => {
    const options: import('../../src/types/index.ts').Options = {
      skills: ['pdf', 'docx'],
    };
    expect(options.skills).toEqual(['pdf', 'docx']);
  });

  test('Options.skills accepts all', () => {
    const options: import('../../src/types/index.ts').Options = {
      skills: 'all',
    };
    expect(options.skills).toBe('all');
  });
});

describe('v0.3.142 type re-exports', () => {
  test('SDKPermissionDeniedMessage is importable and part of SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKPermissionDeniedMessage = {
      type: 'system',
      subtype: 'permission_denied',
      tool_name: 'Write',
      tool_use_id: 'tu_123',
      message: 'Permission denied: Write not allowed',
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKPermissionDeniedMessage['uuid'],
      session_id: 'session-123',
    };
    expect(msg.subtype).toBe('permission_denied');
    expect(msg.tool_name).toBe('Write');
    // Verify it's assignable to SDKMessage
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('ResolvedSettings is importable', () => {
    const resolved: import('../../src/types/index.ts').ResolvedSettings = {
      effective: {} as import('../../src/types/index.ts').Settings,
      provenance: {},
      sources: [{ source: 'user', settings: {} as import('../../src/types/index.ts').Settings }],
    };
    expect(resolved.sources).toHaveLength(1);
    expect(resolved.sources[0].source).toBe('user');
  });

  test('ResolvedSettingSource accepts managed and flag', () => {
    const managed: import('../../src/types/index.ts').ResolvedSettingSource = 'managed';
    const flag: import('../../src/types/index.ts').ResolvedSettingSource = 'flag';
    const user: import('../../src/types/index.ts').ResolvedSettingSource = 'user';
    expect(managed).toBe('managed');
    expect(flag).toBe('flag');
    expect(user).toBe('user');
  });

  test('PolicySettingsOrigin accepts valid origins', () => {
    const plist: import('../../src/types/index.ts').PolicySettingsOrigin = 'plist';
    const hklm: import('../../src/types/index.ts').PolicySettingsOrigin = 'hklm';
    const remote: import('../../src/types/index.ts').PolicySettingsOrigin = 'remote';
    expect(plist).toBe('plist');
    expect(hklm).toBe('hklm');
    expect(remote).toBe('remote');
  });

  test('filterEscalatingDefaultMode is importable from main entry', () => {
    const { filterEscalatingDefaultMode } = require('../../src/index.ts');
    expect(typeof filterEscalatingDefaultMode).toBe('function');
  });

  test('resolveSettings is importable from main entry', () => {
    const { resolveSettings } = require('../../src/index.ts');
    expect(typeof resolveSettings).toBe('function');
  });
});

describe('v0.3.144 type re-exports', () => {
  test('BackgroundTaskSummary is importable', () => {
    const summary: import('../../src/types/index.ts').BackgroundTaskSummary = {
      id: 'task-1',
      type: 'shell',
      status: 'running',
      description: 'Running tests',
      command: 'bun test',
    };
    expect(summary.id).toBe('task-1');
    expect(summary.type).toBe('shell');
    expect(summary.command).toBe('bun test');
  });

  test('SessionCronSummary is importable', () => {
    const cron: import('../../src/types/index.ts').SessionCronSummary = {
      id: 'cron-1',
      schedule: '0 9 * * 1-5',
      recurring: true,
      prompt: 'Run daily standup',
    };
    expect(cron.id).toBe('cron-1');
    expect(cron.schedule).toBe('0 9 * * 1-5');
    expect(cron.recurring).toBe(true);
  });

  test('SDKResultSuccess includes api_error_status field', () => {
    const result: import('../../src/types/index.ts').SDKResultSuccess = {
      type: 'result',
      subtype: 'success',
      duration_ms: 1000,
      duration_api_ms: 800,
      is_error: false,
      api_error_status: 429,
      num_turns: 1,
      result: 'done',
      stop_reason: 'end_turn',
      total_cost_usd: 0.001,
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
      modelUsage: {},
      permission_denials: [],
      uuid: 'uuid-1' as import('../../src/types/index.ts').SDKResultSuccess['uuid'],
      session_id: 'session-1',
    };
    expect(result.api_error_status).toBe(429);
  });

  test('SDKAssistantMessageError accepts model_not_found', () => {
    const error: import('../../src/types/index.ts').SDKAssistantMessageError = 'model_not_found';
    expect(error).toBe('model_not_found');
  });

  test('StopHookInput accepts background_tasks and session_crons', () => {
    const input: import('../../src/types/index.ts').StopHookInput = {
      session_id: 'session-1',
      transcript_path: '/tmp/t.jsonl',
      cwd: '/home/user',
      hook_event_name: 'Stop',
      stop_hook_active: false,
      background_tasks: [{ id: 'task-1', type: 'shell', status: 'done', description: 'ran' }],
      session_crons: [{ id: 'cron-1', schedule: '0 9 * * *', recurring: false, prompt: 'wake' }],
    };
    expect(input.background_tasks).toHaveLength(1);
    expect(input.session_crons).toHaveLength(1);
  });
});

describe('v0.3.152 type re-exports', () => {
  test('MessageDisplayHookInput is importable', () => {
    const input: import('../../src/types/index.ts').MessageDisplayHookInput = {
      session_id: 'session-1',
      transcript_path: '/tmp/t.jsonl',
      cwd: '/home/user',
      hook_event_name: 'MessageDisplay',
      turn_id: 'turn-abc',
      message_id: 'msg-xyz',
      index: 0,
      final: false,
      delta: 'Hello, world!\n',
    };
    expect(input.hook_event_name).toBe('MessageDisplay');
    expect(input.delta).toBe('Hello, world!\n');
    expect(input.final).toBe(false);
    expect(input.index).toBe(0);
  });

  test('MessageDisplayHookSpecificOutput is importable', () => {
    const output: import('../../src/types/index.ts').MessageDisplayHookSpecificOutput = {
      hookEventName: 'MessageDisplay',
      displayContent: 'Transformed text',
    };
    expect(output.hookEventName).toBe('MessageDisplay');
    expect(output.displayContent).toBe('Transformed text');
  });

  test('MessageDisplayHookSpecificOutput displayContent is optional', () => {
    const output: import('../../src/types/index.ts').MessageDisplayHookSpecificOutput = {
      hookEventName: 'MessageDisplay',
    };
    expect(output.displayContent).toBeUndefined();
  });

  test('SessionStartHookSpecificOutput has reloadSkills and sessionTitle fields', () => {
    const output: import('../../src/types/index.ts').SessionStartHookSpecificOutput = {
      hookEventName: 'SessionStart',
      sessionTitle: 'My Session',
      reloadSkills: true,
    };
    expect(output.sessionTitle).toBe('My Session');
    expect(output.reloadSkills).toBe(true);
  });

  test('HOOK_EVENTS includes MessageDisplay', () => {
    const { HOOK_EVENTS } = require('../../src/types/index.ts');
    expect(HOOK_EVENTS).toContain('MessageDisplay');
  });

  test('HookEvent type accepts MessageDisplay', () => {
    const event: import('../../src/types/index.ts').HookEvent = 'MessageDisplay';
    expect(event).toBe('MessageDisplay');
  });

  test('HookInput union includes MessageDisplayHookInput', () => {
    const input: import('../../src/types/index.ts').HookInput = {
      session_id: 'session-1',
      transcript_path: '/tmp/t.jsonl',
      cwd: '/home/user',
      hook_event_name: 'MessageDisplay',
      turn_id: 'turn-abc',
      message_id: 'msg-xyz',
      index: 0,
      final: true,
      delta: '',
    };
    expect(input.hook_event_name).toBe('MessageDisplay');
  });
});

describe('v0.3.158 type re-exports', () => {
  test('SDKThinkingTokensMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKThinkingTokensMessage = {
      type: 'system',
      subtype: 'thinking_tokens',
      estimated_tokens: 150,
      estimated_tokens_delta: 10,
      uuid: 'uuid-123' as import('../../src/types/index.ts').SDKThinkingTokensMessage['uuid'],
      session_id: 'session-abc',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('thinking_tokens');
    expect(msg.estimated_tokens).toBe(150);
    expect(msg.estimated_tokens_delta).toBe(10);
  });

  test('SDKThinkingTokensMessage is assignable to SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKThinkingTokensMessage = {
      type: 'system',
      subtype: 'thinking_tokens',
      estimated_tokens: 200,
      estimated_tokens_delta: 5,
      uuid: 'uuid-456' as import('../../src/types/index.ts').SDKThinkingTokensMessage['uuid'],
      session_id: 'session-def',
    };
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });
});

describe('v0.3.165 type re-exports', () => {
  test('StopHookSpecificOutput is importable', () => {
    const out: import('../../src/types/index.ts').StopHookSpecificOutput = {
      hookEventName: 'Stop',
      additionalContext: 'some context',
    };
    expect(out.hookEventName).toBe('Stop');
  });

  test('SubagentStopHookSpecificOutput is importable', () => {
    const out: import('../../src/types/index.ts').SubagentStopHookSpecificOutput = {
      hookEventName: 'SubagentStop',
    };
    expect(out.hookEventName).toBe('SubagentStop');
  });

  test('UserDialogRequest is importable', () => {
    const req: import('../../src/types/index.ts').UserDialogRequest = {
      dialogKind: 'confirm',
      payload: { message: 'Are you sure?' },
    };
    expect(req.dialogKind).toBe('confirm');
  });

  test('UserDialogResult is importable', () => {
    const result: import('../../src/types/index.ts').UserDialogResult = {
      behavior: 'cancelled',
    };
    expect(result.behavior).toBe('cancelled');
  });

  test('OnUserDialog is a valid callback type', () => {
    const cb: import('../../src/types/index.ts').OnUserDialog = async (_req, _opts) => ({
      behavior: 'cancelled',
    });
    expect(typeof cb).toBe('function');
  });

  test('SDKControlReloadSkillsResponse is importable', () => {
    const resp: import('../../src/types/index.ts').SDKControlReloadSkillsResponse = {
      skills: [],
    };
    expect(resp.skills).toHaveLength(0);
  });
});

describe('v0.3.161 type re-exports', () => {
  test('SDKCommandsChangedMessage is importable', () => {
    const msg: import('../../src/types/index.ts').SDKCommandsChangedMessage = {
      type: 'system',
      subtype: 'commands_changed',
      commands: [{ name: 'review', description: 'Review code', argumentHint: '' }],
      uuid: 'uuid-789' as import('../../src/types/index.ts').SDKCommandsChangedMessage['uuid'],
      session_id: 'session-ghi',
    };
    expect(msg.type).toBe('system');
    expect(msg.subtype).toBe('commands_changed');
    expect(msg.commands).toHaveLength(1);
  });

  test('SDKCommandsChangedMessage is assignable to SDKMessage', () => {
    const msg: import('../../src/types/index.ts').SDKCommandsChangedMessage = {
      type: 'system',
      subtype: 'commands_changed',
      commands: [],
      uuid: 'uuid-101' as import('../../src/types/index.ts').SDKCommandsChangedMessage['uuid'],
      session_id: 'session-jkl',
    };
    const sdkMsg: import('../../src/types/index.ts').SDKMessage = msg;
    expect(sdkMsg.type).toBe('system');
  });

  test('ControlResponseSuccess accepts pending_permission_requests', () => {
    const success: import('../../src/types/control.ts').ControlResponseSuccess = {
      subtype: 'success',
      request_id: 'req-001',
      response: {},
      pending_permission_requests: [],
    };
    expect(success.subtype).toBe('success');
    expect(success.pending_permission_requests).toEqual([]);
  });
});
