# Lite Claude Agent SDK - Options Reference

This document describes all options supported by the `lite-claude-agent-sdk` when calling the `query()` function.

## Basic Usage

```typescript
import { query } from 'lite-claude-agent-sdk';

const result = query({
  prompt: 'What files are in this directory?',
  options: {
    // ... options documented below
  }
});

for await (const message of result) {
  console.log(message);
}
```

---

## Core Options

### `systemPrompt`

**Type:** `string | { type: 'preset'; preset: 'claude_code'; append?: string }`

**Default:** `undefined` (uses CLI default)

Configure the system prompt for the session.

```typescript
// Custom system prompt
options: {
  systemPrompt: 'You are a helpful coding assistant that only writes Python.'
}

// Default Claude Code prompt with additions
options: {
  systemPrompt: {
    type: 'preset',
    preset: 'claude_code',
    append: 'Always explain your reasoning step by step.'
  }
}
```

### `model`

**Type:** `string`

**Default:** CLI default model

The Claude model to use for the query.

```typescript
options: {
  model: 'claude-sonnet-4-5-20250929'
}
```

### `maxTurns`

**Type:** `number`

**Default:** CLI default

Maximum number of conversation turns before the query stops.

```typescript
options: {
  maxTurns: 10
}
```

### `maxBudgetUsd`

**Type:** `number`

**Default:** `undefined` (no limit)

Maximum budget in USD for the query.

```typescript
options: {
  maxBudgetUsd: 5.00  // Stop if cost exceeds $5
}
```

### `cwd`

**Type:** `string`

**Default:** `process.cwd()`

Current working directory for the session.

```typescript
options: {
  cwd: '/path/to/my/project'
}
```

### `resume`

**Type:** `string`

**Default:** `undefined`

Session ID to resume from a previous conversation.

```typescript
options: {
  resume: 'session-abc123'
}
```

---

## Permission & Security Options

### `permissionMode`

**Type:** `'default' | 'acceptEdits' | 'bypassPermissions' | 'plan'`

**Default:** `'default'`

Permission mode for the session.

| Mode | Description |
|------|-------------|
| `'default'` | Standard permission behavior, prompts for approval |
| `'acceptEdits'` | Auto-accept file edit operations |
| `'bypassPermissions'` | Bypass all permission checks (requires `allowDangerouslySkipPermissions`) |
| `'plan'` | Planning mode only (no tool execution) |

```typescript
options: {
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true
}
```

### `allowDangerouslySkipPermissions`

**Type:** `boolean`

**Default:** `false`

Must be set to `true` when using `permissionMode: 'bypassPermissions'`.

### `canUseTool`

**Type:** `CanUseTool`

**Default:** `undefined`

Custom permission callback for controlling tool usage.

```typescript
type CanUseTool = (
  toolName: string,
  input: Record<string, unknown>,
  options: {
    signal: AbortSignal;
    toolUseID: string;
    agentID?: string;
  }
) => Promise<PermissionResult>;

type PermissionResult =
  | { behavior: 'allow'; updatedInput?: Record<string, unknown> }
  | { behavior: 'deny'; message: string };
```

```typescript
options: {
  canUseTool: async (toolName, input, { toolUseID }) => {
    if (toolName === 'Write') {
      return { behavior: 'deny', message: 'Writing not allowed' };
    }
    return { behavior: 'allow' };
  }
}
```

### `allowedTools`

**Type:** `string[]`

**Default:** `undefined`

List of tool names that are auto-allowed without prompting.

```typescript
options: {
  allowedTools: ['Read', 'Glob', 'Grep']
}
```

### `disallowedTools`

**Type:** `string[]`

**Default:** `undefined`

**Status:** NOT YET IMPLEMENTED

List of tool names that are disallowed.

### `tools`

**Type:** `string[] | { type: 'preset'; preset: 'claude_code' }`

**Default:** All Claude Code tools

**Status:** NOT YET IMPLEMENTED

Specify the base set of available built-in tools.

---

## Sandbox Options

### `sandbox`

