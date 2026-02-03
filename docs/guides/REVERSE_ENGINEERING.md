# Reverse Engineering Guide

**How we achieved parity with Official SDK by intercepting CLI communication**

---

## Overview

This guide documents the proxy CLI technique used to discover protocol details that fixed our 73% cost difference with Official SDK.

**Problem:** Lite SDK was using 3,300 extra cache tokens per turn (73% more expensive)
**Solution:** Create a proxy CLI that logs all stdin/stdout to discover what Official SDK does differently
**Result:** Found missing `systemPrompt: ""` field, achieved full parity

---

## The Proxy CLI Technique

### Concept

```
SDK → Proxy CLI (logs everything) → Real CLI → Claude API
        ↓
    Log files (stdin/stdout captured)
```

By intercepting all communication between SDK and CLI, we can:
- See exact message formats
- Discover undocumented protocol details
- Compare Official SDK vs Lite SDK behavior
- Find hidden flags, options, or fields

### Implementation

The proxy CLI (`tests/utils/proxy-cli.js`) is a simple Node.js script that:

1. **Spawns the real CLI** with the same arguments
2. **Forwards stdin** from SDK to real CLI (logging each message)
3. **Forwards stdout** from real CLI to SDK (logging each message)
4. **Logs to timestamped files** for comparison

```javascript
// Key parts of proxy-cli.js
const realCli = spawn(REAL_CLI, process.argv.slice(2), {
  stdio: ['pipe', 'pipe', process.stderr]
});

// Log stdin (SDK → CLI)
process.stdin.on('data', (chunk) => {
  log(chunk.toString());
  realCli.stdin.write(chunk);  // Forward
});

// Log stdout (CLI → SDK)
realCli.stdout.on('data', (chunk) => {
  log(chunk.toString());
  process.stdout.write(chunk);  // Forward
});
```

---

## Case Study: The 73% Cost Bug

### Discovery Process

**Step 1: Reproduce the issue**
```bash
bun tests/research/multi-turn-comparison.ts
# Result: Lite SDK costs $0.051 vs Official $0.029 (73% more)
```

**Step 2: Run both SDKs through proxy**
```typescript
// tests/research/compare-with-proxy.ts
const options = {
  pathToClaudeCodeExecutable: './tests/utils/proxy-cli.js'
};

// Run Official SDK
for await (const msg of officialQuery({ prompt, options })) { ... }

// Run Lite SDK
for await (const msg of liteQuery({ prompt, options })) { ... }
```

**Step 3: Compare logs**
```bash
cat tests/research/logs/proxy-*.log
```

**Official SDK log:**
```json
STDIN #1:
{
  "request_id": "x4nc60o3peb",
  "type": "control_request",
  "request": {
    "subtype": "initialize",
    "systemPrompt": ""    ← THIS FIELD!
  }
}
```

**Lite SDK log (before fix):**
```json
STDIN #1:
{
  "type": "control_request",
  "request_id": "init_1770069857770",
  "request": {
    "subtype": "initialize"
    // Missing systemPrompt field!
  }
}
```

### The Fix

**QueryImpl.ts:360**
```typescript
const init: any = {
  type: 'control_request',
  request_id: requestId,
  request: {
    subtype: 'initialize',
    systemPrompt: ''  // ← Added this field
  }
};
```

Also ensured this is sent ALWAYS, not just when hooks are present:
```typescript
// BEFORE: if (options.hooks || options.canUseTool) {
// AFTER: Always send
this.sendControlProtocolInit(options);
```

### Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Cost per 5 turns | $0.051 | $0.027 | **-47%** (now cheaper!) |
| Cache tokens/turn | +3,300 | +1 | **99.97% reduction** |
| Verdict | ❌ Not viable | ✅ Full parity | **Fixed** |

---

## Using the Proxy

### Quick Start

1. **Run Official SDK through proxy:**
```bash
bun tests/research/test-official-proxy.ts
```

2. **Run Lite SDK through proxy:**
```bash
bun tests/research/test-lite-only.ts
```

3. **Compare logs:**
```bash
cat tests/research/logs/*.log
```

### Automated Comparison

```bash
bun tests/research/compare-with-proxy.ts
```

This script:
- Runs both SDKs through proxy
- Extracts stdin messages from logs
- Compares message-by-message
- Reports differences

### Example Output

```
STDIN MESSAGE COMPARISON
=========================================

Official SDK sent: 1 stdin messages
Lite SDK sent: 1 stdin messages

✅ Same number of messages

Message 1:
  ❌ Different!
     Field 'request' differs:
       Official: {"subtype":"initialize","systemPrompt":""}
       Lite: {"subtype":"initialize"}
```

---

## What We've Learned

### Protocol Details Discovered

1. **Control Protocol Initialization**
   - ALWAYS send `control_request` before first user message
   - Must include `systemPrompt: ""` field (even if empty)
   - Affects API caching behavior significantly

2. **Message Format**
   - User messages use `content` array format:
   ```json
   {
     "type": "user",
     "message": {
       "role": "user",
       "content": [
         { "type": "text", "text": "Hello" }
       ]
     }
   }
   ```
   - NOT simple string format

