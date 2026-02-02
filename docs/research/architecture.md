# SDK Architecture Patterns

## Overview

This document analyzes the architectural patterns used by the official Claude Agent SDK and community alternatives. It identifies common patterns, trade-offs, and design decisions that inform our implementation strategy.

**Key Finding:** All community SDKs converge on the **Local CLI Wrapper** pattern, while the official SDK uses **Embedded CLI**. Both patterns are architecturally valid, but they optimize for different goals.

## Architecture Pattern Comparison

### Pattern 1: Embedded CLI (Official SDK)

**Used By:**
- Official TypeScript SDK (`@anthropic-ai/claude-agent-sdk`)
- Official Python SDK

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                        User Application                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ import
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                   Claude Agent SDK Package                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              SDK Code (~367 KB)                     │   │
│  │  - query() function                                 │   │
│  │  - tool() function                                  │   │
│  │  - Type definitions                                 │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │ spawns                            │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │         Embedded CLI (cli.js ~10.6 MB)             │   │
│  │  - Complete Claude Code implementation              │   │
│  │  - Built-in tools                                   │   │
│  │  - MCP integration                                  │   │
│  │  - Session management                               │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│  ┌──────────────────────▼──────────────────────────────┐   │
│  │        Assets (WASM, binaries ~3-4 MB)             │   │
│  │  - tree-sitter-bash.wasm                            │   │
│  │  - resvg.wasm                                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
│              Total Package: ~14-15 MB                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ NDJSON protocol
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Anthropic API                           │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics:**

- **Self-Contained:** Everything needed is in npm package
- **Version-Locked:** SDK version determines CLI version
- **No External Dependencies:** Works immediately after `npm install`
- **Large Bundle:** 10.6 MB CLI + 3-4 MB assets = ~14-15 MB total

**Advantages:**

- ✅ **Zero Setup:** No separate CLI installation required
- ✅ **Guaranteed Compatibility:** SDK and CLI always match
- ✅ **Consistent Behavior:** Same CLI version for all users
- ✅ **Offline Installation:** No external downloads needed

**Disadvantages:**

- ❌ **Massive Bundle Size:** 14-15 MB (10.6 MB just for CLI)
- ❌ **Version Coupling:** Can't update CLI independently
- ❌ **Update Overhead:** Must update entire SDK to get CLI fixes
- ❌ **Storage Waste:** Every project duplicates 14 MB
- ❌ **Slow Installation:** Large download size
- ❌ **No User Control:** Can't choose CLI version

**When to Use:**

- User experience > bundle size
- Simplicity > flexibility
- Guaranteed compatibility required
- Enterprise environments (controlled versions)

---

### Pattern 2: Local CLI Wrapper (Community SDKs)

**Used By:**
- All Rust implementations
- All Go implementations
- All Elixir implementations
- **Our planned TypeScript implementation**

**Architecture Diagram:**

```
┌─────────────────────────────────────────────────────────────┐
│                        User Application                     │
└──────────────────────────┬──────────────────────────────────┘
                           │ import
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                    Lite Claude Agent SDK Package                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           SDK Wrapper Code (~200 KB)                │   │
│  │  - query() function (API-compatible)                │   │
│  │  - tool() function (API-compatible)                 │   │
│  │  - Type definitions (copied from official)          │   │
│  │  - CLI detection logic                              │   │
│  │  - Process spawning                                 │   │
│  │  - NDJSON parser                                    │   │
│  └──────────────────────┬──────────────────────────────┘   │
│                         │                                   │
│              Total Package: ~200 KB                         │
└──────────────────────────┬──────────────────────────────────┘
                           │ spawn process
                           ↓
┌─────────────────────────────────────────────────────────────┐
│              Local Claude Code Binary (Separate)            │
│  - Installed via: npm install -g @anthropic-ai/claude-code  │
│  - Or: System installation                                  │
│  - Location: /usr/local/bin/claude, ~/.claude/cli, etc.    │
│  - User controls version                                    │
└──────────────────────────┬──────────────────────────────────┘
                           │ NDJSON protocol
                           ↓
┌─────────────────────────────────────────────────────────────┐
│                     Anthropic API                           │
└─────────────────────────────────────────────────────────────┘
```

