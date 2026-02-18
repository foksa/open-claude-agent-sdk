# Session Storage API

Manage Claude Code sessions stored on disk. This module is tree-shakeable — import from `open-claude-agent-sdk/storage` to avoid pulling in the rest of the SDK.

```typescript
import {
  listSessions,
  getSessionMetadata,
  renameSession,
  deleteSession,
  getProjectStoragePath,
} from 'open-claude-agent-sdk/storage';
```

## How Claude Code Stores Sessions

Claude Code stores each session as a JSONL file under `~/.claude/projects/`. The project path is encoded by replacing all non-alphanumeric characters with `-`:

```
/Users/foo/my-project → ~/.claude/projects/-Users-foo-my-project/
```

Each session is a `{uuid}.jsonl` file. Some sessions also have a companion directory `{uuid}/` containing subagent transcripts and tool results.

---

## Functions

### `getProjectStoragePath(projectPath)`

Returns the on-disk storage directory for a project.

```typescript
function getProjectStoragePath(projectPath: string): string
```

**Example:**
```typescript
const path = getProjectStoragePath('/Users/foo/my-project');
// → /Users/foo/.claude/projects/-Users-foo-my-project
```

---

### `listSessions(projectPath)`

List all sessions for a project, sorted by last modified (newest first).

```typescript
function listSessions(projectPath: string): Promise<SessionInfo[]>
```

Returns an empty array if the project has no sessions or the storage directory doesn't exist.

**Example:**
```typescript
const sessions = await listSessions('/Users/foo/my-project');

for (const session of sessions) {
  console.log(session.sessionId, session.displayName, session.messageCount);
}
```

---

### `getSessionMetadata(sessionId, projectPath)`

Get rich metadata for a single session without loading the full transcript. Streams the JSONL and extracts key fields.

```typescript
function getSessionMetadata(sessionId: string, projectPath: string): Promise<SessionMetadata>
```

Throws if the session ID is invalid or the session file doesn't exist.

**Example:**
```typescript
const meta = await getSessionMetadata('abcd1234-...', '/Users/foo/my-project');

console.log(meta.firstPrompt);   // "Help me refactor the auth module"
console.log(meta.model);         // "claude-sonnet-4-5-20250929"
console.log(meta.gitBranch);     // "feat/auth-refactor"
console.log(meta.slug);          // "sunny-coding-turtle"
console.log(meta.customTitle);   // "Auth Refactor" (if renamed)
console.log(meta.totalCost);     // total tokens (input + output)
console.log(meta.isAgent);       // true if agent session
```

---

### `renameSession(sessionId, name, projectPath)`

Rename a session by appending a `custom-title` entry to its JSONL file. This matches how Claude CLI's `/rename` command works.

```typescript
function renameSession(sessionId: string, name: string, projectPath: string): Promise<void>
```

Throws if the session ID is invalid or the session file doesn't exist.

**Example:**
```typescript
await renameSession('abcd1234-...', 'Auth Refactor', '/Users/foo/my-project');

// Verify
const sessions = await listSessions('/Users/foo/my-project');
// sessions[n].displayName === 'Auth Refactor'
```

---

### `deleteSession(sessionId, projectPath)`

Delete a session by removing its JSONL file and companion directory (subagents, tool results).

```typescript
function deleteSession(sessionId: string, projectPath: string): Promise<void>
```

Throws if the session ID is invalid or the session file doesn't exist.

**Example:**
```typescript
await deleteSession('abcd1234-...', '/Users/foo/my-project');
```

---

## Types

### `SessionInfo`

Returned by `listSessions()`.

```typescript
interface SessionInfo {
  sessionId: string;      // UUID
  displayName: string;    // Best available name (see priority below)
  createdAt: Date;        // File creation time
  lastModifiedAt: Date;   // File last modified time
  messageCount: number;   // Total JSONL entries
}
```

### `SessionMetadata`

Returned by `getSessionMetadata()`. Extends `SessionInfo`.

```typescript
interface SessionMetadata extends SessionInfo {
  firstPrompt?: string;   // Text of the first user message
  slug?: string;          // Auto-generated three-word name (e.g. "sunny-coding-turtle")
  customTitle?: string;   // User-set name via /rename
  model?: string;         // Model used (e.g. "claude-sonnet-4-5-20250929")
  gitBranch?: string;     // Git branch at session start
  totalCost?: number;     // Total tokens (input + output) across all assistant turns
  isAgent?: boolean;      // Whether this is an agent session
  agentName?: string;     // Agent name if isAgent is true
}
```

### Display Name Priority

The `displayName` field is resolved using this priority order:

1. `agentName` — from agent system entries
2. `customTitle` — user-set via `/rename` or `renameSession()`
3. `firstPrompt` — first 80 characters of the first user message
4. `slug` — auto-generated three-word name
5. `sessionId.slice(0, 8)` — first 8 chars of UUID as fallback

---

## Combining with Query API

Use the storage API alongside the query API for session management workflows:

```typescript
import { query } from 'open-claude-agent-sdk';
import { listSessions, renameSession } from 'open-claude-agent-sdk/storage';

// List recent sessions
const sessions = await listSessions('/path/to/project');
console.log(`${sessions.length} sessions found`);

// Resume the most recent session
const q = query({
  prompt: 'Continue where we left off',
  options: {
    resume: sessions[0].sessionId,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
  },
});

for await (const msg of q) {
  if (msg.type === 'result') break;
}

// Rename it for easy reference
await renameSession(sessions[0].sessionId, 'Morning Session', '/path/to/project');
```
