/**
 * SDK Defaults
 *
 * Central place for all default values to match official SDK behavior.
 * These were discovered by comparing proxy logs between lite and official SDKs.
 *
 * @see docs/guides/REVERSE_ENGINEERING.md for methodology
 */

/**
 * Default permission mode when not specified
 * Official SDK passes --permission-mode default explicitly
 */
export const DEFAULT_PERMISSION_MODE = 'default';

/**
 * Default setting sources (empty = no filesystem settings loaded)
 * Official SDK default: [] which means faster startup, no user settings
 */
export const DEFAULT_SETTING_SOURCES: string[] = [];

/**
 * Required CLI flags for stream-json protocol
 * These are always passed regardless of options
 *
 * Note: Official SDK does NOT use --print flag
 */
export const REQUIRED_CLI_FLAGS = [
  '--output-format',
  'stream-json',
  '--input-format',
  'stream-json',
  '--verbose', // Required for stream-json format
] as const;

/**
 * Default model when not specified
 * Note: Official SDK doesn't have a default - CLI picks its own default
 */
export const DEFAULT_MODEL = undefined;

/**
 * Default max turns when not specified
 * Note: Official SDK doesn't have a default - CLI picks its own default
 */
export const DEFAULT_MAX_TURNS = undefined;
