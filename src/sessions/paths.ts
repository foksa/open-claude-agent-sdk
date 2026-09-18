/**
 * Locating Claude Code session transcripts on disk.
 *
 * Ported from the official SDK's filesystem code paths so lookups agree with
 * the CLI byte-for-byte: project directory naming (including the long-path
 * hash suffix), worktree discovery, and head/tail reads of JSONL files.
 */

import { execFile } from 'node:child_process';
import { constants, type Dirent } from 'node:fs';
import { open, readdir, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Returns the id when it is a UUID, null otherwise. */
export function validateUuid(id: unknown): string | null {
  if (typeof id !== 'string') return null;
  return UUID_RE.test(id) ? id : null;
}

/** Bytes read from each end of a transcript for metadata extraction. */
export const HEAD_TAIL_BYTES = 65536;

/** Longest project directory name before a hash suffix is appended. */
const MAX_DIR_NAME = 200;

export const isWindows = (): boolean => process.platform === 'win32';

/** Case-insensitive filesystems (path comparisons fold case). */
export const isCaseInsensitiveFs = (): boolean =>
  process.platform === 'win32' || process.platform === 'darwin';

/** macOS returns decomposed unicode from the filesystem; the CLI normalizes to NFC. */
export function normalizePath(p: string): string {
  return process.platform === 'darwin' ? p.normalize('NFC') : p;
}

export function getConfigDir(): string {
  return (process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude')).normalize('NFC');
}

export function getProjectsBaseDir(): string {
  return join(getConfigDir(), 'projects');
}

/** 32-bit string hash the CLI uses for long project directory names. */
function stringHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return h;
}

/** Replace every non-alphanumeric character with `-`. */
export function sanitizePath(p: string): string {
  return p.replace(/[^a-zA-Z0-9]/g, '-');
}

/** Project directory name for a path, with a hash suffix when over 200 chars. */
export function projectDirName(projectPath: string): string {
  const name = sanitizePath(projectPath);
  if (name.length <= MAX_DIR_NAME) return name;
  return `${name.slice(0, MAX_DIR_NAME)}-${Math.abs(stringHash(projectPath)).toString(36)}`;
}

const DIR_NAME_OVERRIDE_RE = /^[A-Za-z0-9_-]{1,64}$/;
const RESERVED_WIN_NAME_RE = /^(?:con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;

/**
 * `CLAUDE_CODE_PROJECT_DIR_NAME` pins the project directory name, but only
 * when `CLAUDE_CONFIG_DIR` is also set (sandboxed hosts).
 */
function projectDirNameOverride(): string | undefined {
  if (!process.env.CLAUDE_CONFIG_DIR) return undefined;
  const name = process.env.CLAUDE_CODE_PROJECT_DIR_NAME;
  if (!name || !DIR_NAME_OVERRIDE_RE.test(name) || RESERVED_WIN_NAME_RE.test(name)) {
    return undefined;
  }
  return name;
}

/** Directory name the CLI writes a project's sessions under. */
export function resolvedProjectDirName(projectPath: string): string {
  return projectDirNameOverride() ?? projectDirName(projectPath);
}

/** Canonicalize a directory: realpath when it exists, NFC on macOS. */
export async function canonicalizePath(p: string): Promise<string> {
  try {
    return normalizePath(await realpath(p));
  } catch {
    return normalizePath(p);
  }
}

/** Paths of all git worktrees of the repository containing `dir`. */
export async function getWorktreePaths(dir: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync(
      'git',
      [
        '-c',
        'core.hooksPath=/dev/null',
        '-c',
        'core.fsmonitor=',
        'worktree',
        'list',
        '--porcelain',
      ],
      { cwd: dir, timeout: 5000, windowsHide: true }
    );
    if (!stdout) return [];
    return stdout
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => normalizePath(line.slice(9)));
  } catch {
    return [];
  }
}

export type HeadTail = { head: string; tail: string; mtime: number; size: number };

/**
 * Read the first and last 64KB of a file. Returns null for missing, empty or
 * non-regular files (symlinks are not followed).
 */
