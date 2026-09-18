/**
 * MCP Server Transport Bridge
 *
 * Bridges in-process McpServer instances to CLI stdin/stdout via control protocol.
 * Implements the same transport pattern as the official SDK's SdkMcpTransport:
 * responses to CLI requests resolve the pending `mcp_message`, and anything
 * else the server sends (notifications, server→client requests) is forwarded
 * to the CLI as its own `mcp_message` control request.
 *
 * @internal
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { McpServerConfig, Options } from '../types/index.ts';
import type { ControlProtocolHandler } from './control.ts';

type SdkServerConfig = { type: 'sdk'; name: string; instance: unknown; timeout?: number };

function isSdkServerConfig(config: McpServerConfig): config is McpServerConfig & SdkServerConfig {
  return config.type === 'sdk' && 'instance' in config && !!config.instance;
}

/** Positive integer timeouts only (matches official SDK validation). */
function validTimeout(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined;
}

function connectBridge(
  controlHandler: ControlProtocolHandler,
  name: string,
  config: SdkServerConfig
): McpServerBridge {
  // Type assertion needed: official SDK may bundle its own @modelcontextprotocol/sdk
  // copy, causing structurally identical but nominally different McpServer types
  const bridge = new McpServerBridge(
    config.instance as unknown as McpServer,
    (message) => controlHandler.sendMcpMessageToCli(name, message),
    validTimeout(config.timeout)
  );
  controlHandler.addMcpServerBridge(name, bridge);
  bridge.connect().catch((err) => {
    controlHandler.removeMcpServerBridge(name, bridge);
    console.error(`[open-claude-agent-sdk] Failed to connect MCP server '${name}': ${err}`);
  });
  return bridge;
}

/**
 * Connect SDK MCP server bridges (in-process servers with `instance` property).
 * Creates bridges and registers them with the control handler.
 *
 * @returns Array of SDK MCP server names that were connected
 */
export function connectMcpBridges(
  options: Options,
  controlHandler: ControlProtocolHandler
): string[] {
  const names: string[] = [];
  for (const [name, config] of Object.entries(options.mcpServers ?? {})) {
    if (isSdkServerConfig(config)) {
      connectBridge(controlHandler, name, config);
      names.push(name);
    }
  }
  return names;
}

/**
 * Apply a `setMcpServers()` call locally: connect new in-process servers,
 * disconnect removed ones, and return the server map to send to the CLI —
 * in-process servers are sent as `{ type: 'sdk', name, timeout? }` only.
 */
export async function setSdkMcpServers(
  servers: Record<string, McpServerConfig>,
  controlHandler: ControlProtocolHandler
): Promise<Record<string, McpServerConfig>> {
  const sdk: Record<string, SdkServerConfig> = {};
  const others: Record<string, McpServerConfig> = {};
  for (const [name, config] of Object.entries(servers)) {
    if (isSdkServerConfig(config)) sdk[name] = config;
    else others[name] = config;
  }

  for (const name of controlHandler.mcpServerBridgeNames()) {
    if (name in sdk) continue;
    const bridge = controlHandler.getMcpServerBridge(name);
    if (!bridge) continue;
    await bridge.close();
    controlHandler.removeMcpServerBridge(name, bridge);
  }
  for (const [name, config] of Object.entries(sdk)) {
    const existing = controlHandler.getMcpServerBridge(name);
    if (!existing) connectBridge(controlHandler, name, config);
    // An already-registered server keeps its original timeout (official behavior)
  }

  const sdkEntries: Record<string, McpServerConfig> = {};
  for (const name of Object.keys(sdk)) {
    const timeout = controlHandler.getMcpServerBridge(name)?.timeout;
    sdkEntries[name] = {
      type: 'sdk',
      name,
      ...(timeout !== undefined && { timeout }),
    } as McpServerConfig;
  }
  return { ...others, ...sdkEntries };
}

export class McpServerBridge {
  // biome-ignore lint/suspicious/noExplicitAny: matches Transport.onmessage signature which uses JSONRPCMessage generic
  private serverOnMessage: ((msg: any) => void) | null = null;
  private transport: Transport | null = null;
  private isClosed = false;
  private pendingRequests = new Map<
    number | string,
    { resolve: (value: Record<string, unknown>) => void }
  >();

  constructor(
    private serverInstance: McpServer,
    private sendToCli: (message: Record<string, unknown>) => void = () => {},
    readonly timeout?: number
  ) {}

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
      async close() {
        if (self.isClosed) return;
        self.isClosed = true;
        transport.onclose?.();
      },
      async send(msg) {
        if (self.isClosed) throw new Error('Transport is closed');
        const message = msg as Record<string, unknown>;
        // A response to a CLI request resolves its pending mcp_message
        if ('id' in message && message.id != null) {
          const pending = self.pendingRequests.get(message.id as number | string);
          if (pending) {
            pending.resolve(message);
            self.pendingRequests.delete(message.id as number | string);
            return;
          }
        }
        // Server-initiated: notifications (tools/list_changed, progress,
        // logging) and server→client requests go to the CLI
        self.sendToCli(message);
      },
      onmessage: undefined,
      onclose: undefined,
      onerror: undefined,
    };
    this.transport = transport;

    await this.serverInstance.connect(transport);
    // Server sets onmessage during connect() — capture it
    this.serverOnMessage = transport.onmessage
      ? (msg: unknown) => transport.onmessage?.(msg as never)
      : null;
  }

  /** Disconnect the server (setMcpServers removal or query close). */
  async close(): Promise<void> {
    await this.transport?.close();
  }

  /**
   * Handle an incoming MCP message from the CLI.
   *
   * - Requests (method + id): forwarded to server, waits for response
   * - Notifications (method, no id): fire and forget
   */
  async handleMessage(message: Record<string, unknown>): Promise<Record<string, unknown>> {
    if (!this.serverOnMessage) {
      throw new Error('No message handler registered');
    }

    // Requests have method + id → wait for response
    if ('method' in message && 'id' in message && message.id !== null) {
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
