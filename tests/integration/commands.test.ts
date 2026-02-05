/**
 * Custom Commands integration tests
 *
 * Tests the custom commands feature which allows users to define
 * slash commands in .claude/commands/ directories.
 *
 * Commands require:
 * 1. settingSources: ['project'] or ['user'] to load from filesystem
 * 2. cwd pointing to directory with .claude/commands/
 *
 * Commands are invoked via /command syntax in prompts.
 */

import { expect } from 'bun:test';
import path from 'node:path';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

const fixturesDir = path.join(import.meta.dir, '../fixtures');

// ============================================================================
// Discovering Available Slash Commands
// Based on: docs/official-agent-sdk-docs/slash-commands.md
// ============================================================================

testWithBothSDKs(
  'slash_commands available in system init message',
  async (sdk) => {
    // From official docs:
    // The Claude Agent SDK provides information about available slash commands
    // in the system initialization message.
    const messages = await runWithSDK(sdk, 'Hello Claude', {
      cwd: fixturesDir,
      settingSources: ['project'],
      maxTurns: 1,
    });

    // Find the init message
    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    // slash_commands should be present in init message
    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      console.log(`   [${sdk}] Available slash commands:`, slashCommands);

      // Built-in commands should be present (from official docs: /compact, /clear, /help)
      const hasCompact = slashCommands.some((cmd) => cmd.includes('compact'));
      expect(hasCompact).toBe(true);

      // Custom commands from fixtures should also be present
      const hasHello = slashCommands.some((cmd) => cmd.includes('hello'));
      const hasGreet = slashCommands.some((cmd) => cmd.includes('greet'));
      expect(hasHello).toBe(true);
      expect(hasGreet).toBe(true);
      console.log(`   [${sdk}] Custom commands /hello and /greet discovered`);
    }
  },
  90000
);

// ============================================================================
// Custom Command Discovery Tests
// ============================================================================

testWithBothSDKs(
  'custom commands appear in init message slash_commands',
  async (sdk) => {
    // When settingSources includes project, custom commands should be loaded
    const messages = await runWithSDK(sdk, 'Hello', {
      cwd: fixturesDir,
      settingSources: ['project'],
      maxTurns: 1,
    });

    // Find the init message
    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    // Check if slash_commands includes our custom commands
    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      console.log(`   [${sdk}] slash_commands:`, slashCommands);

      // Our fixtures have /hello and /greet commands
      // Note: Commands may appear with or without leading /
      const hasHello = slashCommands.some(
        (cmd) => cmd === '/hello' || cmd === 'hello' || cmd.includes('hello')
      );
      const hasGreet = slashCommands.some(
        (cmd) => cmd === '/greet' || cmd === 'greet' || cmd.includes('greet')
      );

      // At least one of our commands should be present
      expect(hasHello || hasGreet).toBe(true);
      console.log(`   [${sdk}] Custom commands found in slash_commands`);
    } else {
      console.log(`   [${sdk}] No slash_commands in init message (may be expected)`);
    }
  },
  90000
);

testWithBothSDKs(
  'commands not loaded without settingSources',
  async (sdk) => {
    // Without settingSources, custom commands should not be loaded
    const messages = await runWithSDK(sdk, 'Hello', {
      cwd: fixturesDir,
      settingSources: [], // No settings
      maxTurns: 1,
    });

    const init = messages.find(
      (m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init'
    );
    expect(init).toBeTruthy();

    // slash_commands should not include our custom commands
    if (init && 'slash_commands' in init) {
      const slashCommands = init.slash_commands as string[];
      const hasHello = slashCommands.some((cmd) => cmd.includes('hello'));

      // Our custom /hello should NOT be present
      expect(hasHello).toBe(false);
      console.log(`   [${sdk}] Custom commands not loaded without settingSources`);
    }
  },
  90000
);

// ============================================================================
// Command Invocation Tests
// ============================================================================

testWithBothSDKs(
  'custom command is invoked via slash syntax',
  async (sdk) => {
    // Invoke our /hello command
    // From official docs: "Send slash commands by including them in your prompt string"
    const messages = await runWithSDK(sdk, '/hello', {
      cwd: fixturesDir,
      settingSources: ['project'],
      maxTurns: 3,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    // Command should complete successfully or with max_turns (command was processed)
    if (result && result.type === 'result') {
      const validResults = ['success', 'error_max_turns'];
      expect(validResults).toContain(result.subtype);
    }

    console.log(
      `   [${sdk}] /hello command invoked, result: ${result?.type === 'result' ? result.subtype : 'unknown'}`
    );
  },
  90000
);

testWithBothSDKs(
  'command with arguments works',
  async (sdk) => {
    // The greet.md command accepts an argument: [name]
    // From official docs: "Pass arguments to custom command"
    // Example: /fix-issue 123 high -> $1="123" and $2="high"
    const messages = await runWithSDK(sdk, '/greet Alice', {
      cwd: fixturesDir,
      settingSources: ['project'],
      maxTurns: 3,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    // Command should complete successfully or with max_turns (command was processed)
    if (result && result.type === 'result') {
      const validResults = ['success', 'error_max_turns'];
      expect(validResults).toContain(result.subtype);
    }

    console.log(
      `   [${sdk}] /greet command with argument invoked, result: ${result?.type === 'result' ? result.subtype : 'unknown'}`
    );
  },
  90000
);

// ============================================================================
// Error Handling Tests
// ============================================================================

testWithBothSDKs(
  'unknown command is handled gracefully',
  async (sdk) => {
    // Try to invoke a non-existent command
    const messages = await runWithSDK(sdk, '/nonexistent-command-xyz', {
      cwd: fixturesDir,
      settingSources: ['project'],
      maxTurns: 2,
    });

    // Should complete (may be error or success depending on CLI handling)
    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    console.log(`   [${sdk}] Unknown command handled`);
  },
  90000
);
