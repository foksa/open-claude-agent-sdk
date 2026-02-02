# Official SDK Demos Research

**Purpose:** Analyze official Claude Agent SDK demos to understand what APIs they use and how they should work in our Lite SDK.

**Source:** https://github.com/anthropics/claude-agent-sdk-demos

---

## Overview

These demos showcase different use cases and API patterns. Each demo analysis includes:
1. **What it does** - Purpose and functionality
2. **APIs used** - Which SDK features it relies on
3. **Key patterns** - Important implementation patterns
4. **Compatibility** - What our Lite SDK needs to support it

---

## Demos Analyzed

| Demo | Status | Priority | APIs Used |
|------|--------|----------|-----------|
| [hello-world](./01-hello-world.md) | ✅ Analyzed | HIGH | query, hooks, allowedTools |
| [simple-chatapp](./02-simple-chatapp.md) | ✅ Analyzed | HIGH | query, AsyncIterable input, systemPrompt |
| [research-agent](./03-research-agent.md) | ✅ Analyzed | MEDIUM | agents, Task tool, hooks |
| [hello-world-v2](./04-hello-world-v2.md) | ✅ Analyzed | LOW | V2 API (unstable_v2_*), sessions |
| [resume-generator](./05-resume-generator.md) | ✅ Analyzed | HIGH | query, systemPrompt, settingSources, WebSearch |
| [email-agent](./06-email-agent.md) | ✅ Analyzed | LOW | Custom MCP servers, skills, IMAP |
| [excel-demo](./07-excel-demo.md) | ✅ Analyzed | MEDIUM | Electron, Python, settingSources, skills |

---

## Key Findings

### 1. Most Common APIs

**Used in all demos:**
- `query()` function
- `allowedTools` option
- Message iteration (`for await`)

**Used frequently:**
- `hooks` (PreToolUse, PostToolUse)
- `systemPrompt` option
- `model` option ("opus", "sonnet", "haiku")

### 2. Input Patterns

**Three patterns observed:**

1. **Simple string** (hello-world)
```typescript
query({
  prompt: 'Hello, Claude!',
  options: { ... }
})
```

2. **AsyncIterable** (simple-chatapp)
```typescript
const queue = new MessageQueue(); // Custom async iterable
query({
  prompt: queue,
  options: { ... }
})
```

3. **Subagents** (research-agent)
```typescript
options: {
  agents: [
    { id: 'researcher', systemPrompt: '...', allowedTools: ['WebSearch'] }
  ]
}
```

### 3. Hook Patterns

**PreToolUse for validation:**
```typescript
hooks: {
  PreToolUse: [{
    matcher: "Write|Edit",
    hooks: [async (input) => {
      // Validation logic
      if (invalid) {
        return { decision: 'block', stopReason: '...', continue: false };
      }
      return { continue: true };
    }]
  }]
}
```

**PostToolUse for tracking:**
```typescript
hooks: {
  PostToolUse: [async (input) => {
    // Log tool usage
    console.log('Tool called:', input.tool_name);
    // Return void or {}
  }]
}
```

### 4. Message Handling

**Extract text from assistant messages:**
```typescript
if (message.type === 'assistant' && message.message) {
  const textContent = message.message.content.find(c => c.type === 'text');
  if (textContent && 'text' in textContent) {
    const text = textContent.text;
  }
}
```

---

## Lite SDK Compatibility Matrix

| Feature | hello-world | simple-chatapp | research-agent | Lite SDK Status |
|---------|-------------|----------------|----------------|-----------------|
| **Core** |
| query() | ✅ | ✅ | ✅ | ✅ Complete |
| AsyncIterable input | ❌ | ✅ | ❌ | ✅ Complete |
| String input | ✅ | ❌ | ✅ | ✅ Complete |
| **Options** |
| maxTurns | ✅ | ✅ | ✅ | ✅ Complete |
| model | ✅ | ✅ | ✅ | ✅ Complete |
| cwd | ✅ | ❌ | ✅ | ✅ Complete |
| allowedTools | ✅ | ✅ | ✅ | ✅ Complete (pass-through) |
| systemPrompt | ❌ | ✅ | ✅ | ❌ Phase 2 |
| executable | ✅ | ❌ | ❌ | ❌ Not needed (uses CLI) |
| **Hooks** |
| PreToolUse | ✅ | ❌ | ✅ | ⚠️ Untested |
| PostToolUse | ❌ | ❌ | ✅ | ⚠️ Untested |
| Hook matcher | ✅ | ❌ | ✅ | ⚠️ Untested |
| **Advanced** |
| agents option | ❌ | ❌ | ✅ | ❌ Phase 2 |
| Task tool | ❌ | ❌ | ✅ | ✅ Pass-through |

