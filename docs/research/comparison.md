# Feature Comparison Matrix

## Overview

This document provides detailed feature comparisons between the official Claude Agent SDK, community implementations, and our planned Symdion SDK. It quantifies the benefits and trade-offs of each approach.

**Last Updated:** 2026-02-02

## Bundle Size Comparison

### Absolute Sizes

| Implementation | Total Size | CLI Size | SDK Code Size | Assets Size |
|----------------|------------|----------|---------------|-------------|
| **Official TypeScript SDK** | ~14-15 MB | 10.6 MB | 367 KB | 3-4 MB |
| **Rust (claude-sdk-rs)** | ~5-10 MB | 0 (external) | ~5-10 MB (binary) | 0 |
| **Go (severity1)** | ~10-15 MB | 0 (external) | ~10-15 MB (binary) | 0 |
| **Elixir (claude_code)** | ~2-5 MB | 0 (external) | ~2-5 MB (BEAM) | 0 |
| **Symdion SDK (Planned)** | **~200 KB** | 0 (external) | ~200 KB | 0 |

### Size Reduction

| Comparison | Original | Symdion | Reduction Factor |
|------------|----------|---------|------------------|
| **vs Official SDK** | 14 MB | 0.2 MB | **70x smaller** |
| **vs Rust SDKs** | 7.5 MB (avg) | 0.2 MB | **37x smaller** |
| **vs Go SDKs** | 12.5 MB (avg) | 0.2 MB | **62x smaller** |
| **vs Elixir SDKs** | 3.5 MB (avg) | 0.2 MB | **17x smaller** |

### Impact on Project Size

**Scenario:** 10 microservices using Claude Agent SDK

| Implementation | Size per Service | Total Size (10 services) |
|----------------|------------------|--------------------------|
| **Official SDK** | 14 MB | **140 MB** |
| **Symdion SDK** | 0.2 MB | **2 MB** |
| **Savings** | - | **138 MB saved** (98.5% reduction) |

**Note:** Official SDK duplicates CLI in every `node_modules`, while Symdion SDK uses one global CLI installation.

---

## API Compatibility

### TypeScript API Surface

| Feature | Official TS SDK | Symdion SDK | Compatible? |
|---------|-----------------|-------------|-------------|
| `query()` | ✅ | ✅ | ✅ 100% |
| `tool()` | ✅ | ✅ | ✅ 100% |
| `createSdkMcpServer()` | ✅ | ✅ | ✅ 100% |
| Type definitions | ✅ | ✅ (copied) | ✅ 100% |
| Async iterators | ✅ | ✅ | ✅ 100% |
| Message types | ✅ | ✅ (copied) | ✅ 100% |
| **Compatibility Score** | 100% | **100%** | ✅ **Drop-in replacement** |

**Other SDKs (Rust/Go/Elixir):**
- ❌ Not API-compatible (different languages)
- ❌ Cannot be drop-in replacements
- ✅ Functionally equivalent (same protocol)

**Unique Value:** Symdion SDK is the **ONLY** alternative with 100% API compatibility!

---

## Feature Completeness

### Core Features

| Feature | Official SDK | Rust SDKs | Go SDKs | Elixir SDKs | Symdion SDK |
|---------|--------------|-----------|---------|-------------|-------------|
| **Query API** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Streaming** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Tool Execution** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Custom Tools** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **MCP Support** | ✅ | ✅ | ⚠️ Partial | ✅ | ✅ |
| **Session Management** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Permission Modes** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Error Handling** | ✅ | ✅ | ⚠️ Basic | ✅ | ✅ |
| **Type Safety** | ✅ TypeScript | ✅ Rust | ⚠️ Go | ⚠️ Elixir | ✅ TypeScript |

**Legend:**
- ✅ Full support
- ⚠️ Partial/basic support
- ❌ Not supported

### Built-in Tools Support

All implementations support the same built-in tools (CLI-provided):

| Tool | Description | All SDKs |
|------|-------------|----------|
| `Read` | Read file contents | ✅ |
| `Write` | Write file | ✅ |
| `Edit` | Edit file (string replacement) | ✅ |
| `Glob` | Find files by pattern | ✅ |
| `Grep` | Search file contents | ✅ |
| `Bash` | Execute bash command | ✅ |
| `WebFetch` | Fetch URL content | ✅ |
| `WebSearch` | Search the web | ✅ |
| `Task` | Spawn sub-agent | ✅ |
| `TodoWrite` | Task management | ✅ |

**Why?** All SDKs use the same Claude CLI, which provides these tools. SDK doesn't implement tools - it just parses output!

---

## Performance Comparison

### Installation Speed

