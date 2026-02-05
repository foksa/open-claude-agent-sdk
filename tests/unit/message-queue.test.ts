/**
 * Unit tests for MessageQueue class
 */

import { describe, expect, test } from 'bun:test';
import { MessageQueue } from '../../src/api/MessageQueue.ts';

describe('MessageQueue', () => {
  test('push and next returns items in order', async () => {
    const queue = new MessageQueue<string>();

    queue.push('first');
    queue.push('second');
    queue.push('third');

    const result1 = await queue.next();
    const result2 = await queue.next();
    const result3 = await queue.next();

    expect(result1).toEqual({ value: 'first', done: false });
    expect(result2).toEqual({ value: 'second', done: false });
    expect(result3).toEqual({ value: 'third', done: false });
  });

  test('next waits for push when queue is empty', async () => {
    const queue = new MessageQueue<string>();
    const results: string[] = [];

    // Start waiting for next
    const nextPromise = queue.next().then((r) => {
      results.push(r.value);
    });

    // Queue should be waiting
    expect(results).toEqual([]);

    // Push a value
    queue.push('delayed');

    // Now the promise should resolve
    await nextPromise;
    expect(results).toEqual(['delayed']);
  });

  test('complete marks queue as done', async () => {
    const queue = new MessageQueue<string>();

    queue.push('item');
    queue.complete();

    const result1 = await queue.next();
    const result2 = await queue.next();

    expect(result1).toEqual({ value: 'item', done: false });
    expect(result2.done).toBe(true);
  });

  test('complete with error propagates to consumers', async () => {
    const queue = new MessageQueue<string>();
    const error = new Error('test error');

    queue.complete(error);

    await expect(queue.next()).rejects.toThrow('test error');
  });

  test('complete resolves waiting consumers', async () => {
    const queue = new MessageQueue<string>();

    // Start waiting
    const nextPromise = queue.next();

    // Complete the queue
    queue.complete();

    const result = await nextPromise;
    expect(result.done).toBe(true);
  });

  test('complete with error rejects waiting consumers', async () => {
    const queue = new MessageQueue<string>();

    // Start waiting
    const nextPromise = queue.next();

    // Complete with error
    queue.complete(new Error('stream error'));

    await expect(nextPromise).rejects.toThrow('stream error');
  });

  test('push after complete is ignored', async () => {
    const queue = new MessageQueue<string>();

    queue.complete();
    queue.push('ignored');

    const result = await queue.next();
    expect(result.done).toBe(true);
  });

  test('isDone returns correct state', () => {
    const queue = new MessageQueue<string>();

    expect(queue.isDone()).toBe(false);

    queue.complete();

    expect(queue.isDone()).toBe(true);
  });

  test('getError returns error when set', () => {
    const queue = new MessageQueue<string>();
    const error = new Error('test');

    expect(queue.getError()).toBe(null);

    queue.complete(error);

    expect(queue.getError()).toBe(error);
  });

  test('multiple waiting consumers are resolved in order', async () => {
    const queue = new MessageQueue<number>();
    const results: number[] = [];

    // Start multiple waiters
    const p1 = queue.next().then((r) => results.push(r.value));
    const p2 = queue.next().then((r) => results.push(r.value));
    const p3 = queue.next().then((r) => results.push(r.value));

    // Push values
    queue.push(1);
    queue.push(2);
    queue.push(3);

    await Promise.all([p1, p2, p3]);

    expect(results).toEqual([1, 2, 3]);
  });

  test('works with complex types', async () => {
    type Message = { type: string; data: number };
    const queue = new MessageQueue<Message>();

    queue.push({ type: 'a', data: 1 });
    queue.push({ type: 'b', data: 2 });

    const r1 = await queue.next();
    const r2 = await queue.next();

    expect(r1.value).toEqual({ type: 'a', data: 1 });
    expect(r2.value).toEqual({ type: 'b', data: 2 });
  });
});
