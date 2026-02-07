/**
 * Integration tests for control protocol methods
 *
 * Tests real round-trip of control methods like accountInfo() and mcpServerStatus().
 * Unit tests verify wire format; these tests verify actual responses from CLI.
 */

import { expect } from 'bun:test';
import path from 'node:path';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../src/api/query.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

const CLI_PATH = path.resolve('./node_modules/@anthropic-ai/claude-agent-sdk/cli.js');

/** Run a query, invoke a control method, then consume remaining messages */
async function queryWithControlMethod<T>(
  sdk: 'lite' | 'official',
  method: (q: ReturnType<typeof liteQuery>) => Promise<T>
): Promise<T> {
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const q = queryFn({
    prompt: 'Say hello',
    options: {
      model: 'haiku',
      permissionMode: 'default',
      settingSources: [],
      pathToClaudeCodeExecutable: CLI_PATH,
      maxTurns: 1,
    },
  });

  const result = await method(q);

  // Consume remaining messages
  for await (const msg of q) {
    if (msg.type === 'result') break;
  }

  return result;
}

testWithBothSDKs(
  'accountInfo() returns account data with expected shape',
  async (sdk) => {
    const info = await queryWithControlMethod(sdk, (q) => q.accountInfo());

    // accountInfo should return an object with account details
    expect(info).toBeDefined();
    expect(typeof info).toBe('object');

    // The response should have some account fields
    // (exact fields depend on the CLI version, but it shouldn't be null/undefined)
    console.log(`   [${sdk}] accountInfo() returned:`, JSON.stringify(info).slice(0, 200));
  },
  120000
);

testWithBothSDKs(
  'mcpServerStatus() returns valid response',
  async (sdk) => {
    const status = await queryWithControlMethod(sdk, (q) => q.mcpServerStatus());

    // mcpServerStatus should return something (empty object or status info)
    expect(status).toBeDefined();

    console.log(`   [${sdk}] mcpServerStatus() returned:`, JSON.stringify(status).slice(0, 200));
  },
  120000
);
