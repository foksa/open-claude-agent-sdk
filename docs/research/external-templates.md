# External SDK Usage Templates

Reference collection of real-world SDK usage patterns for compatibility testing.

## jezweb/claude-skills Templates

**Source:** https://github.com/jezweb/claude-skills/tree/fa91c34ebd5c9fe68684caa26d06ae41f32477f0/skills/claude-agent-sdk/templates

High-quality TypeScript templates showing canonical SDK usage patterns.

### Templates Available

| Template | Features | Our Status |
|----------|----------|------------|
| `basic-query.ts` | query(), model, allowedTools | Implemented |
| `permission-control.ts` | permissionMode, canUseTool callback | Implemented |
| `session-management.ts` | resume, forkSession | Not implemented |
| `custom-mcp-server.ts` | createSdkMcpServer, tool(), mcpServers | Not implemented |
| `subagents-orchestration.ts` | agents option, per-agent models | Not implemented |
| `query-with-tools.ts` | Tool integration patterns | Partial |
| `error-handling.ts` | Error management | Partial |
| `filesystem-settings.ts` | File system configuration | Unknown |
| `multi-agent-workflow.ts` | Multi-agent coordination | Not implemented |

### Usage for Compatibility Testing

These templates can be adapted into tests that:
1. Run both lite and official SDKs through the same patterns
2. Compare CLI args and stdin messages (like `stdin-compatibility.test.ts`)
3. Validate API surface matches official SDK usage

### Mapping to Unimplemented Tests

| Template | Our Test File |
|----------|---------------|
| `session-management.ts` | `unimplemented-sessions.test.ts` |
| `custom-mcp-server.ts` | `unimplemented-mcp.test.ts` |
| `subagents-orchestration.ts` | `unimplemented-subagents.test.ts` |
| `permission-control.ts` | `unimplemented-permissions.test.ts` |

### Key Patterns to Note

**canUseTool callback** (from `permission-control.ts`):
```typescript
canUseTool: async (toolName, input) => {
  if (['Read', 'Grep', 'Glob'].includes(toolName)) {
    return { behavior: "allow" };
  }
  return { behavior: "ask", message: "Confirm?" };
}
```

**MCP server definition** (from `custom-mcp-server.ts`):
```typescript
const server = createSdkMcpServer({
  name: "weather-service",
  version: "1.0.0",
  tools: [
    tool("get_weather", "Get weather", { location: z.string() }, async (args) => {
      return { content: [{ type: "text", text: "Sunny" }] };
    })
  ]
});
```

**Subagent definition** (from `subagents-orchestration.ts`):
```typescript
agents: {
  "test-runner": {
    description: "Run automated test suites",
    prompt: "You run tests...",
    tools: ["Bash", "Read", "Grep"],
    model: "haiku"
  }
}
```

## Open Source Projects Using Claude Agent SDK

Reference projects for future compatibility testing. These can validate our SDK against real-world usage.

### Official (Anthropic)

| Repo | Stars | Description |
|------|-------|-------------|
| [anthropics/claude-agent-sdk-demos](https://github.com/anthropics/claude-agent-sdk-demos) | 1356 | Official demos: hello-world, email-agent, research-agent, resume-generator, excel-demo |
| [anthropics/claude-agent-sdk-typescript](https://github.com/anthropics/claude-agent-sdk-typescript) | 741 | Official TypeScript SDK source |
| [anthropics/claude-agent-sdk-python](https://github.com/anthropics/claude-agent-sdk-python) | 4584 | Official Python SDK |

### High-Value Community Projects

| Repo | Stars | Description | Value for Testing |
|------|-------|-------------|-------------------|
| [browserbase/skills](https://github.com/browserbase/skills) | 427 | Web browsing tool integration | Skills, MCP patterns |
| [pheuter/claude-agent-desktop](https://github.com/pheuter/claude-agent-desktop) | 185 | Cross-platform desktop app | Full SDK integration |
| [craigsdennis/claude-in-the-box](https://github.com/craigsdennis/claude-in-the-box) | 85 | Cloudflare sandbox deployment | Containerized usage |
| [terryso/AutoQA-Agent](https://github.com/terryso/AutoQA-Agent) | 99 | Automated testing CLI | Real CLI tool patterns |
| [ErlichLiu/claude-agent-sdk-master](https://github.com/ErlichLiu/claude-agent-sdk-master) | 68 | Tutorial with 3 levels | Progression of features |
| [ruvnet/agentic-flow](https://github.com/ruvnet/agentic-flow) | 420 | Multi-model agent flows | Advanced orchestration |

### Alternative SDKs (Reference)

| Repo | Stars | Language | Notes |
|------|-------|----------|-------|
| [severity1/claude-agent-sdk-go](https://github.com/severity1/claude-agent-sdk-go) | 80 | Go | Unofficial Go port |
| [tyrchen/claude-agent-sdk-rs](https://github.com/tyrchen/claude-agent-sdk-rs) | 42 | Rust | Rust implementation |
| [nshkrdotcom/claude_agent_sdk](https://github.com/nshkrdotcom/claude_agent_sdk) | 23 | Elixir | Elixir port |

### Specialized Use Cases

| Repo | Stars | Use Case |
|------|-------|----------|
| [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem) | 23300 | Session memory/context plugin |
| [DV0x/creative-ad-agent](https://github.com/DV0x/creative-ad-agent) | 75 | Multi-agent ad creative generation |
| [dkyazzentwatwa/Cyber-Claude](https://github.com/dkyazzentwatwa/Cyber-Claude) | 58 | Defensive security agent |

### Testing Strategy

These projects can be used to:
1. **Extract usage patterns** - See how real projects use SDK features
2. **Compatibility smoke tests** - Run their code against our SDK
3. **Feature prioritization** - Focus on features used by popular projects
4. **Regression testing** - Ensure changes don't break common patterns
