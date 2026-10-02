/**
 * Control protocol initialization
 *
 * Builds and sends the init message to CLI, handling systemPrompt
 * resolution and initial user prompt construction.
 *
 * @internal
 */

import type { ControlProtocolHandler } from '../core/control.ts';
import { buildHookConfig } from '../core/hookConfig.ts';
import type { InitWriteGate } from '../core/stdinGate.ts';
import type { InitializeRequest, SdkMcpServerManifest } from '../types/control.ts';
import { MessageType, RequestSubtype } from '../types/control.ts';
import type { Options, SDKUserMessage } from '../types/index.ts';
import type { ControlRequestManager } from './ControlRequestManager.ts';

/**
 * Build `sdkMcpServerConfigs` — per-server `{ timeout }` entries for SDK
 * (in-process) MCP servers that declared a timeout via `createSdkMcpServer`.
 * Only servers with a defined timeout are included (matches official SDK).
 */
function buildSdkMcpServerConfigs(
  options: Options
): Record<string, { timeout?: number }> | undefined {
  if (!options.mcpServers) return undefined;
  const entries = Object.entries(options.mcpServers).flatMap(([name, config]) =>
    'instance' in config && config.timeout !== undefined
      ? [[name, { timeout: config.timeout }] as const]
      : []
  );
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Build the `initialize` control request body.
 *
 * Resolves systemPrompt according to official SDK behavior (v0.2.110+):
 * - undefined → systemPrompt: [""] (minimal prompt wrapped in array)
 * - string → systemPrompt: ["..."] (custom prompt wrapped in array)
 * - string[] → systemPrompt: [...] (array passed through)
 * - { type: 'preset', preset: 'claude_code' } → neither field (use preset)
 * - { type: 'preset', preset: 'claude_code', append: '...' } → appendSystemPrompt: "..."
 * - { type: 'custom', prompt: '...' | [...] } → systemPrompt: "..." | [...]
 * - `snapshot` (custom or preset, v0.3.267) → systemPromptSnapshot: boolean
 *
 * Shared by the initial handshake and `Query.reinitialize()`, which resends
 * this same request shape with a fresh request_id.
 */
export function buildInitRequest(
  options: Options,
  sdkMcpServerNames: string[],
  controlHandler: ControlProtocolHandler,
  sdkMcpServerManifests?: Record<string, SdkMcpServerManifest>
): InitializeRequest {
  let systemPrompt: string[] | undefined;
  let appendSystemPrompt: string | undefined;
  let systemPromptSnapshot: boolean | undefined;

  let excludeDynamicSections: boolean | undefined;

  if (options.systemPrompt === undefined) {
    // v0.2.110: empty string wrapped in array
    systemPrompt = [''];
  } else if (typeof options.systemPrompt === 'string') {
    // v0.2.110: string wrapped in array
    systemPrompt = [options.systemPrompt];
  } else if (Array.isArray(options.systemPrompt)) {
    // Array of strings for cache boundary support - pass through directly
    systemPrompt = options.systemPrompt;
  } else if (options.systemPrompt.type === 'custom') {
    systemPrompt = Array.isArray(options.systemPrompt.prompt)
      ? options.systemPrompt.prompt
      : [options.systemPrompt.prompt];
    systemPromptSnapshot = options.systemPrompt.snapshot;
  } else if (options.systemPrompt.type === 'preset') {
    if (options.systemPrompt.append) {
      appendSystemPrompt = options.systemPrompt.append;
    }
    if (options.systemPrompt.excludeDynamicSections) {
      excludeDynamicSections = true;
    }
    systemPromptSnapshot = options.systemPrompt.snapshot;
  }

  const sdkMcpServerConfigs = buildSdkMcpServerConfigs(options);

  const request: InitializeRequest = {
    subtype: RequestSubtype.INITIALIZE,
    ...(systemPrompt !== undefined && { systemPrompt }),
    ...(appendSystemPrompt !== undefined && { appendSystemPrompt }),
    ...(systemPromptSnapshot !== undefined && { systemPromptSnapshot }),
    ...(excludeDynamicSections !== undefined && { excludeDynamicSections }),
    ...(sdkMcpServerNames.length > 0 && { sdkMcpServers: sdkMcpServerNames }),
    ...(sdkMcpServerConfigs && { sdkMcpServerConfigs }),
    ...(sdkMcpServerManifests && { sdkMcpServerManifests }),
    ...(options.outputFormat?.type === 'json_schema' && {
      jsonSchema: options.outputFormat.schema as Record<string, unknown>,
    }),
    ...(options.planModeInstructions !== undefined && {
      planModeInstructions: options.planModeInstructions,
    }),
    ...(options.toolAliases !== undefined && { toolAliases: options.toolAliases }),
    ...(options.agents && { agents: options.agents }),
    ...(options.promptSuggestions !== undefined && {
      promptSuggestions: options.promptSuggestions,
    }),
    ...(options.agentProgressSummaries !== undefined && {
      agentProgressSummaries: options.agentProgressSummaries,
    }),
    ...(options.title !== undefined && { title: options.title }),
    ...(Array.isArray(options.skills) && { skills: options.skills }),
    ...(options.forwardSubagentText !== undefined && {
      forwardSubagentText: options.forwardSubagentText,
    }),
    ...(options.supportedDialogKinds !== undefined && {
      supportedDialogKinds: options.supportedDialogKinds,
    }),
    ...(options.perTaskStopAffordance !== undefined && {
      perTaskStopAffordance: options.perTaskStopAffordance,
    }),
    ...(options.pluginDelivery === 'initialize' &&
      options.plugins &&
      options.plugins.length > 0 && {
        plugins: options.plugins,
      }),
  };

  if (options.hooks) {
    request.hooks = buildHookConfig(options.hooks, controlHandler);
  }

  return request;
}

/**
 * Send the control protocol init message to CLI.
 *
 * @returns The request ID used for the init message
 */
export function sendProtocolInit(
  manager: ControlRequestManager,
  options: Options,
  sdkMcpServerNames: string[],
  controlHandler: ControlProtocolHandler,
  init?: { gate?: InitWriteGate; manifests?: Record<string, SdkMcpServerManifest> }
): string {
  const requestId = `init_${Date.now()}`;
  manager.initRequestId = requestId;

  const request = buildInitRequest(options, sdkMcpServerNames, controlHandler, init?.manifests);

  const message = {
    type: MessageType.CONTROL_REQUEST,
    request_id: requestId,
    request,
  };

  if (process.env.DEBUG_HOOKS) {
    console.error('[DEBUG] Sending control protocol init:', JSON.stringify(message, null, 2));
  }

  // Through a held gate, initialize goes out first and releases what queued behind it
  if (init?.gate && !init.gate.released) init.gate.release(`${JSON.stringify(message)}\n`);
  else manager.writeToStdin(message);
  controlHandler.initializeWritten = true;
  return requestId;
}

/**
 * Send the initial user prompt message to CLI stdin.
 *
 * With `verbatimPrompts` the message is marked `client_composed`, so the CLI
 * delivers it as written (no `@path` expansion or slash-command dispatch).
 */
export function sendInitialPrompt(
  manager: ControlRequestManager,
  prompt: string,
  verbatimPrompts?: boolean
): void {
  const initialMessage: SDKUserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: prompt }],
    },
    session_id: '',
    parent_tool_use_id: null,
    ...(verbatimPrompts && { client_composed: true as const }),
  };

  manager.writeToStdin(initialMessage);
}
