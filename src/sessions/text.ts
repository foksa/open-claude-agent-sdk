/**
 * Text helpers for reading session metadata out of raw JSONL, ported from
 * the official SDK so summaries, prompts and titles come out identical.
 */

function unescapeJson(s: string): string {
  if (!s.includes('\\')) return s;
  try {
    return JSON.parse(`"${s}"`);
  } catch {
    return s;
  }
}

/** Value of the first `"key":"..."` occurrence in raw text (no JSON parse). */
export function firstStringField(text: string, key: string): string | undefined {
  for (const pattern of [`"${key}":"`, `"${key}": "`]) {
    const idx = text.indexOf(pattern);
    if (idx < 0) continue;
    const start = idx + pattern.length;
    let i = start;
    while (i < text.length) {
      if (text[i] === '\\') {
        i += 2;
        continue;
      }
      if (text[i] === '"') return unescapeJson(text.slice(start, i));
      i++;
    }
  }
  return undefined;
}

/** Value of the last `"key":"..."` occurrence in raw text (no JSON parse). */
export function lastStringField(text: string, key: string): string | undefined {
  let result: string | undefined;
  let resultAt = -1;
  for (const pattern of [`"${key}":"`, `"${key}": "`]) {
    let from = 0;
    while (true) {
      const idx = text.indexOf(pattern, from);
      if (idx < 0) break;
      const start = idx + pattern.length;
      let i = start;
      while (i < text.length) {
        if (text[i] === '\\') {
          i += 2;
          continue;
        }
        if (text[i] === '"') {
          if (idx > resultAt) {
            result = unescapeJson(text.slice(start, i));
            resultAt = idx;
          }
          break;
        }
        i++;
      }
      from = i + 1;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// First prompt extraction
// ---------------------------------------------------------------------------

const SKIPPED_PROMPT_RE = /^(?:\s*<[a-z][\w-]*[\s>]|\[Request interrupted by user[^\]]*\])/;
const COMMAND_NAME_RE = /<command-name>(.*?)<\/command-name>/;
const BASH_INPUT_RE = /<bash-input>([\s\S]*?)<\/bash-input>/;

function isHexId(s: string): boolean {
  if (s.length !== 4) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (!((c >= 48 && c <= 57) || (c >= 97 && c <= 102))) return false;
  }
  return true;
}

/** Replace `<pasted_content id="xxxx">` wrappers with their body text. */
function unwrapPastedContent(text: string): string {
  const parts: { kind: 'text' | 'block'; text: string }[] = [];
  let emitted = 0;
  let from = 0;
  for (;;) {
    const open = text.indexOf('<pasted_content id="', from);
    if (open === -1) break;
    const idStart = open + 20;
    const id = text.slice(idStart, idStart + 4);
    if (!isHexId(id) || !text.startsWith('">\n', idStart + 4)) {
      from = idStart;
      continue;
    }
    const bodyStart = idStart + 4 + 3;
    const closeTag = `</pasted_content id="${id}">`;
    const closeAt = text.indexOf(`\n${closeTag}`, bodyStart - 1) + 1;
    if (closeAt === 0) break;
    let blockStart = open;
    for (let n = 0; n < 2 && blockStart > emitted && text[blockStart - 1] === '\n'; n++)
      blockStart--;
    if (blockStart > emitted) parts.push({ kind: 'text', text: text.slice(emitted, blockStart) });
    emitted = closeAt + closeTag.length;
    for (let n = 0; n < 2 && text[emitted] === '\n'; n++) emitted++;
    parts.push({ kind: 'block', text: text.slice(bodyStart, closeAt - 1) });
    from = emitted;
  }
  if (emitted < text.length) parts.push({ kind: 'text', text: text.slice(emitted) });
  if (parts.length === 1 && parts[0].kind === 'text') return text;
  return parts.map((p) => p.text).join('');
}

/** Truncate to `max` UTF-16 units without leaving a dangling high surrogate. */
function truncateUtf16(s: string, max: number): string {
  if (max <= 0) return '';
  if (s.length <= max) return s;
  let cut = s.slice(0, max);
  const last = cut.charCodeAt(max - 1);
  if (last >= 0xd800 && last <= 0xdbff) cut = cut.slice(0, -1);
  return Buffer.from(cut, 'utf16le').toString('utf16le');
}

type PromptState = { commandFallback: string };

/**
 * Display text of a user prompt entry, or undefined when the entry is not a
 * real prompt (meta, tool result, markup-only). Slash commands are recorded
 * in `state.commandFallback` instead.
 */
export function promptText(entry: Record<string, unknown>, state: PromptState): string | undefined {
  if (entry.type !== 'user') return undefined;
  if (entry.isMeta === true || entry.isCompactSummary === true) return undefined;
  const message = entry.message as { content?: unknown } | undefined;
  if (!message) return undefined;
  const content = message.content;
  const texts: string[] = [];
  if (typeof content === 'string') texts.push(content);
  else if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue;
      if (block.type === 'tool_result') return undefined;
      if (block.type === 'text' && typeof block.text === 'string') texts.push(block.text);
    }
  }
  for (const raw of texts) {
    let text = unwrapPastedContent(raw).replaceAll('\n', ' ').trim();
    if (!text) continue;
    const command = COMMAND_NAME_RE.exec(text);
    if (command) {
      if (!state.commandFallback) state.commandFallback = command[1];
      continue;
    }
    const bash = BASH_INPUT_RE.exec(text);
    if (bash) return `! ${bash[1].trim()}`;
    if (SKIPPED_PROMPT_RE.test(text)) continue;
    if (text.length > 200) text = `${truncateUtf16(text, 200).trim()}…`;
    return text;
  }
  return undefined;
}