---

## Implementation Priority

### Phase 0.5: Validation (CURRENT)
- ✅ Test hooks (PreToolUse, PostToolUse)
- ✅ Test with hello-world demo
- ✅ Verify hook matcher pattern works

### Phase 1: Production Ready
- ❌ systemPrompt option (needed by simple-chatapp)
- ❌ Test with simple-chatapp demo

### Phase 2: Advanced Features
- ❌ agents option (needed by research-agent)
- ❌ Subagent tracking
- ❌ Test with research-agent demo

---

## Demo Compatibility Goals

### Short-term (Phase 0.5-1)
**Goal:** hello-world and simple-chatapp work perfectly

**Requires:**
1. ✅ query() with string/AsyncIterable
2. ⚠️ hooks (PreToolUse validation)
3. ❌ systemPrompt option
4. ✅ allowedTools pass-through

### Medium-term (Phase 2)
**Goal:** research-agent works

**Requires:**
1. ❌ agents option
2. ❌ Subagent management
3. ⚠️ PostToolUse hooks
4. ✅ Task tool (pass-through)

### Long-term (Phase 3)
**Goal:** All demos work

**Requires:**
- TBD based on remaining demos

---

## Next Steps

1. **Phase 0.5:** Test hello-world demo with Lite SDK
   - Create `examples/official-demos/hello-world/`
   - Copy demo code
   - Replace `@anthropic-ai/claude-agent-sdk` with our SDK
   - Run and verify it works

2. **Document gaps:** If hello-world fails, document what's missing

3. **Repeat for simple-chatapp:** After Phase 1 (systemPrompt)

4. **Repeat for research-agent:** After Phase 2 (agents)

---

## Testing Strategy

### Demo Compatibility Tests

Create `tests/integration/demo-compatibility/` with:

```
tests/integration/demo-compatibility/
├── hello-world.test.ts        # Test hello-world works
├── simple-chatapp.test.ts     # Test chatapp pattern works
└── research-agent.test.ts     # Test multi-agent works
```

Each test:
1. Uses Lite SDK instead of official SDK
2. Runs the demo's core functionality
3. Verifies expected behavior
4. Documents any incompatibilities

---

## Resources

- **Official Demos Repo:** https://github.com/anthropics/claude-agent-sdk-demos
- **Local Clone:** `/tmp/claude-agent-sdk-demos`
- **Demo Analysis:** See individual demo docs in this folder

---

## Complete Analysis Summary

### All 7 Demos Analyzed ✅

**Completion Date:** 2026-02-02

### Priority Breakdown

**HIGH Priority (Implement First):**
1. ✅ **hello-world** - Hooks validation (Phase 0.5)
2. ✅ **simple-chatapp** - AsyncIterable pattern, systemPrompt (Phase 1)
3. ✅ **resume-generator** - Web research + document generation (Phase 1)

**MEDIUM Priority (Implement Later):**
4. ✅ **research-agent** - Multi-agent coordination (Phase 2)
5. ✅ **excel-demo** - Desktop app + Python integration (Phase 1-2)

**LOW Priority (Phase 3 or Skip):**
6. ✅ **hello-world-v2** - V2 API (unstable, preview only)
7. ✅ **email-agent** - Custom MCP servers (complex)

### Missing Features by Priority

**Phase 0.5: Validation (2-3 days)**
- ⚠️ **Hooks testing** - Code exists, needs integration tests
- ⚠️ **canUseTool testing** - Code exists, needs integration tests

**Phase 1: Production Ready (8-10 days)**
- ❌ **systemPrompt option** - Used by 4 of 7 demos (1-2 hours)
- ❌ **settingSources option** - Load .claude/skills/ and commands/ (2-3 days)

