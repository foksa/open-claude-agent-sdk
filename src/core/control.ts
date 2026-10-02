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

import {
  type ApplyFlagSettingsRequest,
  type BackgroundTasksRequest,
  type ControlRequest,
  type ControlResponse,
  type GetContextUsageRequest,
  type GetTaskOutputRequest,
  type GetUsageRequest,
  type InitializeRequest,
  type InternalHookCallback,
  type InterruptRequest,
  type ListPermissionRulesRequest,
  type McpReadResourceRequest,
  type McpReconnectRequest,
  type McpSetServersRequest,
  type McpStatusRequest,
  type McpToggleRequest,
  MessageType,
  type ReadFileRequest,
  type ReloadOutputStylesRequest,
  type ReloadPluginsRequest,
  type ReloadSkillsRequest,
  RequestSubtype,
  ResponseSubtype,
  type RewindFilesRequest,
  type SeedReadStateRequest,
  type SetMaxThinkingTokensRequest,
  type SetMcpPermissionModeOverrideRequest,
  type SetModelRequest,
  type SetPermissionModeRequest,
  type StopTaskRequest,
  type UpdateSettingsRequest,
} from '../types/control.ts';
import type {
  ElicitationResult,
  McpServerConfig,
  Options,
  PermissionMode,
  PermissionResult,
  UserDialogResult,
} from '../types/index.ts';
import type { McpServerBridge } from './mcpBridge.ts';
import type { StdinLike } from './stdinGate.ts';

// ============================================================================
// Outbound request builders (SDK → CLI)
// ============================================================================

/**
 * Union of all outbound control request types (sent from SDK to CLI)
 */
