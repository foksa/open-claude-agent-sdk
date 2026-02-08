# Usage Patterns Reference

Common patterns for multi-turn conversations, streaming, sessions, permissions, structured output, and gotchas.

## Multi-Turn with `streamInput()`

Send follow-up messages to an active query:

```typescript
const q = query({
  prompt: "Analyze this codebase",
  options: { allowedTools: ["Read", "Glob", "Grep"] }
});

// Process messages in background
const processor = (async () => {
  for await (const msg of q) {
    if (msg.type === "assistant") console.log("Claude:", msg.message);
    if (msg.type === "result") break;
  }
})();

// Send follow-up after some time
await new Promise(r => setTimeout(r, 5000));
q.streamInput({
  type: "user",
  message: { role: "user", content: "Now focus on the auth module" }
});

await processor;
```

## Multi-Turn with AsyncIterable Input

Use an async generator for full control over message timing:

```typescript
async function* generateMessages() {
  yield {
    type: "user" as const,
    message: { role: "user" as const, content: "Read the README" }
  };

  // Wait for user input, external events, etc.
  const userResponse = await getUserInput();

  yield {
    type: "user" as const,
    message: { role: "user" as const, content: userResponse }
  };
}

for await (const message of query({
  prompt: generateMessages(),
  options: { maxTurns: 10 }
})) {
  if (message.type === "result") console.log(message.result);
}
```

## `canUseTool` Callback

Custom permission handling for runtime approval:

```typescript
for await (const message of query({
  prompt: "Deploy the application",
  options: {
    canUseTool: async (toolName, input, { signal, suggestions }) => {
      // Auto-approve read-only tools
      if (["Read", "Glob", "Grep"].includes(toolName)) {
        return { behavior: "allow", updatedInput: input };
      }

      // Handle clarifying questions
      if (toolName === "AskUserQuestion") {
        const answers = await presentQuestionsToUser(input.questions);
        return {
          behavior: "allow",
          updatedInput: { questions: input.questions, answers }
        };
      }

      // Prompt user for dangerous operations
      const approved = await askUserApproval(toolName, input);
      if (approved) {
        return { behavior: "allow", updatedInput: input };
      }
      return { behavior: "deny", message: "User rejected this action" };
    }
  }
})) { ... }
```

### PermissionResult Types

Allow:
```typescript
{ behavior: "allow", updatedInput: toolInput, updatedPermissions?: PermissionUpdate[] }
```

Deny:
```typescript
{ behavior: "deny", message: "Reason shown to Claude", interrupt?: boolean }
```

### Modifying Tool Input

You can change tool input when allowing:
```typescript
// Redirect file writes to sandbox
if (toolName === "Write") {
  return {
    behavior: "allow",
    updatedInput: { ...input, file_path: `/sandbox${input.file_path}` }
  };
}
```

## Structured Output

Get validated JSON from agent workflows:

```typescript
import { z } from "zod";

const TodoSchema = z.object({
  todos: z.array(z.object({
    text: z.string(),
    file: z.string(),
    line: z.number(),
  })),
  total_count: z.number()
});

for await (const message of query({
  prompt: "Find all TODO comments in the codebase",
  options: {
    outputFormat: {
      type: "json_schema",
      schema: z.toJSONSchema(TodoSchema)
    }
  }
})) {
  if (message.type === "result" && message.subtype === "success") {
    const parsed = TodoSchema.safeParse(message.structured_output);
    if (parsed.success) console.log(parsed.data);
  }
}
```

Error subtypes for structured output:
- `"success"` — `structured_output` contains validated JSON
- `"error_max_structured_output_retries"` — agent couldn't produce valid output

## Session Management

### Capture Session ID

```typescript
let sessionId: string | undefined;

for await (const message of query({ prompt: "..." })) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
}
```

### Resume a Session

```typescript
for await (const message of query({
  prompt: "Continue where we left off",
  options: { resume: sessionId }
})) { ... }
```

### Fork a Session

Create a branch without modifying the original:

```typescript
for await (const message of query({
  prompt: "Try a different approach",
  options: { resume: sessionId, forkSession: true }
})) { ... }
```

### Continue Most Recent Session

```typescript
for await (const message of query({
  prompt: "Keep going",
  options: { continue: true }
})) { ... }
```

## AbortController Cancellation

```typescript
const controller = new AbortController();

// Cancel after 30 seconds
setTimeout(() => controller.abort(), 30_000);

for await (const message of query({
  prompt: "Long task...",
  options: { abortController: controller }
})) { ... }
```

## Token Streaming

Enable `includePartialMessages` to receive tokens as they're generated:

```typescript
for await (const message of query({
  prompt: "Explain databases",
  options: { includePartialMessages: true }
})) {
  if (message.type === "stream_event") {
    const event = message.event;
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
    }
  }
}
```

Stream event flow:
```
stream_event (message_start)
stream_event (content_block_start)    - text or tool_use
stream_event (content_block_delta)    - text_delta or input_json_delta chunks
stream_event (content_block_stop)
stream_event (message_delta)
stream_event (message_stop)
assistant                              - complete message
... tool executes ...
result                                 - final result
```

## Streaming UI Pattern

Show tool usage indicators while streaming text:

```typescript
let inTool = false;

for await (const message of query({
  prompt: "Find TODO comments",
  options: { includePartialMessages: true }
})) {
  if (message.type === "stream_event") {
    const event = message.event;
    if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
      process.stdout.write(`\n[Using ${event.content_block.name}...]`);
      inTool = true;
    } else if (event.type === "content_block_delta" && event.delta.type === "text_delta" && !inTool) {
      process.stdout.write(event.delta.text);
    } else if (event.type === "content_block_stop" && inTool) {
      console.log(" done");
      inTool = false;
    }
  }
}
```

## `await using` Cleanup

TypeScript's explicit resource management for automatic cleanup:

```typescript
{
  await using q = query({ prompt: "...", options: { ... } });
  for await (const message of q) { ... }
}
// Query automatically cleaned up when block exits
```

## Common Gotchas

### Empty systemPrompt saves tokens
When `systemPrompt` is undefined, the SDK sends `""` (empty string) to the CLI. Omitting it entirely causes the CLI to use a default prompt that costs ~73% more tokens. Always let the SDK handle it — don't manually set it to `undefined`.

### Hook return values matter
Returning `{}` from a hook means "continue" (allow). To block, you must explicitly return `permissionDecision: "deny"`. Returning `undefined` or forgetting to return causes errors.

### `updatedInput` requires `permissionDecision`
When modifying tool input in a PreToolUse hook, you must also include `permissionDecision: "allow"`. Without it, the updated input is ignored.

### `SessionStart`/`SessionEnd` are declarative-only
These hooks only work when defined in `settings.json`, not via the programmatic `hooks` option. This is a known limitation.

### `bypassPermissions` propagates to subagents
Subagents spawned with `permissionMode: "bypassPermissions"` inherit this mode and it cannot be overridden. They get full system access.

### Include `"project"` in `settingSources` for CLAUDE.md
By default, `settingSources` is `[]` (empty), meaning CLAUDE.md files are NOT loaded. You must include `"project"` to load them:
```typescript
settingSources: ["project"]
```

### Streaming limitations
- `maxThinkingTokens` disables `StreamEvent` messages — you only get complete messages
- Structured output JSON appears only in `ResultMessage.structured_output`, not as streaming deltas

### AskUserQuestion in tools array
If you specify a custom `tools` array, include `"AskUserQuestion"` for Claude to ask clarifying questions. It's available by default only when `tools` is not specified.
