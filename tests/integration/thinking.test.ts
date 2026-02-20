/**
 * Integration tests for extended thinking support
 *
 * Tests maxThinkingTokens, thinking option (adaptive/enabled/disabled), and effort option.
 */

import { expect } from 'bun:test';
import type { SDKAssistantMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

testWithBothSDKs('maxThinkingTokens option works', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is 2+2? Think step by step.', {
    maxThinkingTokens: 5000,
    maxTurns: 1,
  });

  const result = expectSuccessResult(messages);
  expect(result).toBeDefined();

  // Verify thinking blocks are present in assistant messages
  const assistantMessages = messages.filter(
    (m): m is SDKAssistantMessage => m.type === 'assistant'
  );
  expect(assistantMessages.length).toBeGreaterThan(0);

  // Check that we have thinking content blocks
  const hasThinkingBlock = assistantMessages.some((msg) =>
    msg.message?.content?.some((block: { type: string }) => block.type === 'thinking')
  );
  expect(hasThinkingBlock).toBe(true);

  // Check that we have text content blocks (the actual response)
  const hasTextBlock = assistantMessages.some((msg) =>
    msg.message?.content?.some((block: { type: string }) => block.type === 'text')
  );
  expect(hasTextBlock).toBe(true);

  console.log(`   [${sdk}] Extended thinking query completed with thinking blocks`);
});

testWithBothSDKs('thinking: enabled with budgetTokens works', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is 7 * 8? Think step by step.', {
    thinking: { type: 'enabled', budgetTokens: 5000 },
    maxTurns: 1,
  });

  const result = expectSuccessResult(messages);
  expect(result).toBeDefined();

  const assistantMessages = messages.filter(
    (m): m is SDKAssistantMessage => m.type === 'assistant'
  );
  expect(assistantMessages.length).toBeGreaterThan(0);

  const hasThinkingBlock = assistantMessages.some((msg) =>
    msg.message?.content?.some((block: { type: string }) => block.type === 'thinking')
  );
  expect(hasThinkingBlock).toBe(true);

  console.log(`   [${sdk}] thinking: enabled with budgetTokens works`);
});

testWithBothSDKs('thinking: adaptive produces valid response', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is the capital of France?', {
    thinking: { type: 'adaptive' },
    maxTurns: 1,
  });

  const result = expectSuccessResult(messages);
  expect(result).toBeDefined();

  console.log(`   [${sdk}] thinking: adaptive produces valid response`);
});

testWithBothSDKs('thinking: disabled produces valid response', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Say hello.', {
    thinking: { type: 'disabled' },
    maxTurns: 1,
  });

  const result = expectSuccessResult(messages);
  expect(result).toBeDefined();

  // With thinking disabled, there should be no thinking blocks
  const assistantMessages = messages.filter(
    (m): m is SDKAssistantMessage => m.type === 'assistant'
  );
  if (assistantMessages.length > 0) {
    const hasThinkingBlock = assistantMessages.some((msg) =>
      msg.message?.content?.some((block: { type: string }) => block.type === 'thinking')
    );
    expect(hasThinkingBlock).toBe(false);
  }

  console.log(`   [${sdk}] thinking: disabled produces valid response without thinking blocks`);
});

testWithBothSDKs('effort option produces valid response', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is 2+2?', {
    effort: 'low',
    maxTurns: 1,
  });

  const result = expectSuccessResult(messages);
  expect(result).toBeDefined();

  console.log(`   [${sdk}] effort: low produces valid response`);
});
