/**
 * Session helper parity: every session function runs against the same
 * on-disk fixtures through our implementation and the official SDK, and the
 * results (return values, errors, files written) must match exactly.
 *
 * Uses a temporary CLAUDE_CONFIG_DIR so listing all projects is hermetic.
 * Safe here because nothing in this file spawns the real CLI.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'bun:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as official from '@anthropic-ai/claude-agent-sdk';
import * as open from '../../src/index.ts';
import { projectDirName } from '../../src/sessions/paths.ts';

let configDir: string;
let workDir: string;
const savedEnv = {
  CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR,
  CLAUDE_CODE_PROJECT_DIR_NAME: process.env.CLAUDE_CODE_PROJECT_DIR_NAME,
};

beforeAll(() => {
  configDir = mkdtempSync(join(tmpdir(), 'session-parity-config-'));
  // Canonical path: the CLI files sessions under the realpath (macOS /var → /private/var)
  workDir = realpathSync(mkdtempSync(join(tmpdir(), 'session-parity-work-')));
  process.env.CLAUDE_CONFIG_DIR = configDir;
  delete process.env.CLAUDE_CODE_PROJECT_DIR_NAME;
});

afterAll(() => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  rmSync(configDir, { recursive: true, force: true });
  rmSync(workDir, { recursive: true, force: true });
});

beforeEach(() => {
  rmSync(join(configDir, 'projects'), { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

let counter = 0;
function uuid(): string {
  counter++;
  return `00000000-0000-4000-8000-${counter.toString().padStart(12, '0')}`;
}

function projectDir(projectPath: string): string {
  const dir = join(configDir, 'projects', projectDirName(projectPath));
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeProject(name: string): string {
  const path = join(workDir, name);
  mkdirSync(path, { recursive: true });
  return path;
}

type Line = Record<string, unknown>;

function writeSession(projectPath: string, sessionId: string, lines: Line[]): string {
  const file = join(projectDir(projectPath), `${sessionId}.jsonl`);
  writeFileSync(file, lines.map((l) => `${JSON.stringify(l)}\n`).join(''));
  return file;
}

/** A plain two-turn conversation. */
function conversation(
  sessionId: string,
  cwd: string,
  prompt: unknown,
  extra: Line = {},
  when = '2020-01-01T00:00:00.000Z'
): Line[] {
  const u1 = uuid();
  const a1 = uuid();
  return [
    {
      type: 'user',
      uuid: u1,
      parentUuid: null,
      sessionId,
      cwd,
      gitBranch: 'main',
      timestamp: when,
      message: { role: 'user', content: prompt },
      ...extra,
    },
    {
      type: 'assistant',
      uuid: a1,
      parentUuid: u1,
      sessionId,
      cwd,
      gitBranch: 'main',
      timestamp: when,
      message: {
        id: `msg_${a1}`,
        role: 'assistant',
        content: [{ type: 'text', text: 'ok' }],
        stop_reason: 'end_turn',
      },
    },
  ];
}

