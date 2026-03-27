# Feature Comparison: Open SDK vs Official SDK

**Last Updated:** 2026-03-27
**Purpose:** Honest feature matrix — distinguishes real E2E tests from protocol-level pass-through

---

## Legend

- ✅ **E2E tested** — Real behavioral integration test verifies the feature works end-to-end
- 🔌 **Protocol tested** — CLI args/init message verified to match official SDK; no behavioral test
- ⚠️ **Unit tested only** — Code exists with unit tests but no integration test at all
- 📝 **TODO test** — Placeholder test exists (`.test.todo()`), no real test code
- ❌ **Not implemented**

---

## Feature Status Matrix

| Feature | Status | Notes |
|---------|--------|-------|
| **Core API** |
| One-shot queries | ✅ | Real queries, real responses |
| Multi-turn conversations | ✅ | AsyncIterable prompt + `streamInput()` |
| Streaming output | ✅ | NDJSON stream with partial messages |
| AsyncGenerator pattern | ✅ | `for await (const msg of query(...))` |
| Control protocol (stdin/stdout) | ✅ | Init, control requests, responses |
| **Query Control Methods** |
| `interrupt()` | ✅ | Tested in abort.test.ts |
| `close()` | ✅ | Tested in abort.test.ts |
| `setPermissionMode()` | 🔌 | Sends control request, no behavioral verification |
| `setModel()` | 🔌 | Sends control request, no behavioral verification |
| `setMaxThinkingTokens()` | 🔌 | Sends control request, no behavioral verification |
| `streamInput()` | ✅ | Tested in multi-turn.test.ts |
| `supportedCommands()` | ✅ | Returns array with name/description |
| `supportedModels()` | ✅ | Returns array with value/displayName |
| `mcpServerStatus()` | ✅ | Returns status with and without SDK MCP servers |
| `accountInfo()` | ✅ | Returns account data with expected shape |
| `reconnectMcpServer()` | ✅ | Tested with minimal stdio MCP server |
| `toggleMcpServer()` | ✅ | Disable and re-enable tested with stdio MCP server |
| `setMcpServers()` | ✅ | Adds server, returns result with errors for bad configs |
| `supportedAgents()` | ✅ | Returns array of AgentInfo from init response |
| `rewindFiles()` | ❌ | Stub — throws "not yet implemented" |
| `reloadPlugins()` | 🔌 | Sends control request matching official SDK (v0.2.85) |
| `seedReadState()` | 🔌 | Sends control request matching official SDK (v0.2.83) |
| `applyFlagSettings()` | 🔌 | Sends control request matching official SDK; no behavioral test |
| **Query Options** |
| `prompt` | ✅ | String and AsyncIterable |
| `permissionMode` | ✅ | Multiple modes tested behaviorally |
| `model` | ✅ | Verified in protocol comparison |
| `maxTurns` | ✅ | Verified query stops at limit |
| `maxBudgetUsd` | 🔌 | CLI flag passed, no budget-exceeded test |
| `includePartialMessages` | ✅ | Streaming test verifies partial messages appear |
| `cwd` | ✅ | Verified working directory is used |
| `canUseTool` | ✅ | 7 behavioral tests (allow/deny/selective/async) |
| `hooks` | ⚠️ | See Hooks section — 10 of 15 events tested |
| `allowDangerouslySkipPermissions` | ✅ | Verified in permission-modes.test.ts |
| `outputFormat` | ✅ | JSON schema validation tested E2E |
| `settingSources` | ✅ | Skills/commands loaded from fixtures |
| `systemPrompt` | ✅ | String, preset, preset+append all tested |
| `allowedTools` | ✅ | Tool restriction verified behaviorally |
| `disallowedTools` | 🔌 | CLI flag verified, no behavioral test |
| `tools` | 🔌 | CLI flag verified, no behavioral test |
| `mcpServers` | ✅ | In-process SDK MCP servers tested E2E |
| `strictMcpConfig` | 🔌 | CLI flag passed |
| `agents` | ✅ | Subagent invocation, parent_tool_use_id, abort tested E2E |
| `resume` | ✅ | Session resumed with context retained |
| `continue` | ✅ | Tested in sessions.test.ts |
| `forkSession` | ✅ | New session ID + retained context verified |
| `sessionId` | ✅ | Custom ID used and returned |
| `persistSession` | 🔌 | CLI flag passed |
| `sandbox` | ✅ | Config passed via --settings, tested |
| Image uploads (streaming input) | ✅ | Base64 image in content blocks, tested E2E |
| `abortController` | ✅ | Signal cancellation tested |
| `settings` | 🔌 | CLI flag passed (string path or JSON object), sandbox merges in |
| `onElicitation` | ❌ | Callback for MCP elicitation requests (v0.2.63) |
| `plugins` | 🔌 | CLI flag passed, plugin loading not behaviorally tested |
| `additionalDirectories` | 🔌 | CLI flag passed |
| `agent` | 🔌 | CLI flag passed |
| `betas` | 🔌 | CLI flag passed |
| `fallbackModel` | 🔌 | CLI flag passed |
| `permissionPromptToolName` | 🔌 | CLI flag passed |
| `extraArgs` | 🔌 | CLI flag passed |
| `thinking` | ✅ | adaptive/enabled/disabled all E2E tested |
| `effort` | ✅ | E2E tested with low effort level |
| `taskBudget` | 🔌 | CLI flag `--task-budget` verified to match official SDK (v0.2.84) |
| `promptSuggestions` | 🔌 | Init message verified to match official SDK |
| `agentProgressSummaries` | 🔌 | Init message verified to match official SDK (v0.2.72) |
| `debug` | 🔌 | CLI flag passed |
| `debugFile` | 🔌 | CLI flag passed |
| `resumeSessionAt` | ⚠️ | Unit tested, needs integration test |
| `enableFileCheckpointing` | ⚠️ | Unit tested (env var), needs integration test |
| `toolConfig` | 🔌 | Env var `CLAUDE_CODE_QUESTION_PREVIEW_FORMAT` verified to match official SDK |
| `executable` | ⚠️ | Unit tested, needs integration test |
| `executableArgs` | ⚠️ | Unit tested, needs integration test |
| `env` | ⚠️ | Unit tested, needs integration test |
| `stderr` | ⚠️ | Unit tested, needs integration test |
| `spawnClaudeCodeProcess` | ⚠️ | Unit tested, needs integration test |
| **Hooks (10 of 15 E2E tested)** |
| `PreToolUse` | ✅ | 4 behavioral tests (intercept, modify, cancel) |
| `PostToolUse` | ✅ | 1 behavioral test |
| `UserPromptSubmit` | ✅ | 1 behavioral test |
| Hook matchers | ✅ | 2 tests for tool name filtering |
| `PostToolUseFailure` | ✅ | Triggered via throwing MCP tool |
| `Stop` | ✅ | Fires on query completion |
| `SessionStart` | 📝 | Declarative only (official SDK issue #83) |
| `SessionEnd` | 📝 | Declarative only (official SDK issue #83) |
| `Notification` | 📝 | Does not fire when canUseTool handles permissions |
| `SubagentStart` | ✅ | Tested in subagents.test.ts |
| `SubagentStop` | ✅ | Tested in subagents.test.ts |
| `PreCompact` | 📝 | TODO — placeholder test |
| `PostCompact` | 📝 | Types exported (v0.2.76), fires via hook_callback protocol |
| `PermissionRequest` | 📝 | Does not fire when canUseTool handles permissions |
| `Setup` | 📝 | Does not fire via programmatic hooks |
| `TeammateIdle` | 📝 | TODO — types exported, no test |
| `TaskCompleted` | 📝 | TODO — types exported, no test |
| `Elicitation` | 📝 | Types exported (v0.2.63), fires via hook_callback protocol |
| `ElicitationResult` | 📝 | Types exported (v0.2.63), fires via hook_callback protocol |
| `ConfigChange` | 📝 | Types exported (v0.2.49), fires via hook_callback protocol |
| `WorktreeCreate` | 📝 | Types exported (v0.2.50), fires via hook_callback protocol |
| `WorktreeRemove` | 📝 | Types exported (v0.2.50), fires via hook_callback protocol |
| `InstructionsLoaded` | 📝 | Types exported (v0.2.70), fires via hook_callback protocol |
| **Advanced Features** |
| Structured outputs | ✅ | JSON schema validation tested E2E |
| Extended thinking | ✅ | Thinking tokens tested E2E |
| Skills & commands | ✅ | Loaded from fixtures and invoked |
| Budget/cost tracking | ✅ | total_cost_usd, usage, modelUsage verified |
| Session management | ✅ | Resume, fork, continue, sessionId all E2E tested |
| Session storage API | ✅ | listSessions, getSessionMetadata, renameSession, deleteSession, getProjectStoragePath — via `./storage` subpath |
| `listSessions()` (SDK API) | ✅ | Matches official SDK signature; compared with official SDK in integration tests |
| `getSessionMessages()` (SDK API) | ✅ | Matches official SDK signature; compared with official SDK in integration tests |
| `forkSession()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.76); E2E tested in session-utils.test.ts |
| `renameSession()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.74); E2E tested in session-utils.test.ts |
| `tagSession()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.76); E2E tested in session-utils.test.ts |
| `getSessionInfo()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.74); E2E tested in session-utils.test.ts |
| `SDKTaskProgressMessage` type | ⚠️ | Re-exported from official SDK; includes `summary` field (v0.2.72) |
| `SDKElicitationCompleteMessage` type | ⚠️ | Re-exported from official SDK (v0.2.63); part of SDKMessage union |
| `SDKLocalCommandOutputMessage` type | ⚠️ | Re-exported from official SDK (v0.2.63); part of SDKMessage union |
| `SDKAPIRetryMessage` type | ⚠️ | Re-exported from official SDK (v0.2.77); part of SDKMessage union |
| `ExitReason` includes `'resume'` | ⚠️ | Re-exported from official SDK (v0.2.79) |
| `EffortLevel` type | ⚠️ | Re-exported from official SDK (v0.2.84) |
| `SDKControlReloadPluginsResponse` type | ⚠️ | Re-exported from official SDK (v0.2.85) |
| `SDKSessionStateChangedMessage` type | ⚠️ | Re-exported from official SDK (v0.2.83) |
| `SDKControlInitializeResponse` type | ⚠️ | Now re-exported from official SDK (previously local) |
| MCP: `createSdkMcpServer()` | ✅ | 2 real E2E tests with in-process tools |
| MCP: `tool()` helper | ✅ | With Zod schemas and annotations |
| MCP: control methods | ✅ | toggle/setServers/status tested; reconnect needs running server |
| Subagent support (`agents`) | ✅ | E2E tested: invocation, hooks, abort |
| Agent teams | ❌ | Types exported only; no env var, no tests |
| Output styles | ✅ | ExtendedQuery extension methods tested |
| Plugin system | 🔌 | CLI flag passed, no behavioral test |

