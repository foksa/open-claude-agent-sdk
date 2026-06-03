# Bundling the Claude CLI

By default, the open-claude-agent-sdk expects the `claude` CLI to be installed globally. You can bundle a specific CLI version with your app so users don't need to install anything — and you control exactly which version runs.

> **Note:** Starting with `@anthropic-ai/claude-agent-sdk` v0.3.x, the CLI is distributed as a **native platform binary** via optional peer packages (`@anthropic-ai/claude-agent-sdk-darwin-arm64`, `@anthropic-ai/claude-agent-sdk-linux-x64`, etc.) — there is no longer a `cli.js` script. Each binary is ~208MB.

## Why bundle?

- **No global install required** — users run your app without setup
- **Version pinning** — freeze the CLI version so your app behaves consistently
- **Deployment** — ship a self-contained app to servers or containers

## Setup

Install the platform-specific binary package alongside `open-claude-agent-sdk`:

```bash
# Installs the right platform binary automatically (via optional peer deps)
npm install @anthropic-ai/claude-agent-sdk
```

npm/bun/pnpm will install only the binary matching your current platform (e.g. `@anthropic-ai/claude-agent-sdk-linux-x64` on Linux x64).

For cross-platform builds or Docker, install the target platform explicitly:

```bash
npm install @anthropic-ai/claude-agent-sdk-linux-x64
```

## Usage

### Option 1: `pathToClaudeCodeExecutable`

Point directly at the binary for the target platform:

```typescript
import { query } from 'open-claude-agent-sdk';

for await (const msg of query({
  prompt: 'Hello',
  options: {
    pathToClaudeCodeExecutable:
      'node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude',
  },
})) {
  if (msg.type === 'result') break;
}
```

For a portable helper that resolves the current platform:

```typescript
import { platform, arch } from 'node:os';
import { resolve } from 'node:path';

function bundledClaudePath(): string {
  const id = `${platform()}-${arch()}`; // e.g. "linux-x64", "darwin-arm64"
  return resolve(`node_modules/@anthropic-ai/claude-agent-sdk-${id}/claude`);
}

for await (const msg of query({
  prompt: 'Hello',
  options: { pathToClaudeCodeExecutable: bundledClaudePath() },
})) {
  if (msg.type === 'result') break;
}
```

### Option 2: `CLAUDE_BINARY` environment variable

Set the env var once and all queries use it automatically:

```bash
export CLAUDE_BINARY=./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude
```

```typescript
import { query } from 'open-claude-agent-sdk';

// CLAUDE_BINARY is picked up automatically — no option needed
for await (const msg of query({ prompt: 'Hello' })) {
  if (msg.type === 'result') break;
}
```

Useful for Docker containers and CI environments.

### Option 3: Wrapper function

```typescript
import { query as baseQuery, type Options } from 'open-claude-agent-sdk';
import { platform, arch } from 'node:os';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLI_PATH = resolve(
  __dirname,
  `node_modules/@anthropic-ai/claude-agent-sdk-${platform()}-${arch()}/claude`
);

export function query(params: { prompt: string; options?: Options }) {
  return baseQuery({
    ...params,
    options: { ...params.options, pathToClaudeCodeExecutable: CLI_PATH },
  });
}
```

## CLI detection order

The SDK looks for the CLI in this order:

1. `pathToClaudeCodeExecutable` option (explicit)
2. `CLAUDE_BINARY` environment variable
3. `which claude` (global install)

## Version pinning

Pin the exact CLI version in your `package.json`:

```json
{
  "dependencies": {
    "open-claude-agent-sdk": "^0.31.0",
    "@anthropic-ai/claude-agent-sdk-linux-x64": "0.3.161"
  }
}
```

Use an exact version (no `^`) to prevent automatic updates from changing CLI behavior.

## Docker

```dockerfile
FROM oven/bun:1.3

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

COPY . .

ENV CLAUDE_BINARY=./node_modules/@anthropic-ai/claude-agent-sdk-linux-x64/claude
CMD ["bun", "run", "start"]
```

## What gets installed?

| Package | Contents | Size |
|---------|----------|------|
| `@anthropic-ai/claude-agent-sdk` | JS SDK + TypeScript definitions | ~856KB |
| `@anthropic-ai/claude-agent-sdk-linux-x64` | Native `claude` binary | ~208MB |
| Other platform packages | Not installed (optional peer deps) | — |

Only one platform binary is installed — the one matching your current platform (or the one you explicitly install for cross-platform builds).

## Bun compiled executables (`bun build --compile`)

If you compile your app into a standalone executable with `bun build --compile`, use the `extractFromBunfs` helper from the official SDK to extract the binary at startup:

```typescript
import { extractFromBunfs } from '@anthropic-ai/claude-agent-sdk/extract';

const claudePath = await extractFromBunfs();  // extracts to a temp dir

for await (const msg of query({
  prompt: 'Hello',
  options: { pathToClaudeCodeExecutable: claudePath },
})) {
  if (msg.type === 'result') break;
}
```

See the [official SDK README](https://www.npmjs.com/package/@anthropic-ai/claude-agent-sdk) for full details on compiled-binary deployment.

## Comparison

| Approach | Install size | Global CLI needed | Version control |
|----------|-------------|-------------------|-----------------|
| Global CLI | ~564KB (SDK only) | Yes | User manages |
| Bundled binary | ~208MB + 564KB | No | You pin the version |
| `CLAUDE_BINARY` env var | ~564KB (SDK only) | Depends | Flexible |

For apps shipped to end users, bundling gives the most control. For development tools, relying on the global CLI is simpler.
