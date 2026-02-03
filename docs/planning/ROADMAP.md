# Lite Claude Agent SDK - Development Roadmap

**Last Updated:** 2026-02-03
**Current Status:** Baby Steps 1-5 Complete ✅ | Phase 0.5 (Validation) Complete ✅
**Next Phase:** Phase 1 (Production Features)

---

## Table of Contents

1. [Current Status](#current-status)
2. [Phase 1: Production Ready](#phase-1-production-ready-1-2-weeks)
3. [Phase 2: Advanced Features](#phase-2-advanced-features-1-2-months)
4. [Phase 3: Optional Enhancements](#phase-3-optional-enhancements-as-needed)
5. [Implementation Details](#implementation-details)
6. [Success Metrics](#success-metrics)

---

## Current Status

### ✅ Implemented (Baby Steps 1-5)

#### Core Functionality
- **One-shot queries** - Basic prompt → response pattern
- **Multi-turn conversations** - AsyncIterable input + streamInput()
- **Streaming output** - `includePartialMessages` with stream_event messages
- **Control protocol** - Bidirectional stdin/stdout communication
- **Permission callbacks** - `canUseTool` callback support ✅ Tested
- **Hook callbacks** - Hook system for PreToolUse, PostToolUse, etc. ✅ Tested
- **Type re-exports** - 80+ types from official SDK
- **CLI integration** - Binary detection, argument building, process spawning

#### Query Interface (Complete)
```typescript
interface Query extends AsyncGenerator<SDKMessage> {
  interrupt(): Promise<void>
  setPermissionMode(mode: PermissionMode): Promise<void>
  setModel(model?: string): Promise<void>
  setMaxThinkingTokens(tokens: number | null): Promise<void>
  streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>
  close(): Promise<void>
  // Stubs (not yet implemented):
  supportedCommands(): Promise<any[]>
  supportedModels(): Promise<any[]>
  mcpServerStatus(): Promise<any[]>
  accountInfo(): Promise<any>
  rewindFiles(userMessageId: string, options?: { dryRun?: boolean }): Promise<any>
  reconnectMcpServer(serverName: string): Promise<void>
}
```

#### Bundle Stats
- **Size:** ~200KB (vs 13MB official SDK = 65x smaller)
- **Lines of Code:** ~1,225 LOC
- **Dependencies:** Claude CLI (external)

---

## Phase 1: Production Ready (1-2 weeks)

**Goal:** Essential features for production use cases

### 1.1 Structured Outputs (2-3 days) 🎯 HIGH

**What:** JSON schema validation for structured responses

**Why:** Production apps need reliable, typed responses for data extraction, form filling, API responses

**CLI Support:** `--json-schema <schema>`

**Implementation:**
```typescript
// Add to Options type (already exported from SDK)
export type { OutputFormat, JsonSchemaOutputFormat } from '@anthropic-ai/claude-agent-sdk'

// In buildCliArgs():
if (options.outputFormat?.type === 'json_schema') {
  args.push('--json-schema', JSON.stringify(options.outputFormat.schema));
}
```

**Usage Example:**
```typescript
const query = query({
  prompt: 'Extract user data from this text',
  options: {
    outputFormat: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      }
    }
  }
});
```

**Tests Required:**
- Simple object extraction
- Array of objects
- Nested structures
- Schema validation errors

**Files to Modify:**
- ✅ `src/types/index.ts` - Export OutputFormat types
- `src/core/spawn.ts` - Add --json-schema flag
- `tests/integration/structured-outputs.test.ts` - New test file

---

### 1.2 Extended Thinking Parser (1 day) 🎯 HIGH

**What:** Parse and stream thinking blocks (step-by-step reasoning)

**Why:** Helps developers debug agent behavior, understand decision-making

**CLI Support:** Already included in stream_event messages

**Implementation:**
```typescript
// In QueryImpl.startReading():
if (msg.type === 'stream_event') {
  // Parse thinking blocks from message
  if (msg.thinking) {
    // Yield thinking block to user
    this.messageQueue.push({
      type: 'thinking',
      content: msg.thinking
    });
  }
}
```

**Usage Example:**
```typescript
for await (const msg of query({ ... })) {
  if (msg.type === 'thinking') {
    console.log('🤔 Thinking:', msg.content);
  }
}
```

**Tests Required:**
- Thinking blocks present in output
- Multiple thinking steps
- Thinking + regular messages interleaved

**Files to Modify:**
- `src/api/QueryImpl.ts` - Parse thinking field
- `src/types/index.ts` - Add ThinkingMessage type if needed
- `tests/integration/thinking.test.ts` - New test file

---

### 1.3 Skills & Commands Loader (2-3 days) 🎯 HIGH

**What:** Load project-specific skills and commands from `.claude/` directory

**Why:** Essential for project-specific workflows, custom prompts

**CLI Support:** `--setting-sources <sources>`

**Implementation:**
```typescript
// In buildCliArgs():
if (options.settingSources) {
  args.push('--setting-sources', options.settingSources.join(','));
}

// Optional: Pre-load and validate
async function loadSkills(cwd: string): Promise<string[]> {
  const skillsDir = path.join(cwd, '.claude', 'skills');
  const files = await readdir(skillsDir);
  return files.filter(f => f.endsWith('.md'));
}
```

**Usage Example:**
```typescript
query({
  prompt: 'Use my custom workflow',
  options: {
    settingSources: ['project', 'user'], // Load from .claude/
    cwd: '/path/to/project'
  }
});
```

**Tests Required:**
- Load skills from .claude/skills/*.md
- Load commands from .claude/commands/*.md
- Validate skill injection
- Handle missing .claude/ directory

**Files to Modify:**
- `src/core/spawn.ts` - Add --setting-sources flag
- `tests/integration/skills.test.ts` - New test file
- `tests/fixtures/.claude/skills/test-skill.md` - Test fixture

---

### 1.4 Budget Tracking (2-3 days) 🎯 HIGH

**What:** Track cost and usage statistics in real-time

**Why:** Critical for production - prevent runaway costs, monitor usage

**CLI Support:** Already in result messages (usage stats)

**Implementation:**
```typescript
// In QueryImpl:
class QueryImpl {
  private usageStats = {
    inputTokens: 0,
    outputTokens: 0,
    costUsd: 0
  };

  async accountInfo(): Promise<AccountInfo> {
    return {
      usage: this.usageStats,
      model: this.currentModel,
      budget: this.maxBudgetUsd
    };
  }

  private parseResultMessage(msg: SDKResultMessage) {
    if (msg.result?.usage) {
      this.usageStats.inputTokens += msg.result.usage.input_tokens;
      this.usageStats.outputTokens += msg.result.usage.output_tokens;
      this.usageStats.costUsd += calculateCost(msg.result.usage);
    }
  }
}
```

**Usage Example:**
```typescript
const q = query({ ... });

for await (const msg of q) {
  if (msg.type === 'result') {
    const info = await q.accountInfo();
    console.log(`Cost: $${info.usage.costUsd}`);
  }
}
```

**Tests Required:**
- Parse usage from result messages
- Cumulative token tracking
- Cost calculation
- Budget limit enforcement

**Files to Modify:**
- `src/api/QueryImpl.ts` - Add usage tracking
- `src/types/index.ts` - Add AccountInfo type
- `tests/integration/budget.test.ts` - New test file

---

### Phase 1 Deliverables

✅ **4 major features** implemented
✅ **12+ integration tests** passing
✅ **Updated README** with examples
✅ **Demo app** showcasing new features
✅ **Bundle size** still < 500KB
✅ **Documentation** complete

**Estimated Timeline:** 8-10 days total

---

## Phase 2: Advanced Features (1-2 months)

**Goal:** Feature parity with official SDK for power users

### 2.1 Session Management (3-5 days) ⚠️ MEDIUM

**What:** Resume and fork sessions

**CLI Support:** `--resume <session-id>`, `--fork <session-id>`

**Implementation:**
```typescript
query({
  prompt: 'Continue from before',
  options: {
    resume: 'session-abc-123'
  }
});

query({
  prompt: 'Try alternative approach',
  options: {
    forkSession: 'session-abc-123'
  }
});
```

**Complexity:** Requires session state management, persistence

**Files to Modify:**
- `src/core/spawn.ts` - Add --resume flag
- `src/api/QueryImpl.ts` - Handle session resumption
- `tests/integration/sessions.test.ts` - New test file

---

### 2.2 Advanced Hook Events (1-2 days) ⚠️ MEDIUM

**What:** Support all 11 hook events from official SDK

**Currently Missing:**
- `PostToolUseFailure` - After tool fails
- `SubagentStart` - Subagent initialization
- `SubagentStop` - Subagent completion
- `PreCompact` - Before context compaction
- `PermissionRequest` - Permission dialog
- `SessionStart` - Session begins
- `SessionEnd` - Session ends
- `Notification` - Agent status messages

**Implementation:**
```typescript
// In ControlProtocolHandler:
async handleControlRequest(msg: ControlRequest) {
  switch (msg.request.hook_event_name) {
    case 'PostToolUseFailure':
      return this.handlePostToolUseFailure(msg);
    case 'SubagentStart':
      return this.handleSubagentStart(msg);
    // ... etc
  }
}
```

**Files to Modify:**
- `src/core/control.ts` - Add hook handlers
- `src/types/control.ts` - Add hook types
- `tests/integration/advanced-hooks.test.ts` - New test file

---

### 2.3 Model Management (1 day) ⚠️ MEDIUM

**What:** Query available models at runtime

**Implementation:**
```typescript
async supportedModels(): Promise<Model[]> {
  // Query CLI for available models
  const result = await exec('claude --list-models');
  return parseModels(result);
}
```

**Files to Modify:**
- `src/api/QueryImpl.ts` - Implement supportedModels()
- `tests/integration/models.test.ts` - New test file

---

### 2.4 Sandbox Configuration (2-3 days) ⚠️ MEDIUM

**What:** Configure command execution sandboxing

**CLI Support:** Pass-through to CLI sandbox flags

**Implementation:**
```typescript
query({
  options: {
    sandbox: {
      enabled: true,
      allowedCommands: ['npm', 'git'],
      blockedPaths: ['/etc', '/var']
    }
  }
});
```

**Files to Modify:**
- `src/core/spawn.ts` - Add sandbox flags
- `tests/integration/sandbox.test.ts` - New test file

---

### Phase 2 Deliverables

✅ **Session management** working
✅ **All hook events** supported
✅ **Model querying** implemented
✅ **Sandbox config** pass-through
✅ **Tests** for all features

**Estimated Timeline:** 7-11 days total

---

## Phase 3: Optional Enhancements (As Needed)

**Goal:** Nice-to-have features based on user feedback

### 3.1 V2 API Preview (2-3 days) 🔵 LOW

**What:** Simplified send()/stream() API

**Why:** Alternative API pattern, still in preview in official SDK

**Implementation:**
```typescript
const session = await unstable_v2_createSession({
  systemPrompt: "You are a helpful assistant",
  maxTurns: 10
});

const response = await session.send("Hello!");
```

**Priority:** LOW - V1 API (AsyncGenerator) is recommended

---

### 3.2 File Checkpointing (5-7 days) 🔵 LOW

**What:** Track file changes and rewind to previous states

**Why:** Useful for experimentation, but complex

**Implementation:**
```typescript
query({
  prompt: 'Refactor this code',
  options: { enableFileCheckpointing: true }
});

await query.rewindFiles('checkpoint-uuid');
```

**Priority:** LOW - Complex state tracking, limited use case

---

### 3.3 Context Compaction (5-7 days) 🔵 LOW

**What:** Auto-compact conversation context to save tokens

**Why:** Useful for long conversations, but adds complexity

**Priority:** LOW - Users can manage context themselves

---

### 3.4 Subagent Management (3-5 days) 🔵 LOW

**What:** Programmatic subagent definitions

**Implementation:**
```typescript
query({
  options: {
    agents: [
      {
        id: 'researcher',
        systemPrompt: 'You research information',
        allowedTools: ['WebSearch']
      }
    ]
  }
});
```

**Priority:** LOW - Most users use Task tool instead

---

### 3.5 In-Process MCP Servers (7-10 days) 🔵 LOW

**What:** Create MCP servers via `createSdkMcpServer()`

**Priority:** LOW - Users can configure external MCP servers

---

### 3.6 Plugins System (5-7 days) 🔵 LOW

**What:** Load custom plugins with commands, agents, MCP servers

**Priority:** LOW - Advanced use case

---

## Implementation Details

### Architecture Principles

1. **Thin Wrapper** - Let CLI do the work, don't reimplement
2. **Size First** - Keep bundle < 500KB always
3. **Type Safety** - 100% type compatible with official SDK
4. **Test Coverage** - Every feature has integration tests
5. **Simple Code** - Readable, maintainable implementation

### File Structure

```
src/
├── api/
│   ├── query.ts          # Main query function
│   └── QueryImpl.ts      # Query implementation
├── core/
│   ├── detection.ts      # Binary detection
│   ├── spawn.ts          # Process spawning ⭐ Most feature additions here
│   ├── control.ts        # Control protocol handling
│   └── parser.ts         # NDJSON parsing
├── types/
│   ├── index.ts          # Type re-exports ⭐ Add new types here
│   └── control.ts        # Control protocol types
└── index.ts              # Public exports
```

### Development Workflow

1. **Research** - Check official SDK docs + CLI help
2. **Types** - Add/export types from official SDK
3. **Implementation** - Update spawn.ts or QueryImpl.ts
4. **Tests** - Write integration tests
5. **Demo** - Update comparison demo
6. **Docs** - Update README

### Testing Strategy

**Integration Tests** (primary):
- Actual CLI subprocess execution
- Real message parsing
- NDJSON snapshot comparisons

**Unit Tests** (minimal):
- Pure functions only (parser, args builder)

**E2E Tests** (Playwright):
- Demo app functionality
- Visual regression testing

---

## Success Metrics

### Phase 1 Success Criteria

- [ ] Structured outputs work with JSON schema
- [ ] Thinking blocks parsed and displayed
- [ ] Skills/commands load from .claude/
- [ ] Budget tracking shows real-time costs
- [ ] All integration tests pass (16+ tests total)
- [ ] Demo showcases all features
- [ ] README updated with examples
- [ ] Bundle size < 500KB

### Phase 2 Success Criteria

- [ ] Sessions resume and fork correctly
- [ ] All 11 hook events supported
- [ ] Models queryable at runtime
- [ ] Sandbox configuration works
- [ ] 25+ integration tests passing

### Overall Success Metrics

- **Bundle Size:** < 500KB (vs 13MB = 26x smaller)
- **Type Safety:** 100% compatible with official SDK
- **Test Coverage:** > 80% of core functionality
- **Performance:** < 50ms SDK overhead per query
- **Documentation:** Complete examples for all features

---

## Risk Assessment

### Low Risk (✅ Easy)
- Structured outputs (pass-through to CLI)
- Thinking parser (parse existing field)
- Skills/commands (file loading)
- Budget tracking (parse existing stats)

### Medium Risk (⚠️ Moderate)
- Session management (state persistence)
- Advanced hooks (routing complexity)
- Sandbox config (CLI flag support)

### High Risk (🔴 Complex)
- File checkpointing (snapshot system)
- Context compaction (transcript management)
- In-process MCP servers (protocol implementation)
- Plugins system (dynamic loading)

**Strategy:** Focus on Low Risk items first, defer High Risk until user demand is clear.

---

## Timeline Summary

| Phase | Duration | Features |
|-------|----------|----------|
| **Phase 1** | 1-2 weeks | Structured outputs, Thinking, Skills, Budget |
| **Phase 2** | 1-2 months | Sessions, Hooks, Models, Sandbox |
| **Phase 3** | As needed | V2 API, Checkpointing, Compaction, Plugins |

**Total to Production:** 8-10 days
**Total to Feature Parity:** 15-21 days
**Total to Full SDK:** 44-63 days (only if needed)

---

## Next Steps

1. ✅ Clean up documentation (delete obsolete files)
2. ✅ Phase 0.5: Validation complete (canUseTool & hooks tested)
3. ✅ Implement `systemPrompt` option - Pass via stdin init message
4. 🚀 Begin Phase 1 implementation
5. 📦 Ship v1.0.0 with production features

---

**Last Updated:** 2026-02-02
**Maintainer:** lite-claude-agent-sdk team
