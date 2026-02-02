# Scratch Test Files

**Purpose:** Development/debugging test files - not part of the official test suite

---

## What's Here

These are **scratch files** used during development for quick testing and debugging. They are **not** integration tests and should not be relied upon.

### Files

| File | Purpose |
|------|---------|
| `test-async-iterable.ts` | Manual test for AsyncIterable input |
| `test-multi-turn.ts` | Compare Lite vs Official SDK multi-turn |
| `test-official-loop.ts` | Debug Official SDK loop behavior |
| `test-query-debug.ts` | Debug query implementation |
| `test-query.ts` | Quick query verification |
| `test-spawn-simple.ts` | Test CLI spawn basics |
| `test-spawn-stderr.ts` | Test stderr handling |
| `test-streaming.ts` | Test streaming behavior |

---

## How to Use

**Run a scratch file:**
```bash
bun tests/scratch/test-query.ts
```

**Warning:** These are not automated tests. They may:
- Require manual verification
- Make actual API calls
- Not have assertions
- Be outdated

---

## Real Tests

For the **official test suite**, see:
- `tests/integration/` - Integration tests (automated)
- `tests/unit/` - Unit tests (if any)
- `tests/e2e/` - End-to-end tests (Playwright)

Run official tests:
```bash
bun test tests/integration/
```

---

## Should I Add Tests Here?

**No!**

For new tests:
1. **Integration tests** → `tests/integration/`
2. **Unit tests** → `tests/unit/`
3. **E2E tests** → `tests/e2e/`

This folder is only for **temporary scratch work**.

---

## Cleanup

These files can be deleted at any time without breaking anything. They're kept for reference during development.