| Implementation | Package Download | Installation Time (Est.) |
|----------------|------------------|--------------------------|
| **Official SDK** | 14 MB | ~10-20 seconds |
| **Rust SDKs** | 5-10 MB | ~5-10 seconds |
| **Go SDKs** | 10-15 MB | ~8-15 seconds |
| **Elixir SDKs** | 2-5 MB | ~3-8 seconds |
| **Symdion SDK** | **0.2 MB** | **~1-2 seconds** |

**Symdion SDK Advantage:** 10x faster installation than official SDK

### Runtime Performance

All implementations spawn the same Claude CLI process, so runtime performance is **identical**:

| Metric | All Implementations |
|--------|---------------------|
| Process Spawn Time | ~100-200ms (CLI startup) |
| API Latency | ~500ms-2s (Anthropic API) |
| Streaming Throughput | ~50-100 tokens/sec (API-limited) |
| Memory Usage | ~50-200 MB (CLI process) |

**Key Insight:** SDK architecture doesn't affect runtime performance - it's all CLI and API!

### Build Performance

**Docker Image Size:**

| Setup | Base Image | + Dependencies | + Official SDK | + Symdion SDK |
|-------|------------|----------------|----------------|---------------|
| **Node.js App** | 100 MB (alpine) | +50 MB | +14 MB = 164 MB | +0.2 MB = 150 MB |
| **Savings** | - | - | - | **14 MB saved (8.5%)** |

**CI/CD Impact:**

| Metric | Official SDK | Symdion SDK | Improvement |
|--------|--------------|-------------|-------------|
| `npm install` time | ~10s | ~2s | **5x faster** |
| Cache size | +14 MB | +0.2 MB | **70x smaller** |
| Build artifact size | +14 MB | +0.2 MB | **70x smaller** |

---

## Developer Experience

### Setup Complexity

| Aspect | Official SDK | Symdion SDK |
|--------|--------------|-------------|
| **Installation** | `npm install @anthropic-ai/claude-agent-sdk` | `npm install @lite-claude/agent-sdk` + `npm install -g @anthropic-ai/claude-code` |
| **Steps** | 1 step | 2 steps |
| **Time** | ~10-20s | ~2s SDK + ~10s CLI (one-time) |
| **Setup Docs** | None needed | Clear instructions |

**Trade-off:** Official SDK is 1 step, Symdion is 2 steps (but CLI is one-time global install)

### API Usage (Identical)

**Official SDK:**
```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';

for await (const msg of query({ prompt: 'Hello!' })) {
  console.log(msg);
}
```

**Symdion SDK (Identical!):**
```typescript
import { query } from '@lite-claude/agent-sdk';

for await (const msg of query({ prompt: 'Hello!' })) {
  console.log(msg);
}
```

**Developer Experience:** ✅ **Identical** (100% API-compatible)

### TypeScript Support

| Feature | Official SDK | Symdion SDK | Rust SDKs | Go SDKs | Elixir SDKs |
|---------|--------------|-------------|-----------|---------|-------------|
| **Type Definitions** | ✅ .d.ts | ✅ .d.ts (copied) | ✅ Rust types | ⚠️ Go structs | ⚠️ Elixir specs |
| **IntelliSense** | ✅ | ✅ | ✅ | ⚠️ Limited | ⚠️ Limited |
| **Compile-Time Checks** | ✅ | ✅ | ✅ | ⚠️ Runtime | ⚠️ Runtime |
| **Zod Schemas** | ✅ | ✅ | N/A | N/A | N/A |

**TypeScript DX:** Official SDK and Symdion SDK are **equal** (Rust is also strong, but different language)

---

## Maintenance & Support

### Version Control

| Aspect | Official SDK | Symdion SDK |
|--------|--------------|-------------|
| **SDK Version** | Locked to CLI version | Independent |
| **CLI Version** | Bundled (10.6 MB) | User-controlled |
| **Update SDK** | Updates both SDK + CLI | Updates SDK only |
| **Update CLI** | Must update SDK | `npm update -g @anthropic-ai/claude-code` |
| **Flexibility** | Low (coupled) | High (decoupled) |

**Example Scenario: CLI Bug Fix**

**Official SDK:**
1. Wait for Anthropic to release new SDK version
2. `npm update @anthropic-ai/claude-agent-sdk`
3. Downloads 14 MB (entire package)

**Symdion SDK:**
1. `npm update -g @anthropic-ai/claude-code`
2. Downloads ~10 MB (CLI only, global)
3. SDK unaffected (decoupled)

**Advantage:** Faster CLI updates with Symdion SDK

### Breaking Changes

