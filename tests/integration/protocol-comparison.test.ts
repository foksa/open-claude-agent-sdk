/**
 * Protocol Comparison Tests
 *
 * Captures full stdin/stdout exchange for both SDKs and compares them.
 * Uses real CLI through a capture proxy - makes actual API calls.
 */

import { test, expect, describe } from 'bun:test';
import { query as liteQuery } from '../../src/api/query.ts';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync, unlinkSync, existsSync } from 'node:fs';
import type { Options, HookCallbackMatcher } from '../../src/types/index.ts';

const COMPARE_CLI = './tests/utils/compare-cli.cjs';

interface CapturedMessage {
  timestamp: number;
  message?: any;
  raw?: string;
}

interface CaptureResult {
  stdin: CapturedMessage[];
  stdout: CapturedMessage[];
  duration: number;
}

let captureCounter = 0;

async function captureProtocol(
  queryFn: typeof liteQuery,
  prompt: string,
  options: Options = {}
): Promise<CaptureResult> {
  const uniqueId = `${Date.now()}-${++captureCounter}-${Math.random().toString(36).slice(2)}`;
  const outputFile = `/tmp/compare-${uniqueId}.json`;
  const wrapperScript = `/tmp/compare-wrapper-${uniqueId}.sh`;

  // Shell wrapper that sets env var and executes compare-cli
  writeFileSync(wrapperScript, `#!/bin/bash
export COMPARE_OUTPUT_FILE="${outputFile}"
exec node "${process.cwd()}/${COMPARE_CLI}" "$@"
`, { mode: 0o755 });

  const opts: Options = {
    model: 'haiku',
    maxTurns: 3,
    settingSources: [],
    pathToClaudeCodeExecutable: wrapperScript,
    permissionMode: 'bypassPermissions',
    allowDangerouslySkipPermissions: true,
    ...options,
  };

  try {
    for await (const msg of queryFn({ prompt, options: opts })) {
      if (msg.type === 'result') break;
    }
  } catch (_e) {
    // May error, ok
  }

  await new Promise(r => setTimeout(r, 1000));
  try { unlinkSync(wrapperScript); } catch {}

  for (let i = 0; i < 10; i++) {
    if (existsSync(outputFile)) {
      try {
        const data = JSON.parse(readFileSync(outputFile, 'utf-8'));
        unlinkSync(outputFile);
        return data;
      } catch (_e) {
        await new Promise(r => setTimeout(r, 200));
      }
    } else {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return { stdin: [], stdout: [], duration: 0 };
}

function normalizeMessage(msg: any): any {
  if (!msg) return msg;
  const clone = JSON.parse(JSON.stringify(msg));
  delete clone.request_id;
  delete clone.timestamp;
  delete clone.session_id;
  if (clone.request) delete clone.request.request_id;
  if (clone.request?.hooks) {
    for (const matchers of Object.values(clone.request.hooks as Record<string, any[]>)) {
      for (const m of matchers) {
        if (m.hookCallbackIds) m.hookCallbackIds = m.hookCallbackIds.map((_: string, i: number) => `cb_${i}`);
      }
    }
  }
  return clone;
}

function getMessageType(msg: any): string {
  if (!msg?.message) return 'unknown';
  const m = msg.message;
  if (m.type === 'control_request') return `control_request:${m.request?.subtype || 'unknown'}`;
  if (m.type === 'control_response') return `control_response:${m.response?.subtype || 'unknown'}`;
  return m.type + (m.subtype ? `:${m.subtype}` : '');
}

describe('protocol comparison', () => {
  test.concurrent('stdin sequence matches', async () => {
    const [lite, official] = await Promise.all([
      captureProtocol(liteQuery, 'Say hi'),
      captureProtocol(officialQuery, 'Say hi')
    ]);
    const liteTypes = lite.stdin.map(getMessageType);
    const officialTypes = official.stdin.map(getMessageType);
    expect(liteTypes).toEqual(officialTypes);
    console.log('   Stdin:', liteTypes);
  }, { timeout: 60000 });

  test.concurrent('init structure matches', async () => {
    const [lite, official] = await Promise.all([
      captureProtocol(liteQuery, 'test'),
      captureProtocol(officialQuery, 'test')
    ]);
    const liteInit = lite.stdin.find(m => m.message?.request?.subtype === 'initialize');
    const officialInit = official.stdin.find(m => m.message?.request?.subtype === 'initialize');
    expect(liteInit).toBeTruthy();
    expect(officialInit).toBeTruthy();
    if (liteInit && officialInit) {
      const l = normalizeMessage(liteInit.message);
      const o = normalizeMessage(officialInit.message);
      expect(l.type).toBe(o.type);
      expect(l.request.subtype).toBe(o.request.subtype);
      expect('systemPrompt' in l.request).toBe('systemPrompt' in o.request);
    }
    console.log('   Init structure matches');
  }, { timeout: 60000 });

  test.concurrent('user message matches', async () => {
    const [lite, official] = await Promise.all([
      captureProtocol(liteQuery, 'Protocol test'),
      captureProtocol(officialQuery, 'Protocol test')
    ]);
    const liteUser = lite.stdin.find(m => m.message?.type === 'user');
    const officialUser = official.stdin.find(m => m.message?.type === 'user');
    expect(liteUser).toBeTruthy();
    expect(officialUser).toBeTruthy();
    if (liteUser && officialUser) {
      expect(liteUser.message.message.role).toBe(officialUser.message.message.role);
      expect(liteUser.message.message.content[0].text).toBe(officialUser.message.message.content[0].text);
    }
    console.log('   User message matches');
  }, { timeout: 60000 });

  test.concurrent('hooks registration matches', async () => {
    const hooks: Record<string, HookCallbackMatcher[]> = {
      PreToolUse: [{ matcher: 'Read', hooks: [async () => ({})] }],
      PostToolUse: [{ hooks: [async () => ({})] }],
    };
    const [lite, official] = await Promise.all([
      captureProtocol(liteQuery, 'test', { hooks }),
      captureProtocol(officialQuery, 'test', { hooks })
    ]);
    const liteInit = lite.stdin.find(m => m.message?.request?.subtype === 'initialize');
    const officialInit = official.stdin.find(m => m.message?.request?.subtype === 'initialize');
    if (liteInit && officialInit) {
      expect(Object.keys(liteInit.message.request.hooks || {}).sort()).toEqual(
        Object.keys(officialInit.message.request.hooks || {}).sort()
      );
    }
    console.log('   Hooks registration matches');
  }, { timeout: 60000 });

  test.concurrent('stdout has expected messages', async () => {
    const [lite, official] = await Promise.all([
      captureProtocol(liteQuery, 'Say ok'),
      captureProtocol(officialQuery, 'Say ok')
    ]);
    const liteTypes = lite.stdout.map(getMessageType);
    const officialTypes = official.stdout.map(getMessageType);
    expect(liteTypes.includes('system:init')).toBe(officialTypes.includes('system:init'));
    expect(liteTypes.some(t => t.startsWith('result'))).toBe(officialTypes.some(t => t.startsWith('result')));
    console.log('   Stdout lite:', liteTypes.slice(0, 4));
    console.log('   Stdout official:', officialTypes.slice(0, 4));
  }, { timeout: 60000 });
});
