# Lite Claude Agent SDK

A compatible open-source replacement for `@anthropic-ai/claude-agent-sdk` — thin wrapper that uses your local Claude CLI.

## Why?

| | Lite SDK | Official SDK |
|---|---|---|
| **Size** | ~120KB | 69MB |
| **How it works** | Spawns local CLI | Bundles CLI |
| **Type compatible** | Yes (re-exports) | - |
| **Streaming** | Yes | Yes |
| **Multi-turn** | Yes | Yes |
| **Control methods** | Yes | Yes |

Same API, same types, much smaller.

## Install

```bash
bun add lite-claude-agent-sdk

# Requires Claude CLI
npm install -g @anthropic-ai/claude-code
```

## Usage

```typescript
import { query } from 'lite-claude-agent-sdk';

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
+ import { query } from 'lite-claude-agent-sdk';
```

## Features

### Implemented

- **Query modes** — one-shot, multi-turn (AsyncIterable + streamInput), streaming
- **Control methods** — interrupt, setModel, setPermissionMode, setMaxThinkingTokens, close
- **Query methods** — supportedCommands, supportedModels, accountInfo, mcpServerStatus, initializationResult
- **MCP management** — reconnectMcpServer, toggleMcpServer, setMcpServers
- **Structured outputs** — JSON schema with `outputFormat`
- **Extended thinking** — `maxThinkingTokens` option
- **Skills & commands** — via `settingSources` + `.claude/` directories
- **System prompts** — string, preset (`claude_code`), preset with append
- **Output styles** — custom styles via `.claude/output-styles/`
- **Hooks** — all 15 events (PreToolUse, PostToolUse, Stop, SessionStart/End, SubagentStart/Stop, etc.)
- **Permission callbacks** — canUseTool
- **Session resume** — `resume` option
- **AbortController** — signal-based cancellation
- **Sandbox** — sandbox configuration pass-through

### Lite SDK Extensions

Extra convenience methods beyond the official SDK:

```typescript
import { query, type LiteQuery } from 'lite-claude-agent-sdk';

const q = query({ prompt: '...' }) as LiteQuery;

await q.availableOutputStyles(); // string[]
await q.currentOutputStyle();    // string
```

### Not Yet Implemented

- Budget tracking (`maxDollars` — partial)
- Process-based MCP servers (`mcpServers` option)
- In-process SDK MCP servers (`createSdkMcpServer`)
- File checkpointing / rewindFiles
- Session forking
- Plugins system
- Context compaction

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

- [Feature Comparison](./docs/planning/FEATURES.md) — full feature matrix
- [Migration Guide](./docs/guides/MIGRATION.md) — migrate from official SDK
- [Development Roadmap](./docs/planning/ROADMAP.md) — priorities and timeline

## License

MIT
