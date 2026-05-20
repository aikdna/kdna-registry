#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'domains.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const errors = [];
const warnings = [];
const seen = new Set();

const legacyIds = new Set([
  'writing',
  'knowledge_management',
  'prompt_diagnosis',
  'agent_safety',
  'open_source_project',
  'content_strategy',
  'test_domain',
]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

if (!registry.registry_version) fail('registry_version is required');
if (!Array.isArray(registry.domains)) fail('domains must be an array');

for (const domain of registry.domains || []) {
  const id = domain.id;
  if (!id) {
    fail('domain entry missing id');
    continue;
  }

  if (seen.has(id)) fail(`${id}: duplicate id`);
  seen.add(id);

  if (legacyIds.has(id)) {
    fail(`${id}: legacy first-wave domain must not be listed in the canonical registry`);
  }

  if (!/^[a-z][a-z0-9_]*$/.test(id)) {
    fail(`${id}: id must use lowercase snake_case`);
  }

  if (!domain.repo) {
    fail(`${id}: repo is required`);
  } else {
    if (!domain.repo.startsWith('https://github.com/knowledge-dna/kdna-')) {
      fail(`${id}: repo must be a standalone knowledge-dna/kdna-* repository`);
    }
    if (domain.repo.includes('/KDNA/tree/') || domain.repo.includes('/KDNA/')) {
      fail(`${id}: repo must not point into the protocol repository`);
    }
  }

  if (domain.spec_version !== '0.4') warn(`${id}: spec_version is ${domain.spec_version || 'missing'}, expected 0.4`);
  if (!['draft', 'experimental', 'stable', 'deprecated'].includes(domain.status)) {
    fail(`${id}: invalid status ${domain.status || 'missing'}`);
  }
  if (!Number.isInteger(domain.file_count) || domain.file_count < 2) {
    fail(`${id}: file_count must be an integer >= 2`);
  }
  if (domain.quality_badge && !['experimental', 'validated', 'stable'].includes(domain.quality_badge)) {
    warn(`${id}: unrecognized quality_badge ${domain.quality_badge}`);
  }
}

if (warnings.length) {
  console.log('Warnings:');
  for (const message of warnings) console.log(`  - ${message}`);
}

if (errors.length) {
  console.error('Errors:');
  for (const message of errors) console.error(`  - ${message}`);
  process.exit(1);
}

console.log(`Registry valid: ${registry.domains.length} domains`);
