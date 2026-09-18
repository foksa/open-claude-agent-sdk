/**
 * Message router for stdout processing
 *
 * Reads NDJSON from stdout and routes messages:
 * - control_request → controlHandler (dispatched, not awaited)
 * - control_cancel_request → aborts the matching in-flight request
 * - control_response → onControlResponse (internal protocol)
 * - keep_alive / transcript_mirror → dropped
 * - regular messages → onMessage callback
 *
 * @internal
 */

import { createInterface, type Interface } from 'node:readline';
import type { Readable } from 'node:stream';
import type { ControlProtocolHandler } from '../core/control.ts';
import { MessageType, type StdoutMessage } from '../types/control.ts';
import type { SDKMessage } from '../types/index.ts';

export type MessageCallback = (msg: SDKMessage) => void;
export type DoneCallback = (error?: Error) => void;
export type ControlResponsePayload = {
  subtype: string;
  request_id: string;
  response?: Record<string, unknown>;
  error?: string;
};
export type ControlResponseCallback = (response: ControlResponsePayload) => void;

type RawMessage =
  | StdoutMessage
  | { type: typeof MessageType.CONTROL_RESPONSE; response: ControlResponsePayload }
  | { type: typeof MessageType.CONTROL_CANCEL_REQUEST; request_id: string }
  | { type: typeof MessageType.KEEP_ALIVE }
  | { type: typeof MessageType.TRANSCRIPT_MIRROR };

export class MessageRouter {
  private readline: Interface | null = null;

  constructor(
    private stdout: Readable,
    private controlHandler: ControlProtocolHandler,
    private onMessage: MessageCallback,
    private onDone: DoneCallback,
    private onControlResponse?: ControlResponseCallback
  ) {}

  /**
   * Start reading from stdout and routing messages
   * This runs in the background until the stream ends
   */
  async startReading(): Promise<void> {
    try {
      this.readline = createInterface({
        input: this.stdout,
        crlfDelay: Infinity,
      });

      for await (const line of this.readline) {
        if (!line.trim()) continue;

        // Debug: log raw line
        if (process.env.DEBUG_HOOKS) {
          console.error('[DEBUG] Raw line:', line.substring(0, 200));
        }

        try {
          const msg = JSON.parse(line) as RawMessage;

          // Debug: log message type
          if (process.env.DEBUG_HOOKS) {
            console.error('[DEBUG] Message type:', msg.type);
          }

          if (msg.type === MessageType.CONTROL_REQUEST) {
            // Not awaited: a callback (canUseTool, hook, MCP tool) may itself
            // send a control request whose response arrives on this stream
            void this.controlHandler.handleControlRequest(msg);
          } else if (msg.type === MessageType.CONTROL_CANCEL_REQUEST) {
            this.controlHandler.cancelRequest(msg.request_id);
          } else if (msg.type === MessageType.CONTROL_RESPONSE) {
            if (this.onControlResponse) {
              this.onControlResponse(msg.response);
            }
          } else if (
            msg.type === MessageType.KEEP_ALIVE ||
            msg.type === MessageType.TRANSCRIPT_MIRROR
          ) {
            // Transport-level frames; sessionStore mirroring is not supported
          } else {
            // Regular message - pass to callback
            this.onMessage(msg as SDKMessage);
          }
        } catch (parseError) {
          // Log but don't crash on parse errors
          const errMsg = parseError instanceof Error ? parseError.message : String(parseError);
          console.error('Failed to parse line:', line.substring(0, 200), '-', errMsg);
        }
      }
    } catch (err: unknown) {
      this.onDone(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    // Stream ended normally
    this.onDone();
  }

  /**
   * Close the readline interface
   */
  close(): void {
    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }
  }
}
