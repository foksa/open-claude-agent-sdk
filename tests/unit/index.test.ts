import { describe, expect, test } from 'bun:test';
import { version } from '../../src/index';

describe('Open Claude Agent SDK', () => {
  test('exports version', () => {
    expect(version).toBe('0.9.1');
  });

  test('placeholder test for initial setup', () => {
    expect(true).toBe(true);
  });
});
