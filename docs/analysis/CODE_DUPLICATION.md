# Code Duplication Analysis Report

## Executive Summary

After extensive analysis of the lite-claude-agent-sdk codebase, several patterns of code duplication were identified across both `src/` and `tests/` directories. The most significant duplications were in the test files, where the same test harness patterns were repeated across multiple files.

**Status: HIGH and MEDIUM priority items have been resolved.**

---

## 1. Resolved: Test Helper Duplication

### 1.1 `testWithBothSDKs` Helper Function - ✅ RESOLVED

**Previously:** 21 copies of `testWithBothSDKs` across test files.

**Solution:** Extracted to `tests/integration/comparison-utils.ts`:
```typescript
export const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

export const testWithBothSDKsTodo = (
  name: string,
  _testFn?: (sdk: SDKType) => Promise<void>
) => {
  describe(name, () => {
    test.todo(`[lite] ${name}`);
    test.todo(`[official] ${name}`);
  });
};
```

All 21 test files now import from `comparison-utils.ts` instead of defining locally.

---

### 1.2 `runWithSDKPermissions` Duplicate - ✅ RESOLVED

**Previously:** `runWithSDK` and `runWithSDKPermissions` were virtually identical functions.

**Solution:** Removed `runWithSDKPermissions`. All callers now use `runWithSDK` with explicit options.

---

## 2. Resolved: Shared Test Utilities

### 2.1 Test Helpers File - ✅ CREATED

**New file:** `tests/integration/test-helpers.ts`

Contains:
- `expectSuccessResult(messages)` - Assert and extract result message
- `extractResult(messages)` - Extract result without assertion
- `normalizeMessage(msg)` - Normalize for comparison
- `DEFAULT_TEST_OPTIONS` - Shared test configuration

---

## 3. Remaining Items (LOW Priority)

### 3.1 Debug Logging Pattern

**Files affected:** QueryImpl.ts, control.ts, argBuilder.ts (15+ occurrences)

**Pattern:**
```typescript
if (process.env.DEBUG_HOOKS) {
  console.error('[DEBUG] Something:', value);
}
```

**Status:** Deferred - low impact, can be addressed if debug logging becomes more complex.

### 3.2 JSON Stdin Write Pattern

**Files affected:** QueryImpl.ts (5 occurrences)

**Pattern:**
```typescript
this.process.stdin?.write(`${JSON.stringify(message)}\n`);
```

**Status:** Deferred - inline is clear and not problematic.

---

## 4. Summary Table

| Category | Status | Resolution |
|----------|--------|------------|
| `testWithBothSDKs` helper | ✅ RESOLVED | Exported from comparison-utils.ts |
| `testWithBothSDKsTodo` helper | ✅ RESOLVED | Exported from comparison-utils.ts |
| `runWithSDKPermissions` duplicate | ✅ RESOLVED | Removed, use runWithSDK |
| `normalizeMessage` | ✅ RESOLVED | In test-helpers.ts |
| `expectSuccessResult` | ✅ RESOLVED | In test-helpers.ts |
| `DEFAULT_TEST_OPTIONS` | ✅ RESOLVED | In test-helpers.ts |
| Debug logging pattern | ⏸️ DEFERRED | Low priority |
| JSON stdin write pattern | ⏸️ DEFERRED | Low priority |

---

## 5. Impact

The refactoring achieved:
- **Removed ~300 lines** of duplicated code from test files
- **Single source of truth** for test harness functions
- **Easier maintenance** - changes in one place
- **Consistent timeout** (60000ms) across all tests
