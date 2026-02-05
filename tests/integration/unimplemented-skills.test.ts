/**
 * Agent Skills feature tests
 *
 * These tests document skills features that exist in the official SDK but are
 * NOT YET implemented in the lite SDK. Tests are marked with .skip or .todo.
 *
 * Based on official documentation:
 * - docs/official-agent-sdk-docs/skills.md
 *
 * Skills Features to Implement:
 * 1. Skill tool enabling - "Skill" in allowedTools
 * 2. settingSources requirement - Must configure to load skills from filesystem
 * 3. Skill locations - .claude/skills/, ~/.claude/skills/, plugin skills
 * 4. SKILL.md format - YAML frontmatter with description
 * 5. Automatic discovery and invocation by Claude
 */

import { describe, test } from 'bun:test';
import type { SDKType } from './comparison-utils.ts';

// Helper for skipped comparison tests
const _testWithBothSDKsSkip = (
  name: string,
  testFn: (sdk: SDKType) => Promise<void>,
  timeout = 60000
) => {
  describe.skip(name, () => {
    test(`[lite] ${name}`, () => testFn('lite'), { timeout });
    test(`[official] ${name}`, () => testFn('official'), { timeout });
  });
};

// =============================================================================
// Skills Overview
// =============================================================================

describe('Skills Overview', () => {
  test.todo('skills are model-invoked capabilities', async () => {
    /**
     * From docs:
     *
     * "Agent Skills extend Claude with specialized capabilities that Claude
     * autonomously invokes when relevant."
     *
     * Key differences from commands:
     * - Commands: User invokes via /command
     * - Skills: Claude decides when to use based on context
     */
  });

  test.todo('skills are filesystem artifacts, not programmatic', async () => {
    /**
     * From docs:
     *
     * "Unlike subagents (which can be defined programmatically), Skills must
     * be created as filesystem artifacts. The SDK does not provide a
     * programmatic API for registering Skills."
     */
  });
});

// =============================================================================
// Enabling Skills
// =============================================================================

describe('Enabling Skills', () => {
  test.todo('should add Skill to allowedTools', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * options: {
     *   allowedTools: ["Skill", "Read", "Write", "Bash"]  // Enable Skill tool
     * }
     * ```
     *
     * The Skill tool must be in allowedTools for Claude to use skills
     */
  });

  test.todo('should configure settingSources to load skills', async () => {
    /**
     * CRITICAL from docs:
     *
     * "By default, the SDK does not load any filesystem settings. To use Skills,
     * you must explicitly configure settingSources: ['user', 'project'] (TypeScript)
     * or setting_sources=['user', 'project'] (Python) in your options."
     *
     * ```typescript
     * options: {
     *   settingSources: ["user", "project"],  // Required to load Skills
     *   allowedTools: ["Skill"]
     * }
     * ```
     *
     * Without settingSources, skills won't be loaded even if Skill is allowed
     */
  });
});

// =============================================================================
// Skill Locations
// =============================================================================

describe('Skill Locations', () => {
  test.todo('project skills in .claude/skills/', async () => {
    /**
     * From docs:
     *
     * "Project Skills (.claude/skills/): Shared with your team via git -
     * loaded when setting_sources includes 'project'"
     *
     * Directory structure:
     * ```
     * .claude/skills/processing-pdfs/
     * |-- SKILL.md
     * ```
     */
  });

  test.todo('user skills in ~/.claude/skills/', async () => {
    /**
     * From docs:
     *
     * "User Skills (~/.claude/skills/): Personal Skills across all projects -
     * loaded when setting_sources includes 'user'"
     */
  });

  test.todo('plugin skills bundled with plugins', async () => {
    /**
     * From docs:
     *
     * "Plugin Skills: Bundled with installed Claude Code plugins"
     *
     * Plugins can include skills/ directory
     */
  });
});

// =============================================================================
// SKILL.md Format
// =============================================================================

describe('SKILL.md Format', () => {
  test.todo('skills defined as directories with SKILL.md', async () => {
    /**
     * From docs:
     *
     * "Skills are defined as directories containing a SKILL.md file with
     * YAML frontmatter and Markdown content."
     *
     * Directory structure:
     * ```
     * .claude/skills/my-skill/
     * |-- SKILL.md
     * ```
     */
  });

  test.todo('description field determines when Claude invokes skill', async () => {
    /**
     * From docs:
     *
     * "The description field determines when Claude invokes your Skill."
     *
     * Example SKILL.md:
     * ```markdown
     * ---
     * description: Process PDF documents and extract text content
     * ---
     *
     * Instructions for processing PDFs...
     * ```
     */
  });

  test.todo('allowed-tools frontmatter NOT supported in SDK', async () => {
    /**
     * Important limitation from docs:
     *
     * "The allowed-tools frontmatter field in SKILL.md is only supported when
     * using Claude Code CLI directly. It does not apply when using Skills
     * through the SDK."
     *
     * "When using the SDK, control tool access through the main allowedTools
     * option in your query configuration."
     */
  });
});

// =============================================================================
// Using Skills with SDK
// =============================================================================

describe('Using Skills with SDK', () => {
  test.todo('complete options for skills usage', async () => {
    /**
     * Full example from docs:
     *
     * ```typescript
     * for await (const message of query({
     *   prompt: "Help me process this PDF document",
     *   options: {
     *     cwd: "/path/to/project",  // Project with .claude/skills/
     *     settingSources: ["user", "project"],  // Load Skills from filesystem
     *     allowedTools: ["Skill", "Read", "Write", "Bash"]  // Enable Skill tool
     *   }
     * })) {
     *   console.log(message);
     * }
     * ```
     */
  });

  test.todo('cwd affects which project skills are loaded', async () => {
    /**
     * From docs:
     *
     * "The SDK loads Skills relative to the cwd option. Ensure it points to
     * a directory containing .claude/skills/."
     *
     * If cwd doesn't contain .claude/skills/, project skills won't load
     */
  });

  test.todo('tool restrictions via allowedTools option', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * options: {
     *   settingSources: ["user", "project"],
     *   allowedTools: ["Skill", "Read", "Grep", "Glob"]  // Restricted toolset
     * }
     * ```
     *
     * Skills can only use tools in the allowedTools list
     */
  });
});