export type OutboundControlRequest =
  | InitializeRequest
  | InterruptRequest
  | SetPermissionModeRequest
  | SetModelRequest
  | SetMaxThinkingTokensRequest
  | McpStatusRequest
  | McpReconnectRequest
  | McpToggleRequest
  | McpReadResourceRequest
  | SetMcpPermissionModeOverrideRequest
  | McpSetServersRequest
  | StopTaskRequest
  | ApplyFlagSettingsRequest
  | UpdateSettingsRequest
  | ReloadPluginsRequest
  | ReloadSkillsRequest
  | ReloadOutputStylesRequest
  | SeedReadStateRequest
  | RewindFilesRequest
  | GetContextUsageRequest
  | GetUsageRequest
  | ReadFileRequest
  | BackgroundTasksRequest
  | ListPermissionRulesRequest
  | GetTaskOutputRequest;

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

  setMaxThinkingTokens: (
    tokens: number | null,
    thinkingDisplay?: 'summarized' | 'omitted' | 'highlights' | null
  ): SetMaxThinkingTokensRequest => ({
    subtype: RequestSubtype.SET_MAX_THINKING_TOKENS,
    max_thinking_tokens: tokens,
    thinking_display: thinkingDisplay,
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

  mcpReadResource: (serverName: string, uri: string): McpReadResourceRequest => ({
    subtype: RequestSubtype.MCP_READ_RESOURCE,
    serverName,
    uri,
  }),

  setMcpPermissionModeOverride: (
    serverName: string,
    mode: 'default' | 'auto' | null
  ): SetMcpPermissionModeOverrideRequest => ({
    subtype: RequestSubtype.SET_MCP_PERMISSION_MODE_OVERRIDE,
    serverName,
    mode,
  }),

  mcpSetServers: (servers: Record<string, McpServerConfig>): McpSetServersRequest => ({
    subtype: RequestSubtype.MCP_SET_SERVERS,
    servers,
  }),

  stopTask: (taskId: string): StopTaskRequest => ({
    subtype: RequestSubtype.STOP_TASK,
    task_id: taskId,
  }),

  applyFlagSettings: (settings: Record<string, unknown>): ApplyFlagSettingsRequest => ({
    subtype: RequestSubtype.APPLY_FLAG_SETTINGS,
    settings,
  }),

  updateSettings: (
    source: 'localSettings' | 'userSettings',
    settings: Record<string, unknown>
  ): UpdateSettingsRequest => ({
    subtype: RequestSubtype.UPDATE_SETTINGS,
    source,
    settings,
  }),

  reloadPlugins: (opts?: { holdOnCacheImpact?: boolean }): ReloadPluginsRequest => ({
    subtype: RequestSubtype.RELOAD_PLUGINS,
    ...(opts?.holdOnCacheImpact && { hold_on_cache_impact: true }),
  }),

  reloadSkills: (): ReloadSkillsRequest => ({
    subtype: RequestSubtype.RELOAD_SKILLS,
  }),

  reloadOutputStyles: (): ReloadOutputStylesRequest => ({
    subtype: RequestSubtype.RELOAD_OUTPUT_STYLES,
  }),

  seedReadState: (path: string, mtime: number): SeedReadStateRequest => ({
    subtype: RequestSubtype.SEED_READ_STATE,
    path,
    mtime,
  }),

  rewindFiles: (userMessageId: string, dryRun?: boolean): RewindFilesRequest => ({
    subtype: RequestSubtype.REWIND_FILES,
    user_message_id: userMessageId,
    dry_run: dryRun,
  }),

  getContextUsage: (opts?: { detail?: 'summary' | 'full' }): GetContextUsageRequest => ({
    subtype: RequestSubtype.GET_CONTEXT_USAGE,
    ...(opts?.detail !== undefined && { detail: opts.detail }),
  }),

  getUsage: (opts?: { skipBehaviors?: boolean }): GetUsageRequest => ({
    subtype: RequestSubtype.GET_USAGE,
    ...(opts?.skipBehaviors && { skip_behaviors: true }),
  }),

  listPermissionRules: (): ListPermissionRulesRequest => ({
    subtype: RequestSubtype.LIST_PERMISSION_RULES,
  }),

  getTaskOutput: (taskId: string): GetTaskOutputRequest => ({
    subtype: RequestSubtype.GET_TASK_OUTPUT,
    task_id: taskId,
  }),

  readFile: (path: string, maxBytes?: number): ReadFileRequest => ({
    subtype: RequestSubtype.READ_FILE,
    path,
    ...(maxBytes !== undefined && { max_bytes: maxBytes }),
  }),

  backgroundTasks: (toolUseId?: string): BackgroundTasksRequest => ({
    subtype: RequestSubtype.BACKGROUND_TASKS,
    ...(toolUseId !== undefined && { tool_use_id: toolUseId }),
  }),
};

// ============================================================================
// Inbound request handler (CLI → SDK)
// ============================================================================

/** Returned by a handler when the consumer answered out-of-band (or nobody should). */
const SUPPRESS_RESPONSE = Symbol('suppressControlResponse');

export class ControlProtocolHandler {
  private callbackMap: Map<string, InternalHookCallback> = new Map();
  private mcpServerBridges: Map<string, McpServerBridge> = new Map();
  /** In-flight inbound requests, cancellable by `control_cancel_request` */
  private inflight = new Map<string, AbortController>();
  private closed = false;
  /** Set once the `initialize` request has been written to stdin. */
  initializeWritten = false;
  /** In-process servers that sent `tools/list_changed` before `initialize`. */
  readonly toolsChangedBeforeInitialize = new Set<string>();

  constructor(
    private stdin: StdinLike,
    private options: Options
  ) {}

  /**
   * Set MCP server bridges for routing mcp_message requests
   */
  setMcpServerBridges(bridges: Map<string, McpServerBridge>): void {
    this.mcpServerBridges = bridges;
  }

  getMcpServerBridge(name: string): McpServerBridge | undefined {
    return this.mcpServerBridges.get(name);
  }

  addMcpServerBridge(name: string, bridge: McpServerBridge): void {
    this.mcpServerBridges.set(name, bridge);
  }

  removeMcpServerBridge(name: string, bridge: McpServerBridge): void {
    if (this.mcpServerBridges.get(name) === bridge) this.mcpServerBridges.delete(name);
  }

  mcpServerBridgeNames(): string[] {
    return [...this.mcpServerBridges.keys()];
  }

  /**
   * Register a callback function with its ID
   */
  registerCallback(id: string, callback: InternalHookCallback): void {
    this.callbackMap.set(id, callback);
  }

  /**
   * Forward a message an in-process MCP server initiated (notification or
   * server→client request) to the CLI.
   */
  sendMcpMessageToCli(serverName: string, message: Record<string, unknown>): void {
    if (this.closed) return;
    // A tool list that changed before `initialize` was written makes a
    // captured tools/list stale (see mcpManifests.ts)
    if (
      !this.initializeWritten &&
      !('id' in message) &&
      message.method === 'notifications/tools/list_changed'
    ) {
      this.toolsChangedBeforeInitialize.add(serverName);
    }
    this.write({
      type: MessageType.CONTROL_REQUEST,
      request_id: Math.random().toString(36).substring(2, 15),
      request: { subtype: RequestSubtype.MCP_MESSAGE, server_name: serverName, message },
    });
  }

  /** Abort an in-flight request the CLI withdrew. */
  cancelRequest(requestId: string): void {
    const controller = this.inflight.get(requestId);
    if (controller) {
      controller.abort();
      this.inflight.delete(requestId);
    }
  }

  /** Stop answering: pending callbacks are aborted and their late results dropped. */
  close(): void {
    this.closed = true;
    for (const controller of this.inflight.values()) controller.abort();
    this.inflight.clear();
  }

  /**
   * Handle control request from CLI
   * Routes to appropriate handler based on request subtype. Callers must not
   * await this in the stdout read loop — callbacks may issue control requests
   * of their own, whose responses arrive on the same stream.
   */
  async handleControlRequest(req: ControlRequest): Promise<void> {
    if (process.env.DEBUG_HOOKS) {
      console.error('[DEBUG] Control request:', JSON.stringify(req, null, 2));
    }
    // Requests still buffered in stdout after close(): answering them would run
    // user callbacks whose responses write() then drops
    if (this.closed) return;
    // Duplicate delivery of a request we are still handling
    if (this.inflight.has(req.request_id)) return;
    const controller = new AbortController();
    this.inflight.set(req.request_id, controller);
    try {
      const response = await this.processControlRequest(req, controller.signal);
      if (response === SUPPRESS_RESPONSE) return;
      this.sendSuccess(req.request_id, response);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.sendError(req.request_id, message);
    } finally {
      this.inflight.delete(req.request_id);
    }
  }

  private async processControlRequest(
    req: ControlRequest,
    signal: AbortSignal
  ): Promise<Record<string, unknown> | typeof SUPPRESS_RESPONSE> {
    switch (req.request.subtype) {
      case RequestSubtype.CAN_USE_TOOL:
        return this.handleCanUseTool(req, signal);
      case RequestSubtype.HOOK_CALLBACK:
        return this.handleHookCallback(req, signal);
      case RequestSubtype.MCP_MESSAGE:
        return this.handleMcpMessage(req);
      case RequestSubtype.ELICITATION:
        return this.handleElicitation(req, signal);
      case RequestSubtype.REQUEST_USER_DIALOG:
        return this.handleUserDialog(req, signal);
      default:
        throw new Error(
          `Unsupported control request subtype: ${(req.request as { subtype: string }).subtype}`
        );
    }
  }

  private async handleCanUseTool(
    req: ControlRequest,
    signal: AbortSignal
  ): Promise<Record<string, unknown> | typeof SUPPRESS_RESPONSE> {
    if (req.request.subtype !== RequestSubtype.CAN_USE_TOOL) return SUPPRESS_RESPONSE;
    if (!this.options.canUseTool) throw new Error('canUseTool callback is not provided.');

    const {
      tool_name,
      input,
      tool_use_id,
      permission_suggestions,
      blocked_path,
      decision_reason,
      title,
      display_name,
      description,
      agent_id,
      default_to_no,
      suppress_always_allow_rule,
      mcp_server,
      matched_ask_rule,
    } = req.request;

    const result: PermissionResult | null = await this.options.canUseTool(tool_name, input, {
      signal,
      suggestions: permission_suggestions,
      blockedPath: blocked_path,
      ...(mcp_server && { mcpServer: { name: mcp_server.name, source: mcp_server.source } }),
      decisionReason: decision_reason,
      title,
      displayName: display_name,
      description,
      defaultToNo: default_to_no,
      suppressAlwaysAllowRule: suppress_always_allow_rule,
      toolUseID: tool_use_id,
      agentID: agent_id,
      requestId: req.request_id,
      ...(matched_ask_rule && {
        matchedAskRule: {
          source: matched_ask_rule.source,
          toolName: matched_ask_rule.tool_name,
          ...(matched_ask_rule.rule_content !== undefined && {
            ruleContent: matched_ask_rule.rule_content,
          }),
        },
      }),
    });

    // A `null` result means the consumer already sent a control_response
    // out-of-band (e.g. a signed HTTP POST echoing `requestId`); skip ours.
    if (result === null) return SUPPRESS_RESPONSE;
    return { ...result, toolUseID: tool_use_id };
  }

  private async handleHookCallback(
    req: ControlRequest,
    signal: AbortSignal
  ): Promise<Record<string, unknown>> {
    if (req.request.subtype !== RequestSubtype.HOOK_CALLBACK) return {};
    const { callback_id, input, tool_use_id } = req.request;
    const hookFn = this.callbackMap.get(callback_id);
    if (!hookFn) throw new Error(`No hook callback found for ID: ${callback_id}`);
    return (await hookFn(input, tool_use_id, { signal })) as Record<string, unknown>;
  }

  private async handleElicitation(
    req: ControlRequest,
    signal: AbortSignal
  ): Promise<Record<string, unknown> | typeof SUPPRESS_RESPONSE> {
    if (req.request.subtype !== RequestSubtype.ELICITATION) return SUPPRESS_RESPONSE;
    const r = req.request;
    // No callback — decline automatically (matches official SDK behavior)
    if (!this.options.onElicitation) return { action: 'decline' };

    const result: ElicitationResult | null = await this.options.onElicitation(
      {
        serverName: r.mcp_server_name,
        message: r.message,
        mode: r.mode,
        url: r.url,
        elicitationId: r.elicitation_id,
        requestedSchema: r.requested_schema,
        title: r.title,
        displayName: r.display_name,
        description: r.description,
      },
      { signal, requestId: req.request_id }
    );
    if (result === null) return SUPPRESS_RESPONSE;
    return result as unknown as Record<string, unknown>;
  }

  private async handleUserDialog(
    req: ControlRequest,
    signal: AbortSignal
  ): Promise<Record<string, unknown> | typeof SUPPRESS_RESPONSE> {
    if (req.request.subtype !== RequestSubtype.REQUEST_USER_DIALOG) return SUPPRESS_RESPONSE;
    // No handler — stay silent so a capable client (or the CLI's own deadline)
    // settles the dialog, as the official SDK does
    if (!this.options.onUserDialog) return SUPPRESS_RESPONSE;

    const { dialog_kind, payload, tool_use_id } = req.request;
    const result: UserDialogResult | null = await this.options.onUserDialog(
      { dialogKind: dialog_kind, payload, toolUseID: tool_use_id },
      { signal, requestId: req.request_id }
    );
    if (result === null) return SUPPRESS_RESPONSE;
    return result as unknown as Record<string, unknown>;
  }

  private async handleMcpMessage(req: ControlRequest): Promise<Record<string, unknown>> {
    if (req.request.subtype !== RequestSubtype.MCP_MESSAGE) return {};
    const { server_name, message } = req.request;
    const bridge = this.mcpServerBridges.get(server_name);
    if (!bridge) throw new Error(`SDK MCP server not found: ${server_name}`);
    return { mcp_response: await bridge.handleMessage(message) };
  }

  private sendSuccess(request_id: string, response: Record<string, unknown>) {
    this.write({
      type: MessageType.CONTROL_RESPONSE,
      response: { subtype: ResponseSubtype.SUCCESS, request_id, response },
    });
  }

  private sendError(request_id: string, error: string) {
    this.write({
      type: MessageType.CONTROL_RESPONSE,
      response: { subtype: ResponseSubtype.ERROR, request_id, error },
    });
  }

  private write(message: ControlResponse | ControlRequest) {
    // After close the CLI is gone or going; late callback results are dropped
    if (this.closed || this.stdin.writableEnded || this.stdin.destroyed) return;
    try {
      this.stdin.write(`${JSON.stringify(message)}\n`);
    } catch {}
  }
}
