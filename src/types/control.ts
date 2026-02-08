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
  MCP_SET_SERVERS: 'mcp_set_servers',
  MCP_RECONNECT: 'mcp_reconnect',
  MCP_TOGGLE: 'mcp_toggle',
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
  | McpSetServersRequest
  | McpReconnectRequest
  | McpToggleRequest;

export type CanUseToolRequest = {
  subtype: typeof RequestSubtype.CAN_USE_TOOL;
  tool_name: string;
  input: Record<string, unknown>;
  tool_use_id: string;
  permission_suggestions?: PermissionUpdate[];
  blocked_path?: string;
  decision_reason?: string;
  agent_id?: string;
};

export type HookCallbackRequest = {
  subtype: typeof RequestSubtype.HOOK_CALLBACK;
  callback_id: string;
  input: HookInput;
  tool_use_id?: string;
};

export type InitializeRequest = {
  subtype: typeof RequestSubtype.INITIALIZE;
  hooks?: Record<string, unknown>;
  sdkMcpServers?: string[];
  jsonSchema?: Record<string, unknown>;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  agents?: Record<string, unknown>;
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
};

export type ControlResponseError = {
  subtype: typeof ResponseSubtype.ERROR;
  request_id: string;
  error: string;
  pending_permission_requests?: ControlRequest[];
};
