#!/usr/bin/env node
/**
 * Capture CLI - Mock CLI that captures stdin messages for unit testing
 *
 * Usage: node capture-cli.cjs
 *
 * Captures all stdin messages to a JSON file, returns minimal valid responses.
 * Used for unit testing SDK stdin compatibility without real API calls.
 *
 * Output file: Uses CAPTURE_OUTPUT_FILE env var or /tmp/capture-<pid>.json
 */

const readline = require('node:readline');
const fs = require('node:fs');

// Output file from env var or default based on PID for uniqueness
const outputFile = process.env.CAPTURE_OUTPUT_FILE || `/tmp/capture-${process.pid}.json`;
const messages = [];

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
    messages.push(msg);

    // If this is the init control_request, send response
    if (
      msg.type === 'control_request' &&
      msg.request?.subtype === 'initialize' &&
      !initResponseSent
    ) {
      initResponseSent = true;
      // Send control_response for init
      console.log(
        JSON.stringify({
          type: 'control_response',
          response: {
            subtype: 'success',
            request_id: msg.request_id,
            response: { commands: [] },
          },
        })
      );
    }
  } catch (e) {
    messages.push({ raw: line, error: e.message });
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

// After delay, send result and save captured messages
setTimeout(() => {
  // Save captured messages FIRST (atomically via temp file)
  const tempFile = `${outputFile}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(messages, null, 2));
  fs.renameSync(tempFile, outputFile);

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
  fs.writeFileSync(outputFile, JSON.stringify(messages, null, 2));
});
