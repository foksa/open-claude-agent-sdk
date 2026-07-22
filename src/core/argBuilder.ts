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
  | { key: keyof Options; flag: string; type: 'equals-string' }
  | { key: keyof Options; flag: string; type: 'number' }
  | { key: keyof Options; flag: string; type: 'boolean' }
  | { key: keyof Options; flag: string; type: 'boolean-inverted' }
  | { key: keyof Options; flag: string; type: 'csv' }
  | { key: keyof Options; flag: string; type: 'repeated' };

const FLAG_MAP: FlagMapping[] = [
  // String pass-through
  { key: 'model', flag: '--model', type: 'string' },
  { key: 'agent', flag: '--agent', type: 'string' },
  { key: 'debugFile', flag: '--debug-file', type: 'string' },

  // String pass-through, bound with equals-form (--flag=value) — matches official SDK
  { key: 'resume', flag: '--resume', type: 'equals-string' },
  { key: 'sessionId', flag: '--session-id', type: 'equals-string' },
  { key: 'resumeSessionAt', flag: '--resume-session-at', type: 'equals-string' },

  // Number → string
  { key: 'maxTurns', flag: '--max-turns', type: 'number' },
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
  { key: 'includeHookEvents', flag: '--include-hook-events', type: 'boolean' },

  // Boolean inverted (flag present when value is false)
  { key: 'persistSession', flag: '--no-session-persistence', type: 'boolean-inverted' },

  // Array → comma-separated value
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
      case 'equals-string':
        if (value) args.push(`${mapping.flag}=${value as string}`);
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

  // allowedTools + skills — merged into single --allowedTools CSV
  // skills: 'all'      → appends 'Skill' to the CSV
  // skills: string[]   → appends 'Skill(name)' per entry to the CSV
  {
    const skillEntries: string[] = [];
    if (options.skills === 'all') {
      skillEntries.push('Skill');
    } else if (Array.isArray(options.skills) && options.skills.length > 0) {
      for (const skill of options.skills) {
        skillEntries.push(`Skill(${skill})`);
      }
    }
    const allAllowedTools = [...(options.allowedTools ?? []), ...skillEntries];
    if (allAllowedTools.length > 0) {
      args.push('--allowedTools', allAllowedTools.join(','));
    }
  }

  // taskBudget — extract total from object: { total: number } → --task-budget <total>
  if (options.taskBudget) {
    args.push('--task-budget', String(options.taskBudget.total));
  }

  // effort — pass through as --effort <value>
  if (options.effort) {
    args.push('--effort', options.effort);
  }

  // thinking — converts to CLI flags (official SDK behavior):
  //   adaptive                        → --thinking adaptive
  //   disabled                        → --thinking disabled
  //   enabled + budgetTokens          → --max-thinking-tokens <budgetTokens>
  //   enabled (no budgetTokens)       → --thinking adaptive (fallback)
  // maxThinkingTokens (without thinking) → --max-thinking-tokens <value>
  if (options.thinking) {
    switch (options.thinking.type) {
      case 'adaptive':
        args.push('--thinking', 'adaptive');
        break;
      case 'disabled':
        args.push('--thinking', 'disabled');
        break;
      case 'enabled':
        if (options.thinking.budgetTokens !== undefined) {
          args.push('--max-thinking-tokens', String(options.thinking.budgetTokens));
        } else {
          args.push('--thinking', 'adaptive');
        }
        break;
    }
  } else if (options.maxThinkingTokens !== undefined) {
    args.push('--max-thinking-tokens', String(options.maxThinkingTokens));
  }

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

  // Setting sources — only pass when explicitly provided
  // Use = syntax to prevent empty string consuming the next CLI flag
  if (options.settingSources !== undefined) {
    args.push(`--setting-sources=${options.settingSources.join(',')}`);
  }

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

  // managedSettings — policy-tier settings passed in-memory to CLI
  if (options.managedSettings !== undefined) {
    args.push('--managed-settings', JSON.stringify(options.managedSettings));
  }

  // settings + sandbox — both go via --settings flag
  // settings can be a string (path) or an object; sandbox merges into the object form
  if (options.settings !== undefined || options.sandbox) {
    if (typeof options.settings === 'string' && !options.sandbox) {
      // Path to settings file — pass through directly
      args.push('--settings', options.settings);
    } else {
      // Object form — merge settings + sandbox into one JSON blob
      let settingsObj: Record<string, unknown> =
        typeof options.settings === 'object' && options.settings !== undefined
          ? { ...options.settings }
          : {};
      if (options.sandbox) {
        // Official SDK defaults failIfUnavailable: true when enabled: true
        const sandbox =
          options.sandbox.enabled && options.sandbox.failIfUnavailable === undefined
            ? { ...options.sandbox, failIfUnavailable: true }
            : options.sandbox;
        settingsObj = { ...settingsObj, sandbox };
      }
      args.push('--settings', JSON.stringify(settingsObj));
    }
  }

  // extraArgs — user-supplied passthrough flags
  const mergedExtraArgs = { ...(options.extraArgs ?? {}) };
  for (const [key, value] of Object.entries(mergedExtraArgs)) {
    if (value === null) {
      args.push(`--${key}`);
    } else {
      args.push(`--${key}`, value);
    }
  }

  // MCP servers → --mcp-config (only process-based servers; SDK servers are handled in-process)
  if (options.mcpServers) {
    const serializedServers: Record<string, unknown> = {};
    for (const [name, config] of Object.entries(options.mcpServers)) {
      if ('instance' in config) {
        // SDK (in-process) servers — skip from --mcp-config, handled via sdkMcpServers in init
        continue;
      }
      serializedServers[name] = config;
    }
    if (Object.keys(serializedServers).length > 0) {
      args.push('--mcp-config', JSON.stringify({ mcpServers: serializedServers }));
    }
  }

  // Plugins → --plugin-dir (one per plugin), or --plugin-dir-no-mcp with skipMcpDiscovery
  if (options.plugins && options.plugins.length > 0) {
    for (const plugin of options.plugins) {
      if (plugin.type === 'local') {
        args.push(plugin.skipMcpDiscovery ? '--plugin-dir-no-mcp' : '--plugin-dir', plugin.path);
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
