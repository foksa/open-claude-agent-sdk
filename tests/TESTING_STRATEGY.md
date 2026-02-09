# Testing Strategy

## Philosophy: Comparison Testing

**Every test runs with BOTH SDKs** to validate compatibility and identify issues clearly.

## Why This Approach?

Running the exact same test with both SDKs tells us:

| Outcome | Interpretation |
|---------|----------------|
| ✅ **Both pass** | Our SDK works correctly! |
| ❌ **Both fail** | The test itself has an issue (bad prompt, timeout, etc.) |
| ⚠️ **Open fails, official passes** | **BUG in our SDK** - needs fixing |
| ⚠️ **Official fails, open passes** | Rare edge case, good to investigate |

This approach eliminates ambiguity: we know immediately if a failure is our fault or a test issue.

## Test Structure

### Test Count
- **Demo app:** 3 UI tests (Playwright)
- **Comparison tests:** 29 test cases × 2 SDKs = **58 test executions**

Total: **61 test executions**

### Test Files

#### Comparison Tests (Both SDKs)
Each test case runs twice with `[open]` and `[official]` prefixes:

- **query.test.ts** (5 tests × 2 = 10 executions)
  - Basic hello world query
  - Streaming with includePartialMessages
  - Plan mode
  - Custom model
  - Structure comparison

- **multi-turn.test.ts** (7 tests × 2 = 14 executions)
  - Multi-turn conversation via streamInput
  - interrupt() stops execution
  - close() terminates query
  - setPermissionMode() changes permissions
  - setModel() changes model
  - AsyncGenerator interface validation
  - Structure comparison

- **permissions.test.ts** (8 tests × 2 = 16 executions)
  - canUseTool callback allows execution
  - canUseTool callback denies execution
  - Callback receives correct parameters
  - Selective tool filtering
  - No callback defaults to allow
  - Async operations
  - Permission updates
  - Permission suggestions

- **hooks.test.ts** (9 tests × 2 = 18 executions)
  - PreToolUse hook called before execution
  - PostToolUse hook called after execution
  - Hooks receive correct input data
  - Hook can cancel tool execution
  - UserPromptSubmit hook called
  - Stop hook called
  - Multiple hooks for same event
  - Tool name matcher filtering
  - Async hook operations

#### UI Tests
- **demo-app.test.ts** (3 tests)
  - Demo app loads and shows UI
  - Demo app sends query to both SDKs
  - Demo app continues conversation

## Running Tests

```bash
# Run all tests
bun test

# Run specific feature
bun test tests/integration/permissions.test.ts

# Run only [open] tests (our SDK)
bun test -t "\\[open\\]"

# Run only [official] tests (official SDK)
bun test -t "\\[official\\]"

# Watch mode
bun test --watch

# Verbose output
bun test --verbose
```

## Test Utilities

- **comparison-utils.ts** - Helper to run tests with both SDKs
  - `runWithSDK()` - Run query with specific SDK
  - `runWithBothSDKs()` - Run with both and compare
  - `compareMessageStructures()` - Compare message flow

- **utils.ts** - Snapshot recording for debugging
  - Records full NDJSON message streams
  - Saved to `tests/snapshots/` for inspection

## Coverage

✅ **Implemented and Tested:**
- One-shot queries
- Multi-turn conversations (streamInput)
- Streaming output (includePartialMessages)
- Control protocol (interrupt, setPermissionMode, setModel, close)
- Permission callbacks (canUseTool)
- Hook system (PreToolUse, PostToolUse, UserPromptSubmit, Stop)
- AsyncGenerator interface
- Plan mode
- Model selection

⚠️ **Phase 0.5 Status:**
- All features have code implementation
- All features have comparison tests
- **Ready to run validation**

## Next Steps

1. **Run all tests:** `bun test`
2. **Identify failures:** Check if [open] or [official] or both fail
3. **Fix bugs:** Address any [open]-only failures
4. **Document findings:** Update test snapshots and fix flaky tests
5. **Mark Phase 0.5 complete:** Once all tests pass with both SDKs

## Success Criteria

Phase 0.5 validation is complete when:
- [ ] All comparison tests pass with both SDKs
- [ ] No [open]-only failures (compatibility achieved)
- [ ] Bundle size stays < 500KB
- [ ] Documentation updated with findings