async function settle<T>(fn: () => Promise<T>): Promise<{ ok: T } | { error: string }> {
  try {
    return { ok: await fn() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------
// listSessions / getSessionInfo
// ---------------------------------------------------------------------------

function buildListingFixture() {
  const project = makeProject(`listing-${uuid()}`);
  const ids: Record<string, string> = {};
  const add = (key: string, lines: (id: string) => Line[]) => {
    const id = uuid();
    ids[key] = id;
    writeSession(project, id, lines(id));
  };

  add('plain', (id) => conversation(id, project, 'Hello there, help me with tests'));
  add('longPrompt', (id) => conversation(id, project, `Long ${'word '.repeat(80)}`));
  add('blocks', (id) =>
    conversation(id, project, [
      { type: 'text', text: '<ide_opened_file>x</ide_opened_file>' },
      { type: 'text', text: 'Real prompt in blocks' },
    ])
  );
  add('bash', (id) => conversation(id, project, '<bash-input>ls -la</bash-input>'));
  add('command', (id) =>
    conversation(id, project, '<command-name>/review</command-name><command-args></command-args>')
  );
  add('pasted', (id) =>
    conversation(
      id,
      project,
      'See this:\n\n<pasted_content id="ab12">\npasted body\n</pasted_content id="ab12">\n\nthanks'
    )
  );
  add('image', (id) =>
    conversation(id, project, [{ type: 'image', source: { type: 'base64', data: 'AA==' } }])
  );
  add('titled', (id) => [
    ...conversation(id, project, 'Untitled prompt'),
    { type: 'custom-title', customTitle: 'My Custom Title', sessionId: id },
    { type: 'tag', tag: 'important', sessionId: id },
  ]);
  add('aiTitle', (id) => [
    ...conversation(id, project, 'Prompt with ai title'),
    { type: 'ai-title', aiTitle: 'AI Generated Title', sessionId: id },
  ]);
  add('lastPrompt', (id) => [
    ...conversation(id, project, 'First prompt'),
    { type: 'last-prompt', lastPrompt: 'The latest prompt', sessionId: id },
  ]);
  add('clearedTag', (id) => [
    ...conversation(id, project, 'Tag then clear'),
    { type: 'tag', tag: 'temp', sessionId: id },
    { type: 'tag', tag: '', sessionId: id },
  ]);
  add('relocated', (id) => [
    ...conversation(id, project, 'Relocated session'),
    { type: 'relocated', relocatedCwd: join(project, 'moved'), sessionId: id },
  ]);
  add('programmatic', (id) => conversation(id, project, 'From the SDK', { entrypoint: 'sdk-ts' }));
  add('daemon', (id) => conversation(id, project, 'From a daemon', { sessionKind: 'daemon' }));
  add('sidechain', (id) =>
    conversation(id, project, 'Sidechain first line', { isSidechain: true })
  );
  add('metaOnly', (id) => [
    {
      type: 'user',
      uuid: uuid(),
      parentUuid: null,
      sessionId: id,
      isMeta: true,
      message: { role: 'user', content: 'meta' },
    },
  ]);

  // Title stored in a sidecar file instead of the transcript
  add('sidecar', (id) => conversation(id, project, 'Sidecar titled'));
  mkdirSync(join(projectDir(project), ids.sidecar), { recursive: true });
  writeFileSync(
    join(projectDir(project), ids.sidecar, 'custom-title.json'),
    JSON.stringify({ customTitle: '  Sidecar\u0007 Title  ' })
  );

  // A session continued in another that exists → hidden from listings
  add('continuedTarget', (id) => conversation(id, project, 'Continuation target'));
  add('continued', (id) => [
    ...conversation(id, project, 'Continued elsewhere'),
    { type: 'continued-in', continuedInSessionId: ids.continuedTarget, sessionId: id },
  ]);
  // Continued in a session that does not exist → still listed
  add('continuedMissing', (id) => [
    ...conversation(id, project, 'Continued in a missing session'),
    { type: 'continued-in', continuedInSessionId: uuid(), sessionId: id },
  ]);

  // Empty transcript and a non-UUID file are ignored
  writeFileSync(join(projectDir(project), `${uuid()}.jsonl`), '');
  writeFileSync(join(projectDir(project), 'not-a-session.jsonl'), '{}\n');

  return { project, ids };
}

describe('listSessions parity', () => {
  test('matches official SDK across options', async () => {
    const { project } = buildListingFixture();
    const optionSets: official.ListSessionsOptions[] = [
      { dir: project },
      { dir: project, limit: 3 },
      { dir: project, limit: 3, offset: 2 },
      { dir: project, offset: 5 },
      { dir: project, includeProgrammatic: false },
      { dir: project, includeWorktrees: false },
      {},
      { limit: 4 },
    ];
    for (const options of optionSets) {
      const [ours, theirs] = await Promise.all([
        open.listSessions(options),
        official.listSessions(options),
      ]);
      expect(theirs.length).toBeGreaterThan(0);
      expect({ options, result: ours }).toEqual({ options, result: theirs });
    }
  });

  test('finds sessions of a project whose path exceeds 200 characters', async () => {
    const project = makeProject(`deep-${'x'.repeat(230)}`);
    const id = uuid();
    writeSession(project, id, conversation(id, project, 'Long path project'));
    const [ours, theirs] = await Promise.all([
      open.listSessions({ dir: project }),
      official.listSessions({ dir: project }),
    ]);
    expect(theirs.map((s) => s.sessionId)).toEqual([id]);
    expect(ours).toEqual(theirs);
  });
});

describe('getSessionInfo parity', () => {
  test('matches official SDK for every fixture session, with and without dir', async () => {
    const { project, ids } = buildListingFixture();
    for (const id of [...Object.values(ids), uuid(), 'not-a-uuid']) {
      for (const options of [{ dir: project }, {}]) {
        const [ours, theirs] = await Promise.all([
          open.getSessionInfo(id, options),
          official.getSessionInfo(id, options),
        ]);
        expect({ id, options, result: ours }).toEqual({ id, options, result: theirs });
      }
    }
    expect((await official.getSessionInfo(ids.plain, { dir: project }))?.summary).toBe(
      'Hello there, help me with tests'
    );
  });
});

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

describe('renameSession / tagSession / deleteSession parity', () => {
  type Mutation = [
    string,
    (sdk: typeof open | typeof official, id: string, dir?: string) => Promise<void>,
  ];
  const mutations: Mutation[] = [
    ['rename', (sdk, id, dir) => sdk.renameSession(id, '  New Title  ', dir ? { dir } : {})],
    ['rename empty', (sdk, id, dir) => sdk.renameSession(id, '   ', dir ? { dir } : {})],
    [
      'tag',
      (sdk, id, dir) =>
        sdk.tagSession(id, ' \uFF37\uFF29\uFF24\uFF25\u200B tag ', dir ? { dir } : {}),
    ],
    [
      'tag invisible-only',
      (sdk, id, dir) => sdk.tagSession(id, '\u200B\u200D', dir ? { dir } : {}),
    ],
    ['untag', (sdk, id, dir) => sdk.tagSession(id, null, dir ? { dir } : {})],
  ];

  for (const [name, mutate] of mutations) {
    test(`${name}: same file contents and errors`, async () => {
      const project = makeProject(`mutate-${uuid()}`);
      const id = uuid();
      const lines = conversation(id, project, 'Mutate me');
      const file = writeSession(project, id, lines);
      const original = readFileSync(file, 'utf8');

      for (const dir of [project, undefined]) {
        writeFileSync(file, original);
        const oursResult = await settle(() => mutate(open, id, dir));
        const oursFile = readFileSync(file, 'utf8');
        writeFileSync(file, original);
        const theirsResult = await settle(() => mutate(official, id, dir));
        const theirsFile = readFileSync(file, 'utf8');
        if (!name.includes('empty') && !name.includes('invisible')) {
          expect(theirsResult).toEqual({ ok: undefined });
          expect(theirsFile).not.toBe(original);
        }
        expect({ dir, result: oursResult, file: oursFile }).toEqual({
          dir,
          result: theirsResult,
          file: theirsFile,
        });
      }
    });
  }

  test('errors for invalid ids and missing sessions match', async () => {
    const project = makeProject(`missing-${uuid()}`);
    const missing = uuid();
    const cases: [string, (sdk: typeof open | typeof official) => Promise<unknown>][] = [
      ['rename invalid', (sdk) => sdk.renameSession('nope', 'x')],
      ['rename missing dir', (sdk) => sdk.renameSession(missing, 'x', { dir: project })],
      ['rename missing all', (sdk) => sdk.renameSession(missing, 'x')],
      ['tag invalid', (sdk) => sdk.tagSession('nope', 'x')],
      ['tag missing', (sdk) => sdk.tagSession(missing, 'x', { dir: project })],
      ['delete invalid', (sdk) => sdk.deleteSession('nope')],
      ['delete missing dir', (sdk) => sdk.deleteSession(missing, { dir: project })],
      ['delete missing all', (sdk) => sdk.deleteSession(missing)],
      ['fork invalid', (sdk) => sdk.forkSession('nope')],
      ['fork missing dir', (sdk) => sdk.forkSession(missing, { dir: project })],
      ['fork missing all', (sdk) => sdk.forkSession(missing)],
    ];
    for (const [name, run] of cases) {
      const [ours, theirs] = [await settle(() => run(open)), await settle(() => run(official))];
      expect({ name, ours }).toEqual({ name, ours: theirs });
    }
  });

  test('deleteSession removes the transcript and companion directory like official', async () => {
    for (const sdk of [open, official]) {
      const project = makeProject(`delete-${uuid()}`);
      const id = uuid();
      const file = writeSession(project, id, conversation(id, project, 'Delete me'));
      const companion = join(projectDir(project), id, 'subagents');
      mkdirSync(companion, { recursive: true });
      writeFileSync(join(companion, 'agent-a1.jsonl'), '{}\n');
      await sdk.deleteSession(id, { dir: project });
      expect(existsSync(file)).toBe(false);
      expect(existsSync(join(projectDir(project), id))).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// forkSession
// ---------------------------------------------------------------------------

/** Replace generated UUIDs (in order of appearance) and fork-time timestamps. */
function normalizeFork(text: string, knownIds: Set<string>): string {
  const mapping = new Map<string, string>();
  return text
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, (id) => {
      if (knownIds.has(id)) return id;
      if (!mapping.has(id)) mapping.set(id, `<id${mapping.size}>`);
      return mapping.get(id) as string;
    })
    .replace(
      /"(timestamp|ts)":"20[3-9]\d-[^"]+"|"(timestamp|ts)":"202[5-9]-[^"]+"/g,
      '"$1$2":"<now>"'
    );
}

describe('forkSession parity', () => {
  function buildForkFixture() {
    const project = makeProject(`fork-${uuid()}`);
    const id = uuid();
    const [u1, a1, tr1, qa, a2, u3, a3, alt] = [
      uuid(),
      uuid(),
      uuid(),
      uuid(),
      uuid(),
      uuid(),
      uuid(),
      uuid(),
    ];
    const base = { sessionId: id, cwd: project, timestamp: '2020-01-01T00:00:00.000Z' };
    const lines: Line[] = [
      {
        ...base,
        type: 'user',
        uuid: u1,
        parentUuid: null,
        message: { role: 'user', content: 'Start' },
      },
      {
        ...base,
        type: 'assistant',
        uuid: a1,
        parentUuid: u1,
        message: {
          id: 'msg_1',
          role: 'assistant',
          content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: {} }],
        },
      },
      { ...base, type: 'progress', uuid: uuid(), parentUuid: a1, data: {} },
      {
        ...base,
        type: 'user',
        uuid: tr1,
        parentUuid: a1,
        message: {
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: 't1', content: 'ok' }],
        },
      },
      {
        ...base,
        type: 'attachment',
        uuid: qa,
        parentUuid: tr1,
        attachment: { type: 'queued_command', prompt: 'queued', source_uuid: 'client-sent-1' },
      },
      {
        ...base,
        type: 'assistant',
        uuid: a2,
        parentUuid: qa,
        message: { id: 'msg_2', role: 'assistant', content: [{ type: 'text', text: 'done' }] },
      },
      // abandoned branch off a2
      {
        ...base,
        type: 'user',
        uuid: alt,
        parentUuid: a2,
        message: { role: 'user', content: 'Abandoned' },
      },
      {
        ...base,
        type: 'user',
        uuid: u3,
        parentUuid: a2,
        message: { role: 'user', content: 'Continue' },
      },
      {
        ...base,
        type: 'assistant',
        uuid: a3,
        parentUuid: u3,
        message: { id: 'msg_3', role: 'assistant', content: [{ type: 'text', text: 'fin' }] },
      },
      { type: 'relocated', relocatedCwd: join(project, 'moved'), sessionId: id },
      { type: 'content-replacement', sessionId: id, replacements: [{ from: 'a', to: 'b' }] },
      { type: 'ai-title', aiTitle: 'Fork Source', sessionId: id },
    ];
    writeSession(project, id, lines);
    const known = new Set([id, u1, a1, tr1, qa, a2, u3, a3, alt]);
    return { project, id, ids: { u1, a1, tr1, qa, a2, u3, a3, alt }, known };
  }

  const variants: [string, (ids: Record<string, string>) => official.ForkSessionOptions][] = [
    ['full copy', () => ({})],
    ['with title', () => ({ title: '  Custom Fork  ' })],
    ['up to assistant', (ids) => ({ upToMessageId: ids.a2 })],
    ['up to tool result', (ids) => ({ upToMessageId: ids.tr1 })],
    ['up to queued client id', () => ({ upToMessageId: 'client-sent-1' })],
    ['up to unknown id', () => ({ upToMessageId: 'nope' })],
  ];

  for (const [name, makeOptions] of variants) {
    test(`${name}: forked transcript matches official`, async () => {
      const { project, id, ids, known } = buildForkFixture();
      const options = { dir: project, ...makeOptions(ids) };
      const read = (result: { ok: official.ForkSessionResult } | { error: string }) =>
        'ok' in result
          ? normalizeFork(
              readFileSync(join(projectDir(project), `${result.ok.sessionId}.jsonl`), 'utf8'),
              known
            )
          : result;
      const ours = read(await settle(() => open.forkSession(id, options)));
      const theirs = read(await settle(() => official.forkSession(id, options)));
      if (name !== 'up to unknown id') expect(typeof theirs).toBe('string');
      expect(ours).toEqual(theirs);
    });
  }
});

describe('rewound branch parity (v0.3.283)', () => {
  /**
   * A conversation rewound to its first reply: the abandoned branch comes
   * first in the file, then the newer branch, which ends in `tail` rows —
   * the case where older SDKs returned the rewound-away branch.
   */
  function buildRewoundFixture(tail: 'meta' | 'local-command' | 'system') {
    const project = makeProject(`rewound-${tail}-${uuid()}`);
    const id = uuid();
    const base = { sessionId: id, cwd: project, timestamp: '2020-01-01T00:00:00.000Z' };
    const [u1, a1, oldU, oldA, newU, newA, t1, t2] = Array.from({ length: 8 }, uuid);
    const reply = (uuidValue: string, parentUuid: string, text: string): Line => ({
      ...base,
      type: 'assistant',
      uuid: uuidValue,
      parentUuid,
      message: { id: `msg_${uuidValue}`, role: 'assistant', content: [{ type: 'text', text }] },
    });
    const prompt = (uuidValue: string, parentUuid: string | null, content: string): Line => ({
      ...base,
      type: 'user',
      uuid: uuidValue,
      parentUuid,
      message: { role: 'user', content },
    });
    const tails: Record<typeof tail, Line[]> = {
      meta: [{ ...prompt(t1, newA, 'meta reminder'), isMeta: true }],
      'local-command': [
        { ...prompt(t1, newA, '<command-name>/cost</command-name>'), isMeta: true },
        prompt(t2, t1, '<local-command-stdout>$0.01</local-command-stdout>'),
      ],
      system: [
        {
          ...base,
          type: 'system',
          subtype: 'informational',
          uuid: t1,
          parentUuid: newA,
          content: 'notice',
        },
      ],
    };
    const lines: Line[] = [
      prompt(u1, null, 'Start'),
      reply(a1, u1, 'first'),
      prompt(oldU, a1, 'Abandoned branch'),
      reply(oldA, oldU, 'abandoned reply'),
      prompt(newU, a1, 'Kept branch'),
      reply(newA, newU, 'kept reply'),
      ...tails[tail],
    ];
    writeSession(project, id, lines);
    return { project, id, known: new Set([id, u1, a1, oldU, oldA, newU, newA, t1, t2]) };
  }

  for (const tail of ['meta', 'local-command', 'system'] as const) {
    test(`${tail} tail: getSessionMessages matches official`, async () => {
      const { project, id } = buildRewoundFixture(tail);
      for (const includeSystemMessages of [false, true]) {
        const opts = { dir: project, includeSystemMessages };
        const ours = await open.getSessionMessages(id, opts);
        const theirs = await official.getSessionMessages(id, opts);
        expect(ours).toEqual(theirs);
        const texts = JSON.stringify(theirs);
        expect(texts).toContain('Kept branch');
        expect(texts).not.toContain('Abandoned branch');
      }
    });

    test(`${tail} tail: forkSession copies the same branch as official`, async () => {
      const { project, id, known } = buildRewoundFixture(tail);
      const read = (result: { ok: official.ForkSessionResult } | { error: string }) =>
        'ok' in result
          ? normalizeFork(
              readFileSync(join(projectDir(project), `${result.ok.sessionId}.jsonl`), 'utf8'),
              known
            )
          : result;
      const ours = read(await settle(() => open.forkSession(id, { dir: project })));
      const theirs = read(await settle(() => official.forkSession(id, { dir: project })));
      expect(typeof theirs).toBe('string');
      // A full copy keeps every branch; the chain it continues from must match
      expect(ours).toEqual(theirs);
    });
  }
});

describe('session reader parity (v0.3.284–v0.3.287)', () => {
  function session(name: string) {
    const project = makeProject(`${name}-${uuid()}`);
    const id = uuid();
    const base = { sessionId: id, cwd: project, timestamp: '2020-01-01T00:00:00.000Z' };
    let tick = 0;
    const at = () => ({
      ...base,
      timestamp: `2020-01-01T00:00:${String(tick++).padStart(2, '0')}.000Z`,
    });
    const prompt = (
      u: string,
      parentUuid: string | null,
      content: unknown,
      extra: Line = {}
    ): Line => ({
      ...at(),
      type: 'user',
      uuid: u,
      parentUuid,
      message: { role: 'user', content },
      ...extra,
    });
    const reply = (u: string, parentUuid: string, text: string): Line => ({
      ...at(),
      type: 'assistant',
      uuid: u,
      parentUuid,
      message: { id: `msg_${u}`, role: 'assistant', content: [{ type: 'text', text }] },
    });
    const queued = (u: string, parentUuid: string, attachment: Line): Line => ({
      ...at(),
      type: 'attachment',
      uuid: u,
      parentUuid,
      attachment: { type: 'queued_command', ...attachment },
    });
    return { project, id, base, at, prompt, reply, queued };
  }

  async function expectMessagesMatch(project: string, id: string) {
    for (const includeSystemMessages of [false, true]) {
      const opts = { dir: project, includeSystemMessages };
      const theirs = await official.getSessionMessages(id, opts);
      expect(await open.getSessionMessages(id, opts)).toEqual(theirs);
    }
    return official.getSessionMessages(id, { dir: project });
  }

  test('a message sent while Claude worked, with no reply before the process stopped', async () => {
    const { project, id, at, prompt, reply, queued } = session('trailing');
    const [u1, a1, p1, q1, q2] = Array.from({ length: 5 }, uuid);
    writeSession(project, id, [
      prompt(u1, null, 'Start'),
      reply(a1, u1, 'working'),
      { ...at(), type: 'progress', uuid: p1, parentUuid: a1, data: {} },
      queued(q1, p1, { prompt: 'sent mid-turn' }),
      queued(q2, a1, { prompt: 'also sent' }),
    ]);
    const theirs = JSON.stringify(await expectMessagesMatch(project, id));
    expect(theirs).toContain('sent mid-turn');
  });

  for (const key of ['commandUuid', 'deliveryId'] as const) {
    test(`a message absorbed mid-turn (${key}) and followed by another prompt`, async () => {
      const { project, id, prompt, reply, queued } = session(`absorbed-${key}`);
      const [u1, a1, q1, u2, a2] = Array.from({ length: 5 }, uuid);
      const attachment =
        key === 'commandUuid'
          ? { prompt: 'absorbed', source_uuid: 'client-1' }
          : { prompt: 'absorbed', delivery_id: 'dlv-1' };
      writeSession(project, id, [
        prompt(u1, null, 'Start'),
        reply(a1, u1, 'working'),
        queued(q1, a1, attachment),
        {
          type: 'queue-operation',
          operation: 'remove',
          reason: 'absorbed_mid_turn',
          [key]: key === 'commandUuid' ? 'client-1' : 'dlv-1',
          sessionId: id,
        },
        prompt(u2, q1, 'Next prompt'),
        reply(a2, u2, 'done'),
      ]);
      const theirs = JSON.stringify(await expectMessagesMatch(project, id));
      expect(theirs).toContain('absorbed');
    });
  }

  test('meta messages from shown origins, task-notification producer, toolDenialUnanswered', async () => {
    const { project, id, prompt, reply, queued } = session('origins');
    const [u1, a1, m1, a2, q1, a3, q2, a4, u2, u3, a5] = Array.from({ length: 11 }, uuid);
    writeSession(project, id, [
      prompt(u1, null, 'Start'),
      reply(a1, u1, 'ok'),
      prompt(m1, a1, 'channel push', { isMeta: true, origin: { kind: 'channel', server: 's' } }),
      reply(a2, m1, 'seen'),
      queued(q1, a2, { prompt: 'from a peer', isMeta: true, origin: { kind: 'peer', from: 'x' } }),
      reply(a3, q1, 'peer seen'),
      queued(q2, a3, {
        prompt: 'task done',
        origin: { kind: 'task-notification', subkind: 'bg', producer: 'monitor', extra: 1 },
      }),
      reply(a4, q2, 'noted'),
      prompt(u2, a4, 'denied', { toolDenialUnanswered: 'stream-closed' }),
      prompt(u3, u2, 'other', { toolDenialUnanswered: 'something-else' }),
      reply(a5, u3, 'fin'),
    ]);
    const theirs = JSON.stringify(await expectMessagesMatch(project, id));
    expect(theirs).toContain('channel push');
    expect(theirs).toContain('"producer":"monitor"');
    expect(theirs).toContain('"toolDenialUnanswered":"stream-closed"');
  });

  function forkFixture(name: string, build: (s: ReturnType<typeof session>) => Line[]) {
    const s = session(name);
    const lines = build(s);
    writeSession(s.project, s.id, lines);
    const known = new Set([s.id, ...lines.map((l) => l.uuid).filter((u) => typeof u === 'string')]);
    return { ...s, known: known as Set<string> };
  }

  async function expectForkMatches(
    fixture: { project: string; id: string; known: Set<string> },
    options: official.ForkSessionOptions = {}
  ) {
    const { project, id, known } = fixture;
    const opts = { dir: project, ...options };
    const forked: Record<string, string> = {};
    const read = (
      which: string,
      result: { ok: official.ForkSessionResult } | { error: string }
    ) => {
      if (!('ok' in result)) return result;
      forked[which] = result.ok.sessionId;
      return normalizeFork(
        readFileSync(join(projectDir(project), `${result.ok.sessionId}.jsonl`), 'utf8'),
        known
      );
    };
    const ours = read('ours', await settle(() => open.forkSession(id, opts)));
    const theirs = read('theirs', await settle(() => official.forkSession(id, opts)));
    expect(typeof theirs).toBe('string');
    expect(ours).toEqual(theirs);
    // The fork reads back the same history
    const readBack = async (sid: string) =>
      normalizeFork(
        JSON.stringify(await official.getSessionMessages(sid, { dir: project })),
        known
      );
    expect(await readBack(forked.ours as string)).toEqual(await readBack(forked.theirs as string));
    return official.getSessionMessages(forked.theirs as string, { dir: project });
  }

  test('forkSession remaps a compact boundary’s preserved message ids', async () => {
    const fixture = forkFixture('fork-compact', ({ at, prompt, reply }) => {
      const [u1, a1, b, sum, u2, a2] = Array.from({ length: 6 }, uuid);
      return [
        prompt(u1, null, 'Old'),
        reply(a1, u1, 'old reply'),
        {
          ...at(),
          type: 'system',
          subtype: 'compact_boundary',
          uuid: b,
          parentUuid: null,
          logicalParentUuid: a1,
          compactMetadata: {
            trigger: 'auto',
            preservedMessages: { uuids: [u1, a1], anchorUuid: sum, allUuids: [u1, a1] },
          },
        },
        prompt(sum, b, 'Summary', { isCompactSummary: true }),
        prompt(u2, a1, 'After compaction'),
        reply(a2, u2, 'new reply'),
      ];
    });
    await expectForkMatches(fixture);
  });

  for (const tail of ['progress', 'fork_briefing'] as const) {
    test(`forkSession cut at a ${tail} row written at the rewind point`, async () => {
      let cut = '';
      const fixture = forkFixture(`fork-cut-${tail}`, ({ at, prompt, reply }) => {
        const [u1, a1, oldU, oldA, t] = Array.from({ length: 5 }, uuid);
        cut = t;
        return [
          prompt(u1, null, 'Start'),
          reply(a1, u1, 'first'),
          prompt(oldU, a1, 'Abandoned branch'),
          reply(oldA, oldU, 'abandoned reply'),
          tail === 'progress'
            ? { ...at(), type: 'progress', uuid: t, parentUuid: a1, data: {} }
            : {
                ...at(),
                type: 'attachment',
                uuid: t,
                parentUuid: a1,
                attachment: { type: 'fork_briefing', text: 'b' },
              },
        ];
      });
      await expectForkMatches(fixture, { upToMessageId: cut });
      const copied = readFileSync(
        join(
          projectDir(fixture.project),
          `${(await open.forkSession(fixture.id, { dir: fixture.project, upToMessageId: cut })).sessionId}.jsonl`
        ),
        'utf8'
      );
      expect(copied).not.toContain('Abandoned branch');
    });
  }

  test('forkSession leaves out a compaction of a rewound-away branch', async () => {
    let cut = '';
    const fixture = forkFixture('fork-dead-compact', ({ at, prompt, reply }) => {
      const [u1, a1, oldU, oldA, b, sum, newU, newA] = Array.from({ length: 8 }, uuid);
      cut = newA;
      return [
        prompt(u1, null, 'Start'),
        reply(a1, u1, 'first'),
        prompt(oldU, a1, 'Abandoned branch'),
        reply(oldA, oldU, 'abandoned reply'),
        {
          ...at(),
          type: 'system',
          subtype: 'compact_boundary',
          uuid: b,
          parentUuid: null,
          logicalParentUuid: oldA,
          compactMetadata: {
            preservedSegment: { headUuid: oldU, anchorUuid: sum, tailUuid: oldA },
          },
        },
        prompt(sum, b, 'Summary of abandoned', { isCompactSummary: true }),
        prompt(newU, a1, 'Kept branch'),
        reply(newA, newU, 'kept reply'),
      ];
    });
    await expectForkMatches(fixture, { upToMessageId: cut });
  });

  test('getSubagentMessages returns a message the subagent read', async () => {
    const { project, id, base, prompt, reply } = session('subagent-read');
    writeSession(project, id, conversation(id, project, 'Parent'));
    const subDir = join(projectDir(project), id, 'subagents');
    mkdirSync(subDir, { recursive: true });
    const [u, a1, q, a2] = Array.from({ length: 4 }, uuid);
    const lines: Line[] = [
      { ...prompt(u, null, 'Task'), isSidechain: true },
      { ...reply(a1, u, 'working'), isSidechain: true },
      {
        ...base,
        type: 'attachment',
        uuid: q,
        parentUuid: a1,
        isSidechain: true,
        attachment: { type: 'queued_command', prompt: 'message sent to the agent', isMeta: true },
      },
      { ...reply(a2, q, 'got it'), isSidechain: true },
    ];
    writeFileSync(
      join(subDir, 'agent-r1.jsonl'),
      lines.map((l) => `${JSON.stringify(l)}\n`).join('')
    );
    for (const page of [{}, { limit: 2 }, { offset: 2 }]) {
      const opts = { dir: project, ...page };
      const theirs = await official.getSubagentMessages(id, 'r1', opts);
      expect(await open.getSubagentMessages(id, 'r1', opts)).toEqual(theirs);
    }
    expect(
      JSON.stringify(await official.getSubagentMessages(id, 'r1', { dir: project }))
    ).toContain('message sent to the agent');
  });
});

// ---------------------------------------------------------------------------
// Subagents
// ---------------------------------------------------------------------------

describe('listSubagents / getSubagentMessages parity', () => {
  test('match official SDK', async () => {
    const project = makeProject(`subagents-${uuid()}`);
    const id = uuid();
    writeSession(project, id, conversation(id, project, 'Parent'));
    const subDir = join(projectDir(project), id, 'subagents');
    const nested = join(subDir, 'workflows', 'run-1');
    mkdirSync(nested, { recursive: true });

    const agentLines = (agentId: string): Line[] => {
      const [u, a, orphan] = [uuid(), uuid(), uuid()];
      return [
        {
          type: 'user',
          uuid: u,
          parentUuid: null,
          sessionId: id,
          agentId,
          isSidechain: true,
          message: { role: 'user', content: 'Task' },
        },
        {
          type: 'user',
          uuid: orphan,
          parentUuid: 'missing',
          sessionId: id,
          message: { role: 'user', content: 'Orphan' },
        },
        {
          type: 'assistant',
          uuid: a,
          parentUuid: u,
          sessionId: id,
          agentId,
          isSidechain: true,
          message: { id: 'm', role: 'assistant', content: [{ type: 'text', text: 'Done' }] },
        },
      ];
    };
    writeFileSync(
      join(subDir, 'agent-a1.jsonl'),
      agentLines('a1')
        .map((l) => `${JSON.stringify(l)}\n`)
        .join('')
    );
    writeFileSync(
      join(subDir, 'agent-a1.meta.json'),
      JSON.stringify({ toolUseId: 'toolu_01', parentAgentId: 'p-1' })
    );
    writeFileSync(
      join(nested, 'agent-b2.jsonl'),
      agentLines('b2')
        .map((l) => `${JSON.stringify(l)}\n`)
        .join('')
    );
    writeFileSync(join(nested, 'agent-b2.meta.json'), JSON.stringify({ toolUseId: 'bad id!' }));

    for (const options of [{ dir: project }, {}]) {
      expect(await open.listSubagents(id, options)).toEqual(
        await official.listSubagents(id, options)
      );
      for (const agentId of ['a1', 'b2', 'missing', '']) {
        for (const page of [{}, { limit: 1 }, { offset: 1 }]) {
          const opts = { ...options, ...page };
          const [ours, theirs] = await Promise.all([
            open.getSubagentMessages(id, agentId, opts),
            official.getSubagentMessages(id, agentId, opts),
          ]);
          expect({ agentId, opts, ours }).toEqual({ agentId, opts, ours: theirs });
        }
      }
    }
    expect(await open.listSubagents('not-a-uuid')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('runtime constants match official SDK', () => {
  test('values are identical', () => {
    const pick = (sdk: typeof open | typeof official) => ({
      EXIT_REASONS: sdk.EXIT_REASONS,
      HOOK_EVENTS: sdk.HOOK_EVENTS,
      SYSTEM_PROMPT_DYNAMIC_BOUNDARY: sdk.SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
      ORG_POLICY_LIMIT_PREFIXES: sdk.ORG_POLICY_LIMIT_PREFIXES,
      USAGE_LIMIT_ERROR_PREFIXES: sdk.USAGE_LIMIT_ERROR_PREFIXES,
      USAGE_TRANSITION_PREFIXES: sdk.USAGE_TRANSITION_PREFIXES,
      USAGE_WARNING_PREFIXES: sdk.USAGE_WARNING_PREFIXES,
    });
    expect(pick(open)).toEqual(pick(official));
  });

  test('AbortError is an Error subclass like official', () => {
    const err = new open.AbortError('stop');
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('stop');
    expect(err.name).toBe(new official.AbortError('stop').name);
  });
});
