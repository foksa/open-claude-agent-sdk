/**
 * CLI argument builder
 *
 * Builds command-line arguments for spawning Claude CLI process.
 * Transforms Options object into the argument array expected by CLI.
 *
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 *
 * @internal
 */

import type { Options } from '../types/index.ts';
import {
  DEFAULT_PERMISSION_MODE,
  DEFAULT_SETTING_SOURCES,
  REQUIRED_CLI_FLAGS,
} from './defaults.ts';

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
  // Required flags for stream-json protocol (from defaults.ts)
  const args: string[] = [...REQUIRED_CLI_FLAGS];

  // Permission mode - always pass explicitly (official SDK behavior)
  const permissionMode = options.permissionMode ?? DEFAULT_PERMISSION_MODE;
  args.push('--permission-mode', permissionMode);

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

  // Max thinking tokens (extended thinking)
  if (options.maxThinkingTokens !== undefined) {
    args.push('--max-thinking-tokens', String(options.maxThinkingTokens));
  }

  // Max budget USD
  if (options.maxBudgetUsd) {
    args.push('--max-budget-usd', String(options.maxBudgetUsd));
  }

  // Include partial messages (streaming)
  if (options.includePartialMessages) {
    args.push('--include-partial-messages');
  }

  // Note: cwd is NOT a CLI argument. It's passed to spawn() as a process option.
  // The CLI doesn't support --cwd flag.

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

  // Allowed tools - pass to CLI if specified (official SDK behavior)
  if (options.allowedTools && options.allowedTools.length > 0) {
    args.push('--allowedTools', options.allowedTools.join(','));
  }

  // Disallowed tools - pass to CLI if specified
  if (options.disallowedTools && options.disallowedTools.length > 0) {
    args.push('--disallowedTools', options.disallowedTools.join(','));
  }

  // Setting sources (for skills/commands)
  // Official SDK default: [] (empty array) = no settings loaded
  // CLI default when flag omitted: loads all settings (user+project+local)
  // So we must explicitly pass empty string to match official SDK behavior
  const settingSources = options.settingSources ?? DEFAULT_SETTING_SOURCES;
  args.push('--setting-sources', settingSources.join(','));

  // Debug options (added in SDK v0.2.30)
  if (options.debugFile) {
    args.push('--debug-file', options.debugFile);
  } else if (options.debug) {
    args.push('--debug');
  }
  // DEBUG_CLAUDE_AGENT_SDK env var enables debug to stderr
  if (process.env.DEBUG_CLAUDE_AGENT_SDK) {
    args.push('--debug-to-stderr');
  }

  // Resume session (pass existing session ID to continue conversation)
  if (options.resume) {
    args.push('--resume', options.resume);
  }

  // Sandbox configuration - passed via --settings flag as JSON (matches official SDK)
  if (options.sandbox) {
    args.push('--settings', JSON.stringify({ sandbox: options.sandbox }));
  }

  // TODO: Add in future steps:
  // - --mcp-config

  // Baby Step 5: With --input-format stream-json, prompt is sent via stdin
  // NOT as CLI argument. The prompt will be sent as first user message on stdin.
  // No '-- prompt' argument needed!

  // Test support: Allow injecting extra CLI args for testing
  // Security: Only enabled in test environment to prevent misuse
  if (process.env.NODE_ENV === 'test' && (options as Record<string, unknown>)._testCliArgs) {
    args.push(...((options as Record<string, unknown>)._testCliArgs as string[]));
  }

  // Debug: log args if DEBUG_HOOKS is set
  if (process.env.DEBUG_HOOKS) {
    console.error('[DEBUG] CLI args:', args.join(' '));
  }

  return args;
}
