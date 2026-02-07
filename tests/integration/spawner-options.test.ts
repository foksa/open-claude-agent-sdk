/**
 * Integration tests for process spawner options
 *
 * Tests: stderr, env
 * Each test verifies actual runtime behavior.
 */

import { expect } from 'bun:test';
import { runWithSDK, type SDKType, testWithBothSDKs } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

// ============================================================================
// stderr callback
// ============================================================================

testWithBothSDKs(
  'stderr callback wired up without breaking query',
  async (sdk: SDKType) => {
    const stderrChunks: string[] = [];
    const messages = await runWithSDK(sdk, 'Say "ok".', {
      maxTurns: 1,
      permissionMode: 'default',
      stderr: (data: string) => {
        stderrChunks.push(data);
      },
    });

    // Query succeeds with stderr callback attached
    expectSuccessResult(messages);

    console.log(`   [${sdk}] stderr — query succeeded, ${stderrChunks.length} chunks captured`);
  },
  90000
);
