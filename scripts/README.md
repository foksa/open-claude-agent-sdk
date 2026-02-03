# Scripts

Development scripts that are NOT tests. These are for research, debugging, and exploration.

## Structure

```
scripts/
├── research/    # SDK comparison and protocol research
└── debug/       # One-off debugging scripts
```

## Usage

```bash
# Run a research script
bun scripts/research/compare-with-proxy.ts

# Run a debug script
bun scripts/debug/test-spawn-simple.ts
```

## Research Scripts

Scripts for comparing lite vs official SDK behavior:
- `compare-with-proxy.ts` - Run both SDKs through proxy CLI
- `sdk-comparison.ts` - General SDK comparison
- `multi-turn-comparison.ts` - Multi-turn conversation comparison

## Debug Scripts

One-off scripts for investigating specific behaviors:
- `test-spawn-simple.ts` - Basic spawn testing
- `test-streaming.ts` - Streaming output testing
- Various archived investigations
