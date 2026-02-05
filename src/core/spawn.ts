/**
 * Process spawning for Claude CLI
 *
 * Facade module that re-exports from argBuilder and spawner.
 * Maintains backward compatibility for existing imports.
 *
 * @internal
 */

export { buildCliArgs } from './argBuilder.ts';
export { spawnClaude } from './spawner.ts';
