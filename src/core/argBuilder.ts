/**
 * CLI argument builder
 *
 * Builds command-line arguments for spawning Claude CLI process.
 * Transforms Options object into the argument array expected by CLI.
 *
 * Simple options are declared in FLAG_MAP (option key → CLI flag).
 * Complex options with validation or transformation logic are handled explicitly below.
 *
 * @internal
 */

import type { Options } from '../types/index.ts';

// ============================================================================
// Defaults — match official SDK behavior (discovered via proxy analysis)
// ============================================================================

/** Official SDK passes --permission-mode default explicitly */
const DEFAULT_PERMISSION_MODE = 'default';

/** Empty = no filesystem settings loaded (faster startup) */
const DEFAULT_SETTING_SOURCES: string[] = [];

/** Required CLI flags for stream-json protocol */
const REQUIRED_CLI_FLAGS = [
  '--output-format',
  'stream-json',
  '--input-format',
  'stream-json',
  '--verbose',
] as const;

// ============================================================================
// Declarative flag mapping — option key → CLI flag + type
// ============================================================================

type FlagMapping =
  | { key: keyof Options; flag: string; type: 'string' }
  | { key: keyof Options; flag: string; type: 'number' }
  | { key: keyof Options; flag: string; type: 'boolean' }
  | { key: keyof Options; flag: string; type: 'boolean-inverted' }
  | { key: keyof Options; flag: string; type: 'csv' }
  | { key: keyof Options; flag: string; type: 'repeated' };

const FLAG_MAP: FlagMapping[] = [
  // String pass-through
  { key: 'model', flag: '--model', type: 'string' },
  { key: 'resume', flag: '--resume', type: 'string' },
  { key: 'agent', flag: '--agent', type: 'string' },
  { key: 'sessionId', flag: '--session-id', type: 'string' },
  { key: 'resumeSessionAt', flag: '--resume-session-at', type: 'string' },
  { key: 'debugFile', flag: '--debug-file', type: 'string' },

  // Number → string
  { key: 'maxTurns', flag: '--max-turns', type: 'number' },
  { key: 'maxThinkingTokens', flag: '--max-thinking-tokens', type: 'number' },
  { key: 'maxBudgetUsd', flag: '--max-budget-usd', type: 'number' },

  // Boolean flags (present when truthy)
  {
    key: 'allowDangerouslySkipPermissions',
    flag: '--allow-dangerously-skip-permissions',
    type: 'boolean',
  },
  { key: 'includePartialMessages', flag: '--include-partial-messages', type: 'boolean' },
  { key: 'continue', flag: '--continue', type: 'boolean' },
  { key: 'forkSession', flag: '--fork-session', type: 'boolean' },
  { key: 'strictMcpConfig', flag: '--strict-mcp-config', type: 'boolean' },

  // Boolean inverted (flag present when value is false)
  { key: 'persistSession', flag: '--no-session-persistence', type: 'boolean-inverted' },

  // Array → comma-separated value
  { key: 'allowedTools', flag: '--allowedTools', type: 'csv' },
  { key: 'disallowedTools', flag: '--disallowedTools', type: 'csv' },
  { key: 'betas', flag: '--betas', type: 'csv' },

  // Array → one flag per element
  // NOTE: To load CLAUDE.md from these directories, users must also set
  // env: { CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD: '1' }
  { key: 'additionalDirectories', flag: '--add-dir', type: 'repeated' },
];

function applyFlagMap(args: string[], options: Options): void {
  for (const mapping of FLAG_MAP) {
    const value = options[mapping.key];
    switch (mapping.type) {
      case 'string':
        if (value) args.push(mapping.flag, value as string);
        break;
      case 'number':
        if (value !== undefined) args.push(mapping.flag, String(value));
        break;
      case 'boolean':
        if (value) args.push(mapping.flag);
        break;
      case 'boolean-inverted':
        if (value === false) args.push(mapping.flag);
        break;
      case 'csv': {
        const arr = value as string[] | undefined;
        if (arr && arr.length > 0) args.push(mapping.flag, arr.join(','));
        break;
      }
      case 'repeated': {
        const items = value as string[] | undefined;
        if (items) {
          for (const item of items) args.push(mapping.flag, item);
        }
        break;
      }
    }
  }
}

