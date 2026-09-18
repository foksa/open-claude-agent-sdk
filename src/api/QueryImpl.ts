/**
 * Query implementation with bidirectional control protocol support
 *
 * Combines AsyncIterableIterator pattern with control methods for:
 * - Multi-turn conversations (streamInput)
 * - Runtime control (interrupt, setPermissionMode, setModel)
 * - Background control protocol handling
 *
 * @internal
 */

import type { ChildProcess } from 'node:child_process';
import { AbortError } from '../constants.ts';
import { ControlProtocolHandler, ControlRequests } from '../core/control.ts';
import { connectMcpBridges, setSdkMcpServers } from '../core/mcpBridge.ts';
import type {
  AccountInfo,
  AgentInfo,
  McpServerConfig,
  McpServerStatus,
  McpSetServersResult,
  ModelInfo,
  Options,
  PermissionMode,
  Query,
  RewindFilesResult,
  SDKControlGetContextUsageResponse,
  SDKControlGetUsageResponse,
  SDKControlInitializeResponse,
  SDKControlInterruptResponse,
  SDKControlListPermissionRulesResponse,
  SDKControlReadFileResponse,
  SDKControlReloadOutputStylesResponse,
  SDKControlReloadPluginsResponse,
  SDKControlReloadSkillsResponse,
  SDKMessage,
  SDKUserMessage,
  Settings,
  SlashCommand,
} from '../types/index.ts';
import { ControlRequestManager } from './ControlRequestManager.ts';
import { MessageQueue } from './MessageQueue.ts';
import { MessageRouter } from './MessageRouter.ts';
import { DefaultProcessFactory, type ProcessFactory } from './ProcessFactory.ts';
import { buildInitRequest, sendInitialPrompt, sendProtocolInit } from './protocolInit.ts';

/** Option checks the official SDK makes before spawning the CLI. */
function validateOptions(options: Options): void {
  if (
    options.supportedDialogKinds &&
    options.supportedDialogKinds.length > 0 &&
    !options.onUserDialog
  ) {
    throw new Error(
      'supportedDialogKinds requires an onUserDialog callback -- declaring dialog kinds without a handler would park dialogs nothing can answer. Provide onUserDialog, or omit supportedDialogKinds.'
    );
  }
  if (
    options.pluginDelivery !== undefined &&
    options.pluginDelivery !== 'argv' &&
    options.pluginDelivery !== 'initialize'
  ) {
    throw new Error("Invalid pluginDelivery. Expected 'argv' or 'initialize'.");
  }
  if (options.canUseTool) {
    const warning = canUseToolShadowWarning(
      options.permissionMode ?? 'default',
      options.allowedTools ?? []
    );
    if (warning) process.emitWarning(warning, { code: 'CLAUDE_SDK_CAN_USE_TOOL_SHADOWED' });
  }
}

/** Why canUseTool would never be consulted, if it would not (official SDK warning text). */
function canUseToolShadowWarning(mode: string, allowedTools: string[]): string | undefined {
  if (mode === 'bypassPermissions') {
    return "canUseTool will not be invoked: permissionMode 'bypassPermissions' auto-approves every tool call (except explicit deny rules) before the callback is consulted. To gate every tool call, use a PreToolUse hook instead.";
  }
  const bare = allowedTools.filter((t) => t.length > 0 && !t.includes('('));
  if (bare.length === 0) return undefined;
  return `canUseTool will not be invoked for: ${bare.join(', ')}. Bare allowedTools entries auto-approve the whole tool before the callback is consulted. To gate every tool call, use a PreToolUse hook; or remove the bare names from allowedTools so they fall through to canUseTool. Allow rules from settings files can also shadow the callback but are not visible here.`;
}

/** Grace period before SIGTERM when closing/aborting (matches official SDK). */
const KILL_GRACE_MS = 2000;
/** Further delay before SIGKILL if SIGTERM was ignored. */
const SIGKILL_DELAY_MS = 5000;
/** How long to wait for stdout to drain after the process exits. */
const STDOUT_DRAIN_MS = 2000;

