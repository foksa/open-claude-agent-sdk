/**
 * Data-flow records and session lineage a fork carries over (v0.3.323+).
 *
 * The CLI writes `data-flow-records` / `data-flow-incomplete` rows (which
 * tools and events fed the conversation) and a `derived-from` row (which
 * sessions it came from). `forkSession` merges them into the fork the way the
 * official SDK does: ported from its `sT`, `QNe`, `On`, `cj`, `aj`, `eMe`.
 */

type Rec = Record<string, unknown>;

/** Data flow of one session: its records, and why they may be incomplete. */
export type DataFlow = { records: Rec[]; incomplete?: number[] };

/** One session a transcript derives from. */
export type Lineage = { type: string; id: string | null; via: string; started?: string };

const DATA_FLOW_VERSION = 1;
/** A message row written without data-flow tracking on (official `YD`). */
export const UNTRACKED_ROW = 11;
/** A row that didn't parse as the current version (official `ml`). */
export const MALFORMED = 12;
/** A compaction no data-flow snapshot covers (official `ZD`). */
export const UNCOVERED_COMPACTION = 13;

const MAX_STRING = 256;
const MAX_INNER_CALL_INDEX = 2147483648;
const MAX_WEB_PATHS = 8;
const THIRD_PARTY = 'third_party';
const UNKNOWN = 'unknown';
const LINEAGE_TYPES = ['claude_code_session', 'unknown'];
const LINEAGE_VIAS = [
  'clear',
  'fork',
  'branch',
  'background',
  'cloud',
  'teleport',
  'teammate',
  'launch',
  'subprocess',
  'resume',
  'import',
  'compact',
];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function isPlainObject(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Short printable string (official `vn`). */
export function isSafeString(v: unknown): v is string {
  return (
    typeof v === 'string' &&
    v.length > 0 &&
    v.length <= MAX_STRING &&
    // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control chars is the point
    !/[\x00-\x1f\x7f]/.test(v)
  );
}

function isResponseId(v: unknown): v is string {
  return typeof v === 'string' && /^msg_(?:staging_|local_)?[A-Za-z0-9]{1,64}$/.test(v);
}

/** Add incompleteness codes not yet listed (official `us`). */
export function markIncomplete(flow: DataFlow, ...codes: number[]): void {
  for (const code of codes) {
    if (!flow.incomplete?.includes(code)) flow.incomplete = [...(flow.incomplete ?? []), code];
  }
}

function incompleteCodes(codes: unknown): number[] {
  const set = new Set(
    (Array.isArray(codes) ? codes : []).map((n) =>
      Number.isInteger(n) && n >= 1 && n <= 255 ? (n as number) : 1
    )
  );
  return set.size > 0 ? [...set] : [1];
}

/** A connector id's trailing base58 `01…` part as a uuid (official `tT`). */
function connectorUuid(id: string): string | undefined {
  const at = id.lastIndexOf('_');
  if (at < 0) return undefined;
  const tail = id.slice(at + 1);
  if (!tail.startsWith('01')) return undefined;
  const digits = tail.slice(2);
  if (digits.length !== 22) return undefined;
  let n = 0n;
  for (const ch of digits) {
    const d = BASE58.indexOf(ch);
    if (d < 0) return undefined;
    n = n * 58n + BigInt(d);
  }
  const hex = n.toString(16).padStart(32, '0');
  if (hex.length !== 32) return undefined;
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function parseServerShape(v: unknown): Rec | undefined {
  if (!isPlainObject(v)) return undefined;
  const { id, directory_id, transport, plugin_id_hash } = v;
  switch (v.type) {
    case 'anthropic':
      return isSafeString(id) ? { type: 'anthropic', id } : undefined;
    case 'claude_ai_connector':
      return isSafeString(id) && (directory_id === null || isSafeString(directory_id))
        ? { type: 'claude_ai_connector', id: connectorUuid(id) ?? id, directory_id }
        : undefined;
    case 'client_configured':
      return (transport === 'stdio' || transport === 'http' || transport === 'in_process') &&
        (plugin_id_hash === undefined || isSafeString(plugin_id_hash))
        ? {
            type: 'client_configured',
            transport,
            ...(plugin_id_hash !== undefined && { plugin_id_hash }),
          }
        : undefined;
    default:
      return undefined;
  }
}

function isPluginId(v: unknown): boolean {
  return (
    v === THIRD_PARTY ||
    v === UNKNOWN ||
    (typeof v === 'string' && /^[\w.-]{1,128}@[\w.-]{1,64}$/.test(v))
  );
}

function parseServer(v: unknown): Rec | undefined {
  if (v === undefined) return undefined;
  const server = parseServerShape(v) ?? { type: UNKNOWN };
  if (server.type !== 'client_configured' || !isPlainObject(v)) return server;
  if (isPluginId(v.plugin_id)) return { ...server, plugin_id: v.plugin_id };
  return server.plugin_id_hash === undefined && v.plugin_id === undefined
    ? server
    : { ...server, plugin_id: UNKNOWN };
}

function isWebPath(v: unknown): boolean {
  if (!Array.isArray(v)) return false;
  const [a, b, c] = v;
  return v.length === 1
    ? [0, 1, 2, 3, 4].includes(a)
    : v.length === 3 && [0, 1].includes(a) && b === 0 && [1, 2].includes(c);
}

function parseWeb(v: unknown): unknown[] | undefined {
  return Array.isArray(v) && v.length > 0 && v.length <= MAX_WEB_PATHS && v.every(isWebPath)
    ? v
    : undefined;
}

/** One record as stored, or undefined when it is malformed (official `QNe`). */
function parseRecord(v: unknown): Rec | undefined {
  if (!isPlainObject(v)) return undefined;
  if (v.response_id !== undefined) {
    return isResponseId(v.response_id)
      ? {
          response_id: v.response_id,
          listed: Array.isArray(v.listed) ? v.listed.filter(isResponseId) : [],
          ...(isSafeString(v.mark_sent_by) && { mark_sent_by: v.mark_sent_by }),
        }
      : undefined;
  }
  const out: Rec = {};
  if (typeof v.tool_name === 'string') out.tool_name = v.tool_name;
  if (isSafeString(v.tool_use_id)) out.tool_use_id = v.tool_use_id;
  if (isSafeString(v.event_id)) out.event_id = v.event_id;
  if (out.tool_use_id === undefined && out.event_id === undefined) return undefined;
  if (out.tool_use_id !== undefined && out.tool_name === undefined) out.tool_name = '';
  if (v.inner_call_index !== undefined) {
    const i = v.inner_call_index;
    if (typeof i !== 'number' || !Number.isSafeInteger(i) || i < 0 || i >= MAX_INNER_CALL_INDEX)
      return undefined;
    out.inner_call_index = i;
  }
  if (v.no_message === true) out.no_message = true;
  if (v.implicit === true) out.implicit = true;
  if (v.carried === true) out.carried = true;
  const server = parseServer(v.server);
  if (server !== undefined) out.server = server;
  if (isSafeString(v.mcp_tool_name)) out.mcp_tool_name = v.mcp_tool_name;
  const web = parseWeb(v.web);
  if (web !== undefined) out.web = web;
  if (v.plugin_id !== undefined) out.plugin_id = isPluginId(v.plugin_id) ? v.plugin_id : UNKNOWN;
  if ('source' in v && v.source !== undefined) {
    const s = v.source;
    if (!isPlainObject(s) || !isSafeString(s.type) || !(isSafeString(s.id) || s.id === null))
      return undefined;
    out.source = { type: s.type, id: s.id };
  }
  if ('touched' in v && v.touched !== undefined) {
    const t = v.touched;
    if (!isPlainObject(t)) return undefined;
    const kind =
      t.kind === 'artifact' || t.kind === 'memory' || t.kind === 'session' ? t.kind : undefined;
    const action =
      t.action === 'read' || t.action === 'write' || t.action === 'copy' ? t.action : undefined;
    if (
      kind === undefined ||
      action === undefined ||
      !(isSafeString(t.id) || t.id === null) ||
      !(t.to === undefined || isSafeString(t.to))
    )
      return undefined;
    out.touched = { kind, id: t.id, action, ...(t.to !== undefined && { to: t.to }) };
  }
  return out;
}

/** Identity of a tool/event record, for merging (official `On`). */
function recordKey(r: Rec): string | undefined {
  const head =
    r.tool_use_id !== undefined
      ? r.inner_call_index === undefined
        ? `call\n${r.tool_use_id}\n`
        : `call\n${r.tool_use_id}\n${r.inner_call_index}\n${r.tool_name ?? ''}`
      : r.event_id !== undefined
        ? `event\n${r.event_id}\n${r.tool_name ?? ''}\n${r.inner_call_index ?? ''}`
        : undefined;
  if (head === undefined) return undefined;
  const source = r.source as Rec | undefined;
  const touched = r.touched as Rec | undefined;
  return [
    head,
    source?.type ?? '',
    source?.id ?? '',
    touched?.kind ?? '',
    touched?.id ?? '',
    touched?.action ?? '',
    touched?.to ?? '',
  ].join('\n');
}

function dedupeRecords(records: Rec[], seen: Set<string>): Rec[] {
  return records.filter((r) => {
    const key = recordKey(r);
    if (key === undefined) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Apply a `data-flow-records` / `data-flow-incomplete` row to `flow`
 * (official `sT`). `others` are every session's flows, from which response
 * records a later row lists as superseded are dropped too.
 */
export function applyDataFlowRow(row: Rec, flow: DataFlow, others: Iterable<DataFlow> = []): void {
  if (row.type === 'data-flow-incomplete') {
    markIncomplete(flow, ...incompleteCodes(row.codes));
    return;
  }
  if (row.type !== 'data-flow-records') return;
  const records: unknown = row.records;
  if (row.v !== DATA_FLOW_VERSION || !Array.isArray(records)) {
    markIncomplete(flow, MALFORMED);
    return;
  }
  const parsed = records.flatMap((r): Rec[] => {
    const rec = parseRecord(r);
    return rec ? [rec] : [];
  });
  if (parsed.length < records.length) markIncomplete(flow, MALFORMED);
  const trailingResponses = flow.records.splice(
    flow.records.findLastIndex((r) => r.response_id === undefined) + 1
  );
  const responses = new Map<unknown, Rec>(
    row.snapshot === true ? [] : trailingResponses.map((r) => [r.response_id, r])
  );
  const items: Rec[] = [];
  const superseded = new Set<unknown>();
  for (const r of parsed) {
    if (r.response_id === undefined) items.push(r);
    else {
      const { listed, ...rest } = r;
      (listed as unknown[] | undefined)?.forEach((id) => {
        responses.delete(id);
        superseded.add(id);
      });
      responses.set(r.response_id, rest);
    }
  }
  for (const other of superseded.size > 0 ? others : []) {
    if (
      other.records.findLast(
        ({ response_id }) => response_id === undefined || superseded.has(response_id)
      )?.response_id !== undefined
    ) {
      other.records = other.records.filter(({ response_id }) => !superseded.has(response_id));
    }
  }
  if (row.snapshot === true) {
    flow.records = [...dedupeRecords(items, new Set()), ...responses.values()];
    return;
  }
  if (items.length === 0) {
    for (const r of responses.values()) flow.records.push(r);
    return;
  }
  const indexByKey = new Map<string, number>();
  flow.records.forEach((r, i) => {
    const key = recordKey(r);
    if (key !== undefined) indexByKey.set(key, i);
  });
  for (const item of items) {
    const key = recordKey(item);
    const at = key === undefined ? undefined : indexByKey.get(key);
    const existing = at === undefined ? undefined : flow.records[at];
    if (at === undefined || existing === undefined) {
      flow.records.push(item);
      if (key !== undefined) indexByKey.set(key, flow.records.length - 1);
      continue;
    }
    if (existing.carried === true && item.carried !== true) {
      flow.records[at] = item;
      continue;
    }
    if ((item.no_message === true && existing.no_message !== true) || item.web !== undefined) {
      flow.records[at] = {
        ...existing,
        ...(item.no_message === true && { no_message: true }),
        ...(item.web !== undefined && { web: item.web }),
      };
    }
  }
  for (const r of responses.values()) flow.records.push(r);
}

/** The flow kept for `sessionId`, created empty (official `iT`). */
export function flowFor(flows: Map<string, DataFlow>, sessionId: string): DataFlow {
  let flow = flows.get(sessionId);
  if (flow === undefined) {
    flow = { records: [] };
    flows.set(sessionId, flow);
  }
  return flow;
}

/** Every session's flows merged into one (official `cj`). */
export function mergeFlows(flows: DataFlow[]): DataFlow {
  const merged: DataFlow = { records: [] };
  applyDataFlowRow(
    { type: 'data-flow-records', v: DATA_FLOW_VERSION, records: flows.flatMap((f) => f.records) },
    merged
  );
  markIncomplete(merged, ...flows.flatMap((f) => f.incomplete ?? []));
  return merged;
}

function parseLineage(v: unknown): Lineage | undefined {
  if (!isPlainObject(v)) return undefined;
  const type = LINEAGE_TYPES.find((t) => t === v.type);
  const via = LINEAGE_VIAS.find((t) => t === v.via);
  if (type === undefined || via === undefined) return undefined;
  const id =
    type === 'unknown' ? (v.id === null ? null : undefined) : isSafeString(v.id) ? v.id : undefined;
  return id === undefined
    ? undefined
    : { type, id, via, ...(isSafeString(v.started) && { started: v.started }) };
}

/** Drop repeated lineage entries (official `dp`). */
export function dedupeLineage(list: Lineage[]): Lineage[] {
  const seen = new Set<string>();
  return list.filter((l) => {
    const key = `${l.type}\n${l.id ?? ''}\n${l.via}\n${l.started ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Sessions a `derived-from` row names, and whether any entry was unreadable (official `aj`). */
export function parseDerivedFrom(row: Rec): { sessions: Lineage[]; lost: boolean } {
  if (row.v !== DATA_FLOW_VERSION || !Array.isArray(row.sessions))
    return { sessions: [], lost: true };
  const parsed = row.sessions.map(parseLineage);
  return {
    sessions: dedupeLineage(parsed.flatMap((l) => l ?? [])),
    lost: parsed.some((l) => l === undefined),
  };
}

export function sessionLineage(id: string, via: string): Lineage {
  return { type: 'claude_code_session', id, via };
}

/** A lowercase organization uuid, or undefined (official `dj` with no prior value). */
export function organizationUuid(v: unknown): string | undefined {
  return typeof v === 'string' && UUID_RE.test(v) ? v.toLowerCase() : undefined;
}

const RESTRICTIONS = ['ldr'];

/** A `session-owner` row's owner (official `pj`). */
export function parseOwner(
  row: Rec
): { accountUuid: string; organizationUuid?: string; restricted?: string[] } | undefined {
  if (typeof row.accountUuid !== 'string' || row.accountUuid === '') return undefined;
  const listed = Array.isArray(row.restricted) ? row.restricted : [];
  const restricted = RESTRICTIONS.filter((r) => listed.includes(r));
  return {
    accountUuid: row.accountUuid,
    organizationUuid: typeof row.organizationUuid === 'string' ? row.organizationUuid : undefined,
    ...(restricted.length > 0 && { restricted }),
  };
}
