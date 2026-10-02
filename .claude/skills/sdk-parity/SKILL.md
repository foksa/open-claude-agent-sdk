---
name: sdk-parity
description: Automate SDK parity updates — bump the official @anthropic-ai/claude-agent-sdk dependency, discover new features, implement them, add tests, and update docs. Use when updating to match a new version of the official Claude Agent SDK.
argument-hint: "[target-version]"
disable-model-invocation: true
---

# SDK Parity Update

Update `@anthropic-ai/claude-agent-sdk` to the target version (or latest), implement new features, add tests.

An update has three kinds of change, and each needs its own tool:

| Change | Found by |
|--------|----------|
| New/changed types | `diff-exports.ts` (Step 3) |
| New CLI args, env, init fields, control requests | `capture-official.ts` (Step 4) |
| Behavior changes inside the official runtime (`sdk.mjs`) | `diff-runtime.ts` (Step 5) |

The third kind is easy to miss and often the biggest: we reimplement parts of the official runtime (see Step 5), so an upstream fix there is ours to port.

## Step 1: Discover What Changed

1. **Snapshot the installed official SDK before anything else** — Step 5 diffs against it, and `bun install` overwrites it:
   ```bash
   bun .claude/skills/sdk-parity/scripts/diff-runtime.ts snapshot
   ```
2. Release notes for every version from our pin to the target (`$ARGUMENTS` if given, else latest):
   ```bash
   bun .claude/skills/sdk-parity/scripts/release-notes.ts $ARGUMENTS
   ```
3. Sort each release-note item into **SDK-side** (the official TS SDK changed: options, args, env, init, control methods, runtime helpers) or **CLI-side** ("parity with Claude Code vX", CLI behavior — no wrapper change, we run whatever CLI is installed). When unsure, Step 5 settles it: if `sdk.mjs` didn't change around it, it's CLI-side.

## Step 2: Bump Dependency