export class QueryImpl implements Query {
  private closed = false;
  private aborted = false;
  private abortHandler: (() => void) | null = null;
  private exitInfo: { code: number | null; signal: NodeJS.Signals | null } | null = null;
  private spawnError: Error | null = null;
  private readerDone = false;
  private readerError: Error | undefined;
  private drainTimer: ReturnType<typeof setTimeout> | null = null;
  /** Text of the last error `result`, reported instead of a bare exit code. */
  private lastErrorResultText: string | undefined;
  private firstResultReceived = false;
  private firstResultWaiters: (() => void)[] = [];

  private constructor(
    private process: ChildProcess,
    private messageQueue: MessageQueue<SDKMessage>,
    private controlManager: ControlRequestManager,
    private router: MessageRouter,
    private isSingleUserTurn: boolean,
    private abortController?: AbortController,
    private options: Options = {},
    private sdkMcpServerNames: string[] = [],
    private controlHandler?: ControlProtocolHandler
  ) {}

  /**
   * Factory method — spawns process, wires components, starts communication.
   */
  static create(
    params: {
      prompt: string | AsyncIterable<SDKUserMessage>;
      options?: Options;
    },
    processFactory: ProcessFactory = new DefaultProcessFactory()
  ): QueryImpl {
    const { prompt, options = {} } = params;

    // Check for pre-aborted signal BEFORE spawning process
    if (options.abortController?.signal.aborted) {
      return QueryImpl.createAborted();
    }

    validateOptions(options);

    // 1. Spawn process
    const childProcess = processFactory.spawn(options);
    if (!childProcess.stdin || !childProcess.stdout) {
      throw new Error('Process stdin/stdout not available');
    }
    // EPIPE after the CLI exits must not crash the host; exit handling reports it
    childProcess.stdin.on('error', () => {});

    // 2. Initialize components
    const messageQueue = new MessageQueue<SDKMessage>();
    const controlHandler = new ControlProtocolHandler(childProcess.stdin, options);
    const controlManager = new ControlRequestManager(childProcess.stdin);

    // 3. Connect SDK MCP servers
    const sdkMcpServerNames = connectMcpBridges(options, controlHandler);

    const isSingleUserTurn = typeof prompt === 'string';

    // 4. Construct instance
    const instance = new QueryImpl(
      childProcess,
      messageQueue,
      controlManager,
      // router placeholder — set below after constructing with callbacks
      null as unknown as MessageRouter,
      isSingleUserTurn,
      options.abortController,
      options,
      sdkMcpServerNames,
      controlHandler
    );

    // 5. Initialize message router with callbacks
    instance.router = new MessageRouter(
      childProcess.stdout,
      controlHandler,
      (msg) => instance.handleMessage(msg),
      (error) => instance.handleDone(error),
      (response) => controlManager.handleControlResponse(response)
    );

    // 6. Start background reading
    instance.router.startReading();

    // 7. Send control protocol initialization
    sendProtocolInit(controlManager, options, sdkMcpServerNames, controlHandler);

    // 8. Handle input
    if (typeof prompt === 'string') {
      sendInitialPrompt(controlManager, prompt);
    } else {
      instance.consumeInputGenerator(prompt);
    }

    // 9. Setup process exit/error handlers + abort listener
    instance.setupProcessHandlers();

    return instance;
  }

  /**
   * Create an already-aborted QueryImpl (no process spawned).
   */
  private static createAborted(): QueryImpl {
    const messageQueue = new MessageQueue<SDKMessage>();
    messageQueue.complete(new AbortError('Operation aborted'));

    const controlManager = new ControlRequestManager(null);
    controlManager.rejectAll(new AbortError('Operation aborted'));

    const instance = new QueryImpl(
      null as unknown as ChildProcess,
      messageQueue,
      controlManager,
      null as unknown as MessageRouter,
      false
    );
    instance.closed = true;
    return instance;
  }

  // ============================================================================
  // Process lifecycle
  // ============================================================================

  private setupProcessHandlers(): void {
    this.process.on('exit', (code, signal) => {
      this.exitInfo = { code, signal };
      if (this.readerDone) {
        this.finish();
      } else {
        // stdout may still hold the final messages (often the error result);
        // let the reader drain it before completing
        this.drainTimer = setTimeout(() => this.finish(), STDOUT_DRAIN_MS);
        this.drainTimer.unref?.();
      }
    });

    this.process.on('error', (err) => {
      this.spawnError = err;
      this.finish();
    });

    if (this.abortController) {
      this.abortHandler = () => this.abort();
      this.abortController.signal.addEventListener('abort', this.abortHandler);
    }
  }

