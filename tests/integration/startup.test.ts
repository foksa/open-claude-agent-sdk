/**
 * Integration tests for startup() and WarmQuery (v0.2.111)
 *
 * startup() pre-warms a Claude subprocess so the first query has lower latency.
 * WarmQuery.query() sends the prompt; WarmQuery.close() discards without querying.
 */

import { expect, test } from 'bun:test';
import { startup } from '../../src/index.ts';
import type { SDKMessage } from '../../src/types/index.ts';
import { expectSuccessResult } from './test-helpers.ts';

const WARM_OPTIONS = {
  model: 'haiku',
  settingSources: [] as string[],
  maxTurns: 1,
};

test.concurrent(
  'startup() returns a WarmQuery with query() and close() methods',
  async () => {
    const warm = await startup({ options: WARM_OPTIONS });

    expect(typeof warm.query).toBe('function');
    expect(typeof warm.close).toBe('function');

    warm.close();

    console.log('   startup() — WarmQuery shape verified');
  },
  { timeout: 60000 }
);

test.concurrent(
  'WarmQuery.query() runs a prompt and returns a usable Query',
  async () => {
    const warm = await startup({ options: WARM_OPTIONS });

    const messages: SDKMessage[] = [];
    for await (const msg of warm.query('Say "warmed" and nothing else.')) {
      messages.push(msg);
      if (msg.type === 'result') break;
    }

    const result = expectSuccessResult(messages);
    expect(result.session_id).toBeTruthy();

    console.log(`   WarmQuery.query() — result session_id: ${result.session_id}`);
  },
  { timeout: 120000 }
);

test.concurrent(
  'WarmQuery.close() disposes the subprocess without sending a prompt',
  async () => {
    const warm = await startup({ options: WARM_OPTIONS });
    // Should not throw — just tears down the warm subprocess
    warm.close();
    console.log('   WarmQuery.close() — disposed cleanly');
  },
  { timeout: 60000 }
);
