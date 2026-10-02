#!/usr/bin/env bun
/**
 * Print the official SDK's release notes for every version after the one we
 * pin, up to a target (default: latest on npm).
 *
 * Usage:
 *   bun .claude/skills/sdk-parity/scripts/release-notes.ts            # pinned → latest
 *   bun .claude/skills/sdk-parity/scripts/release-notes.ts 0.3.290    # pinned → 0.3.290
 *   bun .claude/skills/sdk-parity/scripts/release-notes.ts --from 0.3.280 0.3.285
 *
 * Needs `gh` (authenticated) and `npm`.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PKG = '@anthropic-ai/claude-agent-sdk';
const REPO = 'anthropics/claude-agent-sdk-typescript';
const REPO_ROOT = resolve(import.meta.dir, '../../../..');

const argv = process.argv.slice(2);
const fromIdx = argv.indexOf('--from');
const pinned = JSON.parse(readFileSync(resolve(REPO_ROOT, 'package.json'), 'utf8'))
  .devDependencies[PKG] as string;
const from = fromIdx >= 0 ? argv[fromIdx + 1] : pinned.replace(/^[^\d]*/, '');
const target = argv.filter((a, i) => !a.startsWith('--') && argv[i - 1] !== '--from')[0];

const cmp = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
};

const published = JSON.parse(
  execFileSync('npm', ['view', PKG, 'versions', '--json'], { encoding: 'utf8' })
) as string[];
const stable = published.filter((v) => /^\d+\.\d+\.\d+$/.test(v)).sort(cmp);
const to = target ?? stable.at(-1);
if (!to) throw new Error('No published versions found');
const range = stable.filter((v) => cmp(v, from) > 0 && cmp(v, to) <= 0);

console.log(`# ${PKG}: ${from} → ${to} (${range.length} release${range.length === 1 ? '' : 's'})`);
if (range.length === 0) process.exit(0);

for (const version of range) {
  let body: string;
  try {
    body = execFileSync(
      'gh',
      ['release', 'view', `v${version}`, '-R', REPO, '--json', 'body', '-q', '.body'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
  } catch {
    body = '(no GitHub release found — published to npm only)';
  }
  // Drop the boilerplate install section
  body = body.replace(/\n## Update[\s\S]*$/, '').trim();
  console.log(`\n## ${version}\n\n${body}`);
}
