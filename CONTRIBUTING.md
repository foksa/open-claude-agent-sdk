# Contributing to lite-claude-agent-sdk

Thank you for your interest in contributing!

## Development Setup

```bash
# Install dependencies
bun install

# Run tests
bun test

# Type check
bun run typecheck

# Lint
bun run check
```

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests and linting (`bun run ci`)
5. Commit with a descriptive message
6. Push and open a pull request

## Code Style

- Follow existing patterns in the codebase
- Run `bun run check` before committing
- Add tests for new functionality

## Commit Messages

Use conventional commit format:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Maintenance tasks
