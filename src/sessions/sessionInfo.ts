/**
 * Session summary metadata (SDKSessionInfo) extracted from a transcript's
 * head and tail, ported from the official SDK.
 */

import { open, readFile, realpath } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SDKSessionInfo } from '../types/index.ts';
import {
  canonicalizePath,
  HEAD_TAIL_BYTES,
  type HeadTail,
  lastParsedStringField,
  normalizePath,
  readHeadTail,
  sanitizePath,
  validateUuid,
} from './paths.ts';
import {
  attachmentOnlyPrompt,
  cleanTitle,
  firstPromptFromHead,
  firstStringField,
  lastStringField,
  promptText,
} from './text.ts';

/** Build session info from a transcript's head/tail; null for sidechains or empty sessions. */
export function parseSessionInfo(
  sessionId: string,
  ht: HeadTail,
  projectPath: string | undefined,
  sidecarTitle: string | undefined
): SDKSessionInfo | null {
  const { head, tail, mtime, size } = ht;
  const nl = head.indexOf('\n');
  const firstLine = nl >= 0 ? head.slice(0, nl) : head;
  if (firstLine.includes('"isSidechain":true') || firstLine.includes('"isSidechain": true')) {
    return null;
  }

  const customTitle =
    lastStringField(tail, 'customTitle') ||
    sidecarTitle ||
    lastStringField(head, 'customTitle') ||
    lastStringField(tail, 'aiTitle') ||
    lastStringField(head, 'aiTitle') ||
    undefined;
  const firstPrompt = firstPromptFromHead(head) || undefined;

  let createdAt: number | undefined;
  const timestamp = firstStringField(head, 'timestamp');
  if (timestamp) {
    const parsed = Date.parse(timestamp);
    if (!Number.isNaN(parsed)) createdAt = parsed;
  }

  const summary =
    customTitle ||
    lastStringField(tail, 'lastPrompt') ||
    lastStringField(tail, 'summary') ||
    firstPrompt ||
    attachmentOnlyPrompt(head);
  if (!summary) return null;

  const gitBranch =
    lastStringField(tail, 'gitBranch') || firstStringField(head, 'gitBranch') || undefined;
  const cwd =
    lastParsedStringField(tail, 'relocated', 'relocatedCwd') ||
    firstStringField(head, 'cwd') ||
    projectPath ||
    undefined;
  const tagLine = tail
    .split('\n')
    .findLast((line) => line.includes('"type":"tag"') && line.includes('"tag":"'));
  const tag = tagLine ? lastStringField(tagLine, 'tag') || undefined : undefined;

  return {
    sessionId,
    summary,
    lastModified: mtime,
    fileSize: size,
    customTitle,
    firstPrompt,
    gitBranch,
    cwd,
    tag,
    createdAt,
  };
}

/** Title the CLI stores beside the transcript in `<sessionId>/custom-title.json`. */
export async function readSidecarTitle(
  filePath: string,
  sessionId: string
): Promise<string | undefined> {
  let raw: string;
  try {
    raw = await readFile(join(dirname(filePath), sessionId, 'custom-title.json'), 'utf8');
  } catch {
    return undefined;
  }
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || typeof parsed.customTitle !== 'string') {
      return undefined;
    }
    return cleanTitle(parsed.customTitle) || undefined;
  } catch {
    return undefined;
  }
}

const PROGRAMMATIC_ENTRYPOINTS = new Set(['sdk-cli', 'sdk-ts', 'sdk-py']);

/** Sessions started by an SDK or a daemon rather than interactively. */
export function isProgrammaticSession(head: string, tail: string): boolean {
  const entrypoint = firstStringField(head, 'entrypoint') ?? lastStringField(tail, 'entrypoint');
  if (entrypoint && PROGRAMMATIC_ENTRYPOINTS.has(entrypoint)) return true;
  const firstMessageLine = head.split('\n').find((line) => line.includes('"parentUuid":')) ?? head;
  const kind = firstStringField(firstMessageLine, 'sessionKind');
  return kind === 'daemon' || kind === 'daemon-worker';
}

const CONTINUED_IN_MARKER = '"type":"continued-in"';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** A completed turn: a finished assistant reply or a real user prompt. */
function isCompletedTurnEntry(entry: unknown): boolean {
  if (isPlainObject(entry) && entry.type === 'assistant') {
    const apiError = entry.isApiErrorMessage;
    const message = entry.message;
    const shapeOk =
      (apiError === undefined || typeof apiError === 'boolean') &&
      (message === undefined ||
        (isPlainObject(message) &&
          (message.stop_reason === undefined ||
            message.stop_reason === null ||
            typeof message.stop_reason === 'string')));
    if (shapeOk) {
      return (
        apiError !== true && typeof (message as { stop_reason?: unknown })?.stop_reason === 'string'
      );
    }
  }
  return isPlainObject(entry) && promptText(entry, { commandFallback: '' }) !== undefined;
}

