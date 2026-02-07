/**
 * Todo tests for unimplemented Query interface methods
 *
 * Implemented query method tests are in tests/integration/query-methods.test.ts
 * (supportedCommands, supportedModels, MCP methods, initializationResult,
 * setModel, close, asyncDispose, setMaxThinkingTokens).
 * These tests document methods that aren't fully implemented yet.
 */

import { expect } from 'bun:test';
import { testWithBothSDKsTodo } from '../comparison-utils.ts';

// =============================================================================
// STUB: rewindFiles() method
// =============================================================================

testWithBothSDKsTodo('rewindFiles() restores files to checkpoint state', async (sdk) => {
  const { query: liteQuery } = await import('../../src/api/query.ts');
  const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
  const queryFn = sdk === 'lite' ? liteQuery : officialQuery;
  const fs = await import('node:fs/promises');

  const testFile = '/tmp/rewind-test.txt';
  await fs.unlink(testFile).catch(() => {});

  const q = queryFn({
    prompt: 'Write "original" to /tmp/rewind-test.txt, then change it to "modified"',
    options: {
      permissionMode: 'default',
      maxTurns: 5,
      enableFileCheckpointing: true,
      model: 'haiku',
      settingSources: [],
      pathToClaudeCodeExecutable: './node_modules/@anthropic-ai/claude-agent-sdk/cli.js',
    },
  });

  let firstUserMessageUuid: string | undefined;

  for await (const msg of q) {
    if (msg.type === 'user' && !firstUserMessageUuid) {
      firstUserMessageUuid = (msg as unknown as { uuid: string }).uuid;
    }
    if (msg.type === 'result') break;
  }

  const contentBefore = await fs.readFile(testFile, 'utf-8').catch(() => '');
  expect(contentBefore).toContain('modified');

  if (firstUserMessageUuid) {
    await q.rewindFiles(firstUserMessageUuid);
  }

  const contentAfter = await fs.readFile(testFile, 'utf-8').catch(() => '');
  expect(contentAfter).toContain('original');

  console.log(`   [${sdk}] File content before rewind: ${contentBefore}, after: ${contentAfter}`);
});
