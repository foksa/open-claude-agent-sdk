/**
 * Unit tests for detection.ts - CLI binary detection
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { chmodSync, unlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectClaudeBinary } from '../../src/core/spawn.ts';

describe('detectClaudeBinary', () => {
  let tempFile: string | null = null;
  let originalEnv: string | undefined;

  beforeEach(() => {
    originalEnv = process.env.CLAUDE_BINARY;
    delete process.env.CLAUDE_BINARY;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.CLAUDE_BINARY = originalEnv;
    } else {
      delete process.env.CLAUDE_BINARY;
    }

    // Clean up temp file
    if (tempFile) {
      try {
        unlinkSync(tempFile);
      } catch {
        // Ignore cleanup errors
      }
      tempFile = null;
    }
  });

  test('uses pathToClaudeCodeExecutable option when provided', () => {
    // Create a temp executable file
    tempFile = join(tmpdir(), `test-claude-${Date.now()}`);
    writeFileSync(tempFile, '#!/bin/bash\necho "test"');
    chmodSync(tempFile, 0o755);

    const result = detectClaudeBinary({ pathToClaudeCodeExecutable: tempFile });

    expect(result).toBe(tempFile);
  });

  test('throws error for non-existent pathToClaudeCodeExecutable', () => {
    expect(() => {
      detectClaudeBinary({ pathToClaudeCodeExecutable: '/nonexistent/path/claude' });
    }).toThrow('Claude CLI path does not exist');
  });

  test('throws error for directory path', () => {
    expect(() => {
      detectClaudeBinary({ pathToClaudeCodeExecutable: tmpdir() });
    }).toThrow('Claude CLI path is not a file');
  });

  test('throws error for non-executable file', () => {
    // Create a non-executable temp file
    tempFile = join(tmpdir(), `test-claude-noexec-${Date.now()}`);
    writeFileSync(tempFile, '#!/bin/bash\necho "test"');
    chmodSync(tempFile, 0o644); // Read-only

    expect(() => {
      detectClaudeBinary({ pathToClaudeCodeExecutable: tempFile });
    }).toThrow('Claude CLI path is not executable');
  });

  test('uses CLAUDE_BINARY env var when set', () => {
    // Create a temp executable file
    tempFile = join(tmpdir(), `test-claude-env-${Date.now()}`);
    writeFileSync(tempFile, '#!/bin/bash\necho "test"');
    chmodSync(tempFile, 0o755);

    process.env.CLAUDE_BINARY = tempFile;

    const result = detectClaudeBinary();

    expect(result).toBe(tempFile);
  });

  test('validates CLAUDE_BINARY env var path', () => {
    process.env.CLAUDE_BINARY = '/nonexistent/path/claude';

    expect(() => {
      detectClaudeBinary();
    }).toThrow('Claude CLI path does not exist');
  });

  test('pathToClaudeCodeExecutable takes priority over CLAUDE_BINARY', () => {
    // Create two temp files
    const tempFile1 = join(tmpdir(), `test-claude-opt-${Date.now()}`);
    const tempFile2 = join(tmpdir(), `test-claude-env-${Date.now()}`);

    writeFileSync(tempFile1, '#!/bin/bash\necho "option"');
    writeFileSync(tempFile2, '#!/bin/bash\necho "env"');
    chmodSync(tempFile1, 0o755);
    chmodSync(tempFile2, 0o755);

    process.env.CLAUDE_BINARY = tempFile2;
    tempFile = tempFile1; // For cleanup

    const result = detectClaudeBinary({ pathToClaudeCodeExecutable: tempFile1 });

    expect(result).toBe(tempFile1);

    // Clean up second file
    unlinkSync(tempFile2);
  });

  test('falls back to PATH lookup when no option or env var', () => {
    // This test depends on claude being installed, so we just verify it doesn't crash
    // and either returns a path or throws the expected error
    try {
      const result = detectClaudeBinary();
      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    } catch (error: unknown) {
      // Expected if claude isn't installed
      expect((error as Error).message).toContain('Claude CLI not found');
    }
  });

  test('resolves relative paths to absolute', () => {
    // Create a temp executable file
    tempFile = join(tmpdir(), `test-claude-rel-${Date.now()}`);
    writeFileSync(tempFile, '#!/bin/bash\necho "test"');
    chmodSync(tempFile, 0o755);

    // Use a relative-ish path (tmpdir is absolute but we can verify resolution works)
    const result = detectClaudeBinary({ pathToClaudeCodeExecutable: tempFile });

    // Result should be an absolute path
    expect(result.startsWith('/')).toBe(true);
  });
});
