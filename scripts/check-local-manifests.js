#!/usr/bin/env node
/**
 * Check local kdna.json manifests against registry trust fields.
 *
 * This is intentionally local-workspace aware: it prevents the registry from
 * going green while checked-out domain repositories drift on release metadata.
 */

const fs = require('fs');
const path = require('path');

const registryDir = path.join(__dirname, '..');
const workspaceRoot = path.resolve(registryDir, '..', '..');
const registry = JSON.parse(fs.readFileSync(path.join(registryDir, 'domains.json'), 'utf8'));
const registryByName = new Map(registry.domains.map((domain) => [domain.name, domain]));
const fields = ['version', 'status', 'access', 'quality_badge', 'risk_level', 'signature', 'release_status'];

function walk(dir, depth, manifests) {
  if (!fs.existsSync(dir) || depth > 2) return;

  const manifest = path.join(dir, 'kdna.json');
  if (fs.existsSync(manifest)) manifests.push(manifest);

  if (depth === 2) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    walk(path.join(dir, entry.name), depth + 1, manifests);
  }
}

const manifests = [];
for (const base of ['OPEN_SOURCE', 'PRIVATE']) {
  walk(path.join(workspaceRoot, base), 0, manifests);
}

const errors = [];
let checked = 0;

for (const file of manifests.sort()) {
  let local;
  try {
    local = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    errors.push(`${path.relative(workspaceRoot, file)}: cannot parse kdna.json: ${e.message}`);
    continue;
  }

  const registered = registryByName.get(local.name);
  if (!registered) continue;
  checked++;

  for (const field of fields) {
    const localValue = local[field] ?? '';
    const registryValue = registered[field] ?? '';
    if (localValue !== registryValue) {
      errors.push(
        `${local.name}: ${field} drift in ${path.relative(workspaceRoot, file)} ` +
          `(local=${JSON.stringify(localValue)}, registry=${JSON.stringify(registryValue)})`,
      );
    }
  }
}

if (errors.length) {
  console.error('Local manifest drift detected:');
  errors.forEach((error) => console.error(`  ✗ ${error}`));
  process.exit(1);
}

console.log(`✓ ${checked} registered local manifest(s) match registry trust fields`);
