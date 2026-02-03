# Cache Token Investigation

**Date:** 2026-02-02
**Status:** ✅ RESOLVED

---

## Executive Summary

Lite SDK was using **~3300 more cache tokens per turn** than Official SDK, resulting in **73% higher cost** over multi-turn conversations.

**ROOT CAUSE:** Missing `systemPrompt: ""` field in control protocol initialization.

**SOLUTION:** Always send control_request with `systemPrompt: ""` before first user message.

**RESULT:** Cost parity achieved - Lite SDK is now 1.8% CHEAPER than Official SDK!

---

## Test Results

### Single Turn Comparison

| SDK | CLI Type | Cache Tokens | Difference |
|-----|----------|--------------|------------|
| Official | Embedded | 15,845 | baseline |
| Lite | Embedded | 19,175 | **+3,330** |
| Official | Local | 15,845 | baseline |
| Lite | Local | 19,175 | **+3,330** |

**Finding:** Difference is identical regardless of CLI type.

### Multi-Turn Comparison (5 turns)

| Metric | Official | Lite | Difference |
|--------|----------|------|------------|
| Total Cost | $0.0295 | $0.0510 | **+73%** |
| Avg Cache/Turn | 15,892 | 19,176 | **+3,284** |
| Total Time | 6,013ms | 6,811ms | +13% |

**Finding:** Cache difference accumulates linearly - **+~3,300 tokens per turn**.

---

## What We've Ruled Out

### ✅ CLI Configuration
- Same embedded CLI binary used by both SDKs
- Same CLI args: `--print`, `--output-format stream-json`, etc.
- Same `--setting-sources ""` (no user config)
- `--no-session-persistence` flag has no effect

### ✅ Tool Definitions
- system:init messages are **byte-for-byte identical**
- Both SDKs load 18 tools
- Tool list is identical
- Message fields are identical (818 chars each)

### ✅ stdin Messages
- Both send same message format
- `session_id: ''` (let CLI fill it in)
- `parent_tool_use_id: null`
- Message structure is correct

---

## Hypothesis

The ~3,300 token difference matches the size of tool definitions in the system prompt. This suggests:

**Official SDK hits a cache that includes tools; Lite SDK misses that cache.**

Possible causes:
1. **Cache key generation** - Something subtle in API request structure affects cache key
2. **Session management** - Different session IDs or metadata
3. **Timing** - Order or timing of stdin messages affects caching
4. **Unknown CLI behavior** - Official SDK may use undocumented CLI features

---

## Cache Token Breakdown

From test results:

```
Official SDK:
- Cache creation: 0-425 tokens (first turn)
- Cache read: 15,430-15,985 tokens (grows with context)
- Total: ~15,850 tokens/turn

Lite SDK:
- Cache creation: 0-3,665 tokens (first turn creates extra cache)
- Cache read: 15,430-19,199 tokens (grows with context)
- Total: ~19,150 tokens/turn

Difference: ~3,300 tokens = size of tool definitions
```

**Hypothesis:** Tool definitions (~3,300 tokens) are cached for Official but re-read for Lite.

---

## Cost Impact

### Per Turn
- **Official:** ~$0.0017-0.0059/turn
- **Lite:** ~$0.0062-0.0142/turn
- **Difference:** ~73% more expensive

### Scaled
| Queries | Official | Lite | Extra Cost |
|---------|----------|------|------------|
| 10 | $0.06 | $0.10 | +$0.04 |
| 100 | $0.59 | $1.02 | +$0.43 |
| 1,000 | $5.90 | $10.20 | +$4.30 |

---

## Test Scripts

All tests use:
- Model: `haiku`
- `settingSources: []` (isolated)
- `pathToClaudeCodeExecutable`: embedded CLI
- `permissionMode: bypassPermissions`

### Comparison Scripts

