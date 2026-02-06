/**
 * Main query implementation - spawns Claude CLI and streams messages
 *
 * Reference: https://buildwithaws.substack.com/p/inside-the-claude-agent-sdk-from
 */

import type { Options, Query, SDKUserMessage } from '../types/index.ts';
import { QueryImpl } from './QueryImpl.ts';

/**
 * Main query function - returns Query interface with control methods
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
 * Tip: Cast to LiteQuery to access extra convenience methods:
 *   const q = query({ prompt: '...' }) as LiteQuery;
 *   const styles = await q.availableOutputStyles();
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
