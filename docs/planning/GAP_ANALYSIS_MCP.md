# MCP (Model Context Protocol) Support Analysis

## Executive Summary

The lite-claude-agent-sdk currently has **minimal MCP support** - types are re-exported and stub methods exist, but no actual MCP functionality is implemented.

---

## Current Lite SDK MCP Status

### What We Have

| Component | Status |
|-----------|--------|
| MCP Types | Re-exported from official SDK |
| `createSdkMcpServer` | Re-exported (pass-through) |
| `tool()` | Re-exported (pass-through) |
| Control request types | Defined |
| Query control methods | Stub (throws error) |
| CLI flag support | Missing |

### What We Don't Support

1. `options.mcpServers` - Not passed to CLI
2. `options.strictMcpConfig` - Not passed to CLI
3. SDK MCP servers - Cannot host in-process MCP servers
4. `mcpServerStatus()` - Returns stub error
5. `reconnectMcpServer()` - Returns stub error
6. `toggleMcpServer()` - Returns stub error
7. `setMcpServers()` - Returns stub error

---

## Official SDK MCP Implementation

### MCP Server Configuration Types

```typescript
// External server configs (serializable - passed to CLI)
type McpStdioServerConfig = {
    type: 'stdio';
    command: string;
    args?: string[];
    env?: Record<string, string>;
};

type McpSSEServerConfig = {
    type: 'sse';
    url: string;
    headers?: Record<string, string>;
};

type McpHttpServerConfig = {
    type: 'http';
    url: string;
    headers?: Record<string, string>;
};

// SDK server config (NOT serializable - runs in-process)
type McpSdkServerConfigWithInstance = {
    type: 'sdk';
    name: string;
    instance: McpServer;  // Live MCP server object
};
```

### CLI Flag Handling

```javascript
// External MCP servers passed via --mcp-config JSON
if (mcpServers && Object.keys(mcpServers).length > 0) {
    args.push("--mcp-config", JSON.stringify({ mcpServers }));
}

// Strict config validation flag
if (strictMcpConfig) args.push("--strict-mcp-config");
```

---

## Implementation Approach

### Phase 1: External MCP Servers (2-3 days)

**Goal:** Support external MCP servers via CLI flags.

**Implementation:**

1. Update `src/core/spawn.ts`:
```typescript
if (options.mcpServers && Object.keys(options.mcpServers).length > 0) {
    // Filter out SDK servers (they need special handling)
    const externalServers: Record<string, any> = {};
    for (const [name, config] of Object.entries(options.mcpServers)) {
        if (config.type !== 'sdk' || !('instance' in config)) {
            externalServers[name] = config;
        }
    }
    if (Object.keys(externalServers).length > 0) {
        args.push('--mcp-config', JSON.stringify({ mcpServers: externalServers }));
    }
}

if (options.strictMcpConfig) {
    args.push('--strict-mcp-config');
}
```

2. Implement Query control methods:
```typescript
async mcpServerStatus(): Promise<McpServerStatus[]> {
    const response = await this.sendControlRequestAndWait({
        subtype: 'mcp_status'
    });
    return response.mcpServers;
}

async reconnectMcpServer(serverName: string): Promise<void> {
    await this.sendControlRequestAndWait({
        subtype: 'mcp_reconnect',
        server_name: serverName
    });
}

async toggleMcpServer(serverName: string, enabled: boolean): Promise<void> {
    await this.sendControlRequestAndWait({
        subtype: 'mcp_toggle',
        server_name: serverName,
        enabled
    });
}
```

### Phase 2: SDK MCP Servers (5-7 days)

**Goal:** Support in-process MCP servers via SDK transport.

**Architecture:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        lite-claude-agent-sdk                     │
│                                                                  │
│  ┌──────────────┐    ┌─────────────────┐    ┌────────────────┐  │
│  │ createSdk    │───▶│ SdkMcpTransport │◀──▶│ ControlHandler │  │
│  │ McpServer()  │    │   (bridge)      │    │   (stdin/out)  │  │
│  └──────────────┘    └─────────────────┘    └────────────────┘  │
│         │                    │                      │            │
│         ▼                    │                      │            │
│  ┌──────────────┐            │                      │            │
│  │  McpServer   │────────────┘                      │            │
│  │  (in-process)│                                   │            │
│  └──────────────┘                                   │            │
└─────────────────────────────────────────────────────│────────────┘
                                                      │
                                              ┌───────▼───────┐
                                              │   Claude CLI  │
                                              └───────────────┘
```

**Key Components:**

1. `SdkMcpTransport` class - bridges in-process servers to CLI
2. MCP message routing in control handler
3. Include SDK MCP servers in initialize message

### Phase 3: Dynamic MCP Management (2-3 days)

**Goal:** Support runtime MCP server management via `setMcpServers()`.

---

## Priority Recommendation

| Priority | Feature | Effort | User Value |
|----------|---------|--------|------------|
| **LOW** | External MCP servers (Phase 1) | 2-3 days | High - enables external tools |
| **LOW** | SDK MCP servers (Phase 2) | 5-7 days | Medium - in-process tools |
| **LOW** | Dynamic MCP management (Phase 3) | 2-3 days | Low - runtime changes |

**Recommendation:** Start with Phase 1 (external MCP servers) as it:
1. Requires minimal code changes (just CLI flag handling)
2. Doesn't add dependencies
3. Covers most MCP use cases (stdio/SSE/HTTP servers)
