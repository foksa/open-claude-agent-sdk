/**
 * In-process MCP server manifest capture (official SDK v0.3.281+).
 *
 * Before writing `initialize`, run each in-process server's MCP handshake
 * (`initialize`, `notifications/initialized`, `tools/list`) here and send the
 * results as `sdkMcpServerManifests`. The CLI then answers its own client's
 * handshake from them instead of making `mcp_message` round trips, so the
 * servers' tools are ready sooner. Bounded at 250ms; a server not captured
 * in time is handshaked over the control channel as before.
 *
 * @internal
 */

import { COMPATIBLE_SDK_VERSION } from '../constants.ts';
import type { SdkMcpServerManifest } from '../types/control.ts';
import { isEnvTruthy } from './argBuilder.ts';
import type { ControlProtocolHandler } from './control.ts';
import type { McpServerBridge } from './mcpBridge.ts';

/** How long `initialize` may wait for the capture (official SDK). */
export const MANIFEST_CAPTURE_DEADLINE_MS = 250;

/** Request ids of capture messages (official SDK prefix). */
const CAPTURE_ID_PREFIX = 'sdk-manifest-capture:';

/** MCP protocol version the CLI's client requests (official SDK). */
const MCP_PROTOCOL_VERSION = '2025-11-25';

/** The CLI's MCP client identity, as the official SDK sends it. */
const CLIENT_INFO = {
  name: 'claude-code',
  title: 'Claude Code',
  description: "Anthropic's agentic coding tool",
  websiteUrl: 'https://claude.com/claude-code',
};

/** Capture is on unless CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS is set (official SDK). */
export function manifestCaptureEnabled(): boolean {
  return !isEnvTruthy(process.env.CLAUDE_AGENT_SDK_DISABLE_MCP_MANIFESTS);
}

async function captureOne(
  bridge: McpServerBridge,
  isStopped: () => boolean
): Promise<SdkMcpServerManifest | undefined> {
  await bridge.ready;
  if (isStopped()) return undefined;
  const init = await bridge.handleMessage({
    jsonrpc: '2.0',
    id: `${CAPTURE_ID_PREFIX}initialize`,
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { ...CLIENT_INFO, version: COMPATIBLE_SDK_VERSION },
    },
  });
  if (isStopped() || !('result' in init)) return undefined;
  const initializeResult = init.result as Record<string, unknown>;
  await bridge.handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });

  const capabilities = initializeResult.capabilities;
  const hasTools =
    typeof capabilities === 'object' &&
    capabilities !== null &&
    'tools' in capabilities &&
    capabilities.tools != null;
  let toolsListResult: Record<string, unknown> | undefined;
  if (hasTools) {
    const list = await bridge.handleMessage({
      jsonrpc: '2.0',
      id: `${CAPTURE_ID_PREFIX}tools-list`,
      method: 'tools/list',
    });
    if (isStopped() || !('result' in list)) return undefined;
    const result = list.result as Record<string, unknown>;
    // A paginated list can't be replayed in one result
    if (result.nextCursor === undefined) toolsListResult = result;
  }
  // Plain JSON, as it will be written
  return JSON.parse(
    JSON.stringify(
      toolsListResult === undefined ? { initializeResult } : { initializeResult, toolsListResult }
    )
  );
}

/**
 * Capture the handshake of every registered in-process server, waiting at
 * most MANIFEST_CAPTURE_DEADLINE_MS, or until `closed` resolves.
 *
 * @returns manifests keyed by server name, or undefined when none was captured
 */
export async function captureSdkMcpManifests(
  controlHandler: ControlProtocolHandler,
  closed: Promise<void>
): Promise<Record<string, SdkMcpServerManifest> | undefined> {
  let stopped = false;
  const captured = new Map<string, { bridge: McpServerBridge; manifest: SdkMcpServerManifest }>();
  const names = controlHandler.mcpServerBridgeNames();
  const all = Promise.all(
    names.map(async (name) => {
      const bridge = controlHandler.getMcpServerBridge(name);
      if (!bridge) return;
      try {
        const manifest = await captureOne(bridge, () => stopped);
        if (manifest && !stopped) captured.set(name, { bridge, manifest });
      } catch {
        // The CLI will handshake it over the control channel
      }
    })
  );

  let timer: ReturnType<typeof setTimeout> | undefined;
  const outcome = await Promise.race([
    all.then(() => 'settled' as const),
    closed.then(() => 'closed' as const),
    new Promise<'deadline'>((resolve) => {
      timer = setTimeout(() => resolve('deadline'), MANIFEST_CAPTURE_DEADLINE_MS);
    }),
  ]);
  clearTimeout(timer);
  stopped = true;
  if (outcome === 'closed' || captured.size === 0) return undefined;

  const manifests: Record<string, SdkMcpServerManifest> = {};
  for (const name of names) {
    const entry = captured.get(name);
    // Only a server still registered with the same bridge (not swapped by setMcpServers)
    if (!entry || controlHandler.getMcpServerBridge(name) !== entry.bridge) continue;
    // Its tools changed meanwhile: keep the handshake, let the CLI list tools itself
    manifests[name] = controlHandler.toolsChangedBeforeInitialize.has(name)
      ? { initializeResult: entry.manifest.initializeResult }
      : entry.manifest;
  }
  return Object.keys(manifests).length > 0 ? manifests : undefined;
}