3. **Request IDs**
   - Official SDK uses random alphanumeric IDs
   - Format: lowercase letters + numbers (e.g., "x4nc60o3peb")

### Caching Behavior

The `systemPrompt: ""` field in control_request affects Claude API's prompt caching:

- **With field:** Tools get cached properly (~15,850 tokens)
- **Without field:** Cache miss on tools (~19,150 tokens)
- **Difference:** ~3,300 tokens = size of tool definitions

This suggests the API uses the control_request structure as part of the cache key generation.

---

## Best Practices

### When to Use Proxy

✅ **Use proxy when:**
- Implementing new features (check Official SDK behavior first)
- Debugging cost/performance issues
- Validating protocol compliance
- Discovering undocumented features

❌ **Don't use proxy for:**
- Regular testing (too slow)
- Production (adds overhead)
- CI/CD (non-deterministic)

### Interpreting Logs

**Key things to look for:**

1. **Message order** - Does order match Official SDK?
2. **Field presence** - Any missing/extra fields?
3. **Value format** - Strings vs arrays vs objects?
4. **Timing** - Are messages sent at the right time?

**Common issues:**
- Missing optional fields (like `systemPrompt`)
- Wrong message format (string vs array)
- Incorrect ordering (init before user message)
- Missing control protocol messages

---

## Advanced Techniques

### 1. Diff Two Log Files

```bash
diff -u <(cat logs/official.log | grep STDIN) \
        <(cat logs/lite.log | grep STDIN)
```

### 2. Extract Just JSON Messages

```bash
cat logs/proxy-*.log | \
  grep -A 20 "STDIN #" | \
  grep "^  " | \
  jq '.'
```

### 3. Compare Cache Token Usage

```bash
cat logs/*.log | \
  grep "cache_creation\|cache_read" | \
  awk '{print $NF}'
```

### 4. Monitor Specific Fields

```bash
# Check if systemPrompt is present
cat logs/proxy-*.log | \
  grep -A 5 '"type": "control_request"' | \
  grep systemPrompt || echo "Missing!"
```

---

## Future Applications

### Discovering New Features

When Official SDK adds features:

1. Run Official SDK through proxy
2. Examine logs for new fields/messages
3. Implement in Lite SDK
4. Verify with proxy comparison

### API Protocol Evolution

Track changes over time:
```bash
# Save baseline
bun test-official-proxy.ts
cp logs/proxy-*.log baselines/v0.1.0.log

# Later, compare with new version
bun test-official-proxy.ts
diff baselines/v0.1.0.log logs/proxy-*.log
```

### Automated Regression Tests

Build tests that:
- Run Official SDK through proxy (golden output)
- Run Lite SDK through proxy
- Assert logs are identical
- Fail if protocol diverges

---

## Troubleshooting

### Proxy Not Creating Logs

**Problem:** No log files in `tests/research/logs/`

**Solutions:**
1. Check proxy is executable: `chmod +x tests/research/proxy-cli.js`
2. Verify path is absolute: Use `resolve()` or full path
3. Check directory exists: `mkdir -p tests/research/logs`
4. Test proxy directly: `echo '{"test":true}' | ./tests/research/proxy-cli.js --help`

### SDK Not Using Proxy

**Problem:** SDK bypasses proxy, uses real CLI

**Solutions:**
1. Verify `pathToClaudeCodeExecutable` is set
2. Check path is correct (absolute paths work best)
3. Ensure proxy script has Node shebang: `#!/usr/bin/env node`
4. Test detection: Add logging to `detectClaudeBinary()`

### Incomplete Logs

**Problem:** Log stops mid-message or missing output

**Solutions:**
1. Increase timeout in test
2. Check for process crashes (stderr output)
3. Verify proxy forwards signals correctly
4. Add flush to log writes

---

## Related Files

- **Proxy Implementation:** `tests/utils/proxy-cli.js` (permanent utility)
- **Comparison Tests:** `tests/research/compare-with-proxy.ts`
- **Test Scripts:** `tests/research/test-official-proxy.ts`, `test-lite-only.ts`
- **Archived Scripts:** `tests/research/archived/` (historical investigations)
- **Performance Research:** `tests/research/performance/` (performance studies)
- **Case Study:** `docs/research/cache-token-investigation.md`
- **Fix Commit:** Search for "systemPrompt" in git history

---

## Key Takeaways

1. **Proxy CLI is a powerful debugging tool** - Reveals exact protocol behavior
2. **Official SDK is the ground truth** - When in doubt, check what it does
3. **Small details matter** - Missing `systemPrompt: ""` caused 73% cost increase
4. **Cache behavior is sensitive** - Protocol structure affects API caching
5. **Document discoveries** - Future maintainers will thank you

---

## Contributing

Found something new with the proxy? Please:

1. Document the discovery in this file
2. Add test coverage for the behavior
3. Update implementation to match Official SDK
4. Save example logs in `tests/research/logs/examples/`

---

**Last Updated:** 2026-02-02
**Technique Discovered:** 2026-02-02
**Status:** ✅ Active - Use this for any protocol debugging
