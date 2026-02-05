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

import type { HookInput, PermissionMode, SDKMessage } from './index.ts';

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
  type: 'control_request';
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

/**
 * Permission check request
 */
export type CanUseToolRequest = {
  subtype: 'can_use_tool';
  tool_name: string;
  input: Record<string, unknown>;
  tool_use_id: string;
  permission_suggestions?: any[];
  blocked_path?: string;
  decision_reason?: string;
  agent_id?: string;
};

/**
 * Hook callback request
 */
export type HookCallbackRequest = {
  subtype: 'hook_callback';
  callback_id: string;
  input: HookInput;
  tool_use_id?: string;
};

/**
 * Session initialization request
 */
export type InitializeRequest = {
  subtype: 'initialize';
  hooks?: Record<string, any>;
  sdkMcpServers?: string[];
  jsonSchema?: Record<string, unknown>;
  systemPrompt?: string;
  appendSystemPrompt?: string;
  agents?: Record<string, any>;
};

/**
 * Interrupt execution request
 */
export type InterruptRequest = {
  subtype: 'interrupt';
};

/**
 * Change permission mode request
 */
export type SetPermissionModeRequest = {
  subtype: 'set_permission_mode';
  mode: PermissionMode;
};

/**
 * Change model request
 */
export type SetModelRequest = {
  subtype: 'set_model';
  model?: string;
};

/**
 * Set max thinking tokens request
 */
export type SetMaxThinkingTokensRequest = {
  subtype: 'set_max_thinking_tokens';
  max_thinking_tokens: number | null;
};

/**
 * Get MCP server status request
 */
export type McpStatusRequest = {
  subtype: 'mcp_status';
};

/**
 * Send message to MCP server request
 */
export type McpMessageRequest = {
  subtype: 'mcp_message';
  server_name: string;
  message: any;
};

/**
 * Rewind files to previous state request
 */
export type RewindFilesRequest = {
  subtype: 'rewind_files';
  user_message_id: string;
  dry_run?: boolean;
};

/**
 * Set MCP servers dynamically request
 */
export type McpSetServersRequest = {
  subtype: 'mcp_set_servers';
  servers: Record<string, any>;
};

/**
 * Reconnect MCP server request
 */
export type McpReconnectRequest = {
  subtype: 'mcp_reconnect';
  serverName: string;
};

/**
 * Toggle MCP server enabled/disabled request
 */
export type McpToggleRequest = {
  subtype: 'mcp_toggle';
  serverName: string;
  enabled: boolean;
};

/**
 * Control response sent to CLI via stdin
 */
export type ControlResponse = {
  type: 'control_response';
  response: ControlResponseInner;
};

/**
 * Response payload (success or error)
 */
export type ControlResponseInner = ControlResponseSuccess | ControlResponseError;

/**
 * Successful control response
 */
export type ControlResponseSuccess = {
  subtype: 'success';
  request_id: string;
  response?: Record<string, unknown>;
};

/**
 * Error control response
 */
export type ControlResponseError = {
  subtype: 'error';
  request_id: string;
  error: string;
  pending_permission_requests?: ControlRequest[];
};
