/**
 * Process factory for dependency injection
 *
 * Allows unit tests to inject mock processes without spawning real CLI.
 *
 * @internal
 */

import type { ChildProcess } from 'node:child_process';
import { COMPATIBLE_SDK_VERSION } from '../constants.ts';
import { buildCliArgs } from '../core/argBuilder.ts';
import { detectClaudeBinary, spawnClaude } from '../core/spawn.ts';
import type { Options } from '../types/index.ts';

/**
 * Interface for creating CLI processes
 * Allows dependency injection for testing
 */
export interface ProcessFactory {
  spawn(options: Options): ChildProcess;
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

/** Truthy env flag the way the official SDK parses it ("1", "true", "yes", "on"). */
function isEnvTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase().trim());
}

/**
 * Default implementation that spawns real Claude CLI
 */
export class DefaultProcessFactory implements ProcessFactory {
  spawn(options: Options): ChildProcess {
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

    if (options.spawnClaudeCodeProcess) {
      const spawnedProcess = options.spawnClaudeCodeProcess({
        command,
        args,
        cwd: options.cwd,
        env,
        // Fires only when the query is aborted (no implicit timeout)
        signal: options.abortController?.signal ?? new AbortController().signal,
      });
      // Wrap SpawnedProcess to ChildProcess-compatible object
      return spawnedProcess as unknown as ChildProcess;
    }

    return spawnClaude(command, args, { cwd: options.cwd, env, stderr: options.stderr });
  }
}
