# Remaining TODOs

Consolidated from `docs/analysis/` (now deleted).

---

## OSS Readiness

- [ ] README badges (npm version, CI status, license)
- [ ] CHANGELOG.md
- [ ] CODE_OF_CONDUCT.md
- [ ] SECURITY.md
- [ ] Release workflow (GitHub Actions for npm publishing)
- [ ] Integration tests in CI
- [ ] Custom error classes (e.g., `ClaudeCLINotFoundError`)

## Code Style

- [ ] Remove placeholder files `src/tools/index.ts` and `src/mcp/index.ts` (or add real content)
- [ ] Replace remaining `any` types with proper types (see biome warnings)
- [ ] Add JSDoc to AsyncIterator methods in QueryImpl
- [ ] Standardize TODO comment format

## Test Coverage

### Edge Cases
- [ ] Empty/null values in `buildCliArgs()` (empty model, maxTurns: 0, empty allowedTools)
- [ ] Special character handling in prompts (newlines, JSON chars, quotes)

### Error Handling
- [ ] CLI crash recovery
- [ ] Exit code error propagation
- [ ] Stdin write failure handling

### Integration Gaps
- [ ] `hooks` + `canUseTool` together
- [ ] `abortController` + `hooks`
- [ ] `resume` + `streamInput()`
- [ ] Resource cleanup verification

### Test Infrastructure
- [ ] Consistent timeout constants (currently magic numbers: 15000, 30000, 45000, 60000, 90000)
- [ ] Teardown for resource leak prevention

## Low Priority (Deferred)

- [ ] Debug logging helper (currently inline `if (process.env.DEBUG_HOOKS)` pattern)
- [ ] Node.js compatibility (currently Bun-only)
