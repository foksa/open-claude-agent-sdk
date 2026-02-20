---
name: sdk-parity
description: Automate SDK parity updates — bump the official @anthropic-ai/claude-agent-sdk dependency, discover new features, implement them, add tests, and update docs. Use when updating to match a new version of the official Claude Agent SDK.
argument-hint: "[target-version]"
disable-model-invocation: true
---

# SDK Parity Update

Update `@anthropic-ai/claude-agent-sdk` to the target version (or latest), implement new features, add tests.

## Step 1: Discover What Changed

1. Read current pinned version from `package.json` (`devDependencies["@anthropic-ai/claude-agent-sdk"]`)
2. Fetch release notes: https://github.com/anthropics/claude-agent-sdk-typescript/releases
3. If `$ARGUMENTS` specifies a version, use that as target; otherwise use latest
4. Summarize new features, types, and options between current and target

## Step 2: Bump Dependency

1. Update version in `package.json` devDependencies
2. `bun install`
3. `bun run typecheck` — fix any breakage before proceeding

## Step 3: Inspect New Types

1. Read `node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts` — search for new `export declare type` entries
2. Compare against current re-exports in `src/types/index.ts`
3. Add missing re-exports to the appropriate section
4. For types referenced in the `SDKMessage` union but NOT individually exported (no `export declare type` statement), define them locally with a comment explaining why — see `SDKRateLimitEvent` and `SDKPromptSuggestionMessage` as examples
5. `bun run typecheck`

## Step 4: Verify Features with Capture CLI

**CRITICAL — do this BEFORE implementing any new option.**

Run the official SDK through capture-cli to see exact CLI args and stdin:

```bash
rm -f /tmp/capture-*.json && bun -e "
import { query } from '@anthropic-ai/claude-agent-sdk';
const q = query({
  prompt: 'test',
  options: {
    pathToClaudeCodeExecutable: './src/tools/capture-cli.cjs',
    NEW_OPTION: VALUE,
  }
});
for await (const msg of q) { if (msg.type === 'result') break; }
" 2>/dev/null && cat /tmp/capture-*.json
```

Classify each feature by checking the captured output:

| Check | Location in capture output | Category |
|-------|---------------------------|----------|
| New entry in `args` array | CLI args | **A — CLI flag** |
| New field in init message (`request.subtype === 'initialize'`) | stdin | **B — Init message field** |
| New control request in stdin | stdin | **C — Control protocol method** |
| None of the above | — | **D — Type re-export only** |

## Step 5: Implement Features

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

## Step 6: Add Tests

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

## Step 7: Update Docs

Update `docs/planning/FEATURES.md`:
- Add new feature rows with status: ✅ (E2E tested), 🔌 (protocol tested), ⚠️ (unit tested), ❌ (not implemented)
- Update "Last Updated" date

## Step 8: Verify

```bash
bun run typecheck
bun run check
bun test tests/unit/spawn.test.ts
bun test tests/unit/type-exports.test.ts
bun test tests/unit/compat/cli-args.test.ts
bun test tests/unit/compat/stdin-messages.test.ts
bun run ci
```

Integration tests (run outside a Claude Code session to avoid nested session errors):

```bash
env -u CLAUDECODE bun test tests/integration/<relevant-test>.test.ts
```

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
| `tests/unit/spawn.test.ts` | Unit tests for `buildCliArgs` |
| `tests/unit/type-exports.test.ts` | Type importability tests |
| `tests/unit/compat/cli-args.test.ts` | CLI arg parity tests (open vs official) |
| `tests/unit/compat/stdin-messages.test.ts` | Stdin message parity tests |
| `tests/unit/compat/capture-utils.ts` | `capture()`, `captureWithQuery()`, `normalizeMessage()` |
| `tests/integration/comparison-utils.ts` | `testWithBothSDKs()`, `runWithSDK()` |
| `tests/integration/test-helpers.ts` | `expectSuccessResult()` |
| `docs/planning/FEATURES.md` | Feature status matrix |
