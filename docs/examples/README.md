# Code Examples

This folder contains runnable code examples extracted from our documentation. These examples demonstrate how to use the Lite Claude Agent SDK.

## Quick Start

```bash
# Install SDK
npm install lite-claude-agent-sdk

# Install Claude CLI (one-time, global)
npm install -g @anthropic-ai/claude-code

# Run examples
bun examples/basic-usage/one-shot.ts
```

---

## Basic Usage

### One-Shot Query
**File:** `basic-usage/one-shot.ts`

Simple query without streaming:

```typescript
import { query } from 'lite-claude-agent-sdk';

for await (const msg of query({
  prompt: 'What is 2+2?',
  options: { maxTurns: 1 }
})) {
  if (msg.type === 'assistant') {
    console.log(extractText(msg));
  }
}
```

### Streaming Response
**File:** `basic-usage/streaming.ts`

Stream tokens as they arrive:

```typescript
for await (const msg of query({
  prompt: 'Write a short poem',
  options: { maxTurns: 1 }
})) {
  if (msg.type === 'assistant') {
    process.stdout.write(extractText(msg));
  }
}
```

### Multi-Turn Conversation
**File:** `basic-usage/multi-turn.ts`

Interactive conversation with follow-ups:

```typescript
async function* conversation() {
  yield "What is TypeScript?";
  await sleep(1000);
  yield "Give me a code example";
}

for await (const msg of query({
  prompt: conversation(),
  options: { maxTurns: 10 }
})) {
  console.log(msg);
}
```

---

## Hooks

### Pre-Tool-Use Hook
**File:** `hooks/pre-tool-use.ts`

Execute code before tools run:

```typescript
query({
  prompt: 'Read package.json',
  options: {
    hooks: {
      'pre-tool-use': async (msg) => {
        console.log(`About to use: ${msg.name}`);
      }
    }
  }
})
```

### Post-Tool-Use Hook
**File:** `hooks/post-tool-use.ts`

Execute code after tools complete:

```typescript
query({
  prompt: 'Read package.json',
  options: {
    hooks: {
      'post-tool-use': async (msg) => {
        console.log(`Completed: ${msg.name}`);
      }
    }
  }
})
```

---

## Advanced

### Structured Output
**File:** `advanced/structured-output.ts`

Extract structured data from responses:

```typescript
const schema = z.object({
  name: z.string(),
  age: z.number()
});

for await (const msg of query({
  prompt: 'Extract: John is 30 years old',
  options: { maxTurns: 1 }
})) {
  if (msg.type === 'result') {
    const data = schema.parse(JSON.parse(extractText(msg)));
    console.log(data);
  }
}
```

### Budget Tracking
**File:** `advanced/budget-tracking.ts`

Monitor cost and stop when budget is exceeded:

```typescript
for await (const msg of query({
  prompt: 'Complex task',
  options: {
    maxBudgetUsd: 0.50,
    maxTurns: 20
  }
})) {
  if (msg.type === 'result') {
    console.log(`Cost: $${msg.total_cost_usd}`);
  }
}
```

### Isolation Modes
**File:** `advanced/isolation-modes.ts`

Control what config gets loaded:

```typescript
// Fast, clean query (no user config)
query({
  prompt: 'Hello',
  options: { isolation: 'minimal' }
})

// Development mode (with CLAUDE.md)
query({
  prompt: 'Create a test',
  options: { isolation: 'project' }
})
```

---

## Migration

### From Official SDK
**File:** `migration/from-official-sdk.ts`

Drop-in replacement example:

```typescript
// Before
import { query } from '@anthropic-ai/claude-agent-sdk';

// After
import { query } from 'lite-claude-agent-sdk';

// Everything else stays the same!
```

### Feature Comparison
**File:** `migration/comparison.ts`

Side-by-side comparison of Official vs Lite SDK.

---

## Running Examples

### Using Bun (Recommended)

```bash
bun examples/basic-usage/one-shot.ts
```

### Using Node.js

```bash
node --loader ts-node/esm examples/basic-usage/one-shot.ts
```

### Using TypeScript Directly

```bash
ts-node examples/basic-usage/one-shot.ts
```

---

## Requirements

- **Claude CLI:** `npm install -g @anthropic-ai/claude-code`
- **API Key:** Set `ANTHROPIC_API_KEY` environment variable
- **Runtime:** Bun or Node.js 18+

---

## Contributing

Have a useful example? Submit a PR!

**Guidelines:**
- Keep examples < 50 lines
- Include comments
- Make them runnable
- Follow existing patterns

---

**Last Updated:** 2026-02-02
