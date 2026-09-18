/**
 * Clean-install smoke test: pack the package, install the tarball into an
 * empty project (without @anthropic-ai/claude-agent-sdk), and import every
 * entry point under Node. Catches runtime imports of dev-only dependencies
 * and Bun-only APIs, which the in-repo test suite cannot see.
 *
 * Usage: bun run check:clean-install  (after `bun run build`)
 */

import { execFileSync } from 'node:child_process';
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
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '..');
// realpath: sessions are filed under the canonical project path (macOS /var → /private/var)
const work = realpathSync(mkdtempSync(join(tmpdir(), 'open-sdk-clean-install-')));

function run(cmd: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): string {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', env: { ...process.env, ...env } });
}

try {
  run('npm', ['pack', '--pack-destination', work, '--silent'], root);
  const tarball = readdirSync(work).find((f) => f.endsWith('.tgz'));
  if (!tarball) throw new Error('npm pack produced no tarball');

  const consumer = join(work, 'consumer');
  mkdirSync(consumer);
  writeFileSync(
    join(consumer, 'package.json'),
    JSON.stringify({ name: 'consumer', private: true, type: 'module' })
  );
  run('npm', ['install', '--silent', '--no-audit', '--no-fund', join(work, tarball)], consumer);

  if (existsSync(join(consumer, 'node_modules/@anthropic-ai/claude-agent-sdk'))) {
    throw new Error('@anthropic-ai/claude-agent-sdk was installed — it must not be a runtime dependency');
  }

  // Session fixture so the session helpers do real filesystem work under Node
  const configDir = join(work, 'config');
  const project = join(work, 'project');
  mkdirSync(project);
  const projectDir = join(configDir, 'projects', project.replace(/[^a-zA-Z0-9]/g, '-'));
  mkdirSync(projectDir, { recursive: true });
  const sessionId = '11111111-1111-4111-8111-111111111111';
  writeFileSync(
    join(projectDir, `${sessionId}.jsonl`),
    `${JSON.stringify({
      type: 'user',
      uuid: 'u1',
      parentUuid: null,
      sessionId,
      cwd: project,
      message: { role: 'user', content: 'hello from node' },
    })}\n`
  );

  const smoke = `
    const expectFns = (mod, names, label) => {
      for (const name of names) {
        if (mod[name] === undefined) throw new Error(label + ' is missing export ' + name);
      }
    };
    const main = await import('open-claude-agent-sdk');
    expectFns(main, [
      'query', 'tool', 'createSdkMcpServer', 'AbortError', 'HOOK_EVENTS', 'EXIT_REASONS',
      'SYSTEM_PROMPT_DYNAMIC_BOUNDARY', 'listSessions', 'getSessionMessages', 'getSessionInfo',
      'renameSession', 'tagSession', 'deleteSession', 'forkSession', 'listSubagents',
      'getSubagentMessages',
    ], 'main entry');
    expectFns(await import('open-claude-agent-sdk/query'), ['query'], './query');
    expectFns(await import('open-claude-agent-sdk/mcp'), ['tool', 'createSdkMcpServer'], './mcp');
    expectFns(await import('open-claude-agent-sdk/storage'), ['listSessions', 'renameSession'], './storage');

    const sessions = await main.listSessions({ dir: ${JSON.stringify(project)} });
    if (sessions.length !== 1 || sessions[0].summary !== 'hello from node') {
      throw new Error('listSessions under Node returned ' + JSON.stringify(sessions));
    }
    const messages = await main.getSessionMessages(${JSON.stringify(sessionId)}, { dir: ${JSON.stringify(project)} });
    if (messages.length !== 1) throw new Error('getSessionMessages under Node returned ' + messages.length);
    console.log('clean install OK: all entry points import under Node, session helpers work');
  `;
  process.stdout.write(
    run('node', ['--input-type=module', '-e', smoke], consumer, { CLAUDE_CONFIG_DIR: configDir })
  );

  // Types: with the official SDK added as the README says (optional peer,
  // --omit=optional), our declarations must resolve and actually type-check
  const officialVersion = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
    .devDependencies['@anthropic-ai/claude-agent-sdk'];
  run(
    'npm',
    [
      'install',
      '--silent',
      '--no-audit',
      '--no-fund',
      '--omit=optional',
      '-D',
      `@anthropic-ai/claude-agent-sdk@${officialVersion}`,
      'typescript@5',
      '@types/node',
    ],
    consumer
  );
  const nativeBinary = readdirSync(join(consumer, 'node_modules/@anthropic-ai')).filter((d) =>
    d.startsWith('claude-agent-sdk-')
  );
  if (nativeBinary.length > 0) {
    throw new Error(`--omit=optional still installed native packages: ${nativeBinary.join(', ')}`);
  }
  writeFileSync(
    join(consumer, 'check.ts'),
    `import { query, type Options, type SDKMessage } from 'open-claude-agent-sdk';
const options: Options = { model: 'haiku', maxTurns: 1 };
// @ts-expect-error unknown option must be rejected (proves types are not \`any\`)
const bad: Options = { notARealOption: true };
export async function run(): Promise<string[]> {
  const types: string[] = [];
  for await (const message of query({ prompt: 'hi', options })) {
    const m: SDKMessage = message;
    types.push(m.type);
  }
  void bad;
  return types;
}
`
  );
  writeFileSync(
    join(consumer, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        module: 'nodenext',
        moduleResolution: 'nodenext',
        target: 'es2022',
        lib: ['esnext', 'dom'],
        types: ['node'],
        noEmit: true,
      },
      files: ['check.ts'],
    })
  );
  run('npx', ['tsc', '-p', '.'], consumer);
  console.log('types OK: declarations resolve with the official SDK as an optional peer');
} finally {
  rmSync(work, { recursive: true, force: true });
}
