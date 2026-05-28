#!/usr/bin/env node

const { execFileSync } = require('child_process');

const checks = [
  ['npm', ['test']],
  ['npm', ['run', 'check:file-count']],
  ['node', ['scripts/check-domain-trust-gate.js']],
  ['npm', ['run', 'validate:remote']],
  ['git', ['diff', '--check']],
];

for (const [command, args] of checks) {
  console.log(`\n$ ${command} ${args.join(' ')}`);
  execFileSync(command, args, { stdio: 'inherit' });
}

console.log('\nKDNA registry release preflight passed');
