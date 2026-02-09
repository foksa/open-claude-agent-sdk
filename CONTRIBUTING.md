# Contributing to open-claude-agent-sdk

Thank you for your interest in contributing!

## Development Setup

```bash
bun install

bun test              # Run all tests
bun run typecheck     # Type check
bun run check         # Lint (Biome)
bun run ci            # Full CI: typecheck + lint + test + build
```

## Important Notes

- **Integration tests cost real API tokens** and take ~7 minutes. Run targeted tests when possible:
  ```bash
  bun test tests/integration/output-styles.test.ts -t "specific test name"
  ```
- **Unit tests are free** — they use a capture CLI mock, no API calls.
- See [FEATURES.md](./docs/planning/FEATURES.md) for what's implemented and what needs work.

## Debugging Protocol Issues

Use the proxy CLI to intercept messages between SDK and CLI:

```bash
# See docs/guides/REVERSE_ENGINEERING.md for details
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run `bun run ci` to verify
5. Commit with a descriptive message
6. Push and open a pull request

## Code Style

- Follow existing patterns in the codebase
- Run `bun run check` before committing
- Add integration tests for new features

## Commit Messages

Use conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
