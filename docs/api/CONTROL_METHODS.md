# Query Control Methods

The `Query` object in open-claude-agent-sdk is an `AsyncGenerator<SDKMessage>` that also provides control methods for managing the Claude CLI subprocess during execution.

## Overview

When you call `query()`, it returns a `Query` object that you can iterate over to receive messages. The Query object also exposes control methods that send commands to the CLI via stdin.

```typescript
import { query } from 'open-claude-agent-sdk';

const q = query({
  prompt: 'Hello, Claude!',
  options: { permissionMode: 'bypassPermissions' }
});

// Iterate over messages
for await (const message of q) {
  console.log(message);
  if (message.type === 'result') break;
}
```

---

## Implemented Methods

### `interrupt()`

Sends an interrupt signal to stop the current query execution.

**Signature:**
```typescript
async interrupt(): Promise<void>
```

**Description:**
Interrupts the currently running query. This is useful for canceling long-running operations or implementing timeout behavior.

**Usage Example:**
```typescript
const q = query({ prompt: 'Write a very long essay...', options });

// Set a timeout to interrupt after 30 seconds
setTimeout(() => {
  q.interrupt();
}, 30000);

for await (const message of q) {
  if (message.type === 'result') break;
}
```

---

### `setPermissionMode(mode)`

Changes the permission mode during query execution.

**Signature:**
```typescript
async setPermissionMode(mode: PermissionMode): Promise<void>
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `mode` | `PermissionMode` | The new permission mode to set |

**PermissionMode Values:**
- `'default'` - Normal permission checking
- `'acceptEdits'` - Auto-accept file edit operations
- `'bypassPermissions'` - Skip all permission checks (requires `allowDangerouslySkipPermissions`)
- `'plan'` - Planning mode only (no tool execution)
- `'dontAsk'` - Never prompt the user
- `'auto'` - Automatic permission handling

**Usage Example:**
```typescript
const q = query({ prompt: 'Create a file...', options: { permissionMode: 'default' } });

for await (const message of q) {
  if (someCondition) {
    // Switch to bypass mode
    await q.setPermissionMode('bypassPermissions');
  }
  if (message.type === 'result') break;
}
```

---

### `setModel(model)`

Changes the model during query execution.

**Signature:**
```typescript
async setModel(model?: string): Promise<void>
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `model` | `string \| undefined` | The model identifier to switch to |

**Usage Example:**
```typescript
const q = query({
  prompt: 'Complex task...',
  options: { model: 'claude-sonnet-4-20250514' }
});

for await (const message of q) {
  if (needsMoreCapability(message)) {
    // Upgrade to Opus for complex reasoning
    await q.setModel('claude-opus-4-20250514');
  }
  if (message.type === 'result') break;
}
```

---

### `setMaxThinkingTokens(maxThinkingTokens)`

Sets the maximum number of thinking tokens for extended thinking mode.

**Signature:**
```typescript
async setMaxThinkingTokens(maxThinkingTokens: number | null): Promise<void>
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `maxThinkingTokens` | `number \| null` | Maximum thinking tokens, or null to disable |

**Usage Example:**
```typescript
const q = query({ prompt: 'Solve this math problem...', options });

// Enable extended thinking
await q.setMaxThinkingTokens(10000);

for await (const message of q) {
  if (message.type === 'result') break;
}
```

---

### `streamInput(stream)`

Streams additional user messages for multi-turn conversations.

**Signature:**
```typescript
async streamInput(stream: AsyncIterable<SDKUserMessage>): Promise<void>
```

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `stream` | `AsyncIterable<SDKUserMessage>` | An async iterable of user messages |

**SDKUserMessage Structure:**
```typescript
type SDKUserMessage = {
  type: 'user';
  message: {
    role: 'user';
    content: Array<{ type: 'text'; text: string }>;
  };
  session_id: string;
  parent_tool_use_id: string | null;
};
```

**Usage Example:**
```typescript
const q = query({ prompt: 'Initial prompt', options });

// Process initial response
for await (const message of q) {
  if (message.type === 'result') {
    // Send follow-up
    await q.streamInput((async function* () {
      yield {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Follow-up question' }]
        },
        session_id: '',
        parent_tool_use_id: null
      };
    })());
    break;
  }
}

