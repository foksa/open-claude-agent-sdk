import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { version as indexVersion } from '../../src/index';
import { version as queryVersion } from '../../src/query';

describe('version consistency', () => {
  test('package.json, src/index.ts, and src/query.ts all export the same version', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, '../../package.json'), 'utf8'));
    expect(indexVersion).toBe(pkg.version);
    expect(queryVersion).toBe(pkg.version);
  });
});
