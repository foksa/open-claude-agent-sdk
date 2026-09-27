# Feature Comparison: Open SDK vs Official SDK

**Last Updated:** 2026-09-18
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
| `interrupt()` | ✅ | Tested in abort.test.ts; returns typed `{still_queued}` receipt on CLIs advertising `interrupt_receipt_v1`, `undefined` otherwise (v0.3.205); E2E tested in control-methods.test.ts |
| `close()` | ✅ | Tested in abort.test.ts |
| `setPermissionMode()` | 🔌 | Sends control request, no behavioral verification |
| `setModel()` | 🔌 | Sends control request, no behavioral verification |
| `setMaxThinkingTokens()` | 🔌 | Sends control request incl. optional `thinkingDisplay` → `thinking_display`; protocol parity tested (v0.50.0) |
| `streamInput()` | ✅ | Tested in multi-turn.test.ts; closes stdin when the stream ends (after the first result when callbacks are active), so AsyncIterable prompts no longer hang — parity tested in lifecycle.test.ts (v0.50.0) |
| `supportedCommands()` | ✅ | Returns array with name/description; tracks `system/commands_changed` pushes like official (v0.50.0) |
| `supportedModels()` | ✅ | Returns array with value/displayName |
| `mcpServerStatus()` | ✅ | Returns status with and without SDK MCP servers |
| `accountInfo()` | ✅ | Returns account data with expected shape |
| `reconnectMcpServer()` | ✅ | Tested with minimal stdio MCP server |
| `toggleMcpServer()` | ✅ | Disable and re-enable tested with stdio MCP server |
| `setMcpServers()` | ✅ | Adds server, returns result with errors for bad configs; in-process servers are connected/disconnected locally and sent as `{type:'sdk', name, timeout?}` (v0.50.0, stdin parity tested) — previously a newly added SDK server was never registered |
| `setMcpPermissionModeOverride()` | 🔌 | Sends set_mcp_permission_mode_override control request; resolves `{}` on an empty response like official; protocol parity tested (v0.3.187) |
| `supportedAgents()` | ✅ | Returns array of AgentInfo from init response |
| `readFile()` | 🔌 | Sends control request matching official SDK (v0.2.119); returns null on error |
| `rewindFiles()` | 🔌 | Sends `rewind_files` control request (`user_message_id`, `dry_run`); protocol parity tested (v0.50.0). Needs `enableFileCheckpointing` |
| `reloadPlugins()` | 🔌 | Sends control request matching official SDK (v0.2.85); `holdOnCacheImpact` option added (v0.3.268), stdin parity tested |
| `reloadSkills()` | 🔌 | Sends reload_skills control request; protocol parity tested (v0.3.165) |
| `reloadOutputStyles()` | 🔌 | Sends reload_output_styles control request; protocol parity tested (v0.3.263) |
| `reinitialize()` | ✅ | Resends the `initialize` control request with a fresh request_id, reusing the same request shape as the initial handshake (v0.3.195); E2E tested in control-methods.test.ts, stdin parity tested |
| `seedReadState()` | 🔌 | Sends control request matching official SDK (v0.2.83) |
| `applyFlagSettings()` | 🔌 | Sends control request matching official SDK; no behavioral test |
| `updateSettings()` | 🔌 | Sends `update_settings` control request `{source, settings}` matching official SDK (v0.3.259); no behavioral test |
| `getContextUsage()` | ✅ | Returns context usage breakdown; E2E tested (v0.2.86); `detail: 'summary' \| 'full'` option added (v0.3.257) |
| `backgroundTasks()` | 🔌 | Sends background_tasks control request; protocol parity tested (v0.3.142) |
| `usage_EXPERIMENTAL_MAY_CHANGE_DO_NOT_RELY_ON_THIS_API_YET()` | 🔌 | Sends get_usage control request (`skipBehaviors` → `skip_behaviors`); protocol parity tested (v0.3.169, v0.50.0) |
| `listPermissionRules()` | 🔌 | Sends `list_permission_rules` control request; not part of official SDK's public `Query` type but present on its runtime Query class (v0.3.270), stdin parity tested |
| **Query Options** |
| `prompt` | ✅ | String and AsyncIterable |
| `permissionMode` | ✅ | Multiple modes tested behaviorally |
| `model` | ✅ | Verified in protocol comparison |
| `maxTurns` | ✅ | Verified query stops at limit; `0` is omitted from the CLI args like official (v0.50.0) |
| `maxBudgetUsd` | 🔌 | CLI flag passed, no budget-exceeded test |
| `includePartialMessages` | ✅ | Streaming test verifies partial messages appear |
| `cwd` | ✅ | Verified working directory is used |
| `canUseTool` | ✅ | 8 behavioral tests (allow/deny/selective/async); `requestId` field (v0.3.199) + `null` return to suppress response unit tested; `defaultToNo`/`suppressAlwaysAllowRule` hints forwarded from CLI (v0.3.268), unit tested; `mcpServer` provenance (v0.3.274) E2E tested; `title`/`displayName`/`description`/`matchedAskRule` forwarded and `toolUseID` echoed in the response, matching official SDK; callbacks get a live `signal` aborted by `control_cancel_request` (v0.50.0); with no callback the request now errors like official instead of auto-allowing |
| `hooks` | ⚠️ | See Hooks section — 7 of 26 events tested |
| `allowDangerouslySkipPermissions` | ✅ | Verified in permission-modes.test.ts |
| `outputFormat` | ✅ | JSON schema validation tested E2E |
| `settingSources` | ✅ | Skills/commands loaded from fixtures |
| `systemPrompt` | ✅ | String, preset, preset+append, custom, and `snapshot` option (v0.3.267) all tested |
| `allowedTools` | ✅ | Tool restriction verified behaviorally |
| `skills` | 🔌 | Appends Skill entries to --allowedTools + init message field; parity tested via compat tests; names validated and deduplicated against `allowedTools` like official, empty array sent in init (v0.50.0) |
| `disallowedTools` | 🔌 | CLI flag verified, no behavioral test |
| `tools` | 🔌 | CLI flag verified, no behavioral test |
| `mcpServers` | ✅ | In-process SDK MCP servers tested E2E |
| `strictMcpConfig` | 🔌 | CLI flag passed |
| `agents` | ✅ | Subagent invocation, parent_tool_use_id, abort tested E2E |
| `resume` | ✅ | Session resumed with context retained; emits `--resume=<value>` equals-form (matches official SDK behavior since v0.3.208/v0.3.212) |
| `continue` | ✅ | Tested in sessions.test.ts |
| `forkSession` | ✅ | New session ID + retained context verified |
| `sessionId` | ✅ | Custom ID used and returned; emits `--session-id=<value>` equals-form (matches official SDK behavior since v0.3.212) |
| `persistSession` | 🔌 | CLI flag passed |
| `sandbox` | ✅ | Config passed via --settings, tested |
| Image uploads (streaming input) | ✅ | Base64 image in content blocks, tested E2E |
| `abortController` | ✅ | Signal cancellation tested; abort now rejects iteration with `AbortError('Claude Code process aborted by user')`, closes stdin and kills the CLI after 2s (v0.50.0, parity tested) — previously it only sent an interrupt |
| `settings` | 🔌 | CLI flag passed (string path or JSON object), sandbox merges in; settings file path + `sandbox` now throws like official instead of silently dropping the file (v0.50.0) |
| `managedSettings` | 🔌 | CLI flag `--managed-settings` verified to match official SDK (v0.2.118) |
| `onElicitation` | ⚠️ | Callback for MCP elicitation requests; control protocol handler implemented (v0.2.104); receives a live, cancellable `signal` (v0.50.0) |
| `plugins` | ✅ | `--plugin-dir` per plugin; commands/invocation E2E tested in plugins.test.ts |
| `plugins[].skipMcpDiscovery` | 🔌 | Emits `--plugin-dir-no-mcp` instead of `--plugin-dir` (v0.3.172); args verified to match official SDK |
| `pluginDelivery: 'initialize'` | ✅ | Sends `plugins` over stdin in the initialize request + `--await-initialize` instead of `--plugin-dir` flags, so the command line doesn't grow with plugin count (v0.3.261); E2E tested in plugins.test.ts |
| `additionalDirectories` | 🔌 | CLI flag passed |
| `projectConfigRoot` | ✅ | `--project-config-root=<path>` single arg (v0.3.274); CLI args parity tested; E2E tested (project commands load from the root) |
| `agent` | 🔌 | CLI flag passed |
| `betas` | 🔌 | CLI flag passed |
| `fallbackModel` | 🔌 | CLI flag passed |
| `permissionPromptToolName` | 🔌 | CLI flag passed |
| `permissionPrompts` | 🔌 | CLI flag `--permission-prompts` (`'host' \| 'none'`) verified to match official SDK (v0.3.259) |
| `extraArgs` | 🔌 | CLI flag passed; values starting with `-` are passed as `--key=value` like official (v0.50.0) |
| `thinking` | ✅ | adaptive/enabled/disabled all E2E tested; `display` → `--thinking-display`, `maxThinkingTokens: 0` → `--thinking disabled` (v0.50.0, args parity tested) |
| `effort` | ✅ | E2E tested with low effort level |
| `taskBudget` | 🔌 | CLI flag `--task-budget` verified to match official SDK (v0.2.84) |
| `includeHookEvents` | 🔌 | CLI flag verified; lifecycle messages only for declarative hooks (v0.2.88) |
| `promptSuggestions` | 🔌 | Init message verified to match official SDK |
| `agentProgressSummaries` | 🔌 | Init message verified to match official SDK (v0.2.72) |
| `debug` | 🔌 | CLI flag passed |
| `debugFile` | 🔌 | CLI flag passed |
| `DEBUG_CLAUDE_AGENT_SDK` env | 🔌 | Truthy (`1`/`true`/`yes`/`on`) → `--debug-file <configDir>/debug/sdk-<uuid>.txt`, one per process, announced on stderr; skipped with `debugFile` or `spawnClaudeCodeProcess` (matches official, v0.50.0) |
| `resumeSessionAt` | ⚠️ | Unit tested, needs integration test; emits `--resume-session-at=<value>` equals-form (matches official SDK behavior since v0.3.212) |
| `resumeDropsTurn` | 🔌 | CLI flag `--resume-drops-turn=<value>` verified to match official SDK (v0.3.223); used with `resumeSessionAt` to guard truncating resumes |
| `enableFileCheckpointing` | ⚠️ | Unit tested (env var), needs integration test |
| `toolConfig` | 🔌 | Env var `CLAUDE_CODE_QUESTION_PREVIEW_FORMAT` verified to match official SDK |
| `executable` | ⚠️ | Ignored for native binaries like official (v0.50.0; previously wrapped the native binary and failed); parity tested in lifecycle.test.ts |
| `executableArgs` | ⚠️ | Unit tested, needs integration test |
| `env` | ⚠️ | Unit tested, needs integration test |
| `stderr` | ⚠️ | stderr is always drained (v0.50.0) — previously an unread pipe could block the CLI with `debug`/`DEBUG_CLAUDE_AGENT_SDK`. Exit errors end with `. stderr: <last 2KB>` like official, masked with the official redaction set plus URL userinfo and secret query params (`src/core/redact.ts`). Unlike official, the error waits (≤2s) for stderr to close so output written after `exit` is included; tested in lifecycle.test.ts / redact.test.ts |
| `spawnClaudeCodeProcess` | ⚠️ | Unit tested, needs integration test |
| **Hooks (7 of 26 E2E tested)** |
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
| `MessageDisplay` | 📝 | Types exported (v0.3.152); fires per-flush as assistant message streams |
| `PostToolBatch` | 📝 | Types exported; batch tool execution event |
| `UserPromptExpansion` | 📝 | Types exported; fires when user prompt is expanded |
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
| Session storage API | ✅ | listSessions, getSessionMetadata, renameSession, deleteSession, getProjectStoragePath — via `./storage` subpath (our own API, not official-compatible); now respects `CLAUDE_CONFIG_DIR` and the long-path hash suffix |
| `listSessions()` (SDK API) | ✅ | Ported from the official SDK (v0.50.0): `offset`, `includeWorktrees`, `includeProgrammatic`, `tag`/`createdAt`/`aiTitle`/`lastPrompt`, sidecar titles, continued-in and colliding-project filtering, long-path hash matching the CLI; works under Node (was `Bun.file`-only); parity tested in session-parity.test.ts |
| `getSessionMessages()` (SDK API) | ✅ | Matches official SDK signature; `includeSystemMessages` supported (v0.2.89); `parent_agent_id` field added (v0.3.202, always `null` — main-transcript reads only); messages queued while a tool ran (`queued_command` attachments) surface as user messages with `isQueuedCommand`/`origin`, plus `timestamp`/`is_meta`/`isCompletedLocalCommand` output fields (v0.3.274–v0.3.275), unit tested byte-equal against official SDK; works under Node; known gap: transcripts over 5MB are parsed whole (official skips pre-compaction content while streaming); chain reconstruction now also merges parallel tool-use sibling entries and re-links compaction-preserved messages (`preservedMessages`/`preservedSegment`), parity tested against official SDK |
| `forkSession()` (SDK API) | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts — forked transcripts compared entry-by-entry incl. `upToMessageId`, queued-command ids, title fallback |
| `renameSession()` (SDK API) | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts — file bytes and error messages compared |
| `tagSession()` (SDK API) | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts — incl. unicode sanitization |
| `getSessionInfo()` (SDK API) | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts |
| `listSubagents()` (SDK API) | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts |
| `getSubagentMessages()` (SDK API) | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts — incl. `.meta.json` parent ids and pagination |
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
| `ConnectRemoteControl*` types | ❌ | Removed from official SDK in v0.3.181; no longer re-exported |
| `InboundPrompt` type | ❌ | Removed from official SDK in v0.3.181; no longer re-exported |
| `AgentDefinition` new fields | ⚠️ | `initialPrompt`, `background`, `memory`, `effort`, `permissionMode` (v0.2.104) |
| `SDKMemoryRecallMessage` type | ⚠️ | Re-exported from official SDK (v0.2.105); system/memory_recall event |
| `SDKStatus` includes `'requesting'` | ⚠️ | Re-exported from official SDK (v0.2.108); status before API requests |
| `SDKPluginInstallMessage` type | ⚠️ | Re-exported from official SDK (v0.2.110); part of SDKMessage union |
| `SDKNotificationMessage` type | ⚠️ | Re-exported from official SDK (v0.2.110); part of SDKMessage union |
| `shouldQuery` field on `SDKUserMessage` | ⚠️ | Re-exported from official SDK (v0.2.110); skip assistant turn |
| `systemPrompt` accepts `string[]` | 🔌 | Cache boundary support (v0.2.110); init message verified |
| `mcp_set_servers` per-tool `permission_policy` | ⚠️ | `McpServerToolPolicy` type re-exported; `McpHttpServerConfig`/`McpSSEServerConfig` `tools` field (v0.2.111) |
| `WarmQuery` interface | ⚠️ | Type re-exported only; `startup()` is not supported |
| `startup()` function | ❌ | Not supported (v0.50.0). It was a runtime re-export that ran the official SDK's own query code, and broke clean installs |
| `title` option | ✅ | Init message field verified + customTitle confirmed via getSessionInfo (v0.2.113) |
| `options.env` replaces `process.env` | 🔌 | v0.2.113 behavior: user env replaces instead of overlays process.env |
| `SessionStore` / `SessionKey` / `SessionStoreEntry` types | ⚠️ | Types re-exported (v0.2.113); alpha session mirror API |
| `Options.sessionStore` (transcript mirroring) | ❌ | Not implemented: `query()` ignores it (no `--session-mirror`, no `transcript_mirror` handling); session helpers ignore their `sessionStore` option |
| `ImportSessionToStoreOptions` type | ⚠️ | Re-exported from official SDK (v0.2.113) |
| `InMemorySessionStore` class | ❌ | Dropped (v0.50.0) with the rest of `sessionStore` — see `Options.sessionStore` |
| `importSessionToStore()` function | ❌ | Dropped (v0.50.0) with the rest of `sessionStore` |
| `deleteSession()` function | ✅ | Our implementation (v0.50.0; was a runtime re-export of the official SDK, which broke clean installs); parity tested against the official SDK on shared fixtures in session-parity.test.ts — removes transcript and companion directory |
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
| `AbortError` class | ✅ | Our own class in `src/constants.ts` (v0.50.0); thrown by iteration when `abortController` aborts |
| `foldSessionSummary()` function | ❌ | Dropped (v0.50.0) with the rest of `sessionStore` |
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
| `StopHookSpecificOutput` type | ⚠️ | Re-exported from official SDK (v0.3.163); hook output for Stop event; `additionalContext` delivers non-error feedback to the model so the conversation continues |
| `SubagentStopHookSpecificOutput` type | ⚠️ | Re-exported from official SDK (v0.3.163); hook output for SubagentStop event; `additionalContext` delivers non-error feedback so the subagent continues |
| `UserDialogRequest` / `UserDialogResult` types | ⚠️ | Re-exported from official SDK (v0.3.165); shape of `request_user_dialog` control requests and host responses |
| `OnUserDialog` callback | ⚠️ | Re-exported from official SDK (v0.3.165); passed in `options.onUserDialog`; inbound `request_user_dialog` control requests are routed to this callback or answered `{behavior:'cancelled'}` |
| `SDKControlReloadSkillsResponse` type | ⚠️ | Re-exported from official SDK (v0.3.165); response shape for `reloadSkills()` — carries refreshed `skills: SlashCommand[]` |
| `resolveSettings()` function | ❌ | Not supported (v0.50.0); was a runtime re-export that broke clean installs. Types still re-exported |
| `filterEscalatingDefaultMode()` function | ❌ | Not supported (v0.50.0); was a runtime re-export that broke clean installs |
| `ResolvedSettings` / `ResolvedSettingSource` / `ResolveSettingsOptions` types | ⚠️ | Re-exported from official SDK (v0.2.136); types for `resolveSettings()` |
| `PolicySettingsOrigin` / `ProvenanceEntry` types | ⚠️ | Re-exported from official SDK (v0.2.136); provenance tracking in ResolvedSettings |
| `SDKMirrorErrorMessage` type | ⚠️ | Re-exported from official SDK (v0.2.113); part of SDKMessage union |
| `SDKModelRefusalFallbackMessage` type | ⚠️ | Re-exported from official SDK (v0.3.170); emitted when model refusal triggers fallback retry |
| `SDKControlGetUsageResponse` type | ⚠️ | Re-exported from official SDK (v0.3.169); return type for usage_EXPERIMENTAL method |
| `SDKMessageOrigin` type | ⚠️ | Re-exported from official SDK (v0.2.113); message origin discriminated union |
| `origin` on result messages | ⚠️ | `SDKResultSuccess`/`SDKResultError` gain optional `origin?: SDKMessageOrigin` (v0.2.126); type-only, forwarded via re-export |
| `SYSTEM_PROMPT_DYNAMIC_BOUNDARY` constant | ✅ | Defined in `src/constants.ts` (v0.50.0), typed against and unit tested equal to the official value |
| `SDKWorkerShuttingDownMessage` type | ⚠️ | Re-exported from official SDK (v0.3.178); system/worker_shutting_down event; emitted on graceful Remote Control worker teardown with `reason` string |
| `SDKInformationalMessage` type | ⚠️ | Re-exported from official SDK (v0.3.178); system/informational event; carries `level` (info/notice/suggestion/warning), optional `prevent_continuation` to halt execution |
| `SDKRateLimitInfo` credits-required fields | ⚠️ | `errorCode`, `canUserPurchaseCredits`, `hasChargeableSavedPaymentMethod` added (v0.3.181); type-only, forwarded via re-export |
| `tool_use_meta` on `SDKAssistantMessage` | ⚠️ | Optional sidecar with display-friendly tool call names and `icon_url` (v0.3.179/v0.3.181); type-only, forwarded via re-export |
| `system/model_fallback` new trigger values | ⚠️ | `SDKModelRefusalFallbackMessage.trigger` gains `server_error` and `last_resort` (v0.3.174); type-only, forwarded via re-export |
| `SDKModelRefusalNoFallbackMessage` type | ⚠️ | Re-exported from official SDK (v0.3.191); emitted when model refusal has no fallback configured, so the turn ends as an error; part of SDKMessage union |
| `prompt_id` on `BaseHookInput` | ⚠️ | Correlates hook events with OpenTelemetry prompt-level events (v0.3.196); type-only, forwarded via re-export |
| `USAGE_LIMIT_ERROR_PREFIXES` / `USAGE_TRANSITION_PREFIXES` / `USAGE_WARNING_PREFIXES` / `ORG_POLICY_LIMIT_PREFIXES` constants | ✅ | Defined in `src/constants.ts` (v0.50.0), typed against and unit tested equal to the official values |
| Output-field additions (v0.3.210–v0.3.217) | ⚠️ | `SDKAssistantMessage.timestamp`/`aborted`, `SDKMessageOrigin` `subkind:'scheduled-trigger'`, `tool_progress` `subagent_type`/`subagent_retry`, `system/init` plugin `version`, `RewindFilesResult.skippedLinks`, result-message `user_message_uuid`/`request_sent_wall_ms` — all type-only, forwarded via existing re-exports; no SDK changes needed |
| `DirectoryAddedHookInput` type | ⚠️ | Re-exported from official SDK (v0.3.219); `HookInput` union member for the `DirectoryAdded` lifecycle event, fired when a new working directory is registered mid-session |
| `FastModeDisabledReason` type | ⚠️ | Re-exported from official SDK (v0.3.219); powers `fast_mode_disabled_reason` on result/init messages, forwarded via existing re-exports |
| Output-field additions (v0.3.218–v0.3.220) | ⚠️ | `ModelUsage.canonicalModel`/`provider`, result-message `api_error_status` (now reports 429/529 instead of null mid-stream), `sandbox.network.strictAllowlist` and `workflowSizeGuideline` on `Settings`/`SandboxNetworkConfig` — all type-only, forwarded via existing re-exports; no SDK changes needed |
| `cancel_queued` on interrupt control request | ❌ | Type-only (`SDKControlInterruptRequest.cancel_queued`, capability `interrupt_cancel_queued_v1`, v0.3.219); official SDK's own public `interrupt()` doesn't accept it yet, so left unwired to match upstream behavior |
| `SDKContextUsage` / `SDKContextUsageCategory` types | ⚠️ | Re-exported from official SDK (v0.3.232); structured twin of the `/context` report, carried as optional `context_usage` on `SDKAssistantMessage`; type-only, forwarded via existing re-export |
| Output-field additions (v0.3.227–v0.3.233) | ⚠️ | `terminal_slash_commands` on `system/init` (v0.3.229), `AgentOutput.usage.output_tokens_details`, `vcs_state_changed.branch` for pushes (v0.3.232) — all type-only, forwarded via existing re-exports; no SDK changes needed |
| Output-field additions (v0.3.234–v0.3.238) | ⚠️ | `SDKSystemMessage.effort` (applied effort level, v0.3.234), `ApiKeySource` value set corrected, `ExitReason` dropped unused `bypass_permissions_disabled`, `SDKMessageOrigin` peer `fromMode` (v0.3.234), `PostToolUseHookSpecificOutput.classifierContext` (v0.3.236), `SDKTaskStartedMessage.is_backgrounded`/`spawn_depth` (v0.3.238), `UserPromptExpansionHookSpecificOutput.suppressOriginalPrompt` (v0.3.238) — all type-only, forwarded via existing re-exports (hook outputs pass through unmodified, inbound NDJSON is cast, not reshaped); no SDK changes needed |
| `perTaskStopAffordance` option | 🔌 | Added in v0.3.246; `Options.perTaskStopAffordance` → `perTaskStopAffordance` init message field; capture-verified byte-identical against official SDK in stdin-messages.test.ts; declares that this consumer wires `stop_task` for per-task stopping, so `interrupt()` on an open-input session spares running background agents/workflows |
| MCP: `createSdkMcpServer({ timeout })` | 🔌 | Added in v0.3.248; per-server tool-call timeout (ms), sent as `sdkMcpServerConfigs: { [name]: { timeout } }` in the init message alongside `sdkMcpServers`; invalid values (non-positive-integer) silently omitted, matching official SDK's validation; capture-verified in mcp-servers.test.ts (valid + invalid cases) |
| Output-field additions (v0.3.239–v0.3.250) | ⚠️ | `ModelUsage.costBasis` (v0.3.246), `Settings.modelPricing` for managed-settings orgs (v0.3.246), `SDKAssistantMessage.user_message_uuid` (v0.3.246), `ambient` flag on `SDKTaskStartedMessage`, `SDKTaskNotificationMessage`, and `SDKBackgroundTasksChangedMessage.tasks[]` (v0.3.247) — all type-only, forwarded via existing re-exports; no SDK changes needed |
| `PreModelSwitchHookInput` / `PostModelSwitchHookInput` / `*HookSpecificOutput` types | ⚠️ | Re-exported from official SDK (v0.3.257); `HookInput`/hook-output union members for the model-switch lifecycle event |
| `SDKMcpResourceLink` type | ⚠️ | Re-exported from official SDK (v0.3.257); shape of `tool_use_result.resourceLinks` and `task_notification.resource_links` entries for backgrounded MCP tasks returning file references (type-only — `tool_use_result` stays `unknown`) |
| Output-field additions (v0.3.251–v0.3.259) | ⚠️ | `ModelUsage.thinkingTokens` (v0.3.257), `SDKAssistantMessage`/result `user_message_uuids[]` alongside `user_message_uuid` for merged-prompt-batch turns (v0.3.259) — all type-only, forwarded via existing re-exports; no SDK changes needed |
| Output-field additions (v0.3.260–v0.3.263) | ⚠️ | `thinking_tokens` system message `user_message_uuid`, result-message `first_content_frame_ms`/`first_stream_post_ms`/`first_stream_post_ack_ms`/`first_stream_post_wall_ms` remote-session latency fields (v0.3.260) — all type-only, forwarded via existing re-exports; no SDK changes needed |
| `systemPrompt` custom type + `snapshot` option | 🔌 | `{ type: 'custom', prompt, snapshot }` was previously unhandled (fell through to no systemPrompt sent); now wraps `prompt` like the string/array cases; `snapshot` (custom or preset) → `systemPromptSnapshot` init field (v0.3.267); stdin parity tested |
| `reloadPlugins({ holdOnCacheImpact })` option | 🔌 | `hold_on_cache_impact` control request field, held reload response carries `held`/`cache_impact` (v0.3.268); stdin parity tested |
| `canUseTool` `defaultToNo` / `suppressAlwaysAllowRule` hints | ⚠️ | `default_to_no`/`suppress_always_allow_rule` on the `can_use_tool` control request forwarded into the callback context (v0.3.268); unit tested in control.test.ts (types are official SDK's, re-exported via `Options`) |
| `listPermissionRules()` (SDK API) | 🔌 | Sends `list_permission_rules` control request; response types (`SDKControlListPermissionRulesResponse`, `SDKControlPermissionRulesState`, `SDKPermissionRuleEntry`, `SDKPermissionRuleDescription`, `SDKPermissionWorkspaceDirectory`) re-exported; not on official SDK's public `Query` type, but present on its runtime Query class (v0.3.270) — implemented to match actual behavior; stdin parity tested |
| Output-field additions (v0.3.265–v0.3.270) | ⚠️ | `result_index`, `local_command`, `resume_reason` (assistant/stream-event/result), `kind` on `get_context_usage` categories, always-present `pending_permission_requests` on `initialize` success — all type-only, forwarded via existing re-exports; no SDK changes needed |
| `canUseTool` `mcpServer` provenance | ✅ | `mcp_server` on the `can_use_tool` control request → `mcpServer: { name, source }` in the callback context (v0.3.274); unit tested in control.test.ts, E2E tested with an in-process SDK MCP server (`source: 'sdk'`) in mcp-servers.test.ts |
| `AgentDefinition.omitClaudeMd` | 🔌 | Added in v0.3.271; passes through the `agents` init message field unchanged; stdin parity tested |
| `McpServerProvenance` / `SDKStartupFailureReason` / `SDKUsageReport` types | ⚠️ | Re-exported from official SDK (v0.3.273–v0.3.274) |
| Output-field additions (v0.3.271–v0.3.276) | ⚠️ | `usage_report` on `/usage` assistant messages, `reason: 'worker_restart'` on `task_notification` (v0.3.273), `startup_failure_reason` on results, `mcp_server` on tool hook inputs, `source` on MCP server status rows (v0.3.274) — all type-only, forwarded via existing re-exports; no SDK changes needed |
| `planModeInstructions` / `toolAliases` / `forwardSubagentText` options | 🔌 | Sent in the `initialize` request (v0.50.0; previously silently ignored); stdin parity tested |
| `supportedDialogKinds` option | 🔌 | Sent in `initialize`; throws without `onUserDialog` like official (v0.50.0); stdin parity tested |
| `outputFormat` → `jsonSchema` init field | 🔌 | JSON schema now also sent in `initialize` alongside `--json-schema`, like official (v0.50.0) |
| Control protocol robustness | ✅ | Control requests are handled concurrently (a callback that awaits a query method no longer deadlocks), `control_cancel_request` aborts callbacks, `keep_alive`/`transcript_mirror` frames are dropped, duplicate deliveries skipped, unsupported inbound subtypes and missing hook ids answered with errors like official (v0.50.0) |
| Process exit handling | ✅ | Iteration waits for stdout to drain before completing; a non-zero exit or signal now rejects with the official error text, preferring the last error `result` (`Claude Code returned an error result: …`) — previously the error result was often lost (v0.50.0, parity tested) |
| MCP: `createSdkMcpServer()` | ✅ | 2 real E2E tests with in-process tools; `instructions` and `alwaysLoad` supported, server-initiated notifications (e.g. `tools/list_changed`) forwarded to the CLI (v0.50.0) |
| MCP: `tool()` helper | ✅ | With Zod schemas and annotations; `searchHint`/`alwaysLoad` sent as `_meta` like official (v0.50.0) |
| MCP: control methods | ✅ | toggle/setServers/status tested; reconnect needs running server |
| Subagent support (`agents`) | ✅ | E2E tested: invocation, hooks, abort |
| Agent teams | ❌ | Types exported only; no env var, no tests |
| Output styles | ✅ | ExtendedQuery extension methods tested |
| Plugin system | ✅ | `--plugin-dir` (argv) and `pluginDelivery: 'initialize'` (stdin) both E2E tested; commands/invocation verified in plugins.test.ts |

---

## Not Implemented

| Feature | Priority | Notes |
|---------|----------|-------|
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
| Test files | 48 (26 integration + 22 unit) | — |
| Dependencies | Claude CLI (external) | Self-contained |

---

**See Also:** [GitHub Issues](https://github.com/foksa/open-claude-agent-sdk/issues) for remaining work
