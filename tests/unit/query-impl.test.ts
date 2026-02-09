/**
 * Unit tests for QueryImpl AsyncGenerator methods
 *
 * Tests return(), throw(), close(), and Symbol.asyncDispose for proper
 * AsyncGenerator compliance. Uses capture-cli mock — no API calls.
 */

import { describe, expect, test } from 'bun:test';
import { query } from '../../src/api/query.ts';
import type { SDKMessage } from '../../src/types/index.ts';

const CAPTURE_CLI = './src/tools/capture-cli.cjs';

const opts = {
  model: 'haiku' as const,
  settingSources: [] as string[],
  pathToClaudeCodeExecutable: CAPTURE_CLI,
  permissionMode: 'default' as const,
};

/** Run query to completion, return the query object for post-completion testing */
async function completeQuery() {
  const q = query({ prompt: 'test', options: { ...opts, maxTurns: 1 } });
  const messages: SDKMessage[] = [];

  for await (const msg of q) {
    messages.push(msg);
    if (msg.type === 'result') break;
  }

  return { q, messages };
}

describe('QueryImpl AsyncGenerator compliance', () => {
  test('return() after completion returns done', async () => {
    const { q } = await completeQuery();
    const iter = q[Symbol.asyncIterator]();

    // After query is done, return() should work cleanly
    const result = await iter.return?.();
    expect(result?.done).toBe(true);

    const afterReturn = await iter.next();
    expect(afterReturn.done).toBe(true);
  });

  test('throw() after completion rejects with error', async () => {
    const { q } = await completeQuery();
    const iter = q[Symbol.asyncIterator]();

    const testError = new Error('Test error');
    await expect(iter.throw?.(testError)).rejects.toThrow('Test error');

    const afterThrow = await iter.next();
    expect(afterThrow.done).toBe(true);
  });

  test('return() is idempotent - can be called multiple times safely', async () => {
    const { q } = await completeQuery();
    const iter = q[Symbol.asyncIterator]();

    await iter.return?.();
    await iter.return?.();
    await iter.return?.();

    const result = await iter.next();
    expect(result.done).toBe(true);
  });

  test('Symbol.asyncDispose closes the query', async () => {
    const { q } = await completeQuery();

    expect(typeof q[Symbol.asyncDispose]).toBe('function');
    await q[Symbol.asyncDispose]();

    const iter = q[Symbol.asyncIterator]();
    const result = await iter.next();
    expect(result.done).toBe(true);
  });
});