  private handleMessage(msg: SDKMessage): void {
    if (msg.type === 'result') {
      const text = msg.is_error
        ? msg.subtype === 'success'
          ? msg.result
          : msg.errors
              .map((e) => e.trim())
              .filter(Boolean)
              .join('; ')
        : undefined;
      this.lastErrorResultText = text || undefined;
      this.markFirstResult();
      // For single-turn queries, close stdin on result to signal CLI to exit
      if (this.isSingleUserTurn) this.endInput();
    } else if (!(msg.type === 'system' && msg.subtype === 'session_state_changed')) {
      this.lastErrorResultText = undefined;
    }
    this.messageQueue.push(msg);
  }

  private handleDone(error?: Error): void {
    this.readerDone = true;
    this.readerError = error;
    if (this.exitInfo || error || this.process.exitCode !== null) {
      this.finish();
    } else {
      // stdout closed first; the exit event normally follows immediately
      this.drainTimer = setTimeout(() => this.finish(), STDOUT_DRAIN_MS);
      this.drainTimer.unref?.();
    }
  }

  /** Complete iteration once stdout has drained and the process has exited. */
  private finish(): void {
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    this.markFirstResult();
    if (this.messageQueue.isDone()) return;

    let error: Error | undefined;
    if (this.aborted) {
      error = new AbortError('Claude Code process aborted by user');
    } else if (this.spawnError) {
      error = this.spawnError;
    } else if (this.readerError) {
      error = this.readerError;
    } else if (this.exitInfo && this.exitInfo.code !== 0 && this.exitInfo.code !== null) {
      error = new Error(`Claude Code process exited with code ${this.exitInfo.code}`);
    } else if (this.exitInfo?.signal) {
      error = new Error(`Claude Code process terminated by signal ${this.exitInfo.signal}`);
    }
    if (error && !(error instanceof AbortError) && this.lastErrorResultText !== undefined) {
      error = new Error(`Claude Code returned an error result: ${this.lastErrorResultText}`);
    }

    this.messageQueue.complete(error);
    this.controlManager.rejectAll(error ?? new Error('CLI exited before responding'));
    this.controlHandler?.close();
  }

  /**
   * AbortController fired: stop iteration with AbortError, close stdin, and
   * kill the CLI if it does not exit on its own (matches official SDK).
   */
  private abort(): void {
    if (this.closed) return;
    this.aborted = true;
    this.shutdown();
    const error = new AbortError('Claude Code process aborted by user');
    this.messageQueue.complete(error);
    this.controlManager.rejectAll(error);
  }

  /** End stdin, stop answering control requests, and kill the CLI if it lingers. */
  private shutdown(): void {
    this.closed = true;
    if (this.abortController && this.abortHandler) {
      this.abortController.signal.removeEventListener('abort', this.abortHandler);
      this.abortHandler = null;
    }
    this.controlHandler?.close();
    this.endInput();
    this.markFirstResult();
    const proc = this.process;
    if (!proc || proc.exitCode !== null || proc.signalCode != null) return;
    const term = setTimeout(() => {
      if (proc.exitCode !== null || proc.signalCode != null) return;
      try {
        proc.kill('SIGTERM');
      } catch {}
      const kill = setTimeout(() => {
        if (proc.exitCode === null) {
          try {
            proc.kill('SIGKILL');
          } catch {}
        }
      }, SIGKILL_DELAY_MS);
      kill.unref?.();
    }, KILL_GRACE_MS);
    term.unref?.();
  }

  private endInput(): void {
    try {
      this.process?.stdin?.end();
    } catch {}
  }

  private markFirstResult(): void {
    this.firstResultReceived = true;
    for (const resolve of this.firstResultWaiters.splice(0)) resolve();
  }

  private waitForFirstResult(): Promise<void> {
    if (this.firstResultReceived || this.closed) return Promise.resolve();
    return new Promise((resolve) => this.firstResultWaiters.push(resolve));
  }

  /** Callbacks the CLI may call back into — stdin must stay open until the first result. */
  private hasBidirectionalNeeds(): boolean {
    const o = this.options;
    return (
      this.sdkMcpServerNames.length > 0 ||
      (o.hooks !== undefined && Object.keys(o.hooks).length > 0) ||
      o.canUseTool !== undefined ||
      o.onElicitation !== undefined ||
      o.onUserDialog !== undefined
    );
  }

