/**
 * Integration tests for error handling
 *
 * These tests use fake CLI scripts — no API calls, zero cost.
 * Tests error handling paths in query(), ProcessFactory, and QueryImpl.
 */

import { describe, expect, test } from 'bun:test';
import { unlinkSync, writeFileSync } from 'node:fs';
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

  test(
    'CLI exits non-zero after partial output completes generator',
    async () => {
      // Script sends a system message then exits with code 1.
      // Stdout closes before the exit handler fires, so the generator
      // completes normally after yielding the partial messages.
      const script = createTempScript(`
echo '{"type":"system","subtype":"init","session_id":"test","tools":[],"mcp_servers":[]}'
exit 1
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

        // Should have received the system message
        expect(messages.length).toBeGreaterThan(0);
        expect(messages[0].type).toBe('system');

        console.log(`   CLI exit 1: yielded ${messages.length} messages before generator ended`);
      } finally {
        unlinkSync(script);
      }
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
    'CLI crashes mid-stream yields partial messages then completes',
    async () => {
      // Script sends init + assistant message, then kills itself.
      // Tests that partial messages are yielded before generator ends.
      const script = createTempScript(`
echo '{"type":"system","subtype":"init","session_id":"crash","tools":[],"mcp_servers":[]}'
sleep 0.1
echo '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello"}]},"session_id":"crash"}'
sleep 0.1
kill -9 $$
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

        // Should have received partial messages before crash
        expect(messages.length).toBeGreaterThanOrEqual(1);
        expect(messages[0].type).toBe('system');

        console.log(`   CLI crash: yielded ${messages.length} messages before generator ended`);
      } finally {
        unlinkSync(script);
      }
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
