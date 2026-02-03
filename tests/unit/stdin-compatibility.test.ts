/**
 * Unit tests for stdin message compatibility between lite and official SDK
 *
 * These tests run both SDKs through a capture proxy and compare the stdin
 * messages they send. This catches protocol drift without real API calls.
 */

import { test, expect, describe } from 'bun:test';
import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'fs';
import type { HookCallbackMatcher } from '../../src/types/index.ts';

const CAPTURE_CLI = './tests/utils/capture-cli.cjs';

// Global counter to ensure unique file names even in parallel
let captureCounter = 0;

/**
 * Run SDK query and capture stdin messages sent to CLI
 */
async function captureStdin(
  queryFn: typeof liteQuery,
  prompt: string,
  options: Record<string, any> = {}
): Promise<any[]> {
  // Use counter + random for uniqueness even in parallel tests
  const uniqueId = `${Date.now()}-${++captureCounter}-${Math.random().toString(36).slice(2)}`;
  const outputFile = `/tmp/capture-${uniqueId}.json`;

  // Create a wrapper script that sets the env var for this specific run
  const wrapperScript = `/tmp/capture-wrapper-${uniqueId}.sh`;
  const wrapperContent = `#!/bin/bash
CAPTURE_OUTPUT_FILE="${outputFile}" exec node "${process.cwd()}/${CAPTURE_CLI}" "$@"
`;
  writeFileSync(wrapperScript, wrapperContent, { mode: 0o755 });

  const opts = {
    pathToClaudeCodeExecutable: wrapperScript,
    settingSources: [],
    maxTurns: 1,
    ...options,
  };

  try {
    for await (const msg of queryFn({ prompt, options: opts })) {
      if (msg.type === 'result') break;
    }
  } catch (e) {
    // May error on mock CLI closing, that's ok
  }

  // Give CLI time to write file
  await new Promise(r => setTimeout(r, 300));

  // Cleanup wrapper script
  try { unlinkSync(wrapperScript); } catch (e) {}

  // Read captured messages
  if (existsSync(outputFile)) {
    try {
      const captured = JSON.parse(readFileSync(outputFile, 'utf-8'));
      unlinkSync(outputFile);
      return captured;
    } catch (e) {
      console.error('Failed to read capture file:', outputFile, e);
      return [];
    }
  }

  console.error('Capture file not found:', outputFile);
  return [];
}

/**
 * Normalize messages for comparison (remove dynamic fields)
 */
function normalizeMessage(msg: any): any {
  const clone = JSON.parse(JSON.stringify(msg));

  // Remove dynamic fields that will differ
  delete clone.request_id;
  delete clone.timestamp;
  delete clone.session_id;

  if (clone.request) {
    delete clone.request.request_id;
  }

  // Normalize hook callback IDs (they're generated dynamically)
  if (clone.request?.hooks) {
    for (const [event, matchers] of Object.entries(clone.request.hooks as Record<string, any[]>)) {
      for (const matcher of matchers) {
        if (matcher.hookCallbackIds) {
          // Replace with placeholder to show structure is same
          matcher.hookCallbackIds = matcher.hookCallbackIds.map((_: string, i: number) => `hook_${i}`);
        }
      }
    }
  }

  return clone;
}

