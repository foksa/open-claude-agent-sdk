/**
 * Internal control protocol types
 *
 * These types are used internally for bidirectional communication with Claude CLI.
 * They are NOT exported to SDK users - control protocol is implementation detail.
 *
 * Reference: https://buildwithaws.substack.com/p/inside-the-claude-agent-sdk-from
 *
 * @internal
 */

import type { HookInput, PermissionMode, PermissionUpdate, SDKMessage } from './index.ts';

// ============================================================================
// Protocol constants — single source of truth for all wire format strings
// ============================================================================

/** Message types on the wire (stdout/stdin) */
export const MessageType = {
  CONTROL_REQUEST: 'control_request',
  CONTROL_RESPONSE: 'control_response',
} as const;

/** Control request subtypes (CLI → SDK and SDK → CLI) */
export const RequestSubtype = {
  CAN_USE_TOOL: 'can_use_tool',
  HOOK_CALLBACK: 'hook_callback',
  INITIALIZE: 'initialize',
  INTERRUPT: 'interrupt',
  SET_PERMISSION_MODE: 'set_permission_mode',
  SET_MODEL: 'set_model',
  SET_MAX_THINKING_TOKENS: 'set_max_thinking_tokens',
  MCP_STATUS: 'mcp_status',
  MCP_MESSAGE: 'mcp_message',
  REWIND_FILES: 'rewind_files',
  STOP_TASK: 'stop_task',
  MCP_SET_SERVERS: 'mcp_set_servers',
  MCP_RECONNECT: 'mcp_reconnect',
  MCP_TOGGLE: 'mcp_toggle',
  SET_MCP_PERMISSION_MODE_OVERRIDE: 'set_mcp_permission_mode_override',
  APPLY_FLAG_SETTINGS: 'apply_flag_settings',
  RELOAD_PLUGINS: 'reload_plugins',
  RELOAD_SKILLS: 'reload_skills',
  SEED_READ_STATE: 'seed_read_state',
  GET_CONTEXT_USAGE: 'get_context_usage',
  GET_USAGE: 'get_usage',
  ELICITATION: 'elicitation',
  READ_FILE: 'read_file',
  BACKGROUND_TASKS: 'background_tasks',
  REQUEST_USER_DIALOG: 'request_user_dialog',
} as const;

/** Control response subtypes */
export const ResponseSubtype = {
  SUCCESS: 'success',
  ERROR: 'error',
} as const;

// ============================================================================
// Types
// ============================================================================

/**
 * Internal hook callback function type
 *
 * Used by ControlProtocolHandler to store and invoke hook callbacks.
 * This mirrors the HookCallback from official SDK but is defined here
 * for internal use to avoid circular dependencies.
 */
export type InternalHookCallback = (
  input: Record<string, unknown>,
  toolUseId: string | undefined,
  options: { signal: AbortSignal }
) => Promise<Record<string, unknown>>;

/**
 * Messages from CLI stdout (can be regular messages OR control requests)
 */
export type StdoutMessage = SDKMessage | ControlRequest;

/**
 * Control request from CLI - requires SDK to send response on stdin
 */
export type ControlRequest = {
  type: typeof MessageType.CONTROL_REQUEST;
  request_id: string;
  request: ControlRequestInner;
};

/**
 * All possible control request types
 */
export type ControlRequestInner =
  | CanUseToolRequest
  | HookCallbackRequest
  | InitializeRequest
  | InterruptRequest
  | SetPermissionModeRequest
  | SetModelRequest
  | SetMaxThinkingTokensRequest
  | McpStatusRequest
  | McpMessageRequest
  | RewindFilesRequest
  | StopTaskRequest
  | McpSetServersRequest
  | McpReconnectRequest
  | McpToggleRequest
  | SetMcpPermissionModeOverrideRequest
  | ApplyFlagSettingsRequest
  | ReloadPluginsRequest
  | SeedReadStateRequest
  | GetContextUsageRequest
  | ElicitationControlRequest
  | ReadFileRequest
  | BackgroundTasksRequest
  | ReloadSkillsRequest
  | RequestUserDialogRequest
  | GetUsageRequest;

export type CanUseToolRequest = {
  subtype: typeof RequestSubtype.CAN_USE_TOOL;
  tool_name: string;
  input: Record<string, unknown>;
  tool_use_id: string;
  permission_suggestions?: PermissionUpdate[];
  blocked_path?: string;
  decision_reason?: string;
  title?: string;
  display_name?: string;
  agent_id?: string;
  description?: string;
};

export type HookCallbackRequest = {
  subtype: typeof RequestSubtype.HOOK_CALLBACK;
  callback_id: string;
  input: HookInput;
  tool_use_id?: string;
};

