/**
 * Type-safe control request builders
 *
 * Provides type-safe creation of control protocol requests sent to Claude CLI.
 * Replaces inline object literals with validated builder functions.
 *
 * @internal
 */

import type { PermissionMode } from '../types/index.ts';

// ============================================================================
// Control Request Types
// ============================================================================

export type InterruptRequest = {
  subtype: 'interrupt';
};

export type SetPermissionModeRequest = {
  subtype: 'set_permission_mode';
  mode: PermissionMode;
};

export type SetModelRequest = {
  subtype: 'set_model';
  model?: string;
};

export type SetMaxThinkingTokensRequest = {
  subtype: 'set_max_thinking_tokens';
  max_thinking_tokens: number | null;
};

export type McpStatusRequest = {
  subtype: 'mcp_status';
};

export type McpReconnectRequest = {
  subtype: 'mcp_reconnect';
  serverName: string;
};

export type McpToggleRequest = {
  subtype: 'mcp_toggle';
  serverName: string;
  enabled: boolean;
};

export type McpSetServersRequest = {
  subtype: 'mcp_set_servers';
  // biome-ignore lint/suspicious/noExplicitAny: server config shape varies
  servers: Record<string, any>;
};

/**
 * Union of all outbound control request types (sent from SDK to CLI)
 */
export type OutboundControlRequest =
  | InterruptRequest
  | SetPermissionModeRequest
  | SetModelRequest
  | SetMaxThinkingTokensRequest
  | McpStatusRequest
  | McpReconnectRequest
  | McpToggleRequest
  | McpSetServersRequest;

// ============================================================================
// Type-safe Request Builders
// ============================================================================

/**
 * Type-safe control request builder functions
 *
 * Usage:
 * ```typescript
 * this.sendControlRequest(ControlRequests.interrupt());
 * this.sendControlRequest(ControlRequests.setPermissionMode('bypassPermissions'));
 * ```
 */
export const ControlRequests = {
  /**
   * Create interrupt request to stop current execution
   */
  interrupt: (): InterruptRequest => ({
    subtype: 'interrupt',
  }),

  /**
   * Create permission mode change request
   */
  setPermissionMode: (mode: PermissionMode): SetPermissionModeRequest => ({
    subtype: 'set_permission_mode',
    mode,
  }),

  /**
   * Create model change request
   */
  setModel: (model?: string): SetModelRequest => ({
    subtype: 'set_model',
    model,
  }),

  /**
   * Create max thinking tokens change request
   */
  setMaxThinkingTokens: (tokens: number | null): SetMaxThinkingTokensRequest => ({
    subtype: 'set_max_thinking_tokens',
    max_thinking_tokens: tokens,
  }),

  /**
   * Create MCP server status request
   */
  mcpStatus: (): McpStatusRequest => ({
    subtype: 'mcp_status',
  }),

  /**
   * Create MCP server reconnect request
   */
  mcpReconnect: (serverName: string): McpReconnectRequest => ({
    subtype: 'mcp_reconnect',
    serverName,
  }),

  /**
   * Create MCP server toggle request
   */
  mcpToggle: (serverName: string, enabled: boolean): McpToggleRequest => ({
    subtype: 'mcp_toggle',
    serverName,
    enabled,
  }),

  /**
   * Create MCP set servers request
   */
  // biome-ignore lint/suspicious/noExplicitAny: server config shape varies
  mcpSetServers: (servers: Record<string, any>): McpSetServersRequest => ({
    subtype: 'mcp_set_servers',
    servers,
  }),
};
