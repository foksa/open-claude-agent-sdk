# Demo Analysis: hello-world

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/hello-world
**File:** `hello-world.ts` (70 lines)
**Purpose:** Simple introduction to Claude Agent SDK

---

## What It Does

Sends a simple prompt "Hello, Claude! Please introduce yourself in one sentence." and prints Claude's response.

**Key Feature:** Demonstrates PreToolUse hook that restricts `.js`/`.ts` files to only be written in `custom_scripts/` directory.

---

## Code Structure

```typescript
import { query } from '@anthropic-ai/claude-agent-sdk';
import type { HookJSONOutput } from "@anthropic-ai/claude-agent-sdk";

async function main() {
  const q = query({
    prompt: 'Hello, Claude! Please introduce yourself in one sentence.',
    options: {
      maxTurns: 100,
      cwd: path.join(process.cwd(), 'agent'),
      model: "opus",
      executable: "node",
      allowedTools: [ /* 15 tools */ ],
      hooks: {
        PreToolUse: [ /* validation hook */ ]
      }
    }
  });

  for await (const message of q) {
    if (message.type === 'assistant' && message.message) {
      const textContent = message.message.content.find(c => c.type === 'text');
      if (textContent && 'text' in textContent) {
        console.log('Claude says:', textContent.text);
      }
    }
  }
}
```

---

## APIs Used

### query()
```typescript
query({
  prompt: string,
  options: QueryOptions
})
```

**In our SDK:** ✅ Implemented

### QueryOptions

| Option | Value | Purpose | Lite SDK Status |
|--------|-------|---------|-----------------|
| `maxTurns` | 100 | Limit conversation turns | ✅ Complete |
| `cwd` | `'agent/'` | Working directory | ✅ Complete |
| `model` | `"opus"` | Model selection | ✅ Complete |
| `executable` | `"node"` | Node.js binary path | ❌ Not needed (we use CLI) |
| `allowedTools` | Array of 15 tools | Tool whitelist | ✅ Pass-through |
| `hooks` | PreToolUse hook | Tool interception | ⚠️ Untested |

### allowedTools List

```typescript
allowedTools: [
  "Task", "Bash", "Glob", "Grep", "LS", "ExitPlanMode",
  "Read", "Edit", "MultiEdit", "Write", "NotebookEdit",
  "WebFetch", "TodoWrite", "WebSearch", "BashOutput", "KillBash"
]
```

**In our SDK:** ✅ All tools pass-through to CLI (CLI handles execution)

---

## Hook Implementation

### PreToolUse Hook

```typescript
hooks: {
  PreToolUse: [
    {
      matcher: "Write|Edit|MultiEdit",  // Regex pattern
      hooks: [
        async (input: any): Promise<HookJSONOutput> => {
          const toolName = input.tool_name;
          const toolInput = input.tool_input;

          // Check if writing .js or .ts file
          let filePath = '';
          if (toolName === 'Write' || toolName === 'Edit') {
            filePath = toolInput.file_path || '';
          } else if (toolName === 'MultiEdit') {
            filePath = toolInput.file_path || '';
          }

          const ext = path.extname(filePath).toLowerCase();
          if (ext === '.js' || ext === '.ts') {
            const customScriptsPath = path.join(process.cwd(), 'agent', 'custom_scripts');

            if (!filePath.startsWith(customScriptsPath)) {
              // Block the tool call
              return {
                decision: 'block',
                stopReason: `Script files must be written to custom_scripts/`,
                continue: false
              };
            }
          }

          // Allow the tool call
          return { continue: true };
        }
      ]
    }
  ]
}
```

**Hook Pattern:**
1. `matcher` - Regex pattern matching tool names
2. `hooks` - Array of async validation functions
3. Return `{ continue: true }` to allow
4. Return `{ decision: 'block', stopReason: '...', continue: false }` to deny

**In our SDK:** ⚠️ Code exists in `src/core/control.ts:94-134` but **no tests**

---

## Message Handling

### Message Types

```typescript
for await (const message of q) {
  if (message.type === 'assistant' && message.message) {
    // Extract text from assistant message
    const textContent = message.message.content.find(c => c.type === 'text');
    if (textContent && 'text' in textContent) {
      console.log(textContent.text);
    }
  }
}
```