**Characteristics:**

- **Decoupled:** SDK and CLI are separate
- **Lightweight:** SDK is just wrapper code (~200 KB)
- **User-Controlled:** User chooses CLI version
- **External Dependency:** Requires local `claude` installation

**Advantages:**

- ✅ **Tiny Bundle:** ~200 KB (50-70x smaller!)
- ✅ **Independent Updates:** Update SDK and CLI separately
- ✅ **User Control:** Choose CLI version per project
- ✅ **No Duplication:** One CLI installation for all projects
- ✅ **Fast Installation:** Small download size
- ✅ **Flexibility:** Can use bleeding-edge or stable CLI

**Disadvantages:**

- ❌ **Setup Required:** User must install Claude Code separately
- ❌ **Version Mismatch Risk:** SDK and CLI might be incompatible (low risk)
- ❌ **Detection Logic Needed:** Must find `claude` binary
- ❌ **Error Handling:** Clear messages when CLI not found

**When to Use:**

- Bundle size matters
- Flexibility > simplicity
- Users control their environment
- Open-source projects
- Performance-sensitive applications

---

## Detailed Component Analysis

### Component 1: SDK Entry Point

**Official SDK (Embedded):**

```typescript
// @anthropic-ai/claude-agent-sdk
export async function* query(params: QueryParams): AsyncIterableIterator<SDKMessage> {
  // Spawn embedded CLI from node_modules
  const cliPath = path.join(__dirname, 'cli.js');
  const process = spawn('node', [cliPath, '--print', ...args]);

  // Parse NDJSON from stdout
  for await (const message of parseNDJSON(process.stdout)) {
    yield message;
  }
}
```

**Our SDK (Local CLI):**

```typescript
// @lite-claude/agent-sdk
export async function* query(params: QueryParams): AsyncIterableIterator<SDKMessage> {
  // Detect local Claude binary
  const claudePath = detectClaudeBinary(params.claudeCodePath);

  // Spawn local Claude CLI
  const process = Bun.spawn([claudePath, '--print', ...args], {
    stdout: 'pipe',
    env: { ANTHROPIC_API_KEY: params.apiKey }
  });

  // Parse NDJSON from stdout (same as official)
  for await (const message of parseNDJSON(process.stdout)) {
    yield message;
  }
}
```

**Key Differences:**

| Aspect | Official SDK | Our SDK |
|--------|--------------|---------|
| CLI Location | Embedded in package | Detected from system |
| Spawn Command | `spawn('node', [bundledCli])` | `spawn([detectedCli])` |
| Detection Logic | None (hardcoded path) | `detectClaudeBinary()` |
| Bundle Impact | +10.6 MB | +0 bytes |

---

### Component 2: CLI Detection

**Not Needed by Official SDK (embedded CLI)**

**Required by Our SDK:**

