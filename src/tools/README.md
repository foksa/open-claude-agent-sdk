# Development Tools

Debugging and testing utilities for working with the Claude CLI protocol. These ship with the package so contributors and users can debug SDK behavior.

## Capture CLI

**File:** `capture-cli.cjs`

Mock CLI that captures CLI args and stdin messages for unit testing — no API calls, no cost.

### How it works

```
SDK → Capture CLI → saves args + stdin to JSON file
                  → sends mock init + result response
```

### Usage

```typescript
import { query } from 'open-claude-agent-sdk';
import { readFileSync } from 'node:fs';

const outputFile = `/tmp/capture-${Date.now()}.json`;
process.env.CAPTURE_OUTPUT_FILE = outputFile;

for await (const msg of query({
  prompt: 'Hello',
  options: {
    pathToClaudeCodeExecutable: './src/tools/capture-cli.cjs',
    model: 'sonnet',
    maxTurns: 5,
  },
})) {
  if (msg.type === 'result') break;
}

const captured = JSON.parse(readFileSync(outputFile, 'utf-8'));
console.log(captured.args);   // ['--model', 'sonnet', '--max-turns', '5', ...]
console.log(captured.stdin);  // [{ type: 'control_request', ... }, { type: 'user', ... }]
```

### Output format

```json
{
  "args": ["--model", "sonnet", "--max-turns", "5", "--input-format", "stream-json"],
  "stdin": [
    {
      "type": "control_request",
      "request_id": "init_123",
      "request": { "subtype": "initialize", "systemPrompt": "" }
    },
    {
      "type": "user",
      "message": { "role": "user", "content": [{ "type": "text", "text": "Hello" }] }
    }
  ]
}
```

### When to use

- **Unit tests** — verify CLI argument generation and stdin message format
- **SDK compatibility** — compare open SDK output against official SDK (see `tests/unit/compat/`)
- **Fast iteration** — no API calls, runs in milliseconds

### Mock responses

The capture CLI responds to these control requests so the SDK doesn't hang:

| Request | Response |
|---|---|
| `initialize` | `{ commands: [], models: [], account: {}, output_style: 'text' }` |
| `mcp_status` | `{ mcpServers: [] }` |
| `mcp_set_servers` | `{ added: [], removed: [], errors: {} }` |
| `mcp_message` | `{ mcp_response: { jsonrpc: '2.0', result: {} } }` |
| Other | `{}` (generic success) |

---

## Proxy CLI

**File:** `proxy-cli.cjs`

Transparent proxy between SDK and the real CLI. Logs all stdin/stdout messages while passing them through unmodified. Useful for reverse-engineering protocol behavior.

### How it works

```
SDK → Proxy CLI → Real CLI → Claude API
        ↓
   logs/proxy-*.log
```

### Usage

```typescript
import { query } from 'open-claude-agent-sdk';

for await (const msg of query({
  prompt: 'Hello',
  options: {
    pathToClaudeCodeExecutable: './src/tools/proxy-cli.cjs',
  },
})) {
  if (msg.type === 'result') break;
}
```

Then inspect the log:

```bash
cat tests/research/logs/proxy-*.log
```

### What gets logged

- **stdin** — full JSON of every message sent by the SDK (pretty-printed)
- **stdout** — message type summaries (`assistant:text`, `result:success`, etc.)
- **control_request** messages — logged in full detail
- **result** messages — includes cache token counts
- Entry/exit with total message counts

### When to use

- **Debugging protocol differences** — run both SDKs through the proxy and diff the logs
- **Discovering undocumented behavior** — see exactly what the CLI sends/expects
- **Cost investigation** — compare cache hit rates between implementations

### Configuration

The proxy looks for the real CLI at:
```
node_modules/@anthropic-ai/claude-agent-sdk/cli.js
```

Logs are written to `tests/research/logs/proxy-<timestamp>.log`.

---

## Comparing SDKs

To compare open SDK against official SDK behavior:

```bash
# 1. Run official SDK through capture CLI
bun -e "
import { query } from '@anthropic-ai/claude-agent-sdk';
process.env.CAPTURE_OUTPUT_FILE = '/tmp/capture-official.json';
for await (const msg of query({
  prompt: 'test',
  options: { pathToClaudeCodeExecutable: './src/tools/capture-cli.cjs' }
})) { if (msg.type === 'result') break; }
"

# 2. Run open SDK through capture CLI
bun -e "
import { query } from 'open-claude-agent-sdk';
process.env.CAPTURE_OUTPUT_FILE = '/tmp/capture-open.json';
for await (const msg of query({
  prompt: 'test',
  options: { pathToClaudeCodeExecutable: './src/tools/capture-cli.cjs' }
})) { if (msg.type === 'result') break; }
"

# 3. Diff the results
diff <(jq . /tmp/capture-official.json) <(jq . /tmp/capture-open.json)
```

The `tests/unit/compat/` test suite automates this comparison for all supported options.
