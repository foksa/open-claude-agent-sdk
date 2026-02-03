# Archived Research Scripts

Historical one-off investigations and debugging scripts.

---

## Purpose

These scripts were used during development to investigate specific issues. They're kept for historical reference but are not actively maintained.

---

## Contents

### CLI & Protocol Investigation

**check-cli-args.ts**
- Shows what CLI arguments our SDK builds
- Used to verify spawn.ts logic
- Status: Superseded by integration tests

**debug-stdin.ts**
- Monitors stdin messages being sent to CLI
- One-off debugging script
- Status: Superseded by proxy CLI technique

**inspect-messages.ts**
- Direct CLI spawn with stdin/stdout monitoring
- Early debugging attempt
- Status: Superseded by proxy CLI

**trace-api-calls.ts**
- Attempted to trace API calls using monkey-patching
- Didn't work reliably
- Status: Superseded by proxy CLI (which worked!)

### Feature Testing

**test-session-persistence.ts**
- Tests if `--no-session-persistence` flag affects caching
- Result: No significant effect
- Status: Confirmed flag doesn't impact cost

---

## Why Archived?

These scripts served their purpose during investigation but are no longer needed because:

1. **Proxy CLI is better** - The `tests/utils/proxy-cli.js` technique replaced most of these
2. **Questions answered** - The investigations concluded with clear findings
3. **Integration tests cover it** - Regular tests now verify the behavior
4. **Not reusable** - Too specific to one-time investigations

---

## If You Need Them

These scripts still work but may need path updates. If you're investigating a similar issue:

1. Check `tests/utils/proxy-cli.js` first (usually better)
2. Read the case study in `docs/research/cache-token-investigation.md`
3. Use these as reference if proxy doesn't work for your case

---

## Related

- **Active Tools:** `tests/utils/`
- **Active Research:** `tests/research/` (main directory)
- **Performance Studies:** `../performance/`
- **Methodology:** `docs/guides/REVERSE_ENGINEERING.md`