/**
 * Session id this session was continued in, when its last activity is a
 * `continued-in` marker (not followed by a completed turn).
 */
export function continuedInSessionId(tail: string): string | undefined {
  if (!tail.includes(CONTINUED_IN_MARKER)) return undefined;
  let end = tail.length;
  while (end > 0) {
    const nl = tail.lastIndexOf('\n', end - 1);
    const line = tail.slice(nl + 1, end);
    end = nl;
    const isMarker = line.includes(CONTINUED_IN_MARKER);
    const isTurn = line.includes('"type":"user"') || line.includes('"type":"assistant"');
    if (isMarker || isTurn) {
      try {
        const entry = JSON.parse(line);
        if (isMarker && isPlainObject(entry) && entry.type === 'continued-in') {
          if (typeof entry.continuedInSessionId === 'string') {
            return validateUuid(entry.continuedInSessionId) ?? undefined;
          }
        }
        if (isTurn && isCompletedTurnEntry(entry)) return undefined;
      } catch {}
    }
    if (nl < 0) break;
  }
  return undefined;
}

const PARENT_UUID_MARKER = '"parentUuid":';
const MAX_SCAN_BYTES = 16 * 1024 * 1024;
const SCAN_CHUNK = 1024 * 1024;

/** Whether a transcript contains any conversation entry (scans up to 16MB). */
async function hasConversationEntries(filePath: string, ht: HeadTail): Promise<boolean> {
  if (ht.head.includes(PARENT_UUID_MARKER) || ht.tail.includes(PARENT_UUID_MARKER)) return true;
  if (ht.size <= HEAD_TAIL_BYTES) return false;
  try {
    const fh = await open(filePath, 'r');
    try {
      if (!(await fh.stat()).isFile()) return false;
      const marker = Buffer.from(PARENT_UUID_MARKER);
      const buf = Buffer.allocUnsafe(SCAN_CHUNK + marker.length);
      let carry = 0;
      let pos = 0;
      while (pos < MAX_SCAN_BYTES) {
        const { bytesRead } = await fh.read(buf, carry, SCAN_CHUNK, pos);
        if (bytesRead === 0) return false;
        const filled = carry + bytesRead;
        if (buf.subarray(0, filled).includes(marker)) return true;
        carry = Math.min(marker.length, filled);
        buf.copyWithin(0, filled - carry, filled);
        pos += bytesRead;
      }
      return true;
    } finally {
      await fh.close();
    }
  } catch {
    return false;
  }
}

/** Whether the session `targetId` (next to `filePath`) exists with real content. */
export async function continuationExists(filePath: string, targetId: string): Promise<boolean> {
  const target = join(dirname(filePath), `${targetId}.jsonl`);
  const ht = await readHeadTail(target);
  return ht !== null && (await hasConversationEntries(target, ht));
}

function slashPath(p: string, caseInsensitive: boolean): string {
  const s = p.replaceAll('\\', '/');
  return caseInsensitive ? s.toLowerCase() : s;
}

/** `cwd` equals or lies inside one of the project's own worktrees. */
export function isInsideWorktrees(
  cwd: string,
  worktrees: string[] | undefined,
  caseInsensitive: boolean
): boolean {
  if (worktrees === undefined) return false;
  const target = slashPath(normalizePath(cwd), caseInsensitive);
  return worktrees.some((wt) => {
    const root = slashPath(normalizePath(wt), caseInsensitive);
    return target === root || target.startsWith(root.endsWith('/') ? root : `${root}/`);
  });
}

/** Different paths that sanitize to the same project directory name. */
function namesCollide(a: string, b: string, caseInsensitive: boolean): boolean {
  const na = normalizePath(a);
  const nb = normalizePath(b);
  const fold = (s: string) => (caseInsensitive ? s.toLowerCase() : s);
  if (fold(sanitizePath(na)) !== fold(sanitizePath(nb))) return false;
  return slashPath(na, caseInsensitive) !== slashPath(nb, caseInsensitive);
}

/** UNC/device paths and `..` segments are never realpath'd for collision checks. */
function isUnsafeForRealpath(p: string): boolean {
  return /^[\\/]{2}/.test(p) || /(^|[\\/])\.\.([\\/]|$)/.test(p);
}

/**
 * The session was recorded in a different directory whose name merely
 * sanitizes to the same project folder (e.g. `/a/b-c` vs `/a/b/c`).
 */
export async function belongsToCollidingProject(
  cwd: string,
  projectPath: string,
  caseInsensitive: boolean
): Promise<boolean> {
  if (!namesCollide(cwd, projectPath, caseInsensitive)) return false;
  if (isUnsafeForRealpath(cwd) || isUnsafeForRealpath(projectPath)) return false;
  let realCwd: string;
  try {
    realCwd = normalizePath(await realpath(cwd));
  } catch {
    return false;
  }
  return namesCollide(realCwd, await canonicalizePath(projectPath), caseInsensitive);
}
