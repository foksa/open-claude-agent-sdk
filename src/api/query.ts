/**
 * Main query implementation - spawns Claude CLI and streams messages
 *
 * Baby Step 5: Full bidirectional control protocol support
 * - Multi-turn conversations via streamInput()
 * - Runtime control methods (interrupt, setPermissionMode, etc.)
 * - Permission callbacks (canUseTool)
 * - Hook system support
 *
 * Reference: https://buildwithaws.substack.com/p/inside-the-claude-agent-sdk-from
 */

import type { Query, Options, SDKUserMessage } from '../types/index.ts';
import { QueryImpl } from './QueryImpl.ts';

/**
 * Main query function - returns Query interface with control methods
 *
 * Baby Step 5: Full bidirectional control protocol support
 *
 * Features:
 * - AsyncGenerator for streaming messages
 * - Control methods: interrupt(), setPermissionMode(), setModel(), etc.
 * - Multi-turn conversations via streamInput() OR AsyncIterable input
 * - Permission callbacks via options.canUseTool
 * - Hook callbacks via options.hooks
 *
 * Input modes:
 * - String: Simple one-shot or multi-turn via streamInput()
 * - AsyncIterable: Streaming input mode (recommended for complex flows)
 *
 * @param params Query parameters (prompt and options)
 * @returns Query interface (AsyncGenerator + control methods)
 */
export function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query {
  return new QueryImpl(params);
}
