# Core Functionality Gap Analysis

## Executive Summary

Based on analysis of the official SDK type definitions, beautified source code, and current lite SDK implementation, this document outlines the core functionality gaps and implementation approach.

---

## 1. Query Lifecycle Methods (CRITICAL GAPS)

These methods are stubbed in `QueryImpl.ts` but throw "not implemented" errors:

### 1.1 `initializationResult()` - HIGH PRIORITY

**Official SDK Behavior:**
- Returns `SDKControlInitializeResponse` containing: commands, models, account info
- Data comes from the CLI's response to the `initialize` control request

**How to Implement:**
1. Store the `control_response` from the initial `initialize` request
2. The response contains: `{ commands, output_style, available_output_styles, models, account }`
3. Resolve a promise when this response is received

```typescript
// Add to QueryImpl class
private initPromise: Promise<SDKControlInitializeResponse>;
private initResolve!: (value: SDKControlInitializeResponse) => void;

// In constructor
this.initPromise = new Promise((resolve) => {
  this.initResolve = resolve;
});

// In startReading(), when receiving control_response for init request
if (msg.type === 'control_response' && msg.response.request_id.startsWith('init_')) {
  this.initResolve(msg.response.response as SDKControlInitializeResponse);
}

// Implement method
async initializationResult(): Promise<SDKControlInitializeResponse> {
  return this.initPromise;
}
```

### 1.2 `supportedCommands()` - MEDIUM PRIORITY

```typescript
async supportedCommands(): Promise<SlashCommand[]> {
  const init = await this.initializationResult();
  return init.commands;
}
```

### 1.3 `supportedModels()` - MEDIUM PRIORITY

```typescript
async supportedModels(): Promise<ModelInfo[]> {
  const init = await this.initializationResult();
  return init.models;
}
```

### 1.4 `accountInfo()` - HIGH PRIORITY

```typescript
async accountInfo(): Promise<AccountInfo> {
  const init = await this.initializationResult();
  return init.account;
}
```

### 1.5 `mcpServerStatus()` - LOW PRIORITY

Requires sending control request with `{ subtype: 'mcp_status' }` and waiting for response.

---

## 2. Missing Options Support

### Currently Supported
- `permissionMode` ✅
- `allowDangerouslySkipPermissions` ✅
- `model` ✅
- `maxTurns` ✅
- `maxBudgetUsd` ✅
- `includePartialMessages` ✅
- `canUseTool` ✅
- `hooks` ✅
- `outputFormat` (json_schema) ✅
- `allowedTools` ✅
- `settingSources` ✅
- `debug` / `debugFile` ✅
- `resume` ✅
- `sandbox` ✅
- `cwd` ✅
- `systemPrompt` ✅
- `abortController` ✅

### Missing Options (by priority)

| Option | CLI Flag | Priority | Effort |
|--------|----------|----------|--------|
| `disallowedTools` | `--disallowedTools` | HIGH | 5 min |
| `tools` | `--tools` | HIGH | 10 min |
| `betas` | `--betas` | MEDIUM | 5 min |
| `forkSession` | `--fork-session` | MEDIUM | 5 min |
| `continue` | `--continue` | MEDIUM | 5 min |
| `additionalDirectories` | `--add-dir` | MEDIUM | 10 min |
| `maxThinkingTokens` | `--max-thinking-tokens` | MEDIUM | 5 min |
| `fallbackModel` | `--fallback-model` | LOW | 5 min |
| `mcpServers` | `--mcp-config` | MEDIUM | 30 min |
| `agents` | (via init request) | LOW | 1 hour |
| `agent` | `--agent` | LOW | 5 min |
| `plugins` | `--plugin-dir` | LOW | 15 min |
| `persistSession` | `--no-session-persistence` | LOW | 5 min |
| `env` | (spawn option) | MEDIUM | 10 min |

---

## 3. Control Protocol Request/Response Handling

### Currently Handled
- `can_use_tool` (permission callback) ✅
- `hook_callback` ✅
- `initialize` (partial - doesn't capture response) ⚠️
- `interrupt` ✅
- `set_permission_mode` ✅
- `set_model` ✅
- `set_max_thinking_tokens` ✅

### Missing: Bidirectional Request/Response Pattern

The lite SDK sends control requests but doesn't track responses. Need to add:

```typescript
// Add to QueryImpl
private pendingControlResponses = new Map<string, { resolve: Function, reject: Function }>();

async sendControlRequestAndWait(inner: any): Promise<any> {
  const requestId = this.generateRequestId();
  const promise = new Promise((resolve, reject) => {
    this.pendingControlResponses.set(requestId, { resolve, reject });
  });

  this.process.stdin?.write(JSON.stringify({
    type: 'control_request',
    request_id: requestId,
    request: inner
  }) + '\n');

  return promise;
}

// In message handler
if (msg.type === 'control_response') {
  const pending = this.pendingControlResponses.get(msg.response.request_id);
  if (pending) {
    pending.resolve(msg.response);
    this.pendingControlResponses.delete(msg.response.request_id);
  }
}
```

---

## 4. Recommended Implementation Order

### Phase 1 (Immediate - Core Lifecycle)
1. Add bidirectional control request tracking
2. Capture initialization response
3. Implement `initializationResult()`
4. Implement `supportedCommands()`, `supportedModels()`, `accountInfo()`

### Phase 2 (Short-term - Missing Options)
5. Add `disallowedTools` option
6. Add `tools` option
7. Add `betas` option
8. Add `forkSession` option
9. Add `continue` option
10. Add `maxThinkingTokens` option
11. Add `env` spawn option

### Phase 3 (Medium-term - MCP Features)
12. Implement `mcpServerStatus()`
13. Implement `reconnectMcpServer()`
14. Implement `toggleMcpServer()`
15. Implement `setMcpServers()` (process-based servers only)
16. Add `mcpServers` option

### Phase 4 (Long-term - Advanced)
17. Add `agents` and `agent` options
18. Add `plugins` option
19. Implement `rewindFiles()`
20. Full SDK MCP server support

---

## 5. Key Files to Modify

| File | Changes Needed |
|------|----------------|
| `src/api/QueryImpl.ts` | Add control response tracking, implement lifecycle methods |
| `src/core/spawn.ts` | Add missing CLI flags for new options |
| `src/types/index.ts` | Already complete - re-exports all needed types |
| `src/core/control.ts` | Minor - add control response routing |
| `tests/integration/` | Add tests for each new feature |

---

## 6. Estimated Effort

| Category | Items | Effort |
|----------|-------|--------|
| Core Lifecycle Methods | 9 methods | 2-3 days |
| Missing Options (HIGH) | 6 options | 1 hour |
| Missing Options (MEDIUM) | 8 options | 2-3 hours |
| MCP Features | 4 methods + option | 1-2 days |
| Advanced Features | 5 items | 3-5 days |
| **Total** | | **~1-2 weeks** |
