# Demo Analysis: simple-chatapp

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/simple-chatapp
**Purpose:** Chat application with React frontend + Express backend
**Architecture:** WebSocket-based real-time chat

---

## What It Does

Full-stack chat application demonstrating:
1. **Real-time communication** via WebSockets
2. **Multi-turn conversations** using AsyncIterable input pattern
3. **Session management** with multiple concurrent chats
4. **Streaming responses** from Claude

**Key Feature:** Shows how to use AsyncIterable input for continuous conversation (chat pattern).

---

## Architecture

```
Frontend (React + Vite)          Backend (Express + WS)          Claude CLI
     │                                 │                             │
     │  WebSocket Connection           │                             │
     ├─────────────────────────────────>│                             │
     │                                 │                             │
     │  Send Message                   │                             │
     ├─────────────────────────────────>│                             │
     │                                 │  Push to MessageQueue       │
     │                                 ├─────────────────────────────>│
     │                                 │                             │
     │                                 │  Query Response             │
     │                                 │<─────────────────────────────│
     │  Stream Response                │                             │
     │<─────────────────────────────────│                             │
```

---

## Core Code: AgentSession

**File:** `server/ai-client.ts`

### MessageQueue Implementation

```typescript
class MessageQueue {
  private messages: UserMessage[] = [];
  private waiting: ((msg: UserMessage) => void) | null = null;
  private closed = false;

  push(content: string) {
    const msg: UserMessage = {
      type: "user",
      message: { role: "user", content }
    };

    if (this.waiting) {
      // Someone waiting - give it immediately
      this.waiting(msg);
      this.waiting = null;
    } else {
      // No one waiting - queue it
      this.messages.push(msg);
    }
  }

  async *[Symbol.asyncIterator](): AsyncIterableIterator<UserMessage> {
    while (!this.closed) {
      if (this.messages.length > 0) {
        yield this.messages.shift()!;
      } else {
        // Wait for next message
        yield await new Promise<UserMessage>((resolve) => {
          this.waiting = resolve;
        });
      }
    }
  }

  close() {
    this.closed = true;
  }
}
```

**Pattern:** Custom async iterable that bridges push-based input (WebSocket) with pull-based iteration (SDK).

**In our SDK:** ✅ This pattern should work - we support AsyncIterable input

---

### AgentSession Implementation

```typescript
export class AgentSession {
  private queue = new MessageQueue();
  private outputIterator: AsyncIterator<any> | null = null;

  constructor() {
    // Pass queue as async iterable input
    this.outputIterator = query({
      prompt: this.queue as any,  // AsyncIterable<UserMessage>
      options: {
        maxTurns: 100,
        model: "opus",
        allowedTools: [
          "Bash", "Read", "Write", "Edit",
          "Glob", "Grep", "WebSearch", "WebFetch"
        ],
        systemPrompt: SYSTEM_PROMPT
      }
    })[Symbol.asyncIterator]();
  }

  // Send message (push to queue)
  sendMessage(content: string) {
    this.queue.push(content);
  }

  // Get output stream (pull from iterator)
  async *getOutputStream() {
    while (true) {
      const { value, done } = await this.outputIterator.next();
      if (done) break;
      yield value;
    }
  }

  close() {
    this.queue.close();
  }
}
```

**Key insight:** Decouples input (push via sendMessage) from output (pull via getOutputStream).

---

## APIs Used

### query() with AsyncIterable

```typescript
query({
  prompt: asyncIterable,  // <-- AsyncIterable<UserMessage>
  options: { ... }
})
```

**In our SDK:** ✅ Complete - Tested in `tests/integration/multi-turn.test.ts`

### systemPrompt Option

```typescript
const SYSTEM_PROMPT = `You are a helpful AI assistant. You can help users with:
- Answering questions
- Writing and editing text
- Coding and debugging
- Analysis and research
- Creative tasks

Be concise but thorough in your responses.`;

options: {
  systemPrompt: SYSTEM_PROMPT
}
```

**In our SDK:** ❌ Not implemented - Need to add `--system-prompt` flag

**CLI Support:** Check if CLI supports this:
```bash
claude --help | grep system-prompt
```

---

### allowedTools

```typescript
allowedTools: [
  "Bash",
  "Read",
  "Write",
  "Edit",
  "Glob",
  "Grep",
  "WebSearch",
  "WebFetch"
]
```

**Different from hello-world:**
- ❌ No Task tool (single-agent, not multi-agent)
- ❌ No TodoWrite
- ❌ No MultiEdit, NotebookEdit

**In our SDK:** ✅ Pass-through (CLI handles)

---

## Message Flow

### Client → Server → SDK

```typescript
// Client sends via WebSocket
ws.send(JSON.stringify({ type: 'message', content: 'Hello' }));

// Server pushes to queue
session.sendMessage('Hello');

// Queue yields to SDK
async *[Symbol.asyncIterator]() {
  yield { type: 'user', message: { role: 'user', content: 'Hello' } };
}
```

### SDK → Server → Client

```typescript
// Server pulls from SDK
for await (const msg of session.getOutputStream()) {
  if (msg.type === 'assistant') {
    // Send to client via WebSocket
    ws.send(JSON.stringify({
      type: 'assistant',
      content: extractText(msg)
    }));
  }
}
```

---

## Lite SDK Compatibility

### What Works Now ✅

1. **AsyncIterable input pattern** - ✅ Tested in multi-turn tests
2. **query() with AsyncIterable** - ✅ Complete
3. **Message streaming** - ✅ Complete
4. **allowedTools** - ✅ Pass-through

