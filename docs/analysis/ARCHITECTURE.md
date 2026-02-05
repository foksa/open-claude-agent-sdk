# Architecture and Refactoring Analysis

## Executive Summary

The codebase is well-organized for a lightweight SDK wrapper. The recent refactoring of `QueryImpl.ts` has significantly improved the architecture by extracting focused classes for message queuing, process spawning, and message routing.

---

## 1. Class Responsibilities

### Current Assessment

| File | Lines | Responsibility | Assessment |
|------|-------|----------------|------------|
| `src/api/QueryImpl.ts` | ~300 | Process orchestration, control methods, input handling | **Focused** |
| `src/api/MessageQueue.ts` | ~90 | Async iteration pattern with queue/waiters | **Focused** |
| `src/api/MessageRouter.ts` | ~90 | Stdout reading, message routing | **Focused** |
| `src/api/ProcessFactory.ts` | ~30 | Process spawning abstraction | **Focused** |
| `src/core/control.ts` | ~210 | Control protocol handler | **Focused** |
| `src/core/argBuilder.ts` | ~130 | CLI argument construction | **Focused** |
| `src/core/spawner.ts` | ~40 | Process spawning | **Focused** |
| `src/core/spawn.ts` | ~10 | Facade re-exporting argBuilder + spawner | **Focused** |
| `src/core/controlRequests.ts` | ~75 | Type-safe control request builders | **Focused** |
| `src/core/hookConfig.ts` | ~55 | Hook configuration builder | **Focused** |
| `src/core/detection.ts` | ~90 | Binary detection | **Focused** |

---

## 2. Completed: QueryImpl Refactoring

**Previous Problem:** `QueryImpl.ts` was a 488-line god class handling 5 distinct responsibilities.

### Extracted Classes (DONE)

#### MessageQueue Class
```typescript
// src/api/MessageQueue.ts (~90 lines)
export class MessageQueue<T> {
  push(item: T): void;
  complete(error?: Error): void;
  async next(): Promise<IteratorResult<T>>;
  isDone(): boolean;
  getError(): Error | null;
}
```
- Generic async iteration pattern
- Handles producer-consumer queue with waiters
- Fully tested with 12 unit tests

#### MessageRouter Class
```typescript
// src/api/MessageRouter.ts (~90 lines)
export class MessageRouter {
  constructor(
    stdout: Readable,
    controlHandler: ControlProtocolHandler,
    onMessage: MessageCallback,
    onDone: DoneCallback
  );
  async startReading(): Promise<void>;
  close(): void;
}
```
- Reads NDJSON from stdout
- Routes control requests to handler
- Filters control_response messages
- Passes regular messages to callback

#### ProcessFactory Interface
```typescript
// src/api/ProcessFactory.ts (~30 lines)
export interface ProcessFactory {
  spawn(options: Options): ChildProcess;
}

export class DefaultProcessFactory implements ProcessFactory {
  spawn(options: Options): ChildProcess;
}
```
- Enables dependency injection for testing
- Mock processes can be injected for unit tests
- No real CLI needed for testing message routing

### Benefits Achieved

- **`QueryImpl` reduced from 488 to ~300 lines** (38% reduction)
- **Unit testable** - each class can be tested independently
- **Clear separation of concerns**:
  - `MessageQueue`: async iteration pattern
  - `MessageRouter`: stdout reading and routing
  - `ProcessFactory`: process spawning abstraction
  - `QueryImpl`: orchestration and control methods

---

## 3. Completed: Architecture Cleanup

All remaining refactoring items have been completed:

### ✅ Removed Unused parser.ts

**What:** Deleted `src/core/parser.ts` and `scripts/debug/test-query-debug.ts`

