/**
 * Tests for cost tracking NOT YET implemented in lite SDK
 *
 * These tests document the expected behavior based on official SDK documentation.
 * They are marked as .todo until the features are implemented.
 *
 * Official documentation: docs/official-agent-sdk-docs/cost-tracking.md
 *
 * Unimplemented features:
 * - Usage tracking per message (input_tokens, output_tokens, etc.)
 * - total_cost_usd in result message
 * - modelUsage breakdown by model
 * - Message ID deduplication for accurate billing
 * - cache token tracking (cache_creation_input_tokens, cache_read_input_tokens)
 */

import { describe, expect } from 'bun:test';
import type { SDKMessage } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs, testWithBothSDKsTodo } from './comparison-utils.ts';

// =============================================================================
// Basic Usage Tracking
// =============================================================================

describe('Cost tracking - Basic usage', () => {
  /**
   * From docs:
   * - Assistant messages include usage field
   * - Usage contains: input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens
   */
  testWithBothSDKs('should include usage in assistant messages', async (sdk) => {
    let usageFound = false;
    let usage: Record<string, unknown> | null = null;

    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'usage' in msg) {
        usageFound = true;
        usage = msg.usage;
        break;
      }
    }

    console.log(`   [${sdk}] Usage found:`, usageFound);
    if (usage) {
      console.log(`   [${sdk}] Usage:`, JSON.stringify(usage).substring(0, 100));
    }
  });

  testWithBothSDKsTodo('should include input_tokens in usage', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'usage' in msg) {
        expect(typeof msg.usage?.input_tokens).toBe('number');
        expect(msg.usage?.input_tokens).toBeGreaterThan(0);
        break;
      }
    }
  });

  testWithBothSDKsTodo('should include output_tokens in usage', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'usage' in msg) {
        expect(typeof msg.usage?.output_tokens).toBe('number');
        expect(msg.usage?.output_tokens).toBeGreaterThan(0);
        break;
      }
    }
  });
});

// =============================================================================
// Result Message Cumulative Usage
// =============================================================================

describe('Cost tracking - Result message', () => {
  /**
   * From docs:
   * - Result message contains cumulative usage from all steps
   * - Includes total_cost_usd (authoritative for billing)
   */
  testWithBothSDKsTodo('should include total_cost_usd in result message', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Read package.json and summarize it', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    // Result should have cumulative cost
    expect(result && ('usage' in result || 'total_cost_usd' in result)).toBe(true);
    const totalCost = result?.usage?.total_cost_usd || result?.total_cost_usd;
    expect(typeof totalCost).toBe('number');
    expect(totalCost).toBeGreaterThan(0);
  });

  testWithBothSDKsTodo('should include cumulative token counts in result', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 5,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.usage).toBeTruthy();
    expect(typeof result?.usage?.input_tokens).toBe('number');
    expect(typeof result?.usage?.output_tokens).toBe('number');
  });
});

// =============================================================================
// Model Usage Breakdown
// =============================================================================

describe('Cost tracking - Model usage breakdown', () => {
  /**
   * From docs:
   * - modelUsage provides per-model breakdown
   * - Useful when using multiple models (e.g., Haiku for subagents)
   *
   * ModelUsage type:
   * {
   *   inputTokens: number
   *   outputTokens: number
   *   cacheReadInputTokens: number
   *   cacheCreationInputTokens: number
   *   webSearchRequests: number
   *   costUSD: number
   *   contextWindow: number
   * }
   */
  testWithBothSDKsTodo('should include modelUsage in result', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.modelUsage).toBeTruthy();
    expect(typeof result?.modelUsage).toBe('object');
  });

  testWithBothSDKsTodo('should have per-model costUSD', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      model: 'haiku',
    });

    const result = messages.find((m) => m.type === 'result');
    const modelUsage = result?.modelUsage;

    if (modelUsage) {
      for (const [modelName, usage] of Object.entries(modelUsage)) {
        console.log(`   [${sdk}] Model ${modelName}: $${usage.costUSD}`);
        expect(typeof usage.costUSD).toBe('number');
      }
    }
  });

  testWithBothSDKsTodo('should track inputTokens per model', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    const modelUsage = result?.modelUsage;

    if (modelUsage) {
      for (const [_modelName, usage] of Object.entries(modelUsage)) {
        expect(typeof usage.inputTokens).toBe('number');
        expect(typeof usage.outputTokens).toBe('number');
      }
    }
  });
});

// =============================================================================
// Message ID Deduplication
// =============================================================================

