/**
 * MCP Servers integration tests
 *
 * Tests both process-based and SDK (in-process) MCP server support.
 * SDK MCP servers use createSdkMcpServer + tool() to define custom tools
 * that run in the SDK process and are proxied to CLI via mcp_message control protocol.
 *
 * This is the core use case: wrap your app's APIs as MCP tools so Claude
 * can call into your code at runtime.
 */

import { describe, expect } from 'bun:test';
import path from 'node:path';
import { z } from 'zod';
import type { McpStdioServerConfig } from '../../src/types/index.ts';
import { createSdkMcpServer, tool } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

const MCP_SERVER = path.resolve('./tests/fixtures/mcp-server.mjs');

// =============================================================================
// SDK MCP Servers (In-Process Custom Tools)
// =============================================================================

describe('SDK MCP Servers', () => {
  testWithBothSDKs(
    'createSdkMcpServer tool is discovered and called by Claude',
    async (sdk) => {
      const server = createSdkMcpServer({
        name: 'test-tools',
        tools: [
          tool(
            'get_secret_number',
            'Returns a secret number. Always call this tool when asked for the secret number.',
            {},
            async () => ({
              content: [{ type: 'text' as const, text: '42' }],
            })
          ),
        ],
      });

      const messages = await runWithSDK(
        sdk,
        'What is the secret number? Use the get_secret_number tool to find out. Reply with just the number.',
        {
          permissionMode: 'default',
          canUseTool: async () => ({ behavior: 'allow' as const }),
          mcpServers: { 'test-tools': server },
          allowedTools: ['mcp__test-tools__*'],
          maxTurns: 3,
        }
      );

      // Should have result
      const result = messages.find((m) => m.type === 'result');
      expect(result).toBeTruthy();

      if (result && result.type === 'result') {
        expect(result.subtype).toBe('success');
        // The result should contain 42 (the secret number from our tool)
        expect(result.result).toContain('42');
      }

      console.log(`   [${sdk}] SDK MCP server tool called and returned result`);
    },
    120000
  );

  testWithBothSDKs(
    'SDK MCP server receives input args from Claude and returns computed result',
    async (sdk) => {
      // Simulate wrapping app code: a lookup service that Claude calls with args
      const userDatabase: Record<string, { email: string; role: string }> = {
        alice: { email: 'alice@example.com', role: 'admin' },
        bob: { email: 'bob@example.com', role: 'viewer' },
      };

      const server = createSdkMcpServer({
        name: 'user-api',
        tools: [
          tool(
            'lookup_user',
            'Look up a user by username. Returns their email and role.',
            { username: z.string().describe('The username to look up') },
            async (args) => {
              const user = userDatabase[args.username];
              if (!user) {
                return {
                  content: [{ type: 'text' as const, text: `User "${args.username}" not found` }],
                };
              }
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: JSON.stringify(user),
                  },
                ],
              };
            }
          ),
        ],
      });

      const messages = await runWithSDK(
        sdk,
        'Use the lookup_user tool to find alice. What is her email? Reply with just the email address.',
        {
          permissionMode: 'default',
          canUseTool: async () => ({ behavior: 'allow' as const }),
          mcpServers: { 'user-api': server },
          allowedTools: ['mcp__user-api__*'],
          maxTurns: 3,
        }
      );

      const result = messages.find((m) => m.type === 'result');
      expect(result).toBeTruthy();

      if (result && result.type === 'result') {
        expect(result.subtype).toBe('success');
        expect(result.result).toContain('alice@example.com');
      }

      console.log(`   [${sdk}] App code received args from Claude, returned computed result`);
    },
    120000
  );
});

// =============================================================================
// Stdio MCP Servers (External Process)
// =============================================================================