```typescript
// src/core/detection.ts
export function detectClaudeBinary(options?: { claudeCodePath?: string }): string {
  // Priority 1: Explicit config
  if (options?.claudeCodePath) {
    if (existsSync(options.claudeCodePath)) {
      return options.claudeCodePath;
    }
    throw new Error(`Claude binary not found at: ${options.claudeCodePath}`);
  }

  // Priority 2: Environment variable
  if (process.env.CLAUDE_CODE_PATH) {
    if (existsSync(process.env.CLAUDE_CODE_PATH)) {
      return process.env.CLAUDE_CODE_PATH;
    }
    throw new Error(`Claude binary not found at: ${process.env.CLAUDE_CODE_PATH}`);
  }

  // Priority 3: which claude (PATH lookup)
  const whichResult = execSync('which claude', { encoding: 'utf-8' }).trim();
  if (whichResult && existsSync(whichResult)) {
    return whichResult;
  }

  // Priority 4: Common installation paths
  const commonPaths = [
    '/usr/local/bin/claude',
    path.join(os.homedir(), '.claude', 'cli'),
    path.join(os.homedir(), '.local', 'bin', 'claude'),
  ];

  for (const p of commonPaths) {
    if (existsSync(p)) {
      return p;
    }
  }

  // Not found - throw with instructions
  throw new Error(
    'Claude Code CLI not found. Install with: npm install -g @anthropic-ai/claude-code\n' +
    'Or set CLAUDE_CODE_PATH environment variable.'
  );
}
```

**Detection Strategy:**

1. **Explicit Config:** User provides path in options
2. **Environment Variable:** `CLAUDE_CODE_PATH`
3. **PATH Lookup:** `which claude`
4. **Common Paths:** `~/.claude/cli`, `/usr/local/bin/claude`, etc.
5. **Error:** Clear message with installation instructions

**Trade-off:** ~50 lines of detection code vs 10.6 MB embedded CLI

---

### Component 3: Process Spawning

**Common to Both Patterns:**

**Official SDK:**

```typescript
// Spawn embedded CLI
const process = spawn('node', [
  path.join(__dirname, 'cli.js'),
  '--print',
  '--output-format', 'stream-json',
  '--verbose',
  '--',
  prompt
], {
  stdio: ['ignore', 'pipe', 'pipe']
});
```

**Our SDK:**

```typescript
// Spawn local CLI
const process = Bun.spawn([
  claudePath,
  '--print',
  '--output-format', 'stream-json',
  '--verbose',
  '--',
  prompt
], {
  stdout: 'pipe',
  stderr: 'pipe',
  env: {
    ANTHROPIC_API_KEY: apiKey,
    ...process.env
  }
});
```

**Differences:**

| Aspect | Official SDK | Our SDK |
|--------|--------------|---------|
| Spawn Target | `node cli.js` | `claude` binary |
| Runtime | Node.js child_process | Bun.spawn |
| CLI Path | Hardcoded (`__dirname`) | Detected |

**NDJSON Parsing (Identical):**

```typescript
// Both SDKs use same parsing logic
async function* parseNDJSON(stdout: ReadableStream): AsyncIterableIterator<SDKMessage> {
  const reader = stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line) as SDKMessage;
      yield message;
    }
  }
}
```

---

### Component 4: Type Definitions

**Official SDK:**

```typescript
// node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts
export declare function query(params: QueryParams): AsyncIterableIterator<SDKMessage>;
export declare function tool<Schema>(name: string, ...): McpSdkServerConfigWithInstance;
export type SDKMessage = SDKSystemMessage | SDKAssistantMessage | SDKUserMessage | ...;
```

**Our SDK (Copied):**

```typescript
// src/types/index.ts
// NOTE: Types copied from official SDK for API compatibility
export declare function query(params: QueryParams): AsyncIterableIterator<SDKMessage>;
export declare function tool<Schema>(name: string, ...): McpSdkServerConfigWithInstance;
export type SDKMessage = SDKSystemMessage | SDKAssistantMessage | SDKUserMessage | ...;
```

**Strategy:** Copy type definitions verbatim to ensure 100% API compatibility

**Legal:** Types are API contracts (not implementation), copying is fair use

---

## Protocol: NDJSON Communication

**Both patterns use identical protocol** - this is the key commonality!

### Protocol Flow

```
SDK → CLI spawn with args
CLI → {"type":"system","subtype":"init",...}         (System init)
CLI → {"type":"assistant","content":[...]}           (Claude's response)
SDK → Execute tool (built-in or custom)
SDK → Send tool result back to CLI? (NO - CLI handles tools!)
CLI → {"type":"result","subtype":"success",...}      (Final result)
```

