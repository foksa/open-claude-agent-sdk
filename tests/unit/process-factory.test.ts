/**
 * Unit tests for ProcessFactory
 */

import { describe, expect, test } from 'bun:test';
import type { ChildProcess } from 'node:child_process';
import {
  DefaultProcessFactory,
  type ProcessFactory,
} from '../../src/api/ProcessFactory.ts';

describe('ProcessFactory interface', () => {
  test('can create mock implementation', () => {
    const mockProcess = {
      stdin: null,
      stdout: null,
      stderr: null,
      pid: 12345,
      kill: () => true,
    } as unknown as ChildProcess;

    const mockFactory: ProcessFactory = {
      spawn: () => mockProcess,
    };

    const result = mockFactory.spawn({});
    expect(result).toBe(mockProcess);
    expect(result.pid).toBe(12345);
  });
});

describe('DefaultProcessFactory', () => {
  test('throws when CLI not found', () => {
    const factory = new DefaultProcessFactory();

    // Set invalid path to trigger detection failure
    const originalEnv = process.env.CLAUDE_BINARY;
    process.env.CLAUDE_BINARY = '/nonexistent/path/to/claude';

    try {
      expect(() => factory.spawn({})).toThrow('Claude CLI path does not exist');
    } finally {
      if (originalEnv) {
        process.env.CLAUDE_BINARY = originalEnv;
      } else {
        delete process.env.CLAUDE_BINARY;
      }
    }
  });

  test('uses pathToClaudeCodeExecutable option', () => {
    const factory = new DefaultProcessFactory();

    expect(() =>
      factory.spawn({
        pathToClaudeCodeExecutable: '/nonexistent/custom/path',
      })
    ).toThrow('Claude CLI path does not exist');
  });
});
