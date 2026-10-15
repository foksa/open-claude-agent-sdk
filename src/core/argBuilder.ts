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
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getConfigDir } from '../sessions/paths.ts';
import type { Options } from '../types/index.ts';

// ============================================================================
// Defaults — match official SDK behavior (discovered via proxy analysis)
// ============================================================================

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

// Every valued flag is sent as a single `--flag=value` argument (official SDK since v0.3.295)
type FlagMapping =
  | { key: keyof Options; flag: string; type: 'string' }
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
  { key: 'resume', flag: '--resume', type: 'string' },
  { key: 'sessionId', flag: '--session-id', type: 'string' },
  { key: 'resumeSessionAt', flag: '--resume-session-at', type: 'string' },
  { key: 'resumeDropsTurn', flag: '--resume-drops-turn', type: 'string' },

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

/** `--flag=value` as one argument — the official SDK's form for its named options. */
function flagValue(flag: string, value: unknown): string {
  return `${flag}=${value}`;
}

/**
 * `--flag value`, or `--flag=value` when the value itself looks like a flag.
 * The official SDK keeps this form for `--mcp-config`, `--managed-settings` and extraArgs.
 */
function pushFlagValue(args: string[], flag: string, value: unknown): void {
  const str = String(value);
  if (str.length > 1 && str.startsWith('-')) args.push(flagValue(flag, str));
  else args.push(flag, str);
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
    const dir = join(getConfigDir(), 'debug');
    // A fresh config dir has no debug/ yet; create it up front like the official SDK
    try {
      mkdirSync(dir, { recursive: true });
    } catch {}
    sdkDebugFile = join(dir, `sdk-${randomUUID()}.txt`);
    process.stderr.write(`SDK debug logs: ${sdkDebugFile}\n`);
  }
  return sdkDebugFile;
}

