/**
 * Output Styles integration tests
 *
 * Tests the output styles feature which allows users to define
 * custom output styles in .claude/output-styles/ directories.
 *
 * Output styles require:
 * 1. settingSources: ['project'] or ['user'] to load from filesystem
 * 2. cwd pointing to directory with .claude/output-styles/
 *
 * Fixture: tests/fixtures/.claude/output-styles/concise.md
 */

import { expect } from 'bun:test';
import path from 'node:path';
import type { LiteQuery } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

const fixturesDir = path.join(import.meta.dir, '../fixtures');

// ============================================================================
// Output Style Discovery Tests
// ============================================================================

testWithBothSDKs(
  'custom output style appears in initializationResult',
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

    const init = await q.initializationResult();

    expect(Array.isArray(init.available_output_styles)).toBe(true);
    expect(init.available_output_styles.length).toBeGreaterThan(0);

    // Our fixture "Concise" style should be present
    const hasConcise = init.available_output_styles.some((s: string) =>
      s.toLowerCase().includes('concise')
    );
    expect(hasConcise).toBe(true);

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    console.log(`   [${sdk}] Output styles: [${init.available_output_styles.join(', ')}]`);
  },
  90000
);

testWithBothSDKs(
  'custom output style not loaded without settingSources',
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
        settingSources: [],
        cwd: fixturesDir,
        pathToClaudeCodeExecutable: path.resolve(
          './node_modules/@anthropic-ai/claude-agent-sdk/cli.js'
        ),
      },
    });

    const init = await q.initializationResult();

    // Our custom "Concise" style should NOT be present without settingSources
    const hasConcise = init.available_output_styles.some((s: string) =>
      s.toLowerCase().includes('concise')
    );
    expect(hasConcise).toBe(false);

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    console.log(`   [${sdk}] Without settingSources: [${init.available_output_styles.join(', ')}]`);
  },
  90000
);

// ============================================================================
// Lite SDK Extension Tests (availableOutputStyles / currentOutputStyle)
// ============================================================================

testWithBothSDKs(
  'availableOutputStyles() returns custom styles (lite extension)',
  async (sdk) => {
    if (sdk === 'official') {
      // Official SDK doesn't have this method — verify via initializationResult
      const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
      const q = officialQuery({
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
      const init = await q.initializationResult();
      expect(
        init.available_output_styles.some((s: string) => s.toLowerCase().includes('concise'))
      ).toBe(true);
      for await (const msg of q) {
        if (msg.type === 'result') break;
      }
      console.log(`   [official] Verified via initializationResult()`);
      return;
    }

    const { query: liteQuery } = await import('../../src/api/query.ts');
    const q = liteQuery({
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
    }) as LiteQuery;

    const styles = await q.availableOutputStyles();
    const current = await q.currentOutputStyle();

    expect(Array.isArray(styles)).toBe(true);
    expect(styles.some((s) => s.toLowerCase().includes('concise'))).toBe(true);
    expect(typeof current).toBe('string');

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    console.log(`   [lite] currentOutputStyle: "${current}", styles: [${styles.join(', ')}]`);
  },
  90000
);
