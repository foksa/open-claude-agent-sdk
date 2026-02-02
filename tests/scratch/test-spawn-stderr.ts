/**
 * Test with stderr logging
 */

import { spawn } from 'node:child_process';

console.log('Spawning claude...');

const proc = spawn('/Users/marshal/.local/bin/claude', [
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

console.log('PID:', proc.pid);

proc.stdout?.on('data', (data) => {
  console.log('[STDOUT]', data.toString().substring(0, 200));
});

proc.stderr?.on('data', (data) => {
  console.error('[STDERR]', data.toString());
});

proc.on('exit', (code) => {
  console.log('\nProcess exited with code:', code);
  if (code === 0) {
    Bun.exit(0);
  } else {
    Bun.exit(1);
  }
});

setTimeout(() => {
  console.log('\nTimeout! Killing...');
  proc.kill('SIGTERM');
  Bun.exit(1);
}, 45000);