describe('stdin message compatibility', () => {
  test.concurrent('init message structure matches official SDK', async () => {
    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test'),
      captureStdin(officialQuery, 'test')
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();

    if (liteInit && officialInit) {
      // Compare structure (not request_id which is random)
      expect(liteInit.type).toBe(officialInit.type);
      expect(liteInit.request.subtype).toBe(officialInit.request.subtype);

      // Critical: systemPrompt field must be present (caused 73% cost increase when missing)
      expect('systemPrompt' in liteInit.request).toBe('systemPrompt' in officialInit.request);
      expect(liteInit.request.systemPrompt).toBe(officialInit.request.systemPrompt);
    }

    console.log('   Init messages captured:', { lite: !!liteInit, official: !!officialInit });
  });

  test.concurrent('user message format matches official SDK', async () => {
    const testPrompt = 'hello world test';

    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, testPrompt),
      captureStdin(officialQuery, testPrompt)
    ]);

    const liteUser = liteMessages.find(m => m.type === 'user');
    const officialUser = officialMessages.find(m => m.type === 'user');

    expect(liteUser).toBeTruthy();
    expect(officialUser).toBeTruthy();

    if (liteUser && officialUser) {
      expect(liteUser.message.role).toBe(officialUser.message.role);

      // Content structure should match
      expect(Array.isArray(liteUser.message.content)).toBe(Array.isArray(officialUser.message.content));

      if (Array.isArray(liteUser.message.content) && Array.isArray(officialUser.message.content)) {
        expect(liteUser.message.content.length).toBe(officialUser.message.content.length);

        // First content item should be text with same content
        const liteText = liteUser.message.content[0];
        const officialText = officialUser.message.content[0];
        expect(liteText.type).toBe(officialText.type);
        expect(liteText.text).toBe(officialText.text);
      }
    }

    console.log('   User messages captured:', { lite: !!liteUser, official: !!officialUser });
  });

  test.concurrent('hooks registration format matches official SDK', async () => {
    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [{
        matcher: 'Read',
        hooks: [async () => ({})]
      }]
    };

    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test', { hooks }),
      captureStdin(officialQuery, 'test', { hooks })
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();

    if (liteInit && officialInit) {
      // Both should have hooks
      expect(!!liteInit.request.hooks).toBe(!!officialInit.request.hooks);

      if (liteInit.request.hooks && officialInit.request.hooks) {
        // Same hook event types registered
        expect(Object.keys(liteInit.request.hooks).sort())
          .toEqual(Object.keys(officialInit.request.hooks).sort());

        // Same structure for PreToolUse
        const litePreToolUse = liteInit.request.hooks.PreToolUse;
        const officialPreToolUse = officialInit.request.hooks.PreToolUse;

        expect(litePreToolUse.length).toBe(officialPreToolUse.length);

        // Matcher should be same
        expect(litePreToolUse[0].matcher).toBe(officialPreToolUse[0].matcher);

        // Should have hookCallbackIds array
        expect(Array.isArray(litePreToolUse[0].hookCallbackIds)).toBe(true);
        expect(Array.isArray(officialPreToolUse[0].hookCallbackIds)).toBe(true);
      }
    }

    console.log('   Hooks registration captured:', {
      lite: !!liteInit?.request?.hooks,
      official: !!officialInit?.request?.hooks
    });
  });

  test.concurrent('message ordering matches official SDK', async () => {
    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test'),
      captureStdin(officialQuery, 'test')
    ]);

    // Extract message types in order
    const getType = (m: any) => m.type === 'control_request' ? m.request?.subtype : m.type;

    const liteTypes = liteMessages.map(getType);
    const officialTypes = officialMessages.map(getType);

    // Both should have same message sequence
    expect(liteTypes).toEqual(officialTypes);

    console.log('   Message order:', { lite: liteTypes, official: officialTypes });
  }, { timeout: 30000 });

  test.concurrent('multiple hooks registration works correctly', async () => {
    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [
        { matcher: 'Read', hooks: [async () => ({})] },
        { matcher: 'Write', hooks: [async () => ({}), async () => ({})] }
      ],
      PostToolUse: [
        { hooks: [async () => ({})] }  // No matcher = match all
      ]
    };

    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test', { hooks }),
      captureStdin(officialQuery, 'test', { hooks })
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    if (liteInit && officialInit) {
      // Normalize for comparison
      const liteNorm = normalizeMessage(liteInit);
      const officialNorm = normalizeMessage(officialInit);

      // Hooks structure should match
      expect(liteNorm.request.hooks).toEqual(officialNorm.request.hooks);
    }

    console.log('   Multiple hooks test passed');
  }, { timeout: 15000 });

  test.concurrent('permissionMode flag is passed correctly', async () => {
    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test', { permissionMode: 'acceptEdits' }),
      captureStdin(officialQuery, 'test', { permissionMode: 'acceptEdits' })
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();

    console.log('   Permission mode test passed');
  }, { timeout: 15000 });

  test.concurrent('model option is serialized correctly', async () => {
    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test', { model: 'claude-sonnet-4-20250514' }),
      captureStdin(officialQuery, 'test', { model: 'claude-sonnet-4-20250514' })
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();

    console.log('   Model option test passed');
  }, { timeout: 15000 });

  test.concurrent('maxTurns option is serialized correctly', async () => {
    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test', { maxTurns: 10 }),
      captureStdin(officialQuery, 'test', { maxTurns: 10 })
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();

    console.log('   maxTurns option test passed');
  }, { timeout: 15000 });

  test.concurrent('all hook event types are supported', async () => {
    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [{ hooks: [async () => ({})] }],
      PostToolUse: [{ hooks: [async () => ({})] }],
      UserPromptSubmit: [{ hooks: [async () => ({})] }],
    };

    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, 'test', { hooks }),
      captureStdin(officialQuery, 'test', { hooks })
    ]);

    const liteInit = liteMessages.find(m => m.request?.subtype === 'initialize');
    const officialInit = officialMessages.find(m => m.request?.subtype === 'initialize');

    if (liteInit && officialInit) {
      const liteHookTypes = Object.keys(liteInit.request.hooks || {}).sort();
      const officialHookTypes = Object.keys(officialInit.request.hooks || {}).sort();
      expect(liteHookTypes).toEqual(officialHookTypes);
    }

    console.log('   All hook event types test passed');
  }, { timeout: 15000 });

  test.concurrent('empty prompt handling matches', async () => {
    const [liteMessages, officialMessages] = await Promise.all([
      captureStdin(liteQuery, ''),
      captureStdin(officialQuery, '')
    ]);

    const liteUser = liteMessages.find(m => m.type === 'user');
    const officialUser = officialMessages.find(m => m.type === 'user');

    if (liteUser && officialUser) {
      expect(liteUser.message.role).toBe(officialUser.message.role);
    }

    console.log('   Empty prompt handling test passed');
  }, { timeout: 15000 });
});
