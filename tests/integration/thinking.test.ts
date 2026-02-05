/**
 * Integration tests for extended thinking support (--max-thinking-tokens flag)
 */

import { expect } from 'bun:test';
import type { SDKAssistantMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';
import { expectSuccessResult } from './test-helpers.ts';

testWithBothSDKs('maxThinkingTokens option works', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is 2+2? Think step by step.', {
    maxThinkingTokens: 5000,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
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
