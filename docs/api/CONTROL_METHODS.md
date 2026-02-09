# Query Control Methods

The `Query` object in lite-claude-agent-sdk is an `AsyncGenerator<SDKMessage>` that also provides control methods for managing the Claude CLI subprocess during execution.

## Overview

When you call `query()`, it returns a `Query` object that you can iterate over to receive messages. The Query object also exposes control methods that send commands to the CLI via stdin.

```typescript
import { query } from 'lite-claude-agent-sdk';

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
- `'bypassPermissions'` - Skip all permission checks
- `'plan'` - Planning mode only

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
