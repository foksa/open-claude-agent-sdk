/**
 * Main query implementation - spawns Claude CLI and streams messages
 *
 * IMPORTANT: This is a simplified one-shot implementation for Baby Steps 1-4.
 * It does NOT handle:
 * - Control protocol requests (can_use_tool, hooks)
 * - Bidirectional stdin/stdout communication
 * - Interactive permission prompts
 *
 * For now, use with permissionMode: 'bypassPermissions' or non-interactive modes.
 * Full bidirectional support will be added in Baby Step 5.
 *
 * Reference: https://buildwithaws.substack.com/p/inside-the-claude-agent-sdk-from
 */

import type { Options, SDKMessage } from '../types/index.ts';
import { detectClaudeBinary } from '../core/detection.ts';
import { buildCliArgs, spawnClaude } from '../core/spawn.ts';
import { parseNDJSON } from '../core/parser.ts';

/**
 * Main query function - spawns Claude CLI and streams messages
 *
 * This is a one-shot implementation (no bidirectional control protocol).
 * Suitable for:
 * - permissionMode: 'bypassPermissions' (with allowDangerouslySkipPermissions: true)
 * - permissionMode: 'plan' (read-only planning mode)
 * - Non-interactive queries
 *
 * NOT suitable for:
 * - Interactive permission prompts
 * - Hook callbacks
 * - Runtime control (interrupt, setPermissionMode, etc.)
 *
 * @param params Query parameters (prompt and options)
 * @yields SDKMessage objects from CLI
 */
export async function* query(params: {
  prompt: string;
  options?: Options;
}): AsyncIterableIterator<SDKMessage> {
  const { prompt, options = {} } = params;

  // 1. Detect binary
  const binary = detectClaudeBinary();

  // 2. Build args (merge prompt into options for buildCliArgs)
  const mergedOptions: Options & { prompt: string } = { ...options, prompt };
  const args = buildCliArgs(mergedOptions);

  // 3. Spawn process
  const process = spawnClaude(binary, args);

  // Close stdin immediately for non-interactive mode
  // This signals to CLI that no further input is coming
  if (process.stdin) {
    process.stdin.end();
  }

  // Set up process exit handler
  let exitCode: number | null = null;
  let exitError: Error | null = null;

  const exitPromise = new Promise<void>((resolve, reject) => {
    process.on('exit', (code) => {
      exitCode = code;
      if (code === 0 || code === null) {
        resolve();
      } else {
        const error = new Error(`Claude CLI exited with code ${code}`);
        exitError = error;
        reject(error);
      }
    });
    process.on('error', (err) => {
      exitError = err;
      reject(err);
    });
  });

  // Handle stderr (optionally log for debugging)
  if (process.stderr) {
    process.stderr.on('data', (data) => {
      // Optionally log stderr for debugging
      // console.error('[Claude CLI stderr]', data.toString());
    });
  }

  // 4. Parse NDJSON output (one-way: stdout only)
  // TODO (Baby Step 5): Add control protocol handling for stdin/stdout bidirectional
  try {
    if (process.stdout) {
      yield* parseNDJSON(process.stdout);
    }
  } catch (error) {
    // If parsing fails, kill the process
    process.kill();
    throw error;
  }

  // 5. Wait for process to exit gracefully
  // If process already exited during parsing, this resolves immediately
  await exitPromise;
}
