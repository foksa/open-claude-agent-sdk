# Demo Analysis: email-agent

**Source:** https://github.com/anthropics/claude-agent-sdk-demos/tree/main/email-agent
**Purpose:** AI-powered email client with inbox management
**Architecture:** Full-stack Bun app with React frontend + IMAP backend

---

## What It Does

Full-featured email client demonstrating:
1. **IMAP Integration** - Sync emails from Gmail/Outlook
2. **AI Email Agent** - Claude reads, searches, and manages emails
3. **Custom MCP Server** - Email API exposed as MCP tools
4. **Skills & Listeners** - Automated email workflows
5. **Real-time UI** - React interface with WebSockets

**Key Feature:** Shows how to build custom MCP servers and AI-powered email automation.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
│  - Email list view                                       │
│  - Chat interface with Claude                            │
│  - WebSocket connection                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ WebSocket / HTTP
                   ▼
┌─────────────────────────────────────────────────────────┐
│                 Backend (Bun Server)                     │
│  - Express endpoints (/api/emails/*, /api/sync)         │
│  - WebSocket handler                                     │
│  - AgentSession (query with email tools)                │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ├──> SQLite Database (email cache)
                   │
                   ├──> IMAP Server (Gmail/Outlook)
                   │    - Fetch emails
                   │    - Sync messages
                   │    - Search mailbox
                   │
                   └──> Claude CLI (via SDK)
                        - Custom EmailAPI MCP server
                        - Skills (.claude/skills/)
                        - Listeners (email automation)
```

---

## Core Components

### 1. IMAP Manager

**File:** `database/imap-manager.ts`

Handles IMAP connection:
```typescript
class ImapManager {
  async connect(): Promise<void>
  async fetchEmails(options): Promise<Email[]>
  async searchEmails(criteria): Promise<Email[]>
  async disconnect(): Promise<void>
}
```

**Supported Providers:**
- Gmail (imap.gmail.com:993)
- Outlook (outlook.office365.com:993)
- Any IMAP server

### 2. Email Database

**File:** `database/email-db.ts`

SQLite storage for:
- Email messages (headers + body)
- Folders (INBOX, Sent, etc.)
- Labels/tags
- Search indexes

**Why cache?** Faster queries, offline support, reduced IMAP calls

### 3. Email API (MCP Server)

**File:** `agent/email-api.ts` (200 lines)

Custom API exposed to Claude:

```typescript
class EmailAPI {
  // Get inbox (most recent emails)
  async getInbox(options: GetInboxOptions): Promise<EmailMessage[]>

  // Search emails
  async searchEmails(criteria: SearchCriteria): Promise<EmailMessage[]>

  // Gmail query syntax support
  async searchWithGmailQuery(query: string): Promise<EmailMessage[]>

  // Batch fetch by IDs
  async getEmailsByIds(ids: string[]): Promise<EmailMessage[]>
}
```

**Exposed to Claude as MCP tools:**
- `email_getInbox` - Get recent emails
- `email_search` - Search by criteria
- `email_gmailQuery` - Native Gmail search syntax
- `email_batchGet` - Fetch multiple by ID

### 4. Skills & Listeners

**Skills** (`.claude/skills/action-creator/`):
- `send-payment-reminder.ts` - Auto-send payment reminders
- `archive-old-newsletters.ts` - Bulk archive old newsletters
- `forward-bug-report.ts` - Forward bugs to bug tracker

**Listeners** (`.claude/skills/listener-creator/`):
- `ai-classifier.ts` - Auto-categorize emails
- Custom event handlers for inbox changes

### 5. AgentSession

**Pattern:** Similar to simple-chatapp

```typescript
class AgentSession {
  private queue = new MessageQueue();

  constructor() {
    this.outputIterator = query({
      prompt: this.queue,
      options: {
        allowedTools: ['Read', 'Write', 'Bash', 'EmailAPI'],
        systemPrompt: EMAIL_AGENT_PROMPT,
        mcpServers: ['email-api']  // Custom MCP server
      }
    })[Symbol.asyncIterator]();
  }

  sendMessage(content: string) {
    this.queue.push(content);
  }

  async *getOutputStream() {
    while (true) {
      const { value, done } = await this.outputIterator.next();
      if (done) break;
      yield value;
    }
  }
}
```

---

## APIs Used

### 1. Custom MCP Server

**Not in official SDK docs, inferred from demo:**

```typescript
options: {
  mcpServers: ['email-api']  // Name of custom MCP server
}
```

**How it works:**
1. Create MCP server with tools (EmailAPI methods)
2. Register with Claude CLI
3. Tools become available to agent

**In Lite SDK:** ❌ Not implemented (MCP server creation)

### 2. Skills/Commands

```typescript
options: {
  settingSources: ['project']  // Load from .claude/
}
```

**Files loaded:**
- `.claude/skills/**/*.ts` - Reusable workflows
- `.claude/commands/**/*.ts` - Slash commands

**In Lite SDK:** ❌ Phase 1 feature

### 3. systemPrompt

```typescript
const EMAIL_AGENT_PROMPT = `You are an AI email assistant. You can:
- Search and read emails using email_search
- Organize and categorize emails
- Draft responses
- Create automation rules

Available tools:
- email_getInbox - Get recent emails
- email_search - Search by from/to/subject/date
- email_gmailQuery - Use Gmail search syntax
`;

options: {
  systemPrompt: EMAIL_AGENT_PROMPT
}
```

**In Lite SDK:** ❌ Phase 1 feature (HIGH priority)

### 4. AsyncIterable Input

**Same pattern as simple-chatapp:**

```typescript
class MessageQueue {
  async *[Symbol.asyncIterator](): AsyncIterableIterator<UserMessage> {
    // Yield messages as they arrive
  }
}
```

**In Lite SDK:** ✅ Complete

---

## Security Considerations

### From README

> ⚠️ **IMPORTANT**: This is a demo application. It is intended for local development only and should NOT be deployed to production.

**Why:**
1. **Plain text credentials** - Stored in `.env` file
2. **No authentication** - Anyone with access can read emails
3. **No multi-user support** - Single account only
4. **IMAP password in memory** - Not encrypted

**For production:**
- Use OAuth2 instead of passwords
- Add user authentication
- Encrypt credentials at rest
- Implement access controls
- Use secure session management

---

## Gmail Setup

Requires **App Password** (not regular password):

1. Enable 2FA on Google account
2. Go to https://myaccount.google.com/apppasswords
3. Generate app password (16 characters)
4. Use in `.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop  # App password, not regular password
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
```

---

## Lite SDK Compatibility

### What Works Now ✅

1. **query() with AsyncIterable** - ✅ Complete
2. **Message streaming** - ✅ Complete
3. **allowedTools pass-through** - ✅ Complete

### What's Missing ❌

1. **Custom MCP Servers** - ❌ Phase 3 (COMPLEX)
   - Create in-process MCP server
   - Register tools with CLI
   - Route tool calls
   - Effort: 7-10 days

2. **systemPrompt option** - ❌ Phase 1 (HIGH)
   - 1-2 hours

3. **settingSources option** - ❌ Phase 1 (HIGH)
   - Load skills/commands from `.claude/`
   - 2-3 days

4. **mcpServers option** - ❌ Phase 3 (COMPLEX)
   - Register external MCP servers
   - 3-5 days

---

## Implementation Difficulty

### Easy Parts (Already Work)
- AsyncIterable input pattern ✅
- WebSocket integration ✅
- React frontend ✅
- SQLite database ✅
- IMAP connection ✅

### Medium Parts (Phase 1)
- systemPrompt option (1-2 hours)
- settingSources option (2-3 days)

### Hard Parts (Phase 3)
- Custom MCP server creation (7-10 days)
- MCP server registration (3-5 days)
- Tool routing (3-5 days)

**Total effort for full compatibility:** 15-25 days

---

## Simplified Alternative

Without MCP server, could use:

### Direct Tool Implementation

```typescript
// Instead of MCP server, implement tools directly in SDK wrapper
const customTools = {
  email_getInbox: async (input) => {
    const emailAPI = new EmailAPI();
    return await emailAPI.getInbox(input);
  },
  email_search: async (input) => {
    const emailAPI = new EmailAPI();
    return await emailAPI.searchEmails(input);
  }
};

// Pass to hooks
hooks: {
  PreToolUse: [async (input) => {
    if (input.tool_name.startsWith('email_')) {
      const result = await customTools[input.tool_name](input.tool_input);
      return { decision: 'block', result }; // Intercept and handle
    }
    return { continue: true };
  }]
}
```

**Trade-offs:**
- ✅ No MCP server needed
- ✅ Works with Phase 0.5 hooks
- ❌ More boilerplate
- ❌ Not reusable across projects

---

## Key Learnings

### 1. MCP Servers Enable Custom Tools

Instead of only built-in tools (Read, Write, Bash):
- Define custom tools (email_search, email_send)
- Expose domain-specific APIs
- Claude can use like built-in tools

### 2. Skills = Reusable Workflows

`.claude/skills/` directory:
- Store common email tasks
- Reuse across conversations
- Version control workflows

### 3. IMAP + Cache Pattern

Hybrid approach:
- Sync emails to local SQLite
- Fast queries (no IMAP roundtrip)
- Offline support
- Reduced API calls

### 4. Full-Stack Agent Integration

Shows complete pattern:
- Frontend (React + WebSockets)
- Backend (Express + Agent)
- Database (SQLite)
- External API (IMAP)
- Custom Tools (MCP)

**This is production-quality architecture.**

---

## Testing Strategy

### Cannot Fully Test Until Phase 3

Requires:
1. ❌ Custom MCP server creation
2. ❌ MCP server registration
3. ❌ Tool routing

### Can Test Partial Functionality

After Phase 1:
- ✅ AsyncIterable input pattern
- ✅ systemPrompt option
- ✅ settingSources (skills loading)

---

## Recommendations

### Short-term (Phase 0-2)

**Don't attempt to port this demo.**

Reasons:
1. Most complex demo (MCP servers)
2. Requires Phase 3 features
3. Only 1 of 7 demos uses custom MCP
4. Better to focus on simpler demos

### Medium-term (Phase 2)

**Document MCP requirements:**
- What MCP protocol looks like
- How tool registration works
- How tool calls route

### Long-term (Phase 3)

**If user demand exists:**
1. Implement MCP server creation API
2. Add MCP server registration
3. Implement tool routing
4. Port email-agent demo

---

## Production Use Cases

### Email Automation

- Auto-categorize emails
- Send payment reminders
- Forward bug reports
- Archive newsletters
- Unsubscribe from spam

### Email Search

- "Find all emails from John about project X"
- "Show me unread emails with attachments from last week"
- "Search for invoices from 2024"

### Email Drafting

- Generate responses
- Summarize threads
- Extract action items
- Create meeting notes

---

## Next Steps

1. ✅ **Document for future reference** (this file)
2. ⏭️ **Skip for now** - Too complex for Phase 0-2
3. 📋 **Add to Phase 3 roadmap** - MCP server support
4. 🔍 **Research MCP protocol** - How does tool registration work?

---

## Reference

- **Source:** `/tmp/claude-agent-sdk-demos/email-agent/`
- **Key File:** `agent/email-api.ts` (200 lines)
- **README:** `README.md` (security warnings)
- **Architecture:** Full-stack Bun app with IMAP + SQLite + MCP

**Status:** ❌ Not compatible - Requires Phase 3 features (MCP servers)

**Priority:** LOW (complex, only 1 demo uses this pattern)

**Estimated Effort:** 15-25 days (MCP server implementation)
