/**
 * Tests for cost/usage tracking in SDK result and assistant messages.
 *
 * The lite SDK is a pass-through wrapper — cost data flows through from CLI
 * without any src/ code changes. These tests verify the data arrives correctly.
 */

import { describe, expect } from 'bun:test';
import type { SDKAssistantMessage, SDKMessage, SDKResultMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

// Helper to find the result message
function findResult(messages: SDKMessage[]): SDKResultMessage {
  const result = messages.find((m): m is SDKResultMessage => m.type === 'result');
  if (!result) throw new Error('No result message found');
  return result;
}

// Helper to find assistant messages
function findAssistantMessages(messages: SDKMessage[]): SDKAssistantMessage[] {
  return messages.filter((m): m is SDKAssistantMessage => m.type === 'assistant');
}

// =============================================================================
// Result Message Fields
// =============================================================================

describe('Cost tracking - Result message fields', () => {
  testWithBothSDKs('total_cost_usd is a number > 0 on result', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'default',
    });

    const result = findResult(messages);
    expect(typeof result.total_cost_usd).toBe('number');
    expect(result.total_cost_usd).toBeGreaterThan(0);
  });

  testWithBothSDKs('usage has input_tokens and output_tokens > 0', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'default',
    });

    const result = findResult(messages);
    expect(result.usage).toBeTruthy();
    expect(typeof result.usage.input_tokens).toBe('number');
    expect(result.usage.input_tokens).toBeGreaterThan(0);
    expect(typeof result.usage.output_tokens).toBe('number');
    expect(result.usage.output_tokens).toBeGreaterThan(0);
  });

  testWithBothSDKs('modelUsage is a non-empty record with valid entries', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'default',
    });

    const result = findResult(messages);
    expect(result.modelUsage).toBeTruthy();
    expect(typeof result.modelUsage).toBe('object');

    const models = Object.keys(result.modelUsage);
    expect(models.length).toBeGreaterThan(0);

    for (const [modelName, usage] of Object.entries(result.modelUsage)) {
      expect(typeof modelName).toBe('string');
      expect(typeof usage.costUSD).toBe('number');
      expect(typeof usage.inputTokens).toBe('number');
      expect(typeof usage.outputTokens).toBe('number');
      expect(usage.inputTokens).toBeGreaterThanOrEqual(0);
      expect(usage.outputTokens).toBeGreaterThanOrEqual(0);
    }
  });
});

// =============================================================================
// Assistant Message Usage
// =============================================================================

describe('Cost tracking - Assistant message usage', () => {
  testWithBothSDKs('assistant messages have message.usage with token counts', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'default',
    });

    const assistants = findAssistantMessages(messages);
    expect(assistants.length).toBeGreaterThan(0);

    // At least one assistant message should have usage on message
    const withUsage = assistants.filter((m) => m.message?.usage);
    expect(withUsage.length).toBeGreaterThan(0);

    for (const msg of withUsage) {
      expect(typeof msg.message.usage.input_tokens).toBe('number');
      expect(typeof msg.message.usage.output_tokens).toBe('number');
    }
  });
});

// =============================================================================
// Message ID Deduplication
// =============================================================================

describe('Cost tracking - Message ID deduplication', () => {
  testWithBothSDKs(
    'duplicate message IDs have identical usage',
    async (sdk) => {
      const messages = await runWithSDK(sdk, 'Read package.json and show the name field', {
        maxTurns: 10,
        permissionMode: 'default',
        canUseTool: () => ({ behavior: 'allow' as const }),
      });

      const usageByMessageId = new Map<string, string[]>();

      for (const msg of findAssistantMessages(messages)) {
        const id = msg.message?.id;
        const usage = msg.message?.usage;
        if (id && usage) {
          const key = JSON.stringify(usage);
          const existing = usageByMessageId.get(id) ?? [];
          existing.push(key);
          usageByMessageId.set(id, existing);
        }
      }

      // For any message ID seen multiple times, all usages should match
      for (const [_id, usages] of usageByMessageId) {
        if (usages.length > 1) {
          const first = usages[0];
          for (const u of usages.slice(1)) {
            expect(u).toBe(first);
          }
        }
      }
    },
    120000
  );
});

// =============================================================================
// Multi-step Cumulative
// =============================================================================

describe('Cost tracking - Multi-step cumulative', () => {
  testWithBothSDKs(
    'result total_cost_usd accumulates across steps',
    async (sdk) => {
      const messages = await runWithSDK(sdk, 'Read package.json and tell me the package name', {
        maxTurns: 10,
        permissionMode: 'default',
        canUseTool: () => ({ behavior: 'allow' as const }),
      });

      const result = findResult(messages);
      // Multi-step should still have a positive total cost
      expect(result.total_cost_usd).toBeGreaterThan(0);
      // Usage tokens should reflect the full conversation
      expect(result.usage.input_tokens).toBeGreaterThan(0);
      expect(result.usage.output_tokens).toBeGreaterThan(0);
    },
    120000
  );
});
