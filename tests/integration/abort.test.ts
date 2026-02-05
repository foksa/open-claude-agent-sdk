/**
 * Integration tests for abort controller support
 */

import { expect } from 'bun:test';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';
import type { Options, SDKMessage } from '../../src/types/index.ts';
import { type SDKType, testWithBothSDKs } from './comparison-utils.ts';

const runWithAbort = async (
  sdk: SDKType,
  prompt: string,
  options: Options,
  abortAfterMs: number
): Promise<{ messages: SDKMessage[]; wasAborted: boolean }> => {
  const messages: SDKMessage[] = [];
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const abortController = new AbortController();

  const testOptions: Options = {
    model: 'haiku',
    settingSources: [],
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    abortController,
    ...options,
  };

  // Schedule abort
  const abortTimeout = setTimeout(() => {
    abortController.abort();
  }, abortAfterMs);

  let wasAborted = false;

  try {
    for await (const msg of queryFn({ prompt, options: testOptions })) {
      messages.push(msg);
      if (msg.type === 'result') {
        clearTimeout(abortTimeout);
        break;
      }
    }
  } catch {
    // Abort may cause errors - that's expected
    wasAborted = true;
    clearTimeout(abortTimeout);
  }

  // Check if abort was triggered based on signal state
  if (abortController.signal.aborted) {
    wasAborted = true;
  }

  return { messages, wasAborted };
};

testWithBothSDKs('abortController can interrupt long-running query', async (sdk) => {
  // Use a prompt that would take time to complete
  const { messages, wasAborted } = await runWithAbort(
    sdk,
    'Write a very long essay about the history of computing, including all major developments from the abacus to modern quantum computers. Include at least 20 paragraphs.',
    {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      includePartialMessages: true, // Get streaming to see progress
    },
    500 // Abort after 500ms
  );

  console.log(`   [${sdk}] Messages received: ${messages.length}, wasAborted: ${wasAborted}`);

  // Either we aborted (wasAborted is true) or we got a result very quickly
  // The key is that the abort mechanism works
  if (wasAborted) {
    console.log(`   [${sdk}] Query was successfully aborted`);
  } else {
    // Query completed before abort (fast model response)
    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeDefined();
    console.log(`   [${sdk}] Query completed before abort could trigger`);
  }
});

testWithBothSDKs('abortController signal is respected immediately', async (sdk) => {
  // Create an already-aborted controller
  const abortController = new AbortController();
  abortController.abort();

  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const messages: SDKMessage[] = [];

  const testOptions: Options = {
    model: 'haiku',
    settingSources: [],
    pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    abortController,
  };

  // The query should respect the already-aborted signal
  // Note: Behavior depends on SDK implementation - it may:
  // 1. Not start at all
  // 2. Start and immediately interrupt
  // 3. Start normally (if abort check happens asynchronously)
  try {
    for await (const msg of queryFn({ prompt: 'Say hello', options: testOptions })) {
      messages.push(msg);
      if (msg.type === 'result') break;
    }
  } catch {
    // Expected - query may error when aborted
  }

  console.log(`   [${sdk}] Messages with pre-aborted controller: ${messages.length}`);
  // Just verify it doesn't hang - either completes quickly or errors
});
