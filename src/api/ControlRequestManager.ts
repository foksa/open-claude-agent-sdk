/**
 * Control request/response correlation manager
 *
 * Handles sending control requests to CLI stdin and correlating
 * responses back to waiting promises. Manages the init handshake
 * and all subsequent request/response pairs.
 *
 * @internal
 */

import type { Writable } from 'node:stream';
import type { OutboundControlRequest } from '../core/control.ts';
import { MessageType, ResponseSubtype } from '../types/control.ts';
import type { SDKControlInitializeResponse } from '../types/index.ts';
import type { ControlResponsePayload } from './MessageRouter.ts';

export class ControlRequestManager {
  private closed = false;
  private pendingResponses = new Map<
    string,
    // biome-ignore lint/suspicious/noExplicitAny: response shape varies by request type
    { resolve: (value: any) => void; reject: (reason: Error) => void }
  >();

  private initResolve!: (value: SDKControlInitializeResponse) => void;
  private initReject!: (reason: Error) => void;
  private initResponsePromise: Promise<SDKControlInitializeResponse>;
  private _initRequestId = '';

  constructor(private stdin: Writable | null) {
    this.initResponsePromise = new Promise<SDKControlInitializeResponse>((resolve, reject) => {
      this.initResolve = resolve;
      this.initReject = reject;
    });
    // Prevent unhandled rejection if rejectAll() is called before anyone awaits
    this.initResponsePromise.catch(() => {});
  }

  get initRequestId(): string {
    return this._initRequestId;
  }

  set initRequestId(id: string) {
    this._initRequestId = id;
  }

  /** Write an NDJSON message to the CLI stdin */
  writeToStdin(msg: unknown): void {
    this.stdin?.write(`${JSON.stringify(msg)}\n`);
  }

  /** Send a fire-and-forget control request */
  sendControlRequest(request: OutboundControlRequest): void {
    if (this.closed) return;
    this.writeToStdin(this.buildControlRequest(request));
  }

  /**
   * Send a control request and return a Promise that resolves when the CLI responds
   */
  // biome-ignore lint/suspicious/noExplicitAny: response shape varies by request type
  sendControlRequestWithResponse<T = any>(request: OutboundControlRequest): Promise<T> {
    if (this.closed) {
      return Promise.reject(new Error('Cannot send control request: query is closed'));
    }
    const envelope = this.buildControlRequest(request);
    const promise = new Promise<T>((resolve, reject) => {
      this.pendingResponses.set(envelope.request_id, { resolve, reject });
    });
    this.writeToStdin(envelope);
    return promise;
  }

  /**
   * Handle a control_response from the CLI.
   * Routes to init promise or pending request/response handlers.
   */
  handleControlResponse(response: ControlResponsePayload): void {
    if (!response) return;

    const requestId = response.request_id;

    // Check if this is the init response
    if (requestId === this._initRequestId) {
      if (response.subtype === ResponseSubtype.SUCCESS) {
        this.initResolve(response.response as SDKControlInitializeResponse);
      } else {
        this.initReject(new Error(`Initialization failed: ${response.error || 'unknown error'}`));
      }
      return;
    }

    // Check if there's a pending request/response handler
    const pending = requestId ? this.pendingResponses.get(requestId) : undefined;
    if (pending) {
      const { resolve, reject } = pending;
      this.pendingResponses.delete(requestId);
      if (response.subtype === ResponseSubtype.SUCCESS) {
        resolve(response.response);
      } else {
        reject(new Error(`Control request failed: ${response.error || 'unknown error'}`));
      }
    }
  }

  /** Wait for the init response from CLI */
  waitForInit(): Promise<SDKControlInitializeResponse> {
    return this.initResponsePromise;
  }

  /** Reject init promise and all pending control response promises */
  rejectAll(error: Error): void {
    this.closed = true;
    this.initReject?.(error);
    for (const [, { reject }] of this.pendingResponses) {
      reject(error);
    }
    this.pendingResponses.clear();
  }

  /** Build a control_request envelope for the wire */
  private buildControlRequest(request: OutboundControlRequest, requestId?: string) {
    return {
      type: MessageType.CONTROL_REQUEST,
      request_id: requestId ?? this.generateRequestId(),
      request,
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
