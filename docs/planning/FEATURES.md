# Feature Comparison: Open SDK vs Official SDK

**Last Updated:** 2026-06-03
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
| `readFile()` | 🔌 | Sends control request matching official SDK (v0.2.119); returns null on error |
| `rewindFiles()` | ❌ | Stub — throws "not yet implemented" |
| `reloadPlugins()` | 🔌 | Sends control request matching official SDK (v0.2.85) |
| `seedReadState()` | 🔌 | Sends control request matching official SDK (v0.2.83) |
| `applyFlagSettings()` | 🔌 | Sends control request matching official SDK; no behavioral test |
| `getContextUsage()` | ✅ | Returns context usage breakdown; E2E tested (v0.2.86) |
| `backgroundTasks()` | 🔌 | Sends background_tasks control request; protocol parity tested (v0.3.142) |
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
| `skills` | 🔌 | Appends Skill entries to --allowedTools + init message field; parity tested via compat tests |
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
| `managedSettings` | 🔌 | CLI flag `--managed-settings` verified to match official SDK (v0.2.118) |
| `onElicitation` | ⚠️ | Callback for MCP elicitation requests; control protocol handler implemented (v0.2.104) |
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
| `includeHookEvents` | 🔌 | CLI flag verified; lifecycle messages only for declarative hooks (v0.2.88) |
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
| `getSessionMessages()` (SDK API) | ✅ | Matches official SDK signature; `includeSystemMessages` supported (v0.2.89); compared with official SDK |
| `forkSession()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.76); E2E tested in session-utils.test.ts |
| `renameSession()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.74); E2E tested in session-utils.test.ts |
| `tagSession()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.76); E2E tested in session-utils.test.ts |
| `getSessionInfo()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.74); E2E tested in session-utils.test.ts |
| `listSubagents()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.89); E2E tested |
| `getSubagentMessages()` (SDK API) | ✅ | Re-exported from official SDK (v0.2.89); E2E tested |
| `SDKTaskProgressMessage` type | ⚠️ | Re-exported from official SDK; includes `summary` field (v0.2.72) |
| `SDKElicitationCompleteMessage` type | ⚠️ | Re-exported from official SDK (v0.2.63); part of SDKMessage union |
| `SDKLocalCommandOutputMessage` type | ⚠️ | Re-exported from official SDK (v0.2.63); part of SDKMessage union |
| `SDKAPIRetryMessage` type | ⚠️ | Re-exported from official SDK (v0.2.77); part of SDKMessage union |
| `ExitReason` includes `'resume'` | ⚠️ | Re-exported from official SDK (v0.2.79) |
| `EffortLevel` type | ⚠️ | Re-exported from official SDK (v0.2.84) |
| `SDKControlReloadPluginsResponse` type | ⚠️ | Re-exported from official SDK (v0.2.85) |
| `SDKSessionStateChangedMessage` type | ⚠️ | Re-exported from official SDK (v0.2.83) |
| `SDKControlInitializeResponse` type | ⚠️ | Now re-exported from official SDK (previously local) |
| `SDKControlGetContextUsageResponse` type | ⚠️ | Re-exported from official SDK (v0.2.86) |
| `PermissionDeniedHookInput` type | ⚠️ | Re-exported from official SDK (v0.2.88) |
| `PermissionDeniedHookSpecificOutput` type | ⚠️ | Re-exported from official SDK (v0.2.88) |
| `HookPermissionDecision` type | ⚠️ | Re-exported from official SDK (v0.2.89) |
| `SDKDeferredToolUse` type | ⚠️ | Re-exported from official SDK (v0.2.89) |
| `GetSubagentMessagesOptions` type | ⚠️ | Re-exported from official SDK (v0.2.89) |
| `ListSubagentsOptions` type | ⚠️ | Re-exported from official SDK (v0.2.89) |
| `TerminalReason` type | ⚠️ | Re-exported from official SDK (v0.2.91); on result messages |
| `PermissionMode` includes `'auto'` | 🔌 | Re-exported from official SDK (v0.2.91); CLI flag verified |
| Sandbox `failIfUnavailable` default | 🔌 | Defaults to `true` when `enabled: true` (v0.2.91); CLI args verified |
| `excludeDynamicSections` | 🔌 | Init message field verified to match official SDK (v0.2.104) |
| `SDKTaskUpdatedMessage` type | ⚠️ | Re-exported from official SDK (v0.2.104); part of SDKMessage union |
| `SDKSettingsParseError` type | ⚠️ | Re-exported from official SDK (v0.2.104) |
| `ConnectRemoteControl*` types | ⚠️ | Re-exported from official SDK (v0.2.104); alpha API |
| `InboundPrompt` type | ⚠️ | Re-exported from official SDK (v0.2.104); alpha API |
| `AgentDefinition` new fields | ⚠️ | `initialPrompt`, `background`, `memory`, `effort`, `permissionMode` (v0.2.104) |
| `SDKMemoryRecallMessage` type | ⚠️ | Re-exported from official SDK (v0.2.105); system/memory_recall event |
| `SDKStatus` includes `'requesting'` | ⚠️ | Re-exported from official SDK (v0.2.108); status before API requests |
| `SDKPluginInstallMessage` type | ⚠️ | Re-exported from official SDK (v0.2.110); part of SDKMessage union |
| `SDKNotificationMessage` type | ⚠️ | Re-exported from official SDK (v0.2.110); part of SDKMessage union |
| `shouldQuery` field on `SDKUserMessage` | ⚠️ | Re-exported from official SDK (v0.2.110); skip assistant turn |
| `systemPrompt` accepts `string[]` | 🔌 | Cache boundary support (v0.2.110); init message verified |
| `mcp_set_servers` per-tool `permission_policy` | ⚠️ | `McpServerToolPolicy` type re-exported; `McpHttpServerConfig`/`McpSSEServerConfig` `tools` field (v0.2.111) |
| `WarmQuery` interface | ✅ | Re-exported from official SDK (v0.2.111); E2E tested in startup.test.ts |
| `startup()` function | ✅ | Re-exported from official SDK (v0.2.111); E2E tested in startup.test.ts |
| `title` option | ✅ | Init message field verified + customTitle confirmed via getSessionInfo (v0.2.113) |
| `options.env` replaces `process.env` | 🔌 | v0.2.113 behavior: user env replaces instead of overlays process.env |
| `SessionStore` / `SessionKey` / `SessionStoreEntry` types | ⚠️ | Re-exported from official SDK (v0.2.113); alpha session mirror API |
| `ImportSessionToStoreOptions` type | ⚠️ | Re-exported from official SDK (v0.2.113) |
| `InMemorySessionStore` class | ✅ | Re-exported from official SDK (v0.2.113); E2E tested in session-utils.test.ts |
| `importSessionToStore()` function | ✅ | Re-exported from official SDK (v0.2.113); E2E tested in session-utils.test.ts |
| `deleteSession()` function | ✅ | Re-exported from official SDK (v0.2.113); E2E tested in session-utils.test.ts |
| `SDKControlReadFileResponse` type | ⚠️ | Re-exported from official SDK (v0.2.119); response for `readFile()` control method |
| `updatedToolOutput` on `PostToolUseHookSpecificOutput` | ⚠️ | New in v0.2.121; replaces tool output for any tool type (deprecates `updatedMCPToolOutput`) |
| `PostToolBatchHookInput` type | ⚠️ | Re-exported (was missing); input for `PostToolBatch` hook event |
| `PostToolBatchHookSpecificOutput` type | ⚠️ | Re-exported (was missing); output for `PostToolBatch` hook |
| `PostToolBatchToolCall` type | ⚠️ | Re-exported (was missing); sub-type used in `PostToolBatchHookInput` |
| `UserPromptExpansionHookInput` type | ⚠️ | Re-exported (was missing); input for `UserPromptExpansion` hook event |
| `UserPromptExpansionHookSpecificOutput` type | ⚠️ | Re-exported (was missing); output for `UserPromptExpansion` hook |
| `SessionSummaryEntry` type | ⚠️ | Re-exported (was missing); used with `foldSessionSummary()` |
| `AnyZodRawShape` type | ⚠️ | Re-exported (was missing); Zod shape union used in `SdkMcpToolDefinition` |
| `InferShape` type | ⚠️ | Re-exported (was missing); type helper for tool handler argument inference |
| `AbortError` class | ⚠️ | Re-exported (was missing); users can now `catch (e) { if (e instanceof AbortError) }` |
| `foldSessionSummary()` function | ⚠️ | Re-exported (was missing); pure helper for custom `SessionStore` implementations |
| `SDKPermissionDeniedMessage` type | ⚠️ | Re-exported from official SDK (v0.3.142); permission_denied system message |
| `BackgroundTaskSummary` type | ⚠️ | Re-exported from official SDK (v0.3.144); shape of in-flight tasks in `StopHookInput`/`SubagentStopHookInput` |
| `SessionCronSummary` type | ⚠️ | Re-exported from official SDK (v0.3.144); shape of session-scoped cron tasks in `StopHookInput`/`SubagentStopHookInput` |
| `api_error_status` on result messages | ⚠️ | `SDKResultSuccess` gains optional `api_error_status?: number \| null` (v0.3.144); type-only, forwarded via re-export |
| `model_not_found` error string | ⚠️ | `SDKAssistantMessageError` union gains `'model_not_found'` value (v0.3.144); type-only, forwarded via re-export |
| `MessageDisplayHookInput` type | ⚠️ | Re-exported from official SDK (v0.3.152); hook input for new `MessageDisplay` event — fired per-flush as assistant message streams, carries `turn_id`, `message_id`, `index`, `final`, `delta` |
| `MessageDisplayHookSpecificOutput` type | ⚠️ | Re-exported from official SDK (v0.3.152); hook output for `MessageDisplay` event — optional `displayContent` replaces on-screen delta without changing the stored message |
| `SessionStartHookSpecificOutput.reloadSkills` | ⚠️ | Added in v0.3.152; `reloadSkills?: boolean` re-scans skill directories after SessionStart hooks so hook-installed skills are available immediately |
| `SessionStartHookSpecificOutput.sessionTitle` | ⚠️ | Added in v0.3.152; `sessionTitle?: string` lets hooks set the session title programmatically |
| `SDKThinkingTokensMessage` type | ⚠️ | Re-exported from official SDK (v0.3.158); live thinking-token estimate streamed during redacted-thinking phase; carries `estimated_tokens` and `estimated_tokens_delta` |
| `SDKCommandsChangedMessage` type | ⚠️ | Re-exported from official SDK (v0.3.161); fire-and-forget push of the full slash-command list after a mid-session change; clients should replace their cached command list with this payload |
| `pending_permission_requests` on `ControlResponseSuccess` | ⚠️ | Added in v0.3.161; mirrors the field on `ControlResponseError`; sent on `initialize` response so a client joining an already-initialized session learns about in-flight permission prompts |
| Idempotent `initialize` | ✅ | Added in v0.3.161; second `initialize` returns same success payload instead of error; handled by CLI, no SDK changes needed |
| `resolveSettings()` function | ⚠️ | Re-exported from official SDK (v0.2.136); reads MDM/plist/file settings without spawning CLI |
| `filterEscalatingDefaultMode()` function | ⚠️ | Re-exported from official SDK (v0.2.136); utility to remove managed-only settings |
| `ResolvedSettings` / `ResolvedSettingSource` / `ResolveSettingsOptions` types | ⚠️ | Re-exported from official SDK (v0.2.136); types for `resolveSettings()` |
| `PolicySettingsOrigin` / `ProvenanceEntry` types | ⚠️ | Re-exported from official SDK (v0.2.136); provenance tracking in ResolvedSettings |
| `SDKMirrorErrorMessage` type | ⚠️ | Re-exported from official SDK (v0.2.113); part of SDKMessage union |
| `SDKMessageOrigin` type | ⚠️ | Re-exported from official SDK (v0.2.113); message origin discriminated union |
| `origin` on result messages | ⚠️ | `SDKResultSuccess`/`SDKResultError` gain optional `origin?: SDKMessageOrigin` (v0.2.126); type-only, forwarded via re-export |
| `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` constant | ⚠️ | Re-exported from official SDK (v0.2.113); cache boundary marker for systemPrompt arrays |
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
| JS bundle | ~564KB | ~856KB |
| Bundled binary | none (uses installed CLI) | ~208MB per platform |
| Source code | ~2,500 LOC | ~50,000+ LOC (minified) |
| Test files | 46 (24 integration + 22 unit) | — |
| Dependencies | Claude CLI (external) | Self-contained |

---

**See Also:** [GitHub Issues](https://github.com/foksa/open-claude-agent-sdk/issues) for remaining work
