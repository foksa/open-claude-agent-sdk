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
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 * Recommended: spawn with stdio: ['pipe', 'pipe', 'pipe']
 *
 * Note: Uses node:child_process for cross-runtime compatibility
 * (works in Node.js, Bun, and Deno)
 *
 * TODO: Add Bun-native optimization in future step if performance bottleneck detected
 *
 * @param binary Path to claude binary
 * @param args CLI arguments
 * @param options Spawn options (cwd, env, etc.)
 * @returns ChildProcess instance
 */
export function spawnClaude(
  binary: string,
  args: string[],
  options?: { cwd?: string }
): ChildProcess {
  return spawn(binary, args, {
    stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr per gist spec
    shell: false, // Don't use shell (security + performance)
    cwd: options?.cwd, // Working directory for the process
  });
}
