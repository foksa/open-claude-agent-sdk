# MCP Servers Reference

Connect external tools to your agent via the Model Context Protocol.

## Server Types

### Stdio Servers

Local processes communicating via stdin/stdout:

```typescript
mcpServers: {
  "github": {
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-github"],
    env: { GITHUB_TOKEN: process.env.GITHUB_TOKEN }
  }
}
```

Type: `McpStdioServerConfig`
```typescript
{ type?: "stdio", command: string, args?: string[], env?: Record<string, string> }
```

### HTTP/SSE Servers

Remote servers over HTTP or Server-Sent Events:

```typescript
mcpServers: {
  "remote-api": {
    type: "http",   // or "sse" for streaming
    url: "https://api.example.com/mcp",
    headers: { Authorization: `Bearer ${token}` }
  }
}
```

Types:
```typescript
// HTTP (non-streaming)
{ type: "http", url: string, headers?: Record<string, string> }

// SSE (streaming)
{ type: "sse", url: string, headers?: Record<string, string> }
```

### SDK MCP Servers (In-Process)

Custom tools running in the same process using `createSdkMcpServer()` and `tool()`:

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

const server = createSdkMcpServer({
  name: "my-tools",
  version: "1.0.0",
  tools: [
    tool(
      "get_weather",
      "Get temperature for a location",
      {
        latitude: z.number().describe("Latitude"),
        longitude: z.number().describe("Longitude")
      },
      async (args) => {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m`);
        const data = await res.json();
        return {
          content: [{ type: "text", text: `Temperature: ${data.current.temperature_2m}°C` }]
        };
      }
    )
  ]
});

// Use in query
for await (const message of query({
  prompt: generateMessages(),  // SDK MCP servers require streaming input
  options: {
    mcpServers: { "my-tools": server },
    allowedTools: ["mcp__my-tools__get_weather"]
  }
})) { ... }
```

Type:
```typescript
{ type: "sdk", name: string, instance: McpServer }
```

## Tool Naming Convention

MCP tools follow the pattern: `mcp__<server-name>__<tool-name>`

Examples:
- Server `"github"` with tool `list_issues` → `mcp__github__list_issues`
- Server `"my-tools"` with tool `get_weather` → `mcp__my-tools__get_weather`

## Allowing MCP Tools

MCP tools require explicit permission via `allowedTools`:

```typescript
allowedTools: [
  "mcp__github__*",              // All tools from github server (wildcard)
  "mcp__db__query",              // Only the query tool from db server
  "mcp__slack__send_message"     // Specific tool
]
```

Alternatively, use `permissionMode: "acceptEdits"` or `"bypassPermissions"` to skip per-tool allowlisting.

## `tool()` Helper

Creates a type-safe MCP tool definition:

```typescript
function tool<Schema extends ZodRawShape>(
  name: string,
  description: string,
  inputSchema: Schema,
  handler: (args: z.infer<ZodObject<Schema>>, extra: unknown) => Promise<CallToolResult>
): SdkMcpToolDefinition<Schema>
```

The handler must return a `CallToolResult`:
```typescript
{
  content: Array<{ type: "text", text: string } | { type: "image", ... }>,
  isError?: boolean
}
```

## `createSdkMcpServer()`

Creates an in-process MCP server:

```typescript
function createSdkMcpServer(options: {
  name: string,
  version?: string,
  tools?: Array<SdkMcpToolDefinition<any>>
}): McpSdkServerConfigWithInstance
```

## MCP Control Methods

Available on the `Query` object during streaming input sessions:

| Method | Description |
|--------|-------------|
| `q.mcpServerStatus()` | Returns status of all connected MCP servers |

`mcpServerStatus()` returns an array of:
```typescript
type McpServerStatus = {
  name: string;
  status: "connected" | "failed" | "needs-auth" | "pending";
  serverInfo?: { name: string; version: string };
}
```

## Checking Server Connection

Verify MCP servers connected via the `system` init message:

```typescript
for await (const message of query({ prompt: "...", options })) {
  if (message.type === "system" && message.subtype === "init") {
    const failed = message.mcp_servers.filter(s => s.status !== "connected");
    if (failed.length > 0) console.warn("Failed servers:", failed);
  }
}
```

## MCP Tool Search

When many MCP tools are configured, tool search loads them on-demand instead of all at once.

Configure via environment variable:
```typescript
env: { ENABLE_TOOL_SEARCH: "auto" }   // Default: activates when tools exceed 10% of context
env: { ENABLE_TOOL_SEARCH: "auto:5" } // Activate at 5% threshold
env: { ENABLE_TOOL_SEARCH: "true" }   // Always enabled
env: { ENABLE_TOOL_SEARCH: "false" }  // Disabled
```

Requires Sonnet 4+ or Opus 4+. Not supported on Haiku.

## Config File

MCP servers can also be configured in `.mcp.json` at project root:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

The `${VAR}` syntax expands environment variables at runtime.
