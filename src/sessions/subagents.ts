/**
 * Subagent transcripts of a session — match the official SDK's
 * listSubagents() and getSubagentMessages().
 */

import type { Dirent } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  GetSubagentMessagesOptions,
  ListSubagentsOptions,
  SessionMessage,
} from '../types/index.ts';
import { findSessionFile, validateUuid } from './paths.ts';
import { paginate, type TranscriptEntry, toSessionMessage } from './transcript.ts';

const TOOL_USE_ID_RE = /^[A-Za-z0-9_.:-]{1,128}$/;
const AGENT_ID_RE = /^[\w-]{1,128}$/;

async function subagentsDir(sessionId: string, dir: string | undefined): Promise<string | null> {
  const file = await findSessionFile(sessionId, dir);
  if (!file) return null;
  return join(file.filePath.replace(/\.jsonl$/, ''), 'subagents');
}

/** `agent-<id>.jsonl` files under the subagents directory, recursively. */
async function findAgentFiles(root: string): Promise<{ agentId: string; filePath: string }[]> {
  const found: { agentId: string; filePath: string }[] = [];
  async function walk(dir: string) {
    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isFile() && entry.name.startsWith('agent-') && entry.name.endsWith('.jsonl')) {
        found.push({ agentId: entry.name.slice(6, -6), filePath: join(dir, entry.name) });
      } else if (entry.isDirectory()) {
        await walk(join(dir, entry.name));
      }
    }
  }
  await walk(root);
  return found;
}

export async function listSubagents(
  sessionId: string,
  options?: ListSubagentsOptions
): Promise<string[]> {
  if (!validateUuid(sessionId)) return [];
  const dir = await subagentsDir(sessionId, options?.dir);
  if (!dir) return [];
  return (await findAgentFiles(dir)).map((a) => a.agentId);
}

const SUBAGENT_TYPES = new Set(['user', 'assistant', 'attachment']);

function parseSubagentTranscript(buf: Buffer): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  let pos = 0;
  while (pos < buf.length) {
    let nl = buf.indexOf(10, pos);
    if (nl === -1) nl = buf.length;
    let start = pos;
    while (start < nl && buf[start] <= 32) start++;
    pos = nl + 1;
    if (start >= nl) continue;
    try {
      const entry = JSON.parse(buf.toString('utf-8', start, nl));
      if (SUBAGENT_TYPES.has(entry.type) && typeof entry.uuid === 'string') entries.push(entry);
    } catch {}
  }
  return entries;
}

/** Walk back from the last user/assistant entry via parentUuid. */
function subagentChain(entries: TranscriptEntry[]): TranscriptEntry[] {
  if (entries.length === 0) return [];
  const byUuid = new Map<string, TranscriptEntry>();
  for (const e of entries) byUuid.set(e.uuid, e);
  const leaf = entries.findLast((e) => e.type === 'user' || e.type === 'assistant');
  if (!leaf) return [];
  const chain: TranscriptEntry[] = [];
  const seen = new Set<string>();
  let current: TranscriptEntry | undefined = leaf;
  while (current) {
    if (seen.has(current.uuid)) break;
    seen.add(current.uuid);
    chain.push(current);
    current = current.parentUuid ? byUuid.get(current.parentUuid) : undefined;
  }
  return chain.reverse();
}

export async function getSubagentMessages(
  sessionId: string,
  agentId: string,
  options?: GetSubagentMessagesOptions
): Promise<SessionMessage[]> {
  if (!validateUuid(sessionId) || !agentId) return [];
  const dir = await subagentsDir(sessionId, options?.dir);
  if (!dir) return [];
  const agent = (await findAgentFiles(dir)).find((a) => a.agentId === agentId);
  if (!agent) return [];

  let buf: Buffer;
  try {
    buf = await readFile(agent.filePath);
  } catch {
    return [];
  }

  let toolUseId: unknown;
  let parentAgentId: unknown;
  try {
    const meta = JSON.parse(
      await readFile(agent.filePath.replace(/\.jsonl$/, '.meta.json'), 'utf-8')
    );
    toolUseId = meta.toolUseId;
    parentAgentId = meta.parentAgentId;
  } catch {}

  if (buf.length === 0) return [];
  const parentToolUseId =
    typeof toolUseId === 'string' && TOOL_USE_ID_RE.test(toolUseId) ? toolUseId : undefined;
  const parentAgent =
    typeof parentAgentId === 'string' && AGENT_ID_RE.test(parentAgentId)
      ? parentAgentId
      : undefined;
  const messages = subagentChain(parseSubagentTranscript(buf))
    .filter((e) => e.type === 'user' || e.type === 'assistant')
    .map((e) => toSessionMessage(e, parentToolUseId, parentAgent));
  return paginate(messages, options);
}
