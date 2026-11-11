/**
 * Hook configuration builder
 *
 * Extracts hook registration logic from QueryImpl.sendControlProtocolInit().
 * Transforms user-provided hooks into the format expected by CLI.
 *
 * @internal
 */

import type { InternalHookCallback } from '../types/control.ts';
import type { HookCallbackMatcher, Options } from '../types/index.ts';
import type { ControlProtocolHandler } from './control.ts';

/**
 * Hook configuration format sent to CLI
 * Mirrors SDKHookCallbackMatcher from official SDK
 */
export type HookConfig = Record<
  string,
  Array<{
    matcher?: string;
    hookCallbackIds: string[];
    timeout?: number;
    onFailure?: 'continue' | 'block';
  }>
>;

/**
 * Whether any hook matcher asks for a failure to block (`onFailure` other
 * than 'continue') — the query then refuses a CLI that would not honor it.
 */
export function hasHookSetToBlock(hooks: Options['hooks']): boolean {
  return Object.values(hooks ?? {}).some(
    (matchers) =>
      Array.isArray(matchers) &&
      matchers.some((m) => m?.onFailure != null && m.onFailure !== 'continue')
  );
}

/**
 * Build hook configuration for CLI and register callbacks
 *
 * Transforms user-provided hooks into the wire format expected by CLI,
 * while registering callback functions with the control handler.
 *
 * @param hooks User-provided hook matchers from Options
 * @param controlHandler Handler to register callbacks with
 * @returns Hook config object for CLI initialization
 */
export function buildHookConfig(
  hooks: Record<string, HookCallbackMatcher[] | undefined>,
  controlHandler: ControlProtocolHandler
): HookConfig {
  const hooksConfig: HookConfig = {};
  let callbackId = 0;

  for (const [eventName, matchers] of Object.entries(hooks)) {
    // An event set to undefined or [] is left out (official SDK; v0.3.321
    // stopped an undefined event from dropping every hook)
    if (!(matchers && matchers.length > 0)) continue;
    hooksConfig[eventName] = matchers.map((matcher) => {
      const hookCallbackIds = matcher.hooks.map((hookFn) => {
        const id = `hook_${callbackId++}`;
        // Cast to InternalHookCallback - the HookCallback type from SDK is compatible
        controlHandler.registerCallback(id, hookFn as InternalHookCallback);
        return id;
      });

      const result: HookConfig[string][number] = {
        hookCallbackIds,
      };

      // Only include optional fields if defined
      if (matcher.matcher !== undefined) {
        result.matcher = matcher.matcher;
      }
      if (matcher.timeout !== undefined) {
        result.timeout = matcher.timeout;
      }
      // v0.3.317: 'block' makes a failing hook block the action it guards
      if (matcher.onFailure !== undefined) {
        result.onFailure = matcher.onFailure;
      }

      return result;
    });
  }

  return hooksConfig;
}
