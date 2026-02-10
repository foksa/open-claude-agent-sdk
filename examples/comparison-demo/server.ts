/**
 * Comparison demo server - Both SDKs using AsyncGenerator pattern
 * Now with 100% API compatibility!
 */

import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as ourQuery } from '../../src/index.ts';
import type { Query, SDKMessage, SDKUserMessage } from '../../src/types/index.ts';
import index from './index.html';

const PORT = 3000;

// Message channel for async iteration
class MessageChannel {
  private queue: SDKUserMessage[] = [];
  private resolvers: Array<(value: IteratorResult<SDKUserMessage>) => void> = [];
  private done = false;

  push(msg: SDKUserMessage) {
    if (this.resolvers.length > 0) {
      const resolve = this.resolvers.shift()!;
      resolve({ value: msg, done: false });
    } else {
      this.queue.push(msg);
    }
  }

  close() {
    this.done = true;
    for (const resolve of this.resolvers) {
      resolve({ value: undefined as any, done: true });
    }
    this.resolvers = [];
  }

  async *[Symbol.asyncIterator](): AsyncIterator<SDKUserMessage> {
    while (!this.done || this.queue.length > 0) {
      if (this.queue.length > 0) {
        yield this.queue.shift()!;
      } else if (!this.done) {
        const result = await new Promise<IteratorResult<SDKUserMessage>>((resolve) => {
          this.resolvers.push(resolve);
        });
        if (result.done) return;
        yield result.value;
      }
    }
  }
}

// Store channels for multi-turn
const messageChannels = new Map<string, MessageChannel>();

console.log('Starting SDK Comparison Demo Server (AsyncGenerator pattern)...');

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
      const transpiled = await Bun.build({
        entrypoints: ['./client.ts'],
        target: 'browser',
      });

      if (transpiled.outputs.length > 0) {
        return new Response(transpiled.outputs[0], {
          headers: { 'Content-Type': 'application/javascript' },
        });
      }
    }

    // Serve HTML
    return new Response(Bun.file('./index.html'), {
      headers: { 'Content-Type': 'text/html' },
    });
  },
  websocket: {
    open(ws) {
      console.log('WebSocket client connected');
    },

    async message(ws, message) {
      try {
        const data = JSON.parse(message as string);
        const { prompt, sdk, continue: isContinue, sessionId } = data;

        if (!prompt || !sdk) {
          ws.send(
            JSON.stringify({
              sdk,
              error: 'Missing prompt or sdk parameter',
            })
          );
          return;
        }

        const channelKey = sdk;

        // Handle continuation
        if (isContinue && sessionId) {
          console.log(`\n[${sdk.toUpperCase()}] Continuing: ${prompt}`);

          const channel = messageChannels.get(channelKey);
          if (!channel) {
            ws.send(
              JSON.stringify({
                sdk,
                error: 'No active query. Please start a new query first.',
              })
            );
            return;
          }

          // Push follow-up message to channel
          channel.push({
            type: 'user',
            message: {
              role: 'user',
              content: prompt,
            },
            session_id: sessionId,
            parent_tool_use_id: null,
          });

          console.log(`[${sdk.toUpperCase()}] Message pushed to channel`);
          return;
        }

        // Start new query
        console.log(`\n[${sdk.toUpperCase()}] Starting: ${prompt}`);

        // Clean up existing channel
        const existing = messageChannels.get(channelKey);
        if (existing) {
          existing.close();
          messageChannels.delete(channelKey);
        }

        // Create new message channel
        const channel = new MessageChannel();
        messageChannels.set(channelKey, channel);

        // Push initial message
        channel.push({
          type: 'user',
          message: {
            role: 'user',
            content: prompt,
          },
          session_id: '',
          parent_tool_use_id: null,
        });

        // Choose SDK
        const queryFn = sdk === 'official' ? officialQuery : ourQuery;

        // Start query with AsyncGenerator
        (async () => {
          try {
            const q = queryFn({
              prompt: channel[Symbol.asyncIterator](),
              options: {
                permissionMode: 'bypassPermissions',
                allowDangerouslySkipPermissions: true,
                maxTurns: 20,
              },
            });

            // Stream responses
            for await (const msg of q) {
              ws.send(
                JSON.stringify({
                  sdk,
                  message: msg,
                })
              );

              console.log(
                `[${sdk.toUpperCase()}] ${msg.type}${msg.subtype ? `:${msg.subtype}` : ''}`
              );

              if (msg.type === 'result') {
                console.log(`[${sdk.toUpperCase()}] Result received (waiting for more input...)`);
              }
            }

            // Query ended
            console.log(`[${sdk.toUpperCase()}] Query ended`);
            messageChannels.delete(channelKey);
          } catch (error: any) {
            console.error(`[${sdk.toUpperCase()}] Query error:`, error);
            ws.send(
              JSON.stringify({
                sdk,
                error: error.message || 'Query failed',
              })
            );
            messageChannels.delete(channelKey);
          }
        })();
      } catch (error: any) {
        console.error('Message parsing error:', error);
        ws.send(
          JSON.stringify({
            sdk: 'unknown',
            error: 'Invalid message format',
          })
        );
      }
    },

    close(ws) {
      console.log('WebSocket client disconnected');
      // Clean up channels
      for (const [key, channel] of messageChannels.entries()) {
        channel.close();
      }
      messageChannels.clear();
    },

    error(ws, error) {
      console.error('WebSocket error:', error);
    },
  },
  development: {
    hmr: true,
    console: true,
  },
});

console.log(`
🧪 SDK Comparison Demo running at:
   http://localhost:${PORT}

Compare Official SDK vs Open SDK side-by-side!
✨ Both use AsyncGenerator pattern (100% API compatible!)
`);
