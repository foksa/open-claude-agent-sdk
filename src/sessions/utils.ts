/**
 * Shared utilities for session file operations.
 * Mirrors the official SDK's approach to reading session JSONL files.
 */

import { execFile } from 'node:child_process';
import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID. Returns the string if valid, null otherwise.
 */
export function validateUuid(id: string): string | null {
  if (typeof id !== 'string') return null;
  return UUID_RE.test(id) ? id : null;
}

const MAX_FOLDER_NAME_LENGTH = 200;

/**
 * Simple string hash matching the official SDK's JS fallback (dq).
 * Used when Bun.hash is unavailable.
 */
function jsHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

/**
 * Encode a project path the same way Claude CLI does:
 * replace every non-alphanumeric character with `-`.
 * For long paths (>200 chars encoded), append a deterministic hash suffix.
 */
function encodePath(projectPath: string): string {
  const encoded = projectPath.replace(/[^a-zA-Z0-9]/g, '-');
  if (encoded.length <= MAX_FOLDER_NAME_LENGTH) return encoded;
  const hash =
    typeof Bun !== 'undefined' ? Bun.hash(projectPath).toString(36) : jsHash(projectPath);
  return `${encoded.slice(0, MAX_FOLDER_NAME_LENGTH)}-${hash}`;
}

/**
 * Get the base projects directory.
 * Respects CLAUDE_CONFIG_DIR env var, falls back to ~/.claude/projects/.
 */
export function getProjectsBaseDir(): string {
  const configDir = process.env.CLAUDE_CONFIG_DIR ?? join(homedir(), '.claude');
  return join(configDir, 'projects');
}

/**
 * Get the storage directory for a specific project path.
 */
export function getProjectStorageDir(projectPath: string): string {
  return join(getProjectsBaseDir(), encodePath(projectPath));
}

/**
 * Resolve the real path of a directory, normalizing to NFC.
 */
async function resolveRealpath(dir: string): Promise<string> {
  try {
    return (await realpath(dir)).normalize('NFC');
  } catch {
    return dir.normalize('NFC');
  }
}

/**
 * Get git worktree paths for a directory.
 * Runs `git worktree list --porcelain` and parses "worktree <path>" lines.
 */
async function getGitWorktrees(dir: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync('git', ['worktree', 'list', '--porcelain'], {
      cwd: dir,
      timeout: 5000,
    });
    if (!stdout) return [];
    return stdout
      .split('\n')
      .filter((line) => line.startsWith('worktree '))
      .map((line) => line.slice(9).normalize('NFC'));
  } catch {
    return [];
  }
}

/**
 * Resolve the storage directory for a project path.
 * Handles long paths that get hashed by the CLI.
 */
async function resolveStorageDir(projectPath: string): Promise<string | undefined> {
  const direct = getProjectStorageDir(projectPath);
  try {
    await readdir(direct);
    return direct;
  } catch {
    // For long paths, try prefix matching
    const encoded = encodePath(projectPath);
    if (encoded.length <= MAX_FOLDER_NAME_LENGTH) return undefined;

    const prefix = encoded.slice(0, MAX_FOLDER_NAME_LENGTH);
    const base = getProjectsBaseDir();
    try {
      const entries = await readdir(base, { withFileTypes: true });
      const match = entries.find((e) => e.isDirectory() && e.name.startsWith(`${prefix}-`));
      return match ? join(base, match.name) : undefined;
    } catch {
      return undefined;
    }
  }
}

/**
 * Collect all storage directories relevant to a project (including git worktrees).
 * Returns array of {storagePath, cwd} pairs.
 */
