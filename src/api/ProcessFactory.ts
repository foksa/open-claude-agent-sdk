/**
 * Process factory for dependency injection
 *
 * Allows unit tests to inject mock processes without spawning real CLI.
 *
 * @internal
 */

import type { ChildProcess } from 'node:child_process';
import { COMPATIBLE_SDK_VERSION } from '../constants.ts';
import { buildCliArgs, isEnvTruthy } from '../core/argBuilder.ts';
import { detectClaudeBinary, spawnClaude } from '../core/spawn.ts';
import type { Options } from '../types/index.ts';

/**
 * Interface for creating CLI processes
 * Allows dependency injection for testing
 */
export interface ProcessFactory {
  /**
   * @param forwardedSignal Signal handed to the spawned process. It is *not*
   *   the caller's `abortController.signal`: the official SDK forwards the
   *   abort only after stdin is closed and the CLI has had its grace period,
   *   so the child gets a chance to flush session state first.
   */
  spawn(options: Options, forwardedSignal?: AbortSignal): ChildProcess;
}

/**
 * Check if a path is a native binary (not a JS file)
 * Matches official SDK: if NOT .js/.mjs/.tsx/.ts/.jsx, it's a native binary
 */
function isNativeBinary(path: string): boolean {
  return !['.js', '.mjs', '.tsx', '.ts', '.jsx'].some((ext) => path.endsWith(ext));
}

/**
 * Get default JavaScript runtime
 */
function getDefaultExecutable(): string {
  return typeof process.versions.bun !== 'undefined' ? 'bun' : 'node';
}

/** Default wait for `idle` after a result before a run counts as ended (official SDK). */
const DEFAULT_RUN_END_CEILING_MS = 600_000;

/**
 * Parse an integer env value the way the official SDK does: exponent forms
 * ("6e5") and thousands-grouped forms ("600,000") are accepted, anything else
 * goes through parseInt.
 */
function parseEnvInt(value: string | undefined): number {
  const s = String(value).trim();
  if (s.length <= 32) {
    if (/^[+-]?(\d+(\.\d*)?|\.\d+)[eE][+-]?\d+$/.test(s)) {
      const n = Number(s);
      return Number.isInteger(n) ? n : Number.NaN;
    }
    if (/^[+-]?\d{1,3}([_,\u00A0\u202F ])\d{3}(?:\1\d{3})*$/.test(s)) {
      return Number.parseInt(s.replace(/[_,\u00A0\u202F ]/g, ''), 10);
    }
  }
  return Number.parseInt(s, 10);
}

/**
 * How long after a result to wait for `session_state_changed: idle` before
 * the run counts as ended: CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS from the
 * CLI's env, else 10 minutes. 0 waits for `idle` with no ceiling (official SDK).
 */
export function runEndCeilingMs(options: Options): number {
  const env = options.env !== undefined ? options.env : process.env;
  const ms = parseEnvInt(env.CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS);
  return Number.isFinite(ms) && ms >= 0 ? ms : DEFAULT_RUN_END_CEILING_MS;
}

/**
 * Default implementation that spawns real Claude CLI
 */
export class DefaultProcessFactory implements ProcessFactory {
  spawn(options: Options, forwardedSignal?: AbortSignal): ChildProcess {
    const cliArgs = buildCliArgs({ ...options, prompt: '' });

    // v0.2.113+: user env replaces process.env entirely; undefined means use process.env
    const base = options.env !== undefined ? options.env : process.env;
    const env: Record<string, string | undefined> = { ...base };
    if (options.enableFileCheckpointing) {
      env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = 'true';
    }
    if (options.toolConfig?.askUserQuestion?.previewFormat) {
      env.CLAUDE_CODE_QUESTION_PREVIEW_FORMAT = options.toolConfig.askUserQuestion.previewFormat;
    }
    // Official SDK always sets these
    if (!env.CLAUDE_CODE_ENTRYPOINT) env.CLAUDE_CODE_ENTRYPOINT = 'sdk-ts';
    if (!env.CLAUDE_AGENT_SDK_VERSION) env.CLAUDE_AGENT_SDK_VERSION = COMPATIBLE_SDK_VERSION;
    // We read `session_state_changed` to tell when a run has ended (v0.3.284)
    if (!Object.keys(env).some((k) => k.toUpperCase() === 'CLAUDE_CODE_SDK_READS_SESSION_STATE')) {
      env.CLAUDE_CODE_SDK_READS_SESSION_STATE = '1';
    }
    delete env.NODE_OPTIONS;
    if (isEnvTruthy(env.DEBUG_CLAUDE_AGENT_SDK)) env.DEBUG = '1';
    else delete env.DEBUG;

    // A native binary runs directly (`executable` is ignored); a JS entrypoint
    // runs under `executable` (default: the current runtime)
    const scriptPath = detectClaudeBinary(options);
    const native = isNativeBinary(scriptPath);
    const executableArgs = options.executableArgs ?? [];
    const command = native ? scriptPath : (options.executable ?? getDefaultExecutable());
    const args = native
      ? [...executableArgs, ...cliArgs]
      : [...executableArgs, scriptPath, ...cliArgs];

    // Never the caller's signal directly — QueryImpl forwards the abort after
    // the graceful-exit window so the CLI can flush session state (official SDK)
    const signal = forwardedSignal ?? new AbortController().signal;

    if (options.spawnClaudeCodeProcess) {
      const spawnedProcess = options.spawnClaudeCodeProcess({
        command,
        args,
        cwd: options.cwd,
        env,
        signal,
      });
      // Wrap SpawnedProcess to ChildProcess-compatible object
      return spawnedProcess as unknown as ChildProcess;
    }

    return spawnClaude(command, args, { cwd: options.cwd, env, stderr: options.stderr, signal });
  }
}
