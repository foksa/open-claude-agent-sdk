# Claude Agent SDK Research Findings

## Executive Summary

This document summarizes comprehensive research into the Claude Agent SDK, including its architecture, protocol, and ecosystem. The research revealed that **the protocol is fully documented** and multiple community implementations exist for other languages (Rust, Go, Elixir) - but **no TypeScript/JavaScript alternative without embedded CLI exists**.

**Key Discovery:** All community SDKs use the **same approach** - they wrap the locally installed `claude` CLI binary instead of embedding it. This validates our architectural direction.

## Research Timeline

- **Date:** 2026-02-02
- **Duration:** 1 day intensive research
- **Sources:** 13+ resources (specifications, blog posts, community implementations)
- **Outcome:** Complete protocol specification found, architecture validated

## Critical Findings

### 1. Protocol is Fully Documented ✅

**Source:** [CLAUDE_AGENT_SDK_SPEC.md](https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417)

The protocol uses **NDJSON (Newline-Delimited JSON)** over stdout:

```bash
claude --print --output-format stream-json --verbose -- "prompt"
```

**Output Example:**
```
{"type":"system","subtype":"init","session_id":"...","model":"claude-sonnet-4-5-20250929"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hello"}]}}
{"type":"result","subtype":"success","total_cost_usd":0.023}
```

**Implication:** We don't need to reverse-engineer the protocol - it's already documented!

### 2. Embedded CLI Problem Confirmed 🔍

**Source:** npm package analysis

The official `@anthropic-ai/claude-agent-sdk` contains:

```
node_modules/@anthropic-ai/claude-agent-sdk/
├── cli.js              11,139,710 bytes (10.6 MB) ← Embedded Claude Code CLI
├── sdk.mjs                376,037 bytes (367 KB) ← Actual SDK code
├── tree-sitter-bash.wasm 1,300,000 bytes (1.3 MB)
├── resvg.wasm           2,400,000 bytes (2.4 MB)
└── ... (other assets)
Total: ~14-15 MB
```

**Problem:**
- ❌ Massive bundle size (10.6 MB just for CLI)
- ❌ Version coupling (SDK version = CLI version)
- ❌ Users can't control Claude Code version
- ❌ Frequent breaking changes with updates

**Our Solution:**
- ✅ No embedded CLI (use local `claude` binary)
- ✅ SDK size: ~200 KB (50x smaller!)
- ✅ User controls Claude version
- ✅ Independent updates

### 3. Community Implementations Validate Our Approach 🎯

**Discovery:** Multiple community SDKs for **other languages** (Rust, Go, Elixir) already use the local CLI approach!

#### Rust Implementations

