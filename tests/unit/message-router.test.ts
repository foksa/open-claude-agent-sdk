/**
 * Unit tests for MessageRouter class
 */

import { describe, expect, test } from 'bun:test';
import { Readable, Writable } from 'node:stream';
import { MessageRouter } from '../../src/api/MessageRouter.ts';
import { ControlProtocolHandler } from '../../src/core/control.ts';
import type { SDKMessage } from '../../src/types/index.ts';

// Helper to create a readable stream from lines
function createReadableFromLines(lines: string[]): Readable {
  let index = 0;
  return new Readable({
    read() {
      if (index < lines.length) {
        this.push(lines[index++] + '\n');
      } else {
        this.push(null);
      }
    },
  });
}

// Helper to create a mock writable stream
function createMockWritable(): Writable {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}

describe('MessageRouter', () => {
  test('routes regular messages to onMessage callback', async () => {
    const messages: SDKMessage[] = [];
    const stdout = createReadableFromLines([
      JSON.stringify({ type: 'system', message: 'Hello' }),
      JSON.stringify({ type: 'assistant', message: 'World' }),
    ]);

    const controlHandler = new ControlProtocolHandler(createMockWritable(), {});
    const router = new MessageRouter(
      stdout,
      controlHandler,
      (msg) => messages.push(msg),
      () => {}
    );

    await router.startReading();

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('system');
    expect(messages[1].type).toBe('assistant');
  });

  test('calls onDone when stream ends', async () => {
    let doneCalled = false;
    const stdout = createReadableFromLines([]);

    const controlHandler = new ControlProtocolHandler(createMockWritable(), {});
    const router = new MessageRouter(
      stdout,
      controlHandler,
      () => {},
      () => {
        doneCalled = true;
      }
    );

    await router.startReading();

    expect(doneCalled).toBe(true);
  });

  test('filters out control_response messages', async () => {
    const messages: SDKMessage[] = [];
    const stdout = createReadableFromLines([
      JSON.stringify({ type: 'system', message: 'First' }),
      JSON.stringify({ type: 'control_response', response: {} }),
      JSON.stringify({ type: 'assistant', message: 'Second' }),
    ]);

    const controlHandler = new ControlProtocolHandler(createMockWritable(), {});
    const router = new MessageRouter(
      stdout,
      controlHandler,
      (msg) => messages.push(msg),
      () => {}
    );

    await router.startReading();

    expect(messages).toHaveLength(2);
    expect(messages[0].type).toBe('system');
    expect(messages[1].type).toBe('assistant');
  });

  test('skips empty lines', async () => {
    const messages: SDKMessage[] = [];
    const stdout = createReadableFromLines([
      '',
      JSON.stringify({ type: 'system', message: 'Hello' }),
      '   ',
      JSON.stringify({ type: 'assistant', message: 'World' }),
      '',
    ]);

    const controlHandler = new ControlProtocolHandler(createMockWritable(), {});
    const router = new MessageRouter(
      stdout,
      controlHandler,
      (msg) => messages.push(msg),
      () => {}
    );

    await router.startReading();

    expect(messages).toHaveLength(2);
  });

  test('handles parse errors gracefully', async () => {
    const messages: SDKMessage[] = [];
    const stdout = createReadableFromLines([
      'invalid json',
      JSON.stringify({ type: 'system', message: 'Valid' }),
    ]);

    const controlHandler = new ControlProtocolHandler(createMockWritable(), {});
    const router = new MessageRouter(
      stdout,
      controlHandler,
      (msg) => messages.push(msg),
      () => {}
    );

    // Should not throw - just logs error
    await router.startReading();

    // Should still get the valid message
    expect(messages).toHaveLength(1);
    expect(messages[0].type).toBe('system');
  });

  test('close stops the readline interface', async () => {
    const stdout = createReadableFromLines([JSON.stringify({ type: 'system', message: 'Hello' })]);

    const controlHandler = new ControlProtocolHandler(createMockWritable(), {});
    const router = new MessageRouter(
      stdout,
      controlHandler,
      () => {},
      () => {}
    );

    // Start reading (async)
    const readPromise = router.startReading();

    // Close immediately
    router.close();

    // Should complete without error
    await readPromise;
  });
});
