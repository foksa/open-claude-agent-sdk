/**
 * Integration tests for QueryImpl AsyncGenerator methods
 *
 * Tests the throw() and return() methods for proper AsyncGenerator compliance.
 * These tests spawn real Claude CLI processes.
 */

import { describe, expect, test } from 'bun:test';

describe('QueryImpl AsyncGenerator compliance', () => {
  test('return() closes the query and returns done', async () => {
    const { query } = await import('../../src/api/query.ts');

    const q = query({
      prompt: 'Count from 1 to 100 slowly',
      options: {
        maxTurns: 10,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        model: 'haiku',
        settingSources: [],
      },
    });

    const iter = q[Symbol.asyncIterator]();

    // Get at least one message
    const first = await iter.next();
    expect(first.done).toBe(false);

    // Call return() to close early
    const result = await iter.return?.();

    expect(result?.done).toBe(true);
    expect(result?.value).toBeUndefined();

    // Subsequent calls should also return done
    const afterReturn = await iter.next();
    expect(afterReturn.done).toBe(true);
  });

  test('throw() closes query and propagates error', async () => {
    const { query } = await import('../../src/api/query.ts');

    const q = query({
      prompt: 'Say hello',
      options: {
        maxTurns: 1,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        model: 'haiku',
        settingSources: [],
      },
    });

    const iter = q[Symbol.asyncIterator]();

    // Get at least one message
    await iter.next();

    // Call throw() should propagate the error
    const testError = new Error('Test error');
    await expect(iter.throw?.(testError)).rejects.toThrow('Test error');

    // Query should be closed after throw
    const afterThrow = await iter.next();
    expect(afterThrow.done).toBe(true);
  });

  test('close() is idempotent - can be called multiple times safely', async () => {
    const { query } = await import('../../src/api/query.ts');

    const q = query({
      prompt: 'Say hello',
      options: {
        maxTurns: 1,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        model: 'haiku',
        settingSources: [],
      },
    });

    // Get iterator and start
    const iter = q[Symbol.asyncIterator]();
    await iter.next();

    // Multiple close/return calls should not throw
    await iter.return?.();
    await iter.return?.();
    await iter.return?.();

    const result = await iter.next();
    expect(result.done).toBe(true);
  });

  test('Symbol.asyncDispose closes the query', async () => {
    const { query } = await import('../../src/api/query.ts');

    const q = query({
      prompt: 'Say hello',
      options: {
        maxTurns: 1,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        model: 'haiku',
        settingSources: [],
      },
    });

    const iter = q[Symbol.asyncIterator]();
    await iter.next();

    // Call asyncDispose (the underlying method for await using syntax)
    await q[Symbol.asyncDispose]();

    const result = await iter.next();
    expect(result.done).toBe(true);
  });
});
