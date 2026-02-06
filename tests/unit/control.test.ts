/**
 * Unit tests for ControlProtocolHandler class
 */

import { describe, expect, mock, test } from 'bun:test';
import { Writable } from 'node:stream';
import { ControlProtocolHandler } from '../../src/core/control.ts';
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
        request: { subtype: 'unknown_type' as unknown as ControlRequest['request']['subtype'] },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.type).toBe('control_response');
      expect(response.response.subtype).toBe('error');
      expect(response.response.request_id).toBe('req-123');
      expect(response.response.error).toContain('Unknown request type');
    });
  });

  describe('canUseTool handling', () => {
    test('allows tool use by default when no canUseTool callback', async () => {
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
      expect(response.response.subtype).toBe('success');
      expect(response.response.response.behavior).toBe('allow');
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
    test('continues by default when hook callback not found', async () => {
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
      expect(response.response.subtype).toBe('success');
      expect(response.response.response.continue).toBe(true);
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
      expect(hookFn.mock.calls[0][0]).toEqual({ hook_event_name: 'PreToolUse', data: 'test' });
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

  describe('initialize handling', () => {
    test('acknowledges initialize request', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-init',
        request: {
          subtype: 'initialize',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
      expect(response.response.request_id).toBe('req-init');
    });
  });

  describe('interrupt handling', () => {
    test('acknowledges interrupt request', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-int',
        request: {
          subtype: 'interrupt',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
      expect(response.response.request_id).toBe('req-int');
    });
  });

  describe('SDK-to-CLI request types (passthrough)', () => {
    test('acknowledges set_permission_mode request', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-perm',
        request: {
          subtype: 'set_permission_mode',
          mode: 'acceptEdits',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
    });

    test('acknowledges mcp_status request', async () => {
      const { stream, writes } = createMockStdin();
      const handler = new ControlProtocolHandler(stream, {});

      const req: ControlRequest = {
        type: 'control_request',
        request_id: 'req-mcp',
        request: {
          subtype: 'mcp_status',
        },
      };

      await handler.handleControlRequest(req);

      expect(writes.length).toBe(1);
      const response = JSON.parse(writes[0]);
      expect(response.response.subtype).toBe('success');
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