1. **sdk-comparison.ts** - Single-turn comparison
2. **multi-turn-comparison.ts** - 5-turn conversation
3. **multi-turn-cli-comparison.ts** - Tests both CLI types
4. **test-session-persistence.ts** - Tests --no-session-persistence flag
5. **compare-system-init.ts** - Compares system:init messages

All scripts are in `tests/research/`.

---

## Next Steps

### Immediate
1. ❓ Check if Official SDK passes `session_id` differently
2. ❓ Examine Official SDK's actual subprocess communication
3. ❓ Test with `--strict-mcp-config` flag
4. ❓ Compare actual API request payloads (if possible)

### If Root Cause Found
- Implement fix in Lite SDK
- Re-run all comparison tests
- Update benchmarks

### If Root Cause Unknown
- Document limitation clearly
- Consider if 73% cost premium is acceptable
- May need to accept this as inherent difference

---

## Impact Assessment

**Is this acceptable?**

❌ **No** - 73% cost difference is significant:
- Makes Lite SDK non-competitive for high-volume use
- Negates the benefit of 65x smaller bundle
- Cost matters more than bundle size for production

**Blocking issues:**
- Multi-turn conversations become expensive quickly
- Production agents with 100+ turns/day see major cost increase
- Hard to recommend Lite SDK over Official SDK

**Priority:** **CRITICAL** - Must resolve before v1.0

---

## Questions for Anthropic

If we cannot find root cause:

1. Does Official SDK use any special API parameters for caching?
2. Is there a CLI flag that affects prompt caching behavior?
3. Could session_id format affect cache key generation?
4. Are there undocumented CLI features Official SDK uses?

---

## Resolution

### Discovery Method

**Proxy CLI Technique** - Created `tests/research/proxy-cli.js` that intercepts all stdin/stdout between SDK and CLI.

By running both SDKs through the proxy, we discovered Official SDK sends:

```json
{
  "type": "control_request",
  "request_id": "x4nc60o3peb",
  "request": {
    "subtype": "initialize",
    "systemPrompt": ""    ← This field was missing in Lite SDK!
  }
}
```

### The Fix

**File:** `src/api/QueryImpl.ts:55-56`

**Before:**
```typescript
if (options.hooks || options.canUseTool) {
  this.sendControlProtocolInit(options);
}
```

**After:**
```typescript
// ALWAYS send control protocol initialization
// Official SDK sends this even without hooks/canUseTool - affects caching!
this.sendControlProtocolInit(options);
```

**File:** `src/api/QueryImpl.ts:360-362`

**Before:**
```typescript
request: {
  subtype: 'initialize'
}
```

**After:**
```typescript
request: {
  subtype: 'initialize',
  systemPrompt: ''  // Official SDK always sends this
}
```

### Results After Fix

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| **Cost per 5 turns** | $0.051 | $0.027 | **-47%** 🎉 |
| **Cache tokens/turn** | +3,300 | +1 | **-99.97%** ✅ |
| **Time difference** | +13% | -0.5% | **Faster!** ⚡ |
| **Verdict** | ❌ Not viable | ✅ **Full parity** | **FIXED** |

**Multi-turn test (5 turns):**
```
Official: $0.0270 (79,703 cache tokens)
Lite:     $0.0265 (79,707 cache tokens)
Difference: -1.8% (Lite is CHEAPER!)
```

---

## Conclusion

✅ **RESOLVED** - Lite SDK now has full cost and performance parity with Official SDK.

The proxy CLI technique proved essential for discovering this subtle protocol requirement. Without the ability to intercept and compare exact messages, this would have been nearly impossible to debug.

**Key Lesson:** When implementing protocol-based systems, always validate against reference implementation by intercepting actual messages, not just relying on documentation.

**Status:** ✅ Fixed
**Priority:** Resolved
**Technique:** Proxy CLI reverse engineering

---

**Last Updated:** 2026-02-02
**Test Results:** `tests/research/` directory
**Related:** `docs/guides/REVERSE_ENGINEERING.md` (full technique guide)
**Proxy CLI:** `tests/research/proxy-cli.js`
