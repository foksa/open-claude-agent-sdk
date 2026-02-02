import { describe, expect, test } from 'bun:test';
import { version } from '../../src/index';

describe('Lite Claude Agent SDK', () => {
  test('exports version', () => {
    expect(version).toBe('0.0.0');
  });

  test('placeholder test for initial setup', () => {
    expect(true).toBe(true);
  });
});
