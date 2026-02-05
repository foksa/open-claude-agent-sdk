/**
 * Generic async message queue with iterator protocol support
 *
 * Handles the producer-consumer pattern for streaming messages:
 * - Producer: pushes messages via push()
 * - Consumer: awaits messages via next() (AsyncIterator protocol)
 *
 * @internal
 */

export class MessageQueue<T> {
  private queue: T[] = [];
  private waiters: Array<{
    resolve: (value: IteratorResult<T>) => void;
    reject: (error: Error) => void;
  }> = [];
  private done = false;
  private error: Error | null = null;

  /**
   * Add a message to the queue
   * If there are waiting consumers, resolves the first one immediately
   */
  push(item: T): void {
    if (this.done) return; // Ignore pushes after completion

    // If someone is waiting, resolve immediately
    if (this.waiters.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: length > 0 guarantees shift returns a value
      const waiter = this.waiters.shift()!;
      waiter.resolve({ value: item, done: false });
    } else {
      this.queue.push(item);
    }
  }

  /**
   * Mark the queue as complete (no more messages)
   * @param error Optional error to propagate to consumers
   */
  complete(error?: Error): void {
    if (this.done) return;

    this.done = true;
    this.error = error ?? null;

    // Resolve all waiting consumers
    const waiters = this.waiters.splice(0);
    for (const waiter of waiters) {
      if (this.error) {
        waiter.reject(this.error);
      } else {
        // biome-ignore lint/suspicious/noExplicitAny: IteratorResult requires undefined for done=true
        waiter.resolve({ value: undefined as any, done: true });
      }
    }
  }

  /**
   * Get the next message (AsyncIterator protocol)
   * Waits if no messages are available
   */
  async next(): Promise<IteratorResult<T>> {
    // Return from queue if available
    if (this.queue.length > 0) {
      // biome-ignore lint/style/noNonNullAssertion: length > 0 guarantees shift returns a value
      const item = this.queue.shift()!;
      return { value: item, done: false };
    }

    // If done, return completion or throw error
    if (this.done) {
      if (this.error) {
        throw this.error;
      }
      // biome-ignore lint/suspicious/noExplicitAny: IteratorResult requires undefined for done=true
      return { value: undefined as any, done: true };
    }

    // Wait for next message
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.waiters.push({ resolve, reject });
    });
  }

  /**
   * Check if the queue is completed
   */
  isDone(): boolean {
    return this.done;
  }

  /**
   * Get the current error (if any)
   */
  getError(): Error | null {
    return this.error;
  }
}
