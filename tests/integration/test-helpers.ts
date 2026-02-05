/**
 * Shared test utilities for integration tests
 */

import { expect } from 'bun:test';
import type { Options, SDKMessage, SDKResultMessage } from '../../src/types/index.ts';

/**
 * Assert result message exists and is successful, return it for further assertions
 */
export function expectSuccessResult(messages: SDKMessage[]): SDKResultMessage {
  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }
  return result as SDKResultMessage;
}

/**
 * Extract result message without asserting success
 */
export function extractResult(messages: SDKMessage[]): SDKResultMessage | undefined {
  return messages.find((m) => m.type === 'result') as SDKResultMessage | undefined;
}

/**
 * Normalize message for comparison (removes dynamic fields like request_id, timestamp)
 */
export function normalizeMessage(msg: unknown): unknown {
  const clone = JSON.parse(JSON.stringify(msg));
  delete clone.request_id;
  delete clone.timestamp;
  delete clone.session_id;
  if (clone.request) delete clone.request.request_id;
  if (clone.request?.hooks) {
    for (const matchers of Object.values(clone.request.hooks) as any[]) {
      for (const matcher of matchers) {
        if (matcher.hookCallbackIds) {
          matcher.hookCallbackIds = matcher.hookCallbackIds.map(
            (_: string, i: number) => `hook_${i}`
          );
        }
      }
    }
  }
  return clone;
}

/**
 * Shared test options for fast, reproducible tests
 */
export const DEFAULT_TEST_OPTIONS: Partial<Options> = {
  model: 'haiku',
  settingSources: [],
};
