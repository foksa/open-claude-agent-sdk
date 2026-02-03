#!/usr/bin/env node
/**
 * Capture CLI - Captures stdin/stdout for protocol comparison
 *
 * Set COMPARE_OUTPUT_FILE env var before running.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const REAL_CLI = path.join(__dirname, '../../node_modules/@anthropic-ai/claude-agent-sdk/cli.js');
const outputFile = process.env.COMPARE_OUTPUT_FILE;

if (!outputFile) {
  console.error('COMPARE_OUTPUT_FILE required');
  process.exit(1);
}

const capture = { stdin: [], stdout: [], startTime: Date.now() };

const cli = spawn(REAL_CLI, process.argv.slice(2), {
  stdio: ['pipe', 'pipe', process.stderr]
});

process.stdin.on('data', (chunk) => {
  const data = chunk.toString();
  for (const line of data.split('\n').filter(l => l.trim())) {
    try {
      capture.stdin.push({ timestamp: Date.now() - capture.startTime, message: JSON.parse(line) });
    } catch { capture.stdin.push({ timestamp: Date.now() - capture.startTime, raw: line }); }
  }
  cli.stdin.write(chunk);
});

process.stdin.on('end', () => cli.stdin.end());

cli.stdout.on('data', (chunk) => {
  const data = chunk.toString();
  for (const line of data.split('\n').filter(l => l.trim())) {
    try {
      capture.stdout.push({ timestamp: Date.now() - capture.startTime, message: JSON.parse(line) });
    } catch { capture.stdout.push({ timestamp: Date.now() - capture.startTime, raw: line }); }
  }
  process.stdout.write(chunk);
});

function save() {
  capture.duration = Date.now() - capture.startTime;
  fs.writeFileSync(`${outputFile}.tmp`, JSON.stringify(capture, null, 2));
  fs.renameSync(`${outputFile}.tmp`, outputFile);
}

cli.on('exit', (code) => { save(); process.exit(code || 0); });
cli.on('error', () => { save(); process.exit(1); });
process.on('SIGINT', () => cli.kill('SIGINT'));
process.on('SIGTERM', () => cli.kill('SIGTERM'));
