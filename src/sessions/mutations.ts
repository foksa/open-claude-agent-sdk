/**
 * Session mutations (rename, tag, delete) — match the official SDK's
 * signatures, validation, error messages and on-disk effects.
 */

import { constants } from 'node:fs';
import { lstat, open, readdir, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import type { SessionMutationOptions } from '../types/index.ts';
import { getProjectsBaseDir, projectDirsForMutation, validateUuid } from './paths.ts';
import { sanitizeUnicode } from './text.ts';

function errorCode(err: unknown): string | undefined {
  return typeof err === 'object' && err !== null && 'code' in err ? String(err.code) : undefined;
}

/** Append to an existing non-empty transcript; false when there is none. */
async function tryAppend(filePath: string, data: string): Promise<boolean> {
  let fh: Awaited<ReturnType<typeof open>>;
  try {
    fh = await open(filePath, constants.O_WRONLY | constants.O_APPEND);
  } catch (err) {
    const code = errorCode(err);
    if (code === 'ENOENT' || code === 'ENOTDIR') return false;
    throw err;
  }
  try {
    const { size } = await fh.stat();
    if (size === 0) return false;
    // Windows ignores O_APPEND for positioned writes, so write at the end explicitly
    let position = process.platform === 'win32' ? size : undefined;
    const buf = Buffer.from(data, 'utf8');
    let written = 0;
    while (written < buf.length) {
      const { bytesWritten } = await fh.write(buf, written, buf.length - written, position);
      if (bytesWritten <= 0) {
        throw new Error(
          `tryAppend: short write to ${filePath} stalled with ${buf.length - written} bytes remaining`
        );
      }
      written += bytesWritten;
      if (position !== undefined) position += bytesWritten;
    }
    return true;
  } finally {
    await fh.close();
  }
}

async function appendToSession(
  sessionId: string,
  line: string,
  options: SessionMutationOptions
): Promise<void> {
  const fileName = `${sessionId}.jsonl`;
  if (options.dir) {
    for (const dir of await projectDirsForMutation(options.dir)) {
      if (await tryAppend(join(dir, fileName), line)) return;
    }
    throw new Error(`Session ${sessionId} not found in project directory for ${options.dir}`);
  }
  const base = getProjectsBaseDir();
  let names: string[];
  try {
    names = await readdir(base);
  } catch {
    throw new Error(`Session ${sessionId} not found (no projects directory)`);
  }
  for (const name of names) {
    if (await tryAppend(join(base, name, fileName), line)) return;
  }
  throw new Error(`Session ${sessionId} not found in any project directory`);
}

/** Rename a session by appending a `custom-title` entry to its transcript. */
export async function renameSession(
  sessionId: string,
  title: string,
  options: SessionMutationOptions = {}
): Promise<void> {
  if (!validateUuid(sessionId)) throw new Error(`Invalid sessionId: ${sessionId}`);
  if (!title.trim()) throw new Error('title must be non-empty');
  const line = `${JSON.stringify({ type: 'custom-title', customTitle: title.trim(), sessionId })}\n`;
  await appendToSession(sessionId, line, options);
}

/** Tag a session (or clear its tag with `null`) by appending a `tag` entry. */
export async function tagSession(
  sessionId: string,
  tag: string | null,
  options: SessionMutationOptions = {}
): Promise<void> {
  if (!validateUuid(sessionId)) throw new Error(`Invalid sessionId: ${sessionId}`);
  let value = tag;
  if (value !== null) {
    value = sanitizeUnicode(value).trim();
    if (!value) throw new Error('tag must be non-empty (use null to clear)');
  }
  const line = `${JSON.stringify({ type: 'tag', tag: value ?? '', sessionId })}\n`;
  await appendToSession(sessionId, line, options);
}

/** Windows reports these for a directory that is already on its way out. */
const WINDOWS_PENDING_DELETE = new Set(['EPERM', 'EACCES', 'EBUSY']);
const REMOVE_TREE_TRIES = 3;
const REMOVE_TREE_RETRY_MS = 50;

/**
 * Delete a directory tree and confirm it is gone, retrying while something
 * keeps writing into it; rejects with `ENOTEMPTY` after three tries
 * (official SDK, v0.3.319). `fs` is injectable for tests.
 * @internal
 */
export async function removeTree(
  path: string,
  fs: { rm: typeof rm; lstat: typeof lstat } = { rm, lstat }
): Promise<void> {
  for (let attempt = 1; ; attempt++) {
    let removed = true;
    try {
      await fs.rm(path, { recursive: true, force: true });
    } catch (err) {
      if (errorCode(err) !== 'ENOTEMPTY') throw err;
      removed = false;
    }
    try {
      await fs.lstat(path);
    } catch (err) {
      const code = errorCode(err);
      if (code === 'ENOENT' || code === 'ENOTDIR') return;
      if (removed && process.platform === 'win32' && code && WINDOWS_PENDING_DELETE.has(code)) {
        return;
      }
      throw err;
    }
    if (attempt === REMOVE_TREE_TRIES) {
      throw Object.assign(
        new Error(
          `'${path}' is still on disk after three tries to delete it. A program may be writing to it, such as a running Claude Code session, or you may not have permission to change it. Stop that program or fix the permissions, then delete it yourself.`
        ),
        { code: 'ENOTEMPTY' }
      );
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * REMOVE_TREE_RETRY_MS));
  }
}

/** Delete a session's transcript and its companion directory (subagents, tool results). */
export async function deleteSession(
  sessionId: string,
  options: SessionMutationOptions = {}
): Promise<void> {
  if (!validateUuid(sessionId)) throw new Error(`Invalid sessionId: ${sessionId}`);
  for (const dir of await projectDirsForMutation(options.dir)) {
    const filePath = join(dir, `${sessionId}.jsonl`);
    let size: number;
    try {
      ({ size } = await stat(filePath));
    } catch (err) {
      const code = errorCode(err);
      if (code === 'ENOENT' || code === 'ENOTDIR') continue;
      throw err;
    }
    if (size === 0) continue;
    await rm(filePath, { force: true });
    await removeTree(join(dir, sessionId));
    return;
  }
  throw new Error(
    options.dir
      ? `Session ${sessionId} not found in project directory for ${options.dir}`
      : `Session ${sessionId} not found in any project directory`
  );
}
