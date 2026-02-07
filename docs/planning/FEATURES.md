# Feature Comparison: Lite SDK vs Official SDK

**Last Updated:** 2026-02-05
**Purpose:** Comprehensive feature matrix showing what we have, what we need, and what we don't need

---

## Table of Contents

1. [Feature Status Matrix](#feature-status-matrix)
2. [Core API Features](#core-api-features)
3. [Query Options](#query-options)
4. [Hook Events](#hook-events)
5. [Built-in Tools](#built-in-tools)
6. [What We Don't Need](#what-we-dont-need)
7. [Implementation Priority](#implementation-priority)

---

## Feature Status Matrix

| Feature Category | Lite SDK | Official SDK | Priority | Effort |
|-----------------|----------|--------------|----------|--------|
| **Core APIs** |
| One-shot queries | ✅ | ✅ | - | Complete |
| Multi-turn conversations | ✅ | ✅ | - | Complete |
| Streaming output | ✅ | ✅ | - | Complete |
| AsyncGenerator pattern | ✅ | ✅ | - | Complete |
| Control protocol | ✅ | ✅ | - | Complete |
| V2 API (send/stream) | ❌ | ✅ Preview | LOW | 2-3 days |
| **Query Control** |
| interrupt() | ✅ | ✅ | - | Complete |
| setPermissionMode() | ✅ | ✅ | - | Complete |
| setModel() | ✅ | ✅ | - | Complete |
| setMaxThinkingTokens() | ✅ | ✅ | - | Complete |
| streamInput() | ✅ | ✅ | - | Complete |
| close() | ✅ | ✅ | - | Complete |
| supportedCommands() | ✅ | ✅ | - | Complete |
| supportedModels() | ✅ | ✅ | - | Complete |
| mcpServerStatus() | ✅ | ✅ | - | Complete |
| accountInfo() | ✅ | ✅ | - | Complete |
| rewindFiles() | ⚠️ Stub | ✅ | LOW | 5-7 days |
| reconnectMcpServer() | ✅ | ✅ | - | Complete |
| toggleMcpServer() | ✅ | ✅ | - | Complete |
| setMcpServers() | ✅ | ✅ | - | Complete |
| **Advanced Features** |
| Structured outputs | ✅ | ✅ | - | Complete |
| Extended thinking | ✅ | ✅ | - | Complete |
| Skills/commands | ✅ | ✅ | - | Complete |
| Budget tracking | ⚠️ Partial | ✅ | HIGH | 2-3 days |
| Session management | ✅ Resume | ✅ | MEDIUM | Fork pending |
| File checkpointing | ❌ | ✅ | LOW | 5-7 days |
| Context compaction | ❌ | ✅ | LOW | 5-7 days |
| Plugins system | ✅ | ✅ | - | Complete |
| **Hooks** |
| PreToolUse | ✅ | ✅ | - | Complete |
| PostToolUse | ✅ | ✅ | - | Complete |
| UserPromptSubmit | ✅ | ✅ | - | Complete |
| Stop | ✅ | ✅ | - | Complete |
| PostToolUseFailure | ✅ | ✅ | - | Complete |
| SubagentStart | ✅ | ✅ | - | Complete |
| SubagentStop | ✅ | ✅ | - | Complete |
| PreCompact | ✅ | ✅ | - | Complete |
| PermissionRequest | ✅ | ✅ | - | Complete |
| SessionStart | ✅ | ✅ | - | Complete |
| SessionEnd | ✅ | ✅ | - | Complete |
| Notification | ✅ | ✅ | - | Complete |
| Setup | ✅ | ✅ | - | Complete |
| TeammateIdle | ✅ | ✅ | - | Complete (SDK 0.2.34+) |
| TaskCompleted | ✅ | ✅ | - | Complete (SDK 0.2.34+) |
| **Callbacks** |
| canUseTool | ✅ Tested | ✅ | - | Complete |
| hooks | ✅ Tested | ✅ | - | Complete |
| **Size & Performance** |
| Bundle size | 200KB | 13MB | - | 65x smaller |
| Installation time | < 1s | ~30s | - | Faster |
| Startup overhead | < 50ms | ~200ms | - | Faster |

**Legend:**
- ✅ Fully implemented
- ⚠️ Partial implementation or stub
- ❌ Not implemented

---

## Core API Features

### Query Function

#### Lite SDK ✅
```typescript
import { query } from 'lite-claude-agent-sdk';

// Simple one-shot
for await (const msg of query({
  prompt: 'Hello',
  options: { permissionMode: 'bypassPermissions' }
})) {
  console.log(msg);
}

// Multi-turn with AsyncIterable
async function* conversation() {
  yield { type: 'user', message: { role: 'user', content: 'Hi' } };
  yield { type: 'user', message: { role: 'user', content: 'Tell me more' } };
}

for await (const msg of query({
  prompt: conversation(),
  options: {}
})) {
  console.log(msg);
}

// Multi-turn with streamInput()
const q = query({ prompt: 'Hi', options: {} });

for await (const msg of q) {
  if (needsMoreInput) {
    await q.streamInput(moreMessages());
  }
}
```

#### Official SDK ✅
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

// Same API - 100% compatible
for await (const msg of query({
  prompt: 'Hello',
  options: { permissionMode: 'bypassPermissions' }
})) {
  console.log(msg);
}
```

**Status:** ✅ Complete parity

---

### V2 API (Preview)

#### Lite SDK ❌
Not implemented

#### Official SDK ✅
```typescript
import { unstable_v2_createSession } from '@anthropic-ai/claude-agent-sdk';

const session = await unstable_v2_createSession({
  systemPrompt: "You are helpful",
  maxTurns: 10
});

const response = await session.send("Hello!");
for await (const event of session.stream()) {
  console.log(event);
}
```

**Status:** ❌ Not implemented
**Priority:** LOW (V1 API is recommended)
**Effort:** 2-3 days

---

## Query Options

### Essential Options (Implemented)

| Option | Lite SDK | Official SDK | CLI Flag |
|--------|----------|--------------|----------|
| `prompt` | ✅ | ✅ | stdin |
| `permissionMode` | ✅ | ✅ | `--permission-mode` |
| `model` | ✅ | ✅ | `--model` |
| `maxTurns` | ✅ | ✅ | `--max-turns` |
| `maxBudgetUsd` | ✅ | ✅ | `--max-budget-usd` |
| `includePartialMessages` | ✅ | ✅ | `--include-partial-messages` |
| `cwd` | ✅ | ✅ | `--cwd` |
| `canUseTool` | ✅ | ✅ | (callback) |
| `hooks` | ✅ | ✅ | (callback) |
| `allowDangerouslySkipPermissions` | ✅ | ✅ | (flag) |

### Phase 1 Options (To Implement)

| Option | Lite SDK | Official SDK | CLI Flag | Priority |
|--------|----------|--------------|----------|----------|
| `outputFormat` | ✅ | ✅ | `--json-schema` | Complete |
| `settingSources` | ✅ | ✅ | `--setting-sources` | Complete |

### Phase 2 Options (Advanced)

| Option | Lite SDK | Official SDK | CLI Flag | Status |
|--------|----------|--------------|----------|--------|
| `resume` | ✅ | ✅ | `--resume` | Complete |
| `forkSession` | ❌ | ✅ | `--fork` | MEDIUM |
| `sandbox` | ✅ | ✅ | `--settings` | Complete |
| `abortController` | ✅ | ✅ | (signal handler) | Complete |
| `systemPrompt` | ✅ | ✅ | stdin init message | Complete |
| `allowedTools` | ✅ | ✅ | `--allowedTools` | Complete |
| `disallowedTools` | ✅ | ✅ | `--disallowedTools` | Complete |
| `mcpServers` | ✅ | ✅ | `--mcp-config` | Complete |
| `agents` | ❌ | ✅ | (programmatic) | LOW |
| `enableFileCheckpointing` | ❌ | ✅ | `--enable-checkpointing` | LOW |
| `plugins` | ✅ | ✅ | `--plugin-dir` | Complete |

---

## Hook Events

### Hook Event Support

All 15 hook events are supported. Hook infrastructure is generic — any event name
registered in `hooks` config is forwarded to CLI and callbacks are invoked when
the event fires. Events differ only in what triggers them.

**Note:** `SessionStart` and `SessionEnd` only fire via declarative config
(`.claude/settings.json`), not programmatic `hooks` option. This is a known
limitation in the official SDK ([issue #83](https://github.com/anthropics/claude-agent-sdk-typescript/issues/83)).

| Hook Event | Lite SDK | Official SDK | Use Case |
|------------|----------|--------------|----------|
| `PreToolUse` | ✅ | ✅ | Intercept/modify tool calls before execution |
| `PostToolUse` | ✅ | ✅ | Process tool results after execution |
| `PostToolUseFailure` | ✅ | ✅ | Handle tool failures |
| `UserPromptSubmit` | ✅ | ✅ | Validate/modify user input |
| `Stop` | ✅ | ✅ | Clean up on agent stop |
| `SessionStart` | ✅ | ✅ | Initialize session state |
| `SessionEnd` | ✅ | ✅ | Clean up session resources |
| `Notification` | ✅ | ✅ | Display agent status |
| `SubagentStart` | ✅ | ✅ | Track subagent lifecycle |
| `SubagentStop` | ✅ | ✅ | Handle subagent completion |
| `PreCompact` | ✅ | ✅ | Before context compaction |
| `PermissionRequest` | ✅ | ✅ | Custom permission UI |
| `Setup` | ✅ | ✅ | Session setup phase |
| `TeammateIdle` | ✅ | ✅ | Teammate agent idle (0.2.34+) |
| `TaskCompleted` | ✅ | ✅ | Task completion in teams (0.2.34+) |

### Hook Implementation Example

```typescript
// Lite SDK - Current Implementation ✅
query({
  prompt: 'Do something',
  options: {
    hooks: {
      PreToolUse: async (input) => {
        console.log('About to call tool:', input.tool_name);
        return { behavior: 'allow' };
      },
      PostToolUse: async (input) => {
        console.log('Tool result:', input.tool_result);
      }
    }
  }
});

// All hook events supported ✅
query({
  options: {
    hooks: {
      PostToolUseFailure: [{ hooks: [async (input) => {
        console.error('Tool failed:', input.error);
        return {};
      }] }],
      SubagentStart: [{ hooks: [async (input) => {
        console.log('Subagent started:', input.agent_id);
        return {};
      }] }],
      TeammateIdle: [{ hooks: [async (input) => {
        console.log('Teammate idle:', input.teammate_name);
        return {};
      }] }],
    }
  }
});
```

---

## Built-in Tools

### Tool Pass-Through (CLI Handles)

Lite SDK doesn't implement tools directly - all tools are handled by Claude CLI. We just pass options through.

| Tool | CLI Support | Lite SDK | Official SDK |
|------|-------------|----------|--------------|
| Read | ✅ | ✅ Pass-through | ✅ Built-in |
| Write | ✅ | ✅ Pass-through | ✅ Built-in |
| Edit | ✅ | ✅ Pass-through | ✅ Built-in |
| Bash | ✅ | ✅ Pass-through | ✅ Built-in |
| Glob | ✅ | ✅ Pass-through | ✅ Built-in |
| Grep | ✅ | ✅ Pass-through | ✅ Built-in |
| WebSearch | ✅ | ✅ Pass-through | ✅ Built-in |
| WebFetch | ✅ | ✅ Pass-through | ✅ Built-in |
| Task | ✅ | ✅ Pass-through | ✅ Built-in |
| AskUserQuestion | ✅ | ✅ Pass-through | ✅ Built-in |
| EnterPlanMode | ✅ | ✅ Pass-through | ✅ Built-in |
| ExitPlanMode | ✅ | ✅ Pass-through | ✅ Built-in |
| TaskCreate | ✅ | ✅ Pass-through | ✅ Built-in |
| TaskUpdate | ✅ | ✅ Pass-through | ✅ Built-in |
| TaskList | ✅ | ✅ Pass-through | ✅ Built-in |

**Strategy:** Let CLI handle all tool execution, we just manage communication and permissions.

---

## What We Don't Need

These features are handled by Claude CLI or not needed for our use case:

### ✅ CLI Handles These

1. **Tool Execution** - CLI has all 15 built-in tools
2. **Permission Prompts** - CLI handles interactive prompts
3. **MCP Server Management** - CLI manages MCP connections
4. **Binary Updates** - Users update CLI directly
5. **Credential Management** - CLI handles API keys
6. **Rate Limiting** - CLI enforces limits
7. **Retry Logic** - CLI handles retries

### ✅ Not Core Use Cases

1. **Self-Contained Binary** - Users have CLI installed
2. **Offline Mode** - Not applicable for API-based agent
3. **Custom Tool Implementation** - MCP servers for custom tools
4. **UI Components** - SDK is for programmatic use
5. **Web Dashboard** - Out of scope

---

## Implementation Priority

### Phase 1: Production Ready (1-2 weeks) 🎯

**Must Have for Production:**

1. **Structured Outputs** (2-3 days)
   - JSON schema validation
   - Typed responses
   - Data extraction use cases

2. **Extended Thinking** (1 day)
   - Parse thinking blocks
   - Debug agent reasoning
   - Better transparency

3. **Skills & Commands** (2-3 days)
   - Project-specific workflows
   - Custom prompts
   - Reusable patterns

4. **Budget Tracking** (2-3 days)
   - Real-time cost monitoring
   - Usage statistics
   - Budget limits

**Deliverables:**
- 4 major features
- 12+ integration tests
- Updated demo app
- Complete documentation

---

### Phase 2: Advanced Features (1-2 months) ⚠️

**Nice to Have:**

1. **Session Management** ✅ Partial
   - ✅ Resume sessions (implemented)
   - ❌ Fork sessions (pending)
   - Session state (via CLI)

2. **Advanced Hooks** ✅ Complete
   - All 15 hook events supported (generic infrastructure)
   - Hook matchers and composition
   - Integration + unit tests

3. **Model Management** ✅ Complete
   - ✅ Query available models (supportedModels)
   - ✅ Model metadata (initializationResult)
   - ✅ Account info (accountInfo)

4. **Sandbox Config** ✅ Complete
   - ✅ Sandbox enabled flag
   - ✅ Auto-allow bash option
   - Command restrictions (CLI feature)
   - Path restrictions (CLI feature)

**Deliverables:**
- Session persistence
- Complete hook system
- Security features
- 25+ tests total

---

### Phase 3: Optional Enhancements (As Needed) 🔵

**Only If Requested:**

1. **V2 API** (2-3 days) - Alternative API pattern
2. **File Checkpointing** (5-7 days) - Rewind file states
3. **Context Compaction** (5-7 days) - Auto-compact messages
4. **Subagent Management** (3-5 days) - Programmatic agents
5. **MCP Server Creation** (7-10 days) - In-process servers
6. **Plugins System** (5-7 days) - Custom plugins

---

## Size Comparison

| Metric | Lite SDK | Official SDK | Difference |
|--------|----------|--------------|------------|
| Bundle Size | 200KB | 13MB | **65x smaller** |
| Dependencies | CLI (external) | Self-contained | Simpler |
| Installation | < 1s | ~30s | **30x faster** |
| Lines of Code | ~1,225 | ~50,000+ | **40x less** |
| Startup Time | < 50ms | ~200ms | **4x faster** |

---

## Type Compatibility

### 100% Type Compatible ✅

Lite SDK re-exports all types from official SDK:

```typescript
// All of these work identically in both SDKs
import type {
  Query,
  Options,
  SDKMessage,
  SDKAssistantMessage,
  SDKUserMessage,
  SDKResultMessage,
  PermissionMode,
  HookCallback,
  CanUseTool,
  // ... 80+ more types
} from 'lite-claude-agent-sdk'; // or '@anthropic-ai/claude-agent-sdk'
```

**Benefits:**
- Drop-in replacement
- Type-safe refactoring
- Same IDE autocomplete
- Identical interfaces

---

## Migration Path

### From Official SDK to Lite SDK

**Easy Migration:**
```typescript
// Before (official SDK)
import { query } from '@anthropic-ai/claude-agent-sdk';

// After (lite SDK)
import { query } from 'lite-claude-agent-sdk';

// Same code works!
for await (const msg of query({ prompt: 'Hello', options: {} })) {
  console.log(msg);
}
```

**Requirements:**
1. Install Claude CLI: `npm install -g @anthropic-ai/claude-code`
2. Update import path
3. Test edge cases (most features work identically)

**Incompatibilities:**
- Features not yet implemented (see roadmap)
- V2 API not available
- Some advanced options missing

---

## Conclusion

### Current State

✅ **Core Functionality:** Complete
✅ **Type Safety:** 100% compatible
✅ **Bundle Size:** 65x smaller
✅ **Multi-turn:** Fully working
✅ **Structured Outputs:** Complete (PR #11)
✅ **Extended Thinking:** Complete (PR #10)
✅ **Session Resume:** Complete
✅ **Sandbox Config:** Complete
✅ **AbortController:** Complete
✅ **systemPrompt:** Complete (string, preset with append, preset without append)
✅ **Hooks:** All 15 events supported (SDK 0.2.34)
⚠️ **Remaining Phase 1:** Budget Tracking

### Next Steps

1. Complete remaining Phase 1 features (Skills/Commands, Budget Tracking)
2. Ship v1.0.0 for production use
3. Gather user feedback
4. Implement Phase 2 based on demand

### Target Users

**Best For:**
- Applications prioritizing bundle size
- Projects using local Claude CLI
- Simple to moderate complexity agents
- Cost-conscious production deployments

**Not Ideal For:**
- Self-contained deployments (no CLI)
- Complex subagent orchestration (Phase 3)
- File checkpointing workflows (Phase 3)

---

**Last Updated:** 2026-02-05
**See Also:** [ROADMAP.md](./ROADMAP.md) for implementation timeline
