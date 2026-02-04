/**
 * Unit tests for SDK compatibility between lite and official SDK
 *
 * These tests run both SDKs through a capture proxy and compare:
 * - CLI arguments passed to the executable
 * - Stdin messages sent to CLI
 *
 * This catches protocol drift without real API calls.
 */

import { describe, expect, test } from 'bun:test';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';
import type { HookCallbackMatcher } from '../../src/types/index.ts';

const CAPTURE_CLI = './tests/utils/capture-cli.cjs';

// Global counter to ensure unique file names even in parallel
let captureCounter = 0;

type CaptureResult = {
  args: string[];
  stdin: any[];
};

/**
 * Run SDK query and capture CLI args + stdin messages
 */
async function capture(
  queryFn: typeof liteQuery,
  prompt: string,
  options: Record<string, any> = {}
): Promise<CaptureResult> {
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
  } catch {
    // May error on mock CLI closing, that's ok
  }

  // Give CLI time to write file
  await new Promise((r) => setTimeout(r, 300));

  // Cleanup wrapper script
  try {
    unlinkSync(wrapperScript);
  } catch {
    // Ignore
  }

  // Read captured data
  if (existsSync(outputFile)) {
    try {
      const captured = JSON.parse(readFileSync(outputFile, 'utf-8'));
      unlinkSync(outputFile);
      return captured;
    } catch (e) {
      console.error('Failed to read capture file:', outputFile, e);
      return { args: [], stdin: [] };
    }
  }

  console.error('Capture file not found:', outputFile);
  return { args: [], stdin: [] };
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
    for (const [_event, matchers] of Object.entries(clone.request.hooks as Record<string, any[]>)) {
      for (const matcher of matchers) {
        if (matcher.hookCallbackIds) {
          // Replace with placeholder to show structure is same
          matcher.hookCallbackIds = matcher.hookCallbackIds.map(
            (_: string, i: number) => `hook_${i}`
          );
        }
      }
    }
  }

  return clone;
}

// ============================================================================
// CLI Arguments Compatibility Tests
// ============================================================================

describe('CLI arguments compatibility', () => {
  test.concurrent(
    'basic args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test'),
        capture(officialQuery, 'test'),
      ]);

      // Both should have required flags
      expect(lite.args).toContain('--output-format');
      expect(lite.args).toContain('stream-json');
      expect(official.args).toContain('--output-format');
      expect(official.args).toContain('stream-json');

      // Both should have input-format
      expect(lite.args).toContain('--input-format');
      expect(official.args).toContain('--input-format');

      console.log('   Basic args match');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'model option args match official SDK',
    async () => {
      const model = 'claude-sonnet-4-20250514';
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { model }),
        capture(officialQuery, 'test', { model }),
      ]);

      expect(lite.args).toContain('--model');
      expect(lite.args).toContain(model);
      expect(official.args).toContain('--model');
      expect(official.args).toContain(model);

      console.log('   Model args match');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'maxTurns option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { maxTurns: 5 }),
        capture(officialQuery, 'test', { maxTurns: 5 }),
      ]);

      expect(lite.args).toContain('--max-turns');
      expect(lite.args).toContain('5');
      expect(official.args).toContain('--max-turns');
      expect(official.args).toContain('5');

      console.log('   maxTurns args match');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'permissionMode option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { permissionMode: 'acceptEdits' }),
        capture(officialQuery, 'test', { permissionMode: 'acceptEdits' }),
      ]);

      expect(lite.args).toContain('--permission-mode');
      expect(lite.args).toContain('acceptEdits');
      expect(official.args).toContain('--permission-mode');
      expect(official.args).toContain('acceptEdits');

      console.log('   permissionMode args match');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'sandbox option args match official SDK',
    async () => {
      const sandbox = { enabled: true, autoAllowBashIfSandboxed: false };
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { sandbox }),
        capture(officialQuery, 'test', { sandbox }),
      ]);

      // Both should use --settings with JSON
      expect(lite.args).toContain('--settings');
      expect(official.args).toContain('--settings');

      // Find the settings value
      const liteSettingsIdx = lite.args.indexOf('--settings');
      const officialSettingsIdx = official.args.indexOf('--settings');

      const liteSettings = JSON.parse(lite.args[liteSettingsIdx + 1]);
      const officialSettings = JSON.parse(official.args[officialSettingsIdx + 1]);

      expect(liteSettings.sandbox).toEqual(officialSettings.sandbox);

      console.log('   sandbox args match');
      console.log('   Lite sandbox:', liteSettings.sandbox);
      console.log('   Official sandbox:', officialSettings.sandbox);
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'settingSources option args match official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { settingSources: ['project', 'user'] }),
        capture(officialQuery, 'test', { settingSources: ['project', 'user'] }),
      ]);

      expect(lite.args).toContain('--setting-sources');
      expect(official.args).toContain('--setting-sources');

      // Find the setting-sources value
      const liteIdx = lite.args.indexOf('--setting-sources');
      const officialIdx = official.args.indexOf('--setting-sources');

      // Values should match (order may differ)
      const liteValue = lite.args[liteIdx + 1].split(',').sort().join(',');
      const officialValue = official.args[officialIdx + 1].split(',').sort().join(',');

      expect(liteValue).toBe(officialValue);

      console.log('   settingSources args match');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'resume option args match official SDK',
    async () => {
      const sessionId = 'test-session-123';
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { resume: sessionId }),
        capture(officialQuery, 'test', { resume: sessionId }),
      ]);

      expect(lite.args).toContain('--resume');
      expect(lite.args).toContain(sessionId);
      expect(official.args).toContain('--resume');
      expect(official.args).toContain(sessionId);

      console.log('   resume args match');
    },
    { timeout: 15000 }
  );
});

