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
import type {
  AccountInfo,
  McpServerStatus,
  ModelInfo,
  Options,
  PermissionMode,
  Query,
  SDKControlInitializeResponse,
  SDKMessage,
  SDKUserMessage,
  SlashCommand,
} from '../types/index.ts';
import { MessageQueue } from './MessageQueue.ts';
import { MessageRouter } from './MessageRouter.ts';
import { DefaultProcessFactory, type ProcessFactory } from './ProcessFactory.ts';

export class QueryImpl implements Query {
  private process!: ChildProcess;
  private controlHandler!: ControlProtocolHandler;
  private messageQueue!: MessageQueue<SDKMessage>;
  private router!: MessageRouter;
  private isSingleUserTurn = false;
  private closed = false;
  private abortHandler: (() => void) | null = null; // Handler for abortController cleanup
  private abortController: AbortController | undefined; // Store for cleanup

  // Init response capture
  private initResponsePromise!: Promise<SDKControlInitializeResponse>;
  private initResolve!: (value: SDKControlInitializeResponse) => void;
  private initRequestId!: string;

  // Pending control request/response map (for mcpServerStatus, etc.)
  // biome-ignore lint/suspicious/noExplicitAny: response shape varies by request type
  private pendingControlResponses = new Map<string, (value: any) => void>();

  constructor(
    params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options },
    processFactory: ProcessFactory = new DefaultProcessFactory()
  ) {
    const { prompt, options = {} } = params;

    // Check for pre-aborted signal BEFORE spawning process (save resources)
    if (options.abortController?.signal.aborted) {
      this.closed = true;
      // Mark as aborted - the iterator will return done immediately
      // Initialize with empty values to satisfy TypeScript
      this.messageQueue = new MessageQueue<SDKMessage>();
      this.messageQueue.complete();
      return;
    }

    // Determine if single-turn or multi-turn
    this.isSingleUserTurn = typeof prompt === 'string';

    // 1. Spawn process via factory
    this.process = processFactory.spawn(options);

    // Validate stdio streams exist (they should with stdio: 'pipe')
    if (!this.process.stdin || !this.process.stdout) {
      throw new Error('Process stdin/stdout not available');
    }

    // 2. Initialize message queue
    this.messageQueue = new MessageQueue<SDKMessage>();

    // 3. Initialize control protocol handler
    this.controlHandler = new ControlProtocolHandler(this.process.stdin, options);

    // 4. Initialize message router with callbacks (including control response routing)
    this.router = new MessageRouter(
      this.process.stdout,
      this.controlHandler,
      (msg) => this.handleMessage(msg),
      (error) => this.handleDone(error),
      (response) => this.handleControlResponse(response)
    );

    // 5. Start background reading
    this.router.startReading();

    // 6. Set up init response promise before sending init request
    this.initResponsePromise = new Promise<SDKControlInitializeResponse>((resolve) => {
      this.initResolve = resolve;
    });

    // 7. Send control protocol initialization
    this.sendControlProtocolInit(options);

    // 8. Handle input based on type
    if (typeof prompt === 'string') {
      this.sendInitialPrompt(prompt);
    } else {
      this.consumeInputGenerator(prompt);
    }

    // 9. Handle process exit/error
    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null && !this.messageQueue.isDone()) {
        this.messageQueue.complete(new Error(`Claude CLI exited with code ${code}`));
      } else if (!this.messageQueue.isDone()) {
        this.messageQueue.complete();
      }
    });

    this.process.on('error', (err) => {
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(err);
      }
    });

    // 10. Setup abort controller listener if provided
    if (options.abortController) {
      this.abortController = options.abortController;
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
  // biome-ignore lint/suspicious/noExplicitAny: control_response shape is not in SDK types
  private handleControlResponse(response: any): void {
    if (!response) return;

    const requestId = response.request_id;

    // Check if this is the init response
    if (requestId === this.initRequestId && response.subtype === 'success') {
      this.initResolve(response.response as SDKControlInitializeResponse);
      return;
    }

    // Check if there's a pending request/response handler
    if (requestId && this.pendingControlResponses.has(requestId)) {
      const resolve = this.pendingControlResponses.get(requestId)!;
      this.pendingControlResponses.delete(requestId);
      if (response.subtype === 'success') {
        resolve(response.response);
      }
    }
  }

  // ============================================================================
  // AsyncGenerator implementation
  // ============================================================================

  async next(): Promise<IteratorResult<SDKMessage>> {
    return this.messageQueue.next();
  }

  async return(_value?: any): Promise<IteratorResult<SDKMessage>> {
    this.close();
    return { value: undefined as any, done: true };
  }

  async throw(e?: any): Promise<IteratorResult<SDKMessage>> {
    this.close();
    throw e;
  }

  [Symbol.asyncIterator](): AsyncGenerator<SDKMessage, void> {
    return this as any;
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

  async rewindFiles(_userMessageId: string, _options?: { dryRun?: boolean }): Promise<any> {
    throw new Error('rewindFiles() not implemented in Baby Step 5');
  }

  async reconnectMcpServer(_serverName: string): Promise<void> {
    throw new Error('reconnectMcpServer() not implemented in Baby Step 5');
  }

  async toggleMcpServer(_serverName: string, _enabled: boolean): Promise<void> {
    throw new Error('toggleMcpServer() not implemented in Baby Step 5');
  }

  async setMcpServers(_servers: Record<string, any>): Promise<any> {
    throw new Error('setMcpServers() not implemented in Baby Step 5');
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

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
    const requestId = this.generateRequestId();
    const promise = new Promise<T>((resolve) => {
      this.pendingControlResponses.set(requestId, resolve);
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

    const init: {
      type: 'control_request';
      request_id: string;
      request: {
        subtype: 'initialize';
        systemPrompt?: string;
        hooks?: ReturnType<typeof buildHookConfig>;
      };
    } = {
      type: 'control_request',
      request_id: requestId,
      request: {
        subtype: 'initialize',
        systemPrompt:
          typeof options.systemPrompt === 'string'
            ? options.systemPrompt
            : options.systemPrompt === undefined
              ? ''
              : undefined,
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
    } catch (error: any) {
      console.error('[QueryImpl] Error consuming input generator:', error);
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(error);
      }
    }
  }
}
