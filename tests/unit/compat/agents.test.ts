/**
 * Agents init message compatibility tests
 *
 * Verifies that agents option produces matching init messages.
 */

import { describe, expect, test } from 'bun:test';
import { capture, officialQuery, openQuery } from './capture-utils.ts';

describe('agents init message compatibility', () => {
  test.concurrent(
    'agents in init message matches official SDK',
    async () => {
      const agents = {
        'test-reviewer': {
          description: 'Test code reviewer',
          prompt: 'You are a test reviewer.',
          tools: ['Read', 'Grep'],
          model: 'sonnet' as const,
        },
      };

      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { agents }),
        capture(officialQuery, 'test', { agents }),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Both should have agents in the init request
      expect(openInit?.request?.agents).toEqual(agents);
      expect(officialInit?.request?.agents).toEqual(agents);

      console.log('   agents in init message matches');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'no agents field when agents option is not provided',
    async () => {
      const [open, official] = await Promise.all([
        capture(openQuery, 'test'),
        capture(officialQuery, 'test'),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      // Neither should have agents
      expect(openInit?.request?.agents).toBeUndefined();
      expect(officialInit?.request?.agents).toBeUndefined();

      console.log('   no agents field when not provided');
    },
    { timeout: 60000 }
  );

  test.concurrent(
    'multiple agents in init message match official SDK',
    async () => {
      const agents = {
        'code-reviewer': {
          description: 'Expert code reviewer',
          prompt: 'You review code for quality.',
          tools: ['Read', 'Grep', 'Glob'],
          model: 'opus' as const,
        },
        'test-writer': {
          description: 'Test writer specialist',
          prompt: 'You write comprehensive tests.',
        },
      };

      const [open, official] = await Promise.all([
        capture(openQuery, 'test', { agents }),
        capture(officialQuery, 'test', { agents }),
      ]);

      const openInit = open.stdin.find((m) => m.request?.subtype === 'initialize');
      const officialInit = official.stdin.find((m) => m.request?.subtype === 'initialize');

      expect(openInit).toBeTruthy();
      expect(officialInit).toBeTruthy();

      expect(openInit?.request?.agents).toEqual(agents);
      expect(officialInit?.request?.agents).toEqual(agents);

      console.log('   multiple agents in init message match');
    },
    { timeout: 60000 }
  );
});
