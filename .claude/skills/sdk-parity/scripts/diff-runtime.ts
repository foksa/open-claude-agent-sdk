#!/usr/bin/env bun
/**
 * Diff the official SDK's *runtime* (minified sdk.mjs) between two versions.
 *
 * Types, CLI args and the init message are covered by diff-exports.ts and
 * capture-official.ts. Behavior changes inside sdk.mjs (stdin lifecycle,
 * session readers, MCP server helpers, redaction) are not — and every one of
 * them matters for the parts we reimplement. This script finds them.
 *
 * Minifier renames make a plain diff useless, so short identifiers are
 * normalized away and statements are compared as multisets; what remains is
 * grouped by the enclosing function in each version.
 *
 * Usage:
 *   # 1. BEFORE bumping the dependency: snapshot the current version
 *   bun .claude/skills/sdk-parity/scripts/diff-runtime.ts snapshot
 *
 *   # 2. After `bun install`: what changed since the snapshot
 *   bun .claude/skills/sdk-parity/scripts/diff-runtime.ts diff [--from <version>] [--grep <regex>] [--all]
 *
 *   (Statements that look like bundled zod / settings-schema code are hidden
 *   unless --all; the count of hidden ones is printed.)
 *
 *   # Print a function's full source (current version, or a snapshot)
 *   bun .claude/skills/sdk-parity/scripts/diff-runtime.ts fn <name...> [--from <version>]
 *
 *   # Print source around a string (e.g. a control subtype or env var name)
 *   bun .claude/skills/sdk-parity/scripts/diff-runtime.ts around <text> [--from <version>] [--width 600]
 *
 * Snapshots live in $TMPDIR/sdk-parity-snapshots/<version>/. With no --from,
 * `diff` uses the newest snapshot older than the installed version.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '../../../..');
const SDK_DIR = resolve(REPO_ROOT, 'node_modules/@anthropic-ai/claude-agent-sdk');
const SNAPSHOT_ROOT = join(tmpdir(), 'sdk-parity-snapshots');
const FILES = ['sdk.mjs', 'sdk.d.ts', 'package.json'];

const argv = process.argv.slice(2);
const command = argv[0];
const flag = (name: string) => {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
};
const positional = argv.slice(1).filter((a, i, all) => !a.startsWith('--') && !all[i - 1]?.startsWith('--'));

const installedVersion = (): string =>
  JSON.parse(readFileSync(join(SDK_DIR, 'package.json'), 'utf8')).version;

const cmpVersion = (a: string, b: string) => {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return (pa[i] ?? 0) - (pb[i] ?? 0);
  return 0;
};

function snapshots(): string[] {
  if (!existsSync(SNAPSHOT_ROOT)) return [];
  return readdirSync(SNAPSHOT_ROOT)
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v) && existsSync(join(SNAPSHOT_ROOT, v, 'sdk.mjs')))
    .sort(cmpVersion);
}

/** sdk.mjs of a snapshot version, or of the installed SDK. */
function source(version?: string): { version: string; text: string } {
  if (!version) return { version: installedVersion(), text: readFileSync(join(SDK_DIR, 'sdk.mjs'), 'utf8') };
  const file = join(SNAPSHOT_ROOT, version, 'sdk.mjs');
  if (!existsSync(file)) {
    console.error(`No snapshot for ${version}. Available: ${snapshots().join(', ') || '(none)'}`);
    process.exit(2);
  }
  return { version, text: readFileSync(file, 'utf8') };
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

const KEEP = new Set(
  (
    'break case catch class const continue default delete do else export extends false finally for ' +
    'function if import in instanceof let new null of return super switch this throw true try typeof ' +
    'var void while with yield async await get set static Set Map Date JSON Math Error Array Object ' +
    'String Number Symbol Boolean RegExp Promise Buffer URL NaN'
  ).split(' ')
);

/**
 * Replace minified identifiers (≤4 chars, not a property access, not a
 * keyword/global) with `_`, and the SDK's own version string with `<ver>`,
 * leaving quoted strings intact.
 */
function normalize(code: string): string {
  return code
    .replace(
      /("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\.\s*)?(#?[A-Za-z_$][\w$]*)/g,
      (m, str, dot, id) => {
        if (str) return str;
        if (dot) return m;
        return id.length <= 4 && !KEEP.has(id) ? '_' : id;
      }
    )
    .replace(/\b0\.\d+\.\d+\b/g, '<ver>');
}

type Stmt = { offset: number; raw: string; norm: string };

/** Words that mark code our wrapper mirrors (ranking only). */
const RELEVANT =
  /subtype|control_|CLAUDE_|session|Session|mcp|Mcp|stdin|endInput|transport|parentUuid|uuid|attachment|queued|hook|permission|initialize|result|redact|Bearer|env\b/g;

/** Bundled zod internals and settings-schema builders — rarely what a parity update needs. */
const VENDOR_NOISE =
  /_zod\b|\.describe\(|\.optional\(\)|\.nullable\(\)|\bZod[A-Z]|issues|JSON Schema|\bu\.(?:str|int|bool|num)\(|\.safeParse\(|"~standard"/;

/** Split into statements at ; { } and normalize each (strings may split a bit; harmless). */
function statements(text: string): Stmt[] {
  const out: Stmt[] = [];
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    const c = text[i];
    if (i === text.length || c === ';' || c === '{' || c === '}') {
      const raw = text.slice(start, i).trim();
      if (raw.length > 0) {
        const norm = normalize(raw);
        // Skip fragments too short to mean anything
        if (norm.replace(/[\s_(),=!.?:]/g, '').length >= 12) out.push({ offset: start, raw, norm });
      }
      start = i + 1;
    }
  }
  return out;
}

/** Name of the function or method enclosing `offset`. */
function enclosingName(text: string, offset: number): string {
  const window = text.slice(Math.max(0, offset - 20000), offset);
  let best: { at: number; name: string } | undefined;
  for (const m of window.matchAll(/(?:function\s*\*?\s*([\w$]+)\s*\(|(?:^|[;{}])\s*(?:async\s+)?\*?([\w$#]+)\s*\([^()]*\)\s*\{|class\s+([\w$]+))/g)) {
    const name = m[1] ?? m[2] ?? `class ${m[3]}`;
    // `if (…) {`, `for (…) {`, `catch (…) {` look like methods
    if (KEEP.has(name)) continue;
    best = { at: m.index ?? 0, name };
  }
  return best?.name ?? '(top level)';
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function snapshot(): void {
  const version = installedVersion();
  const dir = join(SNAPSHOT_ROOT, version);
  mkdirSync(dir, { recursive: true });
  for (const f of FILES) copyFileSync(join(SDK_DIR, f), join(dir, f));
  console.log(`Snapshot of ${version} saved to ${dir}`);
}

function diff(): void {
  const current = source();
  let from = flag('--from');
  if (!from) {
    from = snapshots().filter((v) => cmpVersion(v, current.version) < 0).at(-1);
    if (!from) {
      console.error(
        `No snapshot older than installed ${current.version}. Run \`snapshot\` before bumping, ` +
          'or rebuild one: npm pack @anthropic-ai/claude-agent-sdk@<old> and unpack sdk.mjs into ' +
          `${SNAPSHOT_ROOT}/<old>/`
      );
      process.exit(2);
    }
  }
  const old = source(from);
  const grep = flag('--grep') ? new RegExp(flag('--grep') as string) : undefined;
  const showAll = argv.includes('--all');
  let hidden = 0;

  const oldStmts = statements(old.text);
  const newStmts = statements(current.text);
  const count = (list: Stmt[]) => {
    const m = new Map<string, number>();
    for (const s of list) m.set(s.norm, (m.get(s.norm) ?? 0) + 1);
    return m;
  };
  const oldCount = count(oldStmts);
  const newCount = count(newStmts);
  const only = (list: Stmt[], self: Map<string, number>, other: Map<string, number>) => {
    const budget = new Map<string, number>();
    for (const [k, v] of self) budget.set(k, Math.max(0, v - (other.get(k) ?? 0)));
    return list.filter((s) => {
      const left = budget.get(s.norm) ?? 0;
      if (left === 0) return false;
      budget.set(s.norm, left - 1);
      if (grep && !grep.test(s.raw)) return false;
      if (!showAll && VENDOR_NOISE.test(s.raw)) {
        hidden++;
        return false;
      }
      return true;
    });
  };
  const removed = only(oldStmts, oldCount, newCount);
  const added = only(newStmts, newCount, oldCount);

  const group = (list: Stmt[], text: string) => {
    const groups = new Map<string, Stmt[]>();
    for (const s of list) {
      const name = enclosingName(text, s.offset);
      const g = groups.get(name);
      if (g) g.push(s);
      else groups.set(name, [s]);
    }
    return groups;
  };
  /** Protocol/session/MCP/env code first: what our reimplementations mirror. */
  const score = (list: Stmt[]) =>
    list.reduce((n, s) => n + (s.raw.match(RELEVANT)?.length ?? 0), 0);
  const ranked = (groups: Map<string, Stmt[]>) =>
    [...groups].sort(([, a], [, b]) => score(b) - score(a) || b.length - a.length);
  const print = (label: string, groups: Map<string, Stmt[]>) => {
    console.log(`\n${'='.repeat(78)}\n${label}\n${'='.repeat(78)}`);
    const order = ranked(groups);
    console.log(
      `index (most relevant first): ${order
        .slice(0, 40)
        .map(([name, list]) => `${name}(${list.length})`)
        .join(' ')}${order.length > 40 ? ` … +${order.length - 40}` : ''}`
    );
    for (const [name, list] of order) {
      console.log(`\n-- in ${name} (${list.length})`);
      for (const s of list) console.log(`   ${s.raw.length > 240 ? `${s.raw.slice(0, 240)}…` : s.raw}`);
    }
  };

  console.log(`Runtime diff: ${old.version} → ${current.version}`);
  console.log(
    `${removed.length} statements removed, ${added.length} added (identifiers ≤4 chars normalized)` +
      (hidden > 0 ? `; ${hidden} vendored-schema statements hidden (--all shows them)` : '')
  );
  print(`REMOVED (only in ${old.version}) — names are ${old.version}'s`, group(removed, old.text));
  print(`ADDED (only in ${current.version}) — names are ${current.version}'s`, group(added, current.text));
  console.log(
    '\nNext: `fn <name>` (add `--from <old>` for the old side) to read a whole function. ' +
      'Large groups that read like the same code twice are usually reordering noise.'
  );
}

/** Full source of `function NAME(...) {...}`, brace-matched. */
function extractFunction(text: string, name: string): string | undefined {
  const re = new RegExp(`(?:async\\s+)?function\\s*\\*?\\s*${name.replace(/[$]/g, '\\$')}\\s*\\(`);
  const m = re.exec(text);
  if (!m) return undefined;
  // Skip the parameter list (it may hold destructuring braces)
  let i = m.index + m[0].length;
  for (let depth = 1; depth > 0 && i < text.length; i++) {
    if (text[i] === '(') depth++;
    else if (text[i] === ')') depth--;
  }
  const open = text.indexOf('{', i);
  for (let depth = 0, k = open; k < text.length; k++) {
    if (text[k] === '{') depth++;
    else if (text[k] === '}' && --depth === 0) return text.slice(m.index, k + 1);
  }
  return undefined;
}

function fn(): void {
  const { version, text } = source(flag('--from'));
  if (positional.length === 0) {
    console.error('Usage: fn <name...> [--from <version>]');
    process.exit(2);
  }
  for (const name of positional) {
    const body = extractFunction(text, name);
    console.log(`===== ${name} (${version})`);
    if (body) {
      console.log(body);
      continue;
    }
    // Not a function declaration: show its assignment instead (constants, arrow fns)
    const v = new RegExp(`[,;\\s{]${name.replace(/[$]/g, '\\$')}=`).exec(text);
    console.log(v ? `${text.slice(v.index + 1, v.index + 400)}…` : '(not found)');
  }
}

function around(): void {
  const { version, text } = source(flag('--from'));
  const needle = positional[0];
  if (!needle) {
    console.error('Usage: around <text> [--from <version>] [--width 600]');
    process.exit(2);
  }
  const width = Number(flag('--width') ?? 600);
  let at = text.indexOf(needle);
  let shown = 0;
  while (at !== -1 && shown < 10) {
    console.log(`----- ${version} @${at} in ${enclosingName(text, at)}`);
    console.log(text.slice(Math.max(0, at - width / 2), at + width / 2));
    shown++;
    at = text.indexOf(needle, at + Math.max(needle.length, width / 2));
  }
  if (shown === 0) console.log('(not found)');
}

switch (command) {
  case 'snapshot':
    snapshot();
    break;
  case 'diff':
    diff();
    break;
  case 'fn':
    fn();
    break;
  case 'around':
    around();
    break;
  default:
    console.error('Usage: diff-runtime.ts snapshot | diff [--from v] [--grep re] | fn <name...> [--from v] | around <text> [--from v]');
    process.exit(2);
}
