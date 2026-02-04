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
import { existsSync, statSync, accessSync, constants } from 'node:fs';
import { resolve } from 'node:path';
import type { Options } from '../types/index.ts';

/**
 * Validate that a path points to an executable file
 * @param path Path to validate
 * @throws {Error} If path is invalid, not a file, or not executable
 */
function validateExecutablePath(path: string): void {
  // Resolve to absolute path to prevent traversal attacks
  const resolvedPath = resolve(path);

  // Check if path exists
  if (!existsSync(resolvedPath)) {
    throw new Error(`Claude CLI path does not exist: ${path}`);
  }

  // Check if it's a file (not a directory)
  const stat = statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error(`Claude CLI path is not a file: ${path}`);
  }

  // Check if it's executable
  try {
    accessSync(resolvedPath, constants.X_OK);
  } catch {
    throw new Error(`Claude CLI path is not executable: ${path}`);
  }
}

/**
 * Detect Claude CLI binary location
 *
 * Priority:
 * 1. pathToClaudeCodeExecutable option (if provided)
 * 2. CLAUDE_BINARY env var (absolute path)
 * 3. PATH lookup (using 'which claude')
 *
 * @param options Query options (may contain pathToClaudeCodeExecutable)
 * @throws {Error} If Claude CLI is not found
 * @returns Absolute path to claude binary
 */
export function detectClaudeBinary(options?: Options): string {
  // Check option first (for embedded CLI from official SDK)
  if (options?.pathToClaudeCodeExecutable) {
    validateExecutablePath(options.pathToClaudeCodeExecutable);
    return resolve(options.pathToClaudeCodeExecutable);
  }

  // Check env var
  if (process.env.CLAUDE_BINARY) {
    validateExecutablePath(process.env.CLAUDE_BINARY);
    return resolve(process.env.CLAUDE_BINARY);
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
  } catch (_e) {
    // Ignore - will throw below
  }

  throw new Error(
    'Claude CLI not found. Install with:\n' +
    '  npm install -g @anthropic-ai/claude-code\n' +
    'Or set CLAUDE_BINARY environment variable to the path of your claude binary.'
  );
}
