# Migration Guide: Official SDK to Open SDK

Migrate from `@anthropic-ai/claude-agent-sdk` to `open-claude-agent-sdk`.

---

## Why Migrate?

- **~27x smaller bundle** (~488KB vs ~13MB)
- **100% type compatible** with official SDK
- **Uses local Claude CLI** (you control the version)
- **Same API** (drop-in replacement for most use cases)

## When NOT to Migrate

- You need self-contained deployment (no CLI dependency)
- You need `rewindFiles()` (no CLI protocol support)
- You need Agent Teams (experimental, not yet supported)
- You need V2 API (`unstable_v2_*`) (experimental preview)

---

## Migration Steps

### Step 1: Install Open SDK

```bash
bun add open-claude-agent-sdk

# Requires Claude CLI
npm install -g @anthropic-ai/claude-code
```

### Step 2: Update Imports

```diff
- import { query } from '@anthropic-ai/claude-agent-sdk';
- import type { SDKMessage, Options } from '@anthropic-ai/claude-agent-sdk';
+ import { query } from 'open-claude-agent-sdk';
+ import type { SDKMessage, Options } from 'open-claude-agent-sdk';
```

That's it. Most code works identically.

### Step 3: Test Your Code

```bash
bun test
```

---

## Examples

All of these work identically between both SDKs — only the import changes.

### One-Shot Query

```typescript
import { query } from 'open-claude-agent-sdk';

for await (const msg of query({
  prompt: 'Write a haiku about coding',
  options: {
    permissionMode: 'default',
    maxTurns: 3
  }
})) {
  if (msg.type === 'assistant') {
    console.log(msg.message.content);
  }
}
```

### Multi-Turn with streamInput()

```typescript
import { query } from 'open-claude-agent-sdk';

const q = query({
  prompt: 'Hello',
  options: { permissionMode: 'default' }
});

for await (const msg of q) {
  if (msg.type === 'assistant') {
    console.log('Assistant:', msg.message.content);

    await q.streamInput(async function* () {
      yield {
        type: 'user',
        message: { role: 'user', content: 'Tell me more' },
        session_id: '',
        parent_tool_use_id: null
      };
    }());
  } else if (msg.type === 'result') {
    break;
  }
}
```

### Permission Callbacks

```typescript
for await (const msg of query({
  prompt: 'List files in current directory',
  options: {
    canUseTool: async (toolName, input) => {
      console.log(`Tool: ${toolName}`, input);
      return { behavior: 'allow' };
    }
  }
})) {
  console.log(msg);
}
```

### Hooks

```typescript
for await (const msg of query({
  prompt: 'Do something',
  options: {
    hooks: {
      PreToolUse: async (input) => {
        console.log('About to call:', input.tool_name);
        return { behavior: 'allow' };
      },
      PostToolUse: async (input) => {
        console.log('Tool result:', input.tool_result);
      }
    }
  }
})) {
  console.log(msg);
}
```

### Control Methods

```typescript
const q = query({
  prompt: 'Do a long task',
  options: { permissionMode: 'default' }
});

setTimeout(() => q.interrupt(), 5000);
setTimeout(() => q.setPermissionMode('plan'), 3000);
setTimeout(() => q.setModel('claude-sonnet-4-5-20250929'), 2000);

for await (const msg of q) {
  console.log(msg);
}
```

---

## Known Differences

### Not Supported

| Feature | Reason |
|---------|--------|
| `rewindFiles()` | No CLI protocol support |
| Agent Teams | Experimental, no env var support |
| V2 API (`unstable_v2_*`) | Experimental preview |
| File checkpointing | No CLI protocol support |
| Context compaction | No CLI protocol support |

See [FEATURES.md](../planning/FEATURES.md) for the full feature matrix.

---

## Troubleshooting

### "Claude CLI not found"

```bash
npm install -g @anthropic-ai/claude-code
which claude
claude --version
```

### Types not resolving

```bash
rm -rf node_modules
bun install
```

### Different behavior than official SDK

1. Check [FEATURES.md](../planning/FEATURES.md) for known differences
2. Verify CLI version: `claude --version`
3. Report issue on [GitHub](https://github.com/foksa/open-claude-agent-sdk/issues)

---

## Rollback

```bash
bun remove open-claude-agent-sdk
bun add @anthropic-ai/claude-agent-sdk
```

Then change imports back to `@anthropic-ai/claude-agent-sdk`.
