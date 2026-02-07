/**
 * Control Protocol Handler
 *
 * Handles bidirectional control protocol communication with Claude CLI.
 * Routes control requests from CLI and sends responses back via stdin.
 *
 * @internal
 */

import type { Writable } from 'node:stream';
import type { ControlRequest, ControlResponse, InternalHookCallback } from '../types/control.ts';
import type { Options, PermissionResult } from '../types/index.ts';
import type { McpServerBridge } from './mcpBridge.ts';

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
    // Debug logging (enable via DEBUG_HOOKS env var)
    if (process.env.DEBUG_HOOKS) {
      console.error('[DEBUG] Control request:', JSON.stringify(req, null, 2));
      console.error('[DEBUG] Subtype:', req.request.subtype);
    }

    try {
      switch (req.request.subtype) {
        case 'can_use_tool':
          if (process.env.DEBUG_HOOKS) console.error('[DEBUG] Handling can_use_tool');
          await this.handleCanUseTool(req);
          break;
        case 'hook_callback':
          if (process.env.DEBUG_HOOKS) console.error('[DEBUG] Handling hook_callback');
          await this.handleHookCallback(req);
          break;
        case 'initialize':
          await this.handleInitialize(req);
          break;
        case 'interrupt':
          await this.handleInterrupt(req);
          break;
        case 'mcp_message':
          await this.handleMcpMessage(req);
          break;
        case 'set_permission_mode':
        case 'set_model':
        case 'set_max_thinking_tokens':
        case 'mcp_status':
        case 'rewind_files':
        case 'mcp_set_servers':
        case 'mcp_reconnect':
        case 'mcp_toggle':
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

  /**
   * Handle permission check request
   */
  private async handleCanUseTool(req: ControlRequest) {
    if (req.request.subtype !== 'can_use_tool') return;

    const {
      tool_name,
      input,
      tool_use_id,
      permission_suggestions,
      blocked_path,
      decision_reason,
      agent_id,
    } = req.request;

    // If no callback provided, allow by default
    if (!this.options.canUseTool) {
      this.sendSuccess(req.request_id, { behavior: 'allow' });
      return;
    }

    // Call user-provided permission callback
    const result: PermissionResult = await this.options.canUseTool(tool_name, input, {
      signal: new AbortController().signal, // TODO: proper abort signal handling
      suggestions: permission_suggestions,
      blockedPath: blocked_path,
      decisionReason: decision_reason,
      toolUseID: tool_use_id,
      agentID: agent_id,
    });

    this.sendSuccess(req.request_id, result);
  }

  /**
   * Handle hook callback request
   */
  private async handleHookCallback(req: ControlRequest) {
    if (req.request.subtype !== 'hook_callback') return;

    const { callback_id, input, tool_use_id } = req.request;

    if (process.env.DEBUG_HOOKS) {
      console.error('[DEBUG] handleHookCallback:', {
        callback_id,
        has_hook: this.callbackMap.has(callback_id),
        map_size: this.callbackMap.size,
      });
    }

    // Find the hook function by callback_id
    const hookFn = this.callbackMap.get(callback_id);

    if (!hookFn) {
      // No matching callback found, continue by default
      if (process.env.DEBUG_HOOKS) {
        console.error('[DEBUG] No hook found for callback_id:', callback_id);
      }
      this.sendSuccess(req.request_id, { continue: true });
      return;
    }

    // Execute the specific hook
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

  /**
   * Handle initialization request
   *
   * NOTE: We don't handle hooks here - QueryImpl already sends hooks config
   * in the initial control_request. This just acknowledges the response.
   */
  private async handleInitialize(req: ControlRequest) {
    // Just acknowledge - hooks are already configured in the request
    this.sendSuccess(req.request_id, {});
  }

  /**
   * Handle interrupt request
   */
  private async handleInterrupt(req: ControlRequest) {
    // Acknowledge interrupt
    this.sendSuccess(req.request_id, {});
  }

  /**
   * Handle MCP message from CLI — route to SDK MCP server bridge
   */
  private async handleMcpMessage(req: ControlRequest) {
    if (req.request.subtype !== 'mcp_message') return;

    const { server_name, message } = req.request;
    const bridge = this.mcpServerBridges.get(server_name);

    if (!bridge) {
      this.sendError(req.request_id, `SDK MCP server not found: ${server_name}`);
      return;
    }

    const response = await bridge.handleMessage(message);
    this.sendSuccess(req.request_id, { mcp_response: response });
  }

  /**
   * Send success response to CLI
   */
  private sendSuccess(request_id: string, response: Record<string, unknown>) {
    this.sendControlResponse({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id,
        response,
      },
    });
  }

  /**
   * Send error response to CLI
   */
  private sendError(request_id: string, error: string) {
    this.sendControlResponse({
      type: 'control_response',
      response: {
        subtype: 'error',
        request_id,
        error,
      },
    });
  }

  /**
   * Write control response to stdin
   */
  private sendControlResponse(response: ControlResponse) {
    const json = JSON.stringify(response);
    this.stdin.write(`${json}\n`);
  }
}