| Type | Official SDK | Symdion SDK |
|------|--------------|-------------|
| **API Changes** | High frequency (per changelog) | Low (we control API) |
| **CLI Changes** | Bundled with SDK updates | Decoupled (CLI updates don't break SDK) |
| **Protocol Changes** | Rare (stable protocol) | Rare (stable protocol) |

**Risk Mitigation:**
- Official SDK: Frequent SDK updates may break user code
- Symdion SDK: CLI updates don't affect SDK API (decoupled)

---

## Use Case Comparison

### Use Case 1: Microservices (10+ services)

**Scenario:** 10 microservices, each using Claude Agent SDK

| Metric | Official SDK | Symdion SDK | Winner |
|--------|--------------|-------------|--------|
| **Total Bundle Size** | 140 MB (10 × 14 MB) | 2 MB (10 × 0.2 MB) | ✅ Symdion (98% smaller) |
| **CLI Installation** | Bundled (per service) | Global (one-time) | ✅ Symdion (no duplication) |
| **Docker Image Size** | +140 MB | +2 MB | ✅ Symdion (138 MB saved) |
| **CI/CD Time** | ~100s (10 × 10s) | ~20s (10 × 2s) | ✅ Symdion (5x faster) |

**Recommendation:** ✅ **Symdion SDK** (massive savings at scale)

---

### Use Case 2: Serverless Functions

**Scenario:** AWS Lambda function with Claude Agent

| Metric | Official SDK | Symdion SDK | Winner |
|--------|--------------|-------------|--------|
| **Cold Start** | Slower (larger bundle) | Faster (smaller bundle) | ✅ Symdion |
| **Deployment Size** | +14 MB | +0.2 MB | ✅ Symdion |
| **Lambda Layers** | Hard (14 MB limit for code) | Easy (0.2 MB) | ✅ Symdion |
| **CLI Requirement** | None (bundled) | Must include in layer | ⚠️ Official (simpler) |

**Trade-off:**
- Official SDK: No CLI layer needed, but huge bundle
- Symdion SDK: Need CLI layer, but tiny bundle

**Recommendation:** ⚠️ **Depends on setup** (Symdion better if CLI layer is prepared)

---

### Use Case 3: Frontend Build

**Scenario:** Next.js app using Claude Agent SDK in API routes

| Metric | Official SDK | Symdion SDK | Winner |
|--------|--------------|-------------|--------|
| **Build Time** | Slower (14 MB to process) | Faster (0.2 MB) | ✅ Symdion |
| **Vercel Deploy** | +14 MB | +0.2 MB | ✅ Symdion |
| **Netlify Deploy** | +14 MB | +0.2 MB | ✅ Symdion |
| **CDN Caching** | Worse (large bundle) | Better (small bundle) | ✅ Symdion |

**Recommendation:** ✅ **Symdion SDK** (frontend build performance)

---

### Use Case 4: Desktop App (Electron)

**Scenario:** Electron app with Claude Agent integration

| Metric | Official SDK | Symdion SDK | Winner |
|--------|--------------|-------------|--------|
| **App Size** | +14 MB | +0.2 MB | ✅ Symdion |
| **Download Size** | +14 MB | +0.2 MB | ✅ Symdion |
| **CLI Requirement** | None | User must install CLI | ⚠️ Official (simpler) |
| **Updates** | Full app update | CLI updates independent | ✅ Symdion (flexibility) |

**Trade-off:**
- Official SDK: Self-contained (no CLI install)
- Symdion SDK: Requires CLI installation step

**Recommendation:** ⚠️ **Depends on distribution** (Symdion better for advanced users)

---

### Use Case 5: CLI Tool

**Scenario:** Custom CLI tool wrapping Claude Agent

| Metric | Official SDK | Symdion SDK | Winner |
|--------|--------------|-------------|--------|
| **Installation** | `npm install -g my-tool` | `npm install -g my-tool` + CLI | ⚠️ Official (1 step) |
| **Binary Size** | +14 MB | +0.2 MB | ✅ Symdion |
| **Distribution** | Self-contained | Requires Claude CLI | ⚠️ Official (simpler) |
| **User Flexibility** | No CLI control | User controls CLI version | ✅ Symdion |

**Recommendation:** ⚠️ **Mixed** (Official for simplicity, Symdion for power users)

---

## Cost Analysis

### Storage Costs

**Scenario:** 1,000 deployments (e.g., CI/CD cache, container registry)

| Implementation | Size per Deployment | Total Storage | Monthly Cost (S3) |
|----------------|---------------------|---------------|-------------------|
| **Official SDK** | 14 MB | 14 GB | ~$0.32/month |
| **Symdion SDK** | 0.2 MB | 0.2 GB | ~$0.005/month |
| **Savings** | - | 13.8 GB saved | **$0.31/month saved** |

**Scale:** At 10,000 deployments, **$3.10/month saved** ($37/year)

### Bandwidth Costs

**Scenario:** 1 million npm installs/month

| Implementation | Size per Install | Total Bandwidth | Monthly Cost (CDN) |
|----------------|------------------|-----------------|---------------------|
| **Official SDK** | 14 MB | 14 TB | ~$140/month |
| **Symdion SDK** | 0.2 MB | 0.2 TB | ~$2/month |
| **Savings** | - | 13.8 TB saved | **$138/month saved** |

**Note:** This is Anthropic's cost for distributing official SDK. For Symdion, we save users' bandwidth too!

---

## Risk Assessment

### Risk Matrix

| Risk | Official SDK | Symdion SDK | Mitigation (Symdion) |
|------|--------------|-------------|----------------------|
| **CLI Not Found** | N/A (bundled) | Medium | Clear error messages, detection logic |
| **Version Mismatch** | N/A (locked) | Low | Protocol is stable (2024-11-05) |
| **API Incompatibility** | Low | Low | Copied types, compatibility tests |
| **Protocol Change** | Low (official) | Low | Same protocol for all SDKs |
| **Maintenance Burden** | Low (Anthropic) | Medium | Active community validation |
| **Security** | High (official) | Medium | Depends on local CLI security |

### Security Considerations

**Official SDK:**
- ✅ Vetted by Anthropic
- ✅ Bundled (no external dependencies)
- ⚠️ Closed source (can't audit)

**Symdion SDK:**
- ⚠️ Depends on local CLI (user's responsibility)
- ✅ Open source (auditable)
- ✅ Minimal attack surface (~200 KB code)

**Best Practice:** Both SDKs should verify CLI integrity (checksums, signatures)

---

## Summary Scorecard

### Quantitative Metrics

| Metric | Official SDK | Symdion SDK | Winner |
|--------|--------------|-------------|--------|
| **Bundle Size** | 14 MB | 0.2 MB | ✅ Symdion (70x smaller) |
| **Installation Time** | 10-20s | 1-2s | ✅ Symdion (10x faster) |
| **API Compatibility** | 100% | 100% | ✅ Tie |
| **Type Safety** | ✅ TypeScript | ✅ TypeScript | ✅ Tie |
| **Feature Completeness** | 100% | 100% | ✅ Tie |
| **Setup Steps** | 1 | 2 | ⚠️ Official (simpler) |
| **CLI Control** | No | Yes | ✅ Symdion (flexible) |
| **Update Overhead** | High | Low | ✅ Symdion (decoupled) |

### Qualitative Factors

| Factor | Official SDK | Symdion SDK |
|--------|--------------|-------------|
| **Trust** | High (official) | Medium (community) |
| **Support** | Anthropic (official) | Community |
| **Innovation** | Slow (official process) | Fast (community) |
| **Flexibility** | Low (coupled) | High (decoupled) |
| **Simplicity** | High (zero setup) | Medium (CLI install) |

---

## Recommendations by User Type

### Beginners

**Recommendation:** ⚠️ **Official SDK**

**Reasons:**
- Zero setup (works after `npm install`)
- Official support
- Simpler to get started

**When to Switch to Symdion:**
- After understanding basics
- When bundle size becomes a concern
- When needing CLI flexibility

---

### Advanced Developers

**Recommendation:** ✅ **Symdion SDK**

**Reasons:**
- 70x smaller bundle
- CLI version control
- Independent updates
- Better performance at scale

**Trade-off:**
- Extra setup step (CLI installation)
- Community support (not official)

---

### Enterprise Teams

**Recommendation:** ⚠️ **Official SDK (initially), migrate to Symdion (later)**

**Reasons for Official:**
- Official support contract
- Guaranteed compatibility
- Simpler procurement

**Reasons to Migrate to Symdion:**
- Massive cost savings at scale (140 MB → 2 MB for 10 services)
- Faster CI/CD (5x)
- Better resource utilization

---

### Open Source Projects

**Recommendation:** ✅ **Symdion SDK**

**Reasons:**
- Smaller package size (better for users)
- Open source (auditable)
- Community-driven
- Flexibility

---

## Conclusion

### Key Takeaways

1. **Size:** Symdion is **70x smaller** (200 KB vs 14 MB)
2. **API:** Symdion is **100% compatible** (drop-in replacement)
3. **Features:** Symdion is **equivalent** (same protocol)
4. **Trade-off:** Official SDK is simpler (1 step), Symdion is lighter (better at scale)

### Final Recommendation

**For Most Users:** ✅ **Symdion SDK**

**Reasons:**
- Massive size savings (70x smaller)
- API-compatible (no code changes)
- User control over CLI version
- Better performance at scale
- Minimal setup overhead (one-time CLI install)

**When to Use Official SDK:**
- Absolute simplicity required
- Official support contract needed
- Risk-averse enterprise (official is "safer")

---

**Last Updated:** 2026-02-02
**Status:** ✅ Comparison Complete
**Decision:** Proceed with Symdion SDK implementation - clear value proposition for majority of users
