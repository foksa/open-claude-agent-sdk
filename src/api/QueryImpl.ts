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
import { ControlProtocolHandler } from '../core/control.ts';
import { ControlRequests, type OutboundControlRequest } from '../core/controlRequests.ts';
import { buildHookConfig } from '../core/hookConfig.ts';
import { McpServerBridge } from '../core/mcpBridge.ts';
import type {
  AccountInfo,
  McpServerConfig,
  McpServerStatus,
  McpSetServersResult,
  ModelInfo,
  Options,
  PermissionMode,
  Query,
  RewindFilesResult,
  SDKControlInitializeResponse,
  SDKMessage,
  SDKUserMessage,
  SlashCommand,
} from '../types/index.ts';
import { MessageQueue } from './MessageQueue.ts';
import { type ControlResponsePayload, MessageRouter } from './MessageRouter.ts';
import { DefaultProcessFactory, type ProcessFactory } from './ProcessFactory.ts';

export class QueryImpl implements Query {
  private closed = false;
  private abortHandler: (() => void) | null = null;

  // Pending control request/response map (for mcpServerStatus, etc.)
  private pendingControlResponses = new Map<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: response shape varies by request type
    { resolve: (value: any) => void; reject: (reason: Error) => void }
  >();

  private constructor(
    private process: ChildProcess,
    private messageQueue: MessageQueue<SDKMessage>,
    private controlHandler: ControlProtocolHandler,
    private router: MessageRouter,
    private initResponsePromise: Promise<SDKControlInitializeResponse>,
    private initResolve: (value: SDKControlInitializeResponse) => void,
    private initReject: (reason: Error) => void,
    private initRequestId: string,
    private sdkMcpServerNames: string[],
    private isSingleUserTurn: boolean,
    private abortController?: AbortController
  ) {}

