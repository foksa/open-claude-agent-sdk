# Claude Code Session Storage

Research into how Claude Code persists sessions to disk, the file format used, and how sessions are resumed. This informs the design of a "read session from storage" feature for the SDK.

## Full `~/.claude/` Directory Layout

Verified on local machine (CLI v2.1.42, Feb 2026):

```
~/.claude/
  ├── history.jsonl             # Global prompt log (every user input across all projects)
  ├── settings.json             # User permissions and preferences
  ├── stats-cache.json          # Aggregate statistics (session counts, model usage, costs)
  ├── cache/                    # CLI cache
  ├── debug/                    # Debug logs (1900+ files)
  ├── downloads/                # Downloaded files
  ├── file-history/             # Per-session file change tracking (for undo/checkpoint)
  │   └── <session-uuid>/
  │       └── <hash>@v2         # File snapshots
  ├── ide/                      # IDE integration state
  ├── paste-cache/              # Clipboard/paste cache
  ├── plans/                    # Plan mode markdown files (named like "cheerful-juggling-curry.md")
  ├── plugins/                  # Installed plugins
  ├── session-env/              # Per-session environment variables
  │   └── <session-uuid>/
  ├── shell-snapshots/          # Shell state snapshots (zsh)
  ├── tasks/                    # Team task lists (per session)
  │   └── <session-uuid>/
  ├── teams/                    # Team configurations
  │   └── default/
  ├── telemetry/                # Usage telemetry
  ├── todos/                    # Per-agent todo lists (1900+ files)
  │   └── <session-uuid>-agent-<uuid>.json
  └── projects/                 # Per-project session data (see below)
```

## Project Directory Structure

There are **two path encoding schemes** depending on CLI version:

### Old Style (pre-v2.1.x): Nested directories

```
~/.claude/projects/Users/djordjeradakovic/Work/open-claude-agent-sdk/
  ├── CLAUDE.md
  └── sessions/
      ├── <uuid-1>              # Session file (no extension)
      └── <uuid-2>
```

### New Style (v2.1.x+): Dash-separated flat directories

```
~/.claude/projects/-Users-djordjeradakovic-Work-open-claude-agent-sdk/
  ├── <uuid-1>.jsonl            # Session file (.jsonl extension)
  ├── <uuid-1>/                 # Session companion directory
  │   ├── subagents/            # Subagent transcripts
  │   │   ├── agent-a5db73d.jsonl
  │   │   └── agent-acompact-0bda75.jsonl  # Compacted agent sessions
  │   └── tool-results/         # Large tool outputs stored on disk
  │       └── toolu_01Kiy3nf....txt
  ├── <uuid-2>.jsonl
  ├── <uuid-2>/
  │   └── subagents/
  └── memory/                   # Auto-memory for the project
      └── MEMORY.md
```

The new encoding replaces `/` with `-` and prefixes with `-`:
- `/Users/djordjeradakovic/Work/my-project` -> `-Users-djordjeradakovic-Work-my-project`

Both styles may coexist on the same machine. The old-style sessions are from older CLI versions; the new-style is from v2.1.x+.

### `sessions-index.json` (Per-Project Session Index)

Some project directories contain a `sessions-index.json` that indexes all sessions:

```json
{
  "version": 1,
  "entries": [
    {
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "fullPath": "/Users/user/.claude/projects/-Users-user-project/550e8400-....jsonl",
      "fileMtime": 1738665600000,
      "firstPrompt": "Help me refactor the authentication module...",
      "customTitle": "Auth Refactor",
      "summary": "Help me refactor the authentication module...",
      "messageCount": 42,
      "created": "2026-02-04T09:09:00Z",
      "modified": "2026-02-04T11:30:00Z",
      "gitBranch": "feature/auth",
      "projectPath": "/Users/user/my-project",
      "isSidechain": false
    }
  ],
  "originalPath": "/Users/user/my-project"
}
```

