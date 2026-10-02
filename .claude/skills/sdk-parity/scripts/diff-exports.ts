#!/usr/bin/env bun
/**
 * Diff exports between the official @anthropic-ai/claude-agent-sdk and ours.
 *
 * Types come from our re-export barrel (src/types/index.ts); runtime values
 * from src/index.ts, where we implement them ourselves (never re-exported —
 * the official SDK is only an optional peer).
 *
 * Output sections:
 *   - MISSING:     exported by official, neither re-exported nor implemented by us — act on these
 *   - EXTRA:       re-exported by us, but no longer in official (renamed/removed) — investigate
 *   - UNSUPPORTED: official runtime values we deliberately leave out (informational)
 *   - LOCAL:       defined locally in our barrel (with --verbose)
 *
 * Usage:
 *   bun .claude/skills/sdk-parity/scripts/diff-exports.ts
 *   bun .claude/skills/sdk-parity/scripts/diff-exports.ts --json
 *   bun .claude/skills/sdk-parity/scripts/diff-exports.ts --verbose
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '../../../..');
const OFFICIAL_DTS = resolve(REPO_ROOT, 'node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts');
const OUR_BARREL = resolve(REPO_ROOT, 'src/types/index.ts');
const OUR_ENTRY = resolve(REPO_ROOT, 'src/index.ts');

/**
 * Official runtime values we deliberately don't provide. Keep in sync with
 * docs/planning/FEATURES.md ("Not Implemented" / "What We Don't Need").
 */
const UNSUPPORTED = new Set([
  'startup',
  'prewarm',
  'resolveSettings',
  'filterEscalatingDefaultMode',
  'InMemorySessionStore',
  'importSessionToStore',
  'foldSessionSummary',
]);

/** Drop `//` and block comments so they don't glue onto the next name. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
}

function namesInBlock(block: string): string[] {
  return stripComments(block)
    .split(',')
    .map((raw) => raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/).at(-1)?.trim() ?? '')
    .filter(Boolean);
}

function parseOfficialExports(source: string): Set<string> {
  const out = new Set<string>();
  // export declare (type|interface|class|function|const) NAME
  const re = /^export declare (?:type|interface|class|function|const)\s+([A-Za-z0-9_]+)/gm;
  for (const m of source.matchAll(re)) out.add(m[1]);
  return out;
}

function parseBarrel(source: string): { reExported: Set<string>; local: Set<string> } {
  const reExported = new Set<string>();
  const local = new Set<string>();

  // export type? { A, B } from '@anthropic-ai/claude-agent-sdk'
  const blockRe =
    /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"]@anthropic-ai\/claude-agent-sdk['"]/g;
  for (const m of source.matchAll(blockRe)) for (const n of namesInBlock(m[1])) reExported.add(n);

  // Local declarations and re-exports from our own modules (informational)
  const localRe = /^export\s+(?:type|interface|class|const|function)\s+([A-Za-z0-9_]+)/gm;
  for (const m of source.matchAll(localRe)) local.add(m[1]);
  const otherBlockRe =
    /export\s+(?:type\s+)?\{([^}]+)\}\s+from\s+['"](?!@anthropic-ai\/claude-agent-sdk)[^'"]+['"]/g;
  for (const m of source.matchAll(otherBlockRe)) for (const n of namesInBlock(m[1])) local.add(n);

  return { reExported, local };
}

/** Runtime values src/index.ts exports (our own implementations). */
function parseRuntimeExports(source: string): Set<string> {
  const out = new Set<string>();
  const clean = stripComments(source);
  for (const m of clean.matchAll(/export\s+\{([^}]+)\}/g)) {
    for (const n of namesInBlock(m[1])) out.add(n);
  }
  for (const m of clean.matchAll(/^export\s+(?:const|function|class|async function)\s+([A-Za-z0-9_]+)/gm)) {
    out.add(m[1]);
  }
  return out;
}

const official = parseOfficialExports(readFileSync(OFFICIAL_DTS, 'utf8'));
const { reExported, local } = parseBarrel(readFileSync(OUR_BARREL, 'utf8'));
const runtime = parseRuntimeExports(readFileSync(OUR_ENTRY, 'utf8'));

const provided = (n: string) => reExported.has(n) || runtime.has(n) || local.has(n);
const missing = [...official].filter((n) => !provided(n) && !UNSUPPORTED.has(n)).sort();
const unsupported = [...official].filter((n) => !provided(n) && UNSUPPORTED.has(n)).sort();
const extra = [...reExported].filter((n) => !official.has(n)).sort();

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ missing, extra, unsupported, local: [...local].sort() }, null, 2));
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

console.log(`Official exports:          ${official.size}`);
console.log(`Re-exported types:         ${reExported.size}`);
console.log(`Runtime values we provide: ${[...runtime].filter((n) => official.has(n)).length}`);

fmt('MISSING (in official, not provided by us)', missing);
fmt('EXTRA (we re-export, but not in official)', extra);
fmt('UNSUPPORTED (deliberately left out)', unsupported);
if (process.argv.includes('--verbose')) fmt('LOCAL (defined in our barrel)', [...local].sort());

process.exit(missing.length > 0 || extra.length > 0 ? 1 : 0);
