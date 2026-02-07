/**
 * Process factory for dependency injection
 *
 * Allows unit tests to inject mock processes without spawning real CLI.
 *
 * @internal
 */

import type { ChildProcess } from 'node:child_process';
import { detectClaudeBinary } from '../core/detection.ts';
import { buildCliArgs, spawnClaude } from '../core/spawn.ts';
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

/**
 * Default implementation that spawns real Claude CLI
 */
export class DefaultProcessFactory implements ProcessFactory {
  spawn(options: Options): ChildProcess {
    const args = buildCliArgs({ ...options, prompt: '' });

    // Build environment with enableFileCheckpointing support
    const env: Record<string, string | undefined> = { ...(options.env ?? {}) };
    if (options.enableFileCheckpointing) {
      env.CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING = 'true';
    }

    // Custom spawn function takes priority
    if (options.spawnClaudeCodeProcess) {
      const scriptPath = detectClaudeBinary(options);
      const native = isNativeBinary(scriptPath);
      const executable = options.executable ?? getDefaultExecutable();
      const executableArgs = options.executableArgs ?? [];
      const command = native ? scriptPath : executable;
      const spawnArgs = native
        ? [...executableArgs, ...args]
        : [...executableArgs, scriptPath, ...args];

      // Build full env for SpawnOptions
      const fullEnv: Record<string, string | undefined> = { ...process.env, ...env };
      if (!fullEnv.CLAUDE_CODE_ENTRYPOINT) fullEnv.CLAUDE_CODE_ENTRYPOINT = 'sdk-ts';
      delete fullEnv.NODE_OPTIONS;
      if (fullEnv.DEBUG_CLAUDE_AGENT_SDK) fullEnv.DEBUG = '1';
      else delete fullEnv.DEBUG;

      const spawnedProcess = options.spawnClaudeCodeProcess({
        command,
        args: spawnArgs,
        cwd: options.cwd,
        env: fullEnv,
        signal: AbortSignal.timeout(3600000), // 1 hour default
      });

      // Wrap SpawnedProcess to ChildProcess-compatible object
      return spawnedProcess as unknown as ChildProcess;
    }

    const scriptPath = detectClaudeBinary(options);

    // When executable is explicitly set, use it as the command with script as arg
    if (options.executable) {
      const executableArgs = options.executableArgs ?? [];
      const fullArgs = [...executableArgs, scriptPath, ...args];
      return spawnClaude(options.executable, fullArgs, {
        cwd: options.cwd,
        env,
        stderr: options.stderr,
      });
    }

    // Default: use detected binary directly (shebang handles runtime)
    // Only split native vs JS when executableArgs are provided
    if (options.executableArgs && !isNativeBinary(scriptPath)) {
      const executable = getDefaultExecutable();
      const fullArgs = [...options.executableArgs, scriptPath, ...args];
      return spawnClaude(executable, fullArgs, {
        cwd: options.cwd,
        env,
        stderr: options.stderr,
      });
    }

    return spawnClaude(scriptPath, args, {
      cwd: options.cwd,
      env,
      stderr: options.stderr,
    });
  }
}
