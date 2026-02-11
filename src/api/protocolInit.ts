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
 * Resolves systemPrompt according to official SDK behavior:
 * - undefined → systemPrompt: "" (minimal prompt, saves tokens)
 * - string → systemPrompt: "..." (custom full prompt)
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

  let systemPrompt: string | undefined;
  let appendSystemPrompt: string | undefined;

  if (options.systemPrompt === undefined) {
    systemPrompt = '';
  } else if (typeof options.systemPrompt === 'string') {
    systemPrompt = options.systemPrompt;
  } else if (options.systemPrompt.type === 'preset' && options.systemPrompt.append) {
    appendSystemPrompt = options.systemPrompt.append;
  }

  const request: {
    subtype: typeof RequestSubtype.INITIALIZE;
    systemPrompt?: string;
    appendSystemPrompt?: string;
    sdkMcpServers?: string[];
    agents?: Record<string, unknown>;
    hooks?: ReturnType<typeof buildHookConfig>;
  } = {
    subtype: RequestSubtype.INITIALIZE,
    ...(systemPrompt !== undefined && { systemPrompt }),
    ...(appendSystemPrompt !== undefined && { appendSystemPrompt }),
    ...(sdkMcpServerNames.length > 0 && { sdkMcpServers: sdkMcpServerNames }),
    ...(options.agents && { agents: options.agents }),
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
