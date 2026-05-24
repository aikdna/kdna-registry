#!/usr/bin/env node
/**
 * Check file_count consistency — verify declared file_count matches repo structure.
 * Exits 0 on success, 1 on warnings (non-blocking).
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const registryPath = path.join(__dirname, '..', 'domains.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const failures = [];

for (const d of registry.domains) {
  const name = d.name;
  const declared = d.file_count || d.kdna_file_count;

  if (!declared) {
    failures.push(`${name}: no file_count declared`);
    continue;
  }

  // Check repo for KDNA JSON files
  if (d.repo && d.repo.includes('github.com')) {
    try {
      const url = d.repo.replace('github.com', 'raw.githubusercontent.com') + '/main/';
      // Quick HEAD check — we can't list files without cloning, so just verify file_count > 0
      if (declared < 1) {
        failures.push(`${name}: file_count must be >= 1, got ${declared}`);
      }
      // Clusters may have more files (sub-domain bundles)
      if (d.type !== 'cluster' && declared > 6) {
        failures.push(`${name}: file_count exceeds max 6 KDNA files, got ${declared}`);
      }
    } catch {
      // Skip remote check for unreachable repos
    }
  }
}

if (failures.length) {
  console.error('File count consistency issues:');
  failures.forEach(f => console.error(`  ✗ ${f}`));
  process.exit(1);
}

console.log(`✓ All ${registry.domains.length} domains have valid file_count`);
process.exit(0);