**Message structure:**
```typescript
{
  type: 'assistant',
  message: {
    role: 'assistant',
    content: [
      { type: 'text', text: '...' },
      { type: 'tool_use', ... } // If using tools
    ]
  }
}
```

**In our SDK:** ✅ Complete - Messages pass through from CLI

---

## Lite SDK Compatibility

### What Works Now ✅

1. **query() with string prompt** - ✅ Tested
2. **maxTurns option** - ✅ Tested
3. **model option** - ✅ Tested
4. **cwd option** - ✅ Tested
5. **Message iteration** - ✅ Tested
6. **Message type checking** - ✅ Works
7. **allowedTools pass-through** - ✅ CLI handles

### What Needs Testing ⚠️

1. **PreToolUse hook** - Code exists but no integration test
2. **Hook matcher pattern** - Regex pattern matching
3. **Hook return values** - `{ continue: true }` vs `{ decision: 'block' }`

### What's Not Needed ❌

1. **executable option** - We use Claude CLI, not Node.js subprocess
2. **LS tool** - CLI handles this, we just pass through

---

## Testing Plan

### Phase 0.5: Validate Hooks

Create `tests/integration/demo-hello-world.test.ts`:

```typescript
import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';
import type { HookJSONOutput } from '../../src/types/index.ts';

test('hello-world - PreToolUse hook blocks files', async () => {
  let hookCalled = false;
  let toolBlocked = false;

  for await (const msg of query({
    prompt: 'Create a file test.ts with console.log("hello")',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 3,
      hooks: {
        PreToolUse: [{
          matcher: 'Write|Edit',
          hooks: [
            async (input: any): Promise<HookJSONOutput> => {
              hookCalled = true;

              if (input.tool_name === 'Write') {
                const filePath = input.tool_input.file_path || '';
                if (filePath.endsWith('.ts')) {
                  toolBlocked = true;
                  return {
                    decision: 'block',
                    stopReason: 'Test blocked .ts file',
                    continue: false
                  };
                }
              }

              return { continue: true };
            }
          ]
        }]
      }
    }
  })) {
    if (msg.type === 'result') {
      break;
    }
  }

  expect(hookCalled).toBe(true);
  expect(toolBlocked).toBe(true);
});
```

### Expected Behavior

1. Hook should be called when Write tool is used
2. Hook should receive correct input structure:
   ```typescript
   {
     tool_name: 'Write',
     tool_input: { file_path: '...', content: '...' },
     tool_use_id: '...',
     ...
   }
   ```
3. Returning `{ decision: 'block' }` should prevent tool execution
4. Returning `{ continue: true }` should allow tool execution

---

## Porting Guide

### Minimal Changes Needed

To run this demo with Lite SDK:

```diff
- import { query } from '@anthropic-ai/claude-agent-sdk';
+ import { query } from 'lite-claude-agent-sdk';

options: {
  maxTurns: 100,
  cwd: path.join(process.cwd(), 'agent'),
  model: "opus",
- executable: "node",  // Remove this line (not needed)
  allowedTools: [ /* same list */ ],
  hooks: { /* same hooks */ }
}
```

**Expected result:** Should work identically if hooks are functioning.

---

## Key Learnings

### 1. Hook Validation Pattern

Hooks use matcher regex + validation function:
- Efficient (only calls hook if tool name matches)
- Flexible (can match multiple tools with `|`)
- Powerful (can block + provide reason)

### 2. Tool Interception is Critical

Without PreToolUse hook, agent could:
- Write files anywhere on filesystem
- Execute dangerous commands
- Access sensitive directories

**This is a security feature, not optional!**

### 3. Message Content Structure

Assistant messages have complex content structure:
```typescript
message.message.content: Array<
  | { type: 'text', text: string }
  | { type: 'tool_use', id: string, name: string, input: any }
>
```

Must iterate array to find text content.

---

## Next Steps

1. **Create integration test** for PreToolUse hook
2. **Verify hook blocking** works as expected
3. **Test hook matcher** regex pattern
4. **Port hello-world demo** to `examples/official-demos/`
5. **Document any issues** found during testing

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/hello-world/hello-world.ts`
- **README:** `/tmp/claude-agent-sdk-demos/hello-world/README.md`
- **Our Hook Code:** `src/core/control.ts:94-134`

**Status:** ⚠️ Needs testing to verify compatibility
