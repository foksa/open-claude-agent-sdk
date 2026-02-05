# Test Coverage Analysis

## Executive Summary

The codebase has a solid foundation of integration tests that compare behavior with the official SDK. Recent improvements have added unit tests for control.ts and QueryImpl AsyncGenerator methods, and removed dead code from test files.

---

## Resolved Issues

The following issues have been addressed:

| Issue | Status | Resolution |
|-------|--------|------------|
| parser.ts untested | **Resolved** | File deleted in PR #6 (architecture refactor) |
| Duplicate `testWithBothSDKs` helper | **Resolved** | Fixed in PR #7 - centralized in comparison-utils.ts |
| `_testWithBothSDKsSkip` unused dead code | **Resolved** | Removed from 5 test files |
| control.ts 0% coverage | **Resolved** | Added tests/unit/control.test.ts with 13 test cases |
| QueryImpl throw()/return() untested | **Resolved** | Added tests/unit/query-impl.test.ts with 4 test cases |

---

## 1. Remaining Untested Code Paths

### 1.1 QueryImpl.ts - Some Gaps Remain

| Location | Untested Code | Why It Matters |
|----------|--------------|----------------|
| Line 46-49 | Pre-aborted signal handling | Could cause resource leaks |
| Line 289-294 | `setMaxThinkingTokens()` | Never tested |
| Line 329-386 | All unimplemented methods | Throw errors but untested |

### 1.2 control.ts - Now Has Unit Tests

The control.ts module now has comprehensive unit tests covering:
- Unknown request type error handling
- canUseTool default allow behavior
- canUseTool callback invocation
- canUseTool callback error handling
- Hook callback not found (default continue)
- Hook callback execution
- Hook callback error handling
- Initialize/interrupt acknowledgment
- SDK-to-CLI request passthrough
- registerCallback functionality

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

## 4. Test Organization - Current State

| Item | Status |
|------|--------|
| `testWithBothSDKs` helper | Centralized in comparison-utils.ts |
| `_testWithBothSDKsSkip` dead code | Removed |
| Magic timeout numbers | Still present (15000, 30000, 45000, 60000, 90000) |
| No consistent teardown | Potential resource leaks |

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
1. ~~**parser.ts unit tests**~~ - File deleted
2. ~~**control.ts unit tests**~~ - Added (13 tests)
3. **Error propagation tests** - How errors flow
4. ~~**QueryImpl lifecycle tests**~~ - Added (4 tests)

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

## 7. Current Test Coverage Summary

### Unit Tests

| Module | Tests | Coverage |
|--------|-------|----------|
| tests/unit/control.test.ts | 13 | ~80% of control.ts |
| tests/unit/detection.test.ts | 4 | CLI detection |
| tests/unit/spawn.test.ts | 5 | Process spawning |
| tests/unit/message-queue.test.ts | 8 | Message queue |
| tests/unit/message-router.test.ts | 6 | Message routing |
| tests/unit/process-factory.test.ts | 3 | Process factory |
| tests/unit/sandbox.test.ts | 4 | Sandbox mode |
| tests/unit/sdk-compatibility.test.ts | 6 | SDK arg compatibility |
| tests/unit/index.test.ts | 3 | Exports |

### Integration Tests

| Module | Tests | Notes |
|--------|-------|-------|
| tests/integration/query-impl.test.ts | 4 | AsyncGenerator methods |
| tests/integration/basic.test.ts | 4 | Core query functionality |
| tests/integration/hooks.test.ts | 10 | Hook system |
| tests/integration/permissions.test.ts | 7 | canUseTool callback |
| tests/integration/control-methods.test.ts | 8 | Control protocol methods |
| tests/integration/resume.test.ts | 6 | Session resume |
| tests/integration/multi-turn.test.ts | 6 | Multi-turn conversations |
| tests/integration/streaming-input.test.ts | 4 | Streaming input |
| tests/integration/unimplemented-*.test.ts | Many | Todo/documentation tests |

---

## 8. Summary

The codebase now has significantly improved test coverage:

1. **Unit test coverage** - control.ts and QueryImpl now have direct tests
2. **Dead code removed** - _testWithBothSDKsSkip removed from 5 files
3. **Test helper centralized** - testWithBothSDKs in one location

Remaining gaps to address:
1. **Edge cases** - Empty values, special characters, boundaries
2. **Error handling** - Some error paths still untested
3. **Resource cleanup** - No verification of process cleanup
4. **Flaky test risks** - Timing-dependent tests in CI
