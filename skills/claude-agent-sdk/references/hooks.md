# Hooks Reference

Hooks intercept agent execution at key points for validation, logging, security, and custom logic.

## Configuration

```typescript
const q = query({
  prompt: "...",
  options: {
    hooks: {
      PreToolUse: [
        { matcher: "Write|Edit", hooks: [validateFilePath] },
        { matcher: "Bash", hooks: [blockDangerousCommands] },
        { hooks: [globalLogger] }  // No matcher = all tools
      ],
      Stop: [{ hooks: [cleanupHandler] }]
    }
  }
});
```

## Hook Events

| Event | Fires When | Has Matcher | Key Fields |
|-------|-----------|-------------|------------|
| `PreToolUse` | Before tool execution (can block/modify) | Yes | `tool_name`, `tool_input` |
| `PostToolUse` | After tool execution | Yes | `tool_name`, `tool_input`, `tool_response` |
| `PostToolUseFailure` | Tool execution fails (TS only) | Yes | `tool_name`, `tool_input`, `error`, `is_interrupt` |
| `PermissionRequest` | Permission dialog triggered (TS only) | Yes | `tool_name`, `tool_input`, `permission_suggestions` |
| `UserPromptSubmit` | User prompt submitted | No | `prompt` |
| `Stop` | Agent execution stops | No | `stop_hook_active` |
| `SubagentStart` | Subagent starts (TS only) | No | `agent_id`, `agent_type` |
| `SubagentStop` | Subagent completes | No | `stop_hook_active` |
| `PreCompact` | Conversation compaction | No | `trigger` (`"manual"` \| `"auto"`), `custom_instructions` |
| `Notification` | Agent status message (TS only) | No | `message`, `title` |
| `SessionStart` | Session begins (TS only, declarative-only) | No | `source` (`"startup"` \| `"resume"` \| `"clear"` \| `"compact"`) |
| `SessionEnd` | Session ends (TS only, declarative-only) | No | `reason` |

**Note:** `SessionStart` and `SessionEnd` are declarative-only — they work in `settings.json` but not via programmatic `hooks` option.

## Matcher Syntax

Matchers are regex patterns that filter by **tool name only** (not file paths or args):

```typescript
{ matcher: "Bash", hooks: [...] }           // Exact tool name
{ matcher: "Write|Edit", hooks: [...] }     // Multiple tools
{ matcher: "^mcp__", hooks: [...] }         // All MCP tools
{ matcher: undefined, hooks: [...] }        // All tools (no filter)
```

Matcher options:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `matcher` | `string \| undefined` | `undefined` | Regex pattern matching tool names |
| `hooks` | `HookCallback[]` | required | Array of callback functions |
| `timeout` | `number` | `60` | Timeout in seconds |

## Callback Signature

```typescript
type HookCallback = (
  input: HookInput,              // Event-specific data
  toolUseID: string | undefined, // Correlate PreToolUse/PostToolUse
  options: { signal: AbortSignal }
) => Promise<HookJSONOutput>;
```

## Common Input Fields

All hook inputs include these base fields:

| Field | Type | Description |
|-------|------|-------------|
| `hook_event_name` | `string` | The hook type (e.g., `"PreToolUse"`) |
| `session_id` | `string` | Current session ID |
| `transcript_path` | `string` | Path to conversation transcript |
| `cwd` | `string` | Current working directory |

## Return Values

Return `{}` (empty object) to allow the operation without changes.

### Top-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `continue` | `boolean` | Whether agent should continue (default: `true`) |
| `stopReason` | `string` | Message shown when `continue: false` |
| `suppressOutput` | `boolean` | Hide stdout from transcript |
| `systemMessage` | `string` | Inject a message into the conversation for Claude to see |

### hookSpecificOutput

For `PreToolUse` — permission decisions:

```typescript
return {
  hookSpecificOutput: {
    hookEventName: input.hook_event_name,  // Required
    permissionDecision: "allow",            // "allow" | "deny" | "ask"
    permissionDecisionReason: "Auto-approved read-only tool",
    updatedInput: { ...input.tool_input, file_path: "/sandbox/file.txt" }
  }
};
```

**Rules:**
- `updatedInput` requires `permissionDecision: "allow"`
- Any `"deny"` from any hook blocks the tool — `"allow"` from others won't override
- Always include `hookEventName` matching the current event

For `PostToolUse`, `UserPromptSubmit`, `SessionStart`, `SubagentStart` — additional context:

```typescript
return {
  hookSpecificOutput: {
    hookEventName: input.hook_event_name,
    additionalContext: "Extra context injected into conversation"
  }
};
```

### Async Hooks

Return `{ async: true }` to run asynchronously without blocking:

```typescript
return { async: true, asyncTimeout: 30 };  // timeout in seconds
```

## Examples

### Block Dangerous Commands

```typescript
const blockDangerous: HookCallback = async (input, toolUseID, { signal }) => {
  const command = (input as PreToolUseHookInput).tool_input?.command as string;
  if (command?.includes("rm -rf /")) {
    return {
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        permissionDecision: "deny",
        permissionDecisionReason: "Dangerous command blocked"
      }
    };
  }
  return {};
};
```

### Auto-Approve Read-Only Tools

```typescript
const autoApproveReads: HookCallback = async (input, toolUseID, { signal }) => {
  if (["Read", "Glob", "Grep"].includes((input as PreToolUseHookInput).tool_name)) {
    return {
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        permissionDecision: "allow",
        permissionDecisionReason: "Read-only tool auto-approved"
      }
    };
  }
  return {};
};
```

### Audit Logger

```typescript
const auditLogger: HookCallback = async (input, toolUseID, { signal }) => {
  if (input.hook_event_name === "PostToolUse") {
    const post = input as PostToolUseHookInput;
    console.log(`[AUDIT] ${post.tool_name}`, post.tool_input);
  }
  return {};
};
```

### Redirect File Writes to Sandbox

```typescript
const sandboxWrites: HookCallback = async (input, toolUseID, { signal }) => {
  const pre = input as PreToolUseHookInput;
  if (pre.tool_name === "Write") {
    return {
      hookSpecificOutput: {
        hookEventName: input.hook_event_name,
        permissionDecision: "allow",
        updatedInput: {
          ...pre.tool_input,
          file_path: `/sandbox${pre.tool_input.file_path}`
        }
      }
    };
  }
  return {};
};
```

## Permission Decision Flow

When multiple hooks or rules apply, evaluation order is:
1. **Deny** — any match = immediate denial
2. **Ask** — checked second
3. **Allow** — checked third
4. **Default to Ask** — if nothing matches
