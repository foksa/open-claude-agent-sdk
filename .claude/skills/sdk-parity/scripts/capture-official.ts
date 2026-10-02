#!/usr/bin/env bun
/**
 * Capture CLI args + stdin sent by an SDK for a given options object.
 *
 * Wraps tests/unit/compat/capture-utils.ts so parity runs don't have to
 * inline the same `bun -e "import { query }..."` boilerplate every time.
 *
 * Usage:
 *   bun .claude/skills/sdk-parity/scripts/capture-official.ts '{"newOption":"value"}'
 *   bun .claude/skills/sdk-parity/scripts/capture-official.ts --open '{"newOption":"value"}'
 *   bun .claude/skills/sdk-parity/scripts/capture-official.ts --both '{"newOption":"value"}'
 *   bun .claude/skills/sdk-parity/scripts/capture-official.ts --json '{}'
 *   echo '{"newOption":"value"}' | bun .claude/skills/sdk-parity/scripts/capture-official.ts
 *
 * Flags:
 *   --open          Use our SDK instead of the official one
 *   --both          Capture both SDKs and diff args, CLAUDE_CODE_* env and stdin messages
 *   --json          Print raw capture JSON (no human formatting)
 *   --prompt <txt>  Override the prompt sent (default: "test")
 */
import {
  capture,
  normalizeMessage,
  officialQuery,
  openQuery,
} from '../../../../tests/unit/compat/capture-utils.ts';

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--') && !a.includes('=')));
const positional = argv.filter((a) => !a.startsWith('--'));

let promptIdx = argv.indexOf('--prompt');
const prompt = promptIdx >= 0 ? argv[promptIdx + 1] : 'test';
if (promptIdx >= 0) positional.splice(positional.indexOf(argv[promptIdx + 1]), 1);

const optionsJson = positional[0] ?? (process.stdin.isTTY ? '{}' : await Bun.stdin.text());

let options: Record<string, unknown>;
try {
  options = JSON.parse(optionsJson || '{}');
} catch (e) {
  console.error(`Failed to parse options JSON: ${(e as Error).message}`);
  console.error(`Got: ${optionsJson}`);
  process.exit(2);
}

function printCapture(label: string, cap: { args: string[]; stdin: unknown[] }) {
  console.log(`\n=== ${label} ===`);
  console.log(`\nCLI args (${cap.args.length}):`);
  for (const a of cap.args) console.log(`  ${a}`);
  console.log(`\nStdin messages (${cap.stdin.length}):`);
  for (const m of cap.stdin) console.log(`  ${JSON.stringify(m)}`);
}

if (flags.has('--both')) {
  const [open, official] = await Promise.all([
    capture(openQuery, prompt, options),
    capture(officialQuery, prompt, options),
  ]);
  if (flags.has('--json')) {
    console.log(JSON.stringify({ open, official }, null, 2));
    process.exit(0);
  }
  printCapture('OPEN SDK', open);
  printCapture('OFFICIAL SDK', official);

  const argDiff = {
    onlyOpen: open.args.filter((a) => !official.args.includes(a)),
    onlyOfficial: official.args.filter((a) => !open.args.includes(a)),
  };
  console.log('\n=== ARG DIFF ===');
  console.log(`only in open:     ${argDiff.onlyOpen.join(' ') || '(none)'}`);
  console.log(`only in official: ${argDiff.onlyOfficial.join(' ') || '(none)'}`);

  // Env the SDK sets for the CLI (capture-cli records CLAUDE_CODE_* / CLAUDECODE)
  const openEnv = open.env ?? {};
  const officialEnv = official.env ?? {};
  const envDiff = [...new Set([...Object.keys(openEnv), ...Object.keys(officialEnv)])]
    .sort()
    .filter((k) => openEnv[k] !== officialEnv[k])
    .map((k) => `${k}: open=${openEnv[k] ?? '(unset)'} official=${officialEnv[k] ?? '(unset)'}`);
  console.log('\n=== ENV DIFF ===');
  console.log(envDiff.length ? envDiff.join('\n') : '(none)');

  // Stdin messages, paired in order, ignoring ids/timestamps
  const key = (m: { type?: string; request?: { subtype?: string } }) =>
    m.request?.subtype ?? m.type ?? '?';
  const stdinDiff: string[] = [];
  const openOrder = open.stdin.map(key).join(',');
  const officialOrder = official.stdin.map(key).join(',');
  if (openOrder !== officialOrder) {
    stdinDiff.push(`order: open=[${openOrder}] official=[${officialOrder}]`);
  }
  const comparable = (m: (typeof open.stdin)[number] | undefined) =>
    m ? JSON.stringify(sortKeys(normalizeMessage(m))) : '(missing)';
  for (let i = 0; i < Math.max(open.stdin.length, official.stdin.length); i++) {
    const a = comparable(open.stdin[i]);
    const b = comparable(official.stdin[i]);
    if (a !== b) {
      stdinDiff.push(
        `#${i} (${key(official.stdin[i] ?? open.stdin[i])}):\n  open:     ${a}\n  official: ${b}`
      );
    }
  }
  console.log('\n=== STDIN DIFF (ids/timestamps ignored, key order ignored) ===');
  console.log(stdinDiff.length ? stdinDiff.join('\n') : '(none)');

  const differs =
    argDiff.onlyOpen.length || argDiff.onlyOfficial.length || envDiff.length || stdinDiff.length;
  process.exit(differs ? 1 : 0);
}

/** Recursively sort object keys so key order doesn't count as a difference. */
function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, sortKeys((value as Record<string, unknown>)[k])])
    );
  }
  return value;
}

const sdk = flags.has('--open') ? openQuery : officialQuery;
const label = flags.has('--open') ? 'OPEN SDK' : 'OFFICIAL SDK';
const cap = await capture(sdk, prompt, options);

if (flags.has('--json')) {
  console.log(JSON.stringify(cap, null, 2));
  process.exit(0);
}
printCapture(label, cap);
