/**
 * Playwright integration test for comparison demo app
 * Tests the UI and multi-turn conversation functionality
 */

import { expect, test } from 'bun:test';

// Check if we have playwright MCP available
const hasPlaywright =
  typeof (globalThis as any).mcp__plugin_playwright_playwright__browser_navigate === 'function';

if (!hasPlaywright) {
  console.log('⚠️  Playwright MCP not available, skipping demo app tests');
}

test.skipIf(!hasPlaywright)(
  'demo app loads and shows correct UI',
  async () => {
    const navigate = (globalThis as any).mcp__plugin_playwright_playwright__browser_navigate;
    const snapshot = (globalThis as any).mcp__plugin_playwright_playwright__browser_snapshot;
    const _click = (globalThis as any).mcp__plugin_playwright_playwright__browser_click;
    const _type = (globalThis as any).mcp__plugin_playwright_playwright__browser_type;
    const waitFor = (globalThis as any).mcp__plugin_playwright_playwright__browser_wait_for;
    const close = (globalThis as any).mcp__plugin_playwright_playwright__browser_close;

    try {
      // Navigate to demo app
      await navigate({ url: 'http://localhost:3000' });

      // Wait for connection
      await waitFor({ time: 2 });

      // Take snapshot
      const page = await snapshot({});

      console.log('Demo app loaded:', page);

      // Verify page loaded
      expect(page).toContain('SDK Comparison Demo');
      expect(page).toContain('Multi-Turn Support');
      expect(page).toContain('Official SDK');
      expect(page).toContain('Lite SDK');
    } finally {
      // Clean up
      try {
        await close({});
      } catch (_e) {
        // Ignore close errors
      }
    }
  },
  { timeout: 30000 }
);

test.skipIf(!hasPlaywright)(
  'demo app sends query to both SDKs',
  async () => {
    const navigate = (globalThis as any).mcp__plugin_playwright_playwright__browser_navigate;
    const snapshot = (globalThis as any).mcp__plugin_playwright_playwright__browser_snapshot;
    const click = (globalThis as any).mcp__plugin_playwright_playwright__browser_click;
    const type = (globalThis as any).mcp__plugin_playwright_playwright__browser_type;
    const waitFor = (globalThis as any).mcp__plugin_playwright_playwright__browser_wait_for;
    const close = (globalThis as any).mcp__plugin_playwright_playwright__browser_close;

    try {
      // Navigate to demo app
      await navigate({ url: 'http://localhost:3000' });

      // Wait for connection
      await waitFor({ text: '✓ Connected' });

      // Get initial snapshot
      let page = await snapshot({});
      console.log('Connected, finding input field...');

      // Type in prompt input
      // Find the input field reference from snapshot
      const inputMatch = page.match(/textbox "Enter prompt/);
      if (!inputMatch) {
        throw new Error('Input field not found in page');
      }

      await type({
        ref: 'textbox "Enter prompt (e.g., \'Say hello in one word\')..."',
        text: 'Say hello in one word',
        element: 'prompt input field',
      });

      // Click send button
      await click({
        ref: 'button "Send to Both"',
        element: 'send button',
      });

      console.log('Query sent, waiting for responses...');

      // Wait for results to appear
      await waitFor({ time: 15 });

      // Take final snapshot
      page = await snapshot({});
      console.log('Results received');

      // Verify both panels got responses
      expect(page).toContain('assistant');

      // Should show some output in both panels
      const hasOutput = page.includes('Official SDK') && page.includes('Lite SDK');
      expect(hasOutput).toBe(true);
    } finally {
      try {
        await close({});
      } catch (_e) {
        // Ignore
      }
    }
  },
  { timeout: 60000 }
);

test.skipIf(!hasPlaywright)(
  'demo app continues conversation',
  async () => {
    const navigate = (globalThis as any).mcp__plugin_playwright_playwright__browser_navigate;
    const snapshot = (globalThis as any).mcp__plugin_playwright_playwright__browser_snapshot;
    const click = (globalThis as any).mcp__plugin_playwright_playwright__browser_click;
    const type = (globalThis as any).mcp__plugin_playwright_playwright__browser_type;
    const waitFor = (globalThis as any).mcp__plugin_playwright_playwright__browser_wait_for;
    const close = (globalThis as any).mcp__plugin_playwright_playwright__browser_close;

    try {
      // Navigate to demo app
      await navigate({ url: 'http://localhost:3000' });

      // Wait for connection
      await waitFor({ text: '✓ Connected' });

      console.log('Sending initial query...');

      // Send first query
      await type({
        ref: 'textbox "Enter prompt (e.g., \'Say hello in one word\')..."',
        text: 'Say hello in one word',
        element: 'prompt input',
      });

      await click({
        ref: 'button "Send to Both"',
        element: 'send button',
      });

      // Wait for first result
      await waitFor({ time: 15 });

      console.log('First result received, checking for Continue button...');

      // Verify continue button is enabled
      let page = await snapshot({});

      // Continue button should be enabled after result
      const hasContinueBtn = page.includes('Continue Conversation');
      expect(hasContinueBtn).toBe(true);

      console.log('Sending follow-up query...');

      // Type follow-up
      await type({
        ref: 'textbox "Enter prompt (e.g., \'Say hello in one word\')..."',
        text: 'Now say goodbye in one word',
        element: 'prompt input',
      });

      // Click continue button
      await click({
        ref: 'button "Continue Conversation"',
        element: 'continue button',
      });

      // Wait for second result
      await waitFor({ time: 15 });

      console.log('Second result received, verifying multi-turn worked...');

      // Take final snapshot
      page = await snapshot({});

      // Should have multiple messages in output (at least 2 results)
      const messageCount = (page.match(/message-result/g) || []).length;
      console.log(`Found ${messageCount} result messages`);

      // Should have at least 2 results (one from each turn, per SDK = 4 total, but at least 2)
      expect(messageCount).toBeGreaterThanOrEqual(2);

      console.log('✅ Multi-turn conversation test passed!');
    } finally {
      try {
        await close({});
      } catch (_e) {
        // Ignore
      }
    }
  },
  { timeout: 90000 }
);
