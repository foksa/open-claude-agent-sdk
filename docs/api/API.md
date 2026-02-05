# Lite Claude Agent SDK - API Documentation

## Overview

Lite Claude Agent SDK is a lightweight alternative to `@anthropic-ai/claude-agent-sdk`. It provides the same API surface while being 65x smaller (~200KB vs 13MB) by spawning the locally-installed Claude CLI as a subprocess instead of embedding it.

**Key Features:**
- 100% type-compatible with the official SDK
- Full bidirectional control protocol support
- Multi-turn conversations
- Permission callbacks and hooks
- Runtime control methods (interrupt, model switching, etc.)

## Installation

```bash
npm install lite-claude-agent-sdk
# or
bun add lite-claude-agent-sdk
```

**Prerequisite:** Claude CLI must be installed separately:
```bash
npm install -g @anthropic-ai/claude-code
```

## Quick Start

```typescript
import { query } from 'lite-claude-agent-sdk';

// Simple one-shot query
const q = query({
  prompt: 'Say hello',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
  },
});

// Stream messages
for await (const msg of q) {
  console.log(msg.type, msg);
  if (msg.type === 'result') break;
}
```

## API Reference

### `query(params)`

The main entry point for interacting with Claude.

**Parameters:**

```typescript
function query(params: {
  prompt: string | AsyncIterable<SDKUserMessage>;
  options?: Options;
}): Query;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `prompt` | `string` | Simple text prompt for one-shot or multi-turn queries via `streamInput()` |
| `prompt` | `AsyncIterable<SDKUserMessage>` | Streaming input mode for complex multi-turn flows |
| `options` | `Options` | Configuration options (see Options Reference) |

**Returns:** `Query` - An AsyncGenerator that yields `SDKMessage` objects with additional control methods.

## Usage Examples

### Basic Query

```typescript
import { query } from 'lite-claude-agent-sdk';

const q = query({
  prompt: 'Write a haiku about coding',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
  },
});

for await (const msg of q) {
  if (msg.type === 'assistant') {
    console.log('Response:', msg.message.content);
  }
  if (msg.type === 'result') {
    console.log('Final result:', msg.result);
    break;
  }
}
```

### Multi-Turn Conversation with `streamInput()`

```typescript
import { query, type SDKUserMessage } from 'lite-claude-agent-sdk';

const q = query({
  prompt: 'Say hello in one word',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
  },
});

let sessionId = '';
let turnCount = 0;

for await (const msg of q) {
  // Capture session ID from system message
  if (msg.type === 'system') {
    sessionId = msg.session_id;
  }

  if (msg.type === 'result') {
    turnCount++;
    console.log(`Turn ${turnCount} result:`, msg.result);

    if (turnCount < 2) {
      // Send follow-up message
      const followUp: SDKUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Now say goodbye in one word' }],
        },
        session_id: sessionId,
        parent_tool_use_id: null,
      };

      await q.streamInput((async function* () { yield followUp; })());
    } else {
      q.close();
      break;
    }
  }
}
```

### Permission Callback (`canUseTool`)

Control which tools Claude can use:

```typescript
import { query, type PermissionResult } from 'lite-claude-agent-sdk';

const q = query({
  prompt: 'Write "hello" to /tmp/test.txt',
  options: {
    permissionMode: 'default',
    maxTurns: 5,
    canUseTool: async (toolName, input, context): Promise<PermissionResult> => {
      console.log(`Tool requested: ${toolName}`, input);

      // Allow Read, deny Write
      if (toolName === 'Read') {
        return { behavior: 'allow', updatedInput: input };
      }

      if (toolName === 'Write') {
        return { behavior: 'deny', message: 'Writing is not allowed' };
      }

      // Allow by default
      return { behavior: 'allow', updatedInput: input };
    },
  },
});

for await (const msg of q) {
  if (msg.type === 'result') break;
}
```

### Hooks

Intercept and modify tool execution:

```typescript
import { query, type HookCallbackMatcher } from 'lite-claude-agent-sdk';

