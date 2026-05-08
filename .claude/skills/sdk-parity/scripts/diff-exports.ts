#!/usr/bin/env bun
/**
 * Diff exports between the official @anthropic-ai/claude-agent-sdk and
 * our re-export barrel at src/types/index.ts.
 *
 * Output: three sections
 *   - Missing: exported by official, NOT re-exported by us
 *   - Extra:   re-exported by us, but no longer in official (renamed/removed)
 *   - Local:   defined locally in our barrel (informational, not a parity issue)
 *
 * Usage:
 *   bun .claude/skills/sdk-parity/scripts/diff-exports.ts
 *   bun .claude/skills/sdk-parity/scripts/diff-exports.ts --json
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '../../../..');
const OFFICIAL_DTS = resolve(
  REPO_ROOT,
  'node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts',
);
const OUR_BARREL = resolve(REPO_ROOT, 'src/types/index.ts');

function parseOfficialExports(source: string): Set<string> {
  const out = new Set<string>();
  // Matches: export declare (type|interface|class|function|const) NAME
  const re = /^export declare (?:type|interface|class|function|const)\s+([A-Za-z0-9_]+)/gm;
  for (const m of source.matchAll(re)) out.add(m[1]);
  return out;
}

function parseBarrelReExports(source: string): {
  reExported: Set<string>;
  localOrInternal: Set<string>;
} {
  const reExported = new Set<string>();
  const localOrInternal = new Set<string>();

  // Block re-exports from official: `export type? { A, B } from '@anthropic-ai/claude-agent-sdk'`
  const blockRe =
    /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]@anthropic-ai\/claude-agent-sdk['"]/g;
  for (const m of source.matchAll(blockRe)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) reExported.add(name);
    }
  }

  // Local declarations (informational): `export type/interface/class/const/function NAME`
  // and re-exports from non-official paths (e.g. '../mcp.ts').
  const localRe =
    /^export\s+(?:type|interface|class|const|function)\s+([A-Za-z0-9_]+)/gm;
  for (const m of source.matchAll(localRe)) localOrInternal.add(m[1]);

  const otherBlockRe =
    /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](?!@anthropic-ai\/claude-agent-sdk)[^'"]+['"]/g;
  for (const m of source.matchAll(otherBlockRe)) {
    for (const raw of m[1].split(',')) {
      const name = raw.trim().split(/\s+as\s+/)[0].trim();
      if (name) localOrInternal.add(name);
    }
  }

  return { reExported, localOrInternal };
}

const officialSrc = readFileSync(OFFICIAL_DTS, 'utf8');
const barrelSrc = readFileSync(OUR_BARREL, 'utf8');

const official = parseOfficialExports(officialSrc);
const { reExported, localOrInternal } = parseBarrelReExports(barrelSrc);

const missing = [...official].filter((n) => !reExported.has(n)).sort();
const extra = [...reExported].filter((n) => !official.has(n)).sort();
const local = [...localOrInternal].sort();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ missing, extra, local }, null, 2));
  process.exit(missing.length > 0 || extra.length > 0 ? 1 : 0);
}

const fmt = (label: string, items: string[]) => {
  if (items.length === 0) {
    console.log(`\n${label}: (none)`);
    return;
  }
  console.log(`\n${label} (${items.length}):`);
  for (const n of items) console.log(`  - ${n}`);
};

console.log(`Official exports:    ${official.size}`);
console.log(`Re-exported by us:   ${reExported.size}`);
console.log(`Local in our barrel: ${local.length}`);

fmt('MISSING (in official, not re-exported)', missing);
fmt('EXTRA (we re-export, but not in official)', extra);

if (process.argv.includes('--verbose')) fmt('LOCAL (defined in our barrel)', local);

process.exit(missing.length > 0 || extra.length > 0 ? 1 : 0);