// Continue processing
for await (const message of q) {
  if (message.type === 'result') break;
}
```

---

### `close()`

Closes the query and terminates the CLI subprocess.

**Signature:**
```typescript
close(): void
```

**Description:**
Immediately terminates the query by:
1. Closing the readline interface
2. Removing abort controller listeners
3. Killing the subprocess
4. Marking the query as done

**Usage Example:**
```typescript
const q = query({ prompt: 'Hello', options });

try {
  for await (const message of q) {
    if (shouldStop(message)) {
      q.close();
      break;
    }
  }
} finally {
  q.close();  // Ensure cleanup
}
```

**With `await using` (automatic cleanup):**
```typescript
{
  await using q = query({ prompt: 'Hello', options });

  for await (const message of q) {
    if (message.type === 'result') break;
  }
}  // close() called automatically
```

---

## Query Methods

### `supportedCommands()`

```typescript
async supportedCommands(): Promise<SlashCommand[]>
```

Returns available slash commands.

### `supportedModels()`

```typescript
async supportedModels(): Promise<ModelInfo[]>
```

Returns available models.

### `mcpServerStatus()`

```typescript
async mcpServerStatus(): Promise<McpServerStatus[]>
```

Returns MCP server connection status.

### `accountInfo()`

```typescript
async accountInfo(): Promise<AccountInfo>
```

Returns account information.

### `initializationResult()`

```typescript
async initializationResult(): Promise<SDKControlInitializeResponse>
```

Returns the full initialization payload including supported commands, models, account info, and output style configuration.

### `supportedAgents()`

```typescript
async supportedAgents(): Promise<AgentInfo[]>
```

Returns available subagents for the current session.

### `getContextUsage()`

```typescript
async getContextUsage(): Promise<SDKControlGetContextUsageResponse>
```

Returns a breakdown of token usage for the current context window.

### `readFile(path, options?)`

```typescript
async readFile(
  path: string,
  options?: { maxBytes?: number }
): Promise<SDKControlReadFileResponse | null>
```

Reads a file via the control protocol. Returns `null` on error (e.g. file not found). Useful for reading files in the CLI's working directory without spawning a separate process.

### `applyFlagSettings(settings)`

```typescript
async applyFlagSettings(settings: { [K in keyof Settings]?: Settings[K] | null }): Promise<void>
```

Merges a partial settings object into the flag-tier settings for the current session. Any key can be set to `null` to clear it from the flag layer. Takes effect on the next turn.

### `backgroundTasks(toolUseId?)`

```typescript
async backgroundTasks(toolUseId?: string): Promise<boolean>
```

Signals that the current tool use should be backgrounded. Returns whether the tasks were successfully backgrounded.

### `stopTask(taskId)`

```typescript
async stopTask(taskId: string): Promise<void>
```

Stops a specific background task by ID.

### `reloadPlugins()`

```typescript
async reloadPlugins(): Promise<SDKControlReloadPluginsResponse>
```

Reloads plugins mid-session without restarting the CLI.

### `seedReadState(path, mtime)`

```typescript
async seedReadState(path: string, mtime: number): Promise<void>
```

Marks a file as already read at the given modification time, suppressing the "file changed" notice on next access.

---

## MCP Control Methods

### `reconnectMcpServer(serverName)`

```typescript
async reconnectMcpServer(serverName: string): Promise<void>
```

Reconnects a disconnected MCP server.

### `toggleMcpServer(serverName, enabled)`

```typescript
async toggleMcpServer(serverName: string, enabled: boolean): Promise<void>
```

Enables or disables an MCP server.

### `setMcpServers(servers)`

```typescript
async setMcpServers(servers: Record<string, McpServerConfig>): Promise<McpSetServersResult>
```

Dynamically configures MCP servers.

---

## Not Supported

### `rewindFiles(userMessageId, options?)`

```typescript
async rewindFiles(
  userMessageId: string,
  options?: { dryRun?: boolean }
): Promise<RewindFilesResult>
```

Throws "not yet implemented" — no CLI protocol support.

---

## AsyncIterator Methods

The Query object implements `AsyncGenerator<SDKMessage, void>`:

### `next()`

Returns the next message from the CLI.

### `return(value?)`

Called when breaking out of iteration. Calls `close()` internally.

### `throw(error?)`

Called when an error occurs. Calls `close()` and re-throws.

### `[Symbol.asyncIterator]()`

Returns the iterator itself, enabling `for await...of` syntax.

### `[Symbol.asyncDispose]()`

Enables `await using` syntax for automatic cleanup.
