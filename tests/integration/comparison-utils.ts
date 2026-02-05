/**
 * Utilities for running comparison tests between our SDK and official SDK
 */

import { describe, test } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';
import type { Options, SDKMessage } from '../../src/types/index.ts';

export type SDKType = 'lite' | 'official';

// ============================================================================
// Test Wrapper Utilities
// ============================================================================

/**
 * Run the same test with both lite and official SDKs concurrently
 */
export const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

/**
 * Mark tests as todo for both SDKs (unimplemented features)
 */
export const testWithBothSDKsTodo = (name: string, _testFn?: (sdk: SDKType) => Promise<void>) => {
  describe(name, () => {
    test.todo(`[lite] ${name}`);
    test.todo(`[official] ${name}`);
  });
};

// ============================================================================
// Query Execution Utilities
// ============================================================================

/**
 * Run the same query with both SDKs and collect messages
 */
export async function runWithBothSDKs(
  prompt: string,
  options: Options,
  callback?: (sdk: SDKType, msg: SDKMessage) => void | Promise<void>
) {
  const liteMessages: SDKMessage[] = [];
  const officialMessages: SDKMessage[] = [];

  // Run with lite SDK
  const liteStart = Date.now();
  for await (const msg of liteQuery({ prompt, options })) {
    liteMessages.push(msg);
    if (callback) await callback('lite', msg);
    if (msg.type === 'result') break;
  }
  const liteDuration = Date.now() - liteStart;

  // Run with official SDK
  const officialStart = Date.now();
  for await (const msg of officialQuery({ prompt, options })) {
    officialMessages.push(msg);
    if (callback) await callback('official', msg);
    if (msg.type === 'result') break;
  }
  const officialDuration = Date.now() - officialStart;

  return {
    lite: { messages: liteMessages, duration: liteDuration },
    official: { messages: officialMessages, duration: officialDuration },
  };
}

/**
 * Run query with specific SDK
 */
export async function runWithSDK(
  sdk: SDKType,
  prompt: string,
  options: Options,
  callback?: (msg: SDKMessage) => void | Promise<void>
): Promise<SDKMessage[]> {
  const messages: SDKMessage[] = [];
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

  // Use Haiku by default for tests unless model is explicitly specified
  // Use empty settingSources for isolation (matches official SDK default)
  // Use embedded CLI from official SDK to ensure identical behavior
  const testOptions: Options = {
    model: 'haiku',
    settingSources: [], // No filesystem settings - faster & cheaper
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    ...options,
  };

  for await (const msg of queryFn({ prompt, options: testOptions })) {
    messages.push(msg);
    if (callback) await callback(msg);
    if (msg.type === 'result') break;
  }

  return messages;
}

/**
 * Compare message structures (ignoring content differences)
 */
export function compareMessageStructures(
  liteMessages: SDKMessage[],
  officialMessages: SDKMessage[]
) {
  const getMessageTypes = (msgs: SDKMessage[]) => msgs.map((m) => m.type);

  return {
    liteTypes: getMessageTypes(liteMessages),
    officialTypes: getMessageTypes(officialMessages),
    liteCount: liteMessages.length,
    officialCount: officialMessages.length,
    bothHaveResult:
      liteMessages.some((m) => m.type === 'result') &&
      officialMessages.some((m) => m.type === 'result'),
    bothHaveSystem:
      liteMessages.some((m) => m.type === 'system') &&
      officialMessages.some((m) => m.type === 'system'),
  };
}
