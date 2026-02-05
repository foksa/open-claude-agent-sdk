/**
 * Hook configuration builder
 *
 * Extracts hook registration logic from QueryImpl.sendControlProtocolInit().
 * Transforms user-provided hooks into the format expected by CLI.
 *
 * @internal
 */

import type { InternalHookCallback } from '../types/control.ts';
import type { HookCallbackMatcher } from '../types/index.ts';
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
  }>
>;

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
  hooks: Record<string, HookCallbackMatcher[]>,
  controlHandler: ControlProtocolHandler
): HookConfig {
  const hooksConfig: HookConfig = {};
  let callbackId = 0;

  for (const [eventName, matchers] of Object.entries(hooks)) {
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

      return result;
    });
  }

  return hooksConfig;
}
