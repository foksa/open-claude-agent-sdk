/**
 * Comparison demo server - FIXED for proper multi-turn
 *
 * Key insight: ONE query loop per SDK that handles all messages
 */

import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as ourQuery } from '../../src/index.ts';
import type { Query, SDKMessage, SDKUserMessage } from '../../src/types/index.ts';
import index from './index.html';

const PORT = 3000;

// Store active query loops
const activeQueryLoops = new Map<
  string,
  {
    query: Query;
    sessionId: string;
  }
>();

console.log('Starting SDK Comparison Demo Server (FIXED)...');

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

        const queryKey = sdk;

        // Handle continuation
        if (isContinue && sessionId) {
          console.log(`\n[${sdk.toUpperCase()}] Continuing: ${prompt}`);

          const activeLoop = activeQueryLoops.get(queryKey);
          if (!activeLoop) {
            ws.send(
              JSON.stringify({
                sdk,
                error: 'No active query. Please start a new query first.',
              })
            );
            return;
          }

          try {
            // Send follow-up via streamInput
            const followUp: SDKUserMessage = {
              type: 'user',
              message: {
                role: 'user',
                content: prompt,
              },
              session_id: sessionId,
              parent_tool_use_id: null,
            };

            await activeLoop.query.streamInput([followUp]);
            console.log(`[${sdk.toUpperCase()}] Follow-up sent, query loop will continue...`);
          } catch (error: any) {
            console.error(`[${sdk.toUpperCase()}] streamInput error:`, error);
            ws.send(
              JSON.stringify({
                sdk,
                error: error.message || 'Failed to continue',
              })
            );
          }

          return;
        }

        // Start new query
        console.log(`\n[${sdk.toUpperCase()}] Starting: ${prompt}`);

        // Clean up any existing query
        const existing = activeQueryLoops.get(queryKey);
        if (existing) {
          existing.query.close();
          activeQueryLoops.delete(queryKey);
        }

        const queryFn = sdk === 'official' ? officialQuery : ourQuery;

        try {
          const q = queryFn({
            prompt,
            options: {
              permissionMode: 'bypassPermissions',
              allowDangerouslySkipPermissions: true,
              maxTurns: 20,
            },
          });

          // Start query loop in background
          (async () => {
            let currentSessionId = '';

            try {
              for await (const msg of q) {
                // Track session ID
                if (msg.type === 'system' && msg.session_id) {
                  currentSessionId = msg.session_id;
                  // Update stored session ID
                  const loop = activeQueryLoops.get(queryKey);
                  if (loop) {
                    loop.sessionId = currentSessionId;
                  }
                }

                // Send message to client
                ws.send(
                  JSON.stringify({
                    sdk,
                    message: msg,
                  })
                );

                console.log(
                  `[${sdk.toUpperCase()}] ${msg.type}${msg.subtype ? `:${msg.subtype}` : ''}`
                );

                // DON'T break on result - keep loop running for multi-turn!
                if (msg.type === 'result') {
                  console.log(`[${sdk.toUpperCase()}] Result received (loop continues)...`);
                }
              }

              // Loop ended - query closed
              console.log(`[${sdk.toUpperCase()}] Query loop ended`);
              activeQueryLoops.delete(queryKey);
            } catch (error: any) {
              console.error(`[${sdk.toUpperCase()}] Query loop error:`, error);
              ws.send(
                JSON.stringify({
                  sdk,
                  error: error.message || 'Query failed',
                })
              );
              activeQueryLoops.delete(queryKey);
            }
          })();

          // Store query reference for streamInput
          activeQueryLoops.set(queryKey, {
            query: q,
            sessionId: '',
          });
        } catch (error: any) {
          console.error(`[${sdk.toUpperCase()}] Start error:`, error);
          ws.send(
            JSON.stringify({
              sdk,
              error: error.message || 'Failed to start query',
            })
          );
        }
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
      // Clean up all queries
      for (const [key, loop] of activeQueryLoops.entries()) {
        loop.query.close();
      }
      activeQueryLoops.clear();
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

Compare Official SDK vs Lite SDK side-by-side!
✨ Multi-Turn Conversations Working! (Both SDKs)
`);
