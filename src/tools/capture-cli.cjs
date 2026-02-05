#!/usr/bin/env node

/**
 * Capture CLI - Mock CLI that captures stdin messages and CLI args for unit testing
 *
 * This tool is used for unit tests to verify that the SDK sends correct CLI arguments
 * and stdin messages without actually running the real CLI.
 *
 * @example
 * ```typescript
 * import { query } from 'lite-claude-agent-sdk';
 *
 * const outputFile = `/tmp/capture-${Date.now()}.json`;
 * process.env.CAPTURE_OUTPUT_FILE = outputFile;
 *
 * const result = query({
 *   prompt: 'Hello',
 *   options: {
 *     pathToClaudeCodeExecutable: './src/tools/capture-cli.cjs'
 *   }
 * });
 *
 * for await (const msg of result) {
 *   if (msg.type === 'result') break;
 * }
 *
 * // Check captured data
 * const captured = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
 * console.log(captured.args);   // CLI arguments
 * console.log(captured.stdin);  // Stdin messages
 * ```
 *
 * Output file format:
 * ```json
 * {
 *   "args": ["--model", "sonnet", "--max-turns", "5", ...],
 *   "stdin": [
 *     { "type": "control_request", "request": { "subtype": "initialize", ... } },
 *     { "type": "user", "message": { ... } }
 *   ]
 * }
 * ```
 *
 * @see tests/unit/sdk-compatibility.test.ts for usage examples
 */

const readline = require('node:readline');
const fs = require('node:fs');

// Output file from env var or default based on PID for uniqueness
const outputFile = process.env.CAPTURE_OUTPUT_FILE || `/tmp/capture-${process.pid}.json`;

// Capture CLI args (skip node and script path)
const cliArgs = process.argv.slice(2);

// Capture stdin messages
const stdinMessages = [];

// Track if we've sent init response
let initResponseSent = false;

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on('line', (line) => {
  if (!line.trim()) return;

  try {
    const msg = JSON.parse(line);
    stdinMessages.push(msg);

    // Respond to control_requests so the SDK doesn't hang
    if (msg.type === 'control_request') {
      if (msg.request?.subtype === 'initialize' && !initResponseSent) {
        initResponseSent = true;
        console.log(
          JSON.stringify({
            type: 'control_response',
            response: {
              subtype: 'success',
              request_id: msg.request_id,
              response: {
                commands: [],
                models: [],
                account: {},
                output_style: 'text',
                available_output_styles: ['text', 'json'],
              },
            },
          })
        );
      } else if (msg.request?.subtype === 'mcp_status') {
        console.log(
          JSON.stringify({
            type: 'control_response',
            response: {
              subtype: 'success',
              request_id: msg.request_id,
              response: { mcpServers: [] },
            },
          })
        );
      } else if (msg.request?.subtype !== 'initialize') {
        // Generic success response for other control requests
        console.log(
          JSON.stringify({
            type: 'control_response',
            response: {
              subtype: 'success',
              request_id: msg.request_id,
              response: {},
            },
          })
        );
      }
    }
  } catch (e) {
    stdinMessages.push({ raw: line, error: e.message });
  }
});

// Send minimal system message immediately
console.log(
  JSON.stringify({
    type: 'system',
    subtype: 'init',
    session_id: `test-session-${Date.now()}`,
    model: 'test-model',
    tools: [],
    permissionMode: 'bypassPermissions',
    cwd: process.cwd(),
  })
);

/**
 * Save captured data to output file
 */
function saveCapture() {
  const capture = {
    args: cliArgs,
    stdin: stdinMessages,
  };
  const tempFile = `${outputFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(capture, null, 2));
  fs.renameSync(tempFile, outputFile);
}

// After delay, send result and save captured data
setTimeout(() => {
  // Save captured data FIRST
  saveCapture();

  // Then send result
  console.log(
    JSON.stringify({
      type: 'result',
      subtype: 'success',
      is_error: false,
      result: 'Mock response from capture-cli',
      duration_ms: 100,
      num_turns: 1,
    })
  );

  // Exit cleanly
  process.exit(0);
}, 300);

// Handle stdin close
process.stdin.on('end', () => {
  saveCapture();
});