export async function getProjectStorageDirs(
  dir: string
): Promise<Array<{ storagePath: string; cwd: string }>> {
  const resolved = await resolveRealpath(dir);
  const worktrees = await getGitWorktrees(resolved);

  if (worktrees.length <= 1) {
    // No worktrees or just root — simple case
    const storageDir = await resolveStorageDir(resolved);
    if (!storageDir) return [];
    return [{ storagePath: storageDir, cwd: resolved }];
  }

  // Multiple worktrees — scan base projects directory and match
  const base = getProjectsBaseDir();
  const isWin = process.platform === 'win32';

  // Build worktree encoded-name list sorted by length (longest first).
  // encodePath() already handles long paths by appending a deterministic hash.
  const worktreePrefixes = worktrees
    .map((wt) => {
      const encoded = encodePath(wt);
      return { path: wt, prefix: isWin ? encoded.toLowerCase() : encoded };
    })
    .sort((a, b) => b.prefix.length - a.prefix.length);

  let dirEntries: import('node:fs').Dirent[];
  try {
    dirEntries = await readdir(base, { withFileTypes: true });
  } catch {
    // Fallback: just try the root dir
    const storageDir = await resolveStorageDir(resolved);
    if (!storageDir) return [];
    return [{ storagePath: storageDir, cwd: resolved }];
  }

  const results: Array<{ storagePath: string; cwd: string }> = [];
  const seen = new Set<string>();

  // First add the root project dir
  const rootStorage = await resolveStorageDir(resolved);
  if (rootStorage) {
    const rootName = basename(rootStorage);
    seen.add(isWin ? rootName.toLowerCase() : rootName);
    results.push({ storagePath: rootStorage, cwd: resolved });
  }

  // Then scan for worktree directories
  for (const entry of dirEntries) {
    if (!entry.isDirectory()) continue;
    const name = isWin ? entry.name.toLowerCase() : entry.name;
    if (seen.has(name)) continue;

    for (const { path: wtPath, prefix } of worktreePrefixes) {
      if (
        name === prefix ||
        (prefix.length >= MAX_FOLDER_NAME_LENGTH && name.startsWith(`${prefix}-`))
      ) {
        seen.add(name);
        results.push({ storagePath: join(base, entry.name), cwd: wtPath });
        break;
      }
    }
  }

  return results;
}

/**
 * Find a session JSONL file by session ID, optionally scoped to a project directory.
 * When dir is provided, also searches git worktree storage directories.
 * Returns the file content as string if found, null otherwise.
 */
export async function findSessionContent(sessionId: string, dir?: string): Promise<string | null> {
  const filename = `${sessionId}.jsonl`;

  if (dir) {
    // Search in the project directory and its git worktrees
    const resolved = await resolveRealpath(dir);

    // First check the direct project storage
    const storageDir = await resolveStorageDir(resolved);
    if (storageDir) {
      const result = await tryReadFile(join(storageDir, filename));
      if (result) return result;
    }

    // Then check git worktree storage directories
    const worktrees = await getGitWorktrees(resolved);
    for (const wt of worktrees) {
      if (wt === resolved) continue; // skip root, already checked
      const wtStorage = await resolveStorageDir(wt);
      if (wtStorage) {
        const result = await tryReadFile(join(wtStorage, filename));
        if (result) return result;
      }
    }

    return null;
  }

  // Search across all projects
  const baseDir = getProjectsBaseDir();
  let entries: string[];
  try {
    entries = await readdir(baseDir);
  } catch {
    return null;
  }

  for (const entry of entries) {
    const result = await tryReadFile(join(baseDir, entry, filename));
    if (result) return result;
  }
  return null;
}

async function tryReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Read the head (first N bytes) and tail (last N bytes) of a file efficiently.
 * Also returns file mtime and size.
 */
export async function readHeadTail(
  filePath: string,
  bytes = 65536
): Promise<{ head: string; tail: string; mtime: number; size: number } | null> {
  try {
    const file = Bun.file(filePath);
    const size = file.size;
    const mtime = (await stat(filePath)).mtimeMs;

    if (size <= bytes * 2) {
      const content = await file.text();
      return { head: content, tail: content, mtime, size };
    }

    const headSlice = file.slice(0, bytes);
    const tailSlice = file.slice(size - bytes, size);
    const [head, tail] = await Promise.all([headSlice.text(), tailSlice.text()]);

    return { head, tail, mtime, size };
  } catch {
    return null;
  }
}

/**
 * Extract the first occurrence of a string value for a JSON key from text.
 * Searches for patterns like `"key":"value"` or `"key": "value"`.
 */
export function extractFirstStringValue(text: string, key: string): string | undefined {
  const patterns = [`"${key}":"`, `"${key}": "`];
  for (const pattern of patterns) {
    const idx = text.indexOf(pattern);
    if (idx < 0) continue;
    const start = idx + pattern.length;
    let end = start;
    while (end < text.length) {
      if (text[end] === '\\') {
        end += 2;
        continue;
      }
      if (text[end] === '"') {
        return unescapeJsonString(text.slice(start, end));
      }
      end++;
    }
  }
  return undefined;
}

/**
 * Extract the last occurrence of a string value for a JSON key from text.
 */
