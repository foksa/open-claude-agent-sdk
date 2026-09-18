/**
 * Integration tests for error handling
 *
 * These tests use fake CLI scripts — no API calls, zero cost.
 * Tests error handling paths in query(), ProcessFactory, and QueryImpl.
 */

import { describe, expect, test } from 'bun:test';
import { unlinkSync, writeFileSync } from 'node:fs';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query } from '../../src/api/query.ts';
import type { SDKMessage } from '../../src/types/index.ts';

// NOTE: These tests use fake bash scripts as CLI — no API calls, zero cost.

/**
 * Create a temporary executable script, returning its path.
 * Caller is responsible for cleanup.
 */
function createTempScript(content: string): string {
  const path = `/tmp/fake-cli-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`;
  writeFileSync(path, `#!/bin/bash\n${content}`, { mode: 0o755 });
  return path;
}

describe('error handling', () => {
  test(
    'nonexistent CLI binary throws before iteration',
    async () => {
      let threwError = false;

      try {
        for await (const msg of query({
          prompt: 'test',
          options: {
            pathToClaudeCodeExecutable: '/nonexistent/path/to/claude',
            permissionMode: 'default',
            settingSources: [],
          },
        })) {
          if (msg.type === 'result') break;
        }
      } catch (err) {
        threwError = true;
        expect(err).toBeInstanceOf(Error);
        expect((err as Error).message).toContain('does not exist');
      }

      expect(threwError).toBe(true);
      console.log('   Nonexistent CLI binary correctly throws before iteration');
    },
    { timeout: 15000 }
  );

  /** Run a fake CLI through both SDKs; returns yielded message types and the thrown error. */
  async function runBoth(scriptBody: string) {
    const script = createTempScript(scriptBody);
    try {
      const results = [];
      for (const [name, q] of [
        ['open', query],
        ['official', officialQuery],
      ] as const) {
        const types: string[] = [];
        let error: string | undefined;
        try {
          for await (const msg of q({
            prompt: 'test',
            options: { pathToClaudeCodeExecutable: script, settingSources: [] },
          })) {
            types.push(msg.type);
          }
        } catch (err) {
          error = (err as Error).message;
        }
        results.push({ name, types, error });
      }
      return { open: results[0], official: results[1] };
    } finally {
      unlinkSync(script);
    }
  }

  test(
    'CLI exits non-zero after partial output: messages, then exit error (matches official)',
    async () => {
      const { open, official } = await runBoth(`
echo '{"type":"system","subtype":"init","session_id":"test","tools":[],"mcp_servers":[]}'
exit 1
`);
      expect(open.types).toEqual(['system']);
      expect(open.error).toBe('Claude Code process exited with code 1');
      expect({ types: open.types, error: open.error }).toEqual({
        types: official.types,
        error: official.error,
      });
    },
    { timeout: 15000 }
  );

  test(
    'error result before exit is reported instead of the exit code (matches official)',
    async () => {
      const { open, official } = await runBoth(`
echo '{"type":"system","subtype":"init","session_id":"e","tools":[],"mcp_servers":[]}'
echo '{"type":"result","subtype":"error_during_execution","is_error":true,"errors":["  Invalid API key  ","","Org blocked"],"session_id":"e","duration_ms":0,"duration_api_ms":0,"num_turns":0,"total_cost_usd":0,"usage":{}}'
exit 1
`);
      expect(open.error).toBe('Claude Code returned an error result: Invalid API key; Org blocked');
      expect({ types: open.types, error: open.error }).toEqual({
        types: official.types,
        error: official.error,
      });
    },
    { timeout: 15000 }
  );

  test(
    'CLI that writes no output completes generator without hanging',
    async () => {
      // Script exits immediately with no output — tests that query
      // doesn't hang waiting for messages that will never come.
      const script = createTempScript('exit 0');

      try {
        const messages: SDKMessage[] = [];

        for await (const msg of query({
          prompt: 'test',
          options: {
            pathToClaudeCodeExecutable: script,
            permissionMode: 'default',
            settingSources: [],
          },
        })) {
          messages.push(msg);
          if (msg.type === 'result') break;
        }

        // Generator should complete without yielding anything
        expect(messages.length).toBe(0);
        console.log('   Empty CLI output: generator completed without hanging');
      } finally {
        unlinkSync(script);
      }
    },
    { timeout: 15000 }
  );

  test(
    'CLI killed mid-stream yields partial messages then a signal error (matches official)',
    async () => {
      const { open, official } = await runBoth(`
echo '{"type":"system","subtype":"init","session_id":"crash","tools":[],"mcp_servers":[]}'
sleep 0.1
echo '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello"}]},"session_id":"crash"}'
sleep 0.1
kill -9 $$
`);
      expect(open.types).toEqual(['system', 'assistant']);
      expect(open.error).toBe('Claude Code process terminated by signal SIGKILL');
      expect({ types: open.types, error: open.error }).toEqual({
        types: official.types,
        error: official.error,
      });
    },
    { timeout: 15000 }
  );

  test(
    'invalid NDJSON from CLI is handled gracefully',
    async () => {
      // Script sends a valid system message followed by garbage.
      // Tests that invalid JSON doesn't crash the process.
      const script = createTempScript(`
echo '{"type":"system","subtype":"init","session_id":"invalid","tools":[],"mcp_servers":[]}'
echo 'THIS IS NOT JSON'
echo '{"type":"system","subtype":"init","session_id":"invalid2","tools":[],"mcp_servers":[]}'
exit 0
`);

      try {
        const messages: SDKMessage[] = [];

        for await (const msg of query({
          prompt: 'test',
          options: {
            pathToClaudeCodeExecutable: script,
            permissionMode: 'default',
            settingSources: [],
          },
        })) {
          messages.push(msg);
          if (msg.type === 'result') break;
        }

        // Should at least get the first valid message
        expect(messages.length).toBeGreaterThanOrEqual(1);
        console.log(`   Invalid NDJSON: got ${messages.length} messages, no crash`);
      } finally {
        unlinkSync(script);
      }
    },
    { timeout: 15000 }
  );
});
