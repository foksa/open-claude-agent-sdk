# Comparison Utilities

Specialized scripts for comparing specific aspects of SDK behavior.

---

## Purpose

These utilities compare detailed implementation aspects between Official SDK and Lite SDK.

---

## Scripts

### compare-system-init.ts

**Purpose:** Compare the `system:init` messages from both SDKs.

**What it checks:**
- Tool counts
- Tool lists (order and names)
- Message fields
- Session IDs
- CWD paths

**Usage:**
```bash
bun tests/research/comparisons/compare-system-init.ts
```

**Expected output:**
```
✅ Same number of tools (18)
✅ Tool list is identical
✅ Same fields in both
```

**When to use:**
- After modifying spawn.ts or detection.ts
- When tool lists might differ
- Debugging CLI configuration issues

---

### compare-stdin-messages.ts

**Purpose:** Compare all stdin messages sent by both SDKs.

**What it checks:**
- Number of messages
- Message types
- Message structure
- Field differences

**Usage:**
```bash
bun tests/research/comparisons/compare-stdin-messages.ts
```

**Note:** This script attempts monkey-patching but is less reliable than the proxy CLI technique. Consider using `tests/utils/proxy-cli.js` instead for more accurate results.

**When to use:**
- Quick sanity check of message format
- Debugging message structure issues
- When proxy CLI is overkill

---

## vs Proxy CLI

### Use these scripts when:
- ✅ You need a quick comparison
- ✅ You're checking a specific aspect
- ✅ You want automated analysis

### Use proxy CLI when:
- ✅ You need complete message logs
- ✅ Timing/ordering matters
- ✅ You want to save logs for later analysis
- ✅ You're investigating a cost/performance issue

**Proxy CLI path:** `tests/utils/proxy-cli.js`

---

## Related

- **Proxy CLI:** `tests/utils/proxy-cli.js` (more comprehensive)
- **Full Comparisons:** `../sdk-comparison.ts`, `../multi-turn-comparison.ts`
- **Methodology:** `docs/guides/REVERSE_ENGINEERING.md`