---

## Not Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
| `rewindFiles()` | LOW | Stub throws; CLI has no protocol for this |
| `onElicitation` callback | MEDIUM | MCP elicitation requests (form fields, URL auth) |
| V2 API (`unstable_v2_*`) | LOW | Experimental preview in official SDK |
| Context compaction trigger | LOW | CLI compacts automatically |
| Agent teams | LOW | Experimental (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS`) |

---

## What Needs Work

### High Value — E2E tests for core features
- Hook events: 5 remain untestable programmatically (SessionStart/End, Notification, PermissionRequest, Setup)

### Medium Value — Integration tests for unit-tested features
- `resumeSessionAt`, `enableFileCheckpointing`
- Spawner options (`executable`, `executableArgs`, `env`, `stderr`, `spawnClaudeCodeProcess`)

### Low Value — Protocol-only features that likely just work
- Options that are pure CLI flag pass-through (`betas`, `fallbackModel`, `debug`, etc.)
- These work if the CLI flag is correct (verified by unit tests)

---

## What We Don't Need to Implement

Handled by the CLI subprocess:
- Tool execution (Read, Write, Edit, Bash, Glob, Grep, etc.)
- Permission prompts
- MCP server lifecycle
- Binary updates, credentials, rate limiting, retries

---

## Type Compatibility

100% type compatible — all types re-exported from `@anthropic-ai/claude-agent-sdk`.

---

## Size Comparison

| Metric | Open SDK | Official SDK |
|--------|----------|--------------|
| Bundle size | ~488KB | ~13MB |
| Source code | ~2,500 LOC | ~50,000+ LOC |
| Test files | 46 (24 integration + 22 unit) | — |
| Dependencies | CLI (external) | Self-contained |

---

**See Also:** [GitHub Issues](https://github.com/foksa/open-claude-agent-sdk/issues) for remaining work
