# Integration Tests

This directory contains integration tests for the Open Claude Agent SDK.

## Test Philosophy

**All tests are comparison tests!** Every test (except UI tests) runs with BOTH SDKs to ensure compatibility.

## Test Files

### Core Comparison Tests (Both SDKs)
These tests run the **exact same test** with both lite and official SDKs:
- `query.test.ts` - Basic query functionality (streaming, plan mode, model selection)
- `multi-turn.test.ts` - Multi-turn conversations and control methods (interrupt, close, setModel)
- `permissions.test.ts` - canUseTool callback functionality (allow/deny, filtering, async)
- `hooks.test.ts` - Hook system (PreToolUse, PostToolUse, UserPromptSubmit, etc.)

Each test runs **twice**:
- `[lite]` prefix - uses our lightweight SDK (`open-claude-agent-sdk`)
- `[official]` prefix - uses official SDK (`@anthropic-ai/claude-agent-sdk`)

This ensures we maintain 100% compatibility with the official SDK.

### UI Tests
- `demo-app.test.ts` - Demo application verification (Playwright tests)

## Why Comparison Tests?

Running with both SDKs tells us:
- ✅ If a test **passes with both**: Our SDK works correctly!
- ❌ If a test **fails with both**: The test itself has an issue
- ⚠️ If a test **fails with lite only**: We have a bug in our SDK
- ⚠️ If a test **fails with official only**: Rare, but good to know

## Running Tests

```bash
# Run all tests (all are comparison tests)
bun test

# Run specific test file
bun test tests/integration/permissions.test.ts

# Run only [lite] tests
bun test -t "\\[lite\\]"

# Run only [official] tests
bun test -t "\\[official\\]"

# Run with watch mode
bun test --watch

# Run with verbose output
bun test --verbose
```

## Test Utilities

- `utils.ts` - Snapshot recording for debugging
- `comparison-utils.ts` - Utilities for running tests with both SDKs

## Test Coverage

✅ **Implemented and Tested:**
- One-shot queries
- Multi-turn conversations (streamInput)
- Streaming output (includePartialMessages)
- Control protocol (interrupt, setPermissionMode, setModel, close)
- Permission callbacks (canUseTool)
- Hook system (PreToolUse, PostToolUse, UserPromptSubmit, Stop)

⚠️ **Phase 0.5 - Validation in Progress:**
- Running all tests with both SDKs to verify compatibility
- Identifying any behavioral differences
- Fixing any bugs discovered

## Snapshot Files

Test snapshots are saved to `tests/snapshots/` for debugging:
- Each snapshot contains the full NDJSON message stream
- Useful for comparing output between test runs
- Automatically created when tests run