function isJsonObjectString(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.startsWith('{') && trimmed.endsWith('}');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

// Sandbox paths whose arrays are concatenated (deduped) instead of replaced
const SANDBOX_UNION_PATHS = new Set([
  'filesystem.denyRead',
  'filesystem.denyWrite',
  'network.deniedDomains',
  'credentials.files',
  'credentials.envVars',
]);
// Sandbox paths whose objects are replaced whole instead of deep-merged
const SANDBOX_REPLACE_PATHS = new Set(['ripgrep', 'network.tlsTerminate']);
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
// Inline proxy ports dropped when the option sets its own domain policy
const SANDBOX_PROXY_PORT_KEYS = ['httpProxyPort', 'socksProxyPort'] as const;

function deepMergeSandbox(
  base: unknown,
  override: Record<string, unknown>,
  path = ''
): Record<string, unknown> {
  const result: Record<string, unknown> = isPlainObject(base) ? { ...base } : {};
  for (const [key, value] of Object.entries(override)) {
    if (UNSAFE_KEYS.has(key) || value === undefined) continue;
    const keyPath = path ? `${path}.${key}` : key;
    const existing = Object.hasOwn(result, key) ? result[key] : undefined;
    if (SANDBOX_UNION_PATHS.has(keyPath) && Array.isArray(existing) && Array.isArray(value)) {
      result[key] = [...new Set([...existing, ...value])];
    } else if (
      isPlainObject(existing) &&
      isPlainObject(value) &&
      !SANDBOX_REPLACE_PATHS.has(keyPath)
    ) {
      result[key] = deepMergeSandbox(existing, value, keyPath);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * v0.3.296: the `sandbox` option merges into an inline `settings.sandbox` block
 * (option wins, deny/credential lists combine) instead of replacing it.
 */
function mergeSandboxSettings(
  inline: unknown,
  sandbox: NonNullable<Options['sandbox']>
): Record<string, unknown> {
  const opt = sandbox;
  const merged = deepMergeSandbox(inline, opt as Record<string, unknown>);
  // An option that configures filesystem restrictions re-enables an inline-disabled filesystem sandbox
  const credentialFiles = opt.credentials?.files;
  const setsFilesystem =
    opt.filesystem !== undefined ||
    (Array.isArray(credentialFiles) &&
      credentialFiles.some((f) => isPlainObject(f) && f.mode === 'deny'));
  const filesystem = merged.filesystem;
  if (
    setsFilesystem &&
    opt.filesystem?.disabled === undefined &&
    isPlainObject(filesystem) &&
    filesystem.disabled === true
  ) {
    delete filesystem.disabled;
  }
  const network = opt.network;
  const setsDomainPolicy =
    network?.allowedDomains !== undefined ||
    (network?.deniedDomains?.length ?? 0) > 0 ||
    network?.strictAllowlist === true;
  const mergedNetwork = merged.network;
  if (setsDomainPolicy && isPlainObject(mergedNetwork)) {
    for (const key of SANDBOX_PROXY_PORT_KEYS) {
      if (network?.[key] === undefined && mergedNetwork[key] !== undefined)
        delete mergedNetwork[key];
    }
  }
  // Official SDK defaults failIfUnavailable: true when enabled: true
  if (opt.enabled === true && merged.failIfUnavailable === undefined)
    merged.failIfUnavailable = true;
  return merged;
}

function applyFlagMap(args: string[], options: Options): void {
  for (const mapping of FLAG_MAP) {
    const value = options[mapping.key];
    switch (mapping.type) {
      case 'string':
        if (value) args.push(flagValue(mapping.flag, value));
        break;
      case 'number':
        if (value !== undefined) args.push(flagValue(mapping.flag, value));
        break;
      case 'positive-number':
        if (value) args.push(flagValue(mapping.flag, value));
        break;
      case 'boolean':
        if (value) args.push(mapping.flag);
        break;
      case 'boolean-inverted':
        if (value === false) args.push(mapping.flag);
        break;
      case 'csv': {
        const arr = value as string[] | undefined;
        if (arr && arr.length > 0) args.push(flagValue(mapping.flag, arr.join(',')));
        break;
      }
      case 'repeated': {
        const items = value as string[] | undefined;
        if (items) {
          for (const item of items) args.push(flagValue(mapping.flag, item));
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

  // Permission mode — only when set; an omitted mode is left to the CLI so a
  // settings `defaultMode` applies (official SDK behavior since v0.3.286)
  if (options.permissionMode !== undefined) {
    args.push(flagValue('--permission-mode', options.permissionMode));
  }

  // All simple flag mappings
  applyFlagMap(args, options);

  // projectConfigRoot — single `--project-config-root=<path>` arg (official SDK form)
  if (options.projectConfigRoot !== undefined) {
    args.push(flagValue('--project-config-root', options.projectConfigRoot));
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
      args.push(flagValue('--allowedTools', allowed.join(',')));
    }
  }

  // taskBudget — extract total from object: { total: number } → --task-budget=<total>
  if (options.taskBudget) {
    args.push(flagValue('--task-budget', options.taskBudget.total));
  }

  if (options.effort) {
    args.push(flagValue('--effort', options.effort));
  }

  // thinking — converts to CLI flags (official SDK behavior):
  //   adaptive                        → --thinking=adaptive
  //   disabled                        → --thinking=disabled
  //   enabled + budgetTokens          → --max-thinking-tokens=<budgetTokens>
  //   enabled (no budgetTokens)       → --thinking=adaptive (fallback)
  //   display (unless disabled)       → --thinking-display=<display>
  // maxThinkingTokens (without thinking): 0 → --thinking=disabled, else --max-thinking-tokens
  if (options.thinking) {
    switch (options.thinking.type) {
      case 'adaptive':
        args.push('--thinking=adaptive');
        break;
      case 'disabled':
        args.push('--thinking=disabled');
        break;
      case 'enabled':
        if (options.thinking.budgetTokens !== undefined) {
          args.push(flagValue('--max-thinking-tokens', options.thinking.budgetTokens));
        } else {
          args.push('--thinking=adaptive');
        }
        break;
    }
    if (options.thinking.type !== 'disabled' && options.thinking.display) {
      args.push(flagValue('--thinking-display', options.thinking.display));
    }
  } else if (options.maxThinkingTokens !== undefined) {
    if (options.maxThinkingTokens === 0) {
      args.push('--thinking=disabled');
    } else {
      args.push(flagValue('--max-thinking-tokens', options.maxThinkingTokens));
    }
  }

  // canUseTool / permissionPromptToolName — mutually exclusive
  if (options.canUseTool && options.permissionPromptToolName) {
    throw new Error(
      'canUseTool callback cannot be used with permissionPromptToolName. Please use one or the other.'
    );
  }
  if (options.canUseTool) {
    args.push('--permission-prompt-tool=stdio');
  } else if (options.permissionPromptToolName) {
    args.push(flagValue('--permission-prompt-tool', options.permissionPromptToolName));
  }

  // Fallback model — must differ from primary model
  if (options.fallbackModel) {
    if (options.fallbackModel === options.model) {
      throw new Error(
        'Fallback model cannot be the same as the main model. Please specify a different model for fallbackModel option.'
      );
    }
    args.push(flagValue('--fallback-model', options.fallbackModel));
  }

  // Output format (structured outputs)
  if (options.outputFormat?.type === 'json_schema') {
    args.push(flagValue('--json-schema', JSON.stringify(options.outputFormat.schema)));
  }

  // Setting sources — only pass when explicitly provided
  if (options.settingSources !== undefined) {
    args.push(flagValue('--setting-sources', options.settingSources.join(',')));
  }

  // Debug — debugFile takes priority over debug flag
  if (!options.debugFile && options.debug) {
    args.push('--debug');
  }
  if (!options.debugFile && !options.spawnClaudeCodeProcess) {
    const debugFile = getSdkDebugFile();
    if (debugFile) args.push(flagValue('--debug-file', debugFile));
  }

  // Tools — array → csv (empty array → `--tools=`), preset → "default"
  if (options.tools !== undefined) {
    if (Array.isArray(options.tools)) {
      args.push(flagValue('--tools', options.tools.join(',')));
    } else {
      args.push('--tools=default');
    }
  }

  // managedSettings — policy-tier settings passed in-memory to CLI
  if (options.managedSettings !== undefined) {
    pushFlagValue(args, '--managed-settings', JSON.stringify(options.managedSettings));
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
    if (settings && !isJsonObjectString(settings)) {
      throw new Error(
        'Cannot use both a settings file path and the sandbox option. Include the sandbox configuration in your settings file instead.'
      );
    }
    let base: Record<string, unknown> = {};
    if (settings) {
      try {
        base = JSON.parse(settings);
      } catch {}
    }
    settings = JSON.stringify({
      ...base,
      sandbox: mergeSandboxSettings(base.sandbox, options.sandbox),
    });
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
      pushFlagValue(args, `--${key}`, value);
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
      pushFlagValue(args, '--mcp-config', JSON.stringify({ mcpServers: serializedServers }));
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
          args.push(
            flagValue(plugin.skipMcpDiscovery ? '--plugin-dir-no-mcp' : '--plugin-dir', plugin.path)
          );
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
