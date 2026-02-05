/**
 * Message router for stdout processing
 *
 * Reads NDJSON from stdout and routes messages:
 * - control_request → controlHandler
 * - control_response → filtered (internal protocol)
 * - regular messages → onMessage callback
 *
 * @internal
 */

import { createInterface, type Interface } from 'node:readline';
import type { Readable } from 'node:stream';
import type { ControlProtocolHandler } from '../core/control.ts';
import type { StdoutMessage } from '../types/control.ts';
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

type RawMessage = StdoutMessage | { type: 'control_response'; response: ControlResponsePayload };

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

          if (msg.type === 'control_request') {
            if (process.env.DEBUG_HOOKS) {
              console.error('[DEBUG] !!! CONTROL REQUEST !!!:', msg.request?.subtype);
            }
            // Handle control request internally (don't yield to user)
            await this.controlHandler.handleControlRequest(msg);
          } else if (msg.type === 'control_response') {
            // Route control_response to callback if provided, otherwise filter silently
            if (process.env.DEBUG_HOOKS) {
              console.error('[DEBUG] control_response received');
            }
            if (this.onControlResponse) {
              this.onControlResponse(msg.response);
            }
          } else {
            // Regular message - pass to callback
            this.onMessage(msg as SDKMessage);
          }
        } catch (parseError) {
          // Log but don't crash on parse errors
          console.error('Failed to parse line:', line, parseError);
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