  /**
   * Factory method — performs all initialization that was previously in the constructor.
   */
  static create(
    params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options },
    processFactory: ProcessFactory = new DefaultProcessFactory()
  ): QueryImpl {
    const { prompt, options = {} } = params;

    // Check for pre-aborted signal BEFORE spawning process (save resources)
    if (options.abortController?.signal.aborted) {
      return QueryImpl.createAborted();
    }

    // 1. Spawn process via factory
    const childProcess = processFactory.spawn(options);

    // Validate stdio streams exist (they should with stdio: 'pipe')
    if (!childProcess.stdin || !childProcess.stdout) {
      throw new Error('Process stdin/stdout not available');
    }

    // 2. Initialize message queue
    const messageQueue = new MessageQueue<SDKMessage>();

    // 3. Initialize control protocol handler
    const controlHandler = new ControlProtocolHandler(childProcess.stdin, options);

    // 3.5. Connect SDK MCP servers (in-process servers with `instance` property)
    const sdkMcpServerNames: string[] = [];
    QueryImpl.connectMcpBridges(options, controlHandler, sdkMcpServerNames);

    // 4. Set up init response promise before sending init request
    let initResolve!: (value: SDKControlInitializeResponse) => void;
    let initReject!: (reason: Error) => void;
    const initResponsePromise = new Promise<SDKControlInitializeResponse>((resolve, reject) => {
      initResolve = resolve;
      initReject = reject;
    });

    const initRequestId = `init_${Date.now()}`;
    const isSingleUserTurn = typeof prompt === 'string';

    // 5. Construct instance
    const instance = new QueryImpl(
      childProcess,
      messageQueue,
      controlHandler,
      // router placeholder — set below after constructing with callbacks
      null as unknown as MessageRouter,
      initResponsePromise,
      initResolve,
      initReject,
      initRequestId,
      sdkMcpServerNames,
      isSingleUserTurn,
      options.abortController
    );

    // 6. Initialize message router with callbacks (needs instance for closures)
    instance.router = new MessageRouter(
      childProcess.stdout,
      controlHandler,
      (msg) => instance.handleMessage(msg),
      (error) => instance.handleDone(error),
      (response) => instance.handleControlResponse(response)
    );

    // 7. Start background reading
    instance.router.startReading();

    // 8. Send control protocol initialization
    instance.sendControlProtocolInit(options);

    // 9. Handle input based on type
    if (typeof prompt === 'string') {
      instance.sendInitialPrompt(prompt);
    } else {
      instance.consumeInputGenerator(prompt);
    }

    // 10. Setup process exit/error handlers + abort listener
    instance.setupProcessHandlers();

    return instance;
  }

  /**
   * Create an already-aborted QueryImpl (no process spawned).
   */
  private static createAborted(): QueryImpl {
    const messageQueue = new MessageQueue<SDKMessage>();
    messageQueue.complete();
    const abortError = new Error('Query was aborted before initialization');
    const initResponsePromise = Promise.reject(abortError);
    initResponsePromise.catch(() => {}); // Prevent unhandled rejection

    const instance = new QueryImpl(
      null as unknown as ChildProcess,
      messageQueue,
      null as unknown as ControlProtocolHandler,
      null as unknown as MessageRouter,
      initResponsePromise,
      () => {},
      () => {},
      '',
      [],
      false
    );
    instance.closed = true;
    return instance;
  }

  /**
   * Connect SDK MCP server bridges (in-process servers with `instance` property).
   */
  private static connectMcpBridges(
    options: Options,
    controlHandler: ControlProtocolHandler,
    sdkMcpServerNames: string[]
  ): void {
    if (!options.mcpServers) return;

    const bridges = new Map<string, McpServerBridge>();
    for (const [name, config] of Object.entries(options.mcpServers)) {
      if ('instance' in config && config.instance) {
        const bridge = new McpServerBridge(config.instance);
        bridge.connect(); // async but we don't await — server connects in background
        bridges.set(name, bridge);
        sdkMcpServerNames.push(name);
      }
    }
    if (bridges.size > 0) {
      controlHandler.setMcpServerBridges(bridges);
    }
  }

  /**
   * Set up process exit/error handlers and abort controller listener.
   */
  private setupProcessHandlers(): void {
    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null && !this.messageQueue.isDone()) {
        const error = new Error(`Claude CLI exited with code ${code}`);
        this.messageQueue.complete(error);
        this.rejectPendingPromises(error);
      } else if (!this.messageQueue.isDone()) {
        this.messageQueue.complete();
        this.rejectPendingPromises(new Error('CLI exited before responding'));
      }
    });

    this.process.on('error', (err) => {
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(err);
      }
      this.rejectPendingPromises(err);
    });

    if (this.abortController) {
      this.abortHandler = () => {
        this.interrupt();
      };
      this.abortController.signal.addEventListener('abort', this.abortHandler);
    }
  }

  /**
   * Handle incoming message from router
   */
  private handleMessage(msg: SDKMessage): void {
    this.messageQueue.push(msg);

    // For single-turn queries, close stdin on result to signal CLI to exit
    if (msg.type === 'result' && this.isSingleUserTurn) {
      this.process.stdin?.end();
    }
  }

  /**
   * Handle stream completion from router
   */
  private handleDone(error?: Error): void {
    if (!this.messageQueue.isDone()) {
      this.messageQueue.complete(error);
    }
  }

  /**
   * Handle control_response messages from CLI
   * Routes to init promise or pending request/response handlers
   */
  private handleControlResponse(response: ControlResponsePayload): void {
    if (!response) return;

    const requestId = response.request_id;

    // Check if this is the init response
    if (requestId === this.initRequestId) {
      if (response.subtype === 'success') {
        this.initResolve(response.response as SDKControlInitializeResponse);
      } else {
        this.initReject(new Error(`Initialization failed: ${response.error || 'unknown error'}`));
      }
      return;
    }

    // Check if there's a pending request/response handler
    const pending = requestId ? this.pendingControlResponses.get(requestId) : undefined;
    if (pending) {
      const { resolve, reject } = pending;
      this.pendingControlResponses.delete(requestId);
      if (response.subtype === 'success') {
        resolve(response.response);
      } else {
        reject(new Error(`Control request failed: ${response.error || 'unknown error'}`));
      }
    }
  }

  // ============================================================================
  // AsyncGenerator implementation
  // ============================================================================

  async next(): Promise<IteratorResult<SDKMessage>> {
    return this.messageQueue.next();
  }

  async return(_value?: unknown): Promise<IteratorResult<SDKMessage>> {
    this.close();
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
    this.close();
  }

  // ============================================================================
  // Control methods (12 methods from Query interface)
  // ============================================================================

  async interrupt(): Promise<void> {
    this.sendControlRequest(ControlRequests.interrupt());
  }

  async setPermissionMode(mode: PermissionMode): Promise<void> {
    this.sendControlRequest(ControlRequests.setPermissionMode(mode));
  }

  async setModel(model?: string): Promise<void> {
    this.sendControlRequest(ControlRequests.setModel(model));
  }

  async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void> {
    this.sendControlRequest(ControlRequests.setMaxThinkingTokens(maxThinkingTokens));
  }

  async streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void> {
    for await (const msg of stream) {
      this.process.stdin?.write(`${JSON.stringify(msg)}\n`);
    }
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      // Clean up abort controller listener
      if (this.abortController && this.abortHandler) {
        this.abortController.signal.removeEventListener('abort', this.abortHandler);
        this.abortHandler = null;
      }
      this.router?.close();
      this.process?.kill();
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete();
      }
      // Reject any pending control response promises
      this.rejectPendingPromises(new Error('Query closed'));
    }
  }

  async initializationResult(): Promise<SDKControlInitializeResponse> {
    return this.initResponsePromise;
  }

  async supportedCommands(): Promise<SlashCommand[]> {
    const init = await this.initResponsePromise;
    return init.commands;
  }

  async supportedModels(): Promise<ModelInfo[]> {
    const init = await this.initResponsePromise;
    return init.models;
  }

  async availableOutputStyles(): Promise<string[]> {
    const init = await this.initResponsePromise;
    return init.available_output_styles;
  }

  async currentOutputStyle(): Promise<string> {
    const init = await this.initResponsePromise;
    return init.output_style;
  }

  async mcpServerStatus(): Promise<McpServerStatus[]> {
    const response = await this.sendControlRequestWithResponse<{ mcpServers: McpServerStatus[] }>(
      ControlRequests.mcpStatus()
    );
    return response.mcpServers;
  }

  async accountInfo(): Promise<AccountInfo> {
    const init = await this.initResponsePromise;
    return init.account;
  }

  async rewindFiles(
    _userMessageId: string,
    _options?: { dryRun?: boolean }
  ): Promise<RewindFilesResult> {
    throw new Error('rewindFiles() not yet implemented');
  }

  async reconnectMcpServer(serverName: string): Promise<void> {
    await this.sendControlRequestWithResponse(ControlRequests.mcpReconnect(serverName));
  }

  async toggleMcpServer(serverName: string, enabled: boolean): Promise<void> {
    await this.sendControlRequestWithResponse(ControlRequests.mcpToggle(serverName, enabled));
  }

  async setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult> {
    return this.sendControlRequestWithResponse(ControlRequests.mcpSetServers(servers));
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Reject initResponsePromise and all pending control response promises
   */
  private rejectPendingPromises(error: Error): void {
    this.initReject?.(error);
    for (const [, { reject }] of this.pendingControlResponses) {
      reject(error);
    }
    this.pendingControlResponses.clear();
  }

  private sendControlRequest(request: OutboundControlRequest): void {
    const requestId = this.generateRequestId();
    this.process.stdin?.write(
      `${JSON.stringify({
        type: 'control_request',
        request_id: requestId,
        request,
      })}\n`
    );
  }

  /**
   * Send a control request and return a Promise that resolves when the CLI responds
   */
  // biome-ignore lint/suspicious/noExplicitAny: response shape varies by request type
  private sendControlRequestWithResponse<T = any>(request: OutboundControlRequest): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error('Cannot send control request: query is closed'));
    }
    const requestId = this.generateRequestId();
    const promise = new Promise<T>((resolve, reject) => {
      this.pendingControlResponses.set(requestId, { resolve, reject });
    });
    this.process.stdin?.write(
      `${JSON.stringify({
        type: 'control_request',
        request_id: requestId,
        request,
      })}\n`
    );
    return promise;
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async sendControlProtocolInit(options: Options): Promise<void> {
    const requestId = `init_${Date.now()}`;
    this.initRequestId = requestId;

    // Resolve systemPrompt to match official SDK behavior:
    // - undefined → systemPrompt: "" (use minimal prompt, saves tokens)
    // - string → systemPrompt: "..." (custom full prompt)
    // - { type: 'preset', preset: 'claude_code' } → neither field (use claude_code preset)
    // - { type: 'preset', preset: 'claude_code', append: '...' } → appendSystemPrompt: "..."
    let systemPrompt: string | undefined;
    let appendSystemPrompt: string | undefined;

    if (options.systemPrompt === undefined) {
      systemPrompt = '';
    } else if (typeof options.systemPrompt === 'string') {
      systemPrompt = options.systemPrompt;
    } else if (options.systemPrompt.type === 'preset' && options.systemPrompt.append) {
      appendSystemPrompt = options.systemPrompt.append;
    }

    const init: {
      type: 'control_request';
      request_id: string;
      request: {
        subtype: 'initialize';
        systemPrompt?: string;
        appendSystemPrompt?: string;
        sdkMcpServers?: string[];
        hooks?: ReturnType<typeof buildHookConfig>;
      };
    } = {
      type: 'control_request',
      request_id: requestId,
      request: {
        subtype: 'initialize',
        ...(systemPrompt !== undefined && { systemPrompt }),
        ...(appendSystemPrompt !== undefined && { appendSystemPrompt }),
        ...(this.sdkMcpServerNames.length > 0 && { sdkMcpServers: this.sdkMcpServerNames }),
      },
    };

    // Register hooks if configured
    if (options.hooks) {
      init.request.hooks = buildHookConfig(options.hooks, this.controlHandler);
    }

    if (process.env.DEBUG_HOOKS) {
      console.error('[DEBUG] Sending control protocol init:', JSON.stringify(init, null, 2));
    }

    this.process.stdin?.write(`${JSON.stringify(init)}\n`);
  }

  private sendInitialPrompt(prompt: string): void {
    const initialMessage: SDKUserMessage = {
      type: 'user',
      message: {
        role: 'user',
        content: [{ type: 'text', text: prompt }],
      },
      session_id: '',
      parent_tool_use_id: null,
    };

    this.process.stdin?.write(`${JSON.stringify(initialMessage)}\n`);
  }

  private async consumeInputGenerator(generator: AsyncIterable<SDKUserMessage>): Promise<void> {
    try {
      for await (const userMsg of generator) {
        this.process.stdin?.write(`${JSON.stringify(userMsg)}\n`);
      }
    } catch (error: unknown) {
      const wrappedError = error instanceof Error ? error : new Error(String(error));
      console.error('[QueryImpl] Error consuming input generator:', wrappedError);
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(wrappedError);
      }
    }
  }
}
