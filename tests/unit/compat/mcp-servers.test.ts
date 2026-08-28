/**
 * MCP server init message compatibility tests
 *
 * Verifies that mcpServers options produce matching init messages.
 */

import { describe, expect, test } from 'bun:test';
import { createSdkMcpServer, tool } from '../../../src/types/index.ts';
import { capture, officialQuery, openQuery } from './capture-utils.ts';

describe('mcpServers init message compatibility', () => {
  test.concurrent(
    'sdkMcpServers in init message matches official SDK',
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

      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { mcpServers: { 'test-tools': makeServer() } }),
        capture(officialQuery, 'test', { mcpServers: { 'test-tools': makeServer() } }),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Both should have sdkMcpServers
      expect(openInit?.request?.sdkMcpServers).toEqual(['test-tools']);
      expect(officialInit?.request?.sdkMcpServers).toEqual(['test-tools']);

      console.log('   sdkMcpServers in init message matches');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'process-only mcpServers do not add sdkMcpServers to init',
    async () => {
      const mcpServers = {
        playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
      };
      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { mcpServers }),
        capture(officialQuery, 'test', { mcpServers }),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Neither should have sdkMcpServers
      expect(openInit?.request?.sdkMcpServers).toBeUndefined();
      expect(officialInit?.request?.sdkMcpServers).toBeUndefined();

      console.log('   process-only mcpServers: no sdkMcpServers in init');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'mixed process + SDK mcpServers match official SDK',
    async () => {
      // Each SDK needs its own McpServer instance (McpServer only allows one connection)
      const makeServer = () =>
        createSdkMcpServer({
          name: 'custom-tools',
          tools: [
            tool('echo', 'Echo input', {}, async () => ({
              content: [{ type: 'text', text: 'echoed' }],
            })),
          ],
        });

      const [open, official] = await Promise.all([
        capture(openQuery, 'test', {
          mcpServers: {
            playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
            'custom-tools': makeServer(),
          },
        }),
        capture(officialQuery, 'test', {
          mcpServers: {
            playwright: { command: 'npx', args: ['@playwright/mcp@latest'] },
            'custom-tools': makeServer(),
          },
        }),
      ]);

      // CLI args: --mcp-config should include only process-based servers (SDK servers excluded)
      const openIdx = open.args.indexOf('--mcp-config');
      const officialIdx = official.args.indexOf('--mcp-config');

      expect(openIdx).toBeGreaterThanOrEqual(0);
      expect(officialIdx).toBeGreaterThanOrEqual(0);

      const openMcpConfig = JSON.parse(open.args[openIdx + 1]);
      const officialMcpConfig = JSON.parse(official.args[officialIdx + 1]);

      expect(openMcpConfig).toEqual(officialMcpConfig);

      // Only process-based server should be in --mcp-config
      expect(openMcpConfig.mcpServers.playwright).toBeDefined();
      expect(openMcpConfig.mcpServers['custom-tools']).toBeUndefined();

      // Init message: should have sdkMcpServers with only SDK server name
      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit?.request?.sdkMcpServers).toEqual(['custom-tools']);
      expect(officialInit?.request?.sdkMcpServers).toEqual(['custom-tools']);

      console.log('   mixed mcpServers match');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sdkMcpServers timeout produces matching sdkMcpServerConfigs (v0.3.248)',
    async () => {
      // Each SDK needs its own McpServer instance (McpServer only allows one connection)
      const makeServer = () => createSdkMcpServer({ name: 'timed-tools', timeout: 5000 });

      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { mcpServers: { 'timed-tools': makeServer() } }),
        capture(officialQuery, 'test', { mcpServers: { 'timed-tools': makeServer() } }),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit?.request?.sdkMcpServerConfigs).toEqual({ 'timed-tools': { timeout: 5000 } });
      expect(officialInit?.request?.sdkMcpServerConfigs).toEqual({
        'timed-tools': { timeout: 5000 },
      });

      console.log('   sdkMcpServerConfigs timeout matches');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'sdkMcpServers invalid timeout is omitted, matching official SDK (v0.3.248)',
    async () => {
      const makeServer = () => createSdkMcpServer({ name: 'bad-timeout-tools', timeout: -5 });

      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { mcpServers: { 'bad-timeout-tools': makeServer() } }),
        capture(officialQuery, 'test', { mcpServers: { 'bad-timeout-tools': makeServer() } }),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit?.request?.sdkMcpServerConfigs).toBeUndefined();
      expect(officialInit?.request?.sdkMcpServerConfigs).toBeUndefined();

      console.log('   invalid timeout omitted on both SDKs');
    },
    { timeout: 60000 }
  );
});