  // ============================================================================
  // AsyncGenerator implementation
  // ============================================================================

  async next(): Promise<IteratorResult<SDKMessage>> {
    return this.messageQueue.next();
  }

  async return(_value?: unknown): Promise<IteratorResult<SDKMessage>> {
    await this.gracefulClose();
    return { value: undefined as unknown as SDKMessage, done: true };
  }

  async throw(e?: unknown): Promise<IteratorResult<SDKMessage>> {
    this.close();
    throw e;
  }

  [Symbol.asyncIterator](): AsyncGenerator<SDKMessage, void> {
    return this as unknown as AsyncGenerator<SDKMessage, void>;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.gracefulClose();
  }

  // ============================================================================
  // Control methods (Query interface)
  // ============================================================================

  async interrupt(): Promise<SDKControlInterruptResponse | undefined> {
    const response = await this.controlManager.sendControlRequestWithResponse<{
      still_queued?: string[];
    }>(ControlRequests.interrupt());
    const stillQueued = response?.still_queued;
    return Array.isArray(stillQueued)
      ? { still_queued: stillQueued.filter((id): id is string => typeof id === 'string') }
      : undefined;
  }

  async backgroundTasks(toolUseId?: string): Promise<boolean> {
    const response = await this.controlManager.sendControlRequestWithResponse<{
      backgrounded?: boolean;
    }>(ControlRequests.backgroundTasks(toolUseId));
    return response.backgrounded ?? true;
  }

