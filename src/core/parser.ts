/**
 * NDJSON stream parser
 *
 * Parses newline-delimited JSON output from Claude CLI.
 *
 * NDJSON Protocol:
 * - One JSON object per line separated by \n
 * - Empty lines should be skipped
 * - No trailing commas or multiple objects per line
 *
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 *
 * Note: Uses node:readline for cross-runtime compatibility
 * (works in Node.js, Bun, and Deno)
 */

import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';
import type { SDKMessage } from '../types/index.ts';

/**
 * Parse NDJSON stream line by line
 *
 * Uses node:readline for proper line buffering (recommended by gist spec)
 *
 * Reference: https://gist.github.com/SamSaffron/603648958a8c18ceae34939a8951d417
 *
 * @param stream Readable stream (stdout from CLI process)
 * @yields SDKMessage objects parsed from NDJSON
 */
export async function* parseNDJSON(
  stream: Readable
): AsyncIterableIterator<SDKMessage> {
  const rl = createInterface({
    input: stream,
    crlfDelay: Infinity  // Treat \r\n as single line break
  });

  try {
    for await (const line of rl) {
      // Skip empty lines
      if (!line.trim()) continue;

      try {
        const message = JSON.parse(line) as SDKMessage;
        yield message;

        // Stop after result message (per gist spec)
        // Result message indicates the query has completed
        if (message.type === 'result') {
          break;
        }
      } catch (e) {
        console.error('Failed to parse NDJSON line:', line, e);
        // Continue parsing other lines
      }
    }
  } finally {
    rl.close();
  }
}
