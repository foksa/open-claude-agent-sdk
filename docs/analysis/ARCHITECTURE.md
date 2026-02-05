# Architecture and Refactoring Analysis

## Executive Summary

The codebase is well-organized for a lightweight SDK wrapper. Most modules follow single responsibility principles. However, there are notable areas for improvement, particularly in `QueryImpl.ts` (512 lines) and opportunities to improve testability through dependency injection.

---

## 1. Class Responsibilities

### Current Assessment

| File | Lines | Responsibility | Assessment |
|------|-------|----------------|------------|
| `src/api/QueryImpl.ts` | 512 | Process lifecycle, message routing, iterator protocol, control methods | **Too many responsibilities** |
| `src/core/control.ts` | 209 | Control protocol handler | **Focused** |
| `src/core/spawn.ts` | 163 | CLI arg building, process spawning | **Focused** |
| `src/core/detection.ts` | 89 | Binary detection | **Focused** |
| `src/core/parser.ts` | 60 | NDJSON parsing | **Focused, but unused** |

---

## 2. Finding: QueryImpl is a God Class

**Problem:** `QueryImpl.ts` handles 5 distinct responsibilities:
1. Process lifecycle management (spawn, kill, cleanup)
2. Message routing (stdout parsing, control vs regular messages)
3. AsyncIterator protocol implementation
4. All 15 Query control methods
5. Input handling (string vs AsyncIterable)

### Proposed Refactoring

#### Extract MessageQueue Class
```typescript
// src/api/MessageQueue.ts
export class MessageQueue<T> {
  private queue: T[] = [];
  private waiters: Array<{
    resolve: (value: IteratorResult<T>) => void;
    reject: (error: Error) => void;
  }> = [];
  private done = false;
  private error: Error | null = null;

  push(item: T): void { /* ... */ }
  complete(error?: Error): void { /* ... */ }
  async next(): Promise<IteratorResult<T>> { /* ... */ }
}
```

#### Extract MessageRouter Class
```typescript
// src/api/MessageRouter.ts
export class MessageRouter {
  constructor(
    private process: ChildProcess,
    private onMessage: (msg: SDKMessage) => void,
    private onDone: () => void,
    private onError: (err: Error) => void,
    options: Options
  ) {}

  async startReading(): Promise<void> { /* ... */ }
}
```

**Benefits:**
- `MessageQueue`: 50 lines, reusable async iteration pattern
- `MessageRouter`: 50 lines, single responsibility (routing)
- `QueryImpl`: ~200 lines, orchestration only
- Each class can be tested independently

---

## 3. Finding: Constructor Too Long (70+ lines)

**Location:** `src/api/QueryImpl.ts:42-113`

The constructor does too much:
- Abort signal check
- Binary detection
- Arg building
- Process spawning
- Control handler init
- Reading start
- Protocol init
- Input handling
- Process event setup
- Abort handler setup

### Proposed Refactoring

```typescript
// Use factory function
export function createQuery(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query {
  // Early return for pre-aborted
  if (params.options?.abortController?.signal.aborted) {
    return new AbortedQuery();
  }

  // Build components
  const binary = detectClaudeBinary(params.options);
  const args = buildCliArgs({ ...params.options, prompt: '' });
  const process = spawnClaude(binary, args, { cwd: params.options?.cwd });

  return new QueryImpl({ process, prompt: params.prompt, options: params.options });
}

// QueryImpl constructor becomes cleaner
constructor(deps: { process: ChildProcess; prompt: string | AsyncIterable<SDKUserMessage>; options: Options }) {
  this.process = deps.process;
  this.setupControlHandler();
  this.startReading();
  this.initializeProtocol();
  this.handleInput(deps.prompt);
  this.setupProcessEvents();
  this.setupAbortHandler();
}
```

---

## 4. Finding: No Dependency Injection - Hard to Test

**Problem:** `QueryImpl` directly calls `detectClaudeBinary`, `buildCliArgs`, and `spawnClaude`. This makes unit testing impossible without spawning real processes.

### Proposed DI Pattern

```typescript
// src/api/types.ts
export interface ProcessFactory {
  spawn(options: Options): ChildProcess;
}

export class DefaultProcessFactory implements ProcessFactory {
  spawn(options: Options): ChildProcess {
    const binary = detectClaudeBinary(options);
    const args = buildCliArgs({ ...options, prompt: '' });
    return spawnClaude(binary, args, { cwd: options.cwd });
  }
}

// For testing
export class MockProcessFactory implements ProcessFactory {
  spawn(options: Options): ChildProcess {
    return createMockProcess();
  }
}

// QueryImpl receives factory
export class QueryImpl implements Query {
  constructor(
    params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options },
    processFactory: ProcessFactory = new DefaultProcessFactory()
  ) {
    this.process = processFactory.spawn(params.options ?? {});
  }
}
```

**Benefits:**
- Unit tests can inject mock processes
- No real CLI needed for testing message routing
- Faster test execution

---

## 5. Finding: Unused parser.ts

**File:** `src/core/parser.ts`

The `parseNDJSON` function is defined but never imported. QueryImpl has inline parsing logic.

**Options:**
1. Use parser.ts in QueryImpl
2. Remove parser.ts if inline version is preferred

---

## 6. Single Responsibility Summary

| Module | Current Responsibilities | SRP Violation? |
|--------|--------------------------|----------------|
| `QueryImpl.ts` | 5 responsibilities | **Yes** |
| `control.ts` | Handle control requests, send responses | **No** |
| `spawn.ts` | Build args, spawn process | Borderline |
| `detection.ts` | Find CLI binary | **No** |
| `parser.ts` | Parse NDJSON | **No** (but unused) |

---

## 7. Recommended Refactoring Priority

### High Priority (Improves testability)
1. **Extract `MessageQueue` class** - enables testing iteration logic
2. **Add dependency injection** for process spawning - enables unit tests
3. **Fix unused parser.ts** - either use it or remove it

### Medium Priority (Improves maintainability)
4. **Extract hook registration** from `sendControlProtocolInit`
5. **Add type safety** to `ControlProtocolHandler` callback map
6. **Create control request builders** - type-safe request creation

### Low Priority (Nice to have)
7. **Split `spawn.ts`** into `argBuilder.ts` and `spawner.ts`
8. **Extract `MessageRouter`** from QueryImpl

---

## 8. Impact Summary

The proposed refactorings would:
1. **Reduce `QueryImpl` from 512 lines to ~200 lines**
2. **Enable unit testing** through dependency injection
3. **Improve type safety** by eliminating `any` types
4. **Remove dead code** (unused `parser.ts`)

The public API (`query()` function) would not change.
