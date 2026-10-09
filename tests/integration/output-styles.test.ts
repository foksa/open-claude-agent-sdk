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
 * Fixture: tests/fixtures/.claude/output-styles/terse-fixture.md ("Terse Fixture" — not
 * "Concise", which CLI 2.1.29x ships as a built-in style)
 */

import { expect } from 'bun:test';
import path from 'node:path';
import type { ExtendedQuery } from '../../src/types/index.ts';
import { testWithBothSDKs } from './comparison-utils.ts';

const fixturesDir = path.join(import.meta.dir, '../fixtures');
const FIXTURE_STYLE = 'Terse Fixture';

// ============================================================================
// Output Style Discovery Tests
// ============================================================================

testWithBothSDKs(
  'custom output style appears in initializationResult',
  async (sdk) => {
    const { query: openQuery } = await import('../../src/api/query.ts');
    const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const queryFn = sdk === 'open' ? openQuery : officialQuery;

    const q = queryFn({
      prompt: 'Say hello',
      options: {
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 1,
        model: 'haiku',
        settingSources: ['project'],
        cwd: fixturesDir,
      },
    });

    const init = await q.initializationResult();

    expect(Array.isArray(init.available_output_styles)).toBe(true);
    expect(init.available_output_styles.length).toBeGreaterThan(0);

    // Our fixture style should be present
    const hasFixtureStyle = init.available_output_styles.includes(FIXTURE_STYLE);
    expect(hasFixtureStyle).toBe(true);

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
    const { query: openQuery } = await import('../../src/api/query.ts');
    const { query: officialQuery } = await import('@anthropic-ai/claude-agent-sdk');
    const queryFn = sdk === 'open' ? openQuery : officialQuery;

    const q = queryFn({
      prompt: 'Say hello',
      options: {
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 1,
        model: 'haiku',
        settingSources: [],
        cwd: fixturesDir,
      },
    });

    const init = await q.initializationResult();

    // Our fixture style should NOT be present without settingSources
    const hasFixtureStyle = init.available_output_styles.includes(FIXTURE_STYLE);
    expect(hasFixtureStyle).toBe(false);

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    console.log(`   [${sdk}] Without settingSources: [${init.available_output_styles.join(', ')}]`);
  },
  90000
);

// ============================================================================
// Open SDK Extension Tests (availableOutputStyles / currentOutputStyle)
// ============================================================================

testWithBothSDKs(
  'availableOutputStyles() returns custom styles (open extension)',
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
        },
      });
      const init = await q.initializationResult();
      expect(init.available_output_styles.includes(FIXTURE_STYLE)).toBe(true);
      for await (const msg of q) {
        if (msg.type === 'result') break;
      }
      console.log(`   [official] Verified via initializationResult()`);
      return;
    }

    const { query: openQuery } = await import('../../src/api/query.ts');
    const q = openQuery({
      prompt: 'Say hello',
      options: {
        permissionMode: 'bypassPermissions',
        allowDangerouslySkipPermissions: true,
        maxTurns: 1,
        model: 'haiku',
        settingSources: ['project'],
        cwd: fixturesDir,
      },
    }) as ExtendedQuery;

    const styles = await q.availableOutputStyles();
    const current = await q.currentOutputStyle();

    expect(Array.isArray(styles)).toBe(true);
    expect(styles.includes(FIXTURE_STYLE)).toBe(true);
    expect(typeof current).toBe('string');

    for await (const msg of q) {
      if (msg.type === 'result') break;
    }

    console.log(`   [open] currentOutputStyle: "${current}", styles: [${styles.join(', ')}]`);
  },
  90000
);
