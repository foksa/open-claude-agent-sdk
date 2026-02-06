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
  ├── tools/
  │   ├── capture-cli.cjs    # Captures CLI args + stdin for testing
  │   └── proxy-cli.cjs      # Proxy interceptor for debugging
  └── types/
      ├── index.ts           # Re-exports from official SDK
      └── control.ts         # Control protocol types

tests/
  ├── integration/           # Real tests (run with: bun test)
  ├── unit/                 # Unit tests (SDK compatibility)
  ├── scratch/              # Development experiments (not tests)
  └── snapshots/            # NDJSON expected outputs

docs/
  ├── planning/             # ROADMAP, FEATURES, gap analysis
  ├── guides/               # IMPLEMENTATION_GUIDE, MIGRATION
  ├── research/             # Protocol research, findings
  ├── official-agent-sdk-docs/  # Downloaded official SDK docs (reference)
  ├── analysis/             # Codebase analysis (architecture, coverage)
  └── api/                  # API documentation
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

1. Use the proxy CLI in `src/tools/proxy-cli.cjs` to intercept messages
2. Run both SDKs through proxy: `pathToClaudeCodeExecutable: './src/tools/proxy-cli.cjs'`
3. Compare logs to see exact differences

**Test utilities:**
- `src/tools/capture-cli.cjs` - Captures CLI args + stdin for unit tests
- `src/tools/proxy-cli.cjs` - Proxy interceptor for debugging protocol

### What NOT to Do

- ❌ Don't implement tools (Read, Write, etc.) - CLI handles those
- ❌ Don't reimplement protocol - we're a thin wrapper
- ❌ Don't add features without updating `docs/planning/FEATURES.md`
- ❌ Don't mark features ✅ complete without integration tests
- ❌ **Don't guess how CLI flags or protocol work** - always verify first

### CRITICAL: Always Check Official SDK Behavior First

**Before implementing ANY feature, verify how the official SDK actually does it:**

1. **Use the capture CLI** to see exact CLI args and stdin messages:
   ```bash
   # Run official SDK through capture CLI
   bun -e "
   import { query } from '@anthropic-ai/claude-agent-sdk';
   for await (const msg of query({
     prompt: 'test',
     options: {
       pathToClaudeCodeExecutable: './tests/utils/capture-cli.cjs',
       // ... your options here
     }
   })) { if (msg.type === 'result') break; }
   "
   # Check captured output
   cat /tmp/capture-*.json
   ```

2. **Compare both SDKs** in unit tests (`tests/unit/sdk-compatibility.test.ts`):
   - CLI args must match
   - Stdin messages must match

3. **Compare both SDKs** in integration tests:
   - Run same query with both SDKs
   - Verify same behavior/output

**Why?** We're wrapping CLI - if we guess wrong about flags or protocol, our implementation silently breaks. Unit tests that verify our invented implementation are useless. Only tests that compare against official SDK catch real issues.

## Key Constraints

**Bundle size:** Must stay < 500KB. This is our #1 differentiator.

**Type compatibility:** Must re-export official SDK types identically.

**CLI dependency:** We assume Claude CLI is installed. Don't embed it.

## Code Conventions

**Already handled by Biome** - we run `biome check` in CI. Don't repeat style rules here.

**File references:** When referencing code, use `file:line` format:
- Example: "The control protocol is handled in src/core/control.ts:24"

## Current Status (Read First!)

**Implemented:**
- ✅ One-shot queries
- ✅ Multi-turn (AsyncIterable + streamInput)
- ✅ Control protocol (stdin/stdout)
- ✅ Skills, commands, structured outputs, system prompts
- ✅ MCP control methods
- ⚠️ canUseTool & hooks (code exists, needs tests)

**See:** `docs/planning/FEATURES.md` for full status matrix

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
- Use existing directories (see Project Structure above)
