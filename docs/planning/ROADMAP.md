# Lite Claude Agent SDK - Development Roadmap

**Last Updated:** 2026-02-07
**Current Status:** Core Features Complete ✅ | Phase 1 Complete ✅
**Next Phase:** v1.0.0 Release

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

### ✅ Implemented

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

### 1.1 Structured Outputs ✅ COMPLETE

**What:** JSON schema validation for structured responses

**Status:** ✅ Implemented in PR #11

**Implementation:**
- ✅ `src/types/index.ts` - Export OutputFormat types
- ✅ `src/core/spawn.ts` - Add --json-schema flag
- ✅ `tests/integration/structured-outputs.test.ts` - Integration tests

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

---

### 1.2 Extended Thinking ✅ COMPLETE

**What:** Enable extended thinking via `maxThinkingTokens` option

**Status:** ✅ Implemented in PR #10

**Implementation:**
- ✅ `src/core/spawn.ts` - Add --max-thinking-tokens flag
- ✅ `src/api/QueryImpl.ts` - setMaxThinkingTokens() method
- ✅ `tests/integration/extended-thinking.test.ts` - Integration tests

**Usage Example:**
```typescript
const q = query({
  prompt: 'Solve this complex problem',
  options: {
    maxThinkingTokens: 10000
  }
});

// Or dynamically:
await q.setMaxThinkingTokens(5000);
```

---

### 1.3 Skills & Commands Loader ✅ COMPLETE

**What:** Load project-specific skills and commands from `.claude/` directory

**Status:** ✅ Implemented

**Implementation:**
- ✅ `--setting-sources` CLI flag for loading settings from project/user directories
- ✅ `--allowedTools` CLI flag for specifying allowed tools (including `Skill`)
- ✅ `--disallowedTools` CLI flag for blocking specific tools
- ✅ Integration tests for skills loading and invocation
- ✅ Integration tests for custom commands

**Usage Example:**
```typescript
query({
  prompt: 'Use my custom workflow',
  options: {
    settingSources: ['project', 'user'], // Load from .claude/
    allowedTools: ['Skill', 'Read', 'Write'], // Enable Skill tool
    cwd: '/path/to/project'
  }
});
```

**Files Modified:**
- `src/core/argBuilder.ts` - Add --disallowedTools flag
- `tests/integration/skills.test.ts` - Skills integration tests
- `tests/integration/commands.test.ts` - Commands integration tests
- `tests/fixtures/.claude/skills/greeting/SKILL.md` - Test skill fixture
- `tests/fixtures/.claude/commands/hello.md` - Test command fixture
- `tests/fixtures/.claude/commands/greet.md` - Test command with arguments

---

### 1.4 Budget Tracking ✅ COMPLETE

**What:** Cost and usage statistics from CLI result messages

**Status:** ✅ Complete — CLI passes through `total_cost_usd`, `usage`, and `modelUsage` fields on result messages. No `src/` changes needed (pass-through wrapper).

**Verified fields:**
- `SDKResultMessage.total_cost_usd` — authoritative total cost
- `SDKResultMessage.usage` — cumulative `NonNullableUsage` (input_tokens, output_tokens, etc.)
- `SDKResultMessage.modelUsage` — per-model breakdown (`Record<string, ModelUsage>`)
- `SDKAssistantMessage.message.usage` — per-step usage on the nested `BetaMessage`

**Tests:** `tests/integration/cost-tracking.test.ts`

---

### Phase 1 Deliverables

