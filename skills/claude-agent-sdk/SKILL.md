---
name: claude-agent-sdk
description: Guide for building applications with the Claude Agent SDK (lite-claude-agent-sdk or @anthropic-ai/claude-agent-sdk). Use when developing apps that spawn Claude as a subprocess, including query options, hooks, MCP servers, multi-turn conversations, streaming, permissions, structured output, and session management.
---

# Claude Agent SDK

Build AI agents using `query()` — a thin wrapper that spawns Claude CLI as a subprocess and streams NDJSON messages back.

## Import

```typescript
// Official SDK
import { query } from "@anthropic-ai/claude-agent-sdk";

// Lite SDK (compatible drop-in replacement)
import { query } from "lite-claude-agent-sdk";
```

## Quick Start

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Find and fix the bug in auth.py",
  options: { allowedTools: ["Read", "Edit", "Bash"] }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

## Core Pattern

`query()` returns an `AsyncGenerator<SDKMessage>` (the `Query` object). Iterate to receive messages:

```typescript
const q = query({ prompt: "...", options: { ... } });

for await (const message of q) {
  switch (message.type) {
    case "system":    // Init message — session_id, tools, model
    case "assistant": // Claude's response with content blocks
    case "user":      // Echoed user messages
    case "result":    // Final result — check message.subtype
  }
}
```

The `result` message signals completion. Check `message.subtype`:
- `"success"` — `message.result` has the text, `message.structured_output` has JSON (if outputFormat set)
- `"error_max_turns"` / `"error_during_execution"` / `"error_max_budget_usd"` — check `message.errors`

## Key Query Options

| Option | Type | Description |
|--------|------|-------------|
| `prompt` | `string \| AsyncIterable<SDKUserMessage>` | User prompt or streaming input |
| `model` | `string` | Model to use (e.g., `"claude-sonnet-4-5"`) |
| `maxTurns` | `number` | Maximum conversation turns |
| `permissionMode` | `PermissionMode` | `"default"` \| `"acceptEdits"` \| `"bypassPermissions"` \| `"plan"` |
| `systemPrompt` | `string \| { type: "preset", preset: "claude_code", append?: string }` | System prompt config |
| `hooks` | `Record<HookEvent, HookCallbackMatcher[]>` | Hook callbacks for events |
| `mcpServers` | `Record<string, McpServerConfig>` | MCP server configurations |
| `canUseTool` | `CanUseTool` | Custom permission callback |
| `allowedTools` | `string[]` | Allowed tool names (e.g., `["Read", "mcp__server__*"]`) |
| `outputFormat` | `{ type: "json_schema", schema: JSONSchema }` | Structured output schema |
| `abortController` | `AbortController` | Cancel the query |
| `includePartialMessages` | `boolean` | Enable token streaming |
| `resume` | `string` | Session ID to resume |
| `cwd` | `string` | Working directory |

See `references/query-options.md` for the complete list of 35+ options with types and defaults.

## Control Methods

Methods available on the `Query` object (streaming input mode only unless noted):

| Method | Description |
|--------|-------------|
| `q.interrupt()` | Interrupt current execution |
| `q.streamInput(msg)` | Send additional messages |
| `q.setModel(model)` | Change model mid-session |
| `q.setPermissionMode(mode)` | Change permissions mid-session |
| `q.setMaxThinkingTokens(n)` | Adjust thinking tokens |
| `q.supportedCommands()` | List slash commands (works always) |
| `q.supportedModels()` | List available models (works always) |
| `q.mcpServerStatus()` | Check MCP server status (works always) |
| `q.accountInfo()` | Get account info (works always) |
| `q.rewindFiles(uuid)` | Restore files to checkpoint (requires `enableFileCheckpointing`) |

## When to Load References

Load additional reference files based on what you need:

- **`references/query-options.md`** — When you need the full list of all query options with types, defaults, and descriptions. Load when configuring advanced options like `sandbox`, `agents`, `settingSources`, `betas`, etc.

- **`references/hooks.md`** — When implementing hooks to intercept agent execution. Covers all 15 hook events, matcher syntax, callback inputs/outputs, and permission decisions.

- **`references/mcp-servers.md`** — When adding MCP servers (stdio, HTTP/SSE, or SDK in-process). Covers `createSdkMcpServer()`, `tool()` helper, `allowedTools` wildcards, and MCP control methods.

- **`references/patterns.md`** — When building multi-turn conversations, streaming UIs, session management, `canUseTool` approval flows, structured outputs, or handling common gotchas.
