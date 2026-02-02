/**
 * CLI binary detection
 *
 * Detects the location of the Claude CLI binary using:
 * 1. CLAUDE_BINARY environment variable (if set)
 * 2. PATH lookup (using 'which' command)
 *
 * Note: Uses node:child_process for cross-runtime compatibility
 * (works in Node.js, Bun, and Deno)
 */

import { spawnSync } from 'node:child_process';

/**
 * Detect Claude CLI binary location
 *
 * Priority:
 * 1. CLAUDE_BINARY env var (absolute path)
 * 2. PATH lookup (using 'which claude')
 *
 * @throws {Error} If Claude CLI is not found
 * @returns Absolute path to claude binary
 */
export function detectClaudeBinary(): string {
  // Check env var first
  if (process.env.CLAUDE_BINARY) {
    return process.env.CLAUDE_BINARY;
  }

  // Try 'which' command to find in PATH
  try {
    const result = spawnSync('which', ['claude'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout) {
      const path = result.stdout.trim();
      if (path) {
        return path;
      }
    }
  } catch (e) {
    // Ignore - will throw below
  }

  throw new Error(
    'Claude CLI not found. Install with:\n' +
    '  npm install -g @anthropic-ai/claude-code\n' +
    'Or set CLAUDE_BINARY environment variable to the path of your claude binary.'
  );
}
