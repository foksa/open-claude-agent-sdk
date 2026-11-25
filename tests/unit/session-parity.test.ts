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
  readdirSync,
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
// archiveSession / unarchiveSession (v0.3.325)
// ---------------------------------------------------------------------------

describe('archiveSession / unarchiveSession parity (v0.3.325)', () => {
  const markOf = (project: string, id: string) =>
    readFileSync(join(projectDir(project), id, 'archived.json'), 'utf8').replace(
      /"at":"[^"]+"/,
      '"at":"<now>"'
    );

  async function infoBoth(project: string, id: string) {
    const [ours, theirs] = [
      await open.listSessions({ dir: project }),
      await official.listSessions({ dir: project }),
    ];
    expect(ours).toEqual(theirs);
    const [oi, ti] = [
      await open.getSessionInfo(id, { dir: project }),
      await official.getSessionInfo(id, { dir: project }),
    ];
    expect(oi).toEqual(ti);
    return ti?.archived;
  }

  for (const by of ['open', 'official'] as const) {
    test(`archive, prompt, unarchive written by ${by} read the same through both`, async () => {
      const sdk = by === 'open' ? open : official;
      const project = makeProject(`archive-${by}-${uuid()}`);
      const id = uuid();
      const file = writeSession(project, id, conversation(id, project, 'Archive me'));
      expect(await infoBoth(project, id)).toBeUndefined();

      for (const dir of [project, undefined]) {
        await sdk.archiveSession(id, dir ? { dir } : undefined);
        expect(markOf(project, id)).toBe('{"archived":true,"at":"<now>","by":"sdk"}');
        expect(await infoBoth(project, id)).toBe(true);
      }

      // A prompt sent after archiving unarchives it; a tool result or meta row doesn't
      const later = '2099-01-01T00:00:00.000Z';
      const original = readFileSync(file, 'utf8');
      for (const [line, archived] of [
        [
          {
            type: 'user',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: later,
            message: {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: 't', content: 'x' }],
            },
          },
          true,
        ],
        [
          {
            type: 'user',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: later,
            isMeta: true,
            message: { role: 'user', content: 'meta' },
          },
          true,
        ],
        [
          {
            type: 'user',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: later,
            origin: { kind: 'peer' },
            message: { role: 'user', content: 'peer' },
          },
          true,
        ],
        [
          {
            type: 'user',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: later,
            message: { role: 'user', content: '<command-message>x</command-message>' },
          },
          false,
        ],
        [
          {
            type: 'attachment',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: later,
            attachment: { type: 'queued_command', prompt: 'queued' },
          },
          false,
        ],
        [
          {
            type: 'user',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: later,
            message: { role: 'user', content: 'typed later' },
          },
          false,
        ],
        [
          {
            type: 'user',
            uuid: uuid(),
            parentUuid: null,
            sessionId: id,
            timestamp: '2001-01-01T00:00:00.000Z',
            message: { role: 'user', content: 'typed before' },
          },
          true,
        ],
      ] as const) {
        writeFileSync(file, `${original}${JSON.stringify(line)}\n`);
        expect({ line, archived: await infoBoth(project, id) }).toEqual({ line, archived });
      }
      writeFileSync(file, original);

      await sdk.unarchiveSession(id, { dir: project });
      expect(markOf(project, id)).toBe('{"archived":false,"at":"<now>","by":"sdk"}');
      expect(await infoBoth(project, id)).toBe(false);
    });
  }

  test('a hand-written or malformed mark reads the same', async () => {
    const project = makeProject(`archive-marks-${uuid()}`);
    const id = uuid();
    writeSession(project, id, conversation(id, project, 'Marks'));
    const markDir = join(projectDir(project), id);
    mkdirSync(markDir, { recursive: true });
    for (const mark of [
      '{"archived":true,"at":"2030-01-01T00:00:00+02:00"}',
      '{"archived":true,"at":"2030-01-01T00:00:00"}',
      '{"archived":true,"at":"2030-02-30T00:00:00Z"}',
      '{"archived":"yes","at":"2030-01-01T00:00:00Z"}',
      '{"archived":true}',
      `{"archived":true,"at":"2030-01-01T00:00:00Z","pad":"${'x'.repeat(5000)}"}`,
      'not json',
    ]) {
      writeFileSync(join(markDir, 'archived.json'), mark);
      const theirs = await official.getSessionInfo(id, { dir: project });
      expect({ mark, ours: await open.getSessionInfo(id, { dir: project }) }).toEqual({
        mark,
        ours: theirs,
      });
    }
  });

  test('errors match official', async () => {
    const project = makeProject(`archive-errors-${uuid()}`);
    const missing = uuid();
    const store = {} as official.SessionStore;
    const cases: [string, (sdk: typeof open | typeof official) => Promise<unknown>][] = [
      ['invalid', (sdk) => sdk.archiveSession('nope')],
      ['missing dir', (sdk) => sdk.archiveSession(missing, { dir: project })],
      ['missing all', (sdk) => sdk.unarchiveSession(missing)],
      ['store', (sdk) => sdk.archiveSession(missing, { sessionStore: store })],
      ['store + invalid', (sdk) => sdk.unarchiveSession('nope', { sessionStore: store })],
    ];
    for (const [name, run] of cases) {
      const [ours, theirs] = [await settle(() => run(open)), await settle(() => run(official))];
      expect({ name, ours }).toEqual({ name, ours: theirs });
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
        // Per-session fields a fork clears (turnAttributionKey: v0.3.316)
        summarizedTurnPromptUuids: [u1],
        droppedPromptUuids: [u1],
        turnAttributionKey: 'turn-key',
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
      {
        type: 'content-replacement',
        sessionId: id,
        // Only plain objects are carried into the fork (v0.3.322)
        replacements: [{ from: 'a', to: 'b' }, 'not-an-object', null, ['x'], 7],
      },
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

  // -------------------------------------------------------------------------
  // v0.3.323–v0.3.332
  // -------------------------------------------------------------------------

  test('v0.3.323: a prompt queued right after a compaction summary is returned', async () => {
    const { project, id, at, prompt, reply, queued } = session('queued-after-summary');
    const [u1, a1, b, sum, q] = Array.from({ length: 5 }, uuid);
    writeSession(project, id, [
      prompt(u1, null, 'Kept prompt'),
      reply(a1, u1, 'kept reply'),
      {
        ...at(),
        type: 'system',
        subtype: 'compact_boundary',
        uuid: b,
        parentUuid: null,
        logicalParentUuid: a1,
        compactMetadata: { preservedSegment: { headUuid: u1, anchorUuid: sum, tailUuid: a1 } },
      },
      prompt(sum, b, 'Summary', { isCompactSummary: true }),
      queued(q, sum, { prompt: 'queued after the summary' }),
    ]);
    const theirs = JSON.stringify(await expectMessagesMatch(project, id));
    expect(theirs).toContain('queued after the summary');
  });

  function compactedFork(name: string) {
    const ids = Array.from({ length: 6 }, uuid);
    const [u1, a1, b, sum, u2, a2] = ids;
    const fixture = forkFixture(name, ({ at, prompt, reply }) => [
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
          durationMs: 1200,
          postTokens: 900,
          runningTurnSends: [u2],
          preservedMessages: { uuids: [u1, a1], anchorUuid: sum, allUuids: [u1, a1] },
        },
      },
      prompt(sum, b, 'Summary', { isCompactSummary: true }),
      prompt(u2, a1, 'After compaction'),
      reply(a2, u2, 'new reply'),
    ]);
    return { fixture, b, sum };
  }

  test('v0.3.323: forkSession at a compaction summary leaves out the messages kept after it', async () => {
    const { fixture, sum } = compactedFork('fork-at-summary');
    const history = JSON.stringify(await expectForkMatches(fixture, { upToMessageId: sum }));
    expect(history).toContain('Summary');
    expect(history).not.toContain('old reply');
  });

  test('v0.3.323: forkSession at a compaction boundary keeps the conversation before it', async () => {
    const { fixture, b } = compactedFork('fork-at-boundary');
    const history = JSON.stringify(await expectForkMatches(fixture, { upToMessageId: b }));
    expect(history).toContain('old reply');
  });

  test('v0.3.323: forkSession drops runningTurnSends and carries the request session', async () => {
    const { fixture } = compactedFork('fork-running-sends');
    await expectForkMatches(fixture);
    const forks = readdirSync(projectDir(fixture.project)).filter(
      (n) => n !== `${fixture.id}.jsonl`
    );
    for (const name of forks) {
      const text = readFileSync(join(projectDir(fixture.project), name), 'utf8');
      expect(text).not.toContain('runningTurnSends');
      expect(text).toContain(`"requestSessionId":"${fixture.id}"`);
    }
  });

  test('v0.3.323+: forkSession carries data flow, lineage, owner and organization rows', async () => {
    const [u1, a1, u2, a2, b] = Array.from({ length: 5 }, uuid);
    const fixture = forkFixture('fork-data-flow', ({ id, at, prompt, reply }) => {
      const other = uuid();
      return [
        {
          type: 'hybrid-organization',
          sessionId: id,
          organizationUuid: 'ABCDEF00-0000-4000-8000-000000000001',
        },
        { type: 'hybrid-organization', sessionId: id, organizationUuid: 'not-a-uuid' },
        {
          type: 'session-owner',
          sessionId: id,
          accountUuid: 'acct-1',
          organizationUuid: 'org-1',
          restricted: ['ldr', 'x'],
        },
        { type: 'session-owner', sessionId: id, accountUuid: 'acct-2', restricted: ['ldr'] },
        { ...prompt(u1, null, 'Start'), dataFlowOn: true },
        { ...reply(a1, u1, 'ok'), forkedFrom: { sessionId: other, messageUuid: uuid() } },
        {
          type: 'data-flow-records',
          v: 1,
          sessionId: id,
          records: [
            { tool_name: 'Read', tool_use_id: 'toolu_1', source: { type: 'file', id: null } },
            {
              tool_name: 'Read',
              tool_use_id: 'toolu_1',
              source: { type: 'file', id: null },
              no_message: true,
            },
            { tool_name: 'WebFetch', event_id: 'event_1', web: [[0], [1, 0, 2]] },
            {
              tool_name: 'mcp__x__y',
              tool_use_id: 'toolu_2',
              inner_call_index: 3,
              server: {
                type: 'claude_ai_connector',
                id: 'mcpsrv_01ABCDEFGHJKLMNPQRSTUVWX',
                directory_id: null,
              },
              plugin_id: 'bad plugin',
              touched: { kind: 'memory', id: 'm1', action: 'write', to: 'm2' },
            },
            { response_id: 'msg_01abc', mark_sent_by: id },
            { response_id: 'msg_02def', listed: ['msg_01abc'] },
            { tool_name: 'Bad' },
            'garbage',
          ],
        },
        { type: 'data-flow-incomplete', sessionId: id, codes: [7, 300, 'x'] },
        {
          type: 'data-flow-records',
          v: 1,
          sessionId: other,
          records: [{ tool_name: 'Grep', tool_use_id: 'toolu_9' }],
        },
        { type: 'data-flow-records', v: 2, sessionId: id, records: [] },
        {
          type: 'derived-from',
          v: 1,
          sessionId: id,
          sessions: [
            { type: 'claude_code_session', id: other, via: 'clear', started: '2020-01-01' },
            { type: 'unknown', id: null, via: 'import' },
            { type: 'nope', id: 'x', via: 'fork' },
          ],
        },
        { type: 'tools-used', sessionId: id, tools: ['Read', '', 3, 'Grep'] },
        {
          ...at(),
          type: 'system',
          subtype: 'compact_boundary',
          uuid: b,
          parentUuid: a1,
          compactMetadata: { trigger: 'auto' },
        },
        prompt(u2, b, 'Continue'),
        reply(a2, u2, 'done'),
      ];
    });
    await expectForkMatches(fixture);
    await expectForkMatches(fixture, { upToMessageId: a1 });
  });

  test('v0.3.323+: reader shows host-run tool calls, voice-call turns and drops quiet-turn replies', async () => {
    const { project, id, base, at, prompt, reply } = session('host-rows');
    const [u1, a1, r1, a2, r2, v1, a3, a4] = Array.from({ length: 8 }, uuid);
    const [h1, h2] = [uuid(), uuid()];
    writeSession(project, id, [
      prompt(u1, null, 'Start'),
      {
        ...at(),
        type: 'assistant',
        uuid: a1,
        parentUuid: u1,
        hostHiddenToolUseIds: ['toolu_A'],
        message: {
          id: 'msg_a1',
          role: 'assistant',
          content: [
            { type: 'text', text: 'running' },
            { type: 'tool_use', id: 'toolu_A', name: 'Workflow', input: {} },
          ],
        },
      },
      {
        ...base,
        type: 'host-row',
        ranByToolUseId: 'toolu_A',
        rowUuid: h1,
        timestamp: '2020-01-01T00:00:30.000Z',
        block: { type: 'tool_use', id: 'toolu_H', name: 'Bash', input: { command: 'ls' } },
      },
      {
        ...base,
        type: 'host-row',
        ranByToolUseId: 'toolu_A',
        rowUuid: h2,
        block: { type: 'tool_result', tool_use_id: 'toolu_H', content: 'files' },
      },
      prompt(r1, a1, [{ type: 'tool_result', tool_use_id: 'toolu_A', content: 'done' }]),
      {
        ...at(),
        type: 'assistant',
        uuid: a2,
        parentUuid: r1,
        message: {
          id: 'msg_a2',
          role: 'assistant',
          content: [{ type: 'tool_use', id: 'toolu_B', name: 'Edit', input: {} }],
        },
      },
      prompt(r2, a2, [{ type: 'tool_result', tool_use_id: 'toolu_B', content: 'no' }], {
        toolDenialKind: 'user-rejected',
        toolResultRewritten: true,
      }),
      {
        ...at(),
        type: 'system',
        subtype: 'voice_call_talk',
        uuid: v1,
        parentUuid: r2,
        level: 'info',
        content: 'spoken words',
        origin: { kind: 'voice-call' },
      },
      {
        ...at(),
        type: 'assistant',
        uuid: a3,
        parentUuid: v1,
        closesQuietTurn: true,
        message: {
          id: 'msg_a3',
          role: 'assistant',
          content: [{ type: 'text', text: 'No response requested.' }],
        },
      },
      reply(a4, a3, 'fin'),
    ]);
    const theirs = JSON.stringify(await expectMessagesMatch(project, id));
    expect(theirs).toContain('toolu_H');
    expect(theirs).toContain('spoken words');
    expect(theirs).toContain('"rewritten_by_plugin":true');
    expect(theirs).not.toContain('No response requested.');
  });

  test('task notification origins keep a valid runId and mcp-task kind', async () => {
    const { project, id, prompt, reply, queued } = session('run-id');
    const [u1, a1, q1, a2, q2, a3] = Array.from({ length: 6 }, uuid);
    writeSession(project, id, [
      prompt(u1, null, 'Start'),
      reply(a1, u1, 'ok'),
      queued(q1, a1, {
        prompt: 'task done',
        origin: { kind: 'task-notification', runId: 'run-1', taskKind: 'mcp-task' },
      }),
      reply(a2, q1, 'noted'),
      queued(q2, a2, { prompt: 'other task', commandMode: 'task-notification', runId: 'run:2' }),
      reply(a3, q2, 'noted again'),
    ]);
    const theirs = JSON.stringify(await expectMessagesMatch(project, id));
    expect(theirs).toContain('"runId":"run-1"');
    expect(theirs).toContain('"runId":"run:2"');
  });

  test('v0.3.323: titles, tag and last prompt come from entries of their own type', async () => {
    const project = makeProject(`typed-fields-${uuid()}`);
    const id = uuid();
    writeSession(project, id, [
      ...conversation(id, project, 'Typed fields'),
      { type: 'custom-title', customTitle: 'Real title', sessionId: id },
      { type: 'summary', customTitle: 'Not a title', tag: 'not-a-tag', sessionId: id },
      { type: 'tag', tag: 'real-tag', sessionId: id },
      { type: 'other', aiTitle: 'Stray', sessionId: id },
      { type: 'last-prompt', lastPrompt: 'Last prompt', sessionId: id },
      { type: 'x', gitBranch: 'feature', sessionId: id },
    ]);
    const id2 = uuid();
    writeSession(project, id2, [
      ...conversation(id2, project, 'No title'),
      { type: 'summary', customTitle: 'Not a title', sessionId: id2 },
      { type: 'last-prompt', lastPrompt: 'Only prompt', sessionId: id2 },
    ]);
    const [ours, theirs] = [
      await open.listSessions({ dir: project }),
      await official.listSessions({ dir: project }),
    ];
    expect(theirs.find((s) => s.sessionId === id)?.tag).toBe('real-tag');
    expect(theirs.find((s) => s.sessionId === id2)?.customTitle).toBeUndefined();
    expect(ours).toEqual(theirs);
    for (const sid of [id, id2]) {
      expect(await open.getSessionInfo(sid, { dir: project })).toEqual(
        await official.getSessionInfo(sid, { dir: project })
      );
    }
    const fixture = { project, id, known: new Set([id]) };
    await expectForkMatches(fixture);
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
      BUILTIN_TOOL_NAMES: sdk.BUILTIN_TOOL_NAMES,
      LEGACY_TOOL_NAME_ALIASES: sdk.LEGACY_TOOL_NAME_ALIASES,
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
