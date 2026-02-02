# Lite Claude Agent SDK

A lightweight alternative to the official Claude Agent SDK - **70x smaller** (~200KB vs 13MB), uses your local Claude CLI.

## 🎯 Status: ✅ Baby Steps 1-4 COMPLETE!

**Implementation Complete:** February 2, 2026

All baby steps implemented and tested! See [BABY-STEPS-COMPLETE.md](BABY-STEPS-COMPLETE.md) for full details.

## Why Lite SDK?

- **Tiny Bundle:** ~200KB vs 13MB (official SDK) = **65x smaller**
- **100% Type Compatible:** Re-exports all types from official SDK
- **Local CLI:** Uses your installed Claude CLI binary
- **Simple:** Just ~650 lines of code
- **Fast Development:** Built with Bun for optimal DX
- **Fully Tested:** Integration tests + visual demo + Playwright testing

## 📦 Installation

```bash
# Install the SDK
bun install lite-claude-agent-sdk

# Ensure Claude CLI is installed
npm install -g @anthropic-ai/claude-code
```

## 🚀 Quick Start

```typescript
import { query } from 'lite-claude-agent-sdk';

for await (const msg of query({
  prompt: 'Write a haiku about coding',
  options: {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 3,
    includePartialMessages: true, // Enable streaming!
  }
})) {
  if (msg.type === 'stream_event') {
    // Real-time streaming chunks
    process.stdout.write('.');
  } else if (msg.type === 'assistant') {
    // Complete assistant message
    console.log('\nAssistant:', msg.message.content);
  } else if (msg.type === 'result') {
    // Final result
    console.log('\nResult:', msg.result);
    break;
  }
}
```

## ✨ Features

### Currently Supported (Baby Steps 1-4)

✅ **Type-safe queries** with full TypeScript support
✅ **Streaming responses** via `includePartialMessages`
✅ **All message types** (system, assistant, result, stream_event, etc.)
✅ **Permission modes:** `bypassPermissions`, `plan`
✅ **Custom models** (Sonnet, Opus, Haiku)
✅ **Turn limits** and **budget controls**
✅ **NDJSON parsing** with proper line buffering

### Essential CLI Flags Supported

- `--print` - Non-interactive mode
- `--output-format stream-json` - NDJSON output
- `--verbose` - Detailed logging
- `--permission-mode` - Permission behavior
- `--model` - Model selection
- `--max-turns` - Turn limit
- `--max-budget-usd` - Cost limit
- `--include-partial-messages` - Streaming
- `--cwd` - Working directory

## 🧪 Demo App

Run the comparison demo to see Lite SDK vs Official SDK side-by-side:

```bash
cd examples/comparison-demo
bun server.ts
# Open http://localhost:3000
```

The demo shows:
- Real-time streaming
- Message comparison
- Cost and duration metrics
- Beautiful dark-themed UI

## 🧪 Testing

### Run Integration Tests

```bash
# All integration tests
bun test tests/integration/

# View snapshots (NDJSON format)
ls tests/snapshots/
cat tests/snapshots/hello-world.jsonl
```

## ⚠️ Current Limitations

**This is Baby Steps 1-4 implementation** - suitable for one-shot queries only.

**Works with:**
- ✅ `permissionMode: 'bypassPermissions'`
- ✅ `permissionMode: 'plan'`
- ✅ Non-interactive queries

**Not yet implemented (Baby Step 5):**
- ❌ Control protocol (bidirectional communication)
- ❌ Interactive permission prompts
- ❌ Hook system callbacks
- ❌ Runtime control (interrupt, setPermissionMode, etc.)

## 📊 Comparison

| Feature | Lite SDK | Official SDK |
|---------|----------|--------------|
| Bundle Size | ~200KB | 13MB |
| Lines of Code | ~650 | 50,000+ |
| Dependencies | Claude CLI | Self-contained |
| Type Safety | ✅ (re-exports) | ✅ |
| Streaming | ✅ | ✅ |
| Interactive Mode | ❌ (Baby Step 5) | ✅ |

## 🎓 Learn More

- [Baby Steps Complete](BABY-STEPS-COMPLETE.md) - Implementation summary
- [Research Documentation](docs/research/) - Protocol analysis
- [Official SDK](https://github.com/anthropics/claude-agent-sdk-typescript)

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck
```

## 📝 License

MIT

---

**Status:** ✅ Baby Steps 1-4 Complete
**Next:** Baby Step 5 (Control Protocol) - Coming Soon!
