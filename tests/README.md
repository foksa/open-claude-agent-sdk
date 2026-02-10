# Tests

## Structure

```
tests/
├── unit/           # Fast tests, no API calls (~6 seconds)
├── integration/    # Real CLI subprocess tests (~60+ seconds)
├── e2e/            # Playwright UI tests (run separately)
├── utils/          # Test utilities (capture-cli, proxy-cli)
├── snapshots/      # Expected NDJSON outputs
└── setup.ts        # Test preload
```

## Running Tests

```bash
# All tests (unit + integration)
bun test

# Unit tests only (fast, no API calls)
bun test tests/unit/

# Integration tests only
bun test tests/integration/

# Specific test file
bun test tests/integration/hooks.test.ts

# E2E tests (Playwright - runs separately)
bunx playwright test
```

## Test Philosophy

**Comparison testing:** Every integration test runs with BOTH open and official SDKs.

| Outcome | Interpretation |
|---------|----------------|
| Both pass | Our SDK works correctly |
| Both fail | Test issue (bad prompt, timeout) |
| Open fails, official passes | **Bug in our SDK** |
| Official fails, open passes | Edge case to investigate |

## Test Types

### Unit Tests (`tests/unit/`)
- No real API calls
- Uses mock capture-cli to compare stdin messages
- Catches protocol drift between open and official SDK

### Integration Tests (`tests/integration/`)
- Spawns real Claude CLI subprocess
- Makes actual API calls (costs money)
- Tests full end-to-end behavior

### E2E Tests (`tests/e2e/`)
- Playwright browser tests
- Tests demo app UI
- Run with `bunx playwright test`
