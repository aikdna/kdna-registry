#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const registryPath = path.join(__dirname, '..', 'domains.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const checkRemote = process.argv.includes('--remote');

const errors = [];
const warnings = [];
const seen = new Set();

const legacyIds = new Set([
  'business-growth',
  'communication',
  'sales',
  'management',
  'product-decision',
  'writing-basic',
  'speaking-basic',
  'management-basic',
  'test_domain',
]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function fetchJson(url) {
  const raw = execFileSync('curl', ['-fsSL', url], {
    encoding: 'utf8',
    timeout: 30000,
  });
  return JSON.parse(raw);
}

function repoNameFromUrl(repoUrl) {
  return repoUrl.replace(/\.git$/, '').split('/').pop();
}

function rawManifestUrl(repoUrl) {
  const match = repoUrl.match(/^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/);
  if (!match) return null;
  return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/main/kdna.json`;
}

function validateManifest(id, domain, manifest) {
  if (!manifest) {
    fail(`${id}: kdna.json manifest not found or invalid`);
    return;
  }
  if (manifest.name !== id) {
    fail(`${id}: manifest name "${manifest.name || 'missing'}" does not match registry id`);
  }
  if (manifest.version !== domain.version) {
    fail(`${id}: manifest version "${manifest.version || 'missing'}" does not match registry version "${domain.version}"`);
  }
  if (manifest.status !== domain.status) {
    fail(`${id}: manifest status "${manifest.status || 'missing'}" does not match registry status "${domain.status}"`);
  }
  if (manifest.file_count !== domain.file_count) {
    fail(`${id}: manifest file_count "${manifest.file_count || 'missing'}" does not match registry file_count "${domain.file_count}"`);
  }
  if (manifest.kdna_spec !== domain.spec_version) {
    fail(`${id}: manifest kdna_spec "${manifest.kdna_spec || 'missing'}" does not match registry spec_version "${domain.spec_version}"`);
  }
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

    const localRepo = path.join(__dirname, '..', '..', repoNameFromUrl(domain.repo));
    if (fs.existsSync(localRepo)) {
      validateManifest(id, domain, readJson(path.join(localRepo, 'kdna.json')));
    }

    if (checkRemote) {
      try {
        execFileSync('git', ['ls-remote', '--heads', domain.repo, 'main'], {
          encoding: 'utf8',
          timeout: 30000,
        });
      } catch {
        fail(`${id}: remote repository is not reachable or has no main branch`);
      }

      try {
        const manifestUrl = rawManifestUrl(domain.repo);
        validateManifest(id, domain, fetchJson(manifestUrl));
      } catch {
        fail(`${id}: remote kdna.json could not be fetched or parsed`);
      }
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
