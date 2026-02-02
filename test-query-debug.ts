/**
 * Debug test script
 */

import { detectClaudeBinary } from './src/core/detection.ts';
import { buildCliArgs, spawnClaude } from './src/core/spawn.ts';
import { parseNDJSON } from './src/core/parser.ts';

console.log('1. Detecting binary...');
const binary = detectClaudeBinary();
console.log('   Found:', binary);

console.log('\n2. Building args...');
const args = buildCliArgs({
  prompt: 'Say hello in one word',
  permissionMode: 'bypassPermissions',
  allowDangerouslySkipPermissions: true,
  maxTurns: 1,
});
console.log('   Args:', args.join(' '));

console.log('\n3. Spawning process...');
const process = spawnClaude(binary, args);
console.log('   Process PID:', process.pid);

console.log('\n4. Parsing NDJSON output...');
try {
  for await (const msg of parseNDJSON(process.stdout!)) {
    console.log('   [' + msg.type + ']', msg.type === 'result' ? 'Result' : '');
    if (msg.type === 'result') {
      console.log('\n5. Got result, breaking...');
      break;
    }
  }
} catch (err: any) {
  console.error('   Parse error:', err.message);
}

console.log('\n6. Waiting for process exit...');
await new Promise<void>((resolve, reject) => {
  process.on('exit', (code) => {
    console.log('   Exit code:', code);
    resolve();
  });
  process.on('error', reject);

  // Timeout after 5 seconds
  setTimeout(() => {
    console.log('   Timeout! Killing process...');
    process.kill();
    resolve();
  }, 5000);
});

console.log('\n✓ Done!');
