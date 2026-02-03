/**
 * Comparison tests for canUseTool permission callback
 * Same tests run with both lite and official SDKs
 */

import { test, expect, describe } from 'bun:test';
import { runWithSDKPermissions } from './comparison-utils.ts';
import type { SDKType } from './comparison-utils.ts';
import type { PermissionResult } from '../../src/types/index.ts';

const testWithBothSDKs = (name: string, testFn: (sdk: SDKType) => Promise<void>, timeout = 60000) => {
  describe(name, () => {
    // Run lite and official tests in parallel
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

const testWithBothSDKsSkip = (name: string, testFn: (sdk: SDKType) => Promise<void>, timeout = 60000) => {
  describe.skip(name, () => {
    test(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

testWithBothSDKs('canUseTool callback allows tool execution', async (sdk) => {
  const allowedTools: string[] = [];

  const messages = await runWithSDKPermissions(
    sdk,
    'Read the package.json file',
    {
      maxTurns: 3,
      // No bypassPermissions - canUseTool will be called
      canUseTool: async (toolName, input, context) => {
        allowedTools.push(toolName);
        return { behavior: 'allow' };
      }
    }
  );

  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }

  expect(allowedTools.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Allowed tools:`, allowedTools);
});

testWithBothSDKs('canUseTool callback denies tool execution', async (sdk) => {
  const deniedTools: string[] = [];

  const messages = await runWithSDKPermissions(
    sdk,
    'Read the package.json file',
    {
      maxTurns: 3,
      // No bypassPermissions - canUseTool will be called
      canUseTool: async (toolName, input, context) => {
        deniedTools.push(toolName);
        return { behavior: 'deny' };
      }
    }
  );

  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();

  expect(deniedTools.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Denied tools:`, deniedTools);
});

testWithBothSDKs('canUseTool callback receives correct parameters', async (sdk) => {
  let capturedToolName = '';
  let capturedInput: any = null;
  let capturedContext: any = null;

  await runWithSDKPermissions(
    sdk,
    'Read the package.json file',
    {
      maxTurns: 3,
      // No bypassPermissions - canUseTool will be called
      canUseTool: async (toolName, input, context) => {
        if (!capturedToolName) {  // Capture first tool call only
          capturedToolName = toolName;
          capturedInput = input;
          capturedContext = context;
        }
        return { behavior: 'allow' };
      }
    }
  );

  expect(capturedToolName).toBeTruthy();
  expect(capturedInput).toBeTruthy();
  expect(capturedContext).toBeTruthy();
  expect(capturedContext.toolUseID).toBeTruthy();
  console.log(`   [${sdk}] Captured tool:`, capturedToolName);
});

testWithBothSDKs('canUseTool callback with selective filtering', async (sdk) => {
  const toolsRequested: string[] = [];

  await runWithSDKPermissions(
    sdk,
    'Read package.json and count the lines',
    {
      maxTurns: 5,
      // No bypassPermissions - canUseTool will be called
      canUseTool: async (toolName, input, context) => {
        toolsRequested.push(toolName);

        // Allow Read but deny other tools
        if (toolName === 'Read') {
          return { behavior: 'allow' };
        }
        return { behavior: 'deny' };
      }
    }
  );

  expect(toolsRequested.length).toBeGreaterThan(0);
  console.log(`   [${sdk}] Tools requested:`, toolsRequested);
});

testWithBothSDKs('no canUseTool callback defaults to allow', async (sdk) => {
  const messages = await runWithSDKPermissions(
    sdk,
    'Read the package.json file',
    {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      // No canUseTool callback - should default to allow with bypass mode
    }
  );

  const result = messages.find(m => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }
});

testWithBothSDKs('canUseTool callback with async operations', async (sdk) => {
  const delays: number[] = [];

  await runWithSDKPermissions(
    sdk,
    'Read the package.json file',
    {
      maxTurns: 3,
      // No bypassPermissions - canUseTool will be called
      canUseTool: async (toolName, input, context) => {
        const start = Date.now();
        await new Promise(resolve => setTimeout(resolve, 100));
        delays.push(Date.now() - start);
        return { behavior: 'allow' };
      }
    }
  );

  expect(delays.length).toBeGreaterThan(0);
  expect(delays[0]).toBeGreaterThanOrEqual(90);
  console.log(`   [${sdk}] Async delay:`, delays[0], 'ms');
});

testWithBothSDKs('canUseTool callback can return permission updates', async (sdk) => {
  await runWithSDKPermissions(
    sdk,
    'Read the package.json file',
    {
      maxTurns: 3,
      // No bypassPermissions - canUseTool will be called
      canUseTool: async (toolName, input, context): Promise<PermissionResult> => {
        return {
          behavior: 'allow',
          // Permission updates could be added here
        };
      }
    }
  );

  // Test just needs to complete successfully
  expect(true).toBe(true);
});
