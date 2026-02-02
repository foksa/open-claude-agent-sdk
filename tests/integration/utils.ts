/**
 * Integration test utilities
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { SDKMessage } from '../../src/types/index.ts';

/**
 * Record messages to NDJSON snapshot file for debugging
 *
 * @param testName Test name (will be slugified for filename)
 * @param messages Array of SDK messages to record
 * @returns Path to snapshot file
 */
export async function recordSnapshot(
  testName: string,
  messages: SDKMessage[]
): Promise<string> {
  const snapshotsDir = join(import.meta.dir, '../snapshots');
  await mkdir(snapshotsDir, { recursive: true });

  const filename = `${testName.replace(/\s+/g, '-').toLowerCase()}.jsonl`;
  const filepath = join(snapshotsDir, filename);

  // Write as NDJSON (newline-delimited JSON)
  const ndjson = messages.map(m => JSON.stringify(m)).join('\n') + '\n';
  await writeFile(filepath, ndjson);

  return filepath;
}