export async function readHeadTail(filePath: string): Promise<HeadTail | null> {
  const flags = isWindows()
    ? constants.O_RDONLY
    : constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
  try {
    const fh = await open(filePath, flags);
    try {
      const st = await fh.stat();
      if (!st.isFile()) return null;
      const buf = Buffer.allocUnsafe(HEAD_TAIL_BYTES);
      const first = await fh.read(buf, 0, HEAD_TAIL_BYTES, 0);
      if (first.bytesRead === 0) return null;
      const head = buf.toString('utf8', 0, first.bytesRead);
      const tailStart = Math.max(0, st.size - HEAD_TAIL_BYTES);
      let tail = head;
      if (tailStart > 0) {
        const last = await fh.read(buf, 0, HEAD_TAIL_BYTES, tailStart);
        tail = buf.toString('utf8', 0, last.bytesRead);
      }
      return { head, tail, mtime: st.mtime.getTime(), size: st.size };
    } finally {
      await fh.close();
    }
  } catch {
    return null;
  }
}

/** First JSONL line containing `"key":` whose parsed value is a string. */
export function firstParsedStringField(text: string, key: string): string | undefined {
  const needle = `"${key}":`;
  let offset = 0;
  while (offset < text.length) {
    const nl = text.indexOf('\n', offset);
    const line = nl < 0 ? text.slice(offset) : text.slice(offset, nl);
    offset = nl < 0 ? text.length : nl + 1;
    if (!line.includes(needle)) continue;
    try {
      const value = JSON.parse(line)?.[key];
      if (typeof value === 'string') return value;
    } catch {}
  }
  return undefined;
}

/** Last JSONL line (optionally of `type`) whose parsed `key` is a string. */
export function lastParsedStringField(
  text: string,
  type: string | undefined,
  key: string
): string | undefined {
  const typeNeedle = type === undefined ? undefined : `"type":"${type}"`;
  const keyNeedle = `"${key}":`;
  let end = text.length;
  while (end > 0) {
    const nl = text.lastIndexOf('\n', end - 1);
    const line = text.slice(nl + 1, end);
    end = nl;
    if (line.includes(keyNeedle) && (typeNeedle === undefined || line.includes(typeNeedle))) {
      try {
        const entry = JSON.parse(line);
        if (
          typeof entry === 'object' &&
          entry !== null &&
          (type === undefined || entry.type === type)
        ) {
          const value = entry[key];
          if (typeof value === 'string') return value;
        }
      } catch {}
    }
    if (nl < 0) break;
  }
  return undefined;
}

/** The session's working directory: a later `relocated` entry wins over the first `cwd`. */
export function recordedCwd(ht: HeadTail): string | undefined {
  return (
    lastParsedStringField(ht.tail, 'relocated', 'relocatedCwd') ??
    firstParsedStringField(ht.head, 'cwd')
  );
}

/**
 * Whether a long-path project directory (one whose name was truncated and
 * hashed) holds sessions recorded for `projectPath`.
 */
export async function dirHoldsProject(
  dir: string,
  projectPath: string,
  caseInsensitive: boolean
): Promise<boolean> {
  const want = sanitizePath(projectPath);
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return false;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.jsonl')) continue;
    const ht = await readHeadTail(join(dir, entry.name));
    if (ht === null) continue;
    if (cwdMatches(ht, want, caseInsensitive)) return true;
  }
  return false;
}

export function cwdMatches(
  ht: HeadTail,
  sanitizedProject: string,
  caseInsensitive: boolean
): boolean {
  const cwd = recordedCwd(ht);
  if (cwd === undefined) return false;
  const got = sanitizePath(normalizePath(cwd));
  return caseInsensitive
    ? got.toLowerCase() === sanitizedProject.toLowerCase()
    : got === sanitizedProject;
}

/** Existing project directories that may hold sessions for `projectPath`. */
export async function findProjectDirs(
  projectPath: string,
  base: string = getProjectsBaseDir()
): Promise<string[]> {
  const exact = join(base, resolvedProjectDirName(projectPath));
  const dirs: string[] = [];
  try {
    await readdir(exact);
    dirs.push(exact);
  } catch {}

  // With a dir-name override active, also look under the natural name
  const natural = projectDirName(projectPath);
  if (natural !== resolvedProjectDirName(projectPath)) {
    const naturalDir = join(base, natural);
    try {
      await readdir(naturalDir);
      dirs.push(naturalDir);
    } catch {}
    return dirs;
  }

  if (natural.length <= MAX_DIR_NAME) return dirs;

  // Long paths: the hash suffix may differ across runtimes, so match any
  // directory with the same truncated prefix whose sessions record this cwd
  const win = isWindows();
  const fold = (s: string) => (win ? s.toLowerCase() : s);
  const prefix = fold(`${natural.slice(0, MAX_DIR_NAME)}-`);
  const exactFolded = fold(exact);
  try {
    for (const entry of await readdir(base, { withFileTypes: true })) {
      if (!entry.isDirectory() || !fold(entry.name).startsWith(prefix)) continue;
      const dir = join(base, entry.name);
      if (fold(dir) !== exactFolded && (await dirHoldsProject(dir, projectPath, win))) {
        dirs.push(dir);
      }
    }
  } catch {}
  return dirs;
}

