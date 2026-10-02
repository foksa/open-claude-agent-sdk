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
import { StringDecoder } from 'node:string_decoder';
import { AbortError } from '../constants.ts';
import { ControlProtocolHandler, ControlRequests } from '../core/control.ts';
import { connectMcpBridges, setSdkMcpServers } from '../core/mcpBridge.ts';
import { captureSdkMcpManifests, manifestCaptureEnabled } from '../core/mcpManifests.ts';
import { redactSecrets } from '../core/redact.ts';
import { InitWriteGate } from '../core/stdinGate.ts';
import type { GetTaskOutputResponse } from '../types/control.ts';
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
  SDKControlMcpReadResourceResponse,
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
import { DefaultProcessFactory, type ProcessFactory, runEndCeilingMs } from './ProcessFactory.ts';
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

/** Largest delay setTimeout accepts. */
const MAX_TIMEOUT_MS = 2_147_483_647;

/** Grace period before SIGTERM when closing/aborting (matches official SDK). */
const KILL_GRACE_MS = 2000;
/** Further delay before SIGKILL if SIGTERM was ignored. */
const SIGKILL_DELAY_MS = 5000;
/** How long to wait for stdout to drain after the process exits. */
const STDOUT_DRAIN_MS = 2000;
/** Characters of stderr kept for exit error messages (matches official SDK). */
const STDERR_TAIL_CHARS = 2048;

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
  /**
   * Whether the current run has ended: a result arrived and the CLI went
   * `idle` (or never reports session state, or the ceiling passed). A run
   * outlives its first result while background agents can still wake a
   * follow-up turn (matches official SDK since v0.3.284).
   */
  private runEnded = false;
  private resultReceived = false;
  private sessionState: string | undefined;
  private runEndWaiters: (() => void)[] = [];
  private runEndCeilingTimer: ReturnType<typeof setTimeout> | null = null;
  /** Set by create(); see runEndCeilingMs(). */
  private runEndCeilingMs = 0;
  /** Holds stdin writes until `initialize` is written; set by create(). */
  private stdinGate: InitWriteGate | null = null;
  private closedResolve!: () => void;
  /** Resolves once the query closes (shutdown or CLI exit). */
  private closedPromise = new Promise<void>((resolve) => {
    this.closedResolve = resolve;
  });
  private resourcesReleased = false;
  /**
   * Signal handed to the spawned process. Aborted only after stdin is closed
   * and the CLI has had its graceful-exit window, so a caller's abort does not
   * kill the child before it can flush session state (matches official SDK).
   */
  private forwardedAbort = new AbortController();
  /** Latest list from a `system/commands_changed` push, if any. */
  private latestCommands: SlashCommand[] | undefined;
  private stderrTail = '';
  /** Set once stderr has closed and its decoder is flushed (or there is no stderr). */
  private stderrDone = false;
  private stderrTimer: ReturnType<typeof setTimeout> | null = null;

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

    // 1. Spawn process — the child gets a forwarded signal, never the
    // caller's own (see QueryImpl.forwardedAbort / shutdown)
    const forwardedAbort = new AbortController();
    const childProcess = processFactory.spawn(options, forwardedAbort.signal);
    if (!childProcess.stdin || !childProcess.stdout) {
      throw new Error('Process stdin/stdout not available');
    }
    // EPIPE after the CLI exits must not crash the host; exit handling reports it
    childProcess.stdin.on('error', () => {});

    // 2. Initialize components
    const messageQueue = new MessageQueue<SDKMessage>();
    // Every stdin write goes after `initialize` (held while manifests are captured)
    const gate = new InitWriteGate(childProcess.stdin);
    const controlHandler = new ControlProtocolHandler(gate, options);
    const controlManager = new ControlRequestManager(gate);

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
    instance.forwardedAbort = forwardedAbort;
    instance.runEndCeilingMs = runEndCeilingMs(options);
    instance.stdinGate = gate;

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

    // 7. Send control protocol initialization — after capturing in-process
    // MCP server handshakes (≤250ms) when there are any (official SDK)
    if (sdkMcpServerNames.length > 0 && manifestCaptureEnabled()) {
      instance.initializeWithManifests();
    } else {
      sendProtocolInit(controlManager, options, sdkMcpServerNames, controlHandler, { gate });
    }

    // 8. Handle input
    if (typeof prompt === 'string') {
      sendInitialPrompt(controlManager, prompt, options.verbatimPrompts);
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
    // Keep the end of stderr for exit errors; spawnClaude already drains the pipe
    const stderr = this.process.stderr;
    if (stderr) {
      const decoder = new StringDecoder('utf8');
      const append = (text: string) => {
        if (this.stderrDone) return;
        this.stderrTail += text;
        if (this.stderrTail.length > 2 * STDERR_TAIL_CHARS) {
          this.stderrTail = this.stderrTail.slice(-STDERR_TAIL_CHARS);
        }
      };
      stderr.on('data', (chunk: Buffer) => append(decoder.write(chunk)));
      // 'exit' can fire before stderr's last chunk; finish() waits for this
      stderr.once('close', () => {
        append(decoder.end());
        this.stderrDone = true;
        if (this.stderrTimer) this.finish();
      });
    } else {
      this.stderrDone = true;
    }

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
      // `errors` is guarded: unlike the official SDK we run whatever `claude`
      // is on PATH, and an older CLI may omit it on an error result
      const text = msg.is_error
        ? msg.subtype === 'success'
          ? msg.result
          : Array.isArray(msg.errors)
            ? msg.errors
                .map((e) => e.trim())
                .filter(Boolean)
                .join('; ')
            : undefined
        : undefined;
      this.lastErrorResultText = text || undefined;
      this.resultReceived = true;
      if (
        this.sessionState === undefined ||
        this.sessionState === 'idle' ||
        !this.hasBidirectionalNeeds()
      ) {
        this.endRun();
      } else {
        this.armRunEndCeiling();
      }
    } else if (msg.type === 'system' && msg.subtype === 'session_state_changed') {
      this.sessionState = msg.state;
      if (msg.state === 'idle') {
        if (this.resultReceived) this.endRun();
      } else if (!(this.isSingleUserTurn && this.runEnded)) {
        // Work resumed (e.g. a finished background agent woke a follow-up turn)
        this.runEnded = false;
        if (msg.state === 'requires_action') this.clearRunEndCeiling();
        else if (this.resultReceived) this.armRunEndCeiling();
      }
      // Meant for the SDK only, not the caller (official SDK drops these)
      if ('sdk_host_only' in msg && msg.sdk_host_only === true) return;
    } else if (
      msg.type === 'system' &&
      msg.subtype === 'commands_changed' &&
      Array.isArray(msg.commands)
    ) {
      this.latestCommands = msg.commands;
      this.lastErrorResultText = undefined;
    } else {
      this.lastErrorResultText = undefined;
      if (
        (msg.type === 'assistant' || msg.type === 'stream_event') &&
        msg.parent_tool_use_id === null &&
        !(this.isSingleUserTurn && this.runEnded)
      ) {
        this.runEnded = false;
        this.clearRunEndCeiling();
      }
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
    this.closedResolve();
    if (this.drainTimer) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    this.releaseRunEndWaiters();
    if (this.messageQueue.isDone()) return;
    // The exit error quotes the stderr tail: 'exit' can precede stderr's last
    // chunk, so wait for it to close, bounded by the stdout drain window
    if (!this.stderrDone && !this.aborted) {
      if (!this.stderrTimer) {
        this.stderrTimer = setTimeout(() => {
          this.stderrDone = true;
          this.releaseStderr();
          this.finish();
        }, STDOUT_DRAIN_MS);
        this.stderrTimer.unref?.();
      }
      return;
    }
    if (this.stderrTimer) {
      clearTimeout(this.stderrTimer);
      this.stderrTimer = null;
    }

    let error: Error | undefined;
    if (this.aborted) {
      error = new AbortError('Claude Code process aborted by user');
    } else if (this.spawnError) {
      error = this.spawnError;
    } else if (this.readerError) {
      error = this.readerError;
    } else if (this.exitInfo && this.exitInfo.code !== 0 && this.exitInfo.code !== null) {
      error = new Error(
        `Claude Code process exited with code ${this.exitInfo.code}${this.formatStderrTail()}`
      );
    } else if (this.exitInfo?.signal) {
      error = new Error(
        `Claude Code process terminated by signal ${this.exitInfo.signal}${this.formatStderrTail()}`
      );
    }
    if (error && !(error instanceof AbortError) && this.lastErrorResultText !== undefined) {
      error = new Error(`Claude Code returned an error result: ${this.lastErrorResultText}`);
    }

    this.messageQueue.complete(error);
    this.controlManager.rejectAll(error ?? new Error('CLI exited before responding'));
    // Iteration is over: mark the query closed and release everything it holds
    // (abort listener, control handler, stdout reader, in-process MCP servers)
    this.shutdown();
    this.releaseResources();
  }

  /**
   * Stop waiting on a stderr pipe that outlived the CLI (a forked child still
   * holds it): later output is ignored and the pipe must not keep the host
   * alive — unref it, or destroy it when it cannot be unref'd (official SDK).
   */
  private releaseStderr(): void {
    const stderr = this.process?.stderr as
      | (NonNullable<ChildProcess['stderr']> & { unref?: () => void })
      | null
      | undefined;
    if (!stderr) return;
    if (typeof stderr.unref === 'function') stderr.unref();
    else stderr.destroy();
  }

  private formatStderrTail(): string {
    const tail = redactSecrets(this.stderrTail.slice(-STDERR_TAIL_CHARS)).trim();
    return tail ? `. stderr: ${tail}` : '';
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
    this.releaseResources();
  }

  /** End stdin, stop answering control requests, and kill the CLI if it lingers. */
  private shutdown(): void {
    this.closed = true;
    this.closedResolve();
    if (this.abortController && this.abortHandler) {
      this.abortController.signal.removeEventListener('abort', this.abortHandler);
      this.abortHandler = null;
    }
    this.controlHandler?.close();
    this.endInput();
    this.releaseRunEndWaiters();
    const proc = this.process;
    if (!proc || proc.exitCode !== null || proc.signalCode != null) {
      this.forwardAbortToProcess();
      return;
    }
    const term = setTimeout(() => {
      if (proc.exitCode !== null || proc.signalCode != null) {
        this.forwardAbortToProcess();
        return;
      }
      if (process.platform === 'win32') {
        // No SIGTERM on Windows — it terminates hard, losing session state;
        // give the CLI the full window, then SIGKILL (matches official SDK)
        const winKill = setTimeout(() => {
          if (proc.exitCode === null) {
            try {
              proc.kill('SIGKILL');
            } catch {}
          }
          this.forwardAbortToProcess();
        }, SIGKILL_DELAY_MS);
        winKill.unref?.();
        return;
      }
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
      this.forwardAbortToProcess();
    }, KILL_GRACE_MS);
    term.unref?.();
  }

  /**
   * Hand the caller's abort on to the spawned process — only once the CLI has
   * had its exit window, and only if the caller actually aborted.
   */
  private forwardAbortToProcess(): void {
    if (this.abortController?.signal.aborted && !this.forwardedAbort.signal.aborted) {
      this.forwardedAbort.abort(this.abortController.signal.reason);
    }
  }

  /**
   * Release everything the query holds open: the abort listener, the control
   * handler, the stdout reader and every in-process MCP server transport.
   * Idempotent — every terminal path (finish, abort, close) runs it.
   */
  private releaseResources(): void {
    if (this.resourcesReleased) return;
    this.resourcesReleased = true;
    if (this.abortController && this.abortHandler) {
      this.abortController.signal.removeEventListener('abort', this.abortHandler);
      this.abortHandler = null;
    }
    this.controlHandler?.close();
    this.router?.close();
    this.closeMcpBridges();
  }

  private endInput(): void {
    try {
      if (this.stdinGate) this.stdinGate.end();
      else this.process?.stdin?.end();
    } catch {}
  }

  /** Capture in-process MCP server manifests, then write `initialize` with them. */
  private async initializeWithManifests(): Promise<void> {
    const gate = this.stdinGate as InitWriteGate;
    const handler = this.controlHandler as ControlProtocolHandler;
    let manifests: Awaited<ReturnType<typeof captureSdkMcpManifests>>;
    try {
      manifests = await captureSdkMcpManifests(handler, this.closedPromise);
    } catch {
      manifests = undefined;
    }
    if (this.closed) {
      gate.discard();
      return;
    }
    sendProtocolInit(this.controlManager, this.options, this.sdkMcpServerNames, handler, {
      gate,
      manifests,
    });
  }

  /** The run is over: wake streamInput, and close stdin for a single-turn query. */
  private endRun(): void {
    if (this.runEnded) return;
    this.runEnded = true;
    this.clearRunEndCeiling();
    this.releaseRunEndWaiters();
    if (this.isSingleUserTurn) this.endInput();
  }

  /** End the run if the CLI doesn't go `idle` within the ceiling after a result. */
  private armRunEndCeiling(): void {
    this.clearRunEndCeiling();
    if (this.runEnded || this.closed || this.runEndCeilingMs <= 0) return;
    this.runEndCeilingTimer = setTimeout(
      () => this.endRun(),
      Math.min(this.runEndCeilingMs, MAX_TIMEOUT_MS)
    );
    this.runEndCeilingTimer.unref?.();
  }

  private clearRunEndCeiling(): void {
    if (this.runEndCeilingTimer) {
      clearTimeout(this.runEndCeilingTimer);
      this.runEndCeilingTimer = null;
    }
  }

  /** Resolve anyone waiting for the run to end (also on close/exit). */
  private releaseRunEndWaiters(): void {
    this.clearRunEndCeiling();
    for (const resolve of this.runEndWaiters.splice(0)) resolve();
  }

  private waitForRunEnd(): Promise<void> {
    if (this.runEnded || this.closed) return Promise.resolve();
    return new Promise((resolve) => this.runEndWaiters.push(resolve));
  }

  /** Callbacks the CLI may call back into — stdin must stay open until the run ends. */
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

  async setMaxThinkingTokens(
    maxThinkingTokens: number | null,
    thinkingDisplay?: 'summarized' | 'omitted' | 'highlights' | null
  ): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.setMaxThinkingTokens(maxThinkingTokens, thinkingDisplay)
    );
  }

  async applyFlagSettings(settings: Settings): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.applyFlagSettings(settings as unknown as Record<string, unknown>)
    );
  }

  async updateSettings(
    source: 'localSettings' | 'userSettings',
    settings: Record<string, unknown>
  ): Promise<void> {
    await this.controlManager.sendControlRequestWithResponse(
      ControlRequests.updateSettings(source, settings)
    );
  }

  /**
   * Write user messages from `stream`, then close stdin — after the run ends
   * when callbacks may still be needed (matches official SDK).
   */
  async streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void> {
    try {
      let count = 0;
      for await (const msg of stream) {
        count++;
        if (this.aborted || this.closed) break;
        this.runEnded = false;
        this.resultReceived = false;
        this.clearRunEndCeiling();
        this.controlManager.writeToStdin(
          this.options.verbatimPrompts ? { ...msg, client_composed: true } : msg
        );
      }
      if (count > 0 && this.hasBidirectionalNeeds()) await this.waitForRunEnd();
      this.endInput();
    } catch (error) {
      // An abort is already handled by abort(); anything else is the caller's
      // stream failing and must surface (matches official SDK)
      if (!(error instanceof AbortError)) throw error;
    }
  }

  close(): void {
    if (this.resourcesReleased) return;
    this.shutdown();
    this.releaseResources();
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
    if (this.resourcesReleased) return;
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
    this.releaseResources();
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
    return this.latestCommands ?? init.commands;
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

  async usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET(opts?: {
    skipBehaviors?: boolean;
  }): Promise<SDKControlGetUsageResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlGetUsageResponse>(
      ControlRequests.getUsage(opts)
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

  /**
   * Read the end (at most the last 8 KiB) of a background shell or Monitor
   * task's output. Not (yet) part of the official SDK's public `Query` type,
   * but present on its runtime Query class (v0.3.287); kept here to mirror
   * actual behavior.
   */
  async getTaskOutput(taskId: string): Promise<GetTaskOutputResponse> {
    return this.controlManager.sendControlRequestWithResponse<GetTaskOutputResponse>(
      ControlRequests.getTaskOutput(taskId)
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

  /** Requires `enableFileCheckpointing` for the CLI to have snapshots to restore. */
  async rewindFiles(
    userMessageId: string,
    options?: { dryRun?: boolean }
  ): Promise<RewindFilesResult> {
    return this.controlManager.sendControlRequestWithResponse<RewindFilesResult>(
      ControlRequests.rewindFiles(userMessageId, options?.dryRun)
    );
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

  /** Read an MCP Apps `ui://` resource from a server the CLI connected (alpha). */
  async readMcpResource(
    serverName: string,
    uri: string
  ): Promise<SDKControlMcpReadResourceResponse> {
    return this.controlManager.sendControlRequestWithResponse<SDKControlMcpReadResourceResponse>(
      ControlRequests.mcpReadResource(serverName, uri)
    );
  }

  async setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult> {
    // In-process servers are connected here and sent as { type: 'sdk', name } only
    const wire = this.controlHandler
      ? await setSdkMcpServers(servers, this.controlHandler)
      : servers;
    // Keep the SDK server list current: reinitialize() rebuilds the init
    // request from it, and hasBidirectionalNeeds() decides from it whether
    // stdin must stay open for the CLI to reach these servers
    if (this.controlHandler) {
      this.sdkMcpServerNames = this.controlHandler.mcpServerBridgeNames();
    }
    return this.controlManager.sendControlRequestWithResponse(ControlRequests.mcpSetServers(wire));
  }

  async setMcpPermissionModeOverride(
    serverName: string,
    mode: 'default' | 'auto' | null
  ): Promise<{ warning?: string }> {
    const response = await this.controlManager.sendControlRequestWithResponse<{
      warning?: string;
    }>(ControlRequests.setMcpPermissionModeOverride(serverName, mode));
    return response ?? {};
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async consumeInputGenerator(generator: AsyncIterable<SDKUserMessage>): Promise<void> {
    try {
      await this.streamInput(generator);
    } catch (error: unknown) {
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      // The official SDK aborts the query when the prompt stream throws; do the
      // same teardown (close stdin, kill the CLI if it lingers, reject pending
      // control requests) but surface the generator's error, not an AbortError
      this.shutdown();
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(wrappedError);
      }
      this.controlManager.rejectAll(wrappedError);
      this.releaseResources();
    }
  }
}
