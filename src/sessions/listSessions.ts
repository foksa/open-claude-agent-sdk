/**
 * List sessions with metadata — matches official SDK signature.
 *
 * When `dir` is provided, returns sessions for that project directory
 * and its git worktrees. When omitted, returns sessions across all projects.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { ListSessionsOptions, SDKSessionInfo } from '../types/index.ts';
import {
  deduplicateSessions,
  getProjectStorageDirs,
  getProjectsBaseDir,
  scanProjectDir,
} from './utils.ts';

export async function listSessions(options?: ListSessionsOptions): Promise<SDKSessionInfo[]> {
  const { dir, limit } = options ?? {};

  const sessions = dir ? await listForProject(dir) : await listAllProjects();

  sessions.sort((a, b) => b.lastModified - a.lastModified);

  if (limit !== undefined && limit > 0) {
    return sessions.slice(0, limit);
  }
  return sessions;
}

async function listForProject(dir: string): Promise<SDKSessionInfo[]> {
  const storageDirs = await getProjectStorageDirs(dir);

  const allSessions = await Promise.all(
    storageDirs.map(({ storagePath, cwd }) => scanProjectDir(storagePath, cwd))
  );

  return deduplicateSessions(allSessions.flat());
}

async function listAllProjects(): Promise<SDKSessionInfo[]> {
  const baseDir = getProjectsBaseDir();

  let entries: string[];
  try {
    const dirents = await readdir(baseDir, { withFileTypes: true });
    entries = dirents.filter((d) => d.isDirectory()).map((d) => join(baseDir, d.name));
  } catch {
    return [];
  }

  const allSessions = await Promise.all(entries.map((dir) => scanProjectDir(dir)));
  return deduplicateSessions(allSessions.flat());
}
