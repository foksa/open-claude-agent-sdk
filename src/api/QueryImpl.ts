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
import type {
  Options,
  PermissionMode,
  Query,
  SDKControlInitializeResponse,
  SDKMessage,
  SDKUserMessage,
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

    // 4. Initialize message router with callbacks
    this.router = new MessageRouter(
      this.process.stdout,
      this.controlHandler,
      (msg) => this.handleMessage(msg),
      (error) => this.handleDone(error)
    );

    // 5. Start background reading
    this.router.startReading();

    // 6. Send control protocol initialization
    this.sendControlProtocolInit(options);

    // 7. Handle input based on type
    if (typeof prompt === 'string') {
      this.sendInitialPrompt(prompt);
    } else {
      this.consumeInputGenerator(prompt);
    }

    // 8. Handle process exit/error
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

    // 9. Setup abort controller listener if provided
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
    this.sendControlRequest({ subtype: 'interrupt' });
  }

  async setPermissionMode(mode: PermissionMode): Promise<void> {
    this.sendControlRequest({ subtype: 'set_permission_mode', mode });
  }

  async setModel(model?: string): Promise<void> {
    this.sendControlRequest({ subtype: 'set_model', model });
  }

  async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void> {
    this.sendControlRequest({
      subtype: 'set_max_thinking_tokens',
      max_thinking_tokens: maxThinkingTokens,
    });
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
    throw new Error('initializationResult() not implemented in Baby Step 5');
  }

  async supportedCommands(): Promise<any[]> {
    throw new Error('supportedCommands() not implemented in Baby Step 5');
  }

  async supportedModels(): Promise<any[]> {
    throw new Error('supportedModels() not implemented in Baby Step 5');
  }

  async mcpServerStatus(): Promise<any[]> {
    throw new Error('mcpServerStatus() not implemented in Baby Step 5');
  }

  async accountInfo(): Promise<any> {
    throw new Error('accountInfo() not implemented in Baby Step 5');
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

  private sendControlRequest(request: any): void {
    const requestId = this.generateRequestId();
    this.process.stdin?.write(
      `${JSON.stringify({
        type: 'control_request',
        request_id: requestId,
        request,
      })}\n`
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private async sendControlProtocolInit(options: Options): Promise<void> {
    const requestId = `init_${Date.now()}`;

    const init: any = {
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
      const hooksConfig: Record<string, any> = {};
      let callbackId = 0;

      for (const [eventName, matchers] of Object.entries(options.hooks)) {
        hooksConfig[eventName] = matchers.map((matcher) => {
          const hookCallbackIds = matcher.hooks.map((hookFn) => {
            const id = `hook_${callbackId++}`;
            this.controlHandler.registerCallback(id, hookFn);
            return id;
          });

          return {
            matcher: matcher.matcher,
            hookCallbackIds,
          };
        });
      }

      init.request.hooks = hooksConfig;
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
