/**
 * Read metadata for a single session — matches the official SDK.
 */

import type { GetSessionInfoOptions, SDKSessionInfo } from '../types/index.ts';
import { readArchiveMark } from './archive.ts';
import { findSessionFile, readHeadTail, validateUuid } from './paths.ts';
import { parseSessionInfo, readSidecarTitle } from './sessionInfo.ts';
import { lastTypedField } from './text.ts';

export async function getSessionInfo(
  sessionId: string,
  options: GetSessionInfoOptions = {}
): Promise<SDKSessionInfo | undefined> {
  const id = validateUuid(sessionId);
  if (!id) return undefined;
  const file = await findSessionFile(id, options.dir);
  if (!file) return undefined;
  const ht = await readHeadTail(file.filePath);
  if (!ht) return undefined;
  const [sidecarTitle, archiveMark] = await Promise.all([
    lastTypedField(ht.tail, 'custom-title') === undefined
      ? readSidecarTitle(file.filePath, id)
      : undefined,
    readArchiveMark(file.filePath, id),
  ]);
  return parseSessionInfo(id, ht, file.projectPath, sidecarTitle, archiveMark) ?? undefined;
}
