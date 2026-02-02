/**
 * Integration tests for query() function
 * These tests call the real Claude CLI and verify NDJSON output
 */

import { test, expect } from 'bun:test';
import { query } from '../../src/api/query.ts';
import { recordSnapshot } from './utils.ts';

test('query() returns valid SDKMessage stream', async () => {
  const messages = [];

  for await (const msg of query({
    prompt: 'Say hello in one word',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
    }
  })) {
    messages.push(msg);

    // Validate message structure
    expect(msg).toHaveProperty('type');
    expect(msg).toHaveProperty('session_id');

    if (msg.type === 'result') {
      break;  // Stop on result
    }
  }

  // Record snapshot for debugging
  const snapshot = await recordSnapshot('hello-world', messages);
  console.log('📸 Snapshot saved to:', snapshot);

  // Basic assertions
  expect(messages.length).toBeGreaterThan(0);
  expect(messages[0].type).toBe('system');  // First message is system init
  expect(messages[messages.length - 1].type).toBe('result');  // Last is result

  // Check result is successful
  const result = messages[messages.length - 1];
  expect(result.type).toBe('result');
  if (result.type === 'result') {
    expect(result.subtype).toBe('success');
    expect(result.is_error).toBe(false);
  }
}, { timeout: 45000 });

test('query() with streaming (includePartialMessages)', async () => {
  const messages = [];
  let streamEventCount = 0;

  for await (const msg of query({
    prompt: 'Write a haiku about coding',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      maxTurns: 1,
      includePartialMessages: true,  // Enable streaming
    }
  })) {
    messages.push(msg);

    if (msg.type === 'stream_event') {
      streamEventCount++;
    }

    if (msg.type === 'result') break;
  }

  await recordSnapshot('streaming-haiku', messages);

  // Should have stream_event messages
  expect(streamEventCount).toBeGreaterThan(0);
  console.log(`   Got ${streamEventCount} stream_event messages`);

  // Should still end with result
  expect(messages[messages.length - 1].type).toBe('result');
}, { timeout: 45000 });

test('query() with plan mode', async () => {
  const messages = [];

  for await (const msg of query({
    prompt: 'List the files in the current directory',
    options: {
      permissionMode: 'plan',  // Plan mode - read-only
      maxTurns: 2,
    }
  })) {
    messages.push(msg);
    if (msg.type === 'result') break;
  }

  await recordSnapshot('plan-mode-ls', messages);

  expect(messages.length).toBeGreaterThan(0);

  // Check system message has correct permission mode
  const systemMsg = messages.find(m => m.type === 'system');
  if (systemMsg && systemMsg.type === 'system') {
    expect(systemMsg.permissionMode).toBe('plan');
  }
}, { timeout: 45000 });

test('query() with custom model', async () => {
  const messages = [];

  for await (const msg of query({
    prompt: 'Say hi',
    options: {
      permissionMode: 'bypassPermissions',
      allowDangerouslySkipPermissions: true,
      model: 'claude-sonnet-4-5-20250929',  // Explicit model
      maxTurns: 1,
    }
  })) {
    messages.push(msg);
    if (msg.type === 'result') break;
  }

  await recordSnapshot('custom-model', messages);

  // Check system message has correct model
  const systemMsg = messages.find(m => m.type === 'system');
  if (systemMsg && systemMsg.type === 'system') {
    expect(systemMsg.model).toBe('claude-sonnet-4-5-20250929');
  }
}, { timeout: 45000 });
