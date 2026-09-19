/**
 * List sessions with metadata — matches the official SDK's signature and
 * results, including `offset`, `includeWorktrees` and `includeProgrammatic`.
 */

import { readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import type { ListSessionsOptions, SDKSessionInfo } from '../types/index.ts';
import {
  canonicalizePath,
  dirHoldsProject,
  findProjectDirs,
  getProjectsBaseDir,
  getWorktreePaths,
  isCaseInsensitiveFs,
  isWindows,
  pathVariants,
  readHeadTail,
  recordedCwd,
  resolvedProjectDirName,
  validateUuid,
} from './paths.ts';
import {
  belongsToCollidingProject,
  continuationExists,
  continuedInSessionId,
  isInsideWorktrees,
  isProgrammaticSession,
  parseSessionInfo,
  readSidecarTitle,
} from './sessionInfo.ts';
import { lastStringField } from './text.ts';

type Candidate = {
  sessionId: string;
  filePath: string;
  mtime: number;
  projectPath: string | undefined;
  ownWorktrees: string[] | undefined;
};

const MAX_DIR_NAME = 200;
const BATCH_SIZE = 32;

async function candidatesInDir(
  dir: string,
  loadMtime: boolean,
  projectPath: string | undefined,
  ownWorktrees?: string[]
): Promise<Candidate[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const results = await Promise.all(
    names.map(async (name): Promise<Candidate | null> => {
      if (!name.endsWith('.jsonl')) return null;
      const sessionId = validateUuid(name.slice(0, -6));
      if (!sessionId) return null;
      const filePath = join(dir, name);
      if (!loadMtime) return { sessionId, filePath, mtime: 0, projectPath, ownWorktrees };
      try {
        const st = await stat(filePath);
        return { sessionId, filePath, mtime: st.mtime.getTime(), projectPath, ownWorktrees };
      } catch {
        return null;
      }
    })
  );
  return results.filter((r): r is Candidate => r !== null);
}

async function loadCandidate(
  candidate: Candidate,
  includeProgrammatic: boolean
): Promise<SDKSessionInfo | null> {
  const ht = await readHeadTail(candidate.filePath);
  if (!ht) return null;
  if (!includeProgrammatic && isProgrammaticSession(ht.head, ht.tail)) return null;

  const continuedIn = continuedInSessionId(ht.tail);
  if (continuedIn !== undefined && (await continuationExists(candidate.filePath, continuedIn))) {
    return null;
  }

  const sidecarTitle =
    lastStringField(ht.tail, 'customTitle') === undefined
      ? await readSidecarTitle(candidate.filePath, candidate.sessionId)
      : undefined;
  const info = parseSessionInfo(candidate.sessionId, ht, candidate.projectPath, sidecarTitle);
  if (!info) return null;

  const cwd = recordedCwd(ht);
  const caseInsensitive = isCaseInsensitiveFs();
  if (
    cwd !== undefined &&
    candidate.projectPath !== undefined &&
    !isInsideWorktrees(cwd, candidate.ownWorktrees, caseInsensitive) &&
    (await belongsToCollidingProject(cwd, candidate.projectPath, caseInsensitive))
  ) {
    return null;
  }

  if (candidate.mtime) info.lastModified = candidate.mtime;
  return info;
}

function byRecencyDesc(
  a: { lastModified: number; sessionId: string },
  b: { lastModified: number; sessionId: string }
): number {
  if (b.lastModified !== a.lastModified) return b.lastModified - a.lastModified;
  return b.sessionId < a.sessionId ? -1 : b.sessionId > a.sessionId ? 1 : 0;
}

/** Unpaginated: load everything, keep the newest copy of each session. */
async function loadAll(
  candidates: Candidate[],
  includeProgrammatic: boolean
): Promise<SDKSessionInfo[]> {
  const infos = await Promise.all(candidates.map((c) => loadCandidate(c, includeProgrammatic)));
  const byId = new Map<string, SDKSessionInfo>();
  for (const info of infos) {
    if (!info) continue;
    const existing = byId.get(info.sessionId);
    if (!existing || info.lastModified > existing.lastModified) byId.set(info.sessionId, info);
  }
  return [...byId.values()].sort(byRecencyDesc);
}

/** Paginated: order by file mtime, then load in batches until the page is full. */
async function loadPage(
  candidates: Candidate[],
  limit: number | undefined,
  offset: number,
  includeProgrammatic: boolean
): Promise<SDKSessionInfo[]> {
  candidates.sort((a, b) =>
    byRecencyDesc(
      { lastModified: a.mtime, sessionId: a.sessionId },
      { lastModified: b.mtime, sessionId: b.sessionId }
    )
  );
  const page: SDKSessionInfo[] = [];
  const max = limit && limit > 0 ? limit : Number.POSITIVE_INFINITY;
  const seen = new Set<string>();
  let skipped = 0;
  for (let i = 0; i < candidates.length && page.length < max; ) {
    const batch = candidates.slice(i, Math.min(i + BATCH_SIZE, candidates.length));
    const infos = await Promise.all(batch.map((c) => loadCandidate(c, includeProgrammatic)));
    for (let j = 0; j < infos.length && page.length < max; j++) {
      i++;
      const info = infos[j];
      if (!info || seen.has(info.sessionId)) continue;
      seen.add(info.sessionId);
      if (skipped < offset) {
        skipped++;
        continue;
      }
      page.push(info);
    }
  }
  return page;
}

async function candidatesForPaths(
  paths: string[],
  loadMtime: boolean,
  base: string
): Promise<Candidate[]> {
  const win = isWindows();
  const dirs: { projectDir: string; projectPath: string }[] = [];
  const seen = new Set<string>();
  for (const projectPath of paths) {
    for (const projectDir of await findProjectDirs(projectPath, base)) {
      const key = win ? projectDir.toLowerCase() : projectDir;
      if (seen.has(key)) continue;
      seen.add(key);
      dirs.push({ projectDir, projectPath });
    }
  }
  const out: Candidate[] = [];
  for (const { projectDir, projectPath } of dirs) {
    out.push(...(await candidatesInDir(projectDir, loadMtime, projectPath)));
  }
  return out;
}

async function candidatesForProject(
  dir: string,
  includeWorktrees: boolean,
  loadMtime: boolean,
  base: string
): Promise<Candidate[]> {
  const canonical = await canonicalizePath(dir);
  const paths = pathVariants(dir, canonical);
  const worktrees = includeWorktrees ? await getWorktreePaths(canonical) : [];
  if (worktrees.length <= 1) return candidatesForPaths(paths, loadMtime, base);

  const win = isWindows();
  const fold = (s: string) => (win ? s.toLowerCase() : s);
  const worktreeNames = worktrees
    .map((path) => {
      const name = resolvedProjectDirName(path);
      const exactName = fold(name);
      return {
        path,
        exactName,
        truncatedPrefix: name.length > MAX_DIR_NAME ? exactName.slice(0, MAX_DIR_NAME) : undefined,
      };
    })
    .sort((a, b) => b.exactName.length - a.exactName.length);

  let dirNames: string[];
  try {
    dirNames = (await readdir(base, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return candidatesForPaths(paths, loadMtime, base);
  }

  const out: Candidate[] = [];
  const seen = new Set<string>();
  const ownWorktrees = [...paths, ...worktrees];
  for (const projectPath of paths) {
    for (const projectDir of await findProjectDirs(projectPath, base)) {
      const key = fold(basename(projectDir));
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(...(await candidatesInDir(projectDir, loadMtime, projectPath, ownWorktrees)));
    }
  }
  for (const name of dirNames) {
    const key = fold(name);
    if (seen.has(key)) continue;
    for (const { path, exactName, truncatedPrefix } of worktreeNames) {
      if (
        key === exactName ||
        (truncatedPrefix !== undefined &&
          key.startsWith(`${truncatedPrefix}-`) &&
          (await dirHoldsProject(join(base, name), path, win)))
      ) {
        seen.add(key);
        out.push(...(await candidatesInDir(join(base, name), loadMtime, path, ownWorktrees)));
        break;
      }
    }
  }
  return out;
}

async function candidatesForAllProjects(loadMtime: boolean, base: string): Promise<Candidate[]> {
  let dirNames: string[];
  try {
    dirNames = (await readdir(base, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
  const all = await Promise.all(
    dirNames.map((name) => candidatesInDir(join(base, name), loadMtime, undefined))
  );
  return all.flat();
}

export async function listSessions(options?: ListSessionsOptions): Promise<SDKSessionInfo[]> {
  const { dir, limit, offset, includeWorktrees, includeProgrammatic } = options ?? {};
  const skip = offset ?? 0;
  const paginated = (limit !== undefined && limit > 0) || skip > 0;
  const base = getProjectsBaseDir();
  const candidates = dir
    ? await candidatesForProject(dir, includeWorktrees ?? true, paginated, base)
    : await candidatesForAllProjects(paginated, base);
  if (!paginated) return loadAll(candidates, includeProgrammatic ?? true);
  return loadPage(candidates, limit, skip, includeProgrammatic ?? true);
}
