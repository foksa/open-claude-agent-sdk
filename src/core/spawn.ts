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
 * Baby Step 5: Includes --input-format stream-json for bidirectional communication
 * Prompt is optional - when using AsyncIterable input, prompt comes via stdin only
 *
 * @param options Query options (prompt is optional for AsyncIterable input)
 * @returns Array of CLI arguments
 */
export function buildCliArgs(options: Options & { prompt?: string }): string[] {
  // Required flags (per gist spec)
  const args = [
    '--print',                      // Non-interactive mode
    '--output-format', 'stream-json', // NDJSON output
    '--input-format', 'stream-json',  // Baby Step 5: Bidirectional communication
    '--verbose'                     // Required for stream-json format
  ];

  // Optional flags (implement subset for baby steps)

  // Permission mode
  if (options.permissionMode && options.permissionMode !== 'default') {
    args.push('--permission-mode', options.permissionMode);
  }

  // Allow dangerously skip permissions (for bypassPermissions mode)
  if (options.allowDangerouslySkipPermissions) {
    args.push('--allow-dangerously-skip-permissions');
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

  // Enable control protocol for permissions only (not hooks)
  // Hooks use control protocol but don't need --permission-prompt-tool stdio
  if (options.canUseTool) {
    args.push('--permission-prompt-tool', 'stdio');
  }

  // Output format (structured outputs)
  if (options.outputFormat) {
    if (options.outputFormat.type === 'json_schema') {
      args.push('--json-schema', JSON.stringify(options.outputFormat.schema));
    }
  }

  // Setting sources (for skills/commands)
  // Official SDK default: [] (empty array) = no settings loaded
  // CLI default when flag omitted: loads all settings (user+project+local)
  // So we must explicitly pass empty string to match official SDK behavior
  const settingSources = options.settingSources ?? []; // Default to empty like official SDK
  args.push('--setting-sources', settingSources.join(','));

  // TODO: Add in future steps (Baby Step 6+):
  // - --system-prompt
  // - --allowed-tools
  // - --mcp-config
  // - --resume

  // Baby Step 5: With --input-format stream-json, prompt is sent via stdin
  // NOT as CLI argument. The prompt will be sent as first user message on stdin.
  // No '-- prompt' argument needed!

  // Test support: Allow injecting extra CLI args for testing
  if ((options as any)._testCliArgs) {
    args.push(...(options as any)._testCliArgs);
  }

  // Debug: log args if DEBUG_HOOKS is set
  if (process.env.DEBUG_HOOKS) {
    console.error('[DEBUG] CLI args:', args.join(' '));
  }

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
