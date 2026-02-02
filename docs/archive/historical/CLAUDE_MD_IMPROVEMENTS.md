# CLAUDE.md Improvements

**Date:** 2026-02-02
**Reference:** https://www.hlyr.dev/blog/writing-a-good-claude-md

---

## Problem with Old CLAUDE.md

**Before:** Generic Bun tutorial (107 lines)
- Generic Bun commands (use bun instead of node)
- Bun API examples (Bun.serve, bun:sqlite, etc.)
- Frontend setup examples
- **Zero project-specific context**

**Issues:**
- ❌ Didn't explain WHAT this project is
- ❌ Didn't explain WHY we're building it
- ❌ Didn't explain HOW to work on it
- ❌ Just generic Bun documentation
- ❌ No codebase structure
- ❌ No current status

---

## Best Practices Applied

Based on https://www.hlyr.dev/blog/writing-a-good-claude-md:

### 1. ✅ Included WHAT, WHY, HOW

**WHAT:** Project purpose and structure
```markdown
**Goal:** 65x smaller alternative to official SDK
**Strategy:** Thin wrapper around Claude CLI subprocess
**Not:** Reimplementation of CLI tools
```

**WHY:** Architectural decisions
```markdown
We re-use local Claude binary instead of embedding it.
This is our #1 differentiator: < 500KB bundle size.
```

**HOW:** Work procedures
```markdown
- Integration tests are primary
- No mocking - test real CLI behavior
- Update docs/planning/FEATURES.md for new features
```

### 2. ✅ Less Is More (122 lines < 300)

Focused only on universally relevant guidelines:
- Project structure (always relevant)
- Current status (always relevant)
- Key constraints (always relevant)
- Testing philosophy (always relevant)

**Removed:** Generic Bun tutorial (irrelevant to project-specific work)

### 3. ✅ Progressive Disclosure

Instead of embedding everything, pointed to docs:
```markdown
**Next:** Phase 0.5 then Phase 1
- See docs/planning/ROADMAP.md for timeline
- See docs/planning/FEATURES.md for status

For more context, see docs/README.md
```

### 4. ✅ Avoided Anti-Patterns

**Don't use Claude as linter:**
```markdown
**Already handled by Biome** - we run biome check in CI.
Don't repeat style rules here.
```

**Don't include all commands:**
- Only included 3 essential commands (test, run, typecheck)
- Removed 20+ generic Bun commands

**Don't add workarounds:**
- Focused on universal guidelines
- No task-specific instructions

### 5. ✅ Strategic Positioning

**Critical info at start:**
```markdown
# Lite Claude Agent SDK
A lightweight wrapper around Claude CLI...

## What This Project Is
**Goal:** 65x smaller alternative...
```

**Critical constraints:**
```markdown
## Key Constraints
**Bundle size:** Must stay < 500KB
**Type compatibility:** Must re-export official SDK types
```

### 6. ✅ File References Over Code

```markdown
**File references:** Use file:line format:
- Example: "The control protocol is handled in src/core/control.ts:24"
```

No code snippets that would become outdated.

---

## New CLAUDE.md Structure

```markdown
1. What This Project Is (WHAT, WHY)
   - Goal, Strategy, Not

2. Project Structure (WHAT)
   - src/, tests/, docs/ layout

3. How to Work Here (HOW)
   - Running code (3 commands only)
   - Making changes (4 guidelines)
   - Testing philosophy
   - What NOT to do

4. Key Constraints
   - Bundle size < 500KB
   - Type compatibility
   - CLI dependency

5. Code Conventions
   - Biome handles style (no duplication)
   - File reference format

6. Current Status
   - What's implemented
   - What's next
   - Where to find details (docs/)

7. Tech Stack
   - Bun (minimal, not tutorial)
   - TypeScript
   - Process spawning

8. Documentation
   - Where to update
   - Structure to follow
```

---

## Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Lines | 107 | 122 | +15 (more context) |
| Project-specific | 0% | 100% | ✅ |
| Generic Bun tutorial | 100% | ~10% | ✅ |
| WHAT explained | ❌ | ✅ | ✅ |
| WHY explained | ❌ | ✅ | ✅ |
| HOW explained | ❌ | ✅ | ✅ |
| Code snippets | 6 | 0 | ✅ (avoid staleness) |
| Commands listed | 20+ | 3 | ✅ (essential only) |
| References to docs/ | 0 | 5 | ✅ (progressive disclosure) |

---

## Impact

**Before:** Claude treats this like any Bun project
- No understanding of lightweight wrapper strategy
- No awareness of bundle size constraint
- No guidance on testing approach
- Generic Bun suggestions

**After:** Claude understands this specific project
- Knows we're building a thin wrapper (not reimplementation)
- Aware of < 500KB constraint (our #1 differentiator)
- Knows integration tests are primary
- Points to docs/ for detailed guidance

---

## Lessons Applied

1. **CLAUDE.md is for onboarding** - Not a generic tutorial
2. **Context window is limited** - Every line must be universally relevant
3. **Progressive disclosure** - Point to docs/ instead of embedding
4. **Don't duplicate linter rules** - Biome handles that
5. **File references > code snippets** - Avoid staleness
6. **Current status matters** - Help Claude understand where we are

---

## Future Maintenance

**When to update CLAUDE.md:**
- ✅ Project strategy changes (e.g., no longer thin wrapper)
- ✅ Key constraints change (e.g., bundle size limit)
- ✅ Project structure changes (e.g., new top-level folder)
- ✅ Testing philosophy changes (e.g., add unit tests)

**When NOT to update:**
- ❌ Adding new features (update docs/planning/FEATURES.md instead)
- ❌ Changing style rules (handled by Biome)
- ❌ Adding examples (use docs/guides/ instead)
- ❌ Task-specific workarounds (too specific)

**Keep it:**
- Universal (applies to all tasks)
- Current (reflects project status)
- Concise (< 300 lines)
- Project-specific (not generic)

---

**Result:** CLAUDE.md now effectively onboards Claude to this specific project instead of being a generic Bun tutorial. 🎯
