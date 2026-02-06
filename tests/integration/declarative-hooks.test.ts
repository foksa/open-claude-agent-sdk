/**
 * Declarative hooks integration tests
 *
 * Tests hook events that only fire via .claude/settings.json (declarative config),
 * NOT via programmatic hooks option.
 *
 * Known limitation in official SDK:
 * - SessionStart and SessionEnd only work declaratively
 * - See: github.com/anthropics/claude-agent-sdk-typescript/issues/83
 *
 * Fixture: tests/fixtures/.claude/settings.json
 */

import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { beforeAll, expect } from 'bun:test';
import { testWithBothSDKs } from './comparison-utils.ts';

const fixturesDir = path.join(import.meta.dir, '../fixtures');
const MARKER_FILE = '/tmp/lite-sdk-hook-markers.txt';

// Clean marker file once before all tests in this file
beforeAll(() => {
  try {
    if (existsSync(MARKER_FILE)) unlinkSync(MARKER_FILE);
  } catch {}
});

function readMarkers(): string[] {
  if (!existsSync(MARKER_FILE)) return [];
  return readFileSync(MARKER_FILE, 'utf-8').trim().split('\n').filter(Boolean);
}

// =============================================================================
// SessionStart + SessionEnd — fire via declarative .claude/settings.json
// Both hooks write markers to the same file, checked after query completes.
// =============================================================================

testWithBothSDKs(
  'SessionStart and SessionEnd hooks fire via declarative settings.json',
  async (sdk) => {
    const { query: liteQuery } = await import('../../src/api/query.ts');
    const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const queryFn = sdk === 'lite' ? liteQuery : officialQuery;

    const q = queryFn({
      prompt: 'Say hello',
      options: {
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 1,
        model: 'haiku',
        settingSources: ['project'],
        cwd: fixturesDir,
        pathToClaudeCodeExecutable: path.resolve(
          './node_modules/@anthropic-ai/claude-agent-sdk/cli.js'
        ),
      },
    });

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    // Wait for SessionEnd hook command to execute after process exit
    await new Promise((r) => setTimeout(r, 2000));

    const markers = readMarkers();
    const hasSessionStart = markers.includes('session_start');
    const hasSessionEnd = markers.includes('session_end');

    expect(hasSessionStart).toBe(true);
    expect(hasSessionEnd).toBe(true);
    console.log(`   [${sdk}] Declarative hook markers: ${markers.join(', ')}`);
  },
  120000
);