1. Update version in `package.json` devDependencies, the `peerDependencies` range (`^X.Y.Z`), and `COMPATIBLE_SDK_VERSION` in `src/constants.ts` to match (`tests/unit/index.test.ts` enforces all three)
2. `bun install` (this rewrites the SDK's entries in `bun.lock`, which is expected — commit it with the bump)
3. `bun run typecheck` — fix any breakage before proceeding

## Step 3: Inspect New Types

Use the bundled diff script — don't write your own. It parses `sdk.d.ts` and compares against `src/types/index.ts`:

```bash
bun .claude/skills/sdk-parity/scripts/diff-exports.ts
```

Output sections (runtime values we implement in `src/index.ts` count as provided):
- **MISSING** — exported by the official SDK, neither re-exported nor implemented by us. Each is one of:
  - A new type → add to the appropriate section in `src/types/index.ts`
  - A new runtime function or constant → implement it ourselves (constants go in `src/constants.ts`, typed against the official declaration) and export it from `src/index.ts`. **Never** `export { value } from '@anthropic-ai/claude-agent-sdk'` — the official SDK is only an optional peer for types, so a runtime import breaks every clean install. `bun run check:clean-install` enforces this.
  - Something we decide not to support → add it to `UNSUPPORTED` in the script and to `docs/planning/FEATURES.md`
- **EXTRA** — we re-export something that no longer exists upstream. Likely renamed or removed; investigate each one.
- **UNSUPPORTED** — runtime values we deliberately leave out (`startup`, `prewarm`, `resolveSettings`, the session-store helpers…). Informational.

The script exits non-zero while MISSING or EXTRA is non-empty.

For types referenced in the `SDKMessage` union but NOT individually `export declare type`'d in `sdk.d.ts`, the diff won't catch them. Define those locally with a comment explaining why — see `SDKRateLimitEvent` and `SDKPromptSuggestionMessage` as examples.

After updating re-exports: `bun run typecheck`.

## Step 4: Verify Features with Capture CLI

**Do this BEFORE implementing any new option.** If we guess at how the official SDK encodes a feature, our wrapper silently disagrees with the CLI it's wrapping.

Use the bundled capture script — pass the option you're investigating as JSON:

```bash
bun .claude/skills/sdk-parity/scripts/capture-official.ts '{"newOption":"value"}'
```

Useful flags:
- `--open` — capture our SDK instead of the official one
- `--both` — capture both and diff CLI args, the `CLAUDE_CODE_*` env the SDK sets, and every stdin message (ids/timestamps/key order ignored); exits non-zero on any difference. Run `--both '{}'` once after every bump: default behavior changes (e.g. v0.3.286 stopped sending `--permission-mode default`; v0.3.284 added `CLAUDE_CODE_SDK_READS_SESSION_STATE`) show up here with no new option involved
- `--json` — raw capture JSON for piping/grepping
- `--prompt <text>` — override the prompt (default: `test`)

Classify each feature by checking the captured output:

| Check | Location in capture output | Category |
|-------|---------------------------|----------|
| New entry in `args` array | CLI args | **A — CLI flag** |
| New field in init message (`request.subtype === 'initialize'`) | stdin | **B — Init message field** |
| New control request in stdin | stdin | **C — Control protocol method** |
| New/changed env var | env | **A — set it in `src/api/ProcessFactory.ts`** |
| None of the above | — | **D — Type re-export only** (unless Step 5 finds a runtime change) |

A control method the official SDK has on its runtime `Query` class but not in the public `Query` type (e.g. `listPermissionRules`, `getTaskOutput`) won't show up in `sdk.d.ts` — Step 5's `around '<subtype>'` finds it. Implement it anyway, cast past the type in the compat test.

## Step 5: Diff the Official Runtime

```bash
bun .claude/skills/sdk-parity/scripts/diff-runtime.ts diff            # vs the Step 1 snapshot
bun .claude/skills/sdk-parity/scripts/diff-runtime.ts diff --grep 'session|queued'
bun .claude/skills/sdk-parity/scripts/diff-runtime.ts fn SEe xC       # full source, new version
bun .claude/skills/sdk-parity/scripts/diff-runtime.ts fn Lhe --from 0.3.283   # old version
bun .claude/skills/sdk-parity/scripts/diff-runtime.ts around 'get_task_output'
```

`diff` normalizes minifier renames and prints changed statements grouped by enclosing function, most protocol/session/MCP-relevant first (bundled zod/settings-schema noise hidden; `--all` shows it). Read the index line, then `fn` the interesting functions in both versions and compare. No snapshot (forgot Step 1)? Rebuild one: `npm pack @anthropic-ai/claude-agent-sdk@<old>`, unpack, copy `sdk.mjs` into `$TMPDIR/sdk-parity-snapshots/<old>/`.

**Areas we reimplement — any change here must be ported:**

| Official runtime | Ours | Parity tests |
|------------------|------|--------------|
| Query lifecycle: when stdin closes, run end, abort, stderr, `session_state_changed` | `src/api/QueryImpl.ts`, `src/api/ProcessFactory.ts` (env) | `tests/unit/lifecycle.test.ts` (fake CLI scripts through both SDKs) |
| Session readers/writers: `getSessionMessages`, `forkSession`, `getSubagentMessages`, `listSessions`, mutations | `src/sessions/*` (`transcript.ts` holds the chain logic) | `tests/unit/session-parity.test.ts` (shared JSONL fixtures, results compared) |
| `createSdkMcpServer` / `tool`, in-process MCP transport, manifest capture | `src/mcp.ts`, `src/core/mcpBridge.ts`, `src/core/mcpManifests.ts` | `tests/unit/mcp-bridge.test.ts`, `tests/unit/compat/mcp-servers.test.ts` |
| Stderr redaction | `src/core/redact.ts` | `tests/unit/redact.test.ts` |
| Option validation, warnings | `src/api/QueryImpl.ts` (`validateOptions`) | `tests/unit/compat/*` |
| Exported constants (`EXIT_REASONS`, `HOOK_EVENTS`, …) | `src/constants.ts` | `session-parity.test.ts` ("runtime constants") |

Port the official logic faithfully — same order, same edge cases — and comment where we deliberately differ.

## Step 6: Implement Features

### A) CLI Flags → `src/core/argBuilder.ts`

**Simple flags** — add to `FLAG_MAP` array:

```typescript
{ key: 'optionName', flag: '--flag-name', type: 'string' }   // string pass-through
{ key: 'optionName', flag: '--flag-name', type: 'number' }   // number → string
{ key: 'optionName', flag: '--flag-name', type: 'boolean' }  // present when truthy
{ key: 'optionName', flag: '--no-flag',   type: 'boolean-inverted' } // present when false
{ key: 'optionName', flag: '--flag-name', type: 'csv' }      // array → comma-separated
{ key: 'optionName', flag: '--flag-name', type: 'repeated' } // array → one flag per element
```

**Complex flags** — add explicit handling after the `applyFlagMap(args, options)` call. See `thinking`, `effort`, `canUseTool`, `sandbox` as examples.

### B) Init Message Fields → `src/api/protocolInit.ts`

In `sendProtocolInit()`:
1. Add the field to the `request` type annotation
2. Add conditional spread: `...(options.newField !== undefined && { newField: options.newField })`

### C) Control Protocol Methods — 3 files

1. `src/types/control.ts` — add subtype constant, request type, add to `ControlRequestInner` union
2. `src/core/control.ts` — add to `OutboundControlRequest` union, add builder to `ControlRequests`, handle in `handleControlRequest` switch
3. `src/api/QueryImpl.ts` — add method that calls `this.controlManager.sendControlRequestWithResponse()`

### D) Type Re-exports Only → `src/types/index.ts`

Add to the appropriate section (Hook Types, MCP Types, Message Types, etc.).

### E) Runtime Ports → the files in the Step 5 table

Read the old and new official function (`diff-runtime.ts fn <name> --from <old>` / `fn <name>`), port the difference into our counterpart, and note the version in a comment (`// v0.3.284: …`). Keep our structure; match the official behavior, edge cases included.

## Step 7: Add Tests

**Every new test must fail on the old code.** After writing it, run it once against the committed source and confirm it fails, then restore:

```bash
git stash push -- src && bun test <file> -t '<name>'; git stash pop
```

A parity fixture that passes on both old and new code proves nothing — reshape it until it reproduces what the release note fixed. (Stash only the files involved if a partial stash breaks imports.)

### Unit tests — `tests/unit/spawn.test.ts`

```typescript
test('includes --new-flag when specified', () => {
  const args = buildCliArgs({ newOption: 'value' });
  expect(args).toContain('--new-flag');
  expect(args).toContain('value');
});
```

### Compat tests for CLI args — `tests/unit/compat/cli-args.test.ts`

```typescript
test.concurrent('newOption args match official SDK', async () => {
  const [open, official] = await Promise.all([
    capture(openQuery, 'test', { newOption: 'value' }),
    capture(officialQuery, 'test', { newOption: 'value' }),
  ]);
  expect(open.args).toContain('--new-flag');
  expect(official.args).toContain('--new-flag');
}, { timeout: 60000 });
```

### Compat tests for init message fields — `tests/unit/compat/stdin-messages.test.ts`

```typescript
test.concurrent('newOption in init message matches official SDK', async () => {
  const [open, official] = await Promise.all([
    capture(openQuery, 'test', { newOption: true }),
    capture(officialQuery, 'test', { newOption: true }),
  ]);
  const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
  const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');
  expect(openInit?.request?.newOption).toBe(true);
  expect(officialInit?.request?.newOption).toBe(true);
}, { timeout: 60000 });
```

### Compat tests for control methods — `tests/unit/compat/stdin-messages.test.ts`

```typescript
test.concurrent('newMethod stdin messages match', async () => {
  const [open, official] = await Promise.all([
    captureWithQuery(openQuery, 'test', async (q) => { await q.newMethod('arg'); }),
    captureWithQuery(officialQuery, 'test', async (q) => { await q.newMethod('arg'); }),
  ]);
  const openReq = open.stdin.find((m) => m.request?.subtype === 'new_method');
  const officialReq = official.stdin.find((m) => m.request?.subtype === 'new_method');
  expect(openReq).toBeTruthy();
  expect(officialReq).toBeTruthy();
  if (openReq && officialReq) {
    expect(normalizeMessage(openReq)).toEqual(normalizeMessage(officialReq));
  }
}, { timeout: 60000 });
```

### Type export tests — `tests/unit/type-exports.test.ts`

Add a `describe` block for the new version:

```typescript
describe('vX.Y.Z type re-exports', () => {
  test('NewType is importable', () => {
    const val: import('../../src/types/index.ts').NewType = { /* minimal valid shape */ };
    expect(val.someField).toBe('expected');
  });
});
```

### Integration tests — `tests/integration/`

```typescript
testWithBothSDKs('new option produces valid response', async (sdk) => {
  const messages = await runWithSDK(sdk, 'prompt', { newOption: 'value', maxTurns: 1 });
  const result = expectSuccessResult(messages);
  expect(result).toBeDefined();
});
```

Helpers: `testWithBothSDKs`, `runWithSDK` from `tests/integration/comparison-utils.ts`; `expectSuccessResult` from `tests/integration/test-helpers.ts`.

### Runtime parity tests

Use the harness from the Step 5 table: session fixtures run through `open.*` and `official.*` and compare results/written files; lifecycle tests run a fake bash CLI through both SDKs (in bash, give a background job stdin explicitly: `cmd <&0 &`, or it reads `/dev/null`).

## Step 8: Update Docs

Update `docs/planning/FEATURES.md`:
- Add new feature rows with status: ✅ (E2E tested), 🔌 (protocol tested), ⚠️ (unit tested), ❌ (not implemented)
- Update "Last Updated" date

## Step 9: Verify

```bash
bun run typecheck
bun run check
bun test tests/unit/spawn.test.ts
bun test tests/unit/type-exports.test.ts
bun test tests/unit/compat/cli-args.test.ts
bun test tests/unit/compat/stdin-messages.test.ts
bun run ci
```

Integration tests (run outside a Claude Code session to avoid nested session errors; they cost money — run the relevant files once, in the background, logging to a file):

```bash
env -u CLAUDECODE bun test tests/integration/<relevant-test>.test.ts > /tmp/integration-output.txt 2>&1
```

**If only `[open]` fails**, check which CLI each SDK ran: the official SDK runs its bundled binary (`node_modules/@anthropic-ai/claude-agent-sdk-<platform>-<arch>/claude`), we run `claude` from PATH. A wrapper on PATH (e.g. cmux's `claude` shim, which holds permission prompts) or a different CLI version explains a hang or difference the official side doesn't show — rerun with `pathToClaudeCodeExecutable` set to the bundled binary before calling it a bug. Also rerun on the committed code (`git stash push -- src`) to tell a regression from a pre-existing failure.

**Protocol debugging** — when behavior differs, run both SDKs through the proxy and diff the logs:

```typescript
options: {
  pathToClaudeCodeExecutable: './src/tools/proxy-cli.cjs',
  env: { ...process.env, PROXY_LOG_LABEL: 'open' }, // or 'official'
}
// logs: tests/research/logs/proxy-<label>-<timestamp>-<pid>.log
```

The proxy runs the official SDK's bundled binary (override with `PROXY_REAL_CLI`). Note the `init` tool list depends on which MCP servers from user settings have connected yet — a count difference between two single runs is usually timing.

## Key Files

| File | Role |
|------|------|
| `package.json` | SDK version pin |
| `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` | Official type definitions (read after bump) |
| `src/types/index.ts` | Type re-exports from official SDK |
| `src/core/argBuilder.ts` | CLI flag building (`FLAG_MAP` + explicit handling) |
| `src/api/protocolInit.ts` | Init message fields sent to CLI |
| `src/types/control.ts` | Control protocol request types |
| `src/core/control.ts` | Control request builders + inbound handler |
| `src/api/QueryImpl.ts` | Query control methods |
| `src/tools/capture-cli.cjs` | Mock CLI that captures args and stdin |
| `.claude/skills/sdk-parity/scripts/release-notes.ts` | Release notes from our pin to the target (`gh` + `npm`) |
| `.claude/skills/sdk-parity/scripts/diff-exports.ts` | Diff official `sdk.d.ts` vs our `src/types/index.ts` + `src/index.ts` |
| `.claude/skills/sdk-parity/scripts/capture-official.ts` | Capture CLI args + env + stdin for an option set (`--open` / `--both` diff) |
| `.claude/skills/sdk-parity/scripts/diff-runtime.ts` | Snapshot / diff / read functions of the official minified runtime |
| `src/tools/proxy-cli.cjs` | Logs live stdin/stdout between an SDK and the real CLI |
| `tests/unit/spawn.test.ts` | Unit tests for `buildCliArgs` |
| `tests/unit/type-exports.test.ts` | Type importability tests |
| `tests/unit/compat/cli-args.test.ts` | CLI arg parity tests (open vs official) |
| `tests/unit/compat/stdin-messages.test.ts` | Stdin message parity tests |
| `tests/unit/compat/capture-utils.ts` | `capture()`, `captureWithQuery()`, `normalizeMessage()` |
| `tests/integration/comparison-utils.ts` | `testWithBothSDKs()`, `runWithSDK()` |
| `tests/integration/test-helpers.ts` | `expectSuccessResult()` |
| `docs/planning/FEATURES.md` | Feature status matrix |
