# Performance Research

Scripts used to investigate performance and cost optimization.

---

## Purpose

These scripts led to the findings documented in `docs/research/performance.md` about CLI overhead and isolation modes.

---

## Scripts

### Isolation Studies

**test-isolation-modes.ts**
- Compares default, minimal, and project isolation modes
- Measures time to first token and total time
- Result: 47% speedup with minimal mode

**test-cost-comparison.ts**
- Compares cost between default and isolated modes
- Measures cache tokens and API costs
- Result: 23% cost reduction with isolation

### Configuration Impact

**test-claude-md-loading.ts**
- Tests if CLAUDE.md is loaded in different modes
- Measures cache token creation
- Result: `settingSources: ""` blocks CLAUDE.md

**test-claude-md-quick.ts**
- Quick test for CLAUDE.md loading
- Faster version of above
- Result: Confirmed CLAUDE.md behavior

**test-system-prompt.ts**
- Tests if `--system-prompt` replaces or adds to CLAUDE.md
- Tests `--append-system-prompt` behavior
- Result: `--system-prompt` replaces, `--append-system-prompt` adds

---

## Key Findings

### 1. Isolation Modes

| Mode | Speed | Cost | CLAUDE.md |
|------|-------|------|-----------|
| Default | Baseline | Baseline | ✅ Loaded |
| Minimal | **47% faster** | **23% cheaper** | ❌ Blocked |
| Project | **47% faster** | **23% cheaper** | ✅ Loaded |

**Recommendation:** Use `settingSources: ['project']` for best balance.

### 2. User Config Overhead

Default mode loads:
- User MCP servers (~800 tokens)
- User skills (~300 tokens)
- Hooks/settings (~167 tokens)
- **Total:** ~1,267 tokens overhead per query

### 3. CLAUDE.md Impact

- Our CLAUDE.md is ~122 lines (~4,800 tokens)
- Empty `settingSources` blocks it
- Project mode includes it
- Critical for development experience

---

## Related Documentation

- **Full Findings:** `docs/research/performance.md`
- **Implementation:** `src/core/spawn.ts` (settingSources handling)
- **Tests:** `tests/integration/` (integration tests use these findings)

---

## Running These Scripts

```bash
# Isolation comparison
bun tests/research/performance/test-isolation-modes.ts

# Cost comparison
bun tests/research/performance/test-cost-comparison.ts

# CLAUDE.md tests
bun tests/research/performance/test-claude-md-loading.ts
bun tests/research/performance/test-claude-md-quick.ts

# System prompt tests
bun tests/research/performance/test-system-prompt.ts
```

**Note:** These tests use real API calls and will cost money. They're preserved for reference and regression testing, not regular use.

---

## Status

✅ **Complete** - Research concluded, findings implemented

The insights from these scripts are now:
- Documented in `docs/research/performance.md`
- Applied in `src/core/spawn.ts` (default settingSources)
- Tested in integration tests
- Used by comparison utilities

These scripts remain for:
- Historical reference
- Regression testing
- Future optimization research
