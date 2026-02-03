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
import { createInterface } from 'node:readline';
import type { Query, SDKMessage, SDKUserMessage, Options, PermissionMode, SDKControlInitializeResponse } from '../types/index.ts';
import type { StdoutMessage } from '../types/control.ts';
import { detectClaudeBinary } from '../core/detection.ts';
import { buildCliArgs, spawnClaude } from '../core/spawn.ts';
import { ControlProtocolHandler } from '../core/control.ts';

export class QueryImpl implements Query {
  private process: ChildProcess;
  private controlHandler: ControlProtocolHandler;
  private messageQueue: SDKMessage[] = [];
  private resolveQueue: Array<(value: IteratorResult<SDKMessage>) => void> = [];
  private done = false;
  private error: Error | null = null;
  private isSingleUserTurn: boolean;  // Track if single-turn (string prompt) vs multi-turn (AsyncIterable)

  constructor(params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options }) {
    const { prompt, options = {} } = params;

    // Determine if single-turn or multi-turn (matches official SDK behavior)
    this.isSingleUserTurn = typeof prompt === 'string';

    // 1. Detect binary (pass options for pathToClaudeCodeExecutable support)
    const binary = detectClaudeBinary(options);

    // 2. Build args with --input-format stream-json (NO prompt on CLI)
    const args = buildCliArgs({ ...options, prompt: '' });

    // 3. Spawn process (cwd is a process option, not a CLI argument)
    this.process = spawnClaude(binary, args, { cwd: options.cwd });

    // 4. DON'T close stdin! Keep it open for control responses and multi-turn
    // Baby Steps 1-4: process.stdin.end(); ❌
    // Baby Step 5: stdin stays open for bidirectional communication ✅

    // 5. Initialize control protocol handler
    this.controlHandler = new ControlProtocolHandler(
      this.process.stdin!,
      options
    );

    // 6. Start background reading
    this.startReading();

    // 7. ALWAYS send control protocol initialization
    // Official SDK sends this even without hooks - affects API caching!
    // Must happen BEFORE sending any user messages
    this.sendControlProtocolInit(options);

    // 8. Handle input based on type
    // Note: We don't await init - CLI handles message ordering
    if (typeof prompt === 'string') {
      // Simple string input: send as first user message
      this.sendInitialPrompt(prompt);
    } else {
      // AsyncIterable input: streaming input mode
      // Consume generator in background, sending each message as it's yielded
      this.consumeInputGenerator(prompt);
    }

    // 8. Handle process exit/error
    this.process.on('exit', (code) => {
      this.done = true;
      if (code !== 0 && code !== null) {
        this.error = new Error(`Claude CLI exited with code ${code}`);
      }
      this.notifyWaiters();
    });

    this.process.on('error', (err) => {
      this.done = true;
      this.error = err;
      this.notifyWaiters();
    });
  }

  /**
   * Background task: Read stdout and route messages
   * - Control requests → handled by ControlProtocolHandler
   * - Regular messages → added to message queue for iteration
   */
  private async startReading() {
    try {
      if (!this.process.stdout) {
        throw new Error('Process stdout is null');
      }

      const rl = createInterface({
        input: this.process.stdout,
        crlfDelay: Infinity
      });

      for await (const line of rl) {
        if (!line.trim()) continue;

        // Debug: log raw line
        if (process.env.DEBUG_HOOKS) {
          console.error('[DEBUG] Raw line:', line.substring(0, 200));
        }

        try {
          const msg = JSON.parse(line) as StdoutMessage;

          // Debug: log message type
          if (process.env.DEBUG_HOOKS) {
            console.error('[DEBUG] Message type:', msg.type);
          }

          if (msg.type === 'control_request') {
            if (process.env.DEBUG_HOOKS) {
              console.error('[DEBUG] !!! CONTROL REQUEST !!!:', (msg as any).request?.subtype);
            }
            // Handle control request internally (don't yield to user)
            await this.controlHandler.handleControlRequest(msg);
          } else if ((msg as any).type === 'control_response') {
            // Filter out control_response - internal protocol message
            // Don't yield to user (use 'as any' since control_response isn't in SDKMessage union)
            if (process.env.DEBUG_HOOKS) {
              console.error('[DEBUG] control_response received (filtered)');
            }
          } else {
            // Regular message - add to queue and notify waiters
            this.messageQueue.push(msg as SDKMessage);

            // For single-turn queries, close stdin on result to signal CLI to exit
            // Note: Due to Bun's async behavior, streamInput() calls after this
            // can still work if called quickly (same as official SDK behavior)
            if (msg.type === 'result' && this.isSingleUserTurn) {
              this.process.stdin?.end();
            }

            this.notifyWaiters();
          }
        } catch (parseError) {
          // Log but don't crash on parse errors
          console.error('Failed to parse line:', line, parseError);
        }
      }
    } catch (err: any) {
      this.error = err;
    } finally {
      this.done = true;
      this.notifyWaiters();
    }
  }

  /**
   * Notify waiting iterators when new messages arrive or stream ends
   */
  private notifyWaiters() {
    // Resolve pending promises with available messages
    while (this.resolveQueue.length > 0 && this.messageQueue.length > 0) {
      const resolve = this.resolveQueue.shift()!;
      const message = this.messageQueue.shift()!;
      resolve({ value: message, done: false });
    }

    // If done and no more messages, notify all remaining waiters
    if (this.done && this.resolveQueue.length > 0) {
      const resolvers = this.resolveQueue.splice(0);
      for (const resolve of resolvers) {
        if (this.error) {
          // Return done with error (consumer should check for result message)
          resolve({ value: undefined as any, done: true });
        } else {
          resolve({ value: undefined as any, done: true });
        }
      }
    }
  }

  // ============================================================================
  // AsyncGenerator implementation
  // ============================================================================

  async next(): Promise<IteratorResult<SDKMessage>> {
    // If messages in queue, return immediately
    if (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      return { value: message, done: false };
    }

    // If done and no messages, return done
    if (this.done) {
      return { value: undefined as any, done: true };
    }

    // Wait for next message
    return new Promise<IteratorResult<SDKMessage>>((resolve) => {
      this.resolveQueue.push(resolve);
    });
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

  /**
   * Interrupt the current query execution
   */
  async interrupt(): Promise<void> {
    this.sendControlRequest({
      subtype: 'interrupt'
    });
  }

  /**
   * Change permission mode during execution
   */
  async setPermissionMode(mode: PermissionMode): Promise<void> {
    this.sendControlRequest({
      subtype: 'set_permission_mode',
      mode
    });
  }

  /**
   * Change model during execution
   */
  async setModel(model?: string): Promise<void> {
    this.sendControlRequest({
      subtype: 'set_model',
      model
    });
  }

  /**
   * Set max thinking tokens
   */
  async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void> {
    this.sendControlRequest({
      subtype: 'set_max_thinking_tokens',
      max_thinking_tokens: maxThinkingTokens
    });
  }

  /**
   * Stream additional user input (multi-turn conversation)
   */
  async streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void> {
    for await (const msg of stream) {
      this.process.stdin?.write(`${JSON.stringify(msg)}\n`);
    }
  }

  /**
   * Close the query and kill the process
   */
  close(): void {
    if (!this.done) {
      this.process.kill();
      this.done = true;
      this.notifyWaiters();
    }
  }

  /**
   * Get initialization result (commands, models, account info)
   */
  async initializationResult(): Promise<SDKControlInitializeResponse> {
    throw new Error('initializationResult() not implemented in Baby Step 5');
  }

  /**
   * Get supported commands from CLI
   */
  async supportedCommands(): Promise<any[]> {
    throw new Error('supportedCommands() not implemented in Baby Step 5');
  }

  /**
   * Get supported models from CLI
   */
  async supportedModels(): Promise<any[]> {
    throw new Error('supportedModels() not implemented in Baby Step 5');
  }

  /**
   * Get MCP server status
   */
  async mcpServerStatus(): Promise<any[]> {
    throw new Error('mcpServerStatus() not implemented in Baby Step 5');
  }

  /**
   * Get account info
   */
  async accountInfo(): Promise<any> {
    throw new Error('accountInfo() not implemented in Baby Step 5');
  }

  /**
   * Rewind files to previous state
   */
  async rewindFiles(_userMessageId: string, _options?: { dryRun?: boolean }): Promise<any> {
    throw new Error('rewindFiles() not implemented in Baby Step 5');
  }

  /**
   * Reconnect to MCP server
   */
  async reconnectMcpServer(_serverName: string): Promise<void> {
    throw new Error('reconnectMcpServer() not implemented in Baby Step 5');
  }

  /**
   * Toggle MCP server enabled/disabled
   */
  async toggleMcpServer(_serverName: string, _enabled: boolean): Promise<void> {
    throw new Error('toggleMcpServer() not implemented in Baby Step 5');
  }

  /**
   * Set MCP servers dynamically
   */
  async setMcpServers(_servers: Record<string, any>): Promise<any> {
    throw new Error('setMcpServers() not implemented in Baby Step 5');
  }

  // ============================================================================
  // Private helpers
  // ============================================================================

  /**
   * Send control request to CLI via stdin
   */
  private sendControlRequest(request: any): void {
    const requestId = this.generateRequestId();
    this.process.stdin?.write(`${JSON.stringify({
      type: 'control_request',
      request_id: requestId,
      request
    })}\n`);
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Send initial user message with prompt
   * Required when using --input-format stream-json
   */
  /**
   * Send control protocol initialization
   * Must be sent BEFORE first user message to register hooks
   */
  private async sendControlProtocolInit(options: Options): Promise<void> {
    // Generate unique request ID
    const requestId = `init_${Date.now()}`;

    const init: any = {
      type: 'control_request',
      request_id: requestId,
      request: {
        subtype: 'initialize',
        // Match official SDK behavior:
        // - String systemPrompt: include in init request
        // - Object/preset systemPrompt: don't include (handled differently)
        // - No systemPrompt: send empty string for cache token optimization
        systemPrompt: typeof options.systemPrompt === 'string'
          ? options.systemPrompt
          : options.systemPrompt === undefined
            ? ''
            : undefined
      }
    };

    // Register hooks if configured
    if (options.hooks) {
      const hooksConfig: Record<string, any> = {};
      let callbackId = 0;

      for (const [eventName, matchers] of Object.entries(options.hooks)) {
        hooksConfig[eventName] = matchers.map((matcher) => {
          const hookCallbackIds = matcher.hooks.map((hookFn) => {
            const id = `hook_${callbackId++}`;
            // Store callback mapping in control handler
            this.controlHandler.registerCallback(id, hookFn);
            return id;
          });

          return {
            matcher: matcher.matcher,
            hookCallbackIds
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
        content: [
          {
            type: 'text',
            text: prompt
          }
        ]
      },
      session_id: '', // Will be filled by CLI
      parent_tool_use_id: null
    };

    this.process.stdin?.write(`${JSON.stringify(initialMessage)}\n`);
  }

  /**
   * Consume async iterable input (streaming input mode)
   * Each yielded message is sent to stdin as it arrives
   * This enables the official SDK's recommended pattern for multi-turn conversations
   */
  private async consumeInputGenerator(
    generator: AsyncIterable<SDKUserMessage>
  ): Promise<void> {
    try {
      for await (const userMsg of generator) {
        // Write each message to stdin as it's yielded by the generator
        this.process.stdin?.write(`${JSON.stringify(userMsg)}\n`);
      }
      // Generator exhausted - no more input
    } catch (error: any) {
      console.error('[QueryImpl] Error consuming input generator:', error);
      this.error = error;
    }
  }
}
