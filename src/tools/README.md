# SDK Development Tools

Debugging and testing utilities for the open-claude-agent-sdk.

---

## Proxy CLI

**File:** `proxy-cli.cjs`

Intercepts all stdin/stdout communication between SDK and CLI for debugging.

### How It Works

```
SDK → Proxy CLI (logs everything) → Real CLI → Claude API
        ↓
    tests/research/logs/proxy-*.log
```

### Usage

```typescript
import { query } from 'open-claude-agent-sdk';

const result = query({
  prompt: 'Hello',
  options: {
    pathToClaudeCodeExecutable: './src/tools/proxy-cli.cjs'
  }
});

for await (const msg of result) {
  // SDK thinks it's talking to real CLI
  // But proxy is logging everything
  if (msg.type === 'result') break;
}
```

Then check the logs:
```bash
cat tests/research/logs/proxy-*.log
```

### When to Use

- Implementing new features (check Official SDK behavior first)
- Debugging cost/performance differences
- Validating protocol compliance
- Discovering undocumented protocol details

### Success Story

This tool discovered the missing `systemPrompt: ""` field that caused our SDK to cost 73% more than Official SDK.

**Before:** $0.051 per 5 turns
**After:** $0.027 per 5 turns (cheaper than Official!)

---

## Capture CLI

**File:** `capture-cli.cjs`

Mock CLI that captures stdin messages and CLI args for unit testing without making real API calls.

### How It Works

```
SDK → Capture CLI (stores args + stdin) → Mock response
        ↓
    /tmp/capture-*.json
```

### Usage

```typescript
import { query } from 'open-claude-agent-sdk';

// Set output file
const outputFile = `/tmp/capture-${Date.now()}.json`;
process.env.CAPTURE_OUTPUT_FILE = outputFile;

const result = query({
  prompt: 'Hello',
  options: {
    pathToClaudeCodeExecutable: './src/tools/capture-cli.cjs',
    model: 'sonnet',
    maxTurns: 5
  }
});

for await (const msg of result) {
  if (msg.type === 'result') break;
}

// Check captured data
const captured = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
console.log(captured.args);   // ['--model', 'sonnet', '--max-turns', '5', ...]
console.log(captured.stdin);  // [{type: 'control_request', ...}, {type: 'user', ...}]
```

### Output Format

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

### When to Use

- Unit tests verifying CLI argument generation
- Unit tests verifying stdin message format
- Comparing lite SDK behavior with official SDK
- Fast tests that don't need real API calls

---

## Compare CLI

**File:** `compare-cli.cjs` (in tests/utils/)

Runs both SDKs through capture CLI and compares outputs.

---

## Related Documentation

- **Reverse Engineering Guide:** `docs/guides/REVERSE_ENGINEERING.md`
- **Unit Tests:** `tests/unit/sdk-compatibility.test.ts`
- **Research Logs:** `tests/research/logs/`
