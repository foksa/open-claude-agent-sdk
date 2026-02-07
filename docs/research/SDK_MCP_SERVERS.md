# SDK MCP Servers (In-Process) — Implementation Plan

**Status:** Implemented
**Blocked demos:** email-agent
**Priority:** MEDIUM
**Effort:** 2-3 days

---

## What Are SDK MCP Servers?

Normally, MCP servers are **separate processes** (stdio, SSE, HTTP). The CLI spawns them and talks to them directly. SDK MCP servers run **in your own Node.js process** — you define custom tool handlers in code and the SDK proxies MCP messages between CLI and your handlers.

### Example: Email Agent

```typescript
import { createSdkMcpServer, query } from '@anthropic-ai/claude-agent-sdk';

const emailServer = createSdkMcpServer({
  name: 'email-api',
  tools: [{
    name: 'email_getInbox',
    description: 'Get recent emails',
    inputSchema: { type: 'object', properties: { limit: { type: 'number' } } },
    handler: async (input) => {
      // Runs in YOUR process, not CLI's
      return await emailAPI.getInbox(input.limit);
    }
  }]
});

query({
  prompt: 'Check my email',
  options: {
    mcpServers: { 'email-api': emailServer }
  }
});
```

---

## How It Works (Official SDK)

### Architecture

```
Your Node.js Process                          CLI Process
┌─────────────────────────┐                  ┌──────────────┐
│                         │                  │              │
│  EmailAPI (McpServer)   │                  │  Claude CLI  │
│    - email_getInbox     │                  │              │
│    - email_search       │                  │              │
│                         │                  │              │
│  SDK Transport          │◄── mcp_message ──│  "call tool  │
│    receives JSON-RPC    │     via stdin/   │  email_search │
│    calls from CLI       │     stdout       │  with args"  │
│                         │                  │              │
│    executes handler     │── mcp_response ─►│  "here's the │
│    returns result       │   via stdin/     │   result"    │
│                         │   stdout         │              │
└─────────────────────────┘                  └──────────────┘
```

### Protocol Flow

**1. Init — SDK tells CLI which SDK servers exist:**

```json
{
  "type": "control_request",
  "request": {
    "subtype": "initialize",
    "sdkMcpServers": ["email-api"],
    "systemPrompt": "..."
  }
}
```

CLI now knows `email_getInbox` is available but lives in the SDK process.

**2. Tool discovery — CLI sends `tools/list` via `mcp_message`:**

```json
{
  "type": "control_request",
  "request": {
    "subtype": "mcp_message",
    "server_name": "email-api",
    "message": {
      "jsonrpc": "2.0",
      "method": "tools/list",
      "id": 1
    }
  }
}
```

SDK routes to McpServer, returns tool definitions.

**3. Tool call — CLI sends `tools/call` via `mcp_message`:**

```json
{
  "type": "control_request",
  "request": {
    "subtype": "mcp_message",
    "server_name": "email-api",
    "message": {
      "jsonrpc": "2.0",
      "method": "tools/call",
      "params": { "name": "email_getInbox", "arguments": { "limit": 10 } },
      "id": 2
    }
  }
}
```

**4. SDK executes handler, returns result as control_response:**

```json
{
  "type": "control_response",
  "response": {
    "subtype": "success",
    "request_id": "...",
    "response": {
      "mcp_response": {
        "jsonrpc": "2.0",
        "result": { "content": [{ "type": "text", "text": "[{email1}, {email2}]" }] },
        "id": 2
      }
    }
  }
}
```

---

## Official SDK Implementation (from sdk.mjs)

### Key components

**`createSdkMcpServer(options)`** — Creates McpServer instance:
```javascript
function createSdkMcpServer(options) {
  const server = new McpServer(
    { name: options.name, version: options.version ?? '1.0.0' },
    { capabilities: { tools: options.tools ? {} : undefined } }
  );
  if (options.tools) {
    options.tools.forEach(tool => {
      server.registerTool(tool.name, {
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations
      }, tool.handler);
    });
  }
  return { type: 'sdk', name: options.name, instance: server };
}
```

**Transport class (K9)** — Bridges McpServer ↔ CLI stdin/stdout:
```javascript
class SdkMcpTransport {
  constructor(sendMcpMessage) {
    this.sendMcpMessage = sendMcpMessage;
  }
  onclose; onerror; onmessage;
  async start() {}
  async send(message) { this.sendMcpMessage(message); }
  async close() { this.onclose?.(); }
}
```

**connectSdkMcpServer()** — Wires transport to server:
```javascript
connectSdkMcpServer(name, config) {
  const transport = new SdkMcpTransport(
    (msg) => this.sendMcpServerMessageToCli(name, msg)
  );
  this.sdkMcpTransports.set(name, transport);
  this.sdkMcpServerInstances.set(name, config);
  config.connect(transport);
}
```

