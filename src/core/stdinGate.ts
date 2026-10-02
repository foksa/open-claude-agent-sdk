/**
 * Hold stdin writes until the `initialize` request is written.
 *
 * When in-process MCP server manifests are captured before `initialize`
 * (up to 250ms), everything else bound for the CLI — the prompt, early
 * control calls, server notifications — must still reach it after
 * `initialize`, as with the official SDK's writeAfterInitialize.
 *
 * @internal
 */

import type { Writable } from 'node:stream';

/** The part of a Writable the stdin writers use. */
export type StdinLike = Pick<Writable, 'writableEnded' | 'destroyed'> & {
  write(chunk: string): unknown;
};

export class InitWriteGate implements StdinLike {
  /** Writes held until release(); null once released. */
  private held: string[] | null = [];
  private endRequested = false;

  constructor(private target: Writable) {}

  get writableEnded(): boolean {
    return this.endRequested || this.target.writableEnded;
  }

  get destroyed(): boolean {
    return this.target.destroyed;
  }

  get released(): boolean {
    return this.held === null;
  }

  write(chunk: string): boolean {
    if (this.held) {
      this.held.push(chunk);
      return true;
    }
    return this.target.write(chunk);
  }

  /** Write `first` (the initialize request), then everything held behind it. */
  release(first?: string): void {
    const held = this.held;
    if (!held) return;
    this.held = null;
    if (this.target.writableEnded || this.target.destroyed) return;
    if (first !== undefined) this.target.write(first);
    for (const chunk of held) this.target.write(chunk);
    if (this.endRequested) this.target.end();
  }

  /** The query closed before `initialize` was written: drop what was held. */
  discard(): void {
    if (!this.held) return;
    this.held = null;
    if (this.endRequested && !this.target.writableEnded) this.target.end();
  }

  end(): void {
    this.endRequested = true;
    if (!this.held) this.target.end();
  }
}
