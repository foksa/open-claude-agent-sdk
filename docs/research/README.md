# Research Summary

This folder contains research findings that informed the Lite Claude Agent SDK design.

---

## Key Findings

### 1. Protocol is Fully Documented ✅

The Claude CLI uses NDJSON over stdout. Full specification available.

**See:** [`protocol.md`](./protocol.md)

### 2. Local CLI Approach is Validated ✅

Multiple community SDKs (Rust, Go, Elixir) use the same approach:
- Spawn local `claude` CLI
- Parse NDJSON output
- Manage stdin/stdout communication

**See:** [`alternatives.md`](./alternatives.md)

### 3. Official SDK Bundles 10.6MB CLI ⚠️

Official `@anthropic-ai/claude-agent-sdk` embeds the CLI.

**Problem:**
- 14MB total bundle size
- Version coupling
- Frequent breaking changes

**Our Solution:**
- Use local CLI (user installs globally)
- 200KB bundle (70x smaller)
- Decouple SDK and CLI versions

**See:** [`official-sdk.md`](./official-sdk.md)

### 4. User Config Causes Performance Overhead ⚠️

By default, CLI loads ALL user MCP servers and skills:
- 47.6% slower queries
- 23.2% higher cost
- 1267 extra tokens per query

**Solution:** Isolation flags

**See:** [`performance.md`](./performance.md)

---

## Research Files

| File | Description |
|------|-------------|
| **protocol.md** | CLI protocol specification |
| **official-sdk.md** | Official SDK analysis & compatibility |
| **performance.md** | Performance optimization research |
| **architecture.md** | Architecture decisions & trade-offs |
| **alternatives.md** | Community implementations comparison |

---

## Conclusion

**Can we build a lightweight SDK?** ✅ **YES!**

**Benefits:**
- 70x smaller bundle (200KB vs 14MB)
- 100% API compatible
- User control over CLI version
- 47% faster queries (with isolation)
- 23% cheaper queries (with isolation)

**Trade-offs:**
- Users must install Claude CLI globally (one-time)

**Recommendation:** Proceed with implementation.

---

**Status:** ✅ Research Complete
**Date:** 2026-02-02
**Next Phase:** Implementation (Baby Steps 1-5 complete, Phase 1 next)