export function extractLastStringValue(text: string, key: string): string | undefined {
  const patterns = [`"${key}":"`, `"${key}": "`];
  let result: string | undefined;
  for (const pattern of patterns) {
    let searchFrom = 0;
    while (true) {
      const idx = text.indexOf(pattern, searchFrom);
      if (idx < 0) break;
      const start = idx + pattern.length;
      let end = start;
      while (end < text.length) {
        if (text[end] === '\\') {
          end += 2;
          continue;
        }
        if (text[end] === '"') {
          result = unescapeJsonString(text.slice(start, end));
          break;
        }
        end++;
      }
      searchFrom = end + 1;
    }
  }
  return result;
}

function unescapeJsonString(s: string): string {
  if (!s.includes('\\')) return s;
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

/**
 * Extract the first user prompt from JSONL head text.
 * Skips meta-prompts like local commands, session hooks, etc.
 */
const META_PROMPT_RE =
  /^(?:<local-command-stdout>|<session-start-hook>|<tick>|<goal>|\[Request interrupted by user[^\]]*\]|\s*<ide_opened_file>[\s\S]*<\/ide_opened_file>\s*$|\s*<ide_selection>[\s\S]*<\/ide_selection>\s*$)/;

export function extractFirstPrompt(head: string): string | undefined {
  let offset = 0;
  while (offset < head.length) {
    const nlIdx = head.indexOf('\n', offset);
    const line = nlIdx >= 0 ? head.slice(offset, nlIdx) : head.slice(offset);
    offset = nlIdx >= 0 ? nlIdx + 1 : head.length;

    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;

    try {
      const entry = JSON.parse(line);
      if (entry.type !== 'user') continue;

      const content = entry.message?.content;
      let text: string | undefined;
      if (typeof content === 'string') {
        text = content;
      } else if (Array.isArray(content)) {
        const block = content.find((b: { type: string }) => b.type === 'text');
        text = block?.text;
      }

      if (text && !META_PROMPT_RE.test(text)) {
        return text.length > 200 ? `${text.slice(0, 200)}…` : text;
      }
    } catch {
      // skip malformed lines
    }
  }
  return undefined;
}

/**
 * Scan a project storage directory for session files and extract metadata.
 * Returns SDKSessionInfo-compatible objects.
 */
export async function scanProjectDir(
  dirPath: string,
  cwd?: string
): Promise<
  Array<{
    sessionId: string;
    summary: string;
    lastModified: number;
    fileSize: number;
    customTitle?: string;
    firstPrompt?: string;
    gitBranch?: string;
    cwd?: string;
  }>
> {
  let files: string[];
  try {
    files = await readdir(dirPath);
  } catch {
    return [];
  }

  const results = await Promise.all(
    files.map(async (f) => {
      if (!f.endsWith('.jsonl')) return null;
      const id = validateUuid(f.slice(0, -6));
      if (!id) return null;

      const ht = await readHeadTail(join(dirPath, f));
      if (!ht) return null;

      const { head, tail, mtime, size } = ht;

      // Get first line to check for sidechains and teams
      const firstNl = head.indexOf('\n');
      const firstLine = firstNl >= 0 ? head.slice(0, firstNl) : head;
      if (firstLine.includes('"isSidechain":true') || firstLine.includes('"isSidechain": true'))
        return null;
      if (extractFirstStringValue(head, 'teamName')) return null;

      const customTitle = extractLastStringValue(tail, 'customTitle') || undefined;
      const firstPrompt = extractFirstPrompt(head) || undefined;
      const summary =
        customTitle || extractLastStringValue(tail, 'summary') || firstPrompt || '(session)';
      const gitBranch =
        extractLastStringValue(tail, 'gitBranch') ||
        extractFirstStringValue(head, 'gitBranch') ||
        undefined;
      const cwdValue = extractFirstStringValue(head, 'cwd') || cwd || undefined;

      return {
        sessionId: id,
        summary,
        lastModified: mtime,
        fileSize: size,
        customTitle,
        firstPrompt,
        gitBranch,
        cwd: cwdValue,
      };
    })
  );

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Deduplicate sessions by ID, keeping the one with the latest lastModified.
 */
export function deduplicateSessions<T extends { sessionId: string; lastModified: number }>(
  sessions: T[]
): T[] {
  const map = new Map<string, T>();
  for (const s of sessions) {
    const existing = map.get(s.sessionId);
    if (!existing || s.lastModified > existing.lastModified) {
      map.set(s.sessionId, s);
    }
  }
  return [...map.values()];
}