**Correction:** SDK does NOT send tool results back! CLI handles tool execution internally (built-in tools) or via MCP (custom tools). SDK just parses output.

**Updated Flow:**

```
1. SDK spawns CLI with: claude --print --output-format stream-json -- "prompt"
2. CLI sends: {"type":"system","subtype":"init",...}
3. CLI sends: {"type":"assistant","message":{...,"content":[{"type":"tool_use",...}]}}
4. CLI executes tool internally (built-in) or via MCP (custom)
5. CLI sends: {"type":"user","message":{"content":[{"type":"tool_result",...}]}}
6. CLI sends: {"type":"assistant","message":{...}} (next response)
7. CLI sends: {"type":"result","subtype":"success",...}
8. SDK yields all messages to user
```

**Implication:** SDK is truly a "thin wrapper" - CLI does all the heavy lifting!

### Message Format

**Identical for both patterns:**

```typescript
// System message
{
  "type": "system",
  "subtype": "init",
  "session_id": "uuid",
  "model": "claude-sonnet-4-5-20250929",
  "tools": [...]
}

// Assistant message
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "..." },
      { "type": "tool_use", "id": "...", "name": "Read", "input": {...} }
    ]
  }
}

// Result message
{
  "type": "result",
  "subtype": "success",
  "total_cost_usd": 0.023,
  "num_turns": 3
}
```

**Key Insight:** Protocol is **independent of SDK architecture**. Both patterns work because they implement the same protocol!

---

## Community SDK Patterns by Language

### Rust Implementations

**Pattern:** Local CLI Wrapper + Rust Type System

**Example (claude-sdk-rs):**

```rust
// Uses tokio for async runtime
use tokio::process::Command;
use futures::stream::Stream;

pub async fn query(params: QueryParams) -> impl Stream<Item = SDKMessage> {
    // Spawn local CLI
    let mut child = Command::new("claude")
        .args(&["--print", "--output-format", "stream-json", "--", &params.prompt])
        .stdout(Stdio::piped())
        .spawn()
        .expect("Failed to spawn claude");

    // Parse NDJSON
    let stdout = child.stdout.take().unwrap();
    let reader = BufReader::new(stdout);

    stream! {
        for await line in reader.lines() {
            let line = line.unwrap();
            let message: SDKMessage = serde_json::from_str(&line).unwrap();
            yield message;
        }
    }
}
```

**Architecture:**
- Process spawning: `tokio::process::Command`
- JSON parsing: `serde_json`
- Streaming: `futures::stream::Stream`
- Type safety: Rust type system + `serde` derive macros

**Strengths:**
- Rust's type safety catches errors at compile-time
- Async/await with tokio (production-grade)
- Memory-safe (no buffer overflows)

**Trade-offs:**
- Requires Rust knowledge
- Compiled binary (~5-10 MB)
- Not cross-platform (must compile per OS)

---

### Go Implementations

**Pattern:** Local CLI Wrapper + Goroutines

**Example (claude-agent-sdk-go):**

```go
// Uses os/exec for process spawning
import "os/exec"

func Query(params QueryParams) <-chan SDKMessage {
    ch := make(chan SDKMessage)

    go func() {
        defer close(ch)

        // Spawn local CLI
        cmd := exec.Command("claude", "--print", "--output-format", "stream-json", "--", params.Prompt)
        stdout, _ := cmd.StdoutPipe()
        cmd.Start()

        // Parse NDJSON
        scanner := bufio.NewScanner(stdout)
        for scanner.Scan() {
            var message SDKMessage
            json.Unmarshal(scanner.Bytes(), &message)
            ch <- message
        }

        cmd.Wait()
    }()

    return ch
}
```

**Architecture:**
- Process spawning: `os/exec.Command`
- JSON parsing: `encoding/json`
- Streaming: Go channels (`chan`)
- Concurrency: Goroutines

