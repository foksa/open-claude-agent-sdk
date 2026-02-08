# Query Options Reference

Complete reference for all `Options` fields passed to `query()`.

## Core Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prompt` | `string \| AsyncIterable<SDKUserMessage>` | required | User prompt or async generator for streaming input |
| `model` | `string` | CLI default | Claude model (e.g., `"claude-sonnet-4-5"`, `"claude-opus-4-6"`) |
| `maxTurns` | `number` | unlimited | Maximum conversation turns before stopping |
| `maxBudgetUsd` | `number` | unlimited | Maximum spend in USD for the query |
| `maxThinkingTokens` | `number` | disabled | Maximum tokens for extended thinking. Disables `StreamEvent` when set |
| `fallbackModel` | `string` | none | Model to use if primary fails |
| `cwd` | `string` | `process.cwd()` | Working directory for the agent |
| `env` | `Record<string, string>` | `process.env` | Environment variables passed to CLI |
| `abortController` | `AbortController` | `new AbortController()` | Controller for cancelling the query |

## System Prompt

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `systemPrompt` | `string \| { type: "preset", preset: "claude_code", append?: string }` | minimal prompt | System prompt configuration |

**Important:** When `systemPrompt` is `undefined`, the SDK sends an empty string `""` internally — omitting it entirely costs ~73% more tokens.

Examples:
```typescript
// Custom system prompt
systemPrompt: "You are a code reviewer. Focus on security issues."

// Use Claude Code's full system prompt
systemPrompt: { type: "preset", preset: "claude_code" }

// Claude Code's prompt + custom instructions
systemPrompt: { type: "preset", preset: "claude_code", append: "Always write tests." }
```

## Permissions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `permissionMode` | `PermissionMode` | `"default"` | Permission mode: `"default"`, `"acceptEdits"`, `"bypassPermissions"`, `"plan"` |
| `allowDangerouslySkipPermissions` | `boolean` | `false` | Required `true` when using `permissionMode: "bypassPermissions"` |
| `canUseTool` | `CanUseTool` | none | Custom permission callback for runtime approval |
| `permissionPromptToolName` | `string` | none | MCP tool name for permission prompts |

Permission modes:
- `"default"` — No auto-approvals; unmatched tools trigger `canUseTool`
- `"acceptEdits"` — Auto-approve file edits (Write, Edit, mkdir, rm, mv, cp)
- `"bypassPermissions"` — Skip all permission checks (use with caution)
- `"plan"` — No tool execution; Claude plans without making changes

## Tools

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `allowedTools` | `string[]` | all tools | Allowed tool names. Supports wildcards: `"mcp__server__*"` |
| `disallowedTools` | `string[]` | `[]` | Explicitly disallowed tool names |
| `tools` | `string[] \| { type: "preset", preset: "claude_code" }` | all | Tool configuration |

Built-in tools: `Read`, `Write`, `Edit`, `Bash`, `Glob`, `Grep`, `WebFetch`, `WebSearch`, `Task`, `AskUserQuestion`, `NotebookEdit`, `TodoWrite`.

MCP tool naming pattern: `mcp__<server-name>__<tool-name>` (e.g., `mcp__github__list_issues`).

## Output

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `outputFormat` | `{ type: "json_schema", schema: JSONSchema }` | none | Structured output schema |
| `includePartialMessages` | `boolean` | `false` | Enable token-level streaming (yields `SDKPartialAssistantMessage`) |

## Hooks

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `hooks` | `Partial<Record<HookEvent, HookCallbackMatcher[]>>` | `{}` | Hook callbacks keyed by event name |

See `references/hooks.md` for full hook event documentation.

## MCP Servers

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mcpServers` | `Record<string, McpServerConfig>` | `{}` | MCP server configurations |
| `strictMcpConfig` | `boolean` | `false` | Enforce strict MCP validation |

See `references/mcp-servers.md` for server configuration details.

## Sessions

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `resume` | `string` | none | Session ID to resume |
| `continue` | `boolean` | `false` | Continue the most recent conversation |
| `forkSession` | `boolean` | `false` | Fork to a new session ID when resuming |
| `resumeSessionAt` | `string` | none | Resume at a specific message UUID |

## Subagents

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `agents` | `Record<string, AgentDefinition>` | none | Programmatic subagent definitions |

```typescript
agents: {
  "code-reviewer": {
    description: "Expert code reviewer",
    prompt: "Analyze code quality and suggest improvements.",
    tools: ["Read", "Glob", "Grep"],
    model: "haiku"  // "sonnet" | "opus" | "haiku" | "inherit"
  }
}
```

## Settings & Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `settingSources` | `SettingSource[]` | `[]` (none) | Which filesystem settings to load: `"user"`, `"project"`, `"local"` |
| `additionalDirectories` | `string[]` | `[]` | Extra directories Claude can access |
| `plugins` | `SdkPluginConfig[]` | `[]` | Load custom plugins: `{ type: "local", path: "./my-plugin" }` |

**Important:** Must include `"project"` in `settingSources` to load CLAUDE.md files and `.claude/` settings.

## Sandbox

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sandbox` | `SandboxSettings` | none | Sandbox configuration for command execution |

```typescript
sandbox: {
  enabled: true,
  autoAllowBashIfSandboxed: true,
  excludedCommands: ["docker"],     // Always bypass sandbox
  allowUnsandboxedCommands: false,  // Let model request unsandboxed execution
  network: {
    allowLocalBinding: true,        // Allow dev servers
    allowUnixSockets: [],           // Specific socket paths
    httpProxyPort: undefined,
    socksProxyPort: undefined,
  }
}
```

## Advanced

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `betas` | `SdkBeta[]` | `[]` | Enable beta features (e.g., `["context-1m-2025-08-07"]`) |
| `enableFileCheckpointing` | `boolean` | `false` | Enable file change tracking for `rewindFiles()` |
| `executable` | `"bun" \| "deno" \| "node"` | auto-detected | JavaScript runtime |
| `executableArgs` | `string[]` | `[]` | Arguments for the runtime |
| `extraArgs` | `Record<string, string \| null>` | `{}` | Additional CLI arguments |
| `pathToClaudeCodeExecutable` | `string` | built-in | Path to Claude Code binary |
| `stderr` | `(data: string) => void` | none | Callback for stderr output |
