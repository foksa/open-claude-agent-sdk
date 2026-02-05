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
 * Default implementation that spawns real Claude CLI
 */
export class DefaultProcessFactory implements ProcessFactory {
  spawn(options: Options): ChildProcess {
    const binary = detectClaudeBinary(options);
    const args = buildCliArgs({ ...options, prompt: '' });
    return spawnClaude(binary, args, { cwd: options.cwd });
  }
}
