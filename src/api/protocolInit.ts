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
import { MessageType, RequestSubtype } from '../types/control.ts';
import type { Options, SDKUserMessage } from '../types/index.ts';
import type { ControlRequestManager } from './ControlRequestManager.ts';

/**
 * Send the control protocol init message to CLI.
 *
 * Resolves systemPrompt according to official SDK behavior (v0.2.110+):
 * - undefined → systemPrompt: [""] (minimal prompt wrapped in array)
 * - string → systemPrompt: ["..."] (custom prompt wrapped in array)
 * - string[] → systemPrompt: [...] (array passed through)
 * - { type: 'preset', preset: 'claude_code' } → neither field (use preset)
 * - { type: 'preset', preset: 'claude_code', append: '...' } → appendSystemPrompt: "..."
 *
 * @returns The request ID used for the init message
 */
export function sendProtocolInit(
  manager: ControlRequestManager,
  options: Options,
  sdkMcpServerNames: string[],
  controlHandler: ControlProtocolHandler
): string {
  const requestId = `init_${Date.now()}`;
  manager.initRequestId = requestId;

  let systemPrompt: string[] | undefined;
  let appendSystemPrompt: string | undefined;

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
  } else if (options.systemPrompt.type === 'preset') {
    if (options.systemPrompt.append) {
      appendSystemPrompt = options.systemPrompt.append;
    }
    if (options.systemPrompt.excludeDynamicSections) {
      excludeDynamicSections = true;
    }
  }

  const request: {
    subtype: typeof RequestSubtype.INITIALIZE;
    systemPrompt?: string[];
    appendSystemPrompt?: string;
    sdkMcpServers?: string[];
    agents?: Record<string, unknown>;
    hooks?: ReturnType<typeof buildHookConfig>;
    excludeDynamicSections?: boolean;
    promptSuggestions?: boolean;
    agentProgressSummaries?: boolean;
  } = {
    subtype: RequestSubtype.INITIALIZE,
    ...(systemPrompt !== undefined && { systemPrompt }),
    ...(appendSystemPrompt !== undefined && { appendSystemPrompt }),
    ...(excludeDynamicSections !== undefined && { excludeDynamicSections }),
    ...(sdkMcpServerNames.length > 0 && { sdkMcpServers: sdkMcpServerNames }),
    ...(options.agents && { agents: options.agents }),
    ...(options.promptSuggestions !== undefined && {
      promptSuggestions: options.promptSuggestions,
    }),
    ...(options.agentProgressSummaries !== undefined && {
      agentProgressSummaries: options.agentProgressSummaries,
    }),
  };

  if (options.hooks) {
    request.hooks = buildHookConfig(options.hooks, controlHandler);
  }

  const init = {
    type: MessageType.CONTROL_REQUEST,
    request_id: requestId,
    request,
  };

  if (process.env.DEBUG_HOOKS) {
    console.error('[DEBUG] Sending control protocol init:', JSON.stringify(init, null, 2));
  }

  manager.writeToStdin(init);
  return requestId;
}

/**
 * Send the initial user prompt message to CLI stdin.
 */
export function sendInitialPrompt(manager: ControlRequestManager, prompt: string): void {
  const initialMessage: SDKUserMessage = {
    type: 'user',
    message: {
      role: 'user',
      content: [{ type: 'text', text: prompt }],
    },
    session_id: '',
    parent_tool_use_id: null,
  };

  manager.writeToStdin(initialMessage);
}