**Strengths:**
- Simple, idiomatic Go code
- Goroutines for concurrency
- Fast compilation

**Trade-offs:**
- Less type safety than Rust/TypeScript
- Compiled binary (~10-15 MB)
- Channel-based API (different from iterators)

---

### Elixir Implementations

**Pattern:** Local CLI Wrapper + OTP Supervision

**Example (claude_code):**

```elixir
# Uses Port for process communication
defmodule ClaudeCode do
  def query(params) do
    # Spawn local CLI via Port
    port = Port.open({:spawn, "claude --print --output-format stream-json -- #{params.prompt}"}, [:binary])

    # Stream NDJSON
    Stream.resource(
      fn -> port end,
      fn port ->
        receive do
          {^port, {:data, line}} ->
            message = Jason.decode!(line)
            {[message], port}
          {^port, {:exit_status, _}} ->
            {:halt, port}
        end
      end,
      fn port -> Port.close(port) end
    )
  end
end
```

**Architecture:**
- Process communication: Elixir `Port`
- JSON parsing: `Jason` library
- Streaming: `Stream.t()`
- Supervision: OTP (optional)

**Strengths:**
- Fault-tolerant (OTP supervision)
- Native streaming (Elixir Streams)
- Concurrent message passing (Actor model)

**Trade-offs:**
- Requires Elixir/Erlang runtime
- BEAM bytecode (~2-5 MB)
- Elixir-specific API

---

## Design Trade-offs

### Trade-off 1: Bundle Size vs Setup Complexity

**Embedded CLI (Official SDK):**
- Bundle: 14-15 MB
- Setup: Zero (works after `npm install`)
- Trade-off: **Simplicity → Size**

**Local CLI (Our SDK):**
- Bundle: ~200 KB
- Setup: Requires `claude` installation
- Trade-off: **Size → Setup**

**Which is Better?**
- **Enterprise/Beginners:** Embedded (zero setup)
- **Performance/Advanced Users:** Local CLI (smaller, flexible)

---

### Trade-off 2: Version Coupling vs Compatibility Risk

**Embedded CLI:**
- SDK version = CLI version (locked)
- Zero compatibility risk
- Can't update CLI independently

**Local CLI:**
- SDK and CLI versions independent
- Small compatibility risk (mitigated by stable protocol)
- Can update CLI anytime

**Which is Better?**
- **Stability:** Embedded (guaranteed match)
- **Flexibility:** Local CLI (user control)

---

### Trade-off 3: Distribution vs Performance

**Embedded CLI:**
- Distribution: Single npm package (easy)
- Performance: Duplicate CLI per project (wasted storage)

**Local CLI:**
- Distribution: SDK + CLI separate (extra step)
- Performance: One CLI for all projects (efficient)

**Which is Better?**
- **Ease of Use:** Embedded (single package)
- **Efficiency:** Local CLI (no duplication)

---

### Trade-off 4: Official vs Lightweight

**Embedded CLI:**
- "Official" Anthropic SDK
- Perceived as "canonical"
- May have better support

**Local CLI:**
- Community/third-party SDK
- Perceived as "alternative"
- Must prove value

**Which is Better?**
- **Trust:** Embedded (official)
- **Innovation:** Local CLI (community-driven)

---

## Recommended Architecture for Our SDK

### Pattern: Local CLI Wrapper (Validated)

**Rationale:**

1. ✅ **Validated by Community:** 10+ implementations use this pattern
2. ✅ **Size Advantage:** 50-70x smaller (200 KB vs 14 MB)
3. ✅ **User Control:** Flexibility to choose CLI version
4. ✅ **No Duplication:** One CLI for all projects
5. ✅ **Independent Updates:** SDK and CLI evolve separately

### Implementation Plan

**Core Components:**

