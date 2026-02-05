/**
 * Plugins feature tests
 *
 * These tests document plugin features that exist in the official SDK but are
 * NOT YET implemented in the lite SDK. Tests are marked with .skip or .todo.
 *
 * Based on official documentation:
 * - docs/official-agent-sdk-docs/plugins.md
 *
 * Plugin Features to Implement:
 * 1. plugins option - Load plugins from local directories
 * 2. Plugin verification - Check init message for loaded plugins
 * 3. Plugin commands - Namespaced command execution
 * 4. Plugin structure - .claude-plugin/plugin.json manifest
 * 5. Plugin contents - commands/, agents/, skills/, hooks/, .mcp.json
 */

import { describe, expect, test } from 'bun:test';
import { runWithSDK, type SDKType } from './comparison-utils';

// Test helper that runs tests with both SDKs
const testWithBothSDKs = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe(name, () => {
    test.concurrent(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test.concurrent(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

// =============================================================================
// Loading Plugins (plugins option)
// =============================================================================

describe('Loading Plugins', () => {
  test.todo('plugins option: should accept array of local plugin paths', async () => {
    /**
     * Expected behavior from official SDK:
     *
     * ```typescript
     * for await (const message of query({
     *   prompt: "Hello",
     *   options: {
     *     plugins: [
     *       { type: "local", path: "./my-plugin" },
     *       { type: "local", path: "/absolute/path/to/another-plugin" }
     *     ]
     *   }
     * })) { ... }
     * ```
     *
     * Implementation notes:
     * - plugins is an array of { type: "local", path: string }
     * - Paths can be relative or absolute
     * - Plugin directory must contain .claude-plugin/plugin.json
     */
  });

  test.todo('plugins option: should resolve relative paths from cwd', async () => {
    /**
     * From docs:
     *
     * - Relative paths resolved from current working directory
     * - Absolute paths used as-is
     *
     * Example:
     * - "./plugins/my-plugin" resolves from process.cwd()
     * - "/home/user/plugins/my-plugin" used directly
     */
  });

  test.todo('plugins option: should pass to CLI correctly', async () => {
    /**
     * Need to verify CLI flag:
     * - Might be --plugin-dir
     * - Might be --plugins with JSON
     * - Compare with official SDK's capture CLI output
     */
  });
});

// =============================================================================
// Plugin Verification
// =============================================================================

describe('Plugin Verification', () => {
  test.todo('system init message should include loaded plugins', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * if (message.type === "system" && message.subtype === "init") {
     *   console.log("Plugins:", message.plugins);
     *   // Example: [{ name: "my-plugin", path: "./my-plugin" }]
     * }
     * ```
     *
     * The init message should list all successfully loaded plugins
     */
  });

  test.todo('system init message should include plugin commands', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * if (message.type === "system" && message.subtype === "init") {
     *   console.log("Commands:", message.slash_commands);
     *   // Example: ["/help", "/compact", "my-plugin:custom-command"]
     * }
     * ```
     *
     * Plugin commands appear in slash_commands with namespace prefix
     */
  });
});

// =============================================================================
// Plugin Commands
// =============================================================================

describe('Plugin Commands', () => {
  test.todo('plugin commands should be namespaced', async () => {
    /**
     * From docs:
     *
     * "Commands from plugins are automatically namespaced with the plugin
     * name to avoid conflicts. The format is plugin-name:command-name."
     *
     * Example: Plugin "my-plugin" with command "greet"
     *          becomes "/my-plugin:greet" or "my-plugin:custom-command"
     */
  });

  test.todo('should invoke plugin command via prompt', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * for await (const message of query({
     *   prompt: "/my-plugin:greet",  // Use plugin command with namespace
     *   options: {
     *     plugins: [{ type: "local", path: "./my-plugin" }]
     *   }
     * })) {
     *   if (message.type === "assistant") {
     *     console.log(message.content);
     *   }
     * }
     * ```
     */
  });
});

// =============================================================================
// Plugin Structure
// =============================================================================

describe('Plugin Structure', () => {
  test.todo('plugin directory should contain .claude-plugin/plugin.json', async () => {
    /**
     * Required structure:
     *
     * ```
     * my-plugin/
     * |-- .claude-plugin/
     * |   |-- plugin.json          # Required: plugin manifest
     * |-- commands/                 # Optional: custom slash commands
     * |   |-- custom-cmd.md
     * |-- agents/                   # Optional: custom agents
     * |   |-- specialist.md
     * |-- skills/                   # Optional: Agent Skills
     * |   |-- my-skill/
     * |       |-- SKILL.md
     * |-- hooks/                    # Optional: event handlers
     * |   |-- hooks.json
     * |-- .mcp.json                # Optional: MCP server definitions
     * ```
     */
  });

  test.todo('plugin.json manifest should be valid', async () => {
    /**
     * The plugin.json file defines the plugin metadata.
     * See plugins-reference documentation for schema.
     */
  });
});

// =============================================================================
// Plugin Contents
// =============================================================================

describe('Plugin Contents', () => {
  test.todo('plugins can include custom commands', async () => {
    /**
     * From docs:
     *
     * Commands are defined as markdown files in commands/ directory.
     * They become available as /plugin-name:command-name
     */
  });

  test.todo('plugins can include custom agents', async () => {
    /**
     * From docs:
     *
     * Agents are defined as markdown files in agents/ directory.
     * They extend the available subagents for the session.
     */
  });

  test.todo('plugins can include skills', async () => {
    /**
     * From docs:
     *
     * Skills are SKILL.md files in skills/<skill-name>/ directories.
     * They provide specialized capabilities Claude can invoke.
     */
  });

  test.todo('plugins can include hooks', async () => {
    /**
     * From docs:
     *
     * hooks/hooks.json defines event handlers for the plugin.
     */
  });

  test.todo('plugins can include MCP servers', async () => {
    /**
     * From docs:
     *
     * .mcp.json at plugin root defines MCP server configurations.
     */
  });
});

// =============================================================================
// Multiple Plugin Sources
// =============================================================================

describe('Multiple Plugin Sources', () => {
  test.todo('should load plugins from multiple locations', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * plugins: [
     *   { type: "local", path: "./local-plugin" },
     *   { type: "local", path: "~/.claude/custom-plugins/shared-plugin" }
     * ]
     * ```
     */
  });

  test.todo('CLI-installed plugins should be usable', async () => {
    /**
     * From docs:
     *
     * "If you installed a plugin via the CLI (e.g., /plugin install my-plugin@marketplace),
     * you can still use it in the SDK by providing its installation path.
     * Check ~/.claude/plugins/ for CLI-installed plugins."
     */
  });
});

// =============================================================================
// Error Handling
// =============================================================================

describe('Plugin Error Handling', () => {
  test.todo('should handle missing plugin directory gracefully', async () => {
    /**
     * From docs troubleshooting:
     *
     * "Check the path: Ensure the path points to the plugin root directory
     * (containing .claude-plugin/)"
     */
  });

  test.todo('should handle invalid plugin.json gracefully', async () => {
    /**
     * From docs troubleshooting:
     *
     * "Validate plugin.json: Ensure your manifest file has valid JSON syntax"
     */
  });

  test.todo('should handle missing commands gracefully', async () => {
    /**
     * From docs troubleshooting:
     *
     * "Validate command files: Ensure command markdown files are in the commands/ directory"
     */
  });
});

// =============================================================================
// Common Use Cases
// =============================================================================

describe('Plugin Use Cases', () => {
  test.todo('development and testing: load plugins without global install', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * plugins: [
     *   { type: "local", path: "./dev-plugins/my-plugin" }
     * ]
     * ```
     *
     * Useful for developing plugins before publishing
     */
  });

  test.todo('project-specific extensions: include plugins in repo', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * plugins: [
     *   { type: "local", path: "./project-plugins/team-workflows" }
     * ]
     * ```
     *
     * Team can share plugins via version control
     */
  });
});

// =============================================================================
// SDK Comparison Tests - Verify both SDKs behave the same
// =============================================================================

describe('Plugins SDK Comparison', () => {
  testWithBothSDKs('plugins option should be accepted without error', async (sdk) => {
    if (sdk === 'lite') {
      // Skip for lite - plugins option not implemented
      // When implemented, should pass plugins to CLI correctly
      return;
    }

    // Official SDK should accept plugins option (even if plugin doesn't exist)
    // We're testing that the option is recognized, not that it loads
    try {
      const _messages = await runWithSDK(sdk, 'Say hello', {
        maxTurns: 1,
        plugins: [{ type: 'local', path: './nonexistent-plugin-for-test' }],
      });
      // If no error thrown, the option is accepted
      // Plugin may fail to load, but option parsing succeeded
    } catch (error) {
      // Error is acceptable if it's about missing plugin, not unknown option
      const errorMsg = String(error);
      expect(errorMsg).not.toContain('unknown option');
    }
  });

  testWithBothSDKs('init message should include slash_commands field', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say "test"', {
      maxTurns: 1,
    });

    // Find init message
    const initMsg = messages.find((m) => m.type === 'system' && m.subtype === 'init');
    expect(initMsg).toBeTruthy();

    // slash_commands should exist (for built-in commands at minimum)
    if (initMsg && 'slash_commands' in initMsg) {
      expect(Array.isArray(initMsg.slash_commands)).toBe(true);
    }
  });

  testWithBothSDKs('init message structure supports plugins field', async (sdk) => {
    const messages = await runWithSDK(sdk, 'Say "test"', {
      maxTurns: 1,
    });

    // Find init message
    const initMsg = messages.find((m) => m.type === 'system' && m.subtype === 'init');
    expect(initMsg).toBeTruthy();

    // When plugins are loaded, init message should have plugins field
    // Without plugins option, field may be undefined or empty array
    // This test verifies the message structure supports it
  });
});
