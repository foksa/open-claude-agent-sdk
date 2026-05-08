#!/usr/bin/env bun
/**
 * Bump the SDK version in all three places that must stay in sync:
 *   - package.json
 *   - src/index.ts   (export const version = '...')
 *   - src/query.ts   (export const version = '...')
 *
 * tests/unit/index.test.ts asserts they match.
 *
 * Usage:
 *   bun scripts/bump-version.ts 0.28.0
 *   bun run bump 0.28.0
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO_ROOT = resolve(import.meta.dir, '..');
const PKG = resolve(REPO_ROOT, 'package.json');
const INDEX = resolve(REPO_ROOT, 'src/index.ts');
const QUERY = resolve(REPO_ROOT, 'src/query.ts');

const next = process.argv[2];
if (!next) {
  console.error('Usage: bun scripts/bump-version.ts <new-version>');
  process.exit(2);
}
if (!/^\d+\.\d+\.\d+(?:-[\w.]+)?$/.test(next)) {
  console.error(`Not a valid semver: ${next}`);
  process.exit(2);
}

const VERSION_LINE = /export const version = '([^']+)';/;

const pkgRaw = readFileSync(PKG, 'utf8');
const pkg = JSON.parse(pkgRaw);
const indexSrc = readFileSync(INDEX, 'utf8');
const querySrc = readFileSync(QUERY, 'utf8');

const indexMatch = indexSrc.match(VERSION_LINE);
const queryMatch = querySrc.match(VERSION_LINE);
if (!indexMatch) {
  console.error(`Could not find version line in ${INDEX}`);
  process.exit(1);
}
if (!queryMatch) {
  console.error(`Could not find version line in ${QUERY}`);
  process.exit(1);
}

const current = { pkg: pkg.version, index: indexMatch[1], query: queryMatch[1] };
if (current.pkg !== current.index || current.pkg !== current.query) {
  console.error('Versions are out of sync before bump:');
  console.error(`  package.json:  ${current.pkg}`);
  console.error(`  src/index.ts:  ${current.index}`);
  console.error(`  src/query.ts:  ${current.query}`);
  console.error('Fix manually first, then re-run.');
  process.exit(1);
}

if (current.pkg === next) {
  console.log(`Already at ${next} — nothing to do.`);
  process.exit(0);
}

pkg.version = next;
writeFileSync(PKG, `${JSON.stringify(pkg, null, 2)}\n`);
writeFileSync(INDEX, indexSrc.replace(VERSION_LINE, `export const version = '${next}';`));
writeFileSync(QUERY, querySrc.replace(VERSION_LINE, `export const version = '${next}';`));

console.log(`Bumped ${current.pkg} → ${next}`);
console.log('  package.json');
console.log('  src/index.ts');
console.log('  src/query.ts');
console.log('\nNext: review the diff, commit, then `gh release create v' + next + ' --generate-notes`');
