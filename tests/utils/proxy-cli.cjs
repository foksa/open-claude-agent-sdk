#!/usr/bin/env node

/**
 * Proxy CLI that logs all input/output and passes through to real CLI
 *
 * Usage: Replace pathToClaudeCodeExecutable with this proxy
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

// Real CLI location
const REAL_CLI = path.join(__dirname, '../../node_modules/@anthropic-ai/claude-agent-sdk/cli.js');

// Log file (saved in tests/research/logs/)
const logDir = path.join(__dirname, '../research/logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const timestamp = Date.now();
const logFile = path.join(logDir, `proxy-${timestamp}.log`);

function log(message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  fs.appendFileSync(logFile, line);
}

log('='.repeat(70));
log('PROXY CLI STARTED');
log('='.repeat(70));
log(`Real CLI: ${REAL_CLI}`);
log(`Process args: ${process.argv.slice(2).join(' ')}`);
log('');

// Spawn real CLI with same args
const realCli = spawn(REAL_CLI, process.argv.slice(2), {
  stdio: ['pipe', 'pipe', process.stderr] // stderr goes directly through
});

// Log stdin (what SDK sends to CLI)
let stdinMessageCount = 0;
process.stdin.on('data', (chunk) => {
  stdinMessageCount++;
  const data = chunk.toString();

  log(`STDIN #${stdinMessageCount}:`);

  // Try to parse and pretty-print JSON
  const lines = data.trim().split('\n').filter(l => l);
  lines.forEach(line => {
    try {
      const parsed = JSON.parse(line);
      log(JSON.stringify(parsed, null, 2));
    } catch {
      log(line);
    }
  });
  log('');

  // Forward to real CLI
  realCli.stdin.write(chunk);
});

process.stdin.on('end', () => {
  log('STDIN closed');
  realCli.stdin.end();
});

// Log stdout (what CLI sends back to SDK)
let stdoutMessageCount = 0;
realCli.stdout.on('data', (chunk) => {
  stdoutMessageCount++;
  const data = chunk.toString();

  // Only log message types, not full content (too verbose)
  const lines = data.trim().split('\n').filter(l => l);
  lines.forEach(line => {
    try {
      const parsed = JSON.parse(line);
      const summary = `${parsed.type}${parsed.subtype ? `:${parsed.subtype}` : ''}`;

      // Log control_request in full detail
      if (parsed.type === 'control_request') {
        log(`STDOUT #${stdoutMessageCount}: ${summary}`);
        log(JSON.stringify(parsed, null, 2));
        log('');
      } else if (parsed.type === 'result') {
        const usage = parsed.usage || {};
        log(`STDOUT #${stdoutMessageCount}: ${summary} (cache_creation=${usage.cache_creation_input_tokens}, cache_read=${usage.cache_read_input_tokens})`);
      } else if (parsed.type === 'system' && parsed.subtype === 'init') {
        log(`STDOUT #${stdoutMessageCount}: ${summary} (tools=${parsed.tools?.length || 0})`);
      } else {
        log(`STDOUT #${stdoutMessageCount}: ${summary}`);
      }
    } catch {
      // Not JSON, just count it
    }
  });

  // Forward to SDK
  process.stdout.write(chunk);
});

// Handle exit
realCli.on('exit', (code, signal) => {
  log('');
  log('='.repeat(70));
  log(`PROXY CLI EXITING`);
  log(`Exit code: ${code}`);
  log(`Signal: ${signal}`);
  log(`Total stdin messages: ${stdinMessageCount}`);
  log(`Total stdout messages: ${stdoutMessageCount}`);
  log('='.repeat(70));

  process.exit(code || 0);
});

realCli.on('error', (err) => {
  log(`ERROR: ${err.message}`);
  process.exit(1);
});

// Handle our own signals
process.on('SIGINT', () => {
  log('Received SIGINT');
  realCli.kill('SIGINT');
});

process.on('SIGTERM', () => {
  log('Received SIGTERM');
  realCli.kill('SIGTERM');
});
