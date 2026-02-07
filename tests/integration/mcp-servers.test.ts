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
import { z } from 'zod';
import { createSdkMcpServer, tool } from '../../src/types/index.ts';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

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
