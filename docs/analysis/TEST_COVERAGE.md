# Test Coverage Analysis

## Executive Summary

The codebase has a solid foundation of integration tests that compare behavior with the official SDK, but there are significant gaps in unit test coverage, error handling tests, and edge case coverage.

---

## 1. Untested Code Paths

### 1.1 QueryImpl.ts - Critical Gaps

| Location | Untested Code | Why It Matters |
|----------|--------------|----------------|
| Line 46-49 | Pre-aborted signal handling | Could cause resource leaks |
| Line 122-124 | `process.stdout` null check | Error path never exercised |
| Line 172-175 | JSON parse error handling | Malformed CLI output could crash |
| Line 200-206 | Error propagation in `notifyWaiters()` | Rejection path untested |
| Line 223-227 | Error throwing in `next()` | Iterator error behavior |
| Line 240-243 | `throw()` method | AsyncGenerator compliance |
| Line 249-251 | `[Symbol.asyncDispose]()` | Resource cleanup |
| Line 289-294 | `setMaxThinkingTokens()` | Never tested |
| Line 329-386 | All unimplemented methods | Throw errors but untested |

### 1.2 control.ts - Zero Direct Tests

| Location | Untested Code |
|----------|--------------|
| Line 67-68 | Default success for unhandled requests |
| Line 69-70 | Error for unknown request types |
| Line 72-74 | Generic error catch |
| Line 131-137 | Missing callback handler |
| Line 150-152 | Hook execution error handling |

### 1.3 parser.ts - Completely Untested!

The entire `parseNDJSON()` function has **zero direct tests**.

---

## 2. Missing Edge Case Tests

### 2.1 Empty/Null Values

| Function | Missing Edge Case |
|----------|------------------|
| `buildCliArgs()` | Empty string for `model` |
| `buildCliArgs()` | `maxTurns: 0` |
| `buildCliArgs()` | `maxBudgetUsd: 0` |
| `buildCliArgs()` | Empty `allowedTools: []` |
| `sendInitialPrompt()` | Empty prompt string |

### 2.2 Error Conditions

| Scenario | Missing Test |
|----------|-------------|
| CLI binary crashes during execution | Process error event handling |
| CLI exits with non-zero code | Exit code error propagation |
| Stdin write fails | Write error handling |
| Process kill fails | Kill error handling |

### 2.3 Special Characters

| Scenario | Missing Test |
|----------|-------------|
| Prompt with newlines | Multi-line handling |
| Prompt with JSON special chars | Escaping |
| System prompt with quotes | Control protocol escaping |

---

## 3. Integration Gaps

### Features Not Tested Together

| Feature Combination | Why It Matters |
|---------------------|----------------|
| `hooks` + `canUseTool` | Both use control protocol |
| `abortController` + `hooks` | Abort during hook execution |
| `resume` + `streamInput()` | Resume with multi-turn |
| `sandbox` + `canUseTool` | Sandboxed with permissions |

---

## 4. Test Organization Issues

| Issue | Impact |
|-------|--------|
| Duplicate `testWithBothSDKs` helper | 9 copies across files |
| Magic timeout numbers | 15000, 30000, 45000, 60000, 90000 |
| No consistent teardown | Potential resource leaks |
| `_testWithBothSDKsSkip` unused | Dead code |

---

## 5. Flaky Test Risks

### Timing-Dependent Tests

| Test | Risk |
|------|------|
| "interrupt() stops query" | 2s timeout vs CLI response |
| "setPermissionMode() changes" | 1s setTimeout |
| "abortController can interrupt" | 500ms abort timing |

### Network/API Dependent

All integration tests depend on Claude API availability.

---

## 6. Priority Test Cases to Add

### High Priority (Core Functionality)
1. **parser.ts unit tests** - 0% coverage
2. **control.ts unit tests** - 0% coverage
3. **Error propagation tests** - How errors flow
4. **QueryImpl lifecycle tests** - Constructor, iteration, cleanup

### Medium Priority (Edge Cases)
5. **Empty/null value handling** in `buildCliArgs()`
6. **Special character handling** in prompts
7. **Concurrent operation tests** - Multiple `streamInput()`
8. **Resource cleanup verification**

### Lower Priority (Robustness)
9. **CLI crash recovery** tests
10. **Timeout behavior** tests
11. **Memory/resource leak** tests

---

## 7. Example Unit Tests Needed

### control.ts Tests

```typescript
describe('ControlProtocolHandler', () => {
  test('allows by default when no canUseTool callback', async () => {
    const mockStdin = { write: vi.fn() };
    const handler = new ControlProtocolHandler(mockStdin as any, {});

    await handler.handleControlRequest({
      type: 'control_request',
      request_id: 'req-123',
      request: {
        subtype: 'can_use_tool',
        tool_name: 'Read',
        input: { file_path: '/test' },
        tool_use_id: 'tu-123',
      }
    });

    expect(mockStdin.write).toHaveBeenCalledWith(
      expect.stringContaining('"behavior":"allow"')
    );
  });

  test('sends error for unknown request type', async () => {
    // ...
  });

  test('handles hook execution errors', async () => {
    // ...
  });
});
```

### parser.ts Tests

```typescript
describe('parseNDJSON', () => {
  test('skips empty lines', async () => { /* ... */ });
  test('handles parse errors gracefully', async () => { /* ... */ });
  test('stops after result message', async () => { /* ... */ });
});
```

---

## 8. Summary

The codebase has good integration test foundations but significant gaps in:

1. **Unit test coverage** - parser.ts and control.ts have 0% direct tests
2. **Error handling** - Happy paths tested, errors untested
3. **Edge cases** - Empty values, special characters, boundaries
4. **Resource cleanup** - No verification of process cleanup
5. **Flaky test risks** - Timing-dependent tests in CI
