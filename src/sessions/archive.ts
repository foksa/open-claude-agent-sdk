/**
 * Session archive marks (v0.3.325): `archiveSession` / `unarchiveSession`
 * write `<projectDir>/<sessionId>/archived.json`, and `listSessions` /
 * `getSessionInfo` report `archived` from it. Ported from the official SDK.
 */

import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { mkdir, open, rename, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { SessionMutationOptions } from '../types/index.ts';
import { type HeadTail, isWindows, sessionFiles, validateUuid } from './paths.ts';
import { promptText } from './text.ts';

/** Largest archive mark the readers accept (official `YA`). */
const MAX_MARK_BYTES = 4096;

export type ArchiveMark = { archived: boolean; atMs: number };

function archiveMarkPath(transcriptPath: string, sessionId: string): string {
  return join(dirname(transcriptPath), sessionId, 'archived.json');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

const DATE =
  '(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))';
/** zod `iso.datetime({ offset: true })`, as the official mark schema checks `at`. */
const ISO_DATETIME_OFFSET = new RegExp(
  `^${DATE}T(?:(?:[01]\\d|2[0-3]):[0-5]\\d:[0-5]\\d(?:\\.\\d+)?(?:Z|([+-](?:[01]\\d|2[0-3]):[0-5]\\d)))$`
);

/** Read a file no larger than `max` bytes without following symlinks; null otherwise. */
async function readSmallFile(path: string, max: number): Promise<string | null> {
  try {
    const noFollow = isWindows() ? 0 : constants.O_NOFOLLOW | constants.O_NONBLOCK;
    if (noFollow === 0 && !(await stat(path)).isFile()) return null;
    const fh = await open(path, constants.O_RDONLY | noFollow);
    try {
      const st = await fh.stat();
      if (!st.isFile() || st.size > max) return null;
      const size = Number(st.size);
      const buf = Buffer.allocUnsafe(size);
      let read = 0;
      while (read < size) {
        const { bytesRead } = await fh.read(buf, read, size - read, read);
        if (bytesRead === 0) break;
        read += bytesRead;
      }
      return (read < size ? buf.subarray(0, read) : buf).toString('utf8');
    } finally {
      await fh.close();
    }
  } catch {
    return null;
  }
}

/** The archive mark beside a transcript, if any (official `wh`). */
export async function readArchiveMark(
  transcriptPath: string,
  sessionId: string
): Promise<ArchiveMark | undefined> {
  try {
    const content = await readSmallFile(archiveMarkPath(transcriptPath, sessionId), MAX_MARK_BYTES);
    if (content === null) return undefined;
    const mark = JSON.parse(content);
    if (
      !isPlainObject(mark) ||
      typeof mark.archived !== 'boolean' ||
      typeof mark.at !== 'string' ||
      !ISO_DATETIME_OFFSET.test(mark.at)
    ) {
      return undefined;
    }
    return { archived: mark.archived, atMs: Date.parse(mark.at) };
  } catch {
    return undefined;
  }
}

const isFalseOrAbsent = (v: unknown) => v === undefined || v === false;
const TURN_ORIGINS = ['human', 'sdk', 'unknown'];

function originOk(v: unknown): v is { kind: string } | undefined {
  return v === undefined || (isPlainObject(v) && typeof v.kind === 'string');
}

/** The official `lNe` schema: a user prompt row or a queued-command attachment. */
function promptRow(
  entry: unknown
):
  | { kind: 'user'; content: unknown; origin?: { kind: string }; promptSource?: string; ts: string }
  | { kind: 'attachment'; content: unknown; origin?: { kind: string }; ts: string }
  | undefined {
  if (!isPlainObject(entry) || typeof entry.timestamp !== 'string') return undefined;
  if (entry.type === 'user') {
    if (!isPlainObject(entry.message)) return undefined;
    if (!originOk(entry.origin)) return undefined;
    if (entry.promptSource !== undefined && typeof entry.promptSource !== 'string')
      return undefined;
    if (entry.persist !== undefined) return undefined;
    if (entry.turnOrigin !== undefined && !TURN_ORIGINS.includes(entry.turnOrigin as string)) {
      return undefined;
    }
    if (entry.toolUseResult !== undefined && entry.toolUseResult !== null) return undefined;
    for (const flag of [
      'isCompactSummary',
      'isSidechain',
      'isVirtual',
      'isVisibleInTranscriptOnly',
      'isMeta',
      'textNotTyped',
      'handedOff',
      'queueSkipAttachments',
    ]) {
      if (!isFalseOrAbsent(entry[flag])) return undefined;
    }
    if (entry.wakeupSource !== undefined || entry.scheduledTaskId !== undefined) return undefined;
    return {
      kind: 'user',
      content: entry.message.content,
      origin: entry.origin,
      promptSource: entry.promptSource as string | undefined,
      ts: entry.timestamp,
    };
  }
  if (entry.type === 'attachment') {
    if (!isFalseOrAbsent(entry.isSidechain)) return undefined;
    const att = entry.attachment;
    if (!isPlainObject(att) || att.type !== 'queued_command') return undefined;
    if (!originOk(att.origin)) return undefined;
    if (att.commandMode !== undefined && att.commandMode !== 'prompt' && att.commandMode !== 'bash')
      return undefined;
    if (!isFalseOrAbsent(att.isMeta)) return undefined;
    return { kind: 'attachment', content: att.prompt, origin: att.origin, ts: entry.timestamp };
  }
  return undefined;
}

/** When a human sent this prompt, or undefined when it isn't one (official `dNe`). */
function humanPromptTime(entry: unknown): number | undefined {
  const row = promptRow(entry);
  if (!row) return undefined;
  const { content, origin } = row;
  if (origin !== undefined && origin.kind !== 'human') return undefined;
  const blocks: Record<string, unknown>[] =
    typeof content === 'string'
      ? [{ type: 'text', text: content }]
      : Array.isArray(content) &&
          content.every((b) => isPlainObject(b) && typeof b.type === 'string')
        ? (content as Record<string, unknown>[])
        : [];
  if (blocks.some((b) => b.type === 'tool_result')) return undefined;
  const texts = blocks.map((b) => (typeof b.text === 'string' ? b.text.trimStart() : ''));
  const isPrompt =
    (origin !== undefined
      ? texts.some((t) => t !== '') && !texts.some((t) => t.startsWith('<command-name>'))
      : promptText({ type: 'user', message: { content } }, { commandFallback: '' }) !== undefined ||
        texts.some((t) => t.startsWith('<command-message>'))) ||
    blocks.some((b) => b.type === 'image' || b.type === 'document');
  const ts = Date.parse(row.ts);
  return isPrompt && !Number.isNaN(ts) ? ts : undefined;
}

/** A human prompt in `text` sent after `atMs` (official `$z`). */
function promptSentSince(text: string, atMs: number): boolean {
  return text.split('\n').some((line) => {
    if (
      !(line.includes('"user"') || line.includes('"queued_command"')) ||
      line.includes('"tool_result"')
    )
      return false;
    let entry: unknown;
    try {
      entry = JSON.parse(line);
    } catch {
      return false;
    }
    const ts = humanPromptTime(entry);
    return ts !== undefined && ts > atMs;
  });
}

/**
 * `archived` for session info: the mark's value, except that a prompt sent
 * after archiving unarchives it (official `Bz`). Undefined without a mark.
 */
export function archivedState(mark: ArchiveMark | undefined, ht: HeadTail): boolean | undefined {
  if (!mark?.archived) return mark?.archived;
  return !(
    promptSentSince(ht.tail, mark.atMs) ||
    (ht.head !== ht.tail && promptSentSince(ht.head, mark.atMs))
  );
}

/** Write `content` beside `path` and rename it over, so readers never see a torn mark. */
async function writeAtomic(path: string, content: string, mode: number): Promise<void> {
  const tmp = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(tmp, content, { encoding: 'utf8', mode, flag: 'wx' });
    await rename(tmp, path);
  } catch (err) {
    await unlink(tmp).catch(() => {});
    throw err;
  }
}

async function writeArchiveMark(
  transcriptPath: string,
  sessionId: string,
  archived: boolean
): Promise<void> {
  const path = archiveMarkPath(transcriptPath, sessionId);
  const content = JSON.stringify({ archived, at: new Date().toISOString(), by: 'sdk' });
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  await writeAtomic(path, content, 0o600);
}

/** Mark every copy of a session archived or not (official `QX` → `qX`). */
async function setSessionArchived(
  sessionId: string,
  archived: boolean,
  options: SessionMutationOptions = {}
): Promise<void> {
  if (options.sessionStore) {
    throw new Error(
      'Archiving is not supported with sessionStore: a SessionStore holds transcript entries, and the archived mark is not one'
    );
  }
  if (!validateUuid(sessionId)) throw new Error(`Invalid sessionId: ${sessionId}`);
  const paths = new Set<string>();
  for await (const { filePath } of sessionFiles(sessionId, options.dir)) paths.add(filePath);
  if (paths.size === 0) {
    throw new Error(
      options.dir
        ? `Session ${sessionId} not found in project directory for ${options.dir}`
        : `Session ${sessionId} not found in any project directory`
    );
  }
  const failed = (
    await Promise.allSettled([...paths].map((p) => writeArchiveMark(p, sessionId, archived)))
  ).find((r) => r.status === 'rejected');
  if (failed) throw (failed as PromiseRejectedResult).reason;
}

/**
 * Archive a session: it stays on disk and in `listSessions`, with
 * `archived: true`, until it is unarchived or a prompt is sent in it.
 */
export async function archiveSession(
  sessionId: string,
  options?: SessionMutationOptions
): Promise<void> {
  return setSessionArchived(sessionId, true, options);
}

/** Unarchive a session, so that `listSessions` returns it with `archived: false`. */
export async function unarchiveSession(
  sessionId: string,
  options?: SessionMutationOptions
): Promise<void> {
  return setSessionArchived(sessionId, false, options);
}
