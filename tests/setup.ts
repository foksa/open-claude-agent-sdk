/**
 * Test setup file
 * Loaded before all tests via bunfig.toml
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Setup test environment
process.env.NODE_ENV = 'test';

// In a cmux terminal, `claude` on PATH is cmux's wrapper shim, which holds
// permission prompts — integration tests in `default` mode then hang on our
// side only (the official SDK runs its bundled binary). Point our SDK at that
// same bundled CLI instead, unless CLAUDE_BINARY is already set.
if (!process.env.CLAUDE_BINARY) {
  const onPath = spawnSync('which', ['claude'], { encoding: 'utf-8' }).stdout?.trim() ?? '';
  if (onPath.includes('/cmux-cli-shims/')) {
    const bundled = join(
      process.cwd(),
      'node_modules',
      `@anthropic-ai/claude-agent-sdk-${process.platform}-${process.arch}`,
      'claude'
    );
    if (existsSync(bundled)) process.env.CLAUDE_BINARY = bundled;
  }
}
