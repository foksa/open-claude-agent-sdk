/**
 * In-process MCP server bridge and helpers: server-initiated messages reach
 * the CLI, and tool()/createSdkMcpServer() carry the same metadata as the
 * official SDK's versions.
 */

import { describe, expect, test } from 'bun:test';
import { Writable } from 'node:stream';
import {
  createSdkMcpServer as officialCreateSdkMcpServer,
  tool as officialTool,
} from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import { ControlProtocolHandler } from '../../src/core/control.ts';
import { connectMcpBridges, McpServerBridge } from '../../src/core/mcpBridge.ts';
import { createSdkMcpServer, tool } from '../../src/mcp.ts';

function capturingStdin() {
  const writes: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      writes.push(JSON.parse(chunk.toString()));
      cb();
    },
  });
  return { stream, writes };
}

const ping = tool('ping', 'Ping', {}, async () => ({ content: [{ type: 'text', text: 'pong' }] }));

describe('McpServerBridge', () => {
  test('forwards server-initiated notifications to the CLI as mcp_message requests', async () => {
    const { stream, writes } = capturingStdin();
    const handler = new ControlProtocolHandler(stream, {});
    const server = createSdkMcpServer({ name: 'live', tools: [ping] });
    connectMcpBridges({ mcpServers: { live: server } }, handler);
    await new Promise((resolve) => setTimeout(resolve, 10));

    server.instance.sendToolListChanged();
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(writes).toHaveLength(1);
    expect(writes[0]).toMatchObject({
      type: 'control_request',
      request: {
        subtype: 'mcp_message',
        server_name: 'live',
        message: { method: 'notifications/tools/list_changed', jsonrpc: '2.0' },
      },
    });
  });

  test('responses to CLI requests resolve the pending mcp_message instead of being forwarded', async () => {
    const forwarded: unknown[] = [];
    const server = createSdkMcpServer({ name: 'rpc', tools: [ping] });
    const bridge = new McpServerBridge(server.instance, (m) => forwarded.push(m));
    await bridge.connect();
    const response = await bridge.handleMessage({
      jsonrpc: '2.0',
      id: 7,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 't', version: '1' },
      },
    });
    expect(response).toMatchObject({ jsonrpc: '2.0', id: 7 });
    expect(forwarded).toEqual([]);
  });

  test('close() answers requests still in flight instead of hanging the CLI', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const slow = tool('slow', 'Slow', {}, async () => {
      await gate;
      return { content: [{ type: 'text' as const, text: 'done' }] };
    });
    const server = createSdkMcpServer({ name: 'slow', tools: [slow] });
    const bridge = new McpServerBridge(server.instance, () => {});
    await bridge.connect();
    await bridge.handleMessage({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 't', version: '1' },
      },
    });
    bridge.handleMessage({ jsonrpc: '2.0', method: 'notifications/initialized' });

    const inFlight = bridge.handleMessage({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: { name: 'slow', arguments: {} },
    });
    await new Promise((resolve) => setTimeout(resolve, 20));

    // The CLI must get an answer even though the handler is still running
    await bridge.close();
    const answered = await Promise.race([
      inFlight,
      new Promise((resolve) => setTimeout(() => resolve('TIMED OUT'), 1000)),
    ]);
    expect(answered).toMatchObject({ jsonrpc: '2.0', id: 2, error: { code: -32000 } });
    release();
  });

  test('close() disconnects the server; later sends fail', async () => {
    const server = createSdkMcpServer({ name: 'closing', tools: [ping] });
    const bridge = new McpServerBridge(server.instance, () => {});
    await bridge.connect();
    await bridge.close();
    await expect(
      server.instance.server.notification({ method: 'notifications/tools/list_changed' })
    ).rejects.toThrow();
  });
});

describe('tool() / createSdkMcpServer() metadata parity', () => {
  test('tool() puts searchHint/alwaysLoad in _meta like official', () => {
    const handler = async () => ({ content: [] });
    const extras = {
      annotations: { readOnlyHint: true },
      searchHint: 'find users',
      alwaysLoad: true,
    };
    const ours = tool('lookup', 'Look up', { id: z.string() }, handler, extras);
    const theirs = officialTool('lookup', 'Look up', { id: z.string() }, handler, extras);
    const shape = (t: typeof ours) => ({
      name: t.name,
      annotations: t.annotations,
      _meta: t._meta,
    });
    expect(shape(ours)).toEqual(shape(theirs as typeof ours));
    expect(ours._meta).toEqual({
      'anthropic/searchHint': 'find users',
      'anthropic/alwaysLoad': true,
    });
    expect('searchHint' in ours).toBe(false);
  });

  test('tool() without extras has no _meta like official', () => {
    const handler = async () => ({ content: [] });
    const ours = tool('plain', 'Plain', {}, handler);
    const theirs = officialTool('plain', 'Plain', {}, handler);
    expect(ours._meta).toBe(theirs._meta);
    expect(ours._meta).toBeUndefined();
  });

  test('createSdkMcpServer passes instructions and alwaysLoad through like official', async () => {
    const options = {
      name: 'meta',
      instructions: 'Use me wisely',
      alwaysLoad: true,
      tools: [ping],
    };
    const ours = createSdkMcpServer(options);
    const theirs = officialCreateSdkMcpServer(options as never);

    const listTools = async (instance: unknown) => {
      const bridge = new McpServerBridge(instance as never, () => {});
      await bridge.connect();
      const init = (await bridge.handleMessage({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 't', version: '1' },
        },
      })) as { result: { instructions?: string } };
      const tools = (await bridge.handleMessage({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
      })) as {
        result: { tools: { name: string; _meta?: unknown }[] };
      };
      return {
        instructions: init.result.instructions,
        tools: tools.result.tools.map((t) => ({ name: t.name, _meta: t._meta })),
      };
    };

    const [oursListed, theirsListed] = [
      await listTools(ours.instance),
      await listTools(theirs.instance),
    ];
    expect(oursListed).toEqual({
      instructions: 'Use me wisely',
      tools: [{ name: 'ping', _meta: { 'anthropic/alwaysLoad': true } }],
    });
    expect(oursListed).toEqual(theirsListed);
  });
});