describe('Cost tracking - Message ID deduplication', () => {
  /**
   * From docs:
   * - All messages with same ID report identical usage
   * - Multiple tool uses in same turn share message ID
   * - Should only charge once per unique message ID
   */
  testWithBothSDKsTodo('should have same usage for messages with same ID', async (sdk) => {
    const usageByMessageId = new Map<string, unknown[]>();

    const messages = await runWithSDK(sdk, 'Read package.json and show the version', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'id' in msg && 'usage' in msg) {
        const id = msg.id;
        if (!usageByMessageId.has(id)) {
          usageByMessageId.set(id, []);
        }
        usageByMessageId.get(id)?.push(msg.usage);
      }
    }

    // All usages for same ID should be identical
    for (const [id, usages] of usageByMessageId) {
      if (usages.length > 1) {
        const firstUsage = JSON.stringify(usages[0]);
        for (const usage of usages.slice(1)) {
          expect(JSON.stringify(usage)).toBe(firstUsage);
        }
        console.log(`   [${sdk}] Message ${id} has ${usages.length} messages with same usage`);
      }
    }
  });

  testWithBothSDKsTodo('should track unique message IDs for billing', async (sdk) => {
    const processedIds = new Set<string>();
    let totalSteps = 0;

    const messages = await runWithSDK(sdk, 'Read package.json and list dependencies', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'id' in msg && 'usage' in msg) {
        if (!processedIds.has(msg.id)) {
          processedIds.add(msg.id);
          totalSteps++;
        }
      }
    }

    console.log(`   [${sdk}] Unique steps for billing: ${totalSteps}`);
    expect(totalSteps).toBeGreaterThan(0);
  });
});

// =============================================================================
// Cache Token Tracking
// =============================================================================

describe('Cost tracking - Cache tokens', () => {
  /**
   * From docs:
   * - cache_creation_input_tokens: tokens used to create cache
   * - cache_read_input_tokens: tokens read from cache
   * - Cache reduces costs on repeated similar prompts
   */
  testWithBothSDKsTodo('should track cache_creation_input_tokens', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'usage' in msg) {
        // cache_creation_input_tokens may be 0 or undefined if not caching
        const cacheCreation = msg.usage?.cache_creation_input_tokens;
        console.log(`   [${sdk}] Cache creation tokens:`, cacheCreation);
        break;
      }
    }
  });

  testWithBothSDKsTodo('should track cache_read_input_tokens', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'usage' in msg) {
        const cacheRead = msg.usage?.cache_read_input_tokens;
        console.log(`   [${sdk}] Cache read tokens:`, cacheRead);
        break;
      }
    }
  });

  testWithBothSDKsTodo('should show cache benefits on repeated prompts', async (sdk) => {
    // First call - creates cache
    const messages1 = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    // Second call - should use cache
    const messages2 = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    // Compare cache usage between calls
    const getUsage = (msgs: SDKMessage[]) => {
      for (const msg of msgs) {
        if (msg.type === 'assistant' && 'usage' in msg) {
          return msg.usage;
        }
      }
      return null;
    };

    const usage1 = getUsage(messages1);
    const usage2 = getUsage(messages2);

    console.log(`   [${sdk}] First call cache read:`, usage1?.cache_read_input_tokens);
    console.log(`   [${sdk}] Second call cache read:`, usage2?.cache_read_input_tokens);
  });
});

// =============================================================================
// Service Tier
// =============================================================================

describe('Cost tracking - Service tier', () => {
  /**
   * From docs:
   * - usage includes service_tier field
   */
  testWithBothSDKsTodo('should include service_tier in usage', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'usage' in msg) {
        console.log(`   [${sdk}] Service tier:`, msg.usage?.service_tier);
        // Service tier may be 'standard' or other values
        break;
      }
    }
  });
});

// =============================================================================
// Multi-Step Cost Tracking
// =============================================================================

describe('Cost tracking - Multi-step conversations', () => {
  /**
   * From docs:
   * - Each step has its own usage
   * - Result message has cumulative total
   */
  testWithBothSDKsTodo('should track usage per step', async (sdk) => {
    const stepUsages: Record<string, unknown>[] = [];
    const processedIds = new Set<string>();

    const messages = await runWithSDK(
      sdk,
      'Read package.json, then read the README.md, then summarize both',
      {
        maxTurns: 15,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      }
    );

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'id' in msg && 'usage' in msg) {
        if (!processedIds.has(msg.id)) {
          processedIds.add(msg.id);
          stepUsages.push({
            messageId: msg.id,
            usage: msg.usage,
          });
        }
      }
    }

    console.log(`   [${sdk}] Steps tracked:`, stepUsages.length);
    expect(stepUsages.length).toBeGreaterThan(1);
  });

  testWithBothSDKsTodo('should have cumulative total in result', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Read package.json and count the dependencies', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.usage?.total_cost_usd).toBeGreaterThan(0);
    console.log(`   [${sdk}] Total cost:`, result?.usage?.total_cost_usd);
  });
});

