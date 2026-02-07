/**
 * MCP Server Transport Bridge
 *
 * Bridges in-process McpServer instances to CLI stdin/stdout via control protocol.
 * Implements the same transport pattern as the official SDK's SdkMcpTransport.
 *
 * @internal
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

export class McpServerBridge {
  // biome-ignore lint/suspicious/noExplicitAny: matches Transport.onmessage signature which uses JSONRPCMessage generic
  private serverOnMessage: ((msg: any) => void) | null = null;
  private pendingRequests = new Map<
    number | string,
    { resolve: (value: Record<string, unknown>) => void }
  >();

  constructor(private serverInstance: McpServer) {}

  /**
   * Connect the bridge to the McpServer instance.
   * Creates a transport that captures the server's onmessage handler
   * and routes responses back through pending request promises.
   */
  async connect(): Promise<void> {
    // Close any existing connection — McpServer only allows one transport at a time
    await this.serverInstance.close().catch(() => {});

    const self = this;
    const transport: Transport = {
      async start() {},
      async close() {},
      async send(msg) {
        // Server sends response — resolve pending promise
        if ('id' in msg && msg.id != null) {
          const pending = self.pendingRequests.get(msg.id as number | string);
          if (pending) {
            pending.resolve(msg as Record<string, unknown>);
            self.pendingRequests.delete(msg.id as number | string);
          }
        }
      },
      onmessage: undefined,
      onclose: undefined,
      onerror: undefined,
    };

    await this.serverInstance.connect(transport);
    // Server sets onmessage during connect() — capture it
    this.serverOnMessage = transport.onmessage
      ? (msg: unknown) => transport.onmessage?.(msg as never)
      : null;
  }

  /**
   * Handle an incoming MCP message from the CLI.
   *
   * - Requests (method + id): forwarded to server, waits for response
   * - Notifications (method, no id): fire and forget
   */
  async handleMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.serverOnMessage) {
      throw new Error('McpServer not connected');
    }

    // Requests have method + id → wait for response
    if ('method' in message && 'id' in message) {
      return new Promise((resolve) => {
        this.pendingRequests.set(message.id as number | string, { resolve });
        this.serverOnMessage?.(message);
      });
    }

    // Notifications → fire and forget
    this.serverOnMessage(message);
    return { jsonrpc: '2.0', result: {}, id: 0 };
  }
}