/** First real user prompt in raw JSONL head text, else the first slash command name. */
export function firstPromptFromHead(head: string): string {
  const state: PromptState = { commandFallback: '' };
  let offset = 0;
  while (offset < head.length) {
    const nl = head.indexOf('\n', offset);
    const line = nl >= 0 ? head.slice(offset, nl) : head.slice(offset);
    offset = nl >= 0 ? nl + 1 : head.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true')) continue;
    if (line.includes('"isCompactSummary":true') || line.includes('"isCompactSummary": true'))
      continue;
    try {
      const text = promptText(JSON.parse(line), state);
      if (text !== undefined) return text;
    } catch {}
  }
  return state.commandFallback;
}

/** "Image"/"Document" when the first user prompt is an attachment only. */
export function attachmentOnlyPrompt(head: string): string {
  let offset = 0;
  while (offset < head.length) {
    const nl = head.indexOf('\n', offset);
    const line = nl >= 0 ? head.slice(offset, nl) : head.slice(offset);
    offset = nl >= 0 ? nl + 1 : head.length;
    if (!line.includes('"type":"user"') && !line.includes('"type": "user"')) continue;
    if (line.includes('"tool_result"')) continue;
    if (line.includes('"isMeta":true') || line.includes('"isMeta": true')) continue;
    if (line.includes('"type":"image"') || line.includes('"type": "image"')) return 'Image';
    if (line.includes('"type":"document"') || line.includes('"type": "document"'))
      return 'Document';
  }
  return '';
}

/** First real prompt among parsed entries, else the first slash command name. */
export function firstPromptFromEntries(entries: unknown[]): string {
  const state: PromptState = { commandFallback: '' };
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue;
    const text = promptText(entry as Record<string, unknown>, state);
    if (text !== undefined) return text;
  }
  return state.commandFallback;
}

// ---------------------------------------------------------------------------
// Sanitization
// ---------------------------------------------------------------------------

function stripInvisible(s: string): string {
  return s
    .replace(/[\p{Cf}\p{Co}\p{Cn}]/gu, '')
    .replace(/[\u200B-\u200F]/g, '')
    .replace(/[\u202A-\u202E]/g, '')
    .replace(/[\u2066-\u2069]/g, '')
    .replace(/[\uFEFF]/g, '')
    .replace(/[\uE000-\uF8FF]/g, '');
}

const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g;

function stripInvisibleFixpoint(s: string): string {
  let current = s.replace(LONE_SURROGATE_RE, '');
  for (let i = 0; i < 10; i++) {
    const next = stripInvisible(current);
    if (next === current) return current;
    current = next;
  }
  return current;
}

/** NFKC-normalize and strip invisible/format characters until stable (tags). */
export function sanitizeUnicode(input: string): string {
  let current = input;
  let previous = '';
  let rounds = 0;
  const maxRounds = 10;
  while (current !== previous && rounds < maxRounds) {
    previous = current;
    current = stripInvisibleFixpoint(current.normalize('NFKC'));
    rounds++;
  }
  if (rounds >= maxRounds) {
    throw new Error(
      `Unicode sanitization reached maximum iterations (${maxRounds}) for input: ${input.slice(0, 100)}`
    );
  }
  return current;
}

const MAX_TITLE_CODE_POINTS = 200;

/** Clean a title read from a sidecar file: no control chars, at most 200 code points. */
export function cleanTitle(title: string): string {
  const spaced = title.trim().replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, ' ');
  // biome-ignore lint/suspicious/noControlCharactersInRegex: stripping control chars is the point
  const stripped = [...spaced.replace(/[\x00-\x1f\x7f-\x9f]/g, '')].slice(0, MAX_TITLE_CODE_POINTS);
  return stripped.join('').trim();
}
