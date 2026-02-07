/**
 * Type-safe control request builders
 *
 * Provides type-safe creation of control protocol requests sent to Claude CLI.
 * Subtypes reference constants from types/control.ts — single source of truth.
 *
 * @internal
 */

import type { McpServerConfig, PermissionMode } from '../types/index.ts';
import { RequestSubtype } from '../types/control.ts';
import type {
  InterruptRequest,
  SetPermissionModeRequest,
  SetModelRequest,
  SetMaxThinkingTokensRequest,
  McpStatusRequest,
  McpReconnectRequest,
  McpToggleRequest,
  McpSetServersRequest,
} from '../types/control.ts';

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
  interrupt: (): InterruptRequest => ({
    subtype: RequestSubtype.INTERRUPT,
  }),

  setPermissionMode: (mode: PermissionMode): SetPermissionModeRequest => ({
    subtype: RequestSubtype.SET_PERMISSION_MODE,
    mode,
  }),

  setModel: (model?: string): SetModelRequest => ({
    subtype: RequestSubtype.SET_MODEL,
    model,
  }),

  setMaxThinkingTokens: (tokens: number | null): SetMaxThinkingTokensRequest => ({
    subtype: RequestSubtype.SET_MAX_THINKING_TOKENS,
    max_thinking_tokens: tokens,
  }),

  mcpStatus: (): McpStatusRequest => ({
    subtype: RequestSubtype.MCP_STATUS,
  }),

  mcpReconnect: (serverName: string): McpReconnectRequest => ({
    subtype: RequestSubtype.MCP_RECONNECT,
    serverName,
  }),

  mcpToggle: (serverName: string, enabled: boolean): McpToggleRequest => ({
    subtype: RequestSubtype.MCP_TOGGLE,
    serverName,
    enabled,
  }),

  mcpSetServers: (servers: Record<string, McpServerConfig>): McpSetServersRequest => ({
    subtype: RequestSubtype.MCP_SET_SERVERS,
    servers,
  }),
};
