# Documentation Corrections

**Date:** 2026-02-02
**Issue:** canUseTool and hooks marked as "complete" but lack tests

---

## Problem Identified

User correctly identified that `canUseTool` and `hooks` are marked as ✅ **complete** in documentation, but:

1. **Code exists** in `src/core/control.ts` ✅
2. **No integration tests** exist ❌
3. **Not verified to work** ❌

---

## What Exists

### Code Implementation ✅

**File:** `src/core/control.ts`

```typescript
// Line 63-89: canUseTool handler
private async handleCanUseTool(req: ControlRequest) {
  if (!this.options.canUseTool) {
    this.sendSuccess(req.request_id, { behavior: 'allow' });
    return;
  }

  const result: PermissionResult = await this.options.canUseTool(
    tool_name,
    input,
    { signal, suggestions, blockedPath, ... }
  );

  this.sendSuccess(req.request_id, result);
}

// Line 94-134: Hook handler
private async handleHookCallback(req: ControlRequest) {
  if (!this.options.hooks) {
    this.sendSuccess(req.request_id, { continue: true });
    return;
  }

  const hookEvent = input.hook_event_name;
  const matchingHooks = this.options.hooks[hookEvent];

  for (const hookMatcher of matchingHooks) {
    for (const hookFn of hookMatcher.hooks) {
      const result = await hookFn(input, tool_use_id, { signal });
      this.sendSuccess(req.request_id, result);
      return;
    }
  }
}
```

**Status:** Code exists and looks reasonable ✅

---

## What's Missing

### Integration Tests ❌

**Searched:**
```bash
grep -r "canUseTool\|hooks" tests/integration/ --include="*.ts"
# Result: No matches

grep -l "canUseTool\|hooks" test-*.ts
# Result: No matches (these were scratch files, moved to tests/scratch/)
```

**Note:** The `test-*.ts` files in project root were development scratch files, not real tests. Moved to `tests/scratch/` for cleanup.

**Expected tests:**
```typescript
// tests/integration/permissions.test.ts (MISSING)
test('canUseTool - allows tool execution', async () => {
  let toolCalled = '';

  for await (const msg of query({
    prompt: 'List files',
    options: {
      canUseTool: async (toolName, input) => {
        toolCalled = toolName;
        return { behavior: 'allow' };
      }
    }
  })) {
    // ...
  }

  expect(toolCalled).toBe('Bash');
});

// tests/integration/hooks.test.ts (MISSING)
test('hooks - PreToolUse called', async () => {
  let preToolUseCalled = false;

  for await (const msg of query({
    prompt: 'Do something',
    options: {
      hooks: {
        PreToolUse: async (input) => {
          preToolUseCalled = true;
          return { behavior: 'allow' };
        }
      }
    }
  })) {
    // ...
  }

  expect(preToolUseCalled).toBe(true);
});
```

---

## Corrections Made

### 1. README.md

**Before:**
```markdown
✅ **Permission callbacks** - `canUseTool` callback support
✅ **Hook system** - PreToolUse, PostToolUse, etc.
```

**After:**
```markdown
⚠️ **Permission callbacks** - `canUseTool` code exists (needs tests)
⚠️ **Hook system** - PreToolUse, PostToolUse code exists (needs tests)
```

### 2. docs/planning/FEATURES.md

**Before:**
```markdown
| canUseTool | ✅ | ✅ | - | Complete |
| hooks | ✅ | ✅ | - | Complete |
```

**After:**
```markdown
| canUseTool | ⚠️ Code exists, untested | ✅ | MEDIUM | Needs tests |
| hooks | ⚠️ Code exists, untested | ✅ | MEDIUM | Needs tests |
```

**Hook Events Before:**
```markdown
| **Implemented** |
| `PreToolUse` | ✅ | ✅ | ... |
| `PostToolUse` | ✅ | ✅ | ... |
```

**Hook Events After:**
```markdown
| **Code Exists (Untested)** |
| `PreToolUse` | ⚠️ | ✅ | ... |
| `PostToolUse` | ⚠️ | ✅ | ... |
```

---

## Recommended Next Steps

### Phase 0.5: Validation (2-3 days)

Before implementing Phase 1, validate existing code:

1. **Test canUseTool** (1 day)
   - Create `tests/integration/permissions.test.ts`
   - Test allow behavior
   - Test deny behavior
   - Test permission suggestions
   - Test with different tools

2. **Test hooks** (1 day)
   - Create `tests/integration/hooks.test.ts`
   - Test PreToolUse
   - Test PostToolUse
   - Test UserPromptSubmit
   - Test Stop hook

3. **Fix any bugs found** (0.5-1 day)
   - Update control.ts if needed
   - Ensure proper error handling
   - Verify CLI communication

**Total:** 2-3 days to validate existing code

---

## Updated Implementation Priority

### NEW Phase 0.5: Validate Existing (2-3 days) ⚠️ CRITICAL

**Before Phase 1, we must:**
1. ✅ Test canUseTool callback (1 day)
2. ✅ Test hook system (1 day)
3. ✅ Fix any bugs (0.5-1 day)

### Phase 1: Production Features (1-2 weeks)

1. Structured Outputs (2-3 days)
2. Extended Thinking (1 day)
3. Skills & Commands (2-3 days)
4. Budget Tracking (2-3 days)

---

## Lesson Learned

**Don't mark features as ✅ complete without:**
1. Integration tests ✅
2. Manual testing ✅
3. Verified working ✅

**Better status markers:**
- ✅ **Complete** - Code + tests + verified
- ⚠️ **Partial** - Code exists, needs tests
- 🚧 **In Progress** - Actively being worked on
- ❌ **Not Implemented** - No code exists

---

## Current Accurate Status

### Baby Steps 1-5 Status

| Feature | Status | Evidence |
|---------|--------|----------|
| One-shot queries | ✅ Complete | Tests in query.test.ts |
| Multi-turn conversations | ✅ Complete | Tests in multi-turn.test.ts |
| Streaming output | ✅ Complete | Tests verify includePartialMessages |
| Control protocol | ✅ Complete | QueryImpl handles stdin/stdout |
| Control methods | ✅ Complete | interrupt(), setModel(), etc. exist |
| **canUseTool callback** | **⚠️ Untested** | **Code exists, no tests** |
| **Hook system** | **⚠️ Untested** | **Code exists, no tests** |

---

## Action Items

- [ ] Create `tests/integration/permissions.test.ts`
- [ ] Create `tests/integration/hooks.test.ts`
- [ ] Run tests and verify all pass
- [ ] Fix any bugs discovered
- [ ] Update status to ✅ only after tests pass
- [ ] Add Phase 0.5 to ROADMAP.md

---

**Conclusion:** Good catch! Code exists but needs validation before claiming "complete" status.

**Next:** Phase 0.5 (Validation) before Phase 1 (New Features)