**Type:** `SandboxSettings`

**Default:** `undefined`

Sandbox settings for command execution isolation.

```typescript
type SandboxSettings = {
  enabled?: boolean;
  autoAllowBashIfSandboxed?: boolean;
  network?: {
    allowedDomains?: string[];
    allowUnixSockets?: string[];
    allowLocalBinding?: boolean;
  };
};
```

```typescript
options: {
  sandbox: {
    enabled: true,
    autoAllowBashIfSandboxed: true
  }
}
```

---

## Hooks

### `hooks`

**Type:** `Partial<Record<HookEvent, HookCallbackMatcher[]>>`

**Default:** `undefined`

Hook callbacks for responding to various events.

**Hook Events:**
- `PreToolUse` - Before a tool is executed
- `PostToolUse` - After a tool executes successfully
- `PostToolUseFailure` - After a tool execution fails
- `UserPromptSubmit` - When a user prompt is submitted
- `SessionStart` / `SessionEnd` - Session lifecycle
- `SubagentStart` / `SubagentStop` - Subagent lifecycle
- `PreCompact` - Before context compaction

```typescript
options: {
  hooks: {
    PreToolUse: [{
      matcher: { toolNames: ['Bash'] },
      hooks: [async (input, toolUseId) => {
        console.log('Executing bash:', input);
        return { continue: true };
      }]
    }]
  }
}
```

---

## Output & Streaming Options

### `includePartialMessages`

**Type:** `boolean`

**Default:** `false`

Include partial/streaming message events in the output.

```typescript
options: {
  includePartialMessages: true
}
```

### `outputFormat`

**Type:** `OutputFormat`

**Default:** `undefined`

Output format configuration for structured responses.

```typescript
options: {
  outputFormat: {
    type: 'json_schema',
    schema: {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        files: { type: 'array', items: { type: 'string' } }
      },
      required: ['summary', 'files']
    }
  }
}
```

---

## Abort & Control Options

### `abortController`

**Type:** `AbortController`

**Default:** `undefined`

Controller for cancelling the query.

```typescript
const controller = new AbortController();

setTimeout(() => controller.abort(), 30000);

const result = query({
  prompt: 'Long running task...',
  options: { abortController: controller }
});
```

---

## Settings & Configuration Options

### `settingSources`

**Type:** `SettingSource[]`

**Default:** `[]` (empty - no filesystem settings loaded)

Control which filesystem settings to load.

| Source | Description |
|--------|-------------|
| `'user'` | Global user settings (`~/.claude/settings.json`) |
| `'project'` | Project settings (`.claude/settings.json`) |
| `'local'` | Local settings (`.claude/settings.local.json`) |

```typescript
options: {
  settingSources: ['user', 'project', 'local']
}
```

---

## Debug Options

### `debug`

**Type:** `boolean`

**Default:** `false`

Enable debug mode for the Claude Code process.

### `debugFile`

**Type:** `string`

**Default:** `undefined`

Write debug logs to a specific file path.

```typescript
options: {
  debugFile: '/tmp/claude-debug.log'
}
```

---

## Advanced Options

### `pathToClaudeCodeExecutable`

**Type:** `string`

**Default:** Auto-detected

Path to the Claude Code executable.

```typescript
options: {
  pathToClaudeCodeExecutable: '/usr/local/bin/claude'
}
```

---

## Not Yet Implemented Options

The following options exist in the official SDK but are not yet implemented:

| Option | Description |
|--------|-------------|
| `disallowedTools` | Block specific tools |
| `tools` | Specify available tools |
| `betas` | Enable beta features (1M context) |
| `forkSession` | Fork session on resume |
| `continue` | Continue most recent session |
| `additionalDirectories` | Additional allowed directories |
| `maxThinkingTokens` | Limit thinking tokens |
| `fallbackModel` | Fallback model on failure |
| `mcpServers` | MCP server configurations |
| `agents` | Custom agent definitions |
| `plugins` | Plugin configurations |
| `enableFileCheckpointing` | Enable file rewind |
| `persistSession` | Control session persistence |
