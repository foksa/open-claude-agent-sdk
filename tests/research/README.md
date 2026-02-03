# Research Tests & Tools

This directory contains debugging tools and research scripts for investigating SDK behavior.

---

## 🔍 Proxy CLI - The Secret Weapon

**File:** `../utils/proxy-cli.js`

**Purpose:** Intercept all stdin/stdout between SDK and CLI to discover protocol details.

**Note:** Moved to `tests/utils/` as it's now a permanent debugging tool, not just research.

### Quick Start

```bash
# 1. Compare both SDKs
bun tests/research/compare-with-proxy.ts

# 2. Test just Official SDK
bun tests/research/test-official-proxy.ts

# 3. Test just Lite SDK
bun tests/research/test-lite-only.ts

# 4. Check logs
cat tests/research/logs/*.log
```

### How It Works

```
SDK → Proxy CLI (logs stdin/stdout) → Real CLI → Claude API
        ↓
    tests/research/logs/proxy-*.log
```

The proxy forwards everything through unchanged, but logs all messages to timestamped files.

### What We Discovered

**Problem:** Lite SDK was 73% more expensive than Official SDK

**Investigation:**
```bash
bun compare-with-proxy.ts
cat logs/proxy-*.log | grep "STDIN #1" -A 10
```

**Discovery:** Official SDK sends `systemPrompt: ""` in control_request initialization. Lite SDK was missing this field.

**Fix:** Added the field → Full cost parity achieved! 🎉

### Full Documentation

See `docs/guides/REVERSE_ENGINEERING.md` for complete guide.

---

## 📊 Comparison Tests

### Single-Turn Comparison

```bash
bun sdk-comparison.ts
```

Tests both SDKs with embedded and local CLI. Compares:
- Time to first token
- Total time
- Cost
- Cache tokens

### Multi-Turn Comparison (5 turns)

```bash
bun multi-turn-comparison.ts
```

Full conversation test showing cost accumulation over multiple turns.

### Multi-Turn CLI Comparison (3 turns)

```bash
bun multi-turn-cli-comparison.ts
```

Quick test comparing embedded vs local CLI for both SDKs.

---

## 🛠️ Utility Scripts

### Check CLI Args

```bash
bun check-cli-args.ts
```

Shows what CLI arguments our SDK is building.

### Compare System Init

```bash
bun compare-system-init.ts
```

Compares the `system:init` messages from both SDKs.

### Inspect Messages

```bash
bun inspect-messages.ts
```

Direct CLI spawn with stdin/stdout monitoring.

### Test Session Persistence

```bash
bun test-session-persistence.ts
```

Tests if `--no-session-persistence` flag affects caching.

---

## 📁 Directory Structure

```
tests/
├── utils/
│   └── proxy-cli.js          # 🔍 The interceptor (permanent tool)
│
└── research/
    ├── README.md             # This file
    │
    ├── Active Comparison Tests:
    ├── sdk-comparison.ts         # Single-turn comparison
    ├── multi-turn-comparison.ts  # 5-turn conversation
    ├── multi-turn-cli-comparison.ts  # 3-turn CLI test
    ├── compare-with-proxy.ts     # Run both SDKs through proxy
    ├── test-official-proxy.ts    # Test Official SDK
    ├── test-lite-only.ts         # Test Lite SDK
    │
    ├── comparisons/          # Specific comparison utilities
    │   ├── compare-system-init.ts
    │   └── compare-stdin-messages.ts
    │
    ├── performance/          # Performance research scripts
    │   ├── test-isolation-modes.ts
    │   ├── test-cost-comparison.ts
    │   ├── test-claude-md-loading.ts
    │   ├── test-claude-md-quick.ts
    │   └── test-system-prompt.ts
    │
    ├── archived/             # Historical/one-off investigations
    │   ├── check-cli-args.ts
    │   ├── debug-stdin.ts
    │   ├── inspect-messages.ts
    │   ├── test-session-persistence.ts
    │   └── trace-api-calls.ts
    │
    └── logs/                 # Proxy output logs
        └── proxy-*.log
```

---

## 💡 Tips

### Finding Differences

```bash
# Extract stdin messages from logs
cat logs/proxy-*.log | grep -A 20 "STDIN #"

# Compare cache tokens
cat logs/*.log | grep "cache_creation\|cache_read"

# See control protocol initialization
cat logs/*.log | grep -A 5 "control_request"
```

### Debugging New Features

1. Run Official SDK through proxy first
2. Examine logs to see what it sends
3. Implement in Lite SDK
4. Run Lite SDK through proxy
5. Compare logs to verify match

### When to Use Proxy

✅ **Use when:**
- Implementing new features
- Debugging cost/performance issues
- Validating protocol compliance
- Discovering undocumented behavior

❌ **Don't use for:**
- Regular testing (too slow)
- CI/CD (adds overhead)
- Performance benchmarks (skews results)

---

## 🎯 Success Stories

### Case Study: 73% Cost Bug

**Before:**
- Lite SDK: $0.051 per 5 turns
- Official SDK: $0.029 per 5 turns
- Difference: +73% ❌

**Investigation:**
- Used proxy CLI to intercept messages
- Found missing `systemPrompt: ""` field
- Added field to Lite SDK

**After:**
- Lite SDK: $0.027 per 5 turns
- Official SDK: $0.029 per 5 turns
- Difference: -1.8% ✅ (now cheaper!)

Full writeup: `docs/research/cache-token-investigation.md`

---

## 📚 Related Documentation

- **Reverse Engineering Guide:** `docs/guides/REVERSE_ENGINEERING.md`
- **Cache Investigation:** `docs/research/cache-token-investigation.md`
- **Performance Research:** `docs/research/performance.md`
- **Protocol Documentation:** `docs/research/protocol.md`

---

**Key Takeaway:** The proxy CLI technique is the most powerful debugging tool we have. When in doubt about protocol behavior, intercept and compare with Official SDK.