/**
 * On Windows a mapped/SUBST drive path and its resolved UNC/target path both
 * need searching; elsewhere only the canonical path.
 */
export function pathVariants(original: string, canonical: string): string[] {
  if (!isWindows()) return [canonical];
  const match = /^([A-Za-z]):[\\/]+(.*)$/s.exec(original);
  if (match === null) return [canonical];
  const [, drive = '', rest = ''] = match;
  const trimmed = rest.replace(/[\\/]+$/, '');
  const origParts = trimmed === '' ? [] : trimmed.split(/[\\/]+/);
  const canonParts = canonical.replace(/[\\/]+$/, '').split(/[\\/]+/);
  const offset = canonParts.length - origParts.length;
  const same = (a: string | undefined, b: string | undefined) =>
    a !== undefined &&
    b !== undefined &&
    a.length === b.length &&
    a.toLowerCase() === b.toLowerCase();
  if (
    offset < 1 ||
    !origParts.every((part, i) => same(part, canonParts[offset + i])) ||
    (offset === 1 && same(canonParts[0], `${drive}:`))
  ) {
    return [canonical];
  }
  return [canonical, `${drive}:\\${origParts.join('\\')}`];
}

export type SessionFile = { filePath: string; projectPath: string | undefined; fileSize: number };

/**
 * Find a session's non-empty transcript. With `dir`, searches that project
 * and its git worktrees; otherwise every project directory.
 */
export async function findSessionFile(
  sessionId: string,
  dir?: string,
  base: string = getProjectsBaseDir()
): Promise<SessionFile | undefined> {
  const fileName = `${sessionId}.jsonl`;

  async function tryDir(projectDir: string, projectPath: string | undefined) {
    const filePath = join(projectDir, fileName);
    try {
      const st = await stat(filePath);
      if (st.size > 0) return { filePath, projectPath, fileSize: st.size };
    } catch {}
    return undefined;
  }

  if (dir) {
    const canonical = await canonicalizePath(dir);
    const seen = new Set<string>();
    for (const variant of pathVariants(dir, canonical)) {
      for (const projectDir of await findProjectDirs(variant, base)) {
        const key = isWindows() ? projectDir.toLowerCase() : projectDir;
        if (seen.has(key)) continue;
        seen.add(key);
        const found = await tryDir(projectDir, variant);
        if (found) return found;
      }
    }
    for (const worktree of await getWorktreePaths(canonical)) {
      if (worktree === canonical) continue;
      for (const projectDir of await findProjectDirs(worktree, base)) {
        const found = await tryDir(projectDir, worktree);
        if (found) return found;
      }
    }
    return undefined;
  }

  let names: string[];
  try {
    names = await readdir(base);
  } catch {
    return undefined;
  }
  for (const name of names) {
    const found = await tryDir(join(base, name), undefined);
    if (found) return found;
  }
  return undefined;
}

/**
 * Project directories to search for a mutation (rename/tag/delete/fork):
 * `dir` and its worktrees, or every project directory.
 */
export async function projectDirsForMutation(
  dir: string | undefined,
  base: string = getProjectsBaseDir()
): Promise<string[]> {
  if (dir) {
    const canonical = await canonicalizePath(dir);
    const dirs = await findProjectDirs(canonical, base);
    for (const worktree of await getWorktreePaths(canonical)) {
      if (worktree === canonical) continue;
      dirs.push(...(await findProjectDirs(worktree, base)));
    }
    return dirs;
  }
  try {
    return (await readdir(base, { withFileTypes: true }))
      .filter((e) => e.isDirectory() || e.isSymbolicLink())
      .map((e) => join(base, e.name));
  } catch {
    return [];
  }
}
