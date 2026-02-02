/**
 * Process spawning for Claude CLI
 *
 * Handles:
 * - Building CLI arguments from Options
 * - Spawning the process with correct stdio configuration
 *
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 *
 * Note: Uses node:child_process for cross-runtime compatibility
 * (works in Node.js, Bun, and Deno)
 */

import { spawn, type ChildProcess } from 'node:child_process';
import type { Options } from '../types/index.ts';

/**
 * Build CLI arguments from Options
 *
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 *
 * For Baby Steps 1-4, we implement essential flags only.
 * Control protocol support (bidirectional communication) will be added in Baby Step 5.
 *
 * @param options Query options (including prompt)
 * @returns Array of CLI arguments
 */
export function buildCliArgs(options: Options & { prompt: string }): string[] {
  // Required flags (per gist spec)
  const args = [
    '--print',                      // Non-interactive mode
    '--output-format', 'stream-json', // NDJSON output
    '--verbose'                     // Required for stream-json format
  ];

  // Optional flags (implement subset for baby steps)

  // Permission mode
  if (options.permissionMode && options.permissionMode !== 'default') {
    args.push('--permission-mode', options.permissionMode);
  }

  // Model
  if (options.model) {
    args.push('--model', options.model);
  }

  // Max turns
  if (options.maxTurns) {
    args.push('--max-turns', String(options.maxTurns));
  }

  // Max budget USD
  if (options.maxBudgetUsd) {
    args.push('--max-budget-usd', String(options.maxBudgetUsd));
  }

  // Include partial messages (streaming)
  if (options.includePartialMessages) {
    args.push('--include-partial-messages');
  }

  // CWD
  if (options.cwd) {
    args.push('--cwd', options.cwd);
  }

  // TODO: Add in future steps (Baby Step 5+):
  // - --system-prompt
  // - --allowed-tools
  // - --include-partial-messages
  // - --mcp-config
  // - --resume
  // - --input-format stream-json (for bidirectional mode)

  // Prompt must be last after --
  args.push('--', options.prompt);

  return args;
}

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
 * @returns ChildProcess instance
 */
export function spawnClaude(binary: string, args: string[]): ChildProcess {
  return spawn(binary, args, {
    stdio: ['pipe', 'pipe', 'pipe'],  // stdin, stdout, stderr per gist spec
    shell: false,  // Don't use shell (security + performance)
  });
}
