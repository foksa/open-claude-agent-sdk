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

import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { getConfigDir } from '../sessions/paths.ts';
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
  | { key: keyof Options; flag: string; type: 'positive-number' }
  | { key: keyof Options; flag: string; type: 'boolean' }
  | { key: keyof Options; flag: string; type: 'boolean-inverted' }
  | { key: keyof Options; flag: string; type: 'csv' }
  | { key: keyof Options; flag: string; type: 'repeated' };

const FLAG_MAP: FlagMapping[] = [
  // String pass-through
  { key: 'model', flag: '--model', type: 'string' },
  { key: 'agent', flag: '--agent', type: 'string' },
  { key: 'debugFile', flag: '--debug-file', type: 'string' },
  { key: 'permissionPrompts', flag: '--permission-prompts', type: 'string' },

  // String pass-through, bound with equals-form (--flag=value) — matches official SDK
  { key: 'resume', flag: '--resume', type: 'equals-string' },
  { key: 'sessionId', flag: '--session-id', type: 'equals-string' },
  { key: 'resumeSessionAt', flag: '--resume-session-at', type: 'equals-string' },
  { key: 'resumeDropsTurn', flag: '--resume-drops-turn', type: 'equals-string' },

  // Number → string (maxTurns: 0 is omitted, like the official SDK)
  { key: 'maxTurns', flag: '--max-turns', type: 'positive-number' },
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

/** `--key value`, or `--key=value` when the value itself looks like a flag. */
function pushFlagValue(args: string[], key: string, value: unknown): void {
  const str = String(value);
  if (str.length > 1 && str.startsWith('-')) args.push(`--${key}=${str}`);
  else args.push(`--${key}`, str);
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: control characters are what we reject
const INVALID_SKILL_CHARS = /[(),\u0000-\u001f\u007f-\u009f]/;
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/** Reject skill names that could not match a Skill(...) permission rule (official SDK checks). */
function validateSkillName(name: unknown): string {
  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error('Skill names must be non-empty strings.');
  }
  const shown = JSON.stringify(name);
  if (LONE_SURROGATE.test(name)) {
    throw new Error(
      `Invalid skill name ${shown}: the name contains an unpaired surrogate, which cannot survive the UTF-8 encoding of the CLI invocation; no skill discovered from the filesystem can have such a name.`
    );
  }
  if (name !== name.trim()) {
    throw new Error(
      `Invalid skill name ${shown}: leading or trailing whitespace is not allowed — the Skill tool trims the invoked name, so a padded rule can never match. Remove the padding.`
    );
  }
  if (INVALID_SKILL_CHARS.test(name)) {
    throw new Error(
      `Invalid skill name ${shown}: parentheses, commas, and control characters are not allowed in skill names. Skill names match the skill's directory name (or 'plugin:skill' for plugin-qualified skills); rename the skill if its directory name contains these characters.`
    );
  }
  if (name === '*')
    throw new Error("Invalid skill name '*': use skills: 'all' to enable every skill.");
  if (name.endsWith(':*') || name.endsWith(' *')) {
    throw new Error(
      `Invalid skill name ${shown}: wildcard-suffix names are not allowed; list each skill by its exact name.`
    );
  }
  if (name.startsWith('/')) {
    throw new Error(
      `Invalid skill name ${shown}: skill names may not start with '/'. Skills are invoked as slash commands, but the skills option takes the skill's canonical name — the directory name, or 'plugin:skill'.`
    );
  }
  if (name.includes('\\\\')) {
    throw new Error(
      `Invalid skill name ${shown}: consecutive backslashes are not allowed — the permission-rule parser collapses escaped backslashes, so the rule would name a different skill. Rename the skill.`
    );
  }
  if (name.endsWith('\\')) {
    throw new Error(`Invalid skill name ${shown}: names may not end with an unpaired backslash.`);
  }
  return name;
}

/** Truthy env flag the way the official SDK parses it ("1", "true", "yes", "on"). */
export function isEnvTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
}

let sdkDebugFile: string | undefined;

/**
 * With DEBUG_CLAUDE_AGENT_SDK set in this process, the official SDK points the
 * CLI at one `<configDir>/debug/sdk-<uuid>.txt` per process and announces it once.
 */
