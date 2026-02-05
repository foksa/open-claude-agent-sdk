# Code Duplication Analysis Report

## Executive Summary

After extensive analysis of the lite-claude-agent-sdk codebase, several patterns of code duplication were identified across both `src/` and `tests/` directories. The most significant duplications are in the test files, where the same test harness patterns are repeated across multiple files.

---

## 1. Exact Duplicates

### 1.1 `testWithBothSDKs` Helper Function - **CRITICAL**

**Files affected (9 copies):**
- `tests/integration/query.test.ts:11-20`
- `tests/integration/multi-turn.test.ts:11-21`
- `tests/integration/permissions.test.ts:17-27`
- `tests/integration/hooks.test.ts:11-21`
- `tests/integration/system-prompt.test.ts:10-20`
- `tests/integration/setting-sources.test.ts:10-20`
- `tests/integration/abort.test.ts:60-69`
- `tests/integration/resume.test.ts:11-20`
- `tests/integration/sandbox.test.ts:15-24`

**Duplicated code:**
```typescript
const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 45000
) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};
```

**Why it's problematic:**
- 9 copies of essentially the same function
- Default timeout varies between files (45000, 60000)
- Changes need to be made in 9 places

**Suggested refactor - create shared test utility:**
```typescript
// tests/integration/test-helpers.ts
export type SDKType = 'lite' | 'official';

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
```

---

### 1.2 `runWithSDK` vs `runWithSDKPermissions` - Identical Functions

**File:** `tests/integration/comparison-utils.ts:49-75` and `81-105`

These two functions are **virtually identical** - the only conceptual difference is naming.

**Suggested refactor:** Remove `runWithSDKPermissions` and use only `runWithSDK`.

---

## 2. Near Duplicates

### 2.1 Test Options Pattern

**Files affected:**
- `tests/integration/comparison-utils.ts:61-66`
- `tests/integration/comparison-utils.ts:91-96`
- `tests/integration/abort.test.ts:22-28`

**Pattern:**
```typescript
const testOptions: Options = {
  model: 'haiku',
  settingSources: [],
  pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
  ...options,
};
```

**Suggested refactor:**
```typescript
export const DEFAULT_TEST_OPTIONS: Options = {
  model: 'haiku',
  settingSources: [],
  pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
};
```

---

### 2.2 `normalizeMessage` Function

**Files affected:**
- `tests/unit/sdk-compatibility.test.ts:90-117`
- `tests/integration/protocol-comparison.test.ts:89-105`

**Suggested refactor:** Move to shared utility `tests/utils/message-utils.ts`.

---

## 3. Pattern Duplicates

### 3.1 Result Extraction Pattern in Tests

Appears dozens of times:
```typescript
const result = messages.find((m) => m.type === 'result');
expect(result).toBeTruthy();
if (result && result.type === 'result') {
  expect(result.subtype).toBe('success');
}
```

**Suggested helper:**
```typescript
export function expectSuccessResult(messages: SDKMessage[]) {
  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }
  return result;
}
```

### 3.2 Debug Logging Pattern

**Files affected:** QueryImpl.ts, control.ts, spawn.ts (15+ occurrences)

**Pattern:**
```typescript
if (process.env.DEBUG_HOOKS) {
  console.error('[DEBUG] Something:', value);
}
```

**Suggested refactor - create debug utility:**
```typescript
// src/core/debug.ts
type DebugCategory = 'hooks' | 'control' | 'spawn' | 'protocol';

export const debugHooks = (msg: string, ...args: any[]) => {
  if (process.env.DEBUG_HOOKS) {
    console.error(`[DEBUG:hooks] ${msg}`, ...args);
  }
};
```

### 3.3 JSON Stdin Write Pattern

**Files affected:** QueryImpl.ts (5 occurrences)

**Pattern:**
```typescript
this.process.stdin?.write(`${JSON.stringify(message)}\n`);
```

**Suggested helper:**
```typescript
private writeMessage(message: unknown): void {
  this.process.stdin?.write(`${JSON.stringify(message)}\n`);
}
```

---

## 4. Summary Table

| Category | Count | Severity | Files Affected |
|----------|-------|----------|----------------|
| `testWithBothSDKs` helper | 9 copies | **HIGH** | 9 test files |
| `runWithSDK` vs `runWithSDKPermissions` | 2 identical | **HIGH** | comparison-utils.ts |
| Test options pattern | 3+ copies | **MEDIUM** | comparison-utils.ts, abort.test.ts |
| Result extraction pattern | 10+ copies | **MEDIUM** | All integration tests |
| Debug logging pattern | 15+ copies | **LOW** | QueryImpl.ts, control.ts, spawn.ts |
| `normalizeMessage` | 2 copies | **MEDIUM** | sdk-compatibility.test.ts, protocol-comparison.test.ts |

---

## 5. Recommended Actions

### HIGH Priority
1. **Extract `testWithBothSDKs` to shared test utility** - Eliminates 9 duplicate functions
2. **Merge `runWithSDK` and `runWithSDKPermissions`** - Removes duplicate implementation

### MEDIUM Priority
3. **Create `DEFAULT_TEST_OPTIONS` constant**
4. **Extract `normalizeMessage` to shared utility**
5. **Add `expectSuccessResult` helper**

### LOW Priority
6. **Create debug logging utility**
7. **Extract `writeMessage` helper in QueryImpl**

---

## 6. Estimated Impact

Implementing all recommendations would:
- **Remove ~300+ lines** of duplicated code
- **Reduce test file complexity** significantly
- **Improve maintainability** - changes in one place
- **Reduce risk of drift** - shared utilities ensure consistency
