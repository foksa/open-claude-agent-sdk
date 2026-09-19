import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { COMPATIBLE_SDK_VERSION } from '../../src/constants';
import { version as indexVersion } from '../../src/index';
import { version as queryVersion } from '../../src/query';

describe('version consistency', () => {
  test('package.json, src/index.ts, and src/query.ts all export the same version', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, '../../package.json'), 'utf8'));
    expect(indexVersion).toBe(pkg.version);
    expect(queryVersion).toBe(pkg.version);
  });

  test('COMPATIBLE_SDK_VERSION and the peer range track the pinned official SDK', () => {
    const pkg = JSON.parse(readFileSync(join(import.meta.dir, '../../package.json'), 'utf8'));
    const pinned = pkg.devDependencies['@anthropic-ai/claude-agent-sdk'];
    expect(COMPATIBLE_SDK_VERSION).toBe(pinned);
    expect(pkg.peerDependencies['@anthropic-ai/claude-agent-sdk']).toBe(`^${pinned}`);
  });
});
