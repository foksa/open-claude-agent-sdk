/**
 * Simplest possible test - just spawn and read stdout
 */

import { spawn } from 'node:child_process';

console.log('Spawning claude...');

const process = spawn('/Users/marshal/.local/bin/claude', [
  '--print',
  '--output-format', 'stream-json',
  '--verbose',
  '--permission-mode', 'bypassPermissions',
  '--max-turns', '1',
  '--',
  'Say hello in one word'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false,
});

console.log('PID:', process.pid);

let output = '';
let lineCount = 0;

process.stdout?.on('data', (data) => {
  output += data.toString();
  const lines = output.split('\n');

  // Process complete lines
  while (lines.length > 1) {
    const line = lines.shift()!;
    if (line.trim()) {
      lineCount++;
      console.log(`Line ${lineCount}:`, line.substring(0, 100) + '...');

      try {
        const msg = JSON.parse(line);
        if (msg.type === 'result') {
          console.log('\n✓ Got result! Killing process...');
          process.kill();
          process.exit(0);
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
  }

  output = lines[0] || '';
});

process.on('exit', (code) => {
  console.log('\nProcess exited with code:', code);
});

setTimeout(() => {
  console.log('\nTimeout! Killing...');
  process.kill();
  process.exit(1);
}, 45000);
