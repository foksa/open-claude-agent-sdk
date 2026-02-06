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

import type { LiteQuery, Options, SDKUserMessage } from '../types/index.ts';
import { QueryImpl } from './QueryImpl.ts';

/**
 * Main query function - returns LiteQuery interface with control methods
 *
 * Features:
 * - AsyncGenerator for streaming messages
 * - Control methods: interrupt(), setPermissionMode(), setModel(), etc.
 * - Multi-turn conversations via streamInput() OR AsyncIterable input
 * - Permission callbacks via options.canUseTool
 * - Hook callbacks via options.hooks
 * - Lite SDK extensions: availableOutputStyles(), currentOutputStyle()
 *
 * Input modes:
 * - String: Simple one-shot or multi-turn via streamInput()
 * - AsyncIterable: Streaming input mode (recommended for complex flows)
 *
 * @param params Query parameters (prompt and options)
 * @returns LiteQuery interface (Query + extra convenience methods)
 */
export function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): LiteQuery {
  return new QueryImpl(params) as LiteQuery;
}
