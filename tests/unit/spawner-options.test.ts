/**
 * Unit tests for process spawner options (stderr callback)
 *
 * Uses capture-cli mock — no API calls.
 */

import { describe, expect, test } from 'bun:test';
import { query } from '../../src/api/query.ts';

const CAPTURE_CLI = './src/tools/capture-cli.cjs';

describe('spawner options', () => {
  test('stderr callback wired up without breaking query', async () => {
    const stderrChunks: string[] = [];

    const messages = [];
    for await (const msg of query({
      prompt: 'test',
      options: {
        model: 'haiku',
        settingSources: [],
        pathToClaudeCodeExecutable: CAPTURE_CLI,
        permissionMode: 'default',
        maxTurns: 1,
        stderr: (data: string) => {
          stderrChunks.push(data);
        },
      },
    })) {
      messages.push(msg);
      if (msg.type === 'result') break;
    }

    // Query succeeds with stderr callback attached
    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
  });
});