export type InitializeRequest = {
  subtype: typeof RequestSubtype.INITIALIZE;
  systemPrompt?: string[];
  appendSystemPrompt?: string;
  sdkMcpServers?: string[];
  sdkMcpServerConfigs?: Record<string, { timeout?: number }>;
  agents?: Record<string, unknown>;
  hooks?: Record<string, unknown>;
  excludeDynamicSections?: boolean;
  promptSuggestions?: boolean;
  agentProgressSummaries?: boolean;
  title?: string;
  skills?: string[];
  perTaskStopAffordance?: boolean;
};

export type InterruptRequest = {
  subtype: typeof RequestSubtype.INTERRUPT;
};

export type SetPermissionModeRequest = {
  subtype: typeof RequestSubtype.SET_PERMISSION_MODE;
  mode: PermissionMode;
};

export type SetModelRequest = {
  subtype: typeof RequestSubtype.SET_MODEL;
  model?: string;
};

export type SetMaxThinkingTokensRequest = {
  subtype: typeof RequestSubtype.SET_MAX_THINKING_TOKENS;
  max_thinking_tokens: number | null;
};

export type McpStatusRequest = {
  subtype: typeof RequestSubtype.MCP_STATUS;
};

export type McpMessageRequest = {
  subtype: typeof RequestSubtype.MCP_MESSAGE;
  server_name: string;
  message: Record<string, unknown>;
};

export type RewindFilesRequest = {
  subtype: typeof RequestSubtype.REWIND_FILES;
  user_message_id: string;
  dry_run?: boolean;
};

export type StopTaskRequest = {
  subtype: typeof RequestSubtype.STOP_TASK;
  task_id: string;
};

export type McpSetServersRequest = {
  subtype: typeof RequestSubtype.MCP_SET_SERVERS;
  servers: Record<string, unknown>;
};

export type McpReconnectRequest = {
  subtype: typeof RequestSubtype.MCP_RECONNECT;
  serverName: string;
};

export type McpToggleRequest = {
  subtype: typeof RequestSubtype.MCP_TOGGLE;
  serverName: string;
  enabled: boolean;
};

export type SetMcpPermissionModeOverrideRequest = {
  subtype: typeof RequestSubtype.SET_MCP_PERMISSION_MODE_OVERRIDE;
  serverName: string;
  mode: 'default' | 'auto' | null;
};

export type ApplyFlagSettingsRequest = {
  subtype: typeof RequestSubtype.APPLY_FLAG_SETTINGS;
  settings: Record<string, unknown>;
};

export type ReloadPluginsRequest = {
  subtype: typeof RequestSubtype.RELOAD_PLUGINS;
};

export type ReloadSkillsRequest = {
  subtype: typeof RequestSubtype.RELOAD_SKILLS;
};

export type RequestUserDialogRequest = {
  subtype: typeof RequestSubtype.REQUEST_USER_DIALOG;
  dialog_kind: string;
  payload: Record<string, unknown>;
  tool_use_id?: string;
};

export type SeedReadStateRequest = {
  subtype: typeof RequestSubtype.SEED_READ_STATE;
  path: string;
  mtime: number;
};

export type GetContextUsageRequest = {
  subtype: typeof RequestSubtype.GET_CONTEXT_USAGE;
};

export type GetUsageRequest = {
  subtype: typeof RequestSubtype.GET_USAGE;
};

export type ReadFileRequest = {
  subtype: typeof RequestSubtype.READ_FILE;
  path: string;
  max_bytes?: number;
};

export type ElicitationControlRequest = {
  subtype: typeof RequestSubtype.ELICITATION;
  mcp_server_name: string;
  message: string;
  mode?: 'form' | 'url';
  url?: string;
  elicitation_id?: string;
  requested_schema?: Record<string, unknown>;
  title?: string;
  display_name?: string;
  description?: string;
};

export type BackgroundTasksRequest = {
  subtype: typeof RequestSubtype.BACKGROUND_TASKS;
  tool_use_id?: string;
};

/**
 * Control response sent to CLI via stdin
 */
export type ControlResponse = {
  type: typeof MessageType.CONTROL_RESPONSE;
  response: ControlResponseInner;
};

export type ControlResponseInner = ControlResponseSuccess | ControlResponseError;

export type ControlResponseSuccess = {
  subtype: typeof ResponseSubtype.SUCCESS;
  request_id: string;
  response?: Record<string, unknown>;
  pending_permission_requests?: ControlRequest[];
};

export type ControlResponseError = {
  subtype: typeof ResponseSubtype.ERROR;
  request_id: string;
  error: string;
  pending_permission_requests?: ControlRequest[];
};
