# Test Utilities

Permanent testing and debugging utilities.

---

## 🔍 Proxy CLI

**File:** `proxy-cli.js`

**Purpose:** Intercept all stdin/stdout communication between SDK and CLI.

### What It Does

```
SDK → Proxy CLI (logs everything) → Real CLI → Claude API
        ↓
    ../research/logs/proxy-*.log
```

The proxy:
- Spawns the real CLI with same arguments
- Forwards stdin from SDK to CLI (logging each message)
- Forwards stdout from CLI to SDK (logging each message)
- Saves logs to timestamped files in `../research/logs/`

### Usage

```typescript
// In any test or script
const options = {
  pathToClaudeCodeExecutable: './tests/utils/proxy-cli.js'
};

for await (const msg of query({ prompt, options })) {
  // SDK thinks it's talking to real CLI
  // But proxy is logging everything
}
```

Then check the logs:
```bash
cat tests/research/logs/proxy-*.log
```

### When to Use

✅ **Use when:**
- Implementing new features (check Official SDK behavior first)
- Debugging cost/performance differences
- Validating protocol compliance
- Discovering undocumented protocol details

❌ **Don't use for:**
- Regular test runs (adds overhead)
- CI/CD (too slow)
- Performance benchmarks (skews timing)

### Success Story

This tool discovered the missing `systemPrompt: ""` field that caused our SDK to cost 73% more than Official SDK.

**Before:** $0.051 per 5 turns (unusable)
**After:** $0.027 per 5 turns (cheaper than Official!)

Full story: `docs/research/PROXY_CLI_SUCCESS.md`

---

## Adding New Utilities

Place permanent, reusable testing tools here. One-off investigation scripts belong in `tests/research/archived/`.

**Guidelines:**
- Must be reusable across multiple scenarios
- Must have clear documentation
- Must have example usage
- Should have a success story or proven value

---

## Related Documentation

- **Full Guide:** `docs/guides/REVERSE_ENGINEERING.md`
- **Research Tools:** `tests/research/README.md`
- **Case Study:** `docs/research/cache-token-investigation.md`