```typescript
// src/core/detection.ts
export function detectClaudeBinary(options?: { claudeCodePath?: string }): string;

// src/core/protocol.ts
export function parseNDJSON(stream: ReadableStream): AsyncIterableIterator<SDKMessage>;

// src/core/claude-process.ts
export class ClaudeProcess {
  spawn(args: string[]): Bun.Subprocess;
  async *readNDJSON(stdout: ReadableStream): AsyncIterableIterator<SDKMessage>;
}

// src/api/query.ts
export async function* query(params: QueryParams): AsyncIterableIterator<SDKMessage> {
  const binary = detectClaudeBinary(params);
  const args = buildCliArgs(params);
  const process = Bun.spawn([binary, ...args]);
  yield* parseNDJSON(process.stdout);
}

// src/types/index.ts
// Copy types from official SDK for API compatibility
export type SDKMessage = ...;
export type QueryParams = ...;
```

**Estimated Size:**

| Component | Size (Est.) |
|-----------|-------------|
| Core Logic | ~50 KB |
| Type Definitions | ~50 KB |
| NDJSON Parser | ~20 KB |
| CLI Detection | ~10 KB |
| API Wrappers | ~30 KB |
| Utilities | ~20 KB |
| **Total** | **~180-200 KB** |

**vs Official SDK:** ~200 KB / 14,000 KB = **1.4% of original size!**

---

## Architecture Diagrams

### High-Level Comparison

```
┌─────────────────────────────────────────────────────────────────┐
│                         Official SDK                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User App → SDK (367 KB) → Embedded CLI (10.6 MB)       │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Total: ~14-15 MB                                               │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         Our SDK (Symdion)                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  User App → SDK Wrapper (200 KB) → Local CLI (external) │   │
│  └──────────────────────────────────────────────────────────┘   │
│  Total: ~200 KB (CLI not bundled)                              │
└─────────────────────────────────────────────────────────────────┘

Size Reduction: 14 MB → 0.2 MB = 70x smaller!
```

### Message Flow (Both Patterns)

```
┌─────────┐                  ┌─────────┐                  ┌─────────────┐
│   SDK   │                  │   CLI   │                  │ Anthropic   │
│ (query) │                  │ Process │                  │     API     │
└────┬────┘                  └────┬────┘                  └──────┬──────┘
     │                            │                               │
     │ spawn("claude", [args])    │                               │
     │──────────────────────────→ │                               │
     │                            │                               │
     │                            │ POST /v1/messages             │
     │                            │─────────────────────────────→ │
     │                            │                               │
     │ {"type":"system",...}      │ ← Stream response             │
     │ ←────────────────────────  │ ←────────────────────────────│
     │                            │                               │
     │ {"type":"assistant",...}   │                               │
     │ ←────────────────────────  │                               │
     │                            │                               │
     │ {"type":"result",...}      │                               │
     │ ←────────────────────────  │                               │
     │                            │                               │
```

**Protocol is identical regardless of SDK architecture!**

---

## Conclusion

### Key Findings

1. **Two Valid Patterns:** Embedded CLI (official) vs Local CLI (community)
2. **Trade-offs:** Size vs Simplicity, Control vs Convenience
3. **Community Consensus:** All 10+ community SDKs use Local CLI
4. **Protocol Independence:** NDJSON protocol works with both patterns

### Recommendation for Our SDK

**✅ Local CLI Wrapper Pattern**

**Reasons:**

1. ✅ Validated by entire community ecosystem
2. ✅ 70x smaller bundle size
3. ✅ User control over CLI version
4. ✅ Independent updates
5. ✅ No storage duplication
6. ✅ Fills gap in TypeScript ecosystem

**Implementation:**
- ~1,000-1,500 LOC
- ~200 KB bundle size
- 100% API compatibility
- Bun runtime for performance

---

**Last Updated:** 2026-02-02
**Status:** ✅ Analysis Complete
**Next:** Implementation Phase
