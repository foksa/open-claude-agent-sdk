/**
 * Process spawner
 *
 * Spawns Claude CLI process with correct stdio configuration.
 *
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 * Recommended: spawn with stdio: ['pipe', 'pipe', 'pipe']
 *
 * Note: Uses node:child_process for cross-runtime compatibility
 * (works in Node.js, Bun, and Deno)
 *
 * @internal
 */

import { type ChildProcess, spawn } from 'node:child_process';

/**
 * Spawn Claude CLI process
 *
 * @param binary Path to claude binary or runtime executable
 * @param args CLI arguments
 * @param options Spawn options (cwd, env, stderr callback)
 * @returns ChildProcess instance
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
  // Always pipe stderr — CLI may need it for session management
  const stderrMode = 'pipe';

  // Build environment: merge process.env with user-provided env
  const env: Record<string, string | undefined> = {
    ...process.env,
    ...(options?.env ?? {}),
  };

  // Official SDK always sets these
  if (!env.CLAUDE_CODE_ENTRYPOINT) {
    env.CLAUDE_CODE_ENTRYPOINT = 'sdk-ts';
  }
  // Remove NODE_OPTIONS to avoid interfering with subprocess
  delete env.NODE_OPTIONS;
  // Mirror DEBUG_CLAUDE_AGENT_SDK to DEBUG
  if (env.DEBUG_CLAUDE_AGENT_SDK) {
    env.DEBUG = '1';
  }

  const proc = spawn(binary, args, {
    stdio: ['pipe', 'pipe', stderrMode],
    shell: false,
    cwd: options?.cwd,
    env: env as NodeJS.ProcessEnv,
  });

  // Wire up stderr callback if provided
  if (options?.stderr && proc.stderr) {
    proc.stderr.on('data', (chunk: Buffer) => options.stderr?.(chunk.toString()));
  }

  return proc;
}