**Why:** The `parseNDJSON` function was never imported by production code. MessageRouter has its own inline parsing that handles control protocol routing (which parser.ts didn't support).

### ✅ Added Type Safety to ControlProtocolHandler

**What:** Replaced `Map<string, any>` with `Map<string, InternalHookCallback>` in `src/core/control.ts`

**New type in `src/types/control.ts`:**
```typescript
export type InternalHookCallback = (
  input: Record<string, unknown>,
  toolUseId: string | undefined,
  options: { signal: AbortSignal }
) => Promise<Record<string, unknown>>;
```

### ✅ Created Control Request Builders

**New file:** `src/core/controlRequests.ts`

Provides type-safe request creation:
```typescript
export const ControlRequests = {
  interrupt: () => ({ subtype: 'interrupt' }),
  setPermissionMode: (mode) => ({ subtype: 'set_permission_mode', mode }),
  setModel: (model?) => ({ subtype: 'set_model', model }),
  setMaxThinkingTokens: (tokens) => ({ subtype: 'set_max_thinking_tokens', max_thinking_tokens: tokens }),
};
```

QueryImpl now uses:
```typescript
this.sendControlRequest(ControlRequests.interrupt());
// instead of
this.sendControlRequest({ subtype: 'interrupt' });
```

### ✅ Extracted Hook Registration

**New file:** `src/core/hookConfig.ts`

Extracted hook registration logic from `sendControlProtocolInit()`:
```typescript
export function buildHookConfig(
  hooks: Record<string, HookCallbackMatcher[]>,
  controlHandler: ControlProtocolHandler
): HookConfig
```

QueryImpl `sendControlProtocolInit()` reduced from 45 lines to 32 lines.

### ✅ Split spawn.ts

**Before:** `src/core/spawn.ts` (163 lines) with two concerns

**After:**
- `src/core/argBuilder.ts` (~130 lines) - `buildCliArgs()` function
- `src/core/spawner.ts` (~40 lines) - `spawnClaude()` function
- `src/core/spawn.ts` (~10 lines) - Facade re-exporting both for backward compatibility

---

## 4. Single Responsibility Summary

| Module | Current Responsibilities | SRP Violation? |
|--------|--------------------------|----------------|
| `QueryImpl.ts` | Orchestration, control methods, input handling | **No** |
| `MessageQueue.ts` | Async iteration queue pattern | **No** |
| `MessageRouter.ts` | Stdout reading and message routing | **No** |
| `ProcessFactory.ts` | Process spawning abstraction | **No** |
| `control.ts` | Handle control requests, send responses | **No** |
| `controlRequests.ts` | Type-safe control request builders | **No** |
| `hookConfig.ts` | Hook configuration building | **No** |
| `argBuilder.ts` | Build CLI arguments | **No** |
| `spawner.ts` | Spawn CLI process | **No** |
| `spawn.ts` | Facade for argBuilder + spawner | **No** |
| `detection.ts` | Find CLI binary | **No** |

---

## 5. Remaining Refactoring Opportunities

All planned refactoring items have been completed. Future considerations:

### Low Priority (If needed)
- Add more specific types to catch blocks (currently `error: any`)
- Consider extracting MCP-related stubs into separate module when implementing MCP support

---

## 6. Test Coverage

### Unit Tests

| File | Tests | Coverage |
|------|-------|----------|
| `tests/unit/message-queue.test.ts` | 12 | push, next, complete, error handling, multiple consumers |
| `tests/unit/process-factory.test.ts` | 3 | mock implementation, error cases |
| `tests/unit/message-router.test.ts` | 6 | routing, filtering, error handling |
| `tests/unit/sdk-compatibility.test.ts` | 62+ | CLI args, stdin messages, option handling |

All existing integration tests continue to pass.

---

## 7. Impact Summary

The complete refactoring achieved:
1. **Reduced `QueryImpl` from 488 lines to ~300 lines** (38% reduction)
2. **Enabled unit testing** through dependency injection
3. **Clear separation of concerns** with focused classes
4. **Type-safe control protocol** - no more `any` in public interfaces
5. **Modular spawn system** - argBuilder and spawner can evolve independently
6. **20+ new unit tests** for extracted classes

The public API (`query()` function) did not change.