// =============================================================================
// Discovering Skills
// =============================================================================

describe('Discovering Skills', () => {
  test.todo('ask Claude what skills are available', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * for await (const message of query({
     *   prompt: "What Skills are available?",
     *   options: {
     *     settingSources: ["user", "project"],
     *     allowedTools: ["Skill"]
     *   }
     * })) {
     *   console.log(message);
     * }
     * ```
     *
     * Claude will list available skills based on cwd and plugins
     */
  });
});

// =============================================================================
// Testing Skills
// =============================================================================

describe('Testing Skills', () => {
  test.todo('test skills by asking questions matching their descriptions', async () => {
    /**
     * From docs:
     *
     * ```typescript
     * for await (const message of query({
     *   prompt: "Extract text from invoice.pdf",
     *   options: {
     *     cwd: "/path/to/project",
     *     settingSources: ["user", "project"],
     *     allowedTools: ["Skill", "Read", "Bash"]
     *   }
     * })) {
     *   console.log(message);
     * }
     * ```
     *
     * Claude automatically invokes the relevant Skill if description matches
     */
  });
});

// =============================================================================
// Automatic Invocation
// =============================================================================

describe('Automatic Invocation', () => {
  test.todo('Claude autonomously chooses when to use skills', async () => {
    /**
     * From docs:
     *
     * Skills are:
     * 1. "Automatically discovered": Metadata loaded at startup
     * 2. "Model-invoked": Claude decides when to use based on context
     *
     * Unlike commands (user-invoked), skills are Claude-invoked
     */
  });

  test.todo('skill metadata discovered at startup, content loaded when triggered', async () => {
    /**
     * From docs:
     *
     * "Once filesystem settings are loaded, Skill metadata is discovered at
     * startup from user and project directories; full content loaded when triggered"
     *
     * This is for efficiency - don't load all skill content upfront
     */
  });
});

// =============================================================================
// Troubleshooting
// =============================================================================

describe('Skills Troubleshooting', () => {
  test.todo('skills not found: check settingSources', async () => {
    /**
     * Most common issue from docs:
     *
     * ```typescript
     * // WRONG - Skills won't be loaded
     * options: {
     *   allowedTools: ["Skill"]
     * }
     *
     * // CORRECT - Skills will be loaded
     * options: {
     *   settingSources: ["user", "project"],  // Required!
     *   allowedTools: ["Skill"]
     * }
     * ```
     */
  });

  test.todo('skills not found: verify filesystem location', async () => {
    /**
     * From docs:
     *
     * ```bash
     * # Check project Skills
     * ls .claude/skills/* /SKILL.md
     *
     * # Check personal Skills
     * ls ~/.claude/skills/* /SKILL.md
     * ```
     */
  });

  test.todo('skill not being used: check Skill in allowedTools', async () => {
    /**
     * From docs:
     *
     * "Check the Skill tool is enabled: Confirm 'Skill' is in your allowedTools."
     */
  });

  test.todo('skill not being used: check description quality', async () => {
    /**
     * From docs:
     *
     * "Check the description: Ensure it's specific and includes relevant keywords."
     *
     * Good description = Claude knows when to use the skill
     */
  });
});

// =============================================================================
// Skills vs Other Features
// =============================================================================

describe('Skills vs Other Features', () => {
  test.todo('skills vs commands comparison', async () => {
    /**
     * Skills:
     * - Model-invoked (Claude decides)
     * - Filesystem only (SKILL.md)
     * - Loaded at startup
     *
     * Commands:
     * - User-invoked (/command)
     * - Filesystem (.claude/commands/) or plugins
     * - Executed on demand
     */
  });

  test.todo('skills vs subagents comparison', async () => {
    /**
     * Skills:
     * - Filesystem only
     * - Lightweight - add capabilities
     * - No separate context
     *
     * Subagents:
     * - Programmatic or filesystem
     * - Separate agent instance
     * - Separate context window
     * - Can restrict tools per agent
     */
  });
});
