#!/usr/bin/env node

/**
 * Proxy CLI - Intercepts all stdin/stdout communication between SDK and CLI
 *
 * This tool is essential for debugging and reverse-engineering the Claude CLI protocol.
 * It sits between the SDK and the real CLI, logging all messages while passing them through.
 *
 * @example
 * ```typescript
 * import { query } from 'open-claude-agent-sdk';
 *
 * const result = query({
 *   prompt: 'Hello',
 *   options: {
 *     pathToClaudeCodeExecutable: './src/tools/proxy-cli.cjs'
 *   }
 * });
 * ```
 *
 * Then check the logs:
 * ```bash
 * cat tests/research/logs/proxy-*.log
 * ```
 *
 * The real CLI is the native binary the official SDK ships in its platform
 * package (`@anthropic-ai/claude-agent-sdk-<platform>-<arch>/claude`), resolved
 * the same way the official SDK resolves it. Override with
 * `PROXY_REAL_CLI=/path/to/claude`. Set `PROXY_LOG_LABEL` (e.g. `open` /
 * `official`) to tell the two SDKs' logs apart.
 *
 * @see docs/guides/REVERSE_ENGINEERING.md for full usage guide
 */

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const PLATFORM_PACKAGE = '@anthropic-ai/claude-agent-sdk';

/** Whether this Linux host uses musl rather than glibc (official SDK check). */
function preferMusl() {
  if (process.platform !== 'linux') return false;
  const report =
    typeof process.report?.getReport === 'function' ? process.report.getReport() : null;
  return report != null && report.header?.glibcVersionRuntime === undefined;
}

/** The SDK's bundled native CLI for this platform, in the official SDK's lookup order. */
function findBundledCli() {
  const { platform, arch } = process;
  const base = `${PLATFORM_PACKAGE}-${platform === 'android' ? 'linux' : platform}-${arch}`;
  const candidates =
    platform === 'android'
      ? [`${base}-android`]
      : platform === 'linux'
        ? preferMusl()
          ? [`${base}-musl`, base]
          : [base, `${base}-musl`]
        : [base];
  const exe = platform === 'win32' ? '.exe' : '';
  for (const pkg of candidates) {
    try {
      const resolved = require.resolve(`${pkg}/claude${exe}`, {
        paths: [path.join(__dirname, '../..')],
      });
      if (fs.existsSync(resolved)) return resolved;
    } catch {}
  }
  return null;
}

const REAL_CLI = process.env.PROXY_REAL_CLI || findBundledCli();
if (!REAL_CLI) {
  process.stderr.write(
    `proxy-cli: no bundled Claude Code binary found for ${process.platform}-${process.arch}; ` +
      'install the official SDK (a devDependency) or set PROXY_REAL_CLI\n'
  );
  process.exit(1);
}

// Log file directory (in tests/research/logs/)
const logDir = path.join(__dirname, '../../tests/research/logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const timestamp = Date.now();
const label = process.env.PROXY_LOG_LABEL ? `${process.env.PROXY_LOG_LABEL}-` : '';
const logFile = path.join(logDir, `proxy-${label}${timestamp}-${process.pid}.log`);

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

// Spawn the native binary directly with the same args and env
const realCli = spawn(REAL_CLI, process.argv.slice(2), {
  stdio: ['pipe', 'pipe', process.stderr], // stderr goes directly through
  windowsHide: true,
});

/** Split a stream into complete lines; NDJSON messages can span chunks. */
function lineSplitter(onLine) {
  let buffered = '';
  return {
    push(chunk) {
      buffered += chunk.toString();
      const lines = buffered.split('\n');
      buffered = lines.pop();
      for (const line of lines) if (line.trim()) onLine(line);
    },
    flush() {
      if (buffered.trim()) onLine(buffered);
      buffered = '';
    },
  };
}

// Log stdin (what SDK sends to CLI)
let stdinMessageCount = 0;
const stdinLines = lineSplitter((line) => {
  stdinMessageCount++;
  log(`STDIN #${stdinMessageCount}:`);
  try {
    log(JSON.stringify(JSON.parse(line), null, 2));
  } catch {
    log(line);
  }
  log('');
});
// The CLI may exit before the SDK stops writing
realCli.stdin.on('error', () => {});
process.stdin.on('data', (chunk) => {
  stdinLines.push(chunk);
  realCli.stdin.write(chunk);
});

process.stdin.on('end', () => {
  stdinLines.flush();
  log('STDIN closed');
  realCli.stdin.end();
});

// Log stdout (what CLI sends back to SDK)
let stdoutMessageCount = 0;
const stdoutLines = lineSplitter((line) => {
  stdoutMessageCount++;
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return; // Not JSON, just count it
  }
  const summary = `${parsed.type}${parsed.subtype ? `:${parsed.subtype}` : ''}`;
  if (parsed.type === 'control_request') {
    // Log control requests in full detail
    log(`STDOUT #${stdoutMessageCount}: ${summary}`);
    log(JSON.stringify(parsed, null, 2));
    log('');
  } else if (parsed.type === 'control_response') {
    log(
      `STDOUT #${stdoutMessageCount}: ${summary} (${parsed.response?.subtype} ${parsed.response?.request_id})`
    );
  } else if (parsed.type === 'result') {
    const usage = parsed.usage || {};
    log(
      `STDOUT #${stdoutMessageCount}: ${summary} (cache_creation=${usage.cache_creation_input_tokens}, cache_read=${usage.cache_read_input_tokens})`
    );
  } else if (parsed.type === 'system' && parsed.subtype === 'init') {
    log(`STDOUT #${stdoutMessageCount}: ${summary} (tools=${parsed.tools?.length || 0})`);
  } else if (parsed.type === 'system' && parsed.subtype === 'session_state_changed') {
    log(`STDOUT #${stdoutMessageCount}: ${summary} (${parsed.state})`);
  } else {
    log(`STDOUT #${stdoutMessageCount}: ${summary}`);
  }
});
realCli.stdout.on('data', (chunk) => {
  stdoutLines.push(chunk);
  // Forward to SDK
  process.stdout.write(chunk);
});
realCli.stdout.on('end', () => stdoutLines.flush());

// Handle exit
realCli.on('close', (code, signal) => {
  log('');
  log('='.repeat(70));
  log(`PROXY CLI EXITING`);
  log(`Exit code: ${code}`);
  log(`Signal: ${signal}`);
  log(`Total stdin messages: ${stdinMessageCount}`);
  log(`Total stdout messages: ${stdoutMessageCount}`);
  log('='.repeat(70));

  // Mirror a signal death so the SDK sees the same exit as without the proxy
  if (signal) {
    // Our own SIGINT/SIGTERM forwarders would swallow the re-raised signal
    process.removeAllListeners(signal);
    process.kill(process.pid, signal);
  } else process.exit(code ?? 0);
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
