# Implementation Guide for Phase 1 Features

**Last Updated:** 2026-02-02
**Purpose:** Detailed implementation instructions for Phase 1 features
**For:** Future developers implementing the roadmap

---

## Table of Contents

1. [Feature 1: Structured Outputs](#feature-1-structured-outputs)
2. [Feature 2: Extended Thinking Parser](#feature-2-extended-thinking-parser)
3. [Feature 3: Skills & Commands Loader](#feature-3-skills--commands-loader)
4. [Feature 4: Budget Tracking](#feature-4-budget-tracking)
5. [Testing Strategy](#testing-strategy)
6. [Demo Updates](#demo-updates)

---

## Feature 1: Structured Outputs

**Effort:** 2-3 days
**Priority:** HIGH
**Complexity:** LOW (pass-through to CLI)

### Overview

Add JSON schema validation for structured responses. The CLI already supports this via `--json-schema` flag.

### Implementation Steps

#### Step 1: Export Types (5 minutes)

**File:** `src/types/index.ts`

```typescript
// Add these exports to the existing type exports section
export type {
  OutputFormat,
  JsonSchemaOutputFormat,
} from '@anthropic-ai/claude-agent-sdk';
```

**Verification:**
```bash
# Should not error
bun run typecheck
```

---

#### Step 2: Update CLI Args Builder (15 minutes)

**File:** `src/core/spawn.ts`

Add after the `cwd` option handling:

```typescript
// Output format (structured outputs)
if (options.outputFormat) {
  if (options.outputFormat.type === 'json_schema') {
    args.push('--json-schema', JSON.stringify(options.outputFormat.schema));
  }
}
```

**Full context:**
```typescript
export function buildCliArgs(options: Options & { prompt?: string }): string[] {
  const args = [
    '--print',
    '--output-format', 'stream-json',
    '--input-format', 'stream-json',
    '--verbose'
  ];

  // ... existing options ...

  // CWD
  if (options.cwd) {
    args.push('--cwd', options.cwd);
  }

  // Output format (structured outputs) ⭐ NEW
  if (options.outputFormat) {
    if (options.outputFormat.type === 'json_schema') {
      args.push('--json-schema', JSON.stringify(options.outputFormat.schema));
    }
  }

  return args;
}
```

**Verification:**
```bash
bun test tests/integration/query.test.ts
```

---

#### Step 3: Create Integration Tests (1-2 hours)

**File:** `tests/integration/structured-outputs.test.ts`

```typescript
/**
 * Test structured outputs (JSON schema validation)
 */

import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';

test('structured outputs - simple object', async () => {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' },
      email: { type: 'string' }
    },
    required: ['name', 'age']
  };

  let resultMessage: any = null;

  for await (const msg of query({
    prompt: 'Extract data for: John Doe, age 30, email john@example.com',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      outputFormat: {
        type: 'json_schema',
        schema
      }
    }
  })) {
    if (msg.type === 'result') {
      resultMessage = msg;
      break;
    }
  }

  expect(resultMessage).toBeTruthy();
  expect(resultMessage.type).toBe('result');

  // Parse structured output from message content
  const content = resultMessage.result?.message?.content;
  if (Array.isArray(content)) {
    const textContent = content.find((c: any) => c.type === 'text');
    if (textContent) {
      const data = JSON.parse(textContent.text);
      expect(data).toHaveProperty('name');
      expect(data).toHaveProperty('age');
      expect(typeof data.name).toBe('string');
      expect(typeof data.age).toBe('number');
    }
  }
});

test('structured outputs - array of objects', async () => {
  const schema = {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            completed: { type: 'boolean' }
          },
          required: ['title', 'priority', 'completed']
        }
      }
    },
    required: ['tasks']
  };

  let resultMessage: any = null;

  for await (const msg of query({
    prompt: 'Create 3 tasks: Write docs (high, not done), Fix bug (medium, done), Review PR (low, not done)',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      outputFormat: {
        type: 'json_schema',
        schema
      }
    }
  })) {
    if (msg.type === 'result') {
      resultMessage = msg;
      break;
    }
  }

  expect(resultMessage).toBeTruthy();

  const content = resultMessage.result?.message?.content;
  if (Array.isArray(content)) {
    const textContent = content.find((c: any) => c.type === 'text');
    if (textContent) {
      const data = JSON.parse(textContent.text);
      expect(data.tasks).toBeArray();
      expect(data.tasks.length).toBeGreaterThanOrEqual(3);

      for (const task of data.tasks) {
        expect(task).toHaveProperty('title');
        expect(task).toHaveProperty('priority');
        expect(task).toHaveProperty('completed');
        expect(['low', 'medium', 'high']).toContain(task.priority);
        expect(typeof task.completed).toBe('boolean');
      }
    }
  }
});

test('structured outputs - nested objects', async () => {
  const schema = {
    type: 'object',
    properties: {
      user: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          address: {
            type: 'object',
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              zip: { type: 'string' }
            },
            required: ['city']
          }
        },
        required: ['name']
      }
    },
    required: ['user']
  };

  let resultMessage: any = null;

  for await (const msg of query({
    prompt: 'Create user data: Jane Smith, 123 Main St, New York, 10001',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      outputFormat: {
        type: 'json_schema',
        schema
      }
    }
  })) {
    if (msg.type === 'result') {
      resultMessage = msg;
      break;
    }
  }

  expect(resultMessage).toBeTruthy();

  const content = resultMessage.result?.message?.content;
  if (Array.isArray(content)) {
    const textContent = content.find((c: any) => c.type === 'text');
    if (textContent) {
      const data = JSON.parse(textContent.text);
      expect(data.user).toHaveProperty('name');
      expect(data.user.address).toHaveProperty('city');
    }
  }
});
```

**Run tests:**
```bash
bun test tests/integration/structured-outputs.test.ts
```

---

#### Step 4: Update Documentation (30 minutes)

**File:** `README.md`

Add to features section:

```markdown
### Structured Outputs

Validate responses with JSON schemas:

```typescript
import { query } from 'lite-claude-agent-sdk';

for await (const msg of query({
  prompt: 'Extract user data from this text',
  options: {
    outputFormat: {
      type: 'json_schema',
      schema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          age: { type: 'number' }
        },
        required: ['name']
      }
    }
  }
})) {
  if (msg.type === 'result') {
    const data = JSON.parse(msg.result.message.content[0].text);
    console.log(data); // { name: "...", age: ... }
  }
}
```
```

---

### Testing Checklist

- [ ] Types exported correctly
- [ ] CLI args built correctly
- [ ] Simple object schema works
- [ ] Array schema works
- [ ] Nested object schema works
- [ ] Invalid schema rejected
- [ ] Documentation updated
- [ ] Demo updated (optional)

---

## Feature 2: Extended Thinking Parser

**Effort:** 1 day
**Priority:** HIGH
**Complexity:** LOW (parse existing field)

### Overview

Parse and expose thinking blocks from `stream_event` messages. The CLI already includes thinking in messages, we just need to extract it.

### Implementation Steps

#### Step 1: Research Message Format (30 minutes)

First, capture actual message to see structure:

```typescript
// Create test file: test-thinking.ts
import { query } from './src/api/query.ts';

for await (const msg of query({
  prompt: 'Solve: What is 2+2? Think step by step.',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    includePartialMessages: true,
    model: 'claude-opus-4-5' // Opus has extended thinking
  }
})) {
  console.log(JSON.stringify(msg, null, 2));
}
```

Run:
```bash
bun test-thinking.ts > thinking-output.json
```

Look for thinking fields in `stream_event` or message content.

---

#### Step 2: Add Thinking Message Type (15 minutes)

**File:** `src/types/index.ts`

Check if thinking types already exported. If not, check official SDK for type name:

```bash
grep -r "thinking" node_modules/@anthropic-ai/claude-agent-sdk/sdk.d.ts
```

Export if needed:

```typescript
export type {
  // ... existing exports ...
  SDKThinkingMessage, // If it exists
} from '@anthropic-ai/claude-agent-sdk';
```

---

#### Step 3: Parse Thinking Blocks (1-2 hours)

**File:** `src/api/QueryImpl.ts`

Modify `startReading()` to extract thinking:

```typescript
private async startReading() {
  try {
    if (!this.process.stdout) {
      throw new Error('Process stdout is null');
    }

    const rl = createInterface({
      input: this.process.stdout,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      if (!line.trim()) continue;

      try {
        const msg = JSON.parse(line) as StdoutMessage;

        if (msg.type === 'control_request') {
          await this.controlHandler.handleControlRequest(msg);
        } else {
          // Check for thinking content ⭐ NEW
          if (msg.type === 'stream_event' && (msg as any).thinking) {
            // Yield thinking as separate message
            this.messageQueue.push({
              type: 'thinking',
              content: (msg as any).thinking
            } as any);
          }

          // Also yield original message
          this.messageQueue.push(msg as SDKMessage);
          this.notifyWaiters();
        }
      } catch (parseError) {
        console.error('Failed to parse line:', line, parseError);
      }
    }
  } catch (err: any) {
    this.error = err;
  } finally {
    this.done = true;
    this.notifyWaiters();
  }
}
```

**Note:** The exact field name and structure depends on CLI output format. Adjust based on Step 1 research.

---

#### Step 4: Create Integration Test (1 hour)

**File:** `tests/integration/thinking.test.ts`

```typescript
import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';

test('extended thinking - parse thinking blocks', async () => {
  let thinkingMessages = [];
  let assistantMessages = [];

  for await (const msg of query({
    prompt: 'Solve: What is 15 * 23? Think step by step.',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      includePartialMessages: true,
      model: 'claude-opus-4-5' // Extended thinking available in Opus
    }
  })) {
    if (msg.type === 'thinking') {
      thinkingMessages.push(msg);
    } else if (msg.type === 'assistant') {
      assistantMessages.push(msg);
    }
  }

  // Should have thinking blocks
  expect(thinkingMessages.length).toBeGreaterThan(0);
  expect(assistantMessages.length).toBeGreaterThan(0);

  console.log('Thinking blocks:', thinkingMessages.length);
  console.log('First thinking:', thinkingMessages[0].content.substring(0, 100));
});

test('thinking blocks - interleaved with regular messages', async () => {
  const messageOrder = [];

  for await (const msg of query({
    prompt: 'Explain quantum computing in simple terms',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      includePartialMessages: true,
      model: 'claude-opus-4-5'
    }
  })) {
    messageOrder.push(msg.type);

    if (msg.type === 'result') {
      break;
    }
  }

  console.log('Message order:', messageOrder);

  // Should have mix of thinking and assistant messages
  expect(messageOrder.includes('thinking')).toBe(true);
  expect(messageOrder.includes('assistant')).toBe(true);
});
```

---

#### Step 5: Update Documentation (30 minutes)

**File:** `README.md`

```markdown
### Extended Thinking

Access Claude's step-by-step reasoning:

```typescript
for await (const msg of query({
  prompt: 'Solve this complex problem',
  options: {
    model: 'claude-opus-4-5', // Extended thinking in Opus
    includePartialMessages: true
  }
})) {
  if (msg.type === 'thinking') {
    console.log('🤔 Thinking:', msg.content);
  } else if (msg.type === 'assistant') {
    console.log('💬 Response:', msg.message.content);
  }
}
```
```

---

### Testing Checklist

- [ ] Thinking blocks parsed correctly
- [ ] Thinking type exported
- [ ] Messages interleaved properly
- [ ] Works with streaming
- [ ] Documentation updated
- [ ] Demo shows thinking (optional)

---

## Feature 3: Skills & Commands Loader

**Effort:** 2-3 days
**Priority:** HIGH
**Complexity:** MEDIUM (file loading + validation)

### Overview

Load project-specific skills and commands from `.claude/` directory via `--setting-sources` flag.

### Implementation Steps

#### Step 1: Add settingSources Support (30 minutes)

**File:** `src/core/spawn.ts`

Add after outputFormat:

```typescript
// Setting sources (for skills/commands)
if (options.settingSources && options.settingSources.length > 0) {
  args.push('--setting-sources', options.settingSources.join(','));
}
```

**Verification:**
```bash
bun run typecheck
bun test tests/integration/query.test.ts
```

---

#### Step 2: Create Test Fixtures (1 hour)

**Directory:** `tests/fixtures/.claude/`

```bash
mkdir -p tests/fixtures/.claude/skills
mkdir -p tests/fixtures/.claude/commands
```

**File:** `tests/fixtures/.claude/skills/test-skill.md`

```markdown
# Test Skill

This is a test skill for integration testing.

## Usage

When the user asks to "use test skill", respond with "Test skill activated!".

## Example

User: Use test skill
Assistant: Test skill activated! I'm now using the test skill.
```

**File:** `tests/fixtures/.claude/commands/test-command.md`

```markdown
# Test Command

Command: /test

## Description

A test command for integration testing.

## Behavior

When invoked, output: "Test command executed!"
```

---

#### Step 3: Create Integration Tests (2-3 hours)

**File:** `tests/integration/skills.test.ts`

```typescript
import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';
import path from 'node:path';

const fixturesDir = path.join(import.meta.dir, '../fixtures');

test('skills - load from .claude/skills/', async () => {
  let assistantResponse = '';

  for await (const msg of query({
    prompt: 'Use the test skill',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      cwd: fixturesDir,
      settingSources: ['project'] // Load from .claude/
    }
  })) {
    if (msg.type === 'assistant') {
      const content = msg.message.content;
      if (Array.isArray(content)) {
        const text = content.find(c => c.type === 'text');
        if (text) {
          assistantResponse += text.text;
        }
      }
    }
  }

  // Should mention the skill
  expect(assistantResponse.toLowerCase()).toContain('test skill');
});

test('commands - load from .claude/commands/', async () => {
  let assistantResponse = '';

  for await (const msg of query({
    prompt: 'What commands are available?',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      cwd: fixturesDir,
      settingSources: ['project']
    }
  })) {
    if (msg.type === 'assistant') {
      const content = msg.message.content;
      if (Array.isArray(content)) {
        const text = content.find(c => c.type === 'text');
        if (text) {
          assistantResponse += text.text;
        }
      }
    }
  }

  // Should mention the test command
  expect(assistantResponse.toLowerCase()).toContain('/test');
});

test('settings sources - multiple sources', async () => {
  for await (const msg of query({
    prompt: 'Hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      cwd: fixturesDir,
      settingSources: ['user', 'project', 'local']
    }
  })) {
    if (msg.type === 'result') {
      expect(msg.result).toBeTruthy();
      break;
    }
  }
});

test('settings sources - missing .claude/ directory', async () => {
  // Should not crash if .claude/ doesn't exist
  const tmpDir = '/tmp/no-claude-dir';

  for await (const msg of query({
    prompt: 'Hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      cwd: tmpDir,
      settingSources: ['project']
    }
  })) {
    if (msg.type === 'result') {
      expect(msg.result).toBeTruthy();
      break;
    }
  }
});
```

---

#### Step 4: Documentation (30 minutes)

**File:** `README.md`

```markdown
### Skills & Commands

Load project-specific workflows:

```typescript
// Create .claude/skills/my-skill.md in your project
for await (const msg of query({
  prompt: 'Use my custom skill',
  options: {
    settingSources: ['project'], // Load from .claude/
    cwd: '/path/to/project'
  }
})) {
  console.log(msg);
}
```

**Skill format** (`.claude/skills/my-skill.md`):
```markdown
# My Skill

Description of what this skill does.

## Usage

Instructions for Claude on how to use this skill.
```
```

---

### Testing Checklist

- [ ] --setting-sources flag added
- [ ] Skills load from .claude/skills/
- [ ] Commands load from .claude/commands/
- [ ] Multiple sources supported
- [ ] Missing directory handled gracefully
- [ ] Documentation updated
- [ ] Fixtures created

---

## Feature 4: Budget Tracking

**Effort:** 2-3 days
**Priority:** HIGH
**Complexity:** MEDIUM (parsing + state management)

### Overview

Track token usage and cost in real-time, implement `accountInfo()` method.

### Implementation Steps

#### Step 1: Add Usage Tracking State (1 hour)

**File:** `src/api/QueryImpl.ts`

Add private fields:

```typescript
export class QueryImpl implements Query {
  // ... existing fields ...

  // Usage tracking ⭐ NEW
  private usageStats = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    costUsd: 0,
    requestCount: 0
  };

  private currentModel: string;
  private maxBudget: number | undefined;

  constructor(params: { prompt: string | AsyncIterable<SDKUserMessage>; options?: Options }) {
    // ... existing constructor ...

    // Track model and budget ⭐ NEW
    this.currentModel = params.options?.model || 'claude-sonnet-4-5';
    this.maxBudget = params.options?.maxBudgetUsd;
  }
}
```

---

#### Step 2: Parse Usage from Result Messages (2 hours)

**File:** `src/api/QueryImpl.ts`

Modify `startReading()`:

```typescript
private async startReading() {
  // ... existing code ...

  for await (const line of rl) {
    if (!line.trim()) continue;

    try {
      const msg = JSON.parse(line) as StdoutMessage;

      if (msg.type === 'control_request') {
        await this.controlHandler.handleControlRequest(msg);
      } else {
        // Parse usage stats ⭐ NEW
        if (msg.type === 'result') {
          this.parseUsageStats(msg as any);
        }

        this.messageQueue.push(msg as SDKMessage);
        this.notifyWaiters();
      }
    } catch (parseError) {
      console.error('Failed to parse line:', line, parseError);
    }
  }
}

/**
 * Parse usage statistics from result message ⭐ NEW
 */
private parseUsageStats(msg: any) {
  if (msg.result?.usage) {
    const usage = msg.result.usage;

    this.usageStats.inputTokens += usage.input_tokens || 0;
    this.usageStats.outputTokens += usage.output_tokens || 0;
    this.usageStats.totalTokens += (usage.input_tokens || 0) + (usage.output_tokens || 0);
    this.usageStats.requestCount++;

    // Calculate cost based on model
    const cost = this.calculateCost(usage, this.currentModel);
    this.usageStats.costUsd += cost;

    // Check budget limit
    if (this.maxBudget && this.usageStats.costUsd > this.maxBudget) {
      console.warn(`Budget exceeded: $${this.usageStats.costUsd} > $${this.maxBudget}`);
    }
  }
}

/**
 * Calculate cost based on model pricing ⭐ NEW
 */
private calculateCost(usage: any, model: string): number {
  // Model pricing (per million tokens)
  // Source: https://www.anthropic.com/pricing
  const pricing: Record<string, { input: number; output: number }> = {
    'claude-opus-4-5': { input: 15, output: 75 },
    'claude-sonnet-4-5': { input: 3, output: 15 },
    'claude-haiku-4-5': { input: 0.8, output: 4 },
    // Add more models as needed
  };

  const modelPricing = pricing[model] || pricing['claude-sonnet-4-5']; // Default to Sonnet

  const inputCost = (usage.input_tokens / 1_000_000) * modelPricing.input;
  const outputCost = (usage.output_tokens / 1_000_000) * modelPricing.output;

  return inputCost + outputCost;
}
```

---

#### Step 3: Implement accountInfo() (30 minutes)

**File:** `src/api/QueryImpl.ts`

Replace stub:

```typescript
/**
 * Get account info and usage statistics ⭐ IMPLEMENT
 */
async accountInfo(): Promise<any> {
  return {
    model: this.currentModel,
    usage: {
      inputTokens: this.usageStats.inputTokens,
      outputTokens: this.usageStats.outputTokens,
      totalTokens: this.usageStats.totalTokens,
      costUsd: this.usageStats.costUsd,
      requests: this.usageStats.requestCount
    },
    budget: {
      maxBudgetUsd: this.maxBudget,
      remainingUsd: this.maxBudget
        ? this.maxBudget - this.usageStats.costUsd
        : undefined,
      percentUsed: this.maxBudget
        ? (this.usageStats.costUsd / this.maxBudget) * 100
        : undefined
    }
  };
}
```

---

#### Step 4: Create Tests (2 hours)

**File:** `tests/integration/budget.test.ts`

```typescript
import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';

test('budget tracking - parse usage stats', async () => {
  const q = query({
    prompt: 'Count to 5',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1
    }
  });

  for await (const msg of q) {
    if (msg.type === 'result') {
      const info = await q.accountInfo();

      expect(info.usage.inputTokens).toBeGreaterThan(0);
      expect(info.usage.outputTokens).toBeGreaterThan(0);
      expect(info.usage.totalTokens).toBeGreaterThan(0);
      expect(info.usage.costUsd).toBeGreaterThan(0);
      expect(info.usage.requests).toBe(1);

      console.log('Usage:', info.usage);
      break;
    }
  }
});

test('budget tracking - cumulative across turns', async () => {
  const q = query({
    prompt: 'Hello',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true
    }
  });

  let turnCount = 0;

  for await (const msg of q) {
    if (msg.type === 'assistant') {
      turnCount++;

      if (turnCount === 1) {
        // Send second message
        await q.streamInput(async function* () {
          yield {
            type: 'user',
            message: { role: 'user', content: 'Tell me more' },
            session_id: '',
            parent_tool_use_id: null
          };
        }());
      } else if (turnCount === 2) {
        const info = await q.accountInfo();

        // Should have stats from 2 turns
        expect(info.usage.requests).toBeGreaterThanOrEqual(2);
        expect(info.usage.totalTokens).toBeGreaterThan(0);

        console.log('After 2 turns:', info.usage);
        break;
      }
    }
  }
});

test('budget tracking - budget limits', async () => {
  const q = query({
    prompt: 'Write a short story',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      maxBudgetUsd: 0.10 // 10 cents
    }
  });

  for await (const msg of q) {
    if (msg.type === 'result') {
      const info = await q.accountInfo();

      expect(info.budget.maxBudgetUsd).toBe(0.10);
      expect(info.budget.remainingUsd).toBeDefined();
      expect(info.budget.percentUsed).toBeDefined();

      console.log('Budget:', info.budget);
      break;
    }
  }
});

test('budget tracking - cost calculation accuracy', async () => {
  const q = query({
    prompt: 'What is 2+2?',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      model: 'claude-sonnet-4-5'
    }
  });

  for await (const msg of q) {
    if (msg.type === 'result') {
      const info = await q.accountInfo();

      // Sonnet pricing: $3/M input, $15/M output
      const expectedCost =
        (info.usage.inputTokens / 1_000_000) * 3 +
        (info.usage.outputTokens / 1_000_000) * 15;

      expect(info.usage.costUsd).toBeCloseTo(expectedCost, 6);

      console.log('Cost calculation:', {
        actual: info.usage.costUsd,
        expected: expectedCost
      });
      break;
    }
  }
});
```

---

#### Step 5: Documentation (30 minutes)

**File:** `README.md`

```markdown
### Budget Tracking

Monitor costs in real-time:

```typescript
const q = query({
  prompt: 'Do something',
  options: {
    maxBudgetUsd: 1.00 // $1 limit
  }
});

for await (const msg of q) {
  if (msg.type === 'result') {
    const info = await q.accountInfo();

    console.log('Usage:', info.usage);
    // {
    //   inputTokens: 150,
    //   outputTokens: 300,
    //   totalTokens: 450,
    //   costUsd: 0.0135,
    //   requests: 1
    // }

    console.log('Budget:', info.budget);
    // {
    //   maxBudgetUsd: 1.00,
    //   remainingUsd: 0.9865,
    //   percentUsed: 1.35
    // }
  }
}
```
```

---

### Testing Checklist

- [ ] Usage stats parsed correctly
- [ ] Cumulative tracking works
- [ ] Cost calculation accurate
- [ ] Budget limits enforced
- [ ] accountInfo() returns correct data
- [ ] Multiple models supported
- [ ] Documentation updated
- [ ] Demo shows budget (optional)

---

## Testing Strategy

### Test Pyramid

```
        E2E (Playwright)
       /               \
      /   Integration    \
     /     (Bun Test)     \
    /                      \
   /        Unit            \
  /      (Minimal)           \
 --------------------------------
```

### Integration Tests (Primary)

Focus on integration tests:
- Actual CLI subprocess
- Real message parsing
- NDJSON snapshots
- End-to-end workflows

**Location:** `tests/integration/`

**Run:** `bun test tests/integration/`

### Snapshot Testing

For deterministic tests:

```typescript
test('feature - snapshot', async () => {
  const messages = [];

  for await (const msg of query({ ... })) {
    messages.push(msg);
  }

  // Write snapshot
  await Bun.write(
    'tests/snapshots/feature.jsonl',
    messages.map(m => JSON.stringify(m)).join('\n')
  );

  // Or compare
  const expected = await Bun.file('tests/snapshots/feature.jsonl').text();
  const actual = messages.map(m => JSON.stringify(m)).join('\n');
  expect(actual).toBe(expected);
});
```

### E2E Tests (Secondary)

For demo app:

**Location:** `tests/e2e/`
**Tool:** Playwright
**Run:** `bun test:e2e`

---

## Demo Updates

### Add Feature Tabs

**File:** `examples/comparison-demo/index.html`

Add tabs:
```html
<div class="tabs">
  <button class="tab active" data-tab="simple">Simple</button>
  <button class="tab" data-tab="streaming">Streaming</button>
  <button class="tab" data-tab="structured">Structured</button> <!-- NEW -->
  <button class="tab" data-tab="thinking">Thinking</button> <!-- NEW -->
  <button class="tab" data-tab="budget">Budget</button> <!-- NEW -->
</div>
```

### Add Feature Examples

**File:** `examples/comparison-demo/client.ts`

```typescript
// Structured outputs example
async function runStructuredExample() {
  const schema = {
    type: 'object',
    properties: {
      name: { type: 'string' },
      age: { type: 'number' }
    },
    required: ['name']
  };

  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Extract: John Doe, age 30',
      outputFormat: { type: 'json_schema', schema }
    })
  });

  // ... render response ...
}

// Thinking example
async function runThinkingExample() {
  const response = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: 'Solve: 15 * 23',
      model: 'claude-opus-4-5',
      includePartialMessages: true
    })
  });

  const reader = response.body.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const msg = JSON.parse(new TextDecoder().decode(value));

    if (msg.type === 'thinking') {
      displayThinking(msg.content);
    }
  }
}

// Budget example
async function runBudgetExample() {
  // ... make query ...

  const info = await q.accountInfo();
  displayBudget(info.usage, info.budget);
}
```

---

## Completion Checklist

### Phase 1 Complete When:

- [ ] **Feature 1: Structured Outputs**
  - [ ] Types exported
  - [ ] CLI args working
  - [ ] 3+ integration tests passing
  - [ ] Documentation updated

- [ ] **Feature 2: Extended Thinking**
  - [ ] Thinking parsed correctly
  - [ ] 2+ integration tests passing
  - [ ] Documentation updated

- [ ] **Feature 3: Skills & Commands**
  - [ ] settingSources working
  - [ ] 4+ integration tests passing
  - [ ] Test fixtures created
  - [ ] Documentation updated

- [ ] **Feature 4: Budget Tracking**
  - [ ] Usage tracking working
  - [ ] accountInfo() implemented
  - [ ] 4+ integration tests passing
  - [ ] Cost calculation accurate
  - [ ] Documentation updated

- [ ] **General**
  - [ ] All tests passing (16+ total)
  - [ ] Bundle size < 500KB
  - [ ] Type checking passes
  - [ ] Demo updated (optional)
  - [ ] README reflects new features
  - [ ] ROADMAP.md updated

---

**Last Updated:** 2026-02-02
**See Also:** [ROADMAP.md](../planning/ROADMAP.md), [FEATURES.md](../planning/FEATURES.md)
