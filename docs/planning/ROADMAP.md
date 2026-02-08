# Lite Claude Agent SDK - Development Roadmap

**Last Updated:** 2026-02-07
**Current Status:** Core features working; gaps in test coverage and some untested features

---

## Current State

The SDK has protocol-level parity with the official `@anthropic-ai/claude-agent-sdk` — all CLI flags and init message fields are correctly passed. However, many features only have protocol-level verification (CLI args match), not behavioral E2E tests.

**See [FEATURES.md](./FEATURES.md) for the honest feature matrix.**

### What's Solid (E2E tested)
- Core query flow (one-shot, multi-turn, streaming, abort)
- Session management (resume, fork, continue, sessionId)
- Structured outputs, extended thinking, skills/commands
- canUseTool callback (7 behavioral tests)
- PreToolUse/PostToolUse/UserPromptSubmit hooks
- SubagentStart/SubagentStop hooks
- Subagent invocation (`agents` option, `parent_tool_use_id`, abort)
- In-process MCP servers (`createSdkMcpServer()`, `tool()`)
- Cost tracking, system prompts, permission modes

### What's Protocol-Only (likely works, not E2E verified)
- MCP control methods — `reconnectMcpServer()`, `toggleMcpServer()`, `setMcpServers()` error-path only
- Many CLI flag options (betas, fallbackModel, debug, plugins, etc.)

### What's Untested
- 7 of 15 hook events (PostToolUseFailure, Stop, SessionStart/End, Notification, PreCompact, PermissionRequest, Setup) — placeholder `.test.todo()` only
- TeammateIdle, TaskCompleted — types exported, nothing else

### What's Not Implemented
- `rewindFiles()` — stub, no CLI protocol support
- V2 API (`unstable_v2_*`) — experimental
- Agent teams — no env var support, no tests
- Context compaction trigger

---

## Priority Work

### 1. Remaining Hook Events (7 TODO tests)
**Why:** Hooks are claimed as "all 15 supported" but only 8 are tested.
- `PostToolUseFailure` — trigger a tool error, verify hook fires
- `Stop` — verify hook fires on query completion
- `Notification` — verify notification hook fires
- `PermissionRequest` — verify hook fires for permission prompts
- `PreCompact` — may require long conversation to trigger
- `SessionStart`/`SessionEnd` — declarative only (official SDK limitation)
- `Setup` — verify hook fires on session setup

### 2. MCP Control Methods Happy-Path
**Why:** Only error-path tested currently.
- Configure a real MCP server, then toggle it off/on
- Reconnect a server after it's running
- Add servers via setMcpServers and verify they become available

### 3. Modular MCP Entry Point (Bundle Size)
**Why:** MCP dependencies (ajv + zod-to-json-schema + @modelcontextprotocol/sdk) account for ~660KB — 97% of the bundle. Users who only need `query()` shouldn't pay that cost.
- Add `@lite-claude/agent-sdk/query` sub-path export (~18KB, no MCP deps)
- Keep main `"."` export unchanged (full compatibility)
- No breaking changes — sub-paths are additive

### 4. Integration Tests for Unit-Tested Options
- `resumeSessionAt`, `enableFileCheckpointing`
- Spawner options (`executable`, `executableArgs`, `env`, `stderr`)

---

## Architecture

```
src/
├── api/
│   ├── query.ts           # Main query() function
│   ├── QueryImpl.ts       # AsyncGenerator + control methods
│   ├── MessageQueue.ts    # Message buffering
│   ├── MessageRouter.ts   # Message routing
│   └── ProcessFactory.ts  # Process spawning DI
├── core/
│   ├── argBuilder.ts      # CLI argument construction
│   ├── control.ts         # Control protocol handler
│   ├── controlRequests.ts # Type-safe request builders
│   ├── detection.ts       # Claude binary detection
│   ├── hookConfig.ts      # Hook configuration
│   ├── mcpBridge.ts       # MCP server integration
│   ├── spawn.ts           # Process spawning
│   └── defaults.ts        # Constants
├── mcp.ts                 # createSdkMcpServer() + tool()
└── types/
    ├── index.ts           # Re-exports from official SDK
    └── control.ts         # Control protocol types
```

### Stats
- ~2,500 LOC source (vs ~50,000+ in official SDK)
- ~679KB bundle / ~221KB minified with external zod (vs ~368KB official SDK)
- 36 test files (28 integration + 8 unit)

---

**See Also:** [FEATURES.md](./FEATURES.md) for detailed feature status
