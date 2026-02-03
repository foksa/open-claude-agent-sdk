# Known Limitations

This document describes known CLI behaviors and limitations discovered during SDK development.

## Hooks

### PostToolUse May Not Fire in Bypass Mode

**Behavior:** When using `permissionMode: 'bypassPermissions'`, the CLI may not send `hook_callback` requests for `PostToolUse` hooks.

**Workaround:** Use default permission mode (or `permissionMode: 'default'`) if you need PostToolUse hooks to fire.

**Example:**
```typescript
// PostToolUse may not fire with bypass mode
const options = {
  permissionMode: 'bypassPermissions',  // PostToolUse hooks may not trigger
  hooks: {
    PostToolUse: [{ hooks: [myCallback] }]
  }
};

// Use default mode instead
const options = {
  // No permissionMode or permissionMode: 'default'
  hooks: {
    PostToolUse: [{ hooks: [myCallback] }]
  }
};
```

### Hook Response Format

**Behavior:** Hooks should return an empty object `{}` to allow operations to continue. The `{ continue: true }` format may work but the official documentation recommends empty object.

**Correct:**
```typescript
async function myHook(input, toolUseId, context) {
  // Allow operation to continue
  return {};
}
```

**For blocking:**
```typescript
async function myBlockingHook(input, toolUseId, context) {
  return {
    hookSpecificOutput: {
      hookEventName: input.hook_event_name,
      permissionDecision: 'deny',
      permissionDecisionReason: 'Blocked by policy'
    }
  };
}
```

### Matcher is Regex, Not Exact String

**Behavior:** The `matcher` field is a regex pattern, not an exact string match. Use anchors for exact matching.

**Example:**
```typescript
// This matches "Read", "ReadFile", "FileReader", etc.
{ matcher: 'Read', hooks: [...] }

// For exact match, use anchors
{ matcher: '^Read$', hooks: [...] }

// For multiple exact matches
{ matcher: '^(Read|Write|Edit)$', hooks: [...] }
```

## Permissions

### canUseTool Requires Non-Bypass Mode

**Behavior:** The `canUseTool` callback is only invoked when NOT using `bypassPermissions` mode. In bypass mode, all tool executions are automatically allowed without calling the callback.

**Example:**
```typescript
// canUseTool will NOT be called
const options = {
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
  canUseTool: async (name, input) => {
    console.log('This never runs');
    return { behavior: 'allow' };
  }
};

// canUseTool WILL be called
const options = {
  // No permissionMode specified (uses default)
  canUseTool: async (name, input) => {
    console.log('This runs for each tool');
    return { behavior: 'allow' };
  }
};
```

## Tool Execution

### Claude May Use Multiple Tools

**Behavior:** When asked to read a file, Claude may use Glob or other tools before using Read. Don't assume a single tool will be called.

**Example:**
```typescript
// Prompt: "Read package.json"
// Claude may call: Glob, then Read
// Or: Read directly
// Or: Bash with ls, then Read
```

**Implication:** When testing hooks, don't assert that specific tools were NOT called. Only verify that expected tools WERE called.

## Session Management

### settingSources Affects Behavior

**Behavior:** The `settingSources` option controls which configuration files are loaded. An empty array `[]` isolates the session from user/project settings.

**Recommended for testing:**
```typescript
const options = {
  settingSources: [],  // No external config - predictable behavior
};
```

---

**Last Updated:** 2026-02-03
