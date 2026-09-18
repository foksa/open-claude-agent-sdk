/**
 * Unit tests for ControlProtocolHandler class
 */

import { describe, expect, mock, test } from 'bun:test';
import { Writable } from 'node:stream';
import { ControlProtocolHandler, ControlRequests } from '../../src/core/control.ts';
import type { ControlRequest } from '../../src/types/control.ts';

// Helper to create a mock writable stream that captures writes
function createMockStdin(): { stream: Writable; writes: string[] } {
  const writes: string[] = [];
  const stream = new Writable({
    write(chunk, _encoding, callback) {
      writes.push(chunk.toString());
      callback();
    },
  });
  return { stream, writes };
}

describe('ControlProtocolHandler', () => {
  describe('unknown request types', () => {
    test('sends error for unknown request type', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-123',
        request: {
          subtype: 'unknown_type' as unknown as ControlRequest['request']['subtype'],
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.type).toBe('control_response');
      expect(response.response.subtype).toBe('error');
      expect(response.response.request_id).toBe('req-123');
      expect(response.response.error).toBe('Unsupported control request subtype: unknown_type');
    });
  });

  describe('canUseTool handling', () => {
    test('errors when no canUseTool callback is registered (never auto-allows)', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-123',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Read',
          input: { file_path: '/test' },
          tool_use_id: 'tu-123',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.type).toBe('control_response');
      expect(response.response.subtype).toBe('error');
      expect(response.response.error).toBe('canUseTool callback is not provided.');
    });

    test('calls canUseTool callback when provided', async () => {
      const { stream, writes } = createMockStdin();
      const canUseTool = mock(
        async (
          _toolName: string,
          _input: Record<string, unknown>,
          _context: Record<string, unknown>
        ) => {
          return { behavior: 'deny' as const, message: 'Not allowed' };
        }
      );
      const handler = new ControlProtocolHandler(stream, { canUseTool });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-456',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Bash',
          input: { command: 'rm -rf /' },
          tool_use_id: 'tu-456',
        },
      };

      await handler.handleControlRequest(req);

      expect(canUseTool).toHaveBeenCalledTimes(1);
      expect(canUseTool.mock.calls[0][0]).toBe('Bash');
      expect(canUseTool.mock.calls[0][1]).toEqual({ command: 'rm -rf /' });

      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
      expect(response.response.response.behavior).toBe('deny');
      expect(response.response.response.message).toBe('Not allowed');
    });

    test('passes requestId matching the control envelope request_id', async () => {
      const { stream } = createMockStdin();
      const canUseTool = mock(
        async (
          _toolName: string,
          _input: Record<string, unknown>,
          _context: Record<string, unknown>
        ) => {
          return { behavior: 'allow' as const };
        }
      );
      const handler = new ControlProtocolHandler(stream, { canUseTool });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-999',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Read',
          input: { file_path: '/test' },
          tool_use_id: 'tu-999',
        },
      };

      await handler.handleControlRequest(req);

      expect(canUseTool.mock.calls[0][2]).toMatchObject({ requestId: 'req-999' });
    });

    test('forwards defaultToNo and suppressAlwaysAllowRule hints (v0.3.268)', async () => {
      const { stream } = createMockStdin();
      const canUseTool = mock(
        async (
          _toolName: string,
          _input: Record<string, unknown>,
          _context: Record<string, unknown>
        ) => {
          return { behavior: 'allow' as const };
        }
      );
      const handler = new ControlProtocolHandler(stream, { canUseTool });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-hints',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Bash',
          input: { command: 'rm -rf /' },
          tool_use_id: 'tu-hints',
          default_to_no: true,
          suppress_always_allow_rule: true,
        },
      };

      await handler.handleControlRequest(req);

      expect(canUseTool.mock.calls[0][2]).toMatchObject({
        defaultToNo: true,
        suppressAlwaysAllowRule: true,
      });
    });

    test('forwards mcpServer, matchedAskRule and prompt display fields (v0.3.276)', async () => {
      const { stream } = createMockStdin();
      const canUseTool = mock(
        async (
          _toolName: string,
          _input: Record<string, unknown>,
          _context: Record<string, unknown>
        ) => {
          return { behavior: 'allow' as const };
        }
      );
      const handler = new ControlProtocolHandler(stream, { canUseTool });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-mcp',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'mcp__my-server__do_thing',
          input: {},
          tool_use_id: 'tu-mcp',
          title: 'Claude wants to do a thing',
          display_name: 'Do thing',
          description: 'Does the thing',
          mcp_server: { name: 'my-server', source: 'sdk' },
          matched_ask_rule: { source: 'userSettings', tool_name: 'mcp__my-server__do_thing' },
        },
      };

      await handler.handleControlRequest(req);

      const context = canUseTool.mock.calls[0][2];
      expect(context).toMatchObject({
        title: 'Claude wants to do a thing',
        displayName: 'Do thing',
        description: 'Does the thing',
        mcpServer: { name: 'my-server', source: 'sdk' },
        matchedAskRule: { source: 'userSettings', toolName: 'mcp__my-server__do_thing' },
      });
      expect(context.matchedAskRule).not.toHaveProperty('ruleContent');
    });

    test('omits mcpServer for non-MCP tools', async () => {
      const { stream } = createMockStdin();
      const canUseTool = mock(
        async (
          _toolName: string,
          _input: Record<string, unknown>,
          _context: Record<string, unknown>
        ) => {
          return { behavior: 'allow' as const };
        }
      );
      const handler = new ControlProtocolHandler(stream, { canUseTool });

      await handler.handleControlRequest({
        type: 'control_request',
        request_id: 'req-plain',
        request: { subtype: 'can_use_tool', tool_name: 'Read', input: {}, tool_use_id: 'tu-plain' },
      });

      expect(canUseTool.mock.calls[0][2]).not.toHaveProperty('mcpServer');
      expect(canUseTool.mock.calls[0][2]).not.toHaveProperty('matchedAskRule');
    });

    test('echoes toolUseID in the permission response', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {
        canUseTool: async () => ({ behavior: 'allow' as const }),
      });

      await handler.handleControlRequest({
        type: 'control_request',
        request_id: 'req-echo',
        request: { subtype: 'can_use_tool', tool_name: 'Read', input: {}, tool_use_id: 'tu-echo' },
      });

      const response = JSON.parse(writes[0]);
      expect(response.response.response).toEqual({ behavior: 'allow', toolUseID: 'tu-echo' });
    });

    test('suppresses the control response when callback returns null', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {
        canUseTool: async () => null,
      });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-000',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Read',
          input: { file_path: '/test' },
          tool_use_id: 'tu-000',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(0);
    });

    test('sends error when canUseTool callback throws', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {
        canUseTool: async () => {
          throw new Error('Permission check failed');
        },
      });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-789',
        request: {
          subtype: 'can_use_tool',
          tool_name: 'Write',
          input: { file_path: '/test', content: 'hi' },
          tool_use_id: 'tu-789',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('error');
      expect(response.response.error).toContain('Permission check failed');
    });
  });

  describe('hook_callback handling', () => {
    test('errors when the hook callback id is unknown', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-123',
        request: {
          subtype: 'hook_callback',
          callback_id: 'nonexistent_hook',
          input: { hook_event_name: 'PreToolUse' },
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('error');
      expect(response.response.error).toBe('No hook callback found for ID: nonexistent_hook');
    });

    test('executes registered hook and returns result', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const hookFn = mock(async (input: Record<string, unknown>) => {
        return { modified: true, original: input };
      });
      handler.registerCallback('my_hook', hookFn);

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-456',
        request: {
          subtype: 'hook_callback',
          callback_id: 'my_hook',
          input: { hook_event_name: 'PreToolUse', data: 'test' },
          tool_use_id: 'tu-456',
        },
      };

      await handler.handleControlRequest(req);

      expect(hookFn).toHaveBeenCalledTimes(1);
      expect(hookFn.mock.calls[0][0]).toEqual({
        hook_event_name: 'PreToolUse',
        data: 'test',
      });
      expect(hookFn.mock.calls[0][1]).toBe('tu-456');

      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
      expect(response.response.response.modified).toBe(true);
    });

    test('sends error when hook throws', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      handler.registerCallback('error_hook', async () => {
        throw new Error('Hook failed');
      });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-789',
        request: {
          subtype: 'hook_callback',
          callback_id: 'error_hook',
          input: { hook_event_name: 'PreToolUse' },
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('error');
      expect(response.response.error).toContain('Hook failed');
    });
  });

  describe('elicitation handling', () => {
    test('declines by default when no onElicitation callback', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-elicit-1',
        request: {
          subtype: 'elicitation',
          mcp_server_name: 'my-server',
          message: 'Please provide input',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
      expect(response.response.response.action).toBe('decline');
    });

    test('passes requestId matching the control envelope request_id', async () => {
      const { stream } = createMockStdin();
      const onElicitation = mock(async () => ({ action: 'accept' as const }));
      const handler = new ControlProtocolHandler(stream, { onElicitation });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-elicit-2',
        request: {
          subtype: 'elicitation',
          mcp_server_name: 'my-server',
          message: 'Please provide input',
        },
      };

      await handler.handleControlRequest(req);

      expect(onElicitation.mock.calls[0][1]).toMatchObject({ requestId: 'req-elicit-2' });
    });

    test('suppresses the control response when callback returns null', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {
        onElicitation: async () => null,
      });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-elicit-3',
        request: {
          subtype: 'elicitation',
          mcp_server_name: 'my-server',
          message: 'Please provide input',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(0);
    });
  });

  describe('request_user_dialog handling', () => {
    test('stays silent when no onUserDialog callback (matches official)', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-dialog-1',
        request: {
          subtype: 'request_user_dialog',
          dialog_kind: 'refusal_fallback_prompt',
          payload: {},
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(0);
    });

    test('passes requestId matching the control envelope request_id', async () => {
      const { stream } = createMockStdin();
      const onUserDialog = mock(async () => ({ behavior: 'cancelled' as const }));
      const handler = new ControlProtocolHandler(stream, { onUserDialog });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-dialog-2',
        request: {
          subtype: 'request_user_dialog',
          dialog_kind: 'refusal_fallback_prompt',
          payload: {},
        },
      };

      await handler.handleControlRequest(req);

      expect(onUserDialog.mock.calls[0][1]).toMatchObject({ requestId: 'req-dialog-2' });
    });

    test('suppresses the control response when callback returns null', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {
        onUserDialog: async () => null,
      });

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-dialog-3',
        request: {
          subtype: 'request_user_dialog',
          dialog_kind: 'refusal_fallback_prompt',
          payload: {},
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(0);
    });
  });

  describe('SDK-to-CLI request types sent by the CLI', () => {
    for (const request of [
      { subtype: 'initialize' },
      { subtype: 'interrupt' },
      { subtype: 'set_permission_mode', mode: 'acceptEdits' },
      { subtype: 'stop_task', task_id: 'task-abc-123' },
      { subtype: 'mcp_status' },
    ]) {
      test(`answers ${request.subtype} with an unsupported-subtype error (matches official)`, async () => {
        const { stream, writes } = createMockStdin();
        const handler = new ControlProtocolHandler(stream, {});
        await handler.handleControlRequest({
          type: 'control_request',
          request_id: 'req-x',
          request: request as unknown as ControlRequest['request'],
        });
        expect(writes.length).toBe(1);
        const response = JSON.parse(writes[0]);
        expect(response.response.subtype).toBe('error');
        expect(response.response.error).toBe(
          `Unsupported control request subtype: ${request.subtype}`
        );
      });
    }
  });

  describe('cancellation and lifecycle', () => {
    const canUseToolRequest = (id: string): ControlRequest => ({
      type: 'control_request',
      request_id: id,
      request: { subtype: 'can_use_tool', tool_name: 'Bash', input: {}, tool_use_id: `tu-${id}` },
    });

    test('control_cancel_request aborts the signal passed to the callback', async () => {
      const { stream } = createMockStdin();
      let seenSignal: AbortSignal | undefined;
      let release: () => void = () => {};
      const handler = new ControlProtocolHandler(stream, {
        canUseTool: async (_name, _input, { signal }) => {
          seenSignal = signal;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return { behavior: 'deny', message: 'cancelled' };
        },
      });
      const pending = handler.handleControlRequest(canUseToolRequest('req-c1'));
      await Promise.resolve();
      expect(seenSignal?.aborted).toBe(false);
      handler.cancelRequest('req-c1');
      expect(seenSignal?.aborted).toBe(true);
      release();
      await pending;
    });

    test('duplicate delivery of an in-flight request invokes the callback once', async () => {
      const { stream, writes } = createMockStdin();
      let calls = 0;
      let release: () => void = () => {};
      const handler = new ControlProtocolHandler(stream, {
        canUseTool: async () => {
          calls++;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return { behavior: 'allow' };
        },
      });
      const first = handler.handleControlRequest(canUseToolRequest('req-dup'));
      await handler.handleControlRequest(canUseToolRequest('req-dup'));
      release();
      await first;
      expect(calls).toBe(1);
      expect(writes.length).toBe(1);
    });

    test('after close(), late callback results are not written and signals are aborted', async () => {
      const { stream, writes } = createMockStdin();
      let seenSignal: AbortSignal | undefined;
      let release: () => void = () => {};
      const handler = new ControlProtocolHandler(stream, {
        canUseTool: async (_name, _input, { signal }) => {
          seenSignal = signal;
          await new Promise<void>((resolve) => {
            release = resolve;
          });
          return { behavior: 'allow' };
        },
      });
      const pending = handler.handleControlRequest(canUseToolRequest('req-late'));
      await Promise.resolve();
      handler.close();
      expect(seenSignal?.aborted).toBe(true);
      release();
      await pending;
      expect(writes.length).toBe(0);
    });

    test('hook callbacks receive a live, cancellable signal', async () => {
      const { stream } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});
      let seenSignal: AbortSignal | undefined;
      handler.registerCallback('hook_0', async (_input, _id, { signal }) => {
        seenSignal = signal;
        return {};
      });
      await handler.handleControlRequest({
        type: 'control_request',
        request_id: 'req-hook',
        request: { subtype: 'hook_callback', callback_id: 'hook_0', input: {} as never },
      });
      expect(seenSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('registerCallback', () => {
    test('registers callback that can be invoked later', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const callback = mock(async () => ({ result: 'success' }));
      handler.registerCallback('test_callback', callback);

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-test',
        request: {
          subtype: 'hook_callback',
          callback_id: 'test_callback',
          input: {},
        },
      };

      await handler.handleControlRequest(req);

      expect(callback).toHaveBeenCalledTimes(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.response.result).toBe('success');
    });

    test('overwrites existing callback with same id', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const callback1 = mock(async () => ({ from: 'first' }));
      const callback2 = mock(async () => ({ from: 'second' }));

      handler.registerCallback('cb', callback1);
      handler.registerCallback('cb', callback2);

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-test',
        request: {
          subtype: 'hook_callback',
          callback_id: 'cb',
          input: {},
        },
      };

      await handler.handleControlRequest(req);

      expect(callback1).not.toHaveBeenCalled();
      expect(callback2).toHaveBeenCalledTimes(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.response.from).toBe('second');
    });
  });
});

describe('ControlRequests builders', () => {
  test('stopTask builds correct wire format', () => {
    const req = ControlRequests.stopTask('task-abc-123');
    expect(req).toEqual({
      subtype: 'stop_task',
      task_id: 'task-abc-123',
    });
  });

  test('interrupt builds correct wire format', () => {
    const req = ControlRequests.interrupt();
    expect(req).toEqual({ subtype: 'interrupt' });
  });

  test('setPermissionMode builds correct wire format', () => {
    const req = ControlRequests.setPermissionMode('delegate');
    expect(req).toEqual({
      subtype: 'set_permission_mode',
      mode: 'delegate',
    });
  });
});
