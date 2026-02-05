# Advanced Feature Gap Analysis

## Executive Summary

This document analyzes advanced features present in the official SDK that are missing or partially implemented in the lite SDK: Custom Agents, Output Formats, Tool Builders, and Other Advanced Features.

---

## 1. Custom Agents (AgentDefinition & Subagents)

### Official SDK Support

```typescript
type AgentDefinition = {
    description: string;          // When to use this agent
    tools?: string[];             // Allowed tools (inherits if omitted)
    disallowedTools?: string[];   // Explicitly blocked tools
    prompt: string;               // Agent's system prompt
    model?: 'sonnet' | 'opus' | 'haiku' | 'inherit';
    mcpServers?: AgentMcpServerSpec[];
    criticalSystemReminder_EXPERIMENTAL?: string;
    skills?: string[];            // Preloaded skills
    maxTurns?: number;           // Turn limit for subagent
};

// Usage in Options
agents?: Record<string, AgentDefinition>;
agent?: string;  // Name of agent to use for main thread
```

### Lite SDK Status: NOT IMPLEMENTED

**Implementation Approach:**

1. CLI Arguments - Add `--agent` flag
2. Control Protocol Init - Include `agents` in initialize message
3. Hook Support - Handle `SubagentStart` and `SubagentStop` events

**Effort:** 3-5 days | **Priority:** MEDIUM

---

## 2. Output Formats (JSON Schema / Structured Output)

### Official SDK Support

```typescript
type JsonSchemaOutputFormat = {
    type: 'json_schema';
    schema: Record<string, unknown>;
};

// Result includes structured output
type SDKResultSuccess = {
    structured_output?: unknown;  // Parsed JSON matching schema
};
```

### Lite SDK Status: PARTIALLY IMPLEMENTED

- CLI argument handling EXISTS (`--json-schema`)
- Missing: integration tests, documentation

**Effort:** 1-2 days (mostly testing) | **Priority:** HIGH

---

## 3. Tool Builders and Custom Tools

### Official SDK Support

```typescript
// In-Process MCP Servers
function createSdkMcpServer(options: CreateSdkMcpServerOptions): McpSdkServerConfigWithInstance;

// Tool Helper
function tool<Schema>(
    name: string,
    description: string,
    inputSchema: Schema,
    handler: (args: InferShape<Schema>) => Promise<CallToolResult>
): SdkMcpToolDefinition<Schema>;

// Tool Restrictions
tools?: string[] | { type: 'preset'; preset: 'claude_code' };
allowedTools?: string[];
disallowedTools?: string[];
```

### Lite SDK Status: PARTIALLY RE-EXPORTED

- Functions re-exported but MCP integration not tested
- `allowedTools` partially handled
- `disallowedTools` and `tools` not implemented

**Effort:**
- Tool restrictions: 1-2 days
- Full MCP: 5-7 days

---

## 4. Other Advanced Features

### 4.1 Beta Features

```typescript
betas?: SdkBeta[];
type SdkBeta = 'context-1m-2025-08-07';
```

**Status:** NOT IMPLEMENTED | **Priority:** MEDIUM | **Effort:** 1 day

### 4.2 Additional Directories

```typescript
additionalDirectories?: string[];
```

**Status:** NOT IMPLEMENTED | **Priority:** MEDIUM | **Effort:** 1 day

### 4.3 Session Forking

```typescript
forkSession?: boolean;
resumeSessionAt?: string;
```

**Status:** NOT IMPLEMENTED | **Priority:** MEDIUM | **Effort:** 2-3 days

### 4.4 Persist Session

```typescript
persistSession?: boolean;  // @default true
```

**Status:** NOT IMPLEMENTED | **Priority:** LOW | **Effort:** 1 day

### 4.5 Continue Session

```typescript
continue?: boolean;  // Continue most recent session in cwd
```

**Status:** NOT IMPLEMENTED | **Priority:** LOW | **Effort:** 1 day

### 4.6 Fallback Model

```typescript
fallbackModel?: string;
```

**Status:** NOT IMPLEMENTED | **Priority:** LOW | **Effort:** 1 day

### 4.7 File Checkpointing & Rewind

```typescript
enableFileCheckpointing?: boolean;
rewindFiles(userMessageId: string, options?: { dryRun?: boolean }): Promise<RewindFilesResult>;
```

**Status:** STUB ONLY | **Priority:** LOW | **Effort:** 5-7 days

### 4.8 Plugins System

```typescript
plugins?: SdkPluginConfig[];
type SdkPluginConfig = { type: 'local'; path: string };
```

**Status:** NOT IMPLEMENTED | **Priority:** LOW | **Effort:** 3-5 days

### 4.9 V2 API (Preview)

```typescript
function unstable_v2_createSession(options): SDKSession;
function unstable_v2_prompt(message, options): Promise<SDKResultMessage>;
function unstable_v2_resumeSession(sessionId, options): SDKSession;
```

**Status:** NOT IMPLEMENTED | **Priority:** LOW | **Effort:** 2-3 days

---

## Implementation Priority Summary

### HIGH Priority (Production Critical)

| Feature | Status | Effort | Impact |
|---------|--------|--------|--------|
| Structured Outputs | Partial | 1-2 days | Data extraction |
| Tool Restrictions | Missing | 1-2 days | Security |
| Beta Features (1M context) | Missing | 1 day | Large context |

### MEDIUM Priority (Enhanced Functionality)

| Feature | Status | Effort | Impact |
|---------|--------|--------|--------|
| Custom Agents | Missing | 3-5 days | Task delegation |
| Session Forking | Missing | 2-3 days | Branching |
| Additional Directories | Missing | 1 day | Security |
| Continue Session | Missing | 1 day | UX |

### LOW Priority (As Needed)

| Feature | Status | Effort | Impact |
|---------|--------|--------|--------|
| V2 API | Missing | 2-3 days | Alternative (unstable) |
| Full MCP Support | Partial | 5-7 days | Custom tools |
| File Checkpointing | Stub | 5-7 days | File state |
| Plugins System | Missing | 3-5 days | Extensibility |

---

## Recommended Implementation Order

1. **Phase 1 (Week 1):** Structured Outputs testing, Tool Restrictions, Beta Features
2. **Phase 2 (Week 2):** Custom Agents, Additional Directories
3. **Phase 3 (As needed):** Session Forking, Continue Session, Fallback Model
4. **Phase 4 (Future):** MCP, Plugins, File Checkpointing, V2 API
