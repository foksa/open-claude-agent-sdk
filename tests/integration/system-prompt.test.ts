/**
 * System prompt tests
 * Tests that systemPrompt option is passed correctly to the CLI
 */

import { expect } from 'bun:test';
import type { SDKMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

/**
 * Extract combined text from all assistant messages.
 * Models with extended thinking may split responses across multiple assistant
 * messages (thinking-only block first, text block second), so we concatenate
 * text content from every assistant message.
 */
function getAssistantText(messages: SDKMessage[]): string {
  return messages
    .filter((m) => m.type === 'assistant')
    .map((m) => {
      const content = m.type === 'assistant' ? m.message?.content : undefined;
      if (typeof content === 'string') return content;
      if (Array.isArray(content)) {
        return content
          .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
          .map((c) => c.text)
          .join('');
      }
      return '';
    })
    .join('');
}

testWithBothSDKs('systemPrompt injects context that model can reference', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is my name? Answer in one word only.', {
    maxTurns: 1,
    systemPrompt: "The user's name is Marshall. Always remember this.",
  });

  const textContent = getAssistantText(messages);
  expect(textContent.length).toBeGreaterThan(0);
  expect(textContent.toLowerCase()).toContain('marshall');
  console.log(`   [${sdk}] Response:`, textContent.slice(0, 100));

  // Check result is successful
  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }
});

testWithBothSDKs('systemPrompt can set assistant persona', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Introduce yourself in one sentence.', {
    maxTurns: 1,
    systemPrompt: 'You are Captain Jack Sparrow. Always speak like a pirate.',
  });

  const textContent = getAssistantText(messages);
  expect(textContent.length).toBeGreaterThan(0);

  // Should mention being Jack Sparrow or pirate-related content
  const lower = textContent.toLowerCase();
  const hasPirateContent =
    lower.includes('jack') ||
    lower.includes('sparrow') ||
    lower.includes('captain') ||
    lower.includes('pirate') ||
    lower.includes('ahoy') ||
    lower.includes('matey');

  expect(hasPirateContent).toBe(true);
  console.log(`   [${sdk}] Response:`, textContent.slice(0, 150));

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
});