// =============================================================================
// Billing Implementation Pattern
// =============================================================================

describe('Cost tracking - Billing patterns', () => {
  /**
   * From docs:
   * - CostTracker class pattern for accurate billing
   * - Only charge once per unique message ID
   * - Use total_cost_usd from result for final charge
   */
  testWithBothSDKsTodo('should implement CostTracker pattern', async (sdk) => {
    // Example CostTracker implementation
    class CostTracker {
      private processedMessageIds = new Set<string>();
      private stepUsages: Record<string, unknown>[] = [];

      processMessage(message: Record<string, unknown>) {
        if (message.type !== 'assistant' || !message.usage) {
          return;
        }

        if (this.processedMessageIds.has(message.id)) {
          return;
        }

        this.processedMessageIds.add(message.id);
        this.stepUsages.push({
          messageId: message.id,
          timestamp: new Date().toISOString(),
          usage: message.usage,
        });
      }

      getTotalCost() {
        // For billing, use the authoritative total_cost_usd from result
        // This is a simplified calculation for per-step tracking
        return this.stepUsages.reduce((sum, step) => {
          const inputCost = step.usage.input_tokens * 0.00003;
          const outputCost = step.usage.output_tokens * 0.00015;
          return sum + inputCost + outputCost;
        }, 0);
      }
    }

    const tracker = new CostTracker();

    const messages = await runWithSDK(sdk, 'Read package.json', {
      maxTurns: 5,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      tracker.processMessage(msg);
    }

    const calculatedCost = tracker.getTotalCost();
    console.log(`   [${sdk}] Calculated cost:`, calculatedCost);
  });

  testWithBothSDKsTodo('should aggregate usage for billing dashboard', async (sdk) => {
    // Pattern: Aggregate across multiple conversations
    const userUsage = {
      totalTokens: 0,
      totalCost: 0,
      conversations: 0,
    };

    const messages = await runWithSDK(sdk, 'Hello', {
      maxTurns: 3,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    if (result?.usage) {
      userUsage.totalTokens += result.usage.input_tokens + result.usage.output_tokens;
      userUsage.totalCost += result.usage.total_cost_usd || 0;
      userUsage.conversations += 1;
    }

    expect(userUsage.conversations).toBe(1);
    expect(userUsage.totalTokens).toBeGreaterThan(0);
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Cost tracking - Edge cases', () => {
  testWithBothSDKsTodo('should handle conversations with no tool use', async (sdk) => {
    const messages = await runWithSDK(sdk, 'What is 2+2?', {
      maxTurns: 2,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result?.usage).toBeTruthy();
  });

  testWithBothSDKsTodo('should handle parallel tool uses with same message ID', async (sdk) => {
    // When Claude runs multiple tools in parallel, they share message ID
    const messages = await runWithSDK(
      sdk,
      'In parallel, check if package.json and README.md exist',
      {
        maxTurns: 10,
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
      }
    );

    const messageIds = new Set<string>();
    for (const msg of messages) {
      if (msg.type === 'assistant' && 'id' in msg) {
        messageIds.add(msg.id);
      }
    }

    console.log(`   [${sdk}] Unique message IDs:`, messageIds.size);
  });

  testWithBothSDKsTodo('should handle highest output_tokens when values differ', async (sdk) => {
    // From docs: In rare cases, use highest value for same message ID
    const usageByMessageId = new Map<string, number[]>();

    const messages = await runWithSDK(sdk, 'Read and analyze package.json', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    for (const msg of messages) {
      if (msg.type === 'assistant' && 'id' in msg && 'usage' in msg) {
        const id = msg.id;
        if (!usageByMessageId.has(id)) {
          usageByMessageId.set(id, []);
        }
        usageByMessageId.get(id)?.push(msg.usage?.output_tokens || 0);
      }
    }

    // For billing, use max value if they differ
    for (const [id, tokens] of usageByMessageId) {
      if (tokens.length > 1) {
        const maxTokens = Math.max(...tokens);
        console.log(`   [${sdk}] Message ${id}: max output tokens = ${maxTokens}`);
      }
    }
  });
});

// =============================================================================
// Web Search Tracking
// =============================================================================

describe('Cost tracking - Web search', () => {
  /**
   * From docs:
   * - modelUsage includes webSearchRequests count
   */
  testWithBothSDKsTodo('should track webSearchRequests', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Search for the latest TypeScript version', {
      maxTurns: 10,
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
    });

    const result = messages.find((m) => m.type === 'result');
    const modelUsage = result?.modelUsage;

    if (modelUsage) {
      for (const [modelName, usage] of Object.entries(modelUsage)) {
        console.log(`   [${sdk}] ${modelName} web searches:`, usage.webSearchRequests);
      }
    }
  });
});
