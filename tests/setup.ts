/**
 * Test setup file
 * Loaded before all tests via bunfig.toml
 */

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Setup test environment
process.env.NODE_ENV = 'test';

// Redirect SDK config directory to a writable temp path.
// Official SDK v0.2.50+ writes to ~/.claude/debug/ at import time,
// which fails with EPERM in sandboxed/CI environments where $HOME is read-only.
if (!process.env.CLAUDE_CONFIG_DIR) {
  process.env.CLAUDE_CONFIG_DIR = mkdtempSync(join(tmpdir(), 'claude-test-'));
}
