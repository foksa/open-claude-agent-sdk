# Demo Analysis: hello-world-v2

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/hello-world-v2
**File:** `v2-examples.ts` (128 lines)
**Purpose:** Demonstrate V2 Session API (`unstable_v2_*` functions)

---

## What It Does

Showcases the **V2 API** - a simpler, session-based alternative to the V1 `query()` pattern.

**Key Difference:**
- **V1:** `for await (msg of query({prompt}))` - AsyncGenerator pattern
- **V2:** `session.send()` then `for await (msg of session.stream())` - Separate send/receive

**Four Examples:**
1. **Basic Session** - Simple send/stream pattern
2. **Multi-Turn** - Multiple conversation turns in same session
3. **One-Shot** - Convenience function for single queries
4. **Session Resume** - Persist and resume sessions across restarts

---

## API Used: V2 Session API

### unstable_v2_createSession()

```typescript
await using session = unstable_v2_createSession({
  model: 'sonnet',
  systemPrompt?: string,
  maxTurns?: number,
  // ... other options
});

await session.send('Hello!');
for await (const msg of session.stream()) {
  // Handle messages
}
```

**Key Features:**
- Uses `await using` for automatic cleanup (Resource Management)
- Separate `send()` and `stream()` methods
- Session persists across multiple turns

### unstable_v2_resumeSession()

```typescript
await using session = unstable_v2_resumeSession(sessionId, {
  model: 'sonnet'
});
```

**Use Case:** Resume conversation from previous session

### unstable_v2_prompt()

```typescript
const result = await unstable_v2_prompt('Question?', {
  model: 'sonnet'
});

if (result.subtype === 'success') {
  console.log(result.result);
  console.log(`Cost: $${result.total_cost_usd}`);
}
```

**Use Case:** One-shot queries without session management

---

## Code Examples

### Basic Session

```typescript
async function basicSession() {
  await using session = unstable_v2_createSession({ model: 'sonnet' });
  await session.send('Hello! Introduce yourself in one sentence.');

  for await (const msg of session.stream()) {
    if (msg.type === 'assistant') {
      const text = msg.message.content.find(c => c.type === 'text');
      console.log(`Claude: ${text?.text}`);
    }
  }
}
```

### Multi-Turn Conversation

```typescript
async function multiTurn() {
  await using session = unstable_v2_createSession({ model: 'sonnet' });

  // Turn 1
  await session.send('What is 5 + 3?');
  for await (const msg of session.stream()) {
    // Process first response
  }

  // Turn 2 - Claude remembers context
  await session.send('Multiply that by 2.');
  for await (const msg of session.stream()) {
    // Process second response
  }
}
```

### Session Resume

```typescript
async function sessionResume() {
  let sessionId: string | undefined;

  // First session
  {
    await using session = unstable_v2_createSession({ model: 'sonnet' });
    await session.send('My favorite color is blue. Remember this!');

    for await (const msg of session.stream()) {
      if (msg.type === 'system' && msg.subtype === 'init') {
        sessionId = msg.session_id;
      }
    }
  }

  // Later: Resume and verify Claude remembers
  {
    await using session = unstable_v2_resumeSession(sessionId!, { model: 'sonnet' });
    await session.send('What is my favorite color?');
    // Claude should remember "blue"
  }
}
```

---

## V1 vs V2 Comparison

| Feature | V1 API (query) | V2 API (Session) |
|---------|----------------|------------------|
| **Pattern** | AsyncGenerator | Send/Stream |
| **Multi-turn** | AsyncIterable input | Built-in `.send()` |
| **Session mgmt** | Manual | Built-in |
| **Resume** | Not built-in | `resumeSession()` |
| **One-shot** | `query()` | `prompt()` |
| **Cleanup** | Manual | `await using` |
| **Status** | Stable | Preview (`unstable_`) |

---

## Lite SDK Compatibility

### What's Missing ❌

**All V2 APIs:**
1. `unstable_v2_createSession()` - ❌ Not implemented
2. `unstable_v2_resumeSession()` - ❌ Not implemented
3. `unstable_v2_prompt()` - ❌ Not implemented

**Why:**
- V2 is still **preview** (`unstable_` prefix)
- V1 API is recommended for production
- V2 requires session state management

**Priority:** LOW (wait until V2 becomes stable)

**Effort:** 7-10 days
- Session state tracking
- Resume/fork logic
- Message routing
- Resource cleanup

---

## Recommendations

### Short-term (Phase 0-2)

**Skip V2 implementation.**

Reasons:
1. V2 is preview/unstable
2. V1 API (`query()`) works well for all use cases
3. Only 1 of 7 demos uses V2
4. V1 can achieve same functionality with AsyncIterable input

**Focus on:** Stabilizing V1 API features (hooks, systemPrompt, sessions)

### Long-term (Phase 3+)

**Reconsider after V2 becomes stable.**

If Anthropic removes `unstable_` prefix:
1. Assess if users are requesting V2
2. Determine if V1 can cover the use cases
3. Implement if there's clear demand

---

## V1 Alternative Pattern

You can achieve multi-turn with V1:

```typescript
// V2 pattern
await session.send('Hello');
for await (const msg of session.stream()) { }

// V1 equivalent
const queue = new MessageQueue();
const q = query({ prompt: queue, options: { ... } });

queue.push('Hello');
for await (const msg of q) { }
```

**Difference:** V2 has cleaner API, but V1 is more flexible.

---

## Key Learnings

### 1. V2 is Session-First

V2 API centers around sessions:
- Create session once
- Multiple `send()` calls
- Each `stream()` gives next response
- Auto-cleanup with `await using`

### 2. Resource Management

Uses new JavaScript feature `await using`:
```typescript
await using session = createSession({ ... });
// Automatically calls session.close() when scope exits
```

### 3. One-Shot Convenience

`unstable_v2_prompt()` is simpler for single queries:
```typescript
// No session management needed
const result = await unstable_v2_prompt('Question?');
```

### 4. Session Persistence

Built-in resume:
```typescript
const sessionId = msg.session_id; // From init message
// Later:
const session = unstable_v2_resumeSession(sessionId);
```

---

## Testing Strategy

### Cannot Test Yet

Requires:
1. ❌ `unstable_v2_createSession()` (Phase 3)
2. ❌ `unstable_v2_resumeSession()` (Phase 3)
3. ❌ `unstable_v2_prompt()` (Phase 3)

**Recommendation:** Wait until Phase 3 or V2 becomes stable.

---

## Next Steps

1. ✅ **Document for future reference** (this file)
2. ⏭️ **Skip implementation** - Focus on V1 API
3. 🔍 **Monitor V2 status** - Check if it becomes stable
4. 📋 **Add to Phase 3 roadmap** - If user demand exists

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/hello-world-v2/v2-examples.ts`
- **README:** `README.md` (V1 vs V2 comparison)
- **V2 Docs:** https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview

**Status:** ❌ Not compatible - Requires Phase 3 features

**Priority:** LOW (V2 is preview, V1 covers use cases)