### What's Missing ❌

1. **systemPrompt option** - ❌ Not implemented
   - Need to add to Options type
   - Need to pass `--system-prompt` to CLI
   - Priority: HIGH (needed for Phase 1)

2. **Session persistence** - ❌ Not implemented
   - Demo loses all chats on server restart
   - Would need resume/fork features (Phase 2)

---

## Implementation Plan

### Phase 1: Add systemPrompt

**Step 1:** Check CLI support
```bash
claude --help | grep -A 2 system-prompt
```

**Step 2:** Add to spawn.ts
```typescript
// In buildCliArgs():
if (options.systemPrompt) {
  args.push('--system-prompt', options.systemPrompt);
}
```

**Step 3:** Test
```typescript
test('systemPrompt - custom prompt', async () => {
  for await (const msg of query({
    prompt: 'Hello',
    options: {
      systemPrompt: 'You are a pirate. Always respond like a pirate.',
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1
    }
  })) {
    if (msg.type === 'assistant') {
      const text = extractText(msg);
      expect(text.toLowerCase()).toContain('arr'); // Pirate speak
    }
  }
});
```

**Effort:** 1-2 hours

---

## Testing Plan

### Test 1: MessageQueue Pattern

```typescript
test('simple-chatapp - MessageQueue pattern', async () => {
  class TestQueue {
    private messages: Array<any> = [];
    private waiting: ((msg: any) => void) | null = null;

    push(content: string) {
      const msg = {
        type: 'user',
        message: { role: 'user', content },
        session_id: '',
        parent_tool_use_id: null
      };
      if (this.waiting) {
        this.waiting(msg);
        this.waiting = null;
      } else {
        this.messages.push(msg);
      }
    }

    async *[Symbol.asyncIterator]() {
      while (true) {
        if (this.messages.length > 0) {
          yield this.messages.shift()!;
        } else {
          yield await new Promise((resolve) => {
            this.waiting = resolve;
          });
        }
      }
    }
  }

  const queue = new TestQueue();

  // Send first message
  queue.push('Hello');

  const q = query({
    prompt: queue as any,
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 5
    }
  });

  let responseCount = 0;

  for await (const msg of q) {
    if (msg.type === 'assistant') {
      responseCount++;

      // Send follow-up after first response
      if (responseCount === 1) {
        queue.push('Tell me more');
      }
    }

    if (msg.type === 'result' && responseCount >= 2) {
      break;
    }
  }

  expect(responseCount).toBeGreaterThanOrEqual(2);
});
```

### Test 2: systemPrompt Option

```typescript
test('simple-chatapp - systemPrompt option', async () => {
  for await (const msg of query({
    prompt: 'What is your purpose?',
    options: {
      systemPrompt: 'You are a helpful AI assistant focused on coding.',
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1
    }
  })) {
    if (msg.type === 'assistant') {
      const text = extractText(msg);
      // Should mention coding based on system prompt
      expect(text.toLowerCase()).toContain('cod');
      break;
    }
  }
});
```

---

## Porting Guide

### To Run with Lite SDK

```diff
- import { query } from '@anthropic-ai/claude-agent-sdk';
+ import { query } from 'lite-claude-agent-sdk';

// AgentSession stays the same!
// Just change the import
```

**Prerequisites:**
1. ✅ AsyncIterable input support (already working)
2. ❌ systemPrompt option (need to add)

**Estimated compatibility:** 95% after adding systemPrompt

---

## Production Considerations

From the demo README:

### 1. Isolate Agent SDK
> "Move SDK into separate container/service for security"

**Why:** Agent has access to Bash, filesystem, web requests

**For Lite SDK:** Same concern applies - thin wrapper still has full CLI access

### 2. Persistent Storage
> "Replace in-memory ChatStore with database"

**Current:** All chats lost on restart

**For Lite SDK:** Would need:
- Session persistence (Phase 2)
- Transcript syncing (Phase 2)
- resume feature (Phase 2)

### 3. Authentication
> "Add user auth"

**Not SDK concern:** Application-level feature

---

## Key Learnings

### 1. AsyncIterable Pattern is Powerful

Push-based input (WebSocket) → Queue → AsyncIterable → SDK

This pattern decouples:
- User input timing (real-time)
- SDK processing (async)
- Output streaming (backpressure handling)

### 2. systemPrompt is Essential

Can't build chat app without customizing the system prompt.

**Priority:** HIGH for Phase 1

### 3. Session Management is Hard

Without persistence:
- Lose all chats on restart
- Can't resume conversations
- Can't handle server scaling

**For Future:** Phase 2 session features critical for production

---

## Next Steps

1. **Add systemPrompt option** (1-2 hours)
   - Add to Options type
   - Add to buildCliArgs()
   - Add integration test

2. **Test MessageQueue pattern** with Lite SDK
   - Verify AsyncIterable works as expected
   - Test multi-turn via queue

3. **Port simple-chatapp** to `examples/official-demos/`
   - After systemPrompt is added
   - Verify it works end-to-end

4. **Document limitations** vs official SDK
   - No session persistence yet
   - Need Phase 2 for production use

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/simple-chatapp/`
- **Key File:** `server/ai-client.ts` (108 lines)
- **README:** `README.md`
- **Our Multi-turn Test:** `tests/integration/multi-turn.test.ts`

**Status:** ⚠️ 95% compatible, needs systemPrompt option
