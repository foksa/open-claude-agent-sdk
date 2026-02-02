/**
 * Comparison demo server - Bun.serve() with WebSocket
 * Runs both official SDK and lite SDK side-by-side
 */

import index from "./index.html";
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as ourQuery } from '../../src/index.ts';
import type { SDKMessage } from '../../src/types/index.ts';

const PORT = 3000;

console.log('Starting SDK Comparison Demo Server...');

Bun.serve({
  port: PORT,
  async fetch(req, server) {
    // Handle WebSocket upgrade
    if (server.upgrade(req)) {
      return; // Upgraded to WebSocket
    }

    const url = new URL(req.url);

    // Serve client TypeScript (Bun will transpile)
    if (url.pathname === '/client.js') {
      const file = Bun.file('./client.ts');
      const transpiled = await Bun.build({
        entrypoints: ['./client.ts'],
        target: 'browser',
      });

      if (transpiled.outputs.length > 0) {
        return new Response(transpiled.outputs[0], {
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }

    // Serve HTML
    return new Response(Bun.file("./index.html"), {
      headers: { "Content-Type": "text/html" },
    });
  },
  websocket: {
    open(ws) {
      console.log('WebSocket client connected');
    },

    async message(ws, message) {
      try {
        const data = JSON.parse(message as string);
        const { prompt, sdk } = data;

        if (!prompt || !sdk) {
          ws.send(JSON.stringify({
            sdk,
            error: 'Missing prompt or sdk parameter'
          }));
          return;
        }

        console.log(`\n[${sdk.toUpperCase()}] Processing prompt: ${prompt}`);

        // Choose which SDK to use
        const queryFn = sdk === 'official' ? officialQuery : ourQuery;

        try {
          // Stream responses back to client
          for await (const msg of queryFn({
            prompt,
            options: {
              permissionMode: 'bypassPermissions',
              allowDangerouslySkipPermissions: true,
              maxTurns: 3,
            }
          })) {
            // Send message to client
            ws.send(JSON.stringify({
              sdk,
              message: msg
            }));

            // Log to server console
            console.log(`[${sdk.toUpperCase()}] ${msg.type}${msg.subtype ? `:${msg.subtype}` : ''}`);

            // Stop on result
            if (msg.type === 'result') {
              console.log(`[${sdk.toUpperCase()}] Query completed`);
              break;
            }
          }
        } catch (error: any) {
          console.error(`[${sdk.toUpperCase()}] Error:`, error);
          ws.send(JSON.stringify({
            sdk,
            error: error.message || 'Query failed'
          }));
        }
      } catch (error: any) {
        console.error('Failed to process message:', error);
        ws.send(JSON.stringify({
          sdk: 'unknown',
          error: 'Invalid message format'
        }));
      }
    },

    close(ws) {
      console.log('WebSocket client disconnected');
    },

    error(ws, error) {
      console.error('WebSocket error:', error);
    }
  },
  development: {
    hmr: true,
    console: true,
  }
});

console.log(`
🧪 SDK Comparison Demo running at:
   http://localhost:${PORT}

Compare Official SDK vs Lite SDK side-by-side!
`);