const hooks: Record<string, HookCallbackMatcher[]> = {
  PreToolUse: [
    {
      matcher: { toolNames: ['Read'] },
      hooks: [
        async (input, toolUseId, context) => {
          console.log('About to use Read tool:', input);
          return { continue: true };
        },
      ],
    },
  ],
  PostToolUse: [
    {
      matcher: {},
      hooks: [
        async (input, toolUseId, context) => {
          console.log('Tool completed:', input.tool_name);
          return { continue: true };
        },
      ],
    },
  ],
};

const q = query({
  prompt: 'Read the package.json file',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
    hooks,
  },
});

for await (const msg of q) {
  if (msg.type === 'result') break;
}
```

### Abort Controller

Cancel queries externally:

```typescript
import { query } from 'lite-claude-agent-sdk';

const abortController = new AbortController();

const q = query({
  prompt: 'Write a long essay',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    abortController,
  },
});

// Abort after 5 seconds
setTimeout(() => {
  abortController.abort();
}, 5000);

for await (const msg of q) {
  if (msg.type === 'result') break;
}
```

### Streaming with Partial Messages

Get token-by-token streaming:

```typescript
import { query } from 'lite-claude-agent-sdk';

const q = query({
  prompt: 'Write a haiku',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    includePartialMessages: true,
    maxTurns: 1,
  },
});

for await (const msg of q) {
  if (msg.type === 'stream_event') {
    // Token-by-token streaming
    const event = msg.event as any;
    if (event.delta?.text) {
      process.stdout.write(event.delta.text);
    }
  }
  if (msg.type === 'result') break;
}
```

### Resume Session

Continue a previous conversation:

```typescript
import { query } from 'lite-claude-agent-sdk';

// First query
const q1 = query({
  prompt: 'Remember the number 42',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
  },
});

let sessionId = '';
for await (const msg of q1) {
  if (msg.type === 'system') {
    sessionId = msg.session_id;
  }
  if (msg.type === 'result') break;
}

// Resume with same session
const q2 = query({
  prompt: 'What number did I ask you to remember?',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    resume: sessionId,
    maxTurns: 1,
  },
});

for await (const msg of q2) {
  if (msg.type === 'result') {
    console.log(msg.result); // Should mention 42
    break;
  }
}
```

## Message Types

The SDK yields various message types during query execution:

| Type | Description |
|------|-------------|
| `system` | Session info (model, session_id, permissionMode) |
| `assistant` | Claude's text response |
| `user` | User message echo |
| `tool_use_summary` | Tool execution summary |
| `tool_progress` | Tool progress updates |
| `stream_event` | Token-by-token streaming (with `includePartialMessages`) |
| `result` | Final result (`success` or `error` subtype) |
| `status` | Status updates |

## Exported Types

All types are re-exported from `@anthropic-ai/claude-agent-sdk` for 100% compatibility:

```typescript
// Core types
export type { Options, PermissionMode, Query, SDKMessage };

// Message types
export type {
  SDKAssistantMessage,
  SDKResultMessage,
  SDKResultSuccess,
  SDKResultError,
  SDKSystemMessage,
  SDKUserMessage,
  SDKToolUseSummaryMessage,
  SDKToolProgressMessage,
  SDKPartialAssistantMessage,
};

// Permission types
export type { CanUseTool, PermissionBehavior, PermissionResult };

// Hook types
export type { HookCallback, HookCallbackMatcher, HookEvent, HookInput };

// MCP types
export type { McpServerConfig, McpServerStatus };

// Model types
export type { ModelInfo, ModelUsage, AccountInfo };

// Output format types
export type { OutputFormat, JsonSchemaOutputFormat };
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `CLAUDE_BINARY` | Path to Claude CLI binary |
| `DEBUG_CLAUDE_AGENT_SDK` | Enable debug output to stderr |
| `DEBUG_HOOKS` | Enable hook debugging |

## Differences from Official SDK

| Feature | Official SDK | Lite SDK |
|---------|--------------|----------|
| Bundle size | ~13MB | ~200KB |
| CLI embedded | Yes | No (uses installed CLI) |
| Type compatibility | Native | Re-exported (100% compatible) |
| Control methods | Full | Most implemented |

**Not yet implemented:**
- `initializationResult()`
- `supportedCommands()`
- `supportedModels()`
- `mcpServerStatus()`
- `accountInfo()`
- `rewindFiles()`
- MCP server management methods
