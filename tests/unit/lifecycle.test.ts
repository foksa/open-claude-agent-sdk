/**
 * Process lifecycle parity: stdin closing for streamed prompts, abort,
 * stderr draining, and how the CLI command is built — each run through both
 * our SDK and the official one with fake CLI scripts (no API calls).
 */

import { afterAll, describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
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

describe('canUseTool receives the same context as official', () => {
  const request = JSON.stringify({
    type: 'control_request',
    request_id: 'perm-1',
    request: {
      subtype: 'can_use_tool',
      tool_name: 'mcp__srv__x',
      input: { a: 1 },
      tool_use_id: 'tu-1',
      decision_reason: 'policy',
      decision_reason_type: 'rule',
      decision_reason_code: 'ask_rule',
      // v0.3.301
      server_policy_ask_only: true,
      plugin: 'my-plugin',
      requires_user_interaction: true,
      server_prompt: 'Allow?',
      computer_folder: { path: '/w', computer_name: 'box', extra: 1 },
      mcp_server: { name: 'srv', source: 'sdk' },
      title: 'T',
      display_name: 'D',
      agent_id: 'ag',
    },
  });
  // Answers initialize, asks for permission, waits for the answer, then ends
  const script = fakeCli(`read -r line
id=$(echo "$line" | sed -E 's/.*"request_id":"([^"]+)".*/\\1/')
echo '{"type":"control_response","response":{"subtype":"success","request_id":"'"$id"'","response":{"commands":[],"agents":[],"models":[],"output_style":"default","available_output_styles":[],"account":{}}}}'
echo '${request}'
while read -r l; do case "$l" in *perm-1*) break;; esac; done
echo '${RESULT}'
cat > /dev/null
`);

  const run = async (query: QueryFn) => {
    let context: Record<string, unknown> | undefined;
    const q = query({
      prompt: 'hi',
      options: {
        pathToClaudeCodeExecutable: script,
        settingSources: [],
        canUseTool: async (_name, _input, ctx) => {
          const { signal: _signal, ...rest } = ctx;
          context = rest;
          return { behavior: 'allow', updatedInput: {} };
        },
      },
    });
    for await (const msg of q) {
      if (msg.type === 'result') break;
    }
    return context;
  };

  test('context fields match', async () => {
    const [ours, theirs] = await Promise.all([
      run(openQuery),
      run(officialQuery as unknown as QueryFn),
    ]);
    expect(theirs).toMatchObject({ serverPolicyAskOnly: true });
    expect(ours).toEqual(theirs);
  }, 10000);
});

describe('initialize response re-delivers open prompts', () => {
  const INIT_RESPONSE =
    '"response":{"commands":[],"agents":[],"models":[],"output_style":"default","available_output_styles":[],"account":{}}';
  const pending = [
    `"pending_permission_requests":${JSON.stringify([
      {
        type: 'control_request',
        request_id: 'perm-1',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Bash',
          input: { command: 'ls' },
          tool_use_id: 'tu-1',
          // Cleared before re-asking
          server_policy_ask_only: true,
        },
      },
      // Not a permission prompt: skipped
      { type: 'control_request', request_id: 'odd-1', request: { subtype: 'hook_callback' } },
    ])}`,
    `"pending_user_dialog_requests":${JSON.stringify([
      {
        type: 'control_request',
        request_id: 'dlg-1',
        request: { subtype: 'request_user_dialog', dialog_kind: 'confirm', payload: { q: 1 } },
      },
    ])}`,
    // Ignored, as upstream does
    `"pending_elicitation_requests":${JSON.stringify([
      {
        type: 'control_request',
        request_id: 'eli-1',
        request: { subtype: 'elicitation', mcp_server_name: 's', message: 'm' },
      },
    ])}`,
  ].join(',');

  /**
   * Answers the Nth `initialize` (PENDING_ON) with open prompts, the others
   * plainly; logs every stdin line; ends once both prompts are answered.
   */
  const script = fakeCli(`n=0; got=0
while read -r line; do
  echo "$line" >> "$REDELIVERY_LOG"
  case "$line" in
    *'"subtype":"initialize"'*)
      n=$((n+1))
      id=$(echo "$line" | sed -E 's/.*"request_id":"([^"]+)".*/\\1/')
      if [ "$n" -eq "$PENDING_ON" ]; then
        echo '{"type":"control_response","response":{"subtype":"success","request_id":"'"$id"'",${INIT_RESPONSE},${pending}}}'
      else
        echo '{"type":"control_response","response":{"subtype":"success","request_id":"'"$id"'",${INIT_RESPONSE}}}'
      fi ;;
    *'"request_id":"perm-1"'*|*'"request_id":"dlg-1"'*)
      got=$((got+1))
      if [ "$got" -eq 2 ]; then echo '${RESULT}'; fi ;;
  esac
done
`);

  const run = async (query: QueryFn, pendingOn: 1 | 2) => {
    const log = `/tmp/redelivery-${Date.now()}-${Math.random().toString(36).slice(2)}.log`;
    scripts.push(log);
    const calls: unknown[] = [];
    const q = query({
      prompt: 'hi',
      options: {
        pathToClaudeCodeExecutable: script,
        settingSources: [],
        env: { ...process.env, REDELIVERY_LOG: log, PENDING_ON: String(pendingOn) },
        canUseTool: async (name, input, { signal: _s, ...ctx }) => {
          calls.push(['canUseTool', name, input, ctx]);
          return { behavior: 'allow', updatedInput: input };
        },
        onUserDialog: async (request, { signal: _s, ...ctx }) => {
          calls.push(['onUserDialog', request, ctx]);
          return { behavior: 'completed', result: { ok: true } } as never;
        },
        onElicitation: async (request) => {
          calls.push(['onElicitation', request]);
          return { action: 'decline' };
        },
      },
    });
    if (pendingOn === 2) {
      await q.initializationResult();
      await q.reinitialize();
    }
    for await (const msg of q) {
      if (msg.type === 'result') break;
    }
    // The SDK's answers to the re-delivered prompts, as the CLI read them
    const answers = (existsSync(log) ? readFileSync(log, 'utf8') : '')
      .split('\n')
      .filter((l) => l.includes('"control_response"'))
      .map((l) => JSON.parse(l))
      .sort((a, b) => a.response.request_id.localeCompare(b.response.request_id));
    return { calls, answers };
  };

  for (const [label, pendingOn] of [
    ['first initialize', 1],
    ['reinitialize()', 2],
  ] as const) {
    test(`${label}: prompts answered like official`, async () => {
      const [ours, theirs] = await Promise.all([
        run(openQuery, pendingOn),
        run(officialQuery as unknown as QueryFn, pendingOn),
      ]);
      expect(theirs.calls.map((c) => (c as unknown[])[0]).sort()).toEqual([
        'canUseTool',
        'onUserDialog',
      ]);
      expect(theirs.answers.map((a) => a.response.request_id)).toEqual(['dlg-1', 'perm-1']);
      expect(ours).toEqual(theirs);
    }, 10000);
  }
});

describe('error result text survives what follows it', () => {
  const errorResult = JSON.stringify({
    ...JSON.parse(RESULT),
    subtype: 'error_during_execution',
    is_error: true,
    errors: ['boom'],
  });
  const writesLost = JSON.stringify({
    type: 'system',
    subtype: 'session_writes_lost',
    error_code: 'ENOSPC',
    lost: ['transcript'],
    transcript_session_ids: ['s'],
    uuid: '00000000-0000-4000-8000-000000000000',
    session_id: 's',
  });
  // A queued subagent report that shared another report's model call
  const modelLessResult = JSON.stringify({ ...JSON.parse(RESULT), result: '', num_turns: 0 });

  const cases: [string, string, string[]][] = [
    [
      'session_writes_lost after the last result (v0.3.317)',
      fakeCli(`echo '${errorResult}'\necho '${writesLost}'\nexit 1\n`),
      ['result', 'system'],
    ],
    [
      'a model-less turn after an error result (v0.3.316)',
      fakeCli(`echo '${errorResult}'\necho '${modelLessResult}'\nexit 1\n`),
      ['result', 'result'],
    ],
  ];

  for (const [label, script, expectedTypes] of cases) {
    for (const [name, query] of both) {
      test(`${name}: ${label}`, async () => {
        const types: string[] = [];
        let error: Error | undefined;
        try {
          for await (const msg of query({
            prompt: 'hi',
            options: { pathToClaudeCodeExecutable: script, settingSources: [] },
          })) {
            types.push(msg.type);
          }
        } catch (e) {
          error = e as Error;
        }
        expect(types).toEqual(expectedTypes);
        expect(error?.message).toBe('Claude Code returned an error result: boom');
      }, 10000);
    }
  }
});

describe('hooks set to onFailure: "block" (v0.3.317)', () => {
  const INIT_FIELDS =
    '"commands":[],"agents":[],"models":[],"output_style":"default","available_output_styles":[],"account":{}';

  /**
   * Waits a second before answering `initialize` with INIT_EXTRA, noting
   * whether anything else arrived on stdin meanwhile; then reports, in the
   * result, whether the prompt was held and what followed the answer.
   */
  const script = fakeCli(`read -r init
id=$(echo "$init" | sed -E 's/.*"request_id":"([^"]+)".*/\\1/')
if read -r -t 1 early; then held=early; else held=held; fi
echo '{"type":"control_response","response":{"subtype":"success","request_id":"'"$id"'","response":{${INIT_FIELDS}'"$INIT_EXTRA"'}}}'
if [ "$held" = held ]; then
  if read -r -t 2 next; then
    case "$next" in *'"type":"user"'*) after=prompt ;; *) after=other ;; esac
  else after=nothing; fi
else after=skipped; fi
echo "$held:$after" > "$HOLD_LOG"
if [ "$after" = prompt ] || [ "$held" = early ]; then echo '${RESULT}'; fi
cat > /dev/null
`);

  const run = async (
    query: QueryFn,
    initExtra: string,
    prompt: string | AsyncIterable<SDKUserMessage>,
    onFailure: 'block' | 'continue' = 'block',
    interruptFirst = false
  ) => {
    const log = `/tmp/hold-${Date.now()}-${Math.random().toString(36).slice(2)}.log`;
    scripts.push(log);
    writeFileSync(log, '');
    const q = query({
      prompt,
      options: {
        pathToClaudeCodeExecutable: script,
        settingSources: [],
        env: { ...process.env, HOLD_LOG: log, INIT_EXTRA: initExtra },
        hooks: { PreToolUse: [{ hooks: [async () => ({})], onFailure }] },
      },
    });
    // Never answered by the fake CLI; rejects when the query ends
    if (interruptFirst) q.interrupt().catch(() => {});
    const init = q.initializationResult().then(
      () => 'resolved',
      (e: Error) => e.message
    );
    const types: string[] = [];
    let error: string | undefined;
    try {
      for await (const msg of q) {
        types.push(msg.type);
        if (msg.type === 'result') break;
      }
    } catch (e) {
      error = (e as Error).message;
    }
    // The fake CLI writes its log once stdin handling is over
    for (let i = 0; i < 50 && readFileSync(log, 'utf8') === ''; i++) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return { types, error, init: await init, cli: readFileSync(log, 'utf8').trim() };
  };

  for (const [name, query] of both) {
    test(`${name}: the prompt waits for the initialize answer`, async () => {
      const out = await run(query, ',"hook_on_failure_supported":true', 'hi');
      expect(out).toEqual({
        types: ['result'],
        error: undefined,
        init: 'resolved',
        cli: 'held:prompt',
      });
    }, 15000);

    test(`${name}: a streamed prompt waits too`, async () => {
      const out = await run(query, ',"hook_on_failure_supported":true', oneMessage());
      expect(out.cli).toBe('held:prompt');
      expect(out.types).toEqual(['result']);
    }, 15000);

    test(`${name}: interrupt() is held behind the prompt`, async () => {
      const out = await run(query, ',"hook_on_failure_supported":true', 'hi', 'block', true);
      expect(out.cli).toBe('held:prompt');
    }, 15000);

    test(`${name}: without "block" the prompt is not held`, async () => {
      const out = await run(query, '', 'hi', 'continue');
      expect(out.cli).toBe('early:skipped');
    }, 15000);

    test(`${name}: a CLI that does not honor onFailure fails the query, prompt unsent`, async () => {
      const out = await run(query, '', 'hi');
      const message =
        'The process answering initialize does not honor onFailure on hook matchers, so a hook that fails would not block. Update Claude Code if it is old, or remove onFailure: "block" from your hooks.';
      expect(out).toEqual({ types: [], error: message, init: message, cli: 'held:nothing' });
    }, 15000);

    test(`${name}: a session that did not register the hooks fails the query`, async () => {
      const out = await run(
        query,
        ',"hook_on_failure_supported":true,"hooks_applied":false',
        oneMessage()
      );
      const message =
        'This session was already running and did not register your hooks, so a hook set to onFailure: "block" would never run. Start a new session, or remove onFailure: "block" from your hooks.';
      expect(out).toEqual({ types: [], error: message, init: message, cli: 'held:nothing' });
    }, 15000);
  }
});
