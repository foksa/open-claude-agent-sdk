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
import { ControlProtocolHandler, ControlRequests } from '../core/control.ts';
import { connectMcpBridges } from '../core/mcpBridge.ts';
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
import { ControlRequestManager } from './ControlRequestManager.ts';
import { MessageQueue } from './MessageQueue.ts';
import { MessageRouter } from './MessageRouter.ts';
import { DefaultProcessFactory, type ProcessFactory } from './ProcessFactory.ts';
import { sendInitialPrompt, sendProtocolInit } from './protocolInit.ts';

export class QueryImpl implements Query {
  private closed = false;
  private abortHandler: (() => void) | null = null;

  private constructor(
    private process: ChildProcess,
    private messageQueue: MessageQueue<SDKMessage>,
    private controlManager: ControlRequestManager,
    private router: MessageRouter,
    private isSingleUserTurn: boolean,
    private abortController?: AbortController
  ) {}

  /**
   * Factory method — spawns process, wires components, starts communication.
   */
  static create(
    params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options },
    processFactory: ProcessFactory = new DefaultProcessFactory()
  ): QueryImpl {
    const { prompt, options = {} } = params;

    // Check for pre-aborted signal BEFORE spawning process
    if (options.abortController?.signal.aborted) {
      return QueryImpl.createAborted();
    }

    // 1. Spawn process
    const childProcess = processFactory.spawn(options);
    if (!childProcess.stdin || !childProcess.stdout) {
      throw new Error('Process stdin/stdout not available');
    }

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
      options.abortController
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
    messageQueue.complete();

    const controlManager = new ControlRequestManager(null);
    controlManager.rejectAll(new Error('Query was aborted before initialization'));

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
    this.process.on('exit', (code) => {
      if (code !== 0 && code !== null && !this.messageQueue.isDone()) {
        const error = new Error(`Claude CLI exited with code ${code}`);
        this.messageQueue.complete(error);
        this.controlManager.rejectAll(error);
      } else if (!this.messageQueue.isDone()) {
        this.messageQueue.complete();
        this.controlManager.rejectAll(new Error('CLI exited before responding'));
      }
    });

    this.process.on('error', (err) => {
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete(err);
      }
      this.controlManager.rejectAll(err);
    });

    if (this.abortController) {
      this.abortHandler = () => {
        this.interrupt();
      };
      this.abortController.signal.addEventListener('abort', this.abortHandler);
    }
  }

  private handleMessage(msg: SDKMessage): void {
    this.messageQueue.push(msg);

    // For single-turn queries, close stdin on result to signal CLI to exit
    if (msg.type === 'result' && this.isSingleUserTurn) {
      this.process.stdin?.end();
    }
  }

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
  // Control methods (Query interface)
  // ============================================================================

  async interrupt(): Promise<void> {
    this.controlManager.sendControlRequest(ControlRequests.interrupt());
  }

  async setPermissionMode(mode: PermissionMode): Promise<void> {
    this.controlManager.sendControlRequest(ControlRequests.setPermissionMode(mode));
  }

  async setModel(model?: string): Promise<void> {
    this.controlManager.sendControlRequest(ControlRequests.setModel(model));
  }

  async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void> {
    this.controlManager.sendControlRequest(ControlRequests.setMaxThinkingTokens(maxThinkingTokens));
  }

  async streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void> {
    for await (const msg of stream) {
      this.controlManager.writeToStdin(msg);
    }
  }

  close(): void {
    if (!this.closed) {
      this.closed = true;
      if (this.abortController && this.abortHandler) {
        this.abortController.signal.removeEventListener('abort', this.abortHandler);
        this.abortHandler = null;
      }
      this.router?.close();
      this.process?.kill();
      if (!this.messageQueue.isDone()) {
        this.messageQueue.complete();
      }
      this.controlManager.rejectAll(new Error('Query closed'));
    }
  }

  async initializationResult(): Promise<SDKControlInitializeResponse> {
    return this.controlManager.waitForInit();
  }

  async supportedCommands(): Promise<SlashCommand[]> {
    const init = await this.controlManager.waitForInit();
    return init.commands;
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
    return this.controlManager.sendControlRequestWithResponse(
      ControlRequests.mcpSetServers(servers)
    );
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  private async consumeInputGenerator(generator: AsyncIterable<SDKUserMessage>): Promise<void> {
    try {
      for await (const userMsg of generator) {
        this.controlManager.writeToStdin(userMsg);
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
