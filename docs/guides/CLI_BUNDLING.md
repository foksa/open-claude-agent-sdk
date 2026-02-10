# Bundling the Claude CLI

By default, the open-claude-agent-sdk expects the `claude` CLI to be installed globally. But you can bundle a specific CLI version with your app so users don't need to install anything extra — and you control exactly which version runs.

## Why bundle?

- **No global install required** — users run your app without setup
- **Version pinning** — freeze the CLI version so your app behaves consistently
- **Deployment** — ship a self-contained app to servers, containers, or end users

## Setup

Add both packages to your app:

```bash
npm install open-claude-agent-sdk @anthropic-ai/claude-agent-sdk@0.2.37
```

The `open-claude-agent-sdk` provides the SDK. The `@anthropic-ai/claude-agent-sdk` provides the CLI binary at `node_modules/@anthropic-ai/claude-agent-sdk/cli.js`.

## Usage

### Option 1: pathToClaudeCodeExecutable

Point directly at the bundled CLI:

```typescript
import { query } from 'open-claude-agent-sdk';
import { resolve } from 'node:path';

for await (const msg of query({
  prompt: 'Hello',
  options: {
    pathToClaudeCodeExecutable: resolve(
      'node_modules/@anthropic-ai/claude-agent-sdk/cli.js'
    ),
  },
})) {
  if (msg.type === 'result') break;
}
```

### Option 2: CLAUDE_BINARY environment variable

Set the env var once and all queries use it:

```bash
export CLAUDE_BINARY=./node_modules/@anthropic-ai/claude-agent-sdk/cli.js
```

```typescript
import { query } from 'open-claude-agent-sdk';

// No pathToClaudeCodeExecutable needed — CLAUDE_BINARY is picked up automatically
for await (const msg of query({ prompt: 'Hello' })) {
  if (msg.type === 'result') break;
}
```

This is useful for Docker containers and CI environments.

### Option 3: Helper function

Create a wrapper for your app:

```typescript
import { query as baseQuery, type Options, type SDKMessage } from 'open-claude-agent-sdk';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const CLI_PATH = resolve(__dirname, 'node_modules/@anthropic-ai/claude-agent-sdk/cli.js');

export function query(params: { prompt: string; options?: Options }) {
  return baseQuery({
    ...params,
    options: {
      ...params.options,
      pathToClaudeCodeExecutable: CLI_PATH,
    },
  });
}
```

## CLI detection order

The SDK looks for the CLI in this order:

1. `pathToClaudeCodeExecutable` option (explicit)
2. `CLAUDE_BINARY` environment variable
3. `which claude` (global install)

If you set `pathToClaudeCodeExecutable`, it takes priority over everything else.

## Version pinning

Pin the CLI version in your `package.json` to ensure consistent behavior:

```json
{
  "dependencies": {
    "open-claude-agent-sdk": "^0.9.0",
    "@anthropic-ai/claude-agent-sdk": "0.2.37"
  }
}
```

Note the exact version (`0.2.37`, no `^`) — this prevents automatic updates that could change CLI behavior.

To update the CLI version later:

```bash
npm install @anthropic-ai/claude-agent-sdk@0.2.40
```

## Docker

```dockerfile
FROM oven/bun:1.3

WORKDIR /app
COPY package.json bun.lockb ./
RUN bun install

COPY . .

ENV CLAUDE_BINARY=./node_modules/@anthropic-ai/claude-agent-sdk/cli.js
CMD ["bun", "run", "start"]
```

## What gets installed?

The `@anthropic-ai/claude-agent-sdk` package includes:

| File | Size | Purpose |
|---|---|---|
| `cli.js` | ~11 MB | The Claude CLI (Node.js script) |
| `*.wasm` | ~4 MB | Tree-sitter, resvg |
| `vendor/ripgrep/` | ~54 MB | Ripgrep binaries (all platforms) |
| `sdk.mjs` | ~376 KB | Official SDK (not used by us) |

Total: ~70 MB in `node_modules`. Only `cli.js` and its assets are used at runtime — the rest (like `sdk.mjs`) is ignored.

## Comparison

| Approach | Install size | Global CLI needed | Version control |
|---|---|---|---|
| Global CLI | ~0 (SDK only) | Yes | User manages |
| Bundled CLI | ~70 MB | No | You pin the version |
| CLAUDE_BINARY | ~0 (SDK only) | Depends | Flexible |

Choose based on your deployment needs. For apps shipped to end users, bundling gives you the most control. For development tools, relying on global CLI is simpler.
