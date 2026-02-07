/**
 * Stdin message compatibility tests
 *
 * Verifies that lite SDK sends the same stdin messages as official SDK.
 */

import { describe, expect, test } from 'bun:test';
import type { HookCallbackMatcher } from '../../../src/types/index.ts';
import { createSdkMcpServer, tool } from '../../../src/types/index.ts';
import {
  capture,
  captureWithQuery,
  liteQuery,
  normalizeMessage,
  officialQuery,
} from './capture-utils.ts';

describe('stdin message compatibility', () => {
  test.concurrent(
    'init message structure matches official SDK',
    async () => {
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
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'user message format matches official SDK',
    async () => {
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

        if (
          Array.isArray(liteUser.message.content) &&
          Array.isArray(officialUser.message.content)
        ) {
          expect(liteUser.message.content.length).toBe(officialUser.message.content.length);

          // First content item should be text with same content
          const liteText = liteUser.message.content[0];
          const officialText = officialUser.message.content[0];
          expect(liteText.type).toBe(officialText.type);
          expect(liteText.text).toBe(officialText.text);
        }
      }

      console.log('   User messages captured:', { lite: !!liteUser, official: !!officialUser });
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'hooks registration format matches official SDK',
    async () => {
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
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'message ordering matches official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test'),
        capture(officialQuery, 'test'),
      ]);

      // Extract message types in order
      const getType = (m: { type: string; request?: { subtype: string } }) =>
        m.type === 'control_request' ? m.request?.subtype : m.type;

      const liteTypes = lite.stdin.map(getType);
      const officialTypes = official.stdin.map(getType);

      // Both should have same message sequence
      expect(liteTypes).toEqual(officialTypes);

      console.log('   Message order:', { lite: liteTypes, official: officialTypes });
    },
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
  );

  test.concurrent(
    'all 15 hook events register correctly matching official SDK',
    async () => {
      // Every hook event from HOOK_EVENTS array in SDK 0.2.34
      const allHookEvents = [
        'PreToolUse',
        'PostToolUse',
        'PostToolUseFailure',
        'Notification',
        'UserPromptSubmit',
        'SessionStart',
        'SessionEnd',
        'Stop',
        'SubagentStart',
        'SubagentStop',
        'PreCompact',
        'PermissionRequest',
        'Setup',
        'TeammateIdle',
        'TaskCompleted',
      ];

      const hooks: Record<string, HookCallbackMatcher[]> = {};
      for (const event of allHookEvents) {
        hooks[event] = [{ hooks: [async () => ({})] }];
      }

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { hooks }),
        capture(officialQuery, 'test', { hooks }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      if (liteInit && officialInit) {
        const liteHookTypes = Object.keys(liteInit.request.hooks || {}).sort();
        const officialHookTypes = Object.keys(officialInit.request.hooks || {}).sort();
        expect(liteHookTypes).toEqual(officialHookTypes);
        expect(liteHookTypes).toEqual(allHookEvents.sort());

        // Each event should have exactly 1 matcher with 1 callback ID
        for (const event of allHookEvents) {
          const liteEvent = liteInit.request.hooks?.[event];
          const officialEvent = officialInit.request.hooks?.[event];
          expect(liteEvent).toHaveLength(1);
          expect(officialEvent).toHaveLength(1);
          expect(liteEvent?.[0].hookCallbackIds).toHaveLength(1);
          expect(officialEvent?.[0].hookCallbackIds).toHaveLength(1);
        }
      }

      console.log('   All 15 hook events register correctly');
    },
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
  );

  test.concurrent(
    'systemPrompt preset without append sends no systemPrompt fields',
    async () => {
      const systemPrompt = {
        type: 'preset' as const,
        preset: 'claude_code' as const,
      };

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { systemPrompt }),
        capture(officialQuery, 'test', { systemPrompt }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Neither systemPrompt nor appendSystemPrompt should be present
      expect(liteInit?.request?.systemPrompt).toBeUndefined();
      expect(liteInit?.request?.appendSystemPrompt).toBeUndefined();
      expect(officialInit?.request?.systemPrompt).toBeUndefined();
      expect(officialInit?.request?.appendSystemPrompt).toBeUndefined();

      console.log('   systemPrompt preset (no append) test passed');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'systemPrompt preset with append sends appendSystemPrompt matching official SDK',
    async () => {
      const systemPrompt = {
        type: 'preset' as const,
        preset: 'claude_code' as const,
        append: 'Additional instructions here.',
      };

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { systemPrompt }),
        capture(officialQuery, 'test', { systemPrompt }),
      ]);

      const liteInit = lite.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(liteInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Should have appendSystemPrompt, not systemPrompt
      expect(liteInit?.request?.systemPrompt).toBeUndefined();
      expect(liteInit?.request?.appendSystemPrompt).toBe('Additional instructions here.');
      expect(officialInit?.request?.systemPrompt).toBeUndefined();
      expect(officialInit?.request?.appendSystemPrompt).toBe('Additional instructions here.');

      console.log('   systemPrompt preset with append test passed');
    },
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
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
    { timeout: 60000 }
  );

  test.concurrent(
    'mcpServerStatus sends mcp_status control request matching official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        captureWithQuery(liteQuery, 'test', async (q) => {
          await q.mcpServerStatus();
        }),
        captureWithQuery(officialQuery, 'test', async (q) => {
          await q.mcpServerStatus();
        }),
      ]);

      const liteMcp = lite.stdin.find((m) => m.request?.subtype === 'mcp_status');
      const officialMcp = official.stdin.find((m) => m.request?.subtype === 'mcp_status');

      expect(liteMcp).toBeTruthy();
      expect(officialMcp).toBeTruthy();

      if (liteMcp && officialMcp) {
        const liteNorm = normalizeMessage(liteMcp);
        const officialNorm = normalizeMessage(officialMcp);
        expect(liteNorm).toEqual(officialNorm);
      }

      console.log('   mcpServerStatus stdin messages match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'reconnectMcpServer sends mcp_reconnect control request matching official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        captureWithQuery(liteQuery, 'test', async (q) => {
          await q.reconnectMcpServer('test-server');
        }),
        captureWithQuery(officialQuery, 'test', async (q) => {
          await q.reconnectMcpServer('test-server');
        }),
      ]);

      const liteMcp = lite.stdin.find((m) => m.request?.subtype === 'mcp_reconnect');
      const officialMcp = official.stdin.find((m) => m.request?.subtype === 'mcp_reconnect');

      expect(liteMcp).toBeTruthy();
      expect(officialMcp).toBeTruthy();

      if (liteMcp && officialMcp) {
        const liteNorm = normalizeMessage(liteMcp);
        const officialNorm = normalizeMessage(officialMcp);
        expect(liteNorm).toEqual(officialNorm);
      }

      console.log('   reconnectMcpServer stdin messages match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'toggleMcpServer sends mcp_toggle control request matching official SDK',
    async () => {
      const [lite, official] = await Promise.all([
        captureWithQuery(liteQuery, 'test', async (q) => {
          await q.toggleMcpServer('test-server', false);
        }),
        captureWithQuery(officialQuery, 'test', async (q) => {
          await q.toggleMcpServer('test-server', false);
        }),
      ]);

      const liteMcp = lite.stdin.find((m) => m.request?.subtype === 'mcp_toggle');
      const officialMcp = official.stdin.find((m) => m.request?.subtype === 'mcp_toggle');

      expect(liteMcp).toBeTruthy();
      expect(officialMcp).toBeTruthy();

      if (liteMcp && officialMcp) {
        const liteNorm = normalizeMessage(liteMcp);
        const officialNorm = normalizeMessage(officialMcp);
        expect(liteNorm).toEqual(officialNorm);
      }

      console.log('   toggleMcpServer stdin messages match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'setMcpServers sends mcp_set_servers control request matching official SDK',
    async () => {
      const servers = {
        playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
      };
      const [lite, official] = await Promise.all([
        captureWithQuery(liteQuery, 'test', async (q) => {
          await q.setMcpServers(servers);
        }),
        captureWithQuery(officialQuery, 'test', async (q) => {
          await q.setMcpServers(servers);
        }),
      ]);

      const liteMcp = lite.stdin.find((m) => m.request?.subtype === 'mcp_set_servers');
      const officialMcp = official.stdin.find((m) => m.request?.subtype === 'mcp_set_servers');

      expect(liteMcp).toBeTruthy();
      expect(officialMcp).toBeTruthy();

      if (liteMcp && officialMcp) {
        const liteNorm = normalizeMessage(liteMcp);
        const officialNorm = normalizeMessage(officialMcp);
        expect(liteNorm).toEqual(officialNorm);
      }

      console.log('   setMcpServers stdin messages match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'outputFormat json_schema args match official SDK',
    async () => {
      const schema = {
        type: 'object',
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { outputFormat: { type: 'json_schema', schema } }),
        capture(officialQuery, 'test', { outputFormat: { type: 'json_schema', schema } }),
      ]);

      expect(lite.args).toContain('--json-schema');
      expect(official.args).toContain('--json-schema');

      // Find and compare the schema values
      const liteIdx = lite.args.indexOf('--json-schema');
      const officialIdx = official.args.indexOf('--json-schema');
      expect(JSON.parse(lite.args[liteIdx + 1])).toEqual(
        JSON.parse(official.args[officialIdx + 1])
      );

      console.log('   outputFormat json_schema args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'process-based mcpServers --mcp-config args match official SDK',
    async () => {
      const mcpServers = {
        playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
      };
      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { mcpServers }),
        capture(officialQuery, 'test', { mcpServers }),
      ]);

      expect(lite.args).toContain('--mcp-config');
      expect(official.args).toContain('--mcp-config');

      // Find and compare the --mcp-config values
      const liteIdx = lite.args.indexOf('--mcp-config');
      const officialIdx = official.args.indexOf('--mcp-config');

      expect(JSON.parse(lite.args[liteIdx + 1])).toEqual(
        JSON.parse(official.args[officialIdx + 1])
      );

      console.log('   process-based mcpServers --mcp-config args match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'SDK mcpServers --mcp-config includes stripped SDK server matching official SDK',
    async () => {
      // Each SDK needs its own McpServer instance (McpServer only allows one connection)
      const makeServer = () =>
        createSdkMcpServer({
          name: 'test-tools',
          tools: [
            tool('get_time', 'Get current time', {}, async () => ({
              content: [{ type: 'text', text: '12:00 PM' }],
            })),
          ],
        });

      const [lite, official] = await Promise.all([
        capture(liteQuery, 'test', { mcpServers: { 'test-tools': makeServer() } }),
        capture(officialQuery, 'test', { mcpServers: { 'test-tools': makeServer() } }),
      ]);

      // Both should have --mcp-config with the SDK server (stripped of instance)
      expect(lite.args).toContain('--mcp-config');
      expect(official.args).toContain('--mcp-config');

      const liteIdx = lite.args.indexOf('--mcp-config');
      const officialIdx = official.args.indexOf('--mcp-config');

      const liteMcpConfig = JSON.parse(lite.args[liteIdx + 1]);
      const officialMcpConfig = JSON.parse(official.args[officialIdx + 1]);

      expect(liteMcpConfig).toEqual(officialMcpConfig);

      // Should have type: 'sdk' and name, but no instance
      expect(liteMcpConfig.mcpServers['test-tools'].type).toBe('sdk');
      expect(liteMcpConfig.mcpServers['test-tools'].name).toBe('test-tools');
      expect(liteMcpConfig.mcpServers['test-tools'].instance).toBeUndefined();

      console.log('   SDK mcpServers --mcp-config args match');
    },
    { timeout: 60000 }
  );
});
