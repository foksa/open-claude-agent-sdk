/**
 * Plugins integration tests
 *
 * Tests the plugins option which loads plugin directories into Claude Code
 * sessions. Each plugin gets a separate `--plugin-dir <path>` CLI flag.
 *
 * Plugins require:
 * 1. plugins option with array of { type: "local", path: string }
 * 2. Plugin directory with .claude-plugin/plugin.json manifest
 * 3. Optional: commands/, agents/, skills/, hooks/, .mcp.json
 *
 * Test fixtures:
 * - tests/fixtures/.claude/plugins/internal-plugin/ (inside .claude)
 * - tests/fixtures/external-plugin/ (outside .claude, standalone dir)
 */

import { expect } from 'bun:test';
import path from 'node:path';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

const fixturesDir = path.join(import.meta.dir, '../fixtures');
const internalPluginPath = path.join(fixturesDir, '.claude/plugins/internal-plugin');
const externalPluginPath = path.join(fixturesDir, 'external-plugin');

// =============================================================================
// Internal Plugin (inside .claude directory)
// =============================================================================

testWithBothSDKs(
  'internal plugin loads and appears in init message',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Hello', {
      cwd: fixturesDir,
      settingSources: [],
      maxTurns: 1,
      plugins: [{ type: 'local', path: internalPluginPath }],
    });

    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    // Plugin commands should appear namespaced in slash_commands
    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      console.log(`   [${sdk}] slash_commands:`, slashCommands);

      // internal-plugin:ping should be in the list
      const hasPing = slashCommands.some((cmd) => cmd.includes('internal-plugin:ping'));
      expect(hasPing).toBe(true);
    }

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    console.log(`   [${sdk}] Internal plugin loaded`);
  },
  90000
);

testWithBothSDKs(
  'internal plugin command is invokable',
  async (sdk) => {
    const messages = await runWithSDK(sdk, '/internal-plugin:ping', {
      cwd: fixturesDir,
      settingSources: [],
      maxTurns: 3,
      plugins: [{ type: 'local', path: internalPluginPath }],
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    if (result && result.type === 'result') {
      const validResults = ['success', 'error_max_turns'];
      expect(validResults).toContain(result.subtype);
    }

    console.log(
      `   [${sdk}] /internal-plugin:ping invoked, result: ${result?.type === 'result' ? result.subtype : 'unknown'}`
    );
  },
  90000
);

// =============================================================================
// External Plugin (outside .claude directory)
// =============================================================================

testWithBothSDKs(
  'external plugin loads and appears in init message',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Hello', {
      cwd: fixturesDir,
      settingSources: [],
      maxTurns: 1,
      plugins: [{ type: 'local', path: externalPluginPath }],
    });

    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    // Plugin commands should appear namespaced in slash_commands
    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      console.log(`   [${sdk}] slash_commands:`, slashCommands);

      // external-plugin:echo should be in the list
      const hasEcho = slashCommands.some((cmd) => cmd.includes('external-plugin:echo'));
      expect(hasEcho).toBe(true);
    }

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    console.log(`   [${sdk}] External plugin loaded`);
  },
  90000
);

testWithBothSDKs(
  'external plugin command is invokable',
  async (sdk) => {
    const messages = await runWithSDK(sdk, '/external-plugin:echo', {
      cwd: fixturesDir,
      settingSources: [],
      maxTurns: 3,
      plugins: [{ type: 'local', path: externalPluginPath }],
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    if (result && result.type === 'result') {
      const validResults = ['success', 'error_max_turns'];
      expect(validResults).toContain(result.subtype);
    }

    console.log(
      `   [${sdk}] /external-plugin:echo invoked, result: ${result?.type === 'result' ? result.subtype : 'unknown'}`
    );
  },
  90000
);

// =============================================================================
// Multiple Plugins (both loaded simultaneously)
// =============================================================================

testWithBothSDKs(
  'multiple plugins load together and both commands appear',
  async (sdk) => {
    const messages = await runWithSDK(sdk, 'Hello', {
      cwd: fixturesDir,
      settingSources: [],
      maxTurns: 1,
      plugins: [
        { type: 'local', path: internalPluginPath },
        { type: 'local', path: externalPluginPath },
      ],
    });

    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      console.log(`   [${sdk}] slash_commands:`, slashCommands);

      // Both plugin commands should be present
      const hasPing = slashCommands.some((cmd) => cmd.includes('internal-plugin:ping'));
      const hasEcho = slashCommands.some((cmd) => cmd.includes('external-plugin:echo'));
      expect(hasPing).toBe(true);
      expect(hasEcho).toBe(true);
    }

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    console.log(`   [${sdk}] Both plugins loaded`);
  },
  90000
);

// =============================================================================
// Plugins without settingSources (plugins work independently)
// =============================================================================

testWithBothSDKs(
  'plugins load even with empty settingSources',
  async (sdk) => {
    // Plugins are passed via --plugin-dir, independent of settingSources
    const messages = await runWithSDK(sdk, 'Hello', {
      cwd: fixturesDir,
      settingSources: [], // No settings loaded
      maxTurns: 1,
      plugins: [{ type: 'local', path: externalPluginPath }],
    });

    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    // Plugin should still load via --plugin-dir regardless of settingSources
    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      const hasEcho = slashCommands.some((cmd) => cmd.includes('external-plugin:echo'));
      expect(hasEcho).toBe(true);
    }

    console.log(`   [${sdk}] Plugin loaded without settingSources`);
  },
  90000
);

// =============================================================================
// Error Handling
// =============================================================================

testWithBothSDKs(
  'nonexistent plugin path is accepted without crashing',
  async (sdk) => {
    // The option should be accepted; CLI may warn about missing plugin but not crash
    try {
      const messages = await runWithSDK(sdk, 'Say hello', {
        maxTurns: 1,
        plugins: [{ type: 'local', path: './nonexistent-plugin-for-test' }],
      });

      const result = messages.find((m) => m.type === 'result');
      expect(result).toBeTruthy();
    } catch (error) {
      // Error is acceptable if it's about missing plugin, not unknown option
      const errorMsg = String(error);
      expect(errorMsg).not.toContain('unknown option');
    }

    console.log(`   [${sdk}] Nonexistent plugin handled gracefully`);
  },
  90000
);