**mcp_message handler** — Routes incoming JSON-RPC to correct server:
```javascript
if (request.subtype === 'mcp_message') {
  const transport = this.sdkMcpTransports.get(request.server_name);
  if (!transport) throw Error(`SDK MCP server not found: ${request.server_name}`);

  if ('method' in request.message && 'id' in request.message) {
    // Request — wait for response
    return { mcp_response: await this.handleMcpControlRequest(...) };
  } else {
    // Notification — fire and forget
    transport.onmessage?.(request.message);
    return { mcp_response: { jsonrpc: '2.0', result: {}, id: 0 } };
  }
}
```

### mcpServers splitting logic

The official SDK splits `mcpServers` into two groups at init:

- **Process-based** (stdio/sse/http): serialized to `--mcp-config` CLI flag
- **SDK-type** (has `instance` property): connected in-process, names listed in `sdkMcpServers` init field

```javascript
// Pseudocode from sdk.mjs
const processServers = {};
const sdkServers = {};

for (const [name, config] of Object.entries(mcpServers)) {
  if (config.instance) {
    sdkServers[name] = config;
  } else {
    processServers[name] = config;
  }
}

// Process-based → CLI flag
if (Object.keys(processServers).length > 0) {
  args.push('--mcp-config', JSON.stringify({ mcpServers: processServers }));
}

// SDK-type → connect in-process, send names in init
for (const [name, config] of sdkServers) {
  this.connectSdkMcpServer(name, config);
}
```

---

## What We Need to Implement

### 1. `createSdkMcpServer()` export

Uses `@modelcontextprotocol/sdk` package's `McpServer` class. We can either:

- **Option A:** Add `@modelcontextprotocol/sdk` as dependency and use their McpServer
- **Option B:** Implement minimal JSON-RPC handler ourselves

Option A is recommended since compatibility matters more than bundle size.

### 2. Split mcpServers in argBuilder/spawn

Separate process-based configs (→ `--mcp-config`) from SDK-type (→ in-process handling).

### 3. Send `sdkMcpServers` in init message

Add server names to the initialize control request.

### 4. Handle `mcp_message` control requests

Route incoming JSON-RPC messages to the correct McpServer transport. Currently we just acknowledge these in `control.ts:60` — need real routing.

### 5. Transport bridge

Implement the transport class that bridges McpServer ↔ CLI stdin/stdout via control protocol.

---

## Types (from official SDK)

```typescript
export type McpServerConfig =
  | McpStdioServerConfig    // { command, args?, env? }
  | McpSSEServerConfig      // { type: 'sse', url, headers? }
  | McpHttpServerConfig     // { type: 'http', url, headers? }
  | McpSdkServerConfigWithInstance;  // { type: 'sdk', name, instance: McpServer }

export type McpSdkServerConfig = {
  type: 'sdk';
  name: string;
};

export type McpSdkServerConfigWithInstance = McpSdkServerConfig & {
  instance: McpServer;  // from @modelcontextprotocol/sdk
};

type CreateSdkMcpServerOptions = {
  name: string;
  version?: string;
  tools?: Array<SdkMcpToolDefinition<any>>;
};

// Already re-exported in our types/index.ts:
// McpServerConfig, McpServerConfigForProcessTransport,
// McpSetServersResult, McpServerStatus
```

---

## Dependencies

The official SDK bundles `@modelcontextprotocol/sdk` (~McpServer class). We would need:

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x"
  }
}
```

This is the standard MCP SDK used across the ecosystem.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/core/argBuilder.ts` | Split mcpServers: process → `--mcp-config`, SDK → in-process |
| `src/core/control.ts` | Handle `mcp_message` with real routing to McpServer |
| `src/api/QueryImpl.ts` | Connect/disconnect SDK MCP servers, send `sdkMcpServers` in init |
| `src/api/query.ts` | Export `createSdkMcpServer` |
| `src/index.ts` | Export `createSdkMcpServer` |
| `src/types/index.ts` | Ensure McpServer-related types re-exported |
| `package.json` | Add `@modelcontextprotocol/sdk` dependency |

---

## Also: Process-Based mcpServers (Easy Win)

Independently of SDK MCP servers, we should add support for **process-based** servers (stdio/sse/http). This is trivial — just serialize to `--mcp-config`:

```typescript
// In argBuilder.ts
if (options.mcpServers) {
  const processServers = Object.fromEntries(
    Object.entries(options.mcpServers)
      .filter(([_, config]) => !('instance' in config))
  );
  if (Object.keys(processServers).length > 0) {
    args.push('--mcp-config', JSON.stringify({ mcpServers: processServers }));
  }
}
```

This enables external MCP servers (filesystem, databases, third-party tools) without the complexity of in-process servers.

---

## Verification

```bash
# Unit test: capture CLI args for process-based mcpServers
bun test tests/unit/sdk-compatibility.test.ts

# Unit test: capture init message with sdkMcpServers
bun test tests/unit/sdk-compatibility.test.ts

# Integration: createSdkMcpServer + tool call round-trip
bun test tests/integration/mcp-servers.test.ts
```

---

**Last Updated:** 2026-02-05
