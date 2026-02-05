# Architecture and Refactoring Analysis

## Executive Summary

The codebase is well-organized for a lightweight SDK wrapper. The recent refactoring of `QueryImpl.ts` has significantly improved the architecture by extracting focused classes for message queuing, process spawning, and message routing.

---

## 1. Class Responsibilities

### Current Assessment

| File | Lines | Responsibility | Assessment |
|------|-------|----------------|------------|
| `src/api/QueryImpl.ts` | ~305 | Process orchestration, control methods, input handling | **Focused** |
| `src/api/MessageQueue.ts` | ~90 | Async iteration pattern with queue/waiters | **Focused** |
| `src/api/MessageRouter.ts` | ~90 | Stdout reading, message routing | **Focused** |
| `src/api/ProcessFactory.ts` | ~30 | Process spawning abstraction | **Focused** |
| `src/core/control.ts` | 209 | Control protocol handler | **Focused** |
| `src/core/spawn.ts` | 163 | CLI arg building, process spawning | **Focused** |
| `src/core/detection.ts` | 89 | Binary detection | **Focused** |
| `src/core/parser.ts` | 60 | NDJSON parsing | **Focused, but unused** |

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

- **`QueryImpl` reduced from 488 to ~305 lines** (37% reduction)
- **Unit testable** - each class can be tested independently
- **Clear separation of concerns**:
  - `MessageQueue`: async iteration pattern
  - `MessageRouter`: stdout reading and routing
  - `ProcessFactory`: process spawning abstraction
  - `QueryImpl`: orchestration and control methods

---

## 3. Finding: Unused parser.ts

**File:** `src/core/parser.ts`

The `parseNDJSON` function is defined but never imported. QueryImpl has inline parsing logic.

**Options:**
1. Use parser.ts in MessageRouter
2. Remove parser.ts if inline version is preferred

---

## 4. Single Responsibility Summary

| Module | Current Responsibilities | SRP Violation? |
|--------|--------------------------|----------------|
| `QueryImpl.ts` | Orchestration, control methods, input handling | **No** |
| `MessageQueue.ts` | Async iteration queue pattern | **No** |
| `MessageRouter.ts` | Stdout reading and message routing | **No** |
| `ProcessFactory.ts` | Process spawning abstraction | **No** |
| `control.ts` | Handle control requests, send responses | **No** |
| `spawn.ts` | Build args, spawn process | Borderline |
| `detection.ts` | Find CLI binary | **No** |
| `parser.ts` | Parse NDJSON | **No** (but unused) |

---

## 5. Remaining Refactoring Opportunities

### Medium Priority (Improves maintainability)
1. **Extract hook registration** from `sendControlProtocolInit`
2. **Add type safety** to `ControlProtocolHandler` callback map
3. **Create control request builders** - type-safe request creation
4. **Fix unused parser.ts** - either use it or remove it

### Low Priority (Nice to have)
5. **Split `spawn.ts`** into `argBuilder.ts` and `spawner.ts`

---

## 6. Test Coverage

### New Unit Tests Added

| File | Tests | Coverage |
|------|-------|----------|
| `tests/unit/message-queue.test.ts` | 12 | push, next, complete, error handling, multiple consumers |
| `tests/unit/process-factory.test.ts` | 3 | mock implementation, error cases |
| `tests/unit/message-router.test.ts` | 6 | routing, filtering, error handling |

All existing integration tests continue to pass.

---

## 7. Impact Summary

The refactoring achieved:
1. **Reduced `QueryImpl` from 488 lines to ~305 lines**
2. **Enabled unit testing** through dependency injection
3. **Clear separation of concerns** with focused classes
4. **20+ new unit tests** for extracted classes

The public API (`query()` function) did not change.