✅ **Structured Outputs** - JSON schema validation (PR #11)
✅ **Extended Thinking** - maxThinkingTokens option (PR #10)
✅ **Skills/Commands** - settingSources, allowedTools, disallowedTools
✅ **Budget Tracking** - Cost/usage pass-through verified

**Completed:** 4 of 4 major features

---

## Phase 2: Advanced Features (1-2 months)

**Goal:** Feature parity with official SDK for power users

### 2.1 Session Management ✅ COMPLETE

**What:** Resume, fork, and manage sessions

**Status:** ✅ All session options implemented
- `resume` — `--resume`
- `continue` — `--continue`
- `forkSession` — `--fork-session`
- `sessionId` — `--session-id`
- `resumeSessionAt` — `--resume-session-at`
- `persistSession` — `--no-session-persistence` (inverted)

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

### 2.4 Sandbox Configuration ✅ COMPLETE

**What:** Configure command execution sandboxing

**Status:** ✅ Implemented - passed via --settings flag

**Implementation:**
```typescript
query({
  options: {
    sandbox: {
      enabled: true,
      autoAllowBash: false
    }
  }
});
```

**Notes:**
- Sandbox configuration passed via `--settings` JSON flag
- CLI handles actual sandbox enforcement

---

### 2.5 CLI Options Parity ✅ COMPLETE

**What:** All remaining CLI options from official SDK

**Status:** ✅ All options implemented
- `additionalDirectories`, `agent`, `betas`, `fallbackModel`
- `strictMcpConfig`, `tools`, `permissionPromptToolName`, `extraArgs`
- `executable`, `executableArgs`, `env`, `stderr`, `spawnClaudeCodeProcess`
- `enableFileCheckpointing` (env var)

### Phase 2 Deliverables

✅ **Session management** - All options (resume, fork, continue, etc.)
✅ **All hook events** - 15/15 implemented
✅ **Model querying** - Via initializationResult
✅ **Sandbox config** - Complete
✅ **CLI options parity** - All options implemented
✅ **Tests** - 62 unit tests passing

**Status:** Complete

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

### 3.2 File Checkpointing ✅ Partial

**What:** Track file changes and rewind to previous states

**Status:**
- ✅ `enableFileCheckpointing` option — sets `CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING` env var
- ⚠️ `rewindFiles()` — stub only, needs full implementation

---

### 3.3 Context Compaction (5-7 days) 🔵 LOW

**What:** Auto-compact conversation context to save tokens

**Why:** Useful for long conversations, but adds complexity

**Priority:** LOW - Users can manage context themselves

---

### 3.4 Subagent Management ✅ COMPLETE

**What:** Programmatic subagent definitions via `agents` option

**Status:** ✅ Implemented — `agents` passed in stdin init message

**Implementation:**
```typescript
query({
  options: {
    allowedTools: ['Read', 'Grep', 'Glob', 'Task'],
    agents: {
      'code-reviewer': {
        description: 'Expert code reviewer',
        prompt: 'You review code for quality.',
        tools: ['Read', 'Grep', 'Glob'],
        model: 'sonnet',
      }
    }
  }
});
```

---

### 3.5 In-Process MCP Servers (7-10 days) 🔵 LOW

**What:** Create MCP servers via `createSdkMcpServer()`

**Priority:** LOW - Users can configure external MCP servers

---

### 3.6 Plugins System ✅ COMPLETE

**What:** Load custom plugins with commands, agents, MCP servers

**Status:** ✅ Implemented — each plugin passed as `--plugin-dir <path>` CLI flag

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

- [x] Structured outputs work with JSON schema
- [x] Extended thinking via maxThinkingTokens
- [x] Skills/commands load from .claude/
- [x] Budget tracking verified (pass-through from CLI)
- [ ] All integration tests pass (16+ tests total)
- [ ] Demo showcases all features
- [ ] README updated with examples
- [x] Bundle size < 500KB

### Phase 2 Success Criteria

- [x] Sessions resume correctly (fork pending)
- [ ] All 11 hook events supported
- [ ] Models queryable at runtime
- [x] Sandbox configuration works
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
4. ✅ Implement Structured Outputs (PR #11)
5. ✅ Implement Extended Thinking (PR #10)
6. ✅ Implement `resume` option for session continuation
7. ✅ Implement `sandbox` option via --settings
8. ✅ Implement `abortController` for cancellation
9. ✅ Implement Skills/Commands (settingSources, allowedTools, disallowedTools)
10. ✅ Complete Phase 1 (Budget Tracking verified)
11. 📦 Ship v1.0.0 with production features

---

**Last Updated:** 2026-02-07
**Maintainer:** lite-claude-agent-sdk team