// ============================================================================
// Special cases — validation, complex transforms, conditional logic
// ============================================================================

export function buildCliArgs(options: Options & { prompt?: string }): string[] {
  const args: string[] = [...REQUIRED_CLI_FLAGS];

  // Permission mode — always pass explicitly (official SDK behavior)
  args.push('--permission-mode', options.permissionMode ?? DEFAULT_PERMISSION_MODE);

  // All simple flag mappings
  applyFlagMap(args, options);

  // canUseTool / permissionPromptToolName — mutually exclusive
  if (options.canUseTool && options.permissionPromptToolName) {
    throw new Error(
      'canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.'
    );
  }
  if (options.canUseTool) {
    args.push('--permission-prompt-tool', 'stdio');
  } else if (options.permissionPromptToolName) {
    args.push('--permission-prompt-tool', options.permissionPromptToolName);
  }

  // Fallback model — must differ from primary model
  if (options.fallbackModel) {
    if (options.fallbackModel === options.model) {
      throw new Error(
        'Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.'
      );
    }
    args.push('--fallback-model', options.fallbackModel);
  }

  // Output format (structured outputs)
  if (options.outputFormat?.type === 'json_schema') {
    args.push('--json-schema', JSON.stringify(options.outputFormat.schema));
  }

  // Setting sources — default [] = no settings loaded (must pass explicitly)
  const settingSources = options.settingSources ?? DEFAULT_SETTING_SOURCES;
  args.push('--setting-sources', settingSources.join(','));

  // Debug — debugFile takes priority over debug flag
  if (!options.debugFile && options.debug) {
    args.push('--debug');
  }
  if (process.env.DEBUG_CLAUDE_AGENT_SDK) {
    args.push('--debug-to-stderr');
  }

  // Tools — array → csv, preset → "default"
  if (options.tools !== undefined) {
    if (Array.isArray(options.tools)) {
      args.push('--tools', options.tools.length > 0 ? options.tools.join(',') : '');
    } else {
      args.push('--tools', 'default');
    }
  }

  // extraArgs + sandbox — sandbox merges into extraArgs.settings as JSON
  const mergedExtraArgs = { ...(options.extraArgs ?? {}) };
  if (options.sandbox) {
    let settingsObj: Record<string, unknown> = { sandbox: options.sandbox };
    if (mergedExtraArgs.settings) {
      try {
        settingsObj = { ...JSON.parse(mergedExtraArgs.settings), sandbox: options.sandbox };
      } catch {
        // If settings is not valid JSON, overwrite
      }
    }
    mergedExtraArgs.settings = JSON.stringify(settingsObj);
  }
  for (const [key, value] of Object.entries(mergedExtraArgs)) {
    if (value === null) {
      args.push(`--${key}`);
    } else {
      args.push(`--${key}`, value);
    }
  }

  // MCP servers → --mcp-config (strip non-serializable `instance` from SDK servers)
  if (options.mcpServers) {
    const serializedServers: Record<string, unknown> = {};
    for (const [name, config] of Object.entries(options.mcpServers)) {
      if ('instance' in config) {
        const { instance: _, ...rest } = config;
        serializedServers[name] = rest;
      } else {
        serializedServers[name] = config;
      }
    }
    if (Object.keys(serializedServers).length > 0) {
      args.push('--mcp-config', JSON.stringify({ mcpServers: serializedServers }));
    }
  }

  // Plugins → --plugin-dir (one per plugin)
  if (options.plugins && options.plugins.length > 0) {
    for (const plugin of options.plugins) {
      if (plugin.type === 'local') {
        args.push('--plugin-dir', plugin.path);
      } else {
        throw new Error(`Unsupported plugin type: ${(plugin as { type: string }).type}`);
      }
    }
  }

  // Test support: inject extra CLI args (test environment only)
  if (process.env.NODE_ENV === 'test' && (options as Record<string, unknown>)._testCliArgs) {
    args.push(...((options as Record<string, unknown>)._testCliArgs as string[]));
  }

  if (process.env.DEBUG_HOOKS) {
    console.error('[DEBUG] CLI args:', args.join(' '));
  }

  return args;
}
