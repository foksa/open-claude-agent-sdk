/**
 * Control Protocol Handler
 *
 * Handles bidirectional control protocol communication with Claude CLI.
 * Routes control requests from CLI and sends responses back via stdin.
 *
 * @internal
 */

import { Writable } from 'node:stream';
import type { Options, PermissionResult } from '../types/index.ts';
import type { ControlRequest, ControlResponse } from '../types/control.ts';

export class ControlProtocolHandler {
  constructor(
    private stdin: Writable,
    private options: Options
  ) {}

  /**
   * Handle control request from CLI
   * Routes to appropriate handler based on request subtype
   */
  async handleControlRequest(req: ControlRequest): Promise<void> {
    try {
      switch (req.request.subtype) {
        case 'can_use_tool':
          await this.handleCanUseTool(req);
          break;
        case 'hook_callback':
          await this.handleHookCallback(req);
          break;
        case 'initialize':
          await this.handleInitialize(req);
          break;
        case 'interrupt':
          await this.handleInterrupt(req);
          break;
        case 'set_permission_mode':
        case 'set_model':
        case 'set_max_thinking_tokens':
        case 'mcp_status':
        case 'mcp_message':
        case 'rewind_files':
        case 'mcp_set_servers':
        case 'mcp_reconnect':
        case 'mcp_toggle':
          // These are sent FROM SDK TO CLI, not the other way around
          // If we receive them, just acknowledge
          this.sendSuccess(req.request_id, {});
          break;
        default:
          this.sendError(req.request_id, `Unknown request type: ${(req.request as any).subtype}`);
      }
    } catch (error: any) {
      this.sendError(req.request_id, error.message || 'Unknown error');
    }
  }

  /**
   * Handle permission check request
   */
  private async handleCanUseTool(req: ControlRequest) {
    if (req.request.subtype !== 'can_use_tool') return;

    const { tool_name, input, tool_use_id, permission_suggestions, blocked_path, decision_reason, agent_id } = req.request;

    // If no callback provided, allow by default
    if (!this.options.canUseTool) {
      this.sendSuccess(req.request_id, { behavior: 'allow' });
      return;
    }

    // Call user-provided permission callback
    const result: PermissionResult = await this.options.canUseTool(
      tool_name,
      input,
      {
        signal: new AbortController().signal, // TODO: proper abort signal handling
        suggestions: permission_suggestions,
        blockedPath: blocked_path,
        decisionReason: decision_reason,
        toolUseID: tool_use_id,
        agentID: agent_id,
      }
    );

    this.sendSuccess(req.request_id, result);
  }

  /**
   * Handle hook callback request
   */
  private async handleHookCallback(req: ControlRequest) {
    if (req.request.subtype !== 'hook_callback') return;

    const { callback_id, input, tool_use_id } = req.request;

    // If no hooks configured, continue by default
    if (!this.options.hooks) {
      this.sendSuccess(req.request_id, { continue: true });
      return;
    }

    // Find matching hook by event name
    const hookEvent = input.hook_event_name;
    const matchingHooks = this.options.hooks[hookEvent];

    if (!matchingHooks || matchingHooks.length === 0) {
      this.sendSuccess(req.request_id, { continue: true });
      return;
    }

    // Execute hooks (simplified - real implementation would match callback_id)
    // For now, just execute first matching hook
    try {
      for (const hookMatcher of matchingHooks) {
        for (const hookFn of hookMatcher.hooks) {
          const result = await hookFn(input, tool_use_id, {
            signal: new AbortController().signal,
          });

          // Return first hook result
          this.sendSuccess(req.request_id, result);
          return;
        }
      }

      // No hooks executed, continue
      this.sendSuccess(req.request_id, { continue: true });
    } catch (error: any) {
      this.sendError(req.request_id, error.message || 'Hook execution failed');
    }
  }

  /**
   * Handle initialization request
   */
  private async handleInitialize(req: ControlRequest) {
    // Send empty success response for initialization
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
   * Send success response to CLI
   */
  private sendSuccess(request_id: string, response: Record<string, unknown>) {
    this.sendControlResponse({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id,
        response
      }
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
        error
      }
    });
  }

  /**
   * Write control response to stdin
   */
  private sendControlResponse(response: ControlResponse) {
    const json = JSON.stringify(response);
    this.stdin.write(json + '\n');
  }
}
