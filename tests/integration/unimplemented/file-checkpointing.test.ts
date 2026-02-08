/**
 * File checkpointing — NOT YET implemented
 *
 * rewindFiles() is a stub that throws "not yet implemented".
 * These TODOs document the feature for when it gets implemented.
 *
 * Requires:
 * - enableFileCheckpointing: true
 * - extraArgs: { 'replay-user-messages': null }
 * - env: { CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: '1' }
 *
 * See: docs/official-agent-sdk-docs/file-checkpointing.md
 */

import { expect } from 'bun:test';
import { testWithBothSDKsTodo } from '../comparison-utils.ts';

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
});

testWithBothSDKsTodo('enableFileCheckpointing adds uuid to user messages');
testWithBothSDKsTodo('rewindFiles() deletes files created after checkpoint');
testWithBothSDKsTodo('rewindFiles({ dryRun: true }) previews without applying');
