/**
 * Process lifecycle parity: stdin closing for streamed prompts, abort,
 * stderr draining, and how the CLI command is built — each run through both
 * our SDK and the official one with fake CLI scripts (no API calls).
 */

import { afterAll, describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { unlinkSync, writeFileSync } from 'node:fs';
import {
  AbortError as OfficialAbortError,
  query as officialQuery,
  type SpawnOptions,
} from '@anthropic-ai/claude-agent-sdk';
import { query as openQuery } from '../../src/api/query.ts';
import { AbortError } from '../../src/constants.ts';
import type { SDKUserMessage } from '../../src/types/index.ts';

const scripts: string[] = [];
function fakeCli(body: string): string {
  const path = `/tmp/fake-cli-lifecycle-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`;
  writeFileSync(path, `#!/bin/bash\n${body}`, { mode: 0o755 });
  scripts.push(path);
  return path;
}
afterAll(() => {
  for (const s of scripts) unlinkSync(s);
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

type QueryFn = typeof openQuery;
const both: [string, QueryFn][] = [
  ['open', openQuery],
  ['official', officialQuery as unknown as QueryFn],
];

async function* oneMessage(): AsyncGenerator<SDKUserMessage> {
  yield {
    type: 'user',
    session_id: '',
    parent_tool_use_id: null,
    message: { role: 'user', content: 'hi' },
  };
}

describe('streamed prompt closes stdin when the generator ends', () => {
  // The fake CLI only answers once stdin reaches EOF
  const script = fakeCli(`cat > /dev/null\necho '${RESULT}'\n`);

  for (const [name, query] of both) {
    test(`${name}: iteration completes`, async () => {
      const types: string[] = [];
      for await (const msg of query({
        prompt: oneMessage(),
        options: { pathToClaudeCodeExecutable: script, settingSources: [] },
      })) {
        types.push(msg.type);
      }
      expect(types).toEqual(['result']);
    }, 10000);
  }
});

describe('single-turn stdin stays open until the run ends (v0.3.284)', () => {
  const state = (s: string) =>
    JSON.stringify({
      type: 'system',
      subtype: 'session_state_changed',
      state: s,
      sdk_host_only: true,
      session_id: 's',
    });
  const resultSaying = (text: string) => JSON.stringify({ ...JSON.parse(RESULT), result: text });

  // Reports whether stdin was still open half a second after the first result
  // (as when a finished background agent wakes a follow-up turn), then goes idle
  const script = fakeCli(`marker=$(mktemp -u)
(cat > /dev/null; touch "$marker") <&0 &
echo '${state('running')}'
echo '${RESULT}'
sleep 0.5
if [ -e "$marker" ]; then s=closed; else s=open; fi
echo '${resultSaying('STDIN_STATE')}' | sed "s/STDIN_STATE/$s/"
echo '${state('idle')}'
wait
rm -f "$marker"
`);

  for (const [name, query] of both) {
    test(`${name}: stdin is open for the follow-up turn and closes on idle`, async () => {
      const results: string[] = [];
      const types: string[] = [];
      for await (const msg of query({
        prompt: 'hi',
        options: {
          pathToClaudeCodeExecutable: script,
          settingSources: [],
          canUseTool: async () => ({ behavior: 'allow', updatedInput: {} }),
        },
      })) {
        types.push(msg.type);
        if (msg.type === 'result' && msg.subtype === 'success') results.push(msg.result);
      }
      expect(results).toEqual(['ok', 'open']);
      // sdk_host_only session_state_changed messages are not yielded
      expect(types).toEqual(['result', 'result']);
    }, 10000);
  }

  // Never goes idle: only the ceiling after the result can close stdin
  const neverIdle = fakeCli(`echo '${state('running')}'
echo '${RESULT}'
cat > /dev/null
`);

  for (const [name, query] of both) {
    test(`${name}: CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS ends the run without idle`, async () => {
      const started = Date.now();
      const types: string[] = [];
      for await (const msg of query({
        prompt: 'hi',
        options: {
          pathToClaudeCodeExecutable: neverIdle,
          settingSources: [],
          canUseTool: async () => ({ behavior: 'allow', updatedInput: {} }),
          env: { ...process.env, CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS: '300' },
        },
      })) {
        types.push(msg.type);
      }
      expect(types).toEqual(['result']);
      expect(Date.now() - started).toBeGreaterThanOrEqual(300);
    }, 10000);
  }
});

describe('abort', () => {
  const script = fakeCli(
    `echo '{"type":"system","subtype":"init","session_id":"a","tools":[],"mcp_servers":[]}'\nsleep 30\n`
  );

  async function abortAfterFirstMessage(query: QueryFn, extra: Record<string, unknown> = {}) {
    const abortController = new AbortController();
    const types: string[] = [];
    let error: unknown;
    try {
      for await (const msg of query({
        prompt: 'hi',
        options: {
          pathToClaudeCodeExecutable: script,
          settingSources: [],
          abortController,
          ...extra,
        },
      })) {
        types.push(msg.type);
        abortController.abort();
      }
    } catch (err) {
      error = err;
    }
    return { types, error };
  }

  test('rejects iteration with AbortError like official', async () => {
    const ours = await abortAfterFirstMessage(openQuery);
    const theirs = await abortAfterFirstMessage(officialQuery as unknown as QueryFn);
    expect(ours.error).toBeInstanceOf(AbortError);
    expect(theirs.error).toBeInstanceOf(OfficialAbortError);
    expect(ours.types).toEqual(theirs.types);
    expect((ours.error as Error).message).toBe((theirs.error as Error).message);
  }, 15000);

  test('kills the CLI within the grace period', async () => {
    let pid: number | undefined;
    await abortAfterFirstMessage(openQuery, {
      spawnClaudeCodeProcess: (opts: SpawnOptions) => {
        const proc = spawn(opts.command, opts.args, {
          env: opts.env as NodeJS.ProcessEnv,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        pid = proc.pid;
        return proc as never;
      },
    });
    await new Promise((resolve) => setTimeout(resolve, 3000));
    expect(() => process.kill(pid as number, 0)).toThrow();
  }, 15000);

  test('pre-aborted controller rejects with AbortError like official', async () => {
    const results: { aborted: boolean; message: string }[] = [];
    for (const [name, query] of both) {
      const abortController = new AbortController();
      abortController.abort();
      try {
        for await (const _ of query({
          prompt: 'hi',
          options: { pathToClaudeCodeExecutable: script, settingSources: [], abortController },
        })) {
        }
        results.push({ aborted: false, message: 'completed' });
      } catch (err) {
        const cls = name === 'open' ? AbortError : OfficialAbortError;
        results.push({ aborted: err instanceof cls, message: (err as Error).message });
      }
    }
    expect(results[0]).toEqual({ aborted: true, message: 'Operation aborted' });
    expect(results[0]).toEqual(results[1]);
  }, 10000);
});

describe('stderr is drained without an stderr callback', () => {
  // 1MB of stderr fills any pipe buffer; an unread pipe blocks the CLI forever
  const script = fakeCli(
    `head -c 1048576 /dev/zero | tr '\\0' 'x' >&2\necho '${RESULT}'\ncat > /dev/null\n`
  );

  for (const [name, query] of both) {
    test(`${name}: query completes`, async () => {
      const types: string[] = [];
      for await (const msg of query({
        prompt: 'hi',
        options: { pathToClaudeCodeExecutable: script, settingSources: [] },
      })) {
        types.push(msg.type);
      }
      expect(types).toEqual(['result']);
    }, 10000);
  }
});

describe('CLI command construction', () => {
  // .sh is not a JS extension, so both SDKs treat it as a native binary
  const script = fakeCli(`echo '${RESULT}'\ncat > /dev/null\n`);

  async function spawnedWith(query: QueryFn, options: Record<string, unknown>) {
    let captured: SpawnOptions | undefined;
    for await (const _ of query({
      prompt: 'hi',
      options: {
        pathToClaudeCodeExecutable: script,
        settingSources: [],
        ...options,
        spawnClaudeCodeProcess: (opts: SpawnOptions) => {
          captured = opts;
          return spawn(opts.command, opts.args, {
            env: opts.env as NodeJS.ProcessEnv,
            stdio: ['pipe', 'pipe', 'pipe'],
          }) as never;
        },
      },
    })) {
    }
    if (!captured) throw new Error('spawnClaudeCodeProcess was not called');
    return captured;
  }

  test('executable is ignored for a native binary (matches official)', async () => {
    const [ours, theirs] = [
      await spawnedWith(openQuery, { executable: 'node', executableArgs: ['--flag'] }),
      await spawnedWith(officialQuery as unknown as QueryFn, {
        executable: 'node',
        executableArgs: ['--flag'],
      }),
    ];
    expect(ours.command).toBe(script);
    expect(ours.command).toBe(theirs.command);
    expect(ours.args[0]).toBe(theirs.args[0]);
  }, 15000);

  test('env: DEBUG is removed unless DEBUG_CLAUDE_AGENT_SDK is set (matches official)', async () => {
    const env = { ...process.env, DEBUG: 'leaky' } as Record<string, string>;
    delete env.DEBUG_CLAUDE_AGENT_SDK;
    // The official query() sets this on process.env; each SDK must add it itself
    delete env.CLAUDE_AGENT_SDK_VERSION;
    const [ours, theirs] = [
      await spawnedWith(openQuery, { env }),
      await spawnedWith(officialQuery as unknown as QueryFn, { env }),
    ];
    expect(ours.env.DEBUG).toBeUndefined();
    expect(ours.env.DEBUG).toBe(theirs.env.DEBUG);
    expect(ours.env.CLAUDE_CODE_ENTRYPOINT).toBe(theirs.env.CLAUDE_CODE_ENTRYPOINT);
    expect(ours.env.CLAUDE_AGENT_SDK_VERSION).toBe(theirs.env.CLAUDE_AGENT_SDK_VERSION);
  }, 15000);

  test('spawn signal is not a timeout (does not abort on its own)', async () => {
    const ours = await spawnedWith(openQuery, {});
    expect(ours.signal.aborted).toBe(false);
    expect(String(ours.signal.reason ?? '')).not.toContain('Timeout');
  }, 15000);
});

describe('exit error includes the stderr tail', () => {
  const script = fakeCli(
    `echo "fatal: config broken (key sk-ant-api03-abcdef123456)" >&2\nsleep 0.1\nexit 3\n`
  );

  for (const [name, query] of both) {
    test(`${name}: message carries stderr, secrets masked`, async () => {
      let error: Error | undefined;
      try {
        for await (const _ of query({
          prompt: 'hi',
          options: { pathToClaudeCodeExecutable: script, settingSources: [] },
        })) {
        }
      } catch (e) {
        error = e as Error;
      }
      expect(error?.message).toStartWith('Claude Code process exited with code 3. stderr: ');
      expect(error?.message).toContain('fatal: config broken');
      expect(error?.message).not.toContain('abcdef123456');
    }, 10000);
  }
});

describe('supportedCommands() tracks commands_changed', () => {
  // Answers the initialize request, then pushes a new command list
  const script = fakeCli(`read -r line
id=$(echo "$line" | sed -E 's/.*"request_id":"([^"]+)".*/\\1/')
echo '{"type":"control_response","response":{"subtype":"success","request_id":"'"$id"'","response":{"commands":[{"name":"old","description":"","argumentHint":""}],"agents":[],"models":[],"output_style":"default","available_output_styles":[],"account":{}}}}'
echo '{"type":"system","subtype":"commands_changed","commands":[{"name":"new","description":"","argumentHint":""}],"session_id":"s","uuid":"u"}'
echo '${RESULT}'
cat > /dev/null
`);

  for (const [name, query] of both) {
    test(`${name}: returns the latest pushed list`, async () => {
      const q = query({
        prompt: 'hi',
        options: { pathToClaudeCodeExecutable: script, settingSources: [] },
      });
      for await (const msg of q) {
        if (msg.type === 'result') break;
      }
      const commands = await q.supportedCommands();
      expect(commands.map((c) => c.name)).toEqual(['new']);
    }, 10000);
  }
});

describe('exit error waits for stderr to drain', () => {
  // The CLI exits at once, but a child still holding stderr writes afterwards.
  // Ours only: the official SDK (0.3.276) reports the exit without this late
  // output — waiting for stderr is a deliberate improvement.
  const script = fakeCli(`( sleep 0.3; echo "late failure detail" >&2 ) > /dev/null &\nexit 2\n`);

  for (const [name, query] of [both[0]]) {
    test(`${name}: late stderr is in the message`, async () => {
      let error: Error | undefined;
      try {
        for await (const _ of query({
          prompt: 'hi',
          options: { pathToClaudeCodeExecutable: script, settingSources: [] },
        })) {
        }
      } catch (e) {
        error = e as Error;
      }
      expect(error?.message).toBe(
        'Claude Code process exited with code 2. stderr: late failure detail'
      );
    }, 10000);
  }
});

describe('a stderr pipe held by a forked child does not keep the host alive', () => {
  // The CLI exits, but a background child keeps stderr open for 6s
  const script = fakeCli(`(sleep 6) >&2 &\nexit 2\n`);

  test('open: the host process exits soon after the query rejects', async () => {
    const host = `
      import { query } from ${JSON.stringify(`${process.cwd()}/src/api/query.ts`)};
      try {
        for await (const _ of query({ prompt: 'hi', options: {
          pathToClaudeCodeExecutable: ${JSON.stringify(script)}, settingSources: [] } })) {}
      } catch (e) { console.log('rejected:', e.message); }
    `;
    const start = Date.now();
    const child = spawn(process.execPath, ['-e', host], { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    await new Promise((resolve) => child.once('exit', resolve));
    const elapsed = Date.now() - start;

    expect(out).toContain('rejected: Claude Code process exited with code 2');
    // Rejects after the ~2s stderr drain window; must not wait for the 6s child
    expect(elapsed).toBeLessThan(4500);
  }, 15000);
});