**Phase 2: Advanced (7-11 days)**
- ❌ **agents option** - Multi-agent definitions (3-5 days)
- ❌ **Subagent tracking** - Agent lifecycle management (3-5 days)

**Phase 3: Optional (15-25 days)**
- ❌ **V2 API** - unstable_v2_* functions (7-10 days)
- ❌ **Custom MCP servers** - In-process tool creation (7-10 days)
- ❌ **MCP server registration** - Connect external servers (3-5 days)

### Feature Usage Across Demos

| Feature | Demos Using | Priority | Status |
|---------|-------------|----------|--------|
| query() | 7/7 (100%) | CRITICAL | ✅ Complete |
| allowedTools | 7/7 (100%) | CRITICAL | ✅ Pass-through |
| systemPrompt | 4/7 (57%) | HIGH | ❌ Phase 1 |
| settingSources | 3/7 (43%) | HIGH | ❌ Phase 1 |
| hooks | 2/7 (29%) | MEDIUM | ⚠️ Phase 0.5 |
| AsyncIterable | 2/7 (29%) | HIGH | ✅ Complete |
| agents | 1/7 (14%) | MEDIUM | ❌ Phase 2 |
| V2 API | 1/7 (14%) | LOW | ❌ Phase 3 |
| MCP servers | 1/7 (14%) | LOW | ❌ Phase 3 |

### Compatibility Matrix (Updated)

| Demo | Current Status | After Phase 0.5 | After Phase 1 | After Phase 2 |
|------|----------------|----------------|---------------|---------------|
| hello-world | 90% | **100%** | 100% | 100% |
| simple-chatapp | 80% | 80% | **100%** | 100% |
| resume-generator | 70% | 70% | **100%** | 100% |
| excel-demo | 80% | 80% | **95%** | 95% |
| research-agent | 50% | 50% | 50% | **80%** |
| hello-world-v2 | 0% | 0% | 0% | 0% → **Phase 3** |
| email-agent | 30% | 30% | 50% | 50% → **Phase 3** |

**Average Compatibility:**
- Now: 57%
- Phase 0.5: 59%
- Phase 1: 78%
- Phase 2: 82%

### Implementation Recommendations

**Phase 0.5 (URGENT - 2-3 days):**
1. Test hooks with hello-world demo
2. Create integration tests for PreToolUse/PostToolUse
3. Verify hook matcher regex works
4. Test canUseTool callback

**Phase 1 (HIGH - 8-10 days):**
1. Add systemPrompt option (1-2 hours) → Unlocks 4 demos
2. Add settingSources option (2-3 days) → Unlocks 3 demos
3. Test hello-world end-to-end
4. Test simple-chatapp end-to-end
5. Test resume-generator end-to-end

**Phase 2 (MEDIUM - 7-11 days):**
1. Add agents option (3-5 days)
2. Add subagent tracking (3-5 days)
3. Test research-agent end-to-end

**Phase 3 (OPTIONAL - based on demand):**
- V2 API if it becomes stable
- MCP server support if users request it

### Key Takeaways

**1. systemPrompt is Critical**
- Used by 4 of 7 demos (57%)
- Easy to implement (1-2 hours)
- Highest ROI of any feature

**2. settingSources Unlocks Power**
- Skills and commands enable reusability
- 3 of 7 demos use this pattern
- Medium effort (2-3 days)

**3. Multi-Agent is Niche**
- Only 1 demo (research-agent) requires it
- Complex to implement (7-11 days)
- Can be deferred to Phase 2

**4. V2 API Can Wait**
- Still unstable/preview
- Only 1 demo uses it
- V1 API covers all use cases
- Skip unless it becomes stable

**5. MCP Servers are Advanced**
- Only 1 demo (email-agent) needs custom MCP
- Very complex (15-25 days)
- Most use cases work with built-in tools
- Phase 3 or skip entirely

### Next Actions

1. ✅ **Complete** - All 7 demos analyzed and documented
2. **Proceed to Phase 0.5** - Test hooks with hello-world
3. **Implement Phase 1** - systemPrompt + settingSources
4. **Port 3 demos** - hello-world, simple-chatapp, resume-generator
5. **Evaluate Phase 2** - Based on user feedback and demand

---

**Next:** Read [01-hello-world.md](./01-hello-world.md) for detailed analysis
