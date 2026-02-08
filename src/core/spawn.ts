/**
 * CLI detection and process spawning
 *
 * Finds the Claude CLI binary and spawns it with correct stdio configuration.
 *
 * @internal
 */

import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { accessSync, constants, existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Options } from '../types/index.ts';

// ============================================================================
// CLI detection
// ============================================================================

/**
 * Validate that a path points to an executable file
 * @throws {Error} If path is invalid, not a file, or not executable
 */
function validateExecutablePath(path: string): void {
  const resolvedPath = resolve(path);

  if (!existsSync(resolvedPath)) {
    throw new Error(`Claude CLI path does not exist: ${path}`);
  }

  const stat = statSync(resolvedPath);
  if (!stat.isFile()) {
    throw new Error(`Claude CLI path is not a file: ${path}`);
  }

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
 * @throws {Error} If Claude CLI is not found
 */
export function detectClaudeBinary(options?: Options): string {
  if (options?.pathToClaudeCodeExecutable) {
    validateExecutablePath(options.pathToClaudeCodeExecutable);
    return resolve(options.pathToClaudeCodeExecutable);
  }

  if (process.env.CLAUDE_BINARY) {
    validateExecutablePath(process.env.CLAUDE_BINARY);
    return resolve(process.env.CLAUDE_BINARY);
  }

  try {
    const result = spawnSync('which', ['claude'], { encoding: 'utf-8' });
    if (result.status === 0 && result.stdout) {
      const path = result.stdout.trim();
      if (path) return path;
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

// ============================================================================
// Process spawning
// ============================================================================

/**
 * Spawn Claude CLI process
 *
 * @param binary Path to claude binary or runtime executable
 * @param args CLI arguments
 * @param options Spawn options (cwd, env, stderr callback)
 */
export function spawnClaude(
  binary: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: Record<string, string | undefined>;
    stderr?: (data: string) => void;
  }
): ChildProcess {
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...(options?.env ?? {}),
  };

  // Official SDK always sets these
  if (!env.CLAUDE_CODE_ENTRYPOINT) {
    env.CLAUDE_CODE_ENTRYPOINT = 'sdk-ts';
  }
  delete env.NODE_OPTIONS;
  if (env.DEBUG_CLAUDE_AGENT_SDK) {
    env.DEBUG = '1';
  }

  const proc = spawn(binary, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: false,
    cwd: options?.cwd,
    env: env as NodeJS.ProcessEnv,
  });

  if (options?.stderr && proc.stderr) {
    proc.stderr.on('data', (chunk: Buffer) => options.stderr?.(chunk.toString()));
  }

  return proc;
}
