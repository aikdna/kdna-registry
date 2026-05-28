#!/usr/bin/env node

const fs = require('fs');

const registry = JSON.parse(fs.readFileSync('domains.json', 'utf8'));
const yanked = (registry.domains || []).filter((entry) => entry.yanked === true);

if (!yanked.length) {
  console.log('No yanked registry assets.');
  process.exit(0);
}

console.log(`${yanked.length} yanked registry asset(s):`);
console.log('');

for (const entry of yanked) {
  const repo = entry.repo || '(no repo)';
  const reason = entry.yanked_reason || '(no reason)';
  const version = entry.version || '?';
  console.log(`- ${entry.name}@${version}`);
  console.log(`  repo: ${repo}`);
  console.log(`  reason: ${reason}`);
  if (entry.asset_url) console.log(`  old asset: ${entry.asset_url}`);
  console.log('');
}