describe('Stdio MCP Servers', () => {
  testWithBothSDKs(
    'stdio MCP server tool is discovered and called by Claude',
    async (sdk) => {
      const messages = await runWithSDK(
        sdk,
        'Use the ping tool from the test-server MCP server. Reply with exactly what it returns, nothing else.',
        {
          permissionMode: 'default',
          canUseTool: async () => ({ behavior: 'allow' as const }),
          mcpServers: {
            'test-server': { command: 'node', args: [MCP_SERVER] } as McpStdioServerConfig,
          },
          allowedTools: ['mcp__test-server__*'],
          maxTurns: 3,
        }
      );

      const result = messages.find((m) => m.type === 'result');
      expect(result).toBeTruthy();

      if (result && result.type === 'result') {
        expect(result.subtype).toBe('success');
        expect(result.result?.toLowerCase()).toContain('pong');
      }

      console.log(`   [${sdk}] Stdio MCP server ping tool called, got pong`);
    },
    120000
  );

  testWithBothSDKs(
    'init message includes mcp_servers status for stdio server',
    async (sdk) => {
      const messages = await runWithSDK(sdk, 'Say hello', {
        permissionMode: 'default',
        mcpServers: {
          'test-server': { command: 'node', args: [MCP_SERVER] } as McpStdioServerConfig,
        },
        maxTurns: 1,
      });

      const initMsg = messages.find(
        (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
      );
      expect(initMsg).toBeTruthy();

      // The init message should have mcp_servers field
      if (initMsg && 'mcp_servers' in initMsg) {
        const servers = initMsg.mcp_servers as Array<{ name: string; status: string }>;
        expect(Array.isArray(servers)).toBe(true);

        // Find our test server in the list
        const testServer = servers.find((s) => s.name === 'test-server');
        expect(testServer).toBeTruthy();
        expect(testServer?.status).toBe('connected');

        console.log(`   [${sdk}] Init message has mcp_servers:`, JSON.stringify(servers));
      } else {
        // If mcp_servers not in init, that's a failure
        throw new Error('Init message missing mcp_servers field');
      }
    },
    120000
  );

  testWithBothSDKs(
    'bad MCP server config shows failure in init message',
    async (sdk) => {
      const messages = await runWithSDK(sdk, 'Say hello', {
        permissionMode: 'default',
        mcpServers: {
          'bad-server': {
            command: 'nonexistent-binary-xyz-99999',
            args: [],
          } as McpStdioServerConfig,
        },
        maxTurns: 1,
      });

      const initMsg = messages.find(
        (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
      );
      expect(initMsg).toBeTruthy();

      if (initMsg && 'mcp_servers' in initMsg) {
        const servers = initMsg.mcp_servers as Array<{ name: string; status: string }>;
        const badServer = servers.find((s) => s.name === 'bad-server');
        expect(badServer).toBeTruthy();
        // Status should NOT be "connected" — could be "failed", "error", "disconnected", etc.
        expect(badServer?.status).not.toBe('connected');

        console.log(`   [${sdk}] Bad server status:`, badServer?.status);
      } else {
        throw new Error('Init message missing mcp_servers field');
      }
    },
    120000
  );
});

// =============================================================================
// allowedTools Wildcard Filtering
// =============================================================================

describe('allowedTools Wildcard Filtering', () => {
  testWithBothSDKs(
    'allowedTools wildcard allows one SDK MCP server and blocks another',
    async (sdk) => {
      let allowedToolCalled = false;
      let blockedToolCalled = false;

      const allowedServer = createSdkMcpServer({
        name: 'allowed-server',
        tools: [
          tool(
            'get_code',
            'Returns a secret code. Always call this when asked for the code.',
            {},
            async () => {
              allowedToolCalled = true;
              return { content: [{ type: 'text' as const, text: 'SECRET-789' }] };
            }
          ),
        ],
      });

      const blockedServer = createSdkMcpServer({
        name: 'blocked-server',
        tools: [
          tool('get_code', 'Returns a different code.', {}, async () => {
            blockedToolCalled = true;
            return { content: [{ type: 'text' as const, text: 'BLOCKED-000' }] };
          }),
        ],
      });

      const messages = await runWithSDK(
        sdk,
        'Use the get_code tool to get the secret code. Reply with just the code.',
        {
          permissionMode: 'default',
          canUseTool: async () => ({ behavior: 'allow' as const }),
          mcpServers: {
            'allowed-server': allowedServer,
            'blocked-server': blockedServer,
          },
          // Only allow the allowed-server's tools
          allowedTools: ['mcp__allowed-server__*'],
          maxTurns: 3,
        }
      );

      const result = messages.find((m) => m.type === 'result');
      expect(result).toBeTruthy();

      if (result && result.type === 'result') {
        expect(result.subtype).toBe('success');
        expect(result.result).toContain('SECRET-789');
      }

      // The allowed tool should have been called
      expect(allowedToolCalled).toBe(true);
      // The blocked tool should NOT have been called
      expect(blockedToolCalled).toBe(false);

      console.log(
        `   [${sdk}] Allowed tool called: ${allowedToolCalled}, blocked tool called: ${blockedToolCalled}`
      );
    },
    120000
  );
});