function getSdkDebugFile(): string | undefined {
  if (!isEnvTruthy(process.env.DEBUG_CLAUDE_AGENT_SDK)) return undefined;
  if (!sdkDebugFile) {
    sdkDebugFile = join(getConfigDir(), 'debug', `sdk-${randomUUID()}.txt`);
    process.stderr.write(`SDK debug logs: ${sdkDebugFile}\n`);
  }
  return sdkDebugFile;
}

function isJsonObjectString(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

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
      case 'positive-number':
        if (value) args.push(mapping.flag, String(value));
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

  // projectConfigRoot — single `--project-config-root=<path>` arg (official SDK form)
  if (options.projectConfigRoot !== undefined) {
    args.push(`--project-config-root=${options.projectConfigRoot}`);
  }

  // allowedTools + skills — merged into single --allowedTools CSV
  // skills: 'all'      → appends 'Skill' to the CSV
  // skills: string[]   → appends 'Skill(name)' per entry (validated, deduplicated)
  {
    const allowed = [...(options.allowedTools ?? [])];
    if (options.skills !== undefined) {
      const entries =
        options.skills === 'all'
          ? ['Skill']
          : options.skills.map((name) => `Skill(${validateSkillName(name)})`);
      const existing = new Set(allowed);
      allowed.push(...entries.filter((entry) => !existing.has(entry)));
    }
    if (allowed.length > 0) {
      args.push('--allowedTools', allowed.join(','));
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
  //   display (unless disabled)       → --thinking-display <display>
  // maxThinkingTokens (without thinking): 0 → --thinking disabled, else --max-thinking-tokens
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
    if (options.thinking.type !== 'disabled' && options.thinking.display) {
      args.push('--thinking-display', options.thinking.display);
    }
  } else if (options.maxThinkingTokens !== undefined) {
    if (options.maxThinkingTokens === 0) {
      args.push('--thinking', 'disabled');
    } else {
      args.push('--max-thinking-tokens', String(options.maxThinkingTokens));
    }
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
  if (!options.debugFile && !options.spawnClaudeCodeProcess) {
    const debugFile = getSdkDebugFile();
    if (debugFile) args.push('--debug-file', debugFile);
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

  // settings + sandbox — both go via --settings (official SDK behavior):
  // an object (or JSON string) is merged with sandbox; a file path cannot be
  let settings =
    options.settings === undefined
      ? undefined
      : typeof options.settings === 'string'
        ? options.settings
        : JSON.stringify(options.settings);
  if (options.sandbox) {
    // Official SDK defaults failIfUnavailable: true when enabled: true
    const sandbox =
      options.sandbox.enabled === true && options.sandbox.failIfUnavailable === undefined
        ? { ...options.sandbox, failIfUnavailable: true }
        : options.sandbox;
    if (settings && !isJsonObjectString(settings)) {
      throw new Error(
        'Cannot use both a settings file path and the sandbox option. Include the sandbox configuration in your settings file instead.'
      );
    }
    let merged: Record<string, unknown> = { sandbox };
    if (settings) {
      try {
        merged = { ...JSON.parse(settings), sandbox };
      } catch {}
    }
    settings = JSON.stringify(merged);
  }

  // extraArgs — user-supplied passthrough flags (settings overrides extraArgs.settings)
  const mergedExtraArgs: Record<string, string | null> = {
    ...(options.extraArgs ?? {}),
    ...(settings !== undefined && { settings }),
  };
  for (const [key, value] of Object.entries(mergedExtraArgs)) {
    if (value === null) {
      args.push(`--${key}`);
    } else {
      pushFlagValue(args, key, value);
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

  // Plugins → --plugin-dir (one per plugin), or --plugin-dir-no-mcp with skipMcpDiscovery.
  // With pluginDelivery: 'initialize', the list is sent over stdin in the initialize
  // request instead (see sendProtocolInit), and the CLI is started with --await-initialize
  // so the command line doesn't grow with the plugin count.
  if (options.plugins && options.plugins.length > 0) {
    if (options.pluginDelivery === 'initialize') {
      args.push('--await-initialize');
    } else {
      for (const plugin of options.plugins) {
        if (plugin.type === 'local') {
          args.push(plugin.skipMcpDiscovery ? '--plugin-dir-no-mcp' : '--plugin-dir', plugin.path);
        } else {
          throw new Error(`Unsupported plugin type: ${(plugin as { type: string }).type}`);
        }
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
