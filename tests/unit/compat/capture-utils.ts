/**
 * Shared capture infrastructure for SDK compatibility tests
 *
 * Provides utilities to run both lite and official SDKs through a capture proxy
 * and compare CLI arguments and stdin messages.
 */

import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { query as officialQuery } from '@anthropic-ai/claude-agent-sdk';
import { query as liteQuery } from '../../../src/api/query.ts';
import type { Query } from '../../../src/types/index.ts';

export { liteQuery, officialQuery };

export const CAPTURE_CLI = './src/tools/capture-cli.cjs';

// Global counter to ensure unique file names even in parallel
let captureCounter = 0;

/**
 * Shape of captured stdin messages from capture-cli.cjs
 *
 * Captured messages are either control_request (with .request) or
 * user messages (with .message). Both always have their respective fields.
 */
export type StdinMessage = {
  type: string;
  request_id?: string;
  request: {
    subtype: string;
    systemPrompt?: string;
    appendSystemPrompt?: string;
    hooks?: Record<string, Array<{ matcher?: string; hookCallbackIds?: string[] }>>;
    serverName?: string;
    enabled?: boolean;
    servers?: Record<string, unknown>;
    [key: string]: unknown;
  };
  message: {
    role: string;
    content: Array<{ type: string; text: string }>;
    [key: string]: unknown;
  };
  session_id?: string;
  timestamp?: string;
  [key: string]: unknown;
};

export type CaptureResult = {
  args: string[];
  stdin: StdinMessage[];
};

/**
 * Run SDK query and capture CLI args + stdin messages
 */
export async function capture(
  queryFn: typeof liteQuery,
  prompt: string,
  options: Record<string, unknown> = {}
): Promise<CaptureResult> {
  // Use counter + random for uniqueness even in parallel tests
  const uniqueId = `${Date.now()}-${++captureCounter}-${Math.random().toString(36).slice(2)}`;
  const outputFile = `/tmp/capture-${uniqueId}.json`;

  // Create a wrapper script that sets the env var for this specific run
  const wrapperScript = `/tmp/capture-wrapper-${uniqueId}.sh`;
  const wrapperContent = `#!/bin/bash
CAPTURE_OUTPUT_FILE="${outputFile}" exec node "${process.cwd()}/${CAPTURE_CLI}" "$@"
`;
  writeFileSync(wrapperScript, wrapperContent, { mode: 0o755 });

  const opts = {
    pathToClaudeCodeExecutable: wrapperScript,
    settingSources: [],
    maxTurns: 1,
    ...options,
  };

  try {
    for await (const msg of queryFn({ prompt, options: opts })) {
      if (msg.type === 'result') break;
    }
  } catch {
    // May error on mock CLI closing, that's ok
  }

  // Give CLI time to write file
  await new Promise((r) => setTimeout(r, 300));

  // Cleanup wrapper script
  try {
    unlinkSync(wrapperScript);
  } catch {
    // Ignore
  }

  // Read captured data
  if (existsSync(outputFile)) {
    try {
      const captured = JSON.parse(readFileSync(outputFile, 'utf-8'));
      unlinkSync(outputFile);
      return captured;
    } catch (e) {
      console.error('Failed to read capture file:', outputFile, e);
      return { args: [], stdin: [] };
    }
  }

  console.error('Capture file not found:', outputFile);
  return { args: [], stdin: [] };
}

/**
 * Run SDK query, call a method on the Query object, then consume and capture
 */
export async function captureWithQuery(
  queryFn: typeof liteQuery,
  prompt: string,
  queryCallback: (q: Query) => Promise<void>,
  options: Record<string, unknown> = {}
): Promise<CaptureResult> {
  const uniqueId = `${Date.now()}-${++captureCounter}-${Math.random().toString(36).slice(2)}`;
  const outputFile = `/tmp/capture-${uniqueId}.json`;

  const wrapperScript = `/tmp/capture-wrapper-${uniqueId}.sh`;
  const wrapperContent = `#!/bin/bash
CAPTURE_OUTPUT_FILE="${outputFile}" exec node "${process.cwd()}/${CAPTURE_CLI}" "$@"
`;
  writeFileSync(wrapperScript, wrapperContent, { mode: 0o755 });

  const opts = {
    pathToClaudeCodeExecutable: wrapperScript,
    settingSources: [],
    maxTurns: 1,
    ...options,
  };

  try {
    const q = queryFn({ prompt, options: opts });
    await queryCallback(q);
    for await (const msg of q) {
      if (msg.type === 'result') break;
    }
  } catch {
    // May error on mock CLI closing, that's ok
  }

  await new Promise((r) => setTimeout(r, 300));

  try {
    unlinkSync(wrapperScript);
  } catch {
    // Ignore
  }

  if (existsSync(outputFile)) {
    try {
      const captured = JSON.parse(readFileSync(outputFile, 'utf-8'));
      unlinkSync(outputFile);
      return captured;
    } catch (e) {
      console.error('Failed to read capture file:', outputFile, e);
      return { args: [], stdin: [] };
    }
  }

  console.error('Capture file not found:', outputFile);
  return { args: [], stdin: [] };
}

/**
 * Normalize messages for comparison (remove dynamic fields)
 */
export function normalizeMessage(msg: StdinMessage): StdinMessage {
  const clone = JSON.parse(JSON.stringify(msg)) as StdinMessage;

  // Remove dynamic fields that will differ
  delete clone.request_id;
  delete clone.timestamp;
  delete clone.session_id;

  if (clone.request) {
    delete clone.request.request_id;
  }

  // Normalize hook callback IDs (they're generated dynamically)
  if (clone.request?.hooks) {
    for (const [_event, matchers] of Object.entries(clone.request.hooks)) {
      for (const matcher of matchers) {
        if (matcher.hookCallbackIds) {
          matcher.hookCallbackIds = matcher.hookCallbackIds.map(
            (_: string, i: number) => `hook_${i}`
          );
        }
      }
    }
  }

  return clone;
}
