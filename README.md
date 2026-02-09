# Open Claude Agent SDK

A compatible open-source replacement for `@anthropic-ai/claude-agent-sdk` — thin wrapper that uses your local Claude CLI.

## Why?

| | Open SDK | Official SDK |
|---|---|---|
| **Bundle size** | ~488KB | ~13MB |
| **How it works** | Spawns local CLI | Bundles CLI |
| **Type compatible** | Yes (re-exports) | - |
| **Streaming** | Yes | Yes |
| **Multi-turn** | Yes | Yes |
| **MCP servers** | Yes | Yes |
| **Subagents** | Yes | Yes |
| **Hooks** | Yes | Yes |

Same API, same types, much smaller.

## Install

```bash
bun add open-claude-agent-sdk

# Requires Claude CLI
npm install -g @anthropic-ai/claude-code
```

## Usage

```typescript
import { query } from 'open-claude-agent-sdk';

for await (const msg of query({
  prompt: 'Write a haiku about coding',
  options: { maxTurns: 3 }
})) {
  if (msg.type === 'assistant') {
    console.log(msg.message.content);
  }
  if (msg.type === 'result') break;
}
```

Drop-in replacement — just change the import:

```diff
- import { query } from '@anthropic-ai/claude-agent-sdk';
+ import { query } from 'open-claude-agent-sdk';
```

## Features

### Core

- **Query modes** — one-shot, multi-turn (AsyncIterable + streamInput), streaming
- **Control methods** — interrupt, close, setModel, setPermissionMode, setMaxThinkingTokens
- **Query methods** — supportedCommands, supportedModels, accountInfo, mcpServerStatus
- **Structured outputs** — JSON schema with `outputFormat`
- **Extended thinking** — `maxThinkingTokens` option
- **System prompts** — string, preset (`claude_code`), preset with append
- **Permission callbacks** — `canUseTool` with allow/deny/selective/async
- **AbortController** — signal-based cancellation
- **Session management** — resume, fork, continue, custom sessionId
- **Cost tracking** — `total_cost_usd`, usage, modelUsage

### MCP Servers

- **In-process SDK servers** — `createSdkMcpServer()` + `tool()` helper with Zod schemas
- **Process-based servers** — stdio MCP server config via `mcpServers` option
- **Control methods** — `reconnectMcpServer()`, `toggleMcpServer()`, `setMcpServers()`

### Subagents & Hooks

- **Programmatic subagents** — `agents` option, Task tool invocation, `parent_tool_use_id`
- **Hooks** — 10 of 15 events tested E2E (PreToolUse, PostToolUse, PostToolUseFailure, UserPromptSubmit, Stop, SubagentStart, SubagentStop, plus matchers)
- **Skills & commands** — via `settingSources` + `.claude/` directories
- **Output styles** — custom styles via `.claude/output-styles/`
- **Sandbox** — sandbox configuration pass-through

### Open SDK Extensions

Extra convenience methods beyond the official SDK:

```typescript
import { query, type ExtendedQuery } from 'open-claude-agent-sdk';

const q = query({ prompt: '...' }) as ExtendedQuery;

await q.availableOutputStyles(); // string[]
await q.currentOutputStyle();    // string
```

### Not Yet Implemented

- `rewindFiles()` — no CLI protocol support
- Agent teams — experimental, no env var support
- V2 API (`unstable_v2_*`) — experimental preview

See [FEATURES.md](./docs/planning/FEATURES.md) for full status matrix.

## Demos

Three demo apps ported from the official SDK, running on both SDKs:

```bash
# Hello world
bun demos/lite/hello-world/index.ts

# Interactive chat
bun demos/lite/simple-chatapp/index.ts

# Resume generator
bun demos/lite/resume-generator/index.ts
```

## Testing

```bash
# Integration tests (primary)
bun test tests/integration/

# Unit tests (SDK compatibility)
bun test tests/unit/

# Type check
bun run typecheck
```

## Documentation

- [API Reference](./docs/api/API.md) — query function, message types, examples
- [Options Reference](./docs/api/OPTIONS.md) — all query options
- [Feature Matrix](./docs/planning/FEATURES.md) — full feature comparison
- [Migration Guide](./docs/guides/MIGRATION.md) — migrate from official SDK

## License

MIT