  async stopTask(taskId: string): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(ControlRequests.stopTask(taskId));
  }

  async setPermissionMode(mode: PermissionMode): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.setPermissionMode(mode)
    );
  }

  async setModel(model?: string): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(ControlRequests.setModel(model));
  }

  async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.setMaxThinkingTokens(maxThinkingTokens)
    );
  }

  async applyFlagSettings(settings: Settings): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.applyFlagSettings(settings as unknown as Record<string, unknown>)
    );
  }

  async updateSettings(source: 'localSettings', settings: Record<string, unknown>): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.updateSettings(source, settings)
    );
  }

  /**
   * Write user messages from `stream`, then close stdin — after the first
   * result when callbacks may still be needed (matches official SDK).
   */
  async streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void> {
    let count = 0;
    for await (const msg of stream) {
      count++;
      if (this.aborted || this.closed) break;
      this.controlManager.writeToStdin(msg);
    }
    if (count > 0 && this.hasBidirectionalNeeds()) await this.waitForFirstResult();
    this.endInput();
  }

  close(): void {
    if (this.closed) return;
    this.shutdown();
    this.router?.close();
    this.closeMcpBridges();
    if (!this.messageQueue.isDone()) {
      this.messageQueue.complete();
    }
    this.controlManager.rejectAll(new Error('Query closed'));
  }

  /**
   * Close the query gracefully, waiting for the CLI process to exit.
   * Used by return() and asyncDispose() to allow the CLI to flush session files.
   */
  private async gracefulClose(): Promise<void> {
    if (this.closed) return;
    this.shutdown();
    const proc = this.process;
    if (proc && proc.exitCode === null && proc.signalCode == null) {
      // shutdown() sends SIGTERM after the grace period; wait for the exit
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, KILL_GRACE_MS + 500);
        timer.unref?.();
        proc.once('exit', () => {
          clearTimeout(timer);
          resolve();
        });
      });
    }
    this.router?.close();
    this.closeMcpBridges();
    if (!this.messageQueue.isDone()) {
      this.messageQueue.complete();
    }
    this.controlManager.rejectAll(new Error('Query closed'));
  }

  private closeMcpBridges(): void {
    const handler = this.controlHandler;
    if (!handler) return;
    for (const name of handler.mcpServerBridgeNames()) {
      handler
        .getMcpServerBridge(name)
        ?.close()
        .catch(() => {});
    }
  }

  async initializationResult(): Promise<SDKControlInitializeResponse> {
    return this.controlManager.waitForInit();
  }

  async reinitialize(): Promise<SDKControlInitializeResponse> {
    if (this.closed || !this.controlHandler) {
      return Promise.reject(new Error('Cannot send control request: query is closed'));
    }
    const request = buildInitRequest(this.options, this.sdkMcpServerNames, this.controlHandler);
    return this.controlManager.sendControlRequestWithResponse<SDKControlInitializeResponse>(
      request
    );
  }

  async supportedCommands(): Promise<SlashCommand[]> {
    const init = await this.controlManager.waitForInit();
    return init.commands;
  }

  async supportedAgents(): Promise<AgentInfo[]> {
    const init = await this.controlManager.waitForInit();
    return init.agents;
  }

  async supportedModels(): Promise<ModelInfo[]> {
    const init = await this.controlManager.waitForInit();
    return init.models;
  }

  async availableOutputStyles(): Promise<string[]> {
    const init = await this.controlManager.waitForInit();
    return init.available_output_styles;
  }

  async currentOutputStyle(): Promise<string> {
    const init = await this.controlManager.waitForInit();
    return init.output_style;
  }

  async mcpServerStatus(): Promise<McpServerStatus[]> {
    const response = await this.controlManager.sendControlRequestWithResponse<{
      mcpServers: McpServerStatus[];
    }>(ControlRequests.mcpStatus());
    return response.mcpServers;
  }

  async accountInfo(): Promise<AccountInfo> {
    const init = await this.controlManager.waitForInit();
    return init.account;
  }

  async getContextUsage(opts?: {
    detail?: 'summary' | 'full';
  }): Promise<SDKControlGetContextUsageResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlGetContextUsageResponse>(
      ControlRequests.getContextUsage(opts)
    );
  }

  async usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET(): Promise<SDKControlGetUsageResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlGetUsageResponse>(
      ControlRequests.getUsage()
    );
  }

  /**
   * Get the session's live permission rules and workspace directories — the
   * same data /permissions lists in the terminal. Not (yet) part of the
   * official SDK's public `Query` type, but present on its runtime Query
   * class (v0.3.270); kept here to mirror actual behavior.
   */
  async listPermissionRules(): Promise<SDKControlListPermissionRulesResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlListPermissionRulesResponse>(
      ControlRequests.listPermissionRules()
    );
  }

  async readFile(
    path: string,
    options?: { maxBytes?: number }
  ): Promise<SDKControlReadFileResponse | null> {
    try {
      return await this.controlManager.sendControlRequestWithResponse<SDKControlReadFileResponse>(
        ControlRequests.readFile(path, options?.maxBytes)
      );
    } catch {
      return null;
    }
  }

  async reloadPlugins(options?: {
    holdOnCacheImpact?: boolean;
  }): Promise<SDKControlReloadPluginsResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlReloadPluginsResponse>(
      ControlRequests.reloadPlugins(options)
    );
  }

  async reloadSkills(): Promise<SDKControlReloadSkillsResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlReloadSkillsResponse>(
      ControlRequests.reloadSkills()
    );
  }

  async reloadOutputStyles(): Promise<SDKControlReloadOutputStylesResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlReloadOutputStylesResponse>(
      ControlRequests.reloadOutputStyles()
    );
  }

  async seedReadState(path: string, mtime: number): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.seedReadState(path, mtime)
    );
  }

  async rewindFiles(
    _userMessageId: string,
    _options?: { dryRun?: boolean }
  ): Promise<RewindFilesResult> {
    throw new Error('rewindFiles() not yet implemented');
  }

  async reconnectMcpServer(serverName: string): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.mcpReconnect(serverName)
    );
  }

  async toggleMcpServer(serverName: string, enabled: boolean): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.mcpToggle(serverName, enabled)
    );
  }

  async setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult> {
    // In-process servers are connected here and sent as { type: 'sdk', name } only
    const wire = this.controlHandler
      ? await setSdkMcpServers(servers, this.controlHandler)
      : servers;
    return this.controlManager.sendControlRequestWithResponse(ControlRequests.mcpSetServers(wire));
  }

  async setMcpPermissionModeOverride(
    serverName: string,
    mode: 'default' | 'auto' | null
  ): Promise<{ warning?: string }> {
    return this.controlManager.sendControlRequestWithResponse(
      ControlRequests.setMcpPermissionModeOverride(serverName, mode)
    );
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async consumeInputGenerator(generator: AsyncIterable<SDKUserMessage>): Promise<void> {
    try {
      await this.streamInput(generator);
    } catch (error: unknown) {
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(wrappedError);
      }
    }
  }
}
