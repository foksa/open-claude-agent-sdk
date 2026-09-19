/**
 * Query teardown: a throwing prompt stream must tear the CLI down, a custom
 * spawner must not receive the caller's abort signal directly, and natural
 * completion must release in-process MCP transports — all run against fake
 * CLI scripts (no API calls).
 */

import { afterAll, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import type { SpawnOptions } from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import type { SDKMessage, SDKUserMessage } from '../../src/types/index.ts';

const scripts: string[] = [];
function fakeCli(body: string): string {
  const path = `/tmp/fake-cli-teardown-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`;
  writeFileSync(path, `#!/bin/bash\n${body}`, { mode: 0o755 });
  scripts.push(path);
  return path;
}
afterAll(() => {
  for (const s of scripts) {
    try {
      unlinkSync(s);
    } catch {}
  }
});

const RESULT = JSON.stringify({
  type: 'result',
  subtype: 'success',
  is_error: false,
  result: 'ok',
  session_id: 's',
  duration_ms: 0,
  duration_api_ms: 0,
  num_turns: 1,
  total_cost_usd: 0,
  usage: {},
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

test('a throwing prompt stream surfaces the error and kills the CLI', async () => {
  // Stays alive after stdin closes, so only a kill can end it
  // `exec` so the signal reaches the sleeping process, leaving no orphan
  const script = fakeCli('cat > /dev/null\nexec sleep 20\n');
  let spawned: ReturnType<typeof spawn> | undefined;

  const q = openQuery({
    prompt: (async function* (): AsyncGenerator<SDKUserMessage> {
      yield {
        type: 'user',
        session_id: '',
        parent_tool_use_id: null,
        message: { role: 'user', content: 'hi' },
      };
      throw new Error('generator blew up');
    })(),
    options: {
      pathToClaudeCodeExecutable: script,
      spawnClaudeCodeProcess: (o: SpawnOptions) => {
        spawned = spawn(o.command, o.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: o.cwd,
          env: o.env as NodeJS.ProcessEnv,
        });
        return spawned as never;
      },
    },
  });

  let caught: Error | undefined;
  try {
    const it = q[Symbol.asyncIterator]();
    let step = await it.next();
    while (!step.done) step = await it.next();
  } catch (e) {
    caught = e as Error;
  }
  expect(caught?.message).toBe('generator blew up');

  // shutdown() gives the CLI a 2s grace window, then SIGTERM
  for (let i = 0; i < 50; i++) {
    if (spawned?.exitCode !== null || spawned?.signalCode != null) break;
    await sleep(100);
  }
  expect(spawned?.exitCode !== null || spawned?.signalCode != null).toBe(true);
}, 20000);

test("a custom spawner never receives the caller's abort signal directly", async () => {
  // Stays alive after the result so the abort path is exercised
  const script = fakeCli(`echo '${RESULT}'\nexec sleep 20\n`);
  const abortController = new AbortController();
  let handed: AbortSignal | undefined;
  let spawned: ReturnType<typeof spawn> | undefined;

  const q = openQuery({
    prompt: 'hi',
    options: {
      abortController,
      pathToClaudeCodeExecutable: script,
      spawnClaudeCodeProcess: (o: SpawnOptions) => {
        handed = o.signal;
        spawned = spawn(o.command, o.args, {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: o.cwd,
          env: o.env as NodeJS.ProcessEnv,
        });
        return spawned as never;
      },
    },
  });

  const it = q[Symbol.asyncIterator]();
  const first = await it.next();
  expect((first.value as SDKMessage).type).toBe('result');

  expect(handed).toBeDefined();
  expect(handed).not.toBe(abortController.signal);

  abortController.abort();
  // The CLI keeps its graceful-exit window before the abort is forwarded
  await sleep(300);
  expect(handed?.aborted).toBe(false);

  await sleep(2200);
  expect(handed?.aborted).toBe(true);

  try {
    spawned?.kill('SIGKILL');
  } catch {}
}, 20000);

test('natural completion closes in-process MCP server transports', async () => {
  const script = fakeCli(`echo '${RESULT}'\n`);
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const server = new McpServer({ name: 'probe', version: '1.0.0' });
  let transportClosed = 0;
  server.server.onclose = () => {
    transportClosed++;
  };

  const q = openQuery({
    prompt: 'hi',
    options: {
      pathToClaudeCodeExecutable: script,
      mcpServers: {
        probe: { type: 'sdk', name: 'probe', instance: server } as never,
      },
    },
  });

  const it = q[Symbol.asyncIterator]();
  let step = await it.next();
  while (!step.done) step = await it.next();

  // Let the exit handler finish its teardown
  await sleep(500);
  expect(transportClosed).toBeGreaterThan(0);
}, 20000);

test('an error result without an `errors` array is still delivered', async () => {
  // We run whatever `claude` is on PATH; an older CLI may omit `errors`
  const legacy = JSON.stringify({
    type: 'result',
    subtype: 'error_during_execution',
    is_error: true,
    session_id: 's',
    duration_ms: 0,
    duration_api_ms: 0,
    num_turns: 1,
    total_cost_usd: 0,
    usage: {},
  });
  const script = fakeCli(`echo '${legacy}'\n`);

  const seen: SDKMessage[] = [];
  const q = openQuery({ prompt: 'hi', options: { pathToClaudeCodeExecutable: script } });
  const it = q[Symbol.asyncIterator]();
  for (let step = await it.next(); !step.done; step = await it.next()) {
    seen.push(step.value as SDKMessage);
  }

  expect(seen.map((m) => m.type)).toContain('result');
}, 20000);
