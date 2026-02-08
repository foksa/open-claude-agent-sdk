#!/usr/bin/env node
/**
 * Minimal MCP server for testing control methods (toggle, reconnect).
 * Speaks JSON-RPC 2.0 over stdio, implements only initialize + tools/list.
 */
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin });

rl.on('line', (line) => {
  try {
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'test-mcp-server', version: '1.0.0' },
        },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (msg.method === 'notifications/initialized') {
      // No response needed for notifications
    } else if (msg.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          tools: [
            {
              name: 'ping',
              description: 'Returns pong',
              inputSchema: { type: 'object', properties: {} },
            },
          ],
        },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (msg.method === 'tools/call') {
      const response = {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          content: [{ type: 'text', text: 'pong' }],
        },
      };
      process.stdout.write(JSON.stringify(response) + '\n');
    } else if (msg.id != null) {
      // Unknown method with id — send error
      process.stdout.write(
        JSON.stringify({
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32601, message: 'Method not found' },
        }) + '\n'
      );
    }
  } catch {}
});
