/**
 * System prompt tests
 * Tests that systemPrompt option is passed correctly to the CLI
 */

import { expect } from 'bun:test';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

testWithBothSDKs('systemPrompt injects context that model can reference', async (sdk) => {
  const messages = await runWithSDK(sdk, 'What is my name? Answer in one word only.', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    systemPrompt: "The user's name is Marshall. Always remember this.",
  });

  // Find assistant message with the response
  const assistantMsg = messages.find((m) => m.type === 'assistant');
  expect(assistantMsg).toBeTruthy();

  if (assistantMsg && assistantMsg.type === 'assistant') {
    const content = assistantMsg.message?.content;
    // Content can be string or array of content blocks
    const textContent =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((c) => (c.type === 'text' ? c.text : '')).join('')
          : '';

    expect(textContent.toLowerCase()).toContain('marshall');
    console.log(`   [${sdk}] Response:`, textContent.slice(0, 100));
  }

  // Check result is successful
  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
  if (result && result.type === 'result') {
    expect(result.subtype).toBe('success');
  }
});

testWithBothSDKs('systemPrompt can set assistant persona', async (sdk) => {
  const messages = await runWithSDK(sdk, 'Introduce yourself in one sentence.', {
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    maxTurns: 1,
    systemPrompt: 'You are Captain Jack Sparrow. Always speak like a pirate.',
  });

  const assistantMsg = messages.find((m) => m.type === 'assistant');
  expect(assistantMsg).toBeTruthy();

  if (assistantMsg && assistantMsg.type === 'assistant') {
    const content = assistantMsg.message?.content;
    const textContent =
      typeof content === 'string'
        ? content
        : Array.isArray(content)
          ? content.map((c) => (c.type === 'text' ? c.text : '')).join('')
          : '';

    // Should mention being Jack Sparrow or pirate-related content
    const hasPirateContent =
      textContent.toLowerCase().includes('jack') ||
      textContent.toLowerCase().includes('sparrow') ||
      textContent.toLowerCase().includes('captain') ||
      textContent.toLowerCase().includes('pirate') ||
      textContent.toLowerCase().includes('ahoy') ||
      textContent.toLowerCase().includes('matey');

    expect(hasPirateContent).toBe(true);
    console.log(`   [${sdk}] Response:`, textContent.slice(0, 150));
  }

  const result = messages.find((m) => m.type === 'result');
  expect(result).toBeTruthy();
});