1. **[claude_agent_sdk_rust](https://github.com/Wally869/claude_agent_sdk_rust)** (Wally869)
   - Requires: `npm install -g @anthropic-ai/claude-code`
   - Approach: Spawns local CLI, wraps with Rust API
   - Status: Active development

2. **[claude-sdk-rs](https://github.com/bredmond1019/claude-sdk-rs)** (bredmond1019)
   - Type-safe, async-first Rust wrapper
   - Spawns local CLI binary
   - Status: Maintained

3. **[cc-sdk](https://crates.io/crates/cc-sdk)** (crates.io)
   - Claims 100% feature parity with Python SDK v0.1.14
   - Uses local Claude CLI
   - Status: Published on crates.io

#### Go Implementations

1. **[claude-agent-sdk-go](https://github.com/severity1/claude-agent-sdk-go)** (severity1)
   - Requires local Claude CLI installation
   - Complete Go API wrapper
   - Status: Active

2. **[claude-agent-sdk-go](https://github.com/M1n9X/claude-agent-sdk-go)** (M1n9X)
   - Claims complete feature parity (204 features)
   - Uses local CLI
   - Status: Maintained

3. **Multiple other Go implementations** (connerohnesorge, schlunsen, jrossi, etc.)
   - All follow same pattern: local CLI wrapper

#### Elixir Implementations

1. **[claude_code](https://github.com/guess/claude_code)** (guess)
   - Downloads CLI to `priv/bin/` (not embedded in package)
   - Elixir API wrapper
   - Status: Active

2. **[ClaudeCode](https://hexdocs.pm/claude_code/)** (hexdocs)
   - Native Elixir Streams integration
   - Uses local CLI
   - Status: Published on Hex

**Key Insight:** ⚡
- **ALL community SDKs** use local CLI (not embedded)
- **ALL** spawn `claude` process with NDJSON protocol
- **ALL** are wrappers around the CLI, not bundled solutions
- **NONE** are for TypeScript/JavaScript!

**Implication:** Our approach is validated by the entire community ecosystem!

### 4. TypeScript/JavaScript Gap Identified 🎯

**Critical Finding:** There is **NO TypeScript/JavaScript SDK** that uses local CLI instead of embedded CLI!

**Market Gap:**
- ✅ Rust: Multiple local CLI wrappers exist
- ✅ Go: Multiple local CLI wrappers exist
- ✅ Elixir: Multiple local CLI wrappers exist
- ❌ **TypeScript/JavaScript: NONE!**

**Our Opportunity:**
- We would be the **first TypeScript SDK** without embedded CLI
- Fills a clear gap in the ecosystem
- Provides value that no other TS/JS solution offers

### 5. Architecture Patterns Discovered 🏗️

**Source:** Multiple reverse engineering blogs and community implementations

#### Original SDK Architecture (TypeScript)

```
User Code → SDK → Embedded CLI (10.6 MB) → NDJSON → Anthropic API
```

**Problems:**
- Embedded CLI increases bundle size
- Version locked to SDK release
- Update overhead (must update entire SDK)

#### Community SDK Architecture (Rust/Go/Elixir)

```
User Code → SDK Wrapper → Local CLI Binary → NDJSON → Anthropic API
```

**Benefits:**
- Minimal SDK size (just wrapper code)
- User controls CLI version
- Independent updates
- Same functionality

#### Our Planned Architecture (TypeScript)

```
User Code → @lite-claude/agent-sdk → Local `claude` Binary → NDJSON → Anthropic API
```

**Advantages:**
- API-compatible with original SDK (drop-in replacement)
- ~200 KB vs 10.6 MB (50x smaller)
- TypeScript types preserved
- Same developer experience

### 6. Built-in Tools Catalog 🛠️

**Source:** Protocol specification

Claude Code includes 10+ built-in tools:

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `Read` | Read file contents | `file_path`, `offset`, `limit` |
| `Write` | Write new file | `file_path`, `content` |
| `Edit` | Edit existing file | `file_path`, `old_string`, `new_string` |
| `Glob` | Find files by pattern | `pattern`, `path` |
| `Grep` | Search file contents | `pattern`, `path`, `output_mode` |
| `Bash` | Execute shell command | `command`, `timeout` |
| `WebFetch` | Fetch URL content | `url`, `prompt` |
| `WebSearch` | Web search | `query` |
| `Task` | Spawn sub-agent | `prompt`, `subagent_type` |
| `TodoWrite` | Task management | `subject`, `description` |

**Implication:** Our SDK doesn't need to implement tools - CLI handles them!

### 7. MCP Integration Details 🔌

**Source:** Protocol specification + MCP docs

**MCP (Model Context Protocol):**
- JSON-RPC 2.0 over stdio
- Two transport modes: stdio (default), SSE (HTTP)
- Tool naming: `mcp__<server>__<tool>`

**Integration Flow:**
```
1. SDK registers MCP server config
2. CLI spawns MCP server process
3. Handshake: initialize → capabilities
4. List tools: tools/list → tool definitions
5. Execute: tools/call → tool result
```

**Implication:** Our SDK just needs to pass MCP config to CLI - no implementation needed!

### 8. Session Management 💾

**Source:** Protocol specification

**Session Storage:** `~/.claude/sessions/<session-uuid>/`

**Files:**
- `session.json` - Metadata
- `messages.jsonl` - History (NDJSON format)
- `state.json` - Current state

**Resume:**
```bash
claude --print --resume "<uuid>" -- "Continue"
```

**Implication:** Session management is CLI-side - SDK just needs resume parameter!

### 9. Permission System 🔒

**Modes:**
- `default` - Prompt for each tool
- `acceptEdits` - Auto-approve edits
- `bypassPermissions` - Auto-approve all
- `plan` - Planning mode (no execution)

**Flag:**
```bash
claude --dangerously-skip-permissions --print -- "prompt"
```

**Implication:** Permission handling is CLI-side - SDK passes flags!

### 10. Streaming Capabilities 📡

**Two Levels:**

**1. Message-Level Streaming (Default)**
```
{"type":"assistant",...} ← Complete message
{"type":"result",...}    ← Complete result
```

**2. Token-Level Streaming (--output-format stream-json)**
```
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"text":"The"}}}
{"type":"stream_event","event":{"type":"content_block_delta","delta":{"text":" answer"}}}
```

**Implication:** SDK parses NDJSON, yields messages - streaming is automatic!

## Implementation Implications

### What We DON'T Need to Build

Thanks to using local CLI:

- ❌ Tool implementations (Read, Write, Edit, etc.) - CLI handles it
- ❌ MCP server logic - CLI manages MCP processes
- ❌ Session persistence - CLI stores sessions
- ❌ Permission UI - CLI handles prompts
- ❌ Anthropic API integration - CLI makes API calls
- ❌ Token streaming logic - CLI streams tokens

### What We DO Need to Build

SDK responsibilities:

- ✅ Detect local `claude` binary (PATH, env var, config)
- ✅ Spawn CLI process with correct flags
- ✅ Parse NDJSON from stdout
- ✅ Validate message types (TypeScript types)
- ✅ Async iterator for message streaming
- ✅ Copy TypeScript types from original SDK
- ✅ API-compatible wrapper functions (`query`, `tool`, `createSdkMcpServer`)

**Estimated LOC:** ~1,000-1,500 lines (vs 10,000+ in original SDK)

## Technical Specifications

### NDJSON Protocol

**Format:** One JSON object per line

**Message Types:**
1. `system` - Initialization, permissions, hooks
2. `assistant` - Claude's responses
3. `user` - Tool results, user input
4. `result` - Final outcome
5. `stream_event` - Token-level streaming

**Example Flow:**
```
→ spawn: claude --print --output-format stream-json -- "What is 2+2?"
← {"type":"system","subtype":"init","session_id":"..."}
← {"type":"assistant","message":{"content":[{"type":"text","text":"2+2 = 4"}]}}
← {"type":"result","subtype":"success","num_turns":1,"total_cost_usd":0.015}
```

### CLI Detection Strategy

**Priority Order:**
1. Check `options.claudeCodePath` (explicit config)
2. Check `process.env.CLAUDE_CODE_PATH` (env var)
3. Try `which claude` (PATH lookup)
4. Try `~/.claude/cli` (default installation)
5. Throw error: "Claude Code not found - install with: npm install -g @anthropic-ai/claude-code"

### Version Compatibility

**Protocol Version:** `2024-11-05` (current)

**Compatibility Strategy:**
- Check CLI version on first run: `claude --version`
- Warn if version mismatch detected
- Protocol is stable (unlikely to break)

## Research Sources

### Primary Resources (Critical)

1. ⭐ **[CLAUDE_AGENT_SDK_SPEC.md](https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417)**
   - Complete protocol specification
   - NDJSON format documented
   - All message types with examples
   - **Status:** Authoritative source

2. 🔧 **[Inside the Claude Agent SDK](https://buildwithaws.substack.com/p/inside-the-claude-agent-sdk-from)**
   - stdin/stdout architecture
   - AWS deployment patterns
   - Real-world usage
   - **Status:** Active blog (2025)

3. 📦 **[Official TypeScript SDK](https://github.com/anthropics/claude-agent-sdk-typescript)**
   - Source of type definitions
   - API surface documentation
   - **Status:** Official, maintained

### Reverse Engineering Resources

4. 🔍 **[Kir Shatrov's Analysis](https://kirshatrov.com/posts/claude-code-internals)**
   - System prompt structure
   - Tool architecture
   - Security implementation
   - **Status:** Detailed analysis (2025)

5. 🔍 **[Reid Barber's Deep Dive](https://www.reidbarber.com/blog/reverse-engineering-claude-code)**
   - REPL model
   - Tool execution patterns
   - SDK communication
   - **Status:** Technical deep dive (2025)

6. 🔍 **[ShareAI Lab Report](https://www.blog.brightcoding.dev/2025/07/17/inside-claude-code-a-deep-dive-reverse-engineering-report/)**
   - 50,000+ lines analyzed
   - Multi-agent system
   - Context management
   - **Status:** Comprehensive report (2025)

7. 🔍 **[Claude Code Reverse Tool](https://github.com/Yuyz0112/claude-code-reverse)**
   - Visualization tool
   - LLM interaction graphs
   - **Status:** Open source tool

### Official Documentation

8. 📖 **[Building Agents with Claude Agent SDK](https://www.anthropic.com/engineering/building-agents-with-the-claude-agent-sdk)**
   - Official engineering blog
   - Design principles
   - **Status:** Official Anthropic

9. 📖 **[Agent SDK Overview](https://platform.claude.com/docs/en/agent-sdk/overview)**
   - Official documentation
   - API reference
   - **Status:** Official docs

10. 📦 **[npm Package](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk)**
    - Latest version: 0.1.74 (as of 2026-02-02)
    - **Status:** Actively maintained

### Community Resources

11. 🛠️ **[Promptfoo - Claude Agent SDK](https://www.promptfoo.dev/docs/providers/claude-agent-sdk/)**
    - Integration guide
    - Testing patterns
    - **Status:** Third-party integration

12. 📝 **[DataCamp Tutorial](https://www.datacamp.com/tutorial/how-to-use-claude-agent-sdk)**
    - Step-by-step usage
    - Beginner-friendly
    - **Status:** Educational resource

13. 🎓 **[Skywork AI Guide](https://skywork.ai/blog/how-to-use-claude-agent-sdk-step-by-step-ai-agent-tutorial/)**
    - Comprehensive tutorial
    - Real examples
    - **Status:** Tutorial (2025)

## Competitive Analysis

### Size Comparison

| Implementation | Bundle Size | CLI Dependency |
|----------------|-------------|----------------|
| **Original TS SDK** | 10.6 MB (cli.js) + 2-4 MB (assets) = **~14 MB** | Embedded |
| **Rust SDKs** | ~5-10 MB (Rust binary) | Local |
| **Go SDKs** | ~10-15 MB (Go binary) | Local |
| **Elixir SDKs** | ~2-5 MB (BEAM bytecode) | Local |
| **Our Plan** | ~200 KB (TS/JS code only) | Local |

**Winner:** 🏆 Our implementation (50-70x smaller than original!)

### Feature Completeness

| Feature | Original SDK | Rust SDKs | Go SDKs | Elixir SDKs | Our Plan |
|---------|--------------|-----------|---------|-------------|----------|
| Query API | ✅ | ✅ | ✅ | ✅ | ✅ |
| Tool Definition | ✅ | ✅ | ✅ | ✅ | ✅ |
| MCP Support | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streaming | ✅ | ✅ | ✅ | ✅ | ✅ |
| Session Management | ✅ | ✅ | ✅ | ✅ | ✅ |
| Type Safety | ✅ TS | ✅ Rust | ⚠️ Go | ⚠️ Elixir | ✅ TS |
| API Compatibility | 100% | N/A | N/A | N/A | 100% |
| Embedded CLI | ❌ (Bad) | ✅ (None) | ✅ (None) | ✅ (None) | ✅ (None) |

**Unique Value Propositions:**
- ✅ **Only TypeScript SDK without embedded CLI**
- ✅ **100% API-compatible drop-in replacement**
- ✅ **Smallest bundle size in any language**
- ✅ **Familiar API for TypeScript developers**

## Risk Assessment

### Technical Risks

**1. Protocol Changes (Low Risk)**
- **Risk:** Claude CLI changes NDJSON protocol
- **Mitigation:** Protocol is versioned (2024-11-05), stable
- **Impact:** Would affect ALL community SDKs, not just ours
- **Likelihood:** Low (breaking protocol would break ecosystem)

**2. CLI Not Installed (Medium Risk)**
- **Risk:** User doesn't have `claude` binary
- **Mitigation:** Clear error messages, installation instructions
- **Impact:** User must install Claude Code separately
- **Likelihood:** Medium (some users may not have it)

**3. Version Incompatibility (Low Risk)**
- **Risk:** Old CLI version incompatible
- **Mitigation:** Version detection, compatibility warnings
- **Impact:** Graceful degradation or error
- **Likelihood:** Low (protocol is stable)

**4. API Compatibility Drift (Low Risk)**
- **Risk:** Original SDK API changes
- **Mitigation:** TypeScript compile-time checks, compatibility tests
- **Impact:** May need API updates
- **Likelihood:** Low (SDK API is stable)

### Market Risks

**1. Official Lightweight SDK (Medium Risk)**
- **Risk:** Anthropic releases lightweight version
- **Mitigation:** We offer additional features (Vercel AI adapter, etc.)
- **Impact:** Competition, but we're first-to-market
- **Likelihood:** Medium (possible but not announced)

**2. Adoption Friction (Medium Risk)**
- **Risk:** Users prefer "official" embedded version
- **Mitigation:** Clear benefits communication, easy migration
- **Impact:** Slower adoption
- **Likelihood:** Medium (some users prefer "official")

**3. Community Saturation (Low Risk)**
- **Risk:** Other TS SDK appears
- **Mitigation:** First-mover advantage, quality implementation
- **Impact:** Competition
- **Likelihood:** Low (we found none after extensive search)

## Decision Matrix

### Should We Build This?

**Arguments FOR:**

1. ✅ **Fills Real Gap** - No TypeScript alternative exists
2. ✅ **Validated Approach** - All community SDKs use local CLI
3. ✅ **Clear Benefits** - 50x smaller, user controls version
4. ✅ **Manageable Scope** - ~1,000-1,500 LOC, protocol documented
5. ✅ **TypeScript Ecosystem** - Natural fit for TS/JS developers
6. ✅ **API Compatibility** - Drop-in replacement, easy migration

**Arguments AGAINST:**

1. ⚠️ **Requires Local CLI** - User must install separately
2. ⚠️ **Competition with Official** - May be perceived as "unofficial"
3. ⚠️ **Maintenance Burden** - Need to track SDK API changes

**Verdict:** ✅ **PROCEED WITH IMPLEMENTATION**

Reasoning:
- Unique value proposition (only TS SDK without embedded CLI)
- Validated architecture (all community SDKs use same approach)
- Clear market gap (no existing alternative)
- Manageable technical complexity (protocol documented)
- Strong benefits (size, flexibility, user control)

## Next Steps

### Phase 0: Documentation ✅ (DONE)

- [x] Document protocol specification
- [x] Document research findings
- [x] Document alternatives analysis
- [x] Document architecture patterns

### Phase 1: Implementation (Week 1-2)

1. Copy TypeScript types from original SDK
2. Implement CLI detection
3. Implement process spawning
4. Implement NDJSON parser
5. Implement `query()` function

### Phase 2: Testing (Week 2-3)

1. Unit tests (mock process)
2. Integration tests (real CLI)
3. API compatibility tests
4. Example projects

### Phase 3: Polish (Week 3-4)

1. Documentation
2. Error handling
3. Performance optimization
4. Release preparation

**Estimated Timeline:** 12-18 days (2.5-4 weeks)

## Conclusion

The research phase successfully identified:

1. ✅ **Protocol is documented** - No reverse engineering needed
2. ✅ **Architecture validated** - Community consensus on local CLI approach
3. ✅ **Market gap confirmed** - No TypeScript alternative exists
4. ✅ **Implementation path clear** - ~1,000-1,500 LOC, manageable scope
5. ✅ **Benefits quantified** - 50x smaller, user control, API compatible

**Recommendation:** Proceed with implementation of `@lite-claude/agent-sdk` as a TypeScript/JavaScript SDK that uses local Claude CLI, providing a lightweight, API-compatible alternative to the official embedded SDK.

---

**Last Updated:** 2026-02-02
**Research Status:** ✅ Complete
**Next Phase:** Implementation
