# Lite Claude Agent SDK

A lightweight wrapper around Claude CLI - we're building a thin SDK that re-uses the local Claude binary instead of embedding it.

## What This Project Is

**Goal:** Compatible open source replacement for `@anthropic-ai/claude-agent-sdk`.

**Strategy:** Thin wrapper that spawns Claude CLI as subprocess and manages stdin/stdout communication via NDJSON protocol. We re-export types from official SDK for 100% type compatibility.

**Not:** A reimplementation of Claude CLI tools or protocol - we let CLI handle that.

## Project Structure

```
src/
  ├── api/
  │   ├── query.ts           # Main query() function
  │   └── QueryImpl.ts       # AsyncGenerator + control protocol
  ├── core/
  │   ├── detection.ts       # Find Claude CLI binary
  │   ├── spawn.ts           # Build args, spawn subprocess
  │   └── control.ts         # Handle canUseTool, hooks
  └── types/
      ├── index.ts           # Re-exports from official SDK
      └── control.ts         # Control protocol types

tests/
  ├── integration/           # Real tests (run with: bun test)
  ├── scratch/              # Development experiments (not tests)
  └── snapshots/            # NDJSON expected outputs

docs/
  ├── planning/             # ROADMAP, FEATURES, strategy docs
  ├── guides/               # IMPLEMENTATION_GUIDE, MIGRATION
  └── research/             # Protocol research, findings
```

## How to Work Here

### Running Code

```bash
# Run tests (our primary verification)
bun test tests/integration/

# Run example
bun examples/comparison-demo/server.ts

# Type check
bun run typecheck
```

### Making Changes

1. **Read before writing:** Always read the file you're about to modify
2. **Use existing patterns:** Follow the code style already in the codebase
3. **Integration tests:** Add test in `tests/integration/` for new features
4. **Update docs:** If adding features, update `docs/planning/FEATURES.md` status

### Testing Philosophy

- **Integration tests are primary** - We test the full subprocess communication
- **No mocking** - Tests spawn actual Claude CLI to verify real behavior
- **Snapshots for regression** - NDJSON files in `tests/snapshots/`

### Debugging Protocol Issues

**Proxy CLI technique** - When behavior differs from Official SDK:

1. Use the proxy CLI in `tests/utils/proxy-cli.js` to intercept messages
2. Run both SDKs through proxy: `pathToClaudeCodeExecutable: './tests/utils/proxy-cli.js'`
3. Compare logs in `tests/research/logs/` to see exact differences
4. See `docs/guides/REVERSE_ENGINEERING.md` for full guide

**Example:** This technique discovered the missing `systemPrompt: ""` field that caused 73% higher costs.

```bash
# Quick comparison
bun tests/research/compare-with-proxy.ts
```

**Research Directory Structure:**
- `tests/utils/proxy-cli.js` - The proxy interceptor (permanent tool)
- `tests/research/` - Active comparison tests
- `tests/research/archived/` - Historical one-off investigations
- `tests/research/performance/` - Performance research scripts

### What NOT to Do

- ❌ Don't implement tools (Read, Write, etc.) - CLI handles those
- ❌ Don't reimplement protocol - we're a thin wrapper
- ❌ Don't add features without updating `docs/planning/FEATURES.md`
- ❌ Don't mark features ✅ complete without integration tests

## Key Constraints

**Bundle size:** Must stay < 500KB. This is our #1 differentiator.

**Type compatibility:** Must re-export official SDK types identically.

**CLI dependency:** We assume Claude CLI is installed. Don't embed it.

## Code Conventions

**Already handled by Biome** - we run `biome check` in CI. Don't repeat style rules here.

**File references:** When referencing code, use `file:line` format:
- Example: "The control protocol is handled in src/core/control.ts:24"

## Current Status (Read First!)

**Implemented:** Baby Steps 1-5 complete
- ✅ One-shot queries
- ✅ Multi-turn (AsyncIterable + streamInput)
- ✅ Control protocol (stdin/stdout)
- ⚠️ canUseTool & hooks (code exists, needs tests - see docs/CORRECTIONS.md)

**Next:** Phase 0.5 (Validation) then Phase 1 (4 features)
- See `docs/planning/ROADMAP.md` for timeline
- See `docs/planning/FEATURES.md` for status matrix

## Tech Stack

**Runtime:** Bun (not Node.js)
- Use `bun test` not `jest`
- Use `bun <file>` not `node <file>`
- Bun auto-loads .env

**Types:** TypeScript
- Re-export from `@anthropic-ai/claude-agent-sdk` for compatibility
- Run `bun run typecheck` to verify

**Process spawning:** node:child_process (for cross-runtime compatibility)

## Documentation

When documenting features:
- Update `docs/planning/FEATURES.md` status (✅ ⚠️ ❌)
- Follow existing format in docs/guides/
- Don't create new docs without asking - we have a structure

For more context, see `docs/README.md` (documentation hub).
