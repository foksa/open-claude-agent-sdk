/**
 * Control Protocol
 *
 * Handles bidirectional control protocol communication with Claude CLI:
 * - ControlProtocolHandler: routes incoming requests, sends responses
 * - ControlRequests: type-safe builders for outbound requests
 * - OutboundControlRequest: union type for all SDK → CLI requests
 *
 * @internal
 */

import type { Writable } from 'node:stream';
import {
  type ControlRequest,
  type ControlResponse,
  type InternalHookCallback,
  type InterruptRequest,
  type McpReconnectRequest,
  type McpSetServersRequest,
  type McpStatusRequest,
  type McpToggleRequest,
  MessageType,
  RequestSubtype,
  ResponseSubtype,
  type SetMaxThinkingTokensRequest,
  type SetModelRequest,
  type SetPermissionModeRequest,
} from '../types/control.ts';
import type { McpServerConfig, Options, PermissionMode, PermissionResult } from '../types/index.ts';
import type { McpServerBridge } from './mcpBridge.ts';

// ============================================================================
// Outbound request builders (SDK → CLI)
// ============================================================================

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

// ============================================================================
// Inbound request handler (CLI → SDK)
// ============================================================================

export class ControlProtocolHandler {
  private callbackMap: Map<string, InternalHookCallback> = new Map();
  private mcpServerBridges: Map<string, McpServerBridge> = new Map();

  constructor(
    private stdin: Writable,
    private options: Options
  ) {}

  /**
   * Set MCP server bridges for routing mcp_message requests
   */
  setMcpServerBridges(bridges: Map<string, McpServerBridge>): void {
    this.mcpServerBridges = bridges;
  }

  /**
   * Register a callback function with its ID
   */
  registerCallback(id: string, callback: InternalHookCallback): void {
    this.callbackMap.set(id, callback);
  }

  /**
   * Handle control request from CLI
   * Routes to appropriate handler based on request subtype
   */
  async handleControlRequest(req: ControlRequest): Promise<void> {
    if (process.env.DEBUG_HOOKS) {
      console.error('[DEBUG] Control request:', JSON.stringify(req, null, 2));
      console.error('[DEBUG] Subtype:', req.request.subtype);
    }

    try {
      switch (req.request.subtype) {
        case RequestSubtype.CAN_USE_TOOL:
          if (process.env.DEBUG_HOOKS) console.error('[DEBUG] Handling can_use_tool');
          await this.handleCanUseTool(req);
          break;
        case RequestSubtype.HOOK_CALLBACK:
          if (process.env.DEBUG_HOOKS) console.error('[DEBUG] Handling hook_callback');
          await this.handleHookCallback(req);
          break;
        case RequestSubtype.INITIALIZE:
          await this.handleInitialize(req);
          break;
        case RequestSubtype.INTERRUPT:
          await this.handleInterrupt(req);
          break;
        case RequestSubtype.MCP_MESSAGE:
          await this.handleMcpMessage(req);
          break;
        case RequestSubtype.SET_PERMISSION_MODE:
        case RequestSubtype.SET_MODEL:
        case RequestSubtype.SET_MAX_THINKING_TOKENS:
        case RequestSubtype.MCP_STATUS:
        case RequestSubtype.REWIND_FILES:
        case RequestSubtype.MCP_SET_SERVERS:
        case RequestSubtype.MCP_RECONNECT:
        case RequestSubtype.MCP_TOGGLE:
          // These are sent FROM SDK TO CLI, not the other way around
          // If we receive them, just acknowledge
          this.sendSuccess(req.request_id, {});
          break;
        default:
          this.sendError(
            req.request_id,
            `Unknown request type: ${(req.request as { subtype: string }).subtype}`
          );
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.sendError(req.request_id, message);
    }
  }

  private async handleCanUseTool(req: ControlRequest) {
    if (req.request.subtype !== RequestSubtype.CAN_USE_TOOL) return;

    const {
      tool_name,
      input,
      tool_use_id,
      permission_suggestions,
      blocked_path,
      decision_reason,
      agent_id,
    } = req.request;

    if (!this.options.canUseTool) {
      this.sendSuccess(req.request_id, { behavior: 'allow' });
      return;
    }

    const result: PermissionResult = await this.options.canUseTool(tool_name, input, {
      signal: new AbortController().signal,
      suggestions: permission_suggestions,
      blockedPath: blocked_path,
      decisionReason: decision_reason,
      toolUseID: tool_use_id,
      agentID: agent_id,
    });

    this.sendSuccess(req.request_id, result);
  }

  private async handleHookCallback(req: ControlRequest) {
    if (req.request.subtype !== RequestSubtype.HOOK_CALLBACK) return;

    const { callback_id, input, tool_use_id } = req.request;

    if (process.env.DEBUG_HOOKS) {
      console.error('[DEBUG] handleHookCallback:', {
        callback_id,
        has_hook: this.callbackMap.has(callback_id),
        map_size: this.callbackMap.size,
      });
    }

    const hookFn = this.callbackMap.get(callback_id);

    if (!hookFn) {
      if (process.env.DEBUG_HOOKS) {
        console.error('[DEBUG] No hook found for callback_id:', callback_id);
      }
      this.sendSuccess(req.request_id, { continue: true });
      return;
    }

    try {
      if (process.env.DEBUG_HOOKS) {
        console.error('[DEBUG] Executing hook:', callback_id);
      }
      const result = await hookFn(input, tool_use_id, {
        signal: new AbortController().signal,
      });

      this.sendSuccess(req.request_id, result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Hook execution failed';
      this.sendError(req.request_id, message);
    }
  }

  private async handleInitialize(req: ControlRequest) {
    this.sendSuccess(req.request_id, {});
  }

  private async handleInterrupt(req: ControlRequest) {
    this.sendSuccess(req.request_id, {});
  }

  private async handleMcpMessage(req: ControlRequest) {
    if (req.request.subtype !== RequestSubtype.MCP_MESSAGE) return;

    const { server_name, message } = req.request;
    const bridge = this.mcpServerBridges.get(server_name);

    if (!bridge) {
      this.sendError(req.request_id, `SDK MCP server not found: ${server_name}`);
      return;
    }

    const response = await bridge.handleMessage(message);
    this.sendSuccess(req.request_id, { mcp_response: response });
  }

  private sendSuccess(request_id: string, response: Record<string, unknown>) {
    this.sendControlResponse({
      type: MessageType.CONTROL_RESPONSE,
      response: {
        subtype: ResponseSubtype.SUCCESS,
        request_id,
        response,
      },
    });
  }

  private sendError(request_id: string, error: string) {
    this.sendControlResponse({
      type: MessageType.CONTROL_RESPONSE,
      response: {
        subtype: ResponseSubtype.ERROR,
        request_id,
        error,
      },
    });
  }

  private sendControlResponse(response: ControlResponse) {
    this.stdin.write(`${JSON.stringify(response)}\n`);
  }
}
