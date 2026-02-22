# Changelog

## 0.12.0 (2026-02-22)

### Features

- Update `@anthropic-ai/claude-agent-sdk` to v0.2.50 parity
- Add `WorktreeCreate` / `WorktreeRemove` hook type re-exports
- Add `apply_flag_settings` control protocol type
- Hook event compat test now covers all 18 events (was 15)

### Fixes

- Fix EPERM in sandboxed CI: redirect `CLAUDE_CONFIG_DIR` to writable tmpdir in test setup

## 0.9.0 (2026-02-10)

Initial open-source release.

### Features

- One-shot and multi-turn queries (AsyncIterable + streamInput)
- Control methods: interrupt, close, setModel, setPermissionMode, setMaxThinkingTokens
- Query methods: supportedCommands, supportedModels, accountInfo, mcpServerStatus
- Structured outputs with `outputFormat`
- Extended thinking with `maxThinkingTokens`
- System prompts: string, preset (`claude_code`), preset with append
- Permission callbacks with `canUseTool`
- AbortController signal-based cancellation
- Session management: resume, fork, continue, custom sessionId
- Cost tracking: `total_cost_usd`, usage, modelUsage
- In-process MCP servers with `createSdkMcpServer()` and `tool()` helper
- Process-based MCP servers via `mcpServers` option
- MCP control methods: reconnectMcpServer, toggleMcpServer, setMcpServers
- Programmatic subagents via `agents` option
- Hooks: 10 of 15 events tested E2E
- Skills, commands, output styles via `settingSources`
- Development tools: capture-cli and proxy-cli for protocol debugging

### Architecture

- Ships readable TypeScript source + transpiled JS (not bundled/minified)
- Source maps included for debugger support
- 100% type compatible with `@anthropic-ai/claude-agent-sdk` (re-exports official types)