**Known issues (Feb 2026):**
- Since v2.1.31, `sessions-index.json` stopped being updated
- Newer CLI versions scan `.jsonl` files directly instead of reading the index
- Not all projects have this file; some were never indexed
- GitHub issues: [#18897](https://github.com/anthropics/claude-code/issues/18897), [#22205](https://github.com/anthropics/claude-code/issues/22205), [#23614](https://github.com/anthropics/claude-code/issues/23614)

## `history.jsonl` -- Global Prompt Log

Located at `~/.claude/history.jsonl`. Each line is a JSON object logging every user input across all projects:

```json
{
  "display": "look up the latest version of the package on npm",
  "pastedContents": {},
  "timestamp": 1770754386722,
  "project": "/Users/djordjeradakovic/Work/open-claude-agent-sdk",
  "sessionId": "6fc09192-8047-491e-87cb-fc65e51b07da"
}
```

| Field | Type | Description |
|---|---|---|
| `display` | `string` | The user's prompt text |
| `pastedContents` | `object` | Any pasted content (usually `{}`) |
| `timestamp` | `number` | Unix timestamp in milliseconds |
| `project` | `string` | Absolute path to the project directory |
| `sessionId` | `string` (UUID) | Links to the session file |

This file grows indefinitely (observed: 347 lines / 83KB on this machine). It's used by `--continue` to find the most recent session for a project.

## `stats-cache.json` -- Aggregate Statistics

```json
{
  "version": 2,
  "lastComputedDate": "2026-02-17",
  "totalSessions": 1807,
  "totalMessages": 28703,
  "firstSessionDate": "2026-02-10T19:52:31.561Z",
  "totalSpeculationTimeSavedMs": 0,
  "dailyActivity": [
    { "date": "...", "messageCount": 0, "sessionCount": 0, "toolCallCount": 0 }
  ],
  "dailyModelTokens": [
    { "date": "...", "tokensByModel": { ... } }
  ],
  "modelUsage": {
    "claude-haiku-4-5-20251001": { ... },
    "claude-opus-4-6": { ... },
    "claude-sonnet-4-5-20250929": { ... }
  },
  "longestSession": {
    "duration": 0,
    "messageCount": 0,
    "sessionId": "...",
    "timestamp": "..."
  },
  "hourCounts": { "10": 0, "11": 0, ... }
}
```

## Session File Format -- Two Versions

### Old Format (pre-v2.1.x): `TranscriptEntry` Envelope

Files named `<uuid>` (no extension) inside a `sessions/` subdirectory.

Each line has the envelope:

```json
{
  "type": "TranscriptEntry",
  "version": 1,
  "data": { ... }
}
```

Three entry types: `human`, `assistant`, `tool_result`.

#### `human` entry

```json
{
  "type": "TranscriptEntry",
  "version": 1,
  "data": {
    "type": "human",
    "message": {
      "role": "user",
      "content": [{ "type": "text", "text": "look up the latest version..." }]
    },
    "cwd": "/Users/djordjeradakovic/Work/open-claude-agent-sdk",
    "sessionId": "00f7e89e-4d3f-406a-9cfa-be3f0e05e38f",
    "timestamp": "2025-06-01T15:18:17.555Z"
  }
}
```

#### `assistant` entry

```json
{
  "type": "TranscriptEntry",
  "version": 1,
  "data": {
    "type": "assistant",
    "message": {
      "id": "msg_01LMqSjJ2Xd1VCHTwKo2Dxia",
      "type": "message",
      "role": "assistant",
      "content": [
        { "type": "text", "text": "I'll check the latest version..." },
        { "type": "tool_use", "id": "toolu_...", "name": "Bash", "input": { ... } }
      ],
      "model": "claude-sonnet-4-20250514",
      "stop_reason": "tool_use",
      "usage": { "input_tokens": 11831, "output_tokens": 98 }
    },
    "costUSD": 0.037,
    "durationMs": 3055,
    "requestId": "req_011CPLvUVaVFZ73GQGJsD2fz",
    "cwd": "/Users/djordjeradakovic/Work/open-claude-agent-sdk",
    "sessionId": "00f7e89e-4d3f-406a-9cfa-be3f0e05e38f",
    "timestamp": "2025-06-01T15:18:21.024Z"
  }
}
```

#### `tool_result` entry

```json
{
  "type": "TranscriptEntry",
  "version": 1,
  "data": {
    "type": "tool_result",
    "tool_use_id": "toolu_01GFWzxT3jAFAPMG4DX2aTYL",
    "content": [{ "type": "text", "text": "0.9.1\n" }],
    "is_error": false,
    "cwd": "/Users/djordjeradakovic/Work/open-claude-agent-sdk",
    "sessionId": "00f7e89e-4d3f-406a-9cfa-be3f0e05e38f",
    "timestamp": "2025-06-01T15:18:21.035Z"
  }
}
```

### New Format (v2.1.x+): Flat Entries with UUID Threading

Files named `<uuid>.jsonl` directly in the project directory (no `sessions/` subdirectory).

Entries are **flat** (no `TranscriptEntry` envelope). Each line is a JSON object with a `type` field directly at the top level, plus threading via `uuid` and `parentUuid`.

#### Entry Types (6 total)

| Type | Count (typical session) | Description |
|---|---|---|
| `progress` | Most frequent | Tool execution progress updates |
| `assistant` | Many | Claude responses with tool calls |
| `user` | Many | User messages |
| `file-history-snapshot` | Several | File change checkpoints |
| `system` | Several | Turn durations, compact boundaries |
| `queue-operation` | Few | Multi-turn queue operations |

#### Common Fields on All Entries (new format)

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Entry type (`user`, `assistant`, `system`, `progress`, etc.) |
| `uuid` | `string` (UUID) | Unique ID for this entry |
| `parentUuid` | `string \| null` | UUID of the parent entry (conversation threading) |
| `sessionId` | `string` (UUID) | Session this entry belongs to |
| `cwd` | `string` | Working directory |
| `gitBranch` | `string` | Git branch (e.g. `"HEAD"`, `"main"`) |
| `slug` | `string` | Human-readable session name (e.g. `"sunny-squishing-catmull"`) |
| `version` | `string` | CLI version (e.g. `"2.1.42"`) |
| `timestamp` | `string` (ISO 8601) | When the entry was created |
| `isSidechain` | `boolean` | Whether this is a sub-agent session |
| `userType` | `string` | Always `"external"` for user-facing sessions |

#### `user` entry (new format)

```json
{
  "parentUuid": null,
  "isSidechain": false,
  "userType": "external",
  "cwd": "/Users/djordjeradakovic/Work/symdion-new",
  "sessionId": "c10690f1-f50d-4ab9-ad5d-ecbe08889426",
  "version": "2.1.42",
  "gitBranch": "HEAD",
  "slug": "sunny-squishing-catmull",
  "type": "user",
  "message": {
    "role": "user",
    "content": "Implement the following plan..."
  },
  "uuid": "638e8847-11b5-45f9-ab31-dbdea42da032",
  "timestamp": "2026-02-14T15:33:52.010Z"
}
```

Note: `message.content` can be a plain string (new) or array of content blocks (old).

#### `assistant` entry (new format)

```json
{
  "parentUuid": "638e8847-...",
  "isSidechain": false,
  "userType": "external",
  "cwd": "/Users/djordjeradakovic/Work/symdion-new",
  "sessionId": "c10690f1-...",
  "version": "2.1.42",
  "gitBranch": "HEAD",
  "slug": "sunny-squishing-catmull",
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      { "type": "text", "text": "I'll start implementing..." },
      { "type": "tool_use", "id": "toolu_...", "name": "Write", "input": { ... } }
    ]
  },
  "requestId": "req_...",
  "uuid": "49db8416-...",
  "timestamp": "2026-02-14T15:34:02.000Z"
}
```

#### `system` entry subtypes

| Subtype | Fields | Description |
|---|---|---|
| `turn_duration` | `durationMs` | How long a turn took in milliseconds |
| `compact_boundary` | `content`, `compactMetadata`, `logicalParentUuid` | Marks where compaction occurred |

```json
{
  "type": "system",
  "subtype": "compact_boundary",
  "content": "Conversation compacted",
  "compactMetadata": { "trigger": "auto", ... },
  "logicalParentUuid": "8136437f-...",
  "parentUuid": null,
  "timestamp": "2026-02-14T13:54:01.479Z"
}
```

#### `file-history-snapshot` entry

```json
{
  "type": "file-history-snapshot",
  "messageId": "2982d471-...",
  "snapshot": {
    "messageId": "2982d471-...",
    "trackedFileBackups": {},
    "timestamp": "2026-02-14T15:33:52.035Z"
  },
  "isSnapshotUpdate": false
}
```

#### `progress` entry

```json
{
  "type": "progress",
  "toolUseID": "toolu_...",
  "parentToolUseID": null,
  "data": { ... },
  "uuid": "...",
  "parentUuid": "...",
  "sessionId": "...",
  "timestamp": "..."
}
```

#### `queue-operation` entry

```json
{
  "type": "queue-operation",
  "operation": "...",
  "content": "...",
  "sessionId": "...",
  "timestamp": "..."
}
```

### Companion Directories (new format only)

Each session `.jsonl` file may have a companion directory with the same UUID:

```
<uuid>.jsonl          # Main transcript
<uuid>/               # Companion data
  ├── subagents/      # Subagent transcripts
  │   ├── agent-a5db73d.jsonl
  │   └── agent-acompact-0bda75.jsonl   # Compacted agents
  └── tool-results/   # Large tool outputs (stored as .txt files)
      └── toolu_01Kiy3nfbzyT9AuqP2S1qzeB.txt
```

Subagent files follow the same JSONL format. Compacted agent files (prefixed `agent-acompact-`) contain summarized versions.

## Session Naming (`/rename` Command)

### Overview

Introduced in **v2.0.64**, the `/rename` command lets users assign custom names to sessions. These names appear in the `/resume` picker and can be used with `claude --resume <name>`.

### Usage

```
# Inside an active session:
/rename auth-refactor

# From the /resume picker:
# Press 'R' on any session to rename it

# Resume by name:
claude --resume auth-refactor
```

### Keyboard Shortcuts in `/resume` Picker

| Key | Action |
|---|---|
| `R` | Rename the selected session |
| `P` | Preview session conversation history |

### How It's Stored

The custom name is stored as a `customTitle` field in the session's JSONL file. When `/rename my-session` is used, an entry with `"customTitle": "my-session"` is written to the JSONL.

The `sessions-index.json` entry (when it exists) also carries a `customTitle` field:

```json
{
  "sessionId": "550e8400-...",
  "customTitle": "auth-refactor",
  "firstPrompt": "Help me refactor...",
  "summary": "Help me refactor...",
  ...
}
```

### Session Naming Fields

| Field | Where | Description |
|---|---|---|
| `slug` | Every JSONL entry | Auto-generated three-word name (e.g. `"sunny-squishing-catmull"`) |
| `customTitle` | JSONL entry / sessions-index.json | User-set name via `/rename` |
| `firstPrompt` | sessions-index.json | First 80 chars of the first user message (fallback display) |
| `summary` | sessions-index.json | Same as `firstPrompt` (fallback) |

The `slug` is auto-generated for every session and used as the default display name. When a `customTitle` is set via `/rename`, it takes precedence.

### `/rename` Verification

The custom title can be verified via `/status`, which shows `Session name: <name>`.

### How `/resume` Searches

The `/resume` picker:
1. Scans `.jsonl` files via `readdirSync`, sorts by `mtime`
2. Loads in batches of 10 (hardcoded `K=10`)
3. Filters out "lite" sessions: those with no `firstPrompt` AND no `customTitle`
4. Displays `customTitle` if set, otherwise falls back to `firstPrompt`

`claude --resume <keyword>` bypasses the picker and searches `.jsonl` files directly.

### Known Bugs (as of Feb 2026)

1. **Name overwritten on resume** ([#23610](https://github.com/anthropics/claude-code/issues/23610)): After resuming a named session, the auto-titler overwrites the `customTitle` with an auto-generated title based on conversation content.

2. **Name only persists one round** ([#25090](https://github.com/anthropics/claude-code/issues/25090)): After the second exit, the custom name reverts to an auto-generated name.

3. **Picker doesn't search by name** ([#23954](https://github.com/anthropics/claude-code/issues/23954)): The `/resume` search only matches against `firstPrompt` content, not `customTitle`. Searching for a renamed session by its custom name returns zero results.

4. **Terminal tab not synced** ([#20441](https://github.com/anthropics/claude-code/issues/20441), [#18326](https://github.com/anthropics/claude-code/issues/18326)): The terminal tab title doesn't reflect the session name set by `/rename`.

## Session Lifecycle and Compaction

### Auto-Compaction

When context usage hits **98% of the effective context window**, Claude Code automatically compacts:

1. Finds the last compact boundary index
2. Extracts the transcript slice from that boundary to now
3. Sends only that slice to the API for summarization
4. Sets a new boundary at the current position (recorded as `system`/`compact_boundary` entry)
5. Replaces the slice with a summary in the active context

The session file on disk retains the **full uncompacted transcript**. Compaction only affects the in-memory context window. Compact boundaries are recorded in the JSONL as `system` entries with `subtype: "compact_boundary"`.

### Session Memory (v2.0.64+)

A background process writes structured summaries to:
```
~/.claude/projects/<project>/memory/MEMORY.md
```

Session Memory writes after ~10,000 tokens initially, then every ~5,000 tokens or 3 tool calls. The `/compact` command uses these pre-written summaries for instant compaction.

### Auto-Deletion

Sessions are automatically deleted after **30 days** by default. This can be adjusted in `~/.claude/settings.json` via `cleanupPeriodDays`.

## CLI Session Flags

| Flag | Description |
|---|---|
| `--continue` / `-c` | Continue the most recent conversation in the current directory |
| `--resume <id>` / `-r <id>` | Resume a specific session by UUID or name, or show interactive picker |
| `--session-id <uuid>` | Use a specific UUID for a new session |
| `--resume-session-at <uuid>` | Resume only up to a specific message UUID |
| `--fork-session` | Create new session ID from a resumed session (branching) |
| `--no-session-persistence` | Don't save session to disk (ephemeral mode, print mode only) |
| `--from-pr <number>` | Resume sessions linked to a GitHub PR |
| `--teleport` | Resume a web session in local terminal |

### How `--continue` Works

Reads `~/.claude/history.jsonl` to find the most recent session for the current project directory by matching the `project` field.

Known bug: `--resume` doesn't always update `history.jsonl`, which can break subsequent `--continue` ([#10063](https://github.com/anthropics/claude-code/issues/10063)).

### How `--resume` Works

1. If given a UUID: reads the session `.jsonl` file directly
2. If given no argument: shows an interactive picker
3. Since v2.1.31+: scans `.jsonl` files directly by recency (no longer reads `sessions-index.json`)
4. v2.1.30 optimized session discovery with stat-based loading (68% less memory)

## Official SDK Session APIs

### V1 API (Stable) -- `query()` Options

All session flags are exposed as options to `query()`:

```typescript
const response = query({
  prompt: "Continue working...",
  options: {
    resume: "session-uuid",          // --resume
    sessionId: "custom-uuid",        // --session-id
    resumeSessionAt: "message-uuid", // --resume-session-at
    continue: true,                  // --continue
    forkSession: true,               // --fork-session
    persistSession: false,           // --no-session-persistence
  }
});
```

The `session_id` field is present on every message type. Capture it from the `init` system message:

```typescript
for await (const message of response) {
  if (message.type === "system" && message.subtype === "init") {
    sessionId = message.session_id;
  }
}
```

### V2 API (Unstable/Preview) -- Session Objects

```typescript
import {
  unstable_v2_createSession,
  unstable_v2_resumeSession,
  unstable_v2_prompt,
} from "@anthropic-ai/claude-agent-sdk";

// Create a session
const session = unstable_v2_createSession({ model: "claude-opus-4-6" });
await session.send("Remember this: 42");
for await (const msg of session.stream()) { /* ... */ }
session.close();

// Resume later
const resumed = unstable_v2_resumeSession(sessionId, { model: "claude-opus-4-6" });
await resumed.send("What was the number?");

// One-shot (no session)
const result = await unstable_v2_prompt("What is 2+2?", { model: "claude-opus-4-6" });
```

## Our SDK Status

### Already Implemented

All six session CLI flags are mapped in `src/core/argBuilder.ts`:

```typescript
{ key: 'resume',           flag: '--resume',                type: 'string' },
{ key: 'sessionId',        flag: '--session-id',            type: 'string' },
{ key: 'resumeSessionAt',  flag: '--resume-session-at',     type: 'string' },
{ key: 'continue',         flag: '--continue',              type: 'boolean' },
{ key: 'forkSession',      flag: '--fork-session',          type: 'boolean' },
{ key: 'persistSession',   flag: '--no-session-persistence', type: 'boolean-inverted' },
```

Session hook types are re-exported: `SessionStartHookInput`, `SessionEndHookInput`.

### Not Implemented

| Feature | Notes |
|---|---|
| V2 Session API (`SDKSession`) | `unstable_v2_createSession`, `unstable_v2_resumeSession`, `unstable_v2_prompt` -- all `@alpha` |
| Reading sessions from disk | No code exists for parsing session JSONL files |
| Listing sessions for a project | No API to enumerate sessions |
| Reading `history.jsonl` | No API to read the global prompt log |
| Reading `sessions-index.json` | No API (and the index is semi-deprecated) |
| Exposing `sessionId` from `Query` | `session_id` appears on messages but no accessor on the Query object |

## Opportunity: Reading Sessions from Storage

### Use Cases

1. **Session listing** -- enumerate sessions for a project directory
2. **Session reading** -- parse JSONL transcript into structured objects
3. **Session search** -- find sessions by content, date, or metadata
4. **Session analytics** -- compute cost, duration, model usage across sessions
5. **Resume context** -- read session history before starting a new query with `resume`
6. **History browsing** -- search `history.jsonl` for past prompts across all projects

### Design Considerations

- **Two format versions**: old (`TranscriptEntry` envelope, no extension, under `sessions/`) and new (flat entries, `.jsonl` extension, flat directory). Parser must handle both.
- **Path encoding changed**: old (nested dirs mirroring path) vs new (dash-separated flat dirs). Discovery logic must handle both.
- **`sessions-index.json` is unreliable**: semi-deprecated since v2.1.31. Better to scan `.jsonl` files directly.
- **`history.jsonl` is the reliable global index**: always updated, contains project path and session ID for every prompt.
- **New format has `slug` field**: human-readable session names like `"sunny-squishing-catmull"` -- useful for display.
- **Companion directories**: subagent transcripts and large tool results stored alongside the main `.jsonl`.
- **Streaming parser needed**: large sessions can be 4+ MB. Use line-by-line JSONL parsing.
- **Message threading**: new format has `uuid`/`parentUuid` for conversation tree structure.

### Proposed API Surface

```typescript
import {
  listSessions,
  readSession,
  streamSession,
  readHistory,
  getProjectDir,
} from "open-claude-agent-sdk/storage";

// Resolve the storage path for a project
const projectDir = getProjectDir("/path/to/project");
// => "~/.claude/projects/-path-to-project" (new) or "~/.claude/projects/path/to/project" (old)

// List all sessions for a project
const sessions = await listSessions("/path/to/project");
// => [{ id, slug, firstPrompt, messageCount, created, modified, gitBranch, size }]

// Read a session's transcript
const transcript = await readSession("uuid", "/path/to/project");
// => TranscriptEntry[] (normalized to common format regardless of old/new)

// Stream a session (for large files)
for await (const entry of streamSession("uuid", "/path/to/project")) {
  console.log(entry.type, entry.timestamp);
}

// Read global prompt history
const history = await readHistory();
// => [{ display, timestamp, project, sessionId }]
```

## Community Tools

Several community projects parse Claude Code session files:

- **[claude-code-transcripts](https://github.com/simonw/claude-code-transcripts)** (simonw) -- Converts sessions to HTML
- **[claude-code-log](https://pypi.org/project/claude-code-log/)** -- Python CLI for JSONL to HTML/Markdown
- **[claude-JSONL-browser](https://www.claude-hub.com/resource/github-cli-withLinda-claude-JSONL-browser-claude-JSONL-browser/)** -- Web viewer for session logs
- **DuckDB analysis** -- [Blog post](https://liambx.com/blog/claude-code-log-analysis-with-duckdb) on querying sessions with SQL

## Sources

- [Claude Code CLI Reference](https://code.claude.com/docs/en/cli-reference)
- [Agent SDK Session Management](https://platform.claude.com/docs/en/agent-sdk/sessions)
- [TypeScript SDK V2 Interface Preview](https://platform.claude.com/docs/en/agent-sdk/typescript-v2-preview)
- [Claude Code's Hidden Conversation History](https://kentgigger.com/posts/claude-code-conversation-history)
- [Session & Conversation Management (DeepWiki)](https://deepwiki.com/anthropics/claude-code/3.3-session-and-conversation-management)
- [Session Search and Logging (DeepWiki)](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/12.2-session-search-and-logging)
- [Session Control Flags (DeepWiki)](https://deepwiki.com/FlorianBruniaux/claude-code-ultimate-guide/14.1-session-control-flags)
- [Migrate Claude Code Sessions to a New Computer](https://www.vincentschmalbach.com/migrate-claude-code-sessions-to-a-new-computer/)
- [Claude Code Session Management (Steve Kinney)](https://stevekinney.com/courses/ai-development/claude-code-session-management)
- [Context Compaction (Claude API Docs)](https://platform.claude.com/docs/en/build-with-claude/compaction)
- [Building a Session Search Skill](https://www.definite.app/blog/claude-code-search-skill)
- [Bug: sessions-index.json not created (#18897)](https://github.com/anthropics/claude-code/issues/18897)
- [Bug: sessions-index.json stops updating (#23614)](https://github.com/anthropics/claude-code/issues/23614)
- [Bug: sessions not in index (#22205)](https://github.com/anthropics/claude-code/issues/22205)
- [Bug: /resume broken since v2.1.31 (#26123)](https://github.com/anthropics/claude-code/issues/26123)
- [Bug: --continue broken after --resume (#10063)](https://github.com/anthropics/claude-code/issues/10063)
- [What Are Named Sessions in Claude Code (ClaudeLog)](https://claudelog.com/faqs/what-are-named-sessions-in-claude-code/)
- [Bug: /rename overwritten after /resume (#23610)](https://github.com/anthropics/claude-code/issues/23610)
- [Bug: Renamed session name disappears (#25090)](https://github.com/anthropics/claude-code/issues/25090)
- [Bug: --resume doesn't bypass picker for named sessions (#23954)](https://github.com/anthropics/claude-code/issues/23954)
- [Feature: Sync /rename with terminal tab title (#20441)](https://github.com/anthropics/claude-code/issues/20441)
- [Claude announcement: /rename and session naming](https://x.com/claudeai/status/1998830344007729502)
