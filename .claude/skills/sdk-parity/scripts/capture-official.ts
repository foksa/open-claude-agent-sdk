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
 *   --both          Capture both SDKs and print a diff of args + stdin
 *   --json          Print raw capture JSON (no human formatting)
 *   --prompt <txt>  Override the prompt sent (default: "test")
 */
import { capture, officialQuery, openQuery } from '../../../../tests/unit/compat/capture-utils.ts';

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
  process.exit(argDiff.onlyOpen.length || argDiff.onlyOfficial.length ? 1 : 0);
}

const sdk = flags.has('--open') ? openQuery : officialQuery;
const label = flags.has('--open') ? 'OPEN SDK' : 'OFFICIAL SDK';
const cap = await capture(sdk, prompt, options);

if (flags.has('--json')) {
  console.log(JSON.stringify(cap, null, 2));
  process.exit(0);
}
printCapture(label, cap);
