# SDK Update: 0.2.30 → 0.2.34

**Date:** 2026-02-06

Changes in `@anthropic-ai/claude-agent-sdk` versions 0.2.31 through 0.2.34.

---

## New Hook Events

Two new hook events added to `HookEvent` union and `HOOK_EVENTS` array:

### `TeammateIdle`

Fires when a teammate agent becomes idle.

```typescript
type TeammateIdleHookInput = BaseHookInput & {
  hook_event_name: 'TeammateIdle';
  teammate_name: string;
  team_name: string;
};
```

### `TaskCompleted`

Fires when a task is completed.

```typescript
type TaskCompletedHookInput = BaseHookInput & {
  hook_event_name: 'TaskCompleted';
  task_id: string;
  task_subject: string;
  task_description?: string;
  teammate_name?: string;
  team_name?: string;
};
```

**Impact:** Add type re-exports for `TaskCompletedHookInput` and `TeammateIdleHookInput`.

---

## New `sessionId` Option

```typescript
interface Options {
  /**
   * Use a specific session ID instead of auto-generated one.
   * Must be a valid UUID. Cannot be used with `continue` or `resume`
   * unless `forkSession` is also set.
   */
  sessionId?: string;
}
```

**Impact:** Pass-through to CLI. No SDK changes needed — already handled by Options type re-export.

---

## New `delegate` Permission Mode

```typescript
type PermissionMode = 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan' | 'delegate' | 'dontAsk';
```

`delegate` mode restricts team leader to only Teammate and Task tools.

**Impact:** Already handled via `PermissionMode` type re-export.

---

## `stop_reason` Field on Messages

Added to assistant and result message types:

```typescript
interface SDKAssistantMessage {
  // ... existing fields
  stop_reason: string | null;
}

interface SDKResultMessage {
  // ... existing fields
  stop_reason: string | null;
}
```

**Impact:** Already handled — we pass messages through from CLI unchanged.

---

## New Streamlined Message Types

Added to `StdoutMessage` union:

- `SDKStreamlinedTextMessage`
- `SDKStreamlinedToolUseSummaryMessage`

These are new output message types for streamlined output mode.

**Impact:** Already handled — our message router passes all stdout messages through. These types are internal to the SDK (referenced via `coreTypes` namespace), not exported for consumers.

---

## `allowManagedDomainsOnly` Setting

New boolean option in sandbox/settings configuration:

```typescript
interface SandboxSettings {
  // ... existing fields
  allowManagedDomainsOnly?: boolean;
}
```

**Impact:** Already handled via `SandboxSettings` type re-export.

---

## Minor: Typo Fix

`sdk-tools.d.ts`: "occurences" → "occurrences" in Edit tool description.

---

## Summary

| Change | Impact on Lite SDK |
|--------|-------------------|
| TeammateIdle hook | Add type re-export |
| TaskCompleted hook | Add type re-export |
| sessionId option | Auto (Options re-export) |
| delegate permission mode | Auto (PermissionMode re-export) |
| stop_reason field | Auto (message pass-through) |
| Streamlined messages | Internal types, not exported |
| allowManagedDomainsOnly | Auto (SandboxSettings re-export) |

## Known Limitations (from official SDK issues)

### SessionStart/SessionEnd hooks are declarative-only

These hooks only fire when configured via `.claude/settings.json` (declarative),
NOT when passed programmatically via the `hooks` option. This is a known issue
in the official SDK, not specific to Lite SDK.

**Reference:** [anthropics/claude-agent-sdk-typescript#83](https://github.com/anthropics/claude-agent-sdk-typescript/issues/83)

---

**Action items:**
1. ✅ Add `TaskCompletedHookInput` and `TeammateIdleHookInput` type re-exports
2. ✅ Update `bun.lock` with new SDK version
