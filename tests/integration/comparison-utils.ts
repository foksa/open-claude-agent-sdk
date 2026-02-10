/**
 * Utilities for running comparison tests between our SDK and official SDK
 */

import { describe, test } from 'bun:test';
import path from 'node:path';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import type { Options, SDKMessage } from '../../src/types/index.ts';

export type SDKType = 'open' | 'official';

// Absolute path to embedded CLI - needed when tests use custom cwd
const CLI_PATH = path.resolve('./node_modules/@anthropic-ai/claude-agent-sdk/cli.js');

// ============================================================================
// Test Wrapper Utilities
// ============================================================================

/**
 * Run the same test with both open and official SDKs concurrently
 */
export const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe(name, () => {
    test.concurrent(`[open] ${name}`, () => testFn('open'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

/**
 * Mark tests as todo for both SDKs (unimplemented features)
 */
export const testWithBothSDKsTodo = (name: string, _testFn?: (sdk: SDKType) => Promise<void>) => {
  describe(name, () => {
    test.todo(`[open] ${name}`);
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
  const openMessages: SDKMessage[] = [];
  const officialMessages: SDKMessage[] = [];

  // Run with open SDK
  const openStart = Date.now();
  for await (const msg of openQuery({ prompt, options })) {
    openMessages.push(msg);
    if (callback) await callback('open', msg);
    if (msg.type === 'result') break;
  }
  const openDuration = Date.now() - openStart;

  // Run with official SDK
  const officialStart = Date.now();
  for await (const msg of officialQuery({ prompt, options })) {
    officialMessages.push(msg);
    if (callback) await callback('official', msg);
    if (msg.type === 'result') break;
  }
  const officialDuration = Date.now() - officialStart;

  return {
    open: { messages: openMessages, duration: openDuration },
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
  const queryFn = sdk === 'open' ? openQuery : officialQuery;

  // Use Haiku by default for tests unless model is explicitly specified
  // Use empty settingSources for isolation (matches official SDK default)
  // Use embedded CLI from official SDK to ensure identical behavior
  // Note: CLI_PATH must be absolute for tests that use custom cwd
  const testOptions: Options = {
    model: 'haiku',
    settingSources: [], // No filesystem settings - faster & cheaper
    pathToClaudeCodeExecutable: CLI_PATH,
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
  openMessages: SDKMessage[],
  officialMessages: SDKMessage[]
) {
  const getMessageTypes = (msgs: SDKMessage[]) => msgs.map((m) => m.type);

  return {
    openTypes: getMessageTypes(openMessages),
    officialTypes: getMessageTypes(officialMessages),
    openCount: openMessages.length,
    officialCount: officialMessages.length,
    bothHaveResult:
      openMessages.some((m) => m.type === 'result') &&
      officialMessages.some((m) => m.type === 'result'),
    bothHaveSystem:
      openMessages.some((m) => m.type === 'system') &&
      officialMessages.some((m) => m.type === 'system'),
  };
}
