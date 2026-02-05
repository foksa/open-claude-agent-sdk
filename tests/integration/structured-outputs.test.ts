/**
 * Integration tests for structured outputs (JSON schema) feature
 *
 * This tests the outputFormat option with type: 'json_schema' to get
 * validated JSON responses from Claude.
 */

import { expect } from 'bun:test';
import type { SDKResultSuccess } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

testWithBothSDKs('basic structured output with json_schema', async (sdk) => {
  const schema = {
    type: 'object',
    properties: {
      answer: { type: 'number' },
    },
    required: ['answer'],
  };

  const messages = await runWithSDK(sdk, 'What is 2+2? Return only the answer.', {
    outputFormat: { type: 'json_schema', schema },
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
  });

  const result = messages.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result).toBeDefined();
  expect(result?.structured_output).toBeDefined();
  console.log(`   [${sdk}] Structured output:`, result?.structured_output);
});

testWithBothSDKs('structured output with string field', async (sdk) => {
  const schema = {
    type: 'object',
    properties: {
      greeting: { type: 'string' },
    },
    required: ['greeting'],
  };

  const messages = await runWithSDK(sdk, 'Say hello in a friendly way.', {
    outputFormat: { type: 'json_schema', schema },
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
  });

  const result = messages.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result).toBeDefined();
  expect(result?.structured_output).toBeDefined();
  expect(typeof result?.structured_output?.greeting).toBe('string');
  console.log(`   [${sdk}] Structured output:`, result?.structured_output);
});

testWithBothSDKs('structured output with multiple fields', async (sdk) => {
  const schema = {
    type: 'object',
    properties: {
      color: { type: 'string' },
      hex_code: { type: 'string' },
    },
    required: ['color', 'hex_code'],
  };

  const messages = await runWithSDK(sdk, 'Pick a random color and provide its hex code.', {
    outputFormat: { type: 'json_schema', schema },
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
  });

  const result = messages.find(
    (m): m is SDKResultSuccess => m.type === 'result' && m.subtype === 'success'
  );
  expect(result).toBeDefined();
  expect(result?.structured_output).toBeDefined();
  expect(typeof result?.structured_output?.color).toBe('string');
  expect(typeof result?.structured_output?.hex_code).toBe('string');
  console.log(`   [${sdk}] Structured output:`, result?.structured_output);
});

testWithBothSDKs('without outputFormat returns no structured_output', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Say hello.', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 5,
  });

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeDefined();
  // structured_output should not be present without outputFormat
  expect(result?.structured_output).toBeFalsy();
  console.log(`   [${sdk}] No structured_output as expected`);
});
