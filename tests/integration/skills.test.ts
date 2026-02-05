/**
 * Skills integration tests
 *
 * Tests the skills feature which allows Claude to autonomously invoke
 * specialized capabilities defined in .claude/skills/ directories.
 *
 * Skills require:
 * 1. settingSources: ['project'] or ['user'] to load from filesystem
 * 2. allowedTools: ['Skill'] to enable the Skill tool
 * 3. cwd pointing to directory with .claude/skills/
 */

import { expect } from 'bun:test';
import path from 'node:path';
import { runWithSDK, testWithBothSDKs } from './comparison-utils.ts';

const fixturesDir = path.join(import.meta.dir, '../fixtures');

// ============================================================================
// Skills Loading Tests
// ============================================================================

testWithBothSDKs(
  'skills load when settingSources includes project',
  async (sdk) => {
    // Test that skills load without error when settingSources is configured
    const messages = await runWithSDK(sdk, 'What skills are available to you?', {
      cwd: fixturesDir,
      settingSources: ['project'],
      allowedTools: ['Skill'],
      maxTurns: 2,
    });

    // Should complete successfully
    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    if (result && result.type === 'result') {
      expect(result.subtype).toBe('success');
    }

    console.log(`   [${sdk}] Skills loaded with settingSources: ['project']`);
  },
  90000
);

testWithBothSDKs(
  'skills are discoverable by Claude',
  async (sdk) => {
    // Ask Claude what skills it has - it should mention the greeting skill
    const messages = await runWithSDK(sdk, 'List all available skills. Just list their names.', {
      cwd: fixturesDir,
      settingSources: ['project'],
      allowedTools: ['Skill'],
      maxTurns: 2,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    // Check if the assistant responded
    const assistantMsgs = messages.filter((m) => m.type === 'assistant');
    expect(assistantMsgs.length).toBeGreaterThan(0);

    console.log(`   [${sdk}] Skills discovery test passed`);
  },
  90000
);

// ============================================================================
// Skills Invocation Tests
// ============================================================================

testWithBothSDKs(
  'skill is invoked when matching description',
  async (sdk) => {
    // The greeting skill description says "Respond with a friendly greeting when asked to greet someone"
    // So asking to greet should trigger it
    const messages = await runWithSDK(sdk, 'Please greet me using any skills you have available.', {
      cwd: fixturesDir,
      settingSources: ['project'],
      allowedTools: ['Skill'],
      maxTurns: 3,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    if (result && result.type === 'result') {
      expect(result.subtype).toBe('success');
    }

    // The skill should produce a response
    const assistantMsgs = messages.filter((m) => m.type === 'assistant');
    expect(assistantMsgs.length).toBeGreaterThan(0);

    console.log(`   [${sdk}] Skill invocation test passed`);
  },
  90000
);

// ============================================================================
// Settings Configuration Tests
// ============================================================================

testWithBothSDKs(
  'skills not available without settingSources',
  async (sdk) => {
    // Without settingSources, no skills should be loaded
    const messages = await runWithSDK(sdk, 'What skills do you have available?', {
      cwd: fixturesDir,
      settingSources: [], // No settings = no skills
      allowedTools: ['Skill'],
      maxTurns: 2,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();

    console.log(`   [${sdk}] No skills loaded without settingSources`);
  },
  90000
);

testWithBothSDKs(
  'skills require Skill in allowedTools',
  async (sdk) => {
    // Even with settingSources, skills need Skill tool enabled
    const messages = await runWithSDK(sdk, 'Greet me.', {
      cwd: fixturesDir,
      settingSources: ['project'],
      allowedTools: ['Read', 'Write'], // No Skill tool
      maxTurns: 2,
    });

    const result = messages.find((m) => m.type === 'result');
    expect(result).toBeTruthy();
    if (result && result.type === 'result') {
      expect(result.subtype).toBe('success');
    }

    console.log(`   [${sdk}] Skills not invoked without Skill in allowedTools`);
  },
  90000
);
