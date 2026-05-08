# Open Claude Agent SDK

Compatible open source replacement for `@anthropic-ai/claude-agent-sdk`.

**Strategy:** Thin wrapper that spawns Claude CLI as a subprocess and manages stdin/stdout via NDJSON. Types are re-exported from the official SDK for 100% compatibility.

**Not:** A reimplementation of CLI tools or the protocol — the CLI handles those.

## Project Structure

```
src/
  api/
    query.ts           # Main query() function
    QueryImpl.ts       # AsyncGenerator + control protocol
  core/
    detection.ts       # Find Claude CLI binary
    spawn.ts           # Build args, spawn subprocess
    control.ts         # Handle canUseTool, hooks
  tools/
    capture-cli.cjs    # Captures CLI args + stdin for testing
    proxy-cli.cjs      # Proxy interceptor for debugging
  types/
    index.ts           # Re-exports from official SDK
    control.ts         # Control protocol types

tests/
  integration/         # Real tests — spawn actual Claude CLI, no mocking
  unit/                # SDK compatibility (cli args + stdin must match official)
  scratch/             # Dev experiments (not tests)
  snapshots/           # NDJSON expected outputs

docs/
  api/                 # API.md, OPTIONS.md, CONTROL_METHODS.md
  guides/              # MIGRATION, REVERSE_ENGINEERING
  planning/            # FEATURES.md (feature status matrix)
```

## CRITICAL: Verify Official SDK Behavior Before Implementing

We're wrapping a CLI we don't control. Guessing at flags or protocol means our implementation silently breaks. Tests that only check our invented implementation are useless — only comparison against the official SDK catches real issues.

**Before implementing any feature:**

1. **Capture official SDK's CLI args + stdin** using `src/tools/capture-cli.cjs`:
   ```bash
   bun -e "
   import { query } from '@anthropic-ai/claude-agent-sdk';
   for await (const msg of query({
     prompt: 'test',
     options: {
       pathToClaudeCodeExecutable: './tests/utils/capture-cli.cjs',
       // ... your options
     }
   })) { if (msg.type === 'result') break; }
   "
   cat /tmp/capture-*.json
   ```

2. **Add a unit test** in `tests/unit/sdk-compatibility.test.ts` — CLI args and stdin messages must match the official SDK exactly.

3. **Add an integration test** that runs the same query through both SDKs and compares behavior.

**Proxy CLI for protocol debugging** — when behavior differs from the official SDK, set `pathToClaudeCodeExecutable: './src/tools/proxy-cli.cjs'` on both SDKs and diff the logs.

**Official SDK source** lives at `node_modules/@anthropic-ai/claude-agent-sdk/sdk.mjs` (minified) — read it to confirm how the official SDK does something.

## Constraints

- **Bundle size < 500KB** — our #1 differentiator. Don't pull in heavy deps.
- **Type compatibility** — re-export official SDK types identically.
- **CLI dependency** — we assume Claude CLI is installed. Don't embed it.
- **No tool reimplementation** — Read/Write/etc. are the CLI's job.

## Releases

Releases are automated. Do **not** run `npm publish` manually.

1. `bun run bump X.Y.Z` — updates the version in `package.json`, `src/index.ts`, and `src/query.ts` (these must stay in sync; `tests/unit/index.test.ts` enforces it).
2. Commit.
3. `gh release create vX.Y.Z --generate-notes` (or via the GitHub UI).
4. `.github/workflows/publish.yml` runs CI, builds, and publishes to npm with provenance.

## Feature Status

`docs/planning/FEATURES.md` is the source of truth. Update its ✅/⚠️/❌ status when adding features. Don't mark ✅ without an integration test.

## Tech Stack Notes

- **Bun** runtime — `bun test`, `bun <file>`. Bun auto-loads `.env`.
- **`node:child_process`** for spawning (cross-runtime compat).
- **Biome** handles style — enforced in CI, no need to repeat rules here.