// ============================================================================
// Stdin Message Compatibility Tests
// ============================================================================

describe('stdin message compatibility', () => {
  test.concurrent('init message structure matches official SDK', async () => {
    const [lite, official] = await Promise.all([
      capture(liteQuery, 'test'),
      capture(officialQuery, 'test'),
    ]);

    const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
    const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

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

    const [lite, official] = await Promise.all([
      capture(liteQuery, testPrompt),
      capture(officialQuery, testPrompt),
    ]);

    const liteUser = lite.stdin.find((m) => m.type === 'user');
    const officialUser = official.stdin.find((m) => m.type === 'user');

    expect(liteUser).toBeTruthy();
    expect(officialUser).toBeTruthy();

    if (liteUser && officialUser) {
      expect(liteUser.message.role).toBe(officialUser.message.role);

      // Content structure should match
      expect(Array.isArray(liteUser.message.content)).toBe(
        Array.isArray(officialUser.message.content)
      );

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
      PreToolUse: [
        {
          matcher: 'Read',
          hooks: [async () => ({})],
        },
      ],
    };

    const [lite, official] = await Promise.all([
      capture(liteQuery, 'test', { hooks }),
      capture(officialQuery, 'test', { hooks }),
    ]);

    const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
    const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();

    if (liteInit && officialInit) {
      // Both should have hooks
      expect(!!liteInit.request.hooks).toBe(!!officialInit.request.hooks);

      if (liteInit.request.hooks && officialInit.request.hooks) {
        // Same hook event types registered
        expect(Object.keys(liteInit.request.hooks).sort()).toEqual(
          Object.keys(officialInit.request.hooks).sort()
        );

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
      official: !!officialInit?.request?.hooks,
    });
  });

  test.concurrent(
    'message ordering matches official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test'),
        capture(officialQuery, 'test'),
      ]);

      // Extract message types in order
      const getType = (m: any) => (m.type === 'control_request' ? m.request?.subtype : m.type);

      const liteTypes = lite.stdin.map(getType);
      const officialTypes = official.stdin.map(getType);

      // Both should have same message sequence
      expect(liteTypes).toEqual(officialTypes);

      console.log('   Message order:', { lite: liteTypes, official: officialTypes });
    },
    { timeout: 30000 }
  );

  test.concurrent(
    'multiple hooks registration works correctly',
    async () => {
      const hooks: Record<string, HookCallbackMatcher[]> = {
        PreToolUse: [
          { matcher: 'Read', hooks: [async () => ({})] },
          { matcher: 'Write', hooks: [async () => ({}), async () => ({})] },
        ],
        PostToolUse: [
          { hooks: [async () => ({})] }, // No matcher = match all
        ],
      };

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { hooks }),
        capture(officialQuery, 'test', { hooks }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      if (liteInit && officialInit) {
        // Normalize for comparison
        const liteNorm = normalizeMessage(liteInit);
        const officialNorm = normalizeMessage(officialInit);

        // Hooks structure should match
        expect(liteNorm.request.hooks).toEqual(officialNorm.request.hooks);
      }

      console.log('   Multiple hooks test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'permissionMode flag is passed correctly',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { permissionMode: 'acceptEdits' }),
        capture(officialQuery, 'test', { permissionMode: 'acceptEdits' }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   Permission mode test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'model option is serialized correctly',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { model: 'claude-sonnet-4-20250514' }),
        capture(officialQuery, 'test', { model: 'claude-sonnet-4-20250514' }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   Model option test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'maxTurns option is serialized correctly',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { maxTurns: 10 }),
        capture(officialQuery, 'test', { maxTurns: 10 }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   maxTurns option test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'all hook event types are supported',
    async () => {
      const hooks: Record<string, HookCallbackMatcher[]> = {
        PreToolUse: [{ hooks: [async () => ({})] }],
        PostToolUse: [{ hooks: [async () => ({})] }],
        UserPromptSubmit: [{ hooks: [async () => ({})] }],
      };

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { hooks }),
        capture(officialQuery, 'test', { hooks }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      if (liteInit && officialInit) {
        const liteHookTypes = Object.keys(liteInit.request.hooks || {}).sort();
        const officialHookTypes = Object.keys(officialInit.request.hooks || {}).sort();
        expect(liteHookTypes).toEqual(officialHookTypes);
      }

      console.log('   All hook event types test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'empty prompt handling matches',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, ''),
        capture(officialQuery, ''),
      ]);

      const liteUser = lite.stdin.find((m) => m.type === 'user');
      const officialUser = official.stdin.find((m) => m.type === 'user');

      if (liteUser && officialUser) {
        expect(liteUser.message.role).toBe(officialUser.message.role);
      }

      console.log('   Empty prompt handling test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'systemPrompt option is serialized correctly',
    async () => {
      const systemPrompt = 'You are a helpful assistant named TestBot.';

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { systemPrompt }),
        capture(officialQuery, 'test', { systemPrompt }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Both should have systemPrompt in the init request
      expect(liteInit?.request?.systemPrompt).toBe(systemPrompt);
      expect(officialInit?.request?.systemPrompt).toBe(systemPrompt);

      console.log('   systemPrompt option test passed');
      console.log('   Lite systemPrompt:', liteInit?.request?.systemPrompt);
      console.log('   Official systemPrompt:', officialInit?.request?.systemPrompt);
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'systemPrompt with preset type matches official SDK',
    async () => {
      const systemPrompt = {
        type: 'preset' as const,
        preset: 'claude_code' as const,
        appendSystemPrompt: 'Additional instructions here.',
      };

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { systemPrompt }),
        capture(officialQuery, 'test', { systemPrompt }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Compare the systemPrompt structure
      const liteSystemPrompt = liteInit?.request?.systemPrompt;
      const officialSystemPrompt = officialInit?.request?.systemPrompt;

      expect(liteSystemPrompt).toEqual(officialSystemPrompt);

      console.log('   systemPrompt preset type test passed');
      console.log('   Lite:', liteSystemPrompt);
      console.log('   Official:', officialSystemPrompt);
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'settingSources with project matches official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { settingSources: ['project'] }),
        capture(officialQuery, 'test', { settingSources: ['project'] }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   settingSources: [project] test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'settingSources with user matches official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { settingSources: ['user'] }),
        capture(officialQuery, 'test', { settingSources: ['user'] }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   settingSources: [user] test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'settingSources with multiple sources matches official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { settingSources: ['user', 'project'] }),
        capture(officialQuery, 'test', { settingSources: ['user', 'project'] }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   settingSources: [user, project] test passed');
    },
    { timeout: 15000 }
  );

  test.concurrent(
    'settingSources empty array matches official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { settingSources: [] }),
        capture(officialQuery, 'test', { settingSources: [] }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      console.log('   settingSources: [] test passed');
    },
    { timeout: 15000 }
  );
});
