#!/usr/bin/env node
/**
 * Validate kdna-registry/domains.json against schema v2.0.
 * See SCHEMA.md for the full contract.
 *
 * Usage:
 *   node scripts/validate-registry.js          # offline checks only
 *   node scripts/validate-registry.js --remote # also verify kdna_url + sha256 reachable
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const registryPath = path.join(__dirname, '..', 'domains.json');
const checkRemote = process.argv.includes('--remote');

const errors = [];
const warnings = [];

function fail(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

// ─── Load registry ──────────────────────────────────────────────────────

let registry;
try {
  registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
} catch (e) {
  console.error(`Cannot read/parse ${registryPath}: ${e.message}`);
  process.exit(1);
}

// ─── Top-level shape ────────────────────────────────────────────────────

if (registry.schema_version !== '2.0') {
  fail(`schema_version must be "2.0", got ${JSON.stringify(registry.schema_version)}`);
}
if (!registry.scopes || typeof registry.scopes !== 'object') {
  fail('scopes must be an object');
}
if (!Array.isArray(registry.domains)) {
  fail('domains must be an array');
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}

// ─── Scopes ─────────────────────────────────────────────────────────────

const VALID_SCOPE_TYPES = new Set(['official', 'community', 'private']);
const scopeNames = Object.keys(registry.scopes);

for (const scopeName of scopeNames) {
  if (!/^@[a-z][a-z0-9-]*$/.test(scopeName)) {
    fail(`scope key "${scopeName}" must match @[a-z][a-z0-9-]*`);
    continue;
  }
  const scope = registry.scopes[scopeName];
  if (!VALID_SCOPE_TYPES.has(scope.type)) {
    fail(`scope ${scopeName}: invalid type "${scope.type}"`);
  }
  if (!scope.trust_pubkey || typeof scope.trust_pubkey !== 'string') {
    fail(`scope ${scopeName}: trust_pubkey required`);
  } else if (
    !/^ed25519:[a-f0-9]+$/i.test(scope.trust_pubkey) &&
    !scope.trust_pubkey.startsWith('ed25519:PLACEHOLDER')
  ) {
    fail(`scope ${scopeName}: trust_pubkey must be ed25519:<hex>`);
  }
  if (scope.type === 'private' && !scope.registry_url) {
    fail(`scope ${scopeName}: private scope needs registry_url`);
  }
  if (scope.type !== 'private' && scope.registry_url) {
    warn(`scope ${scopeName}: registry_url only meaningful for private scopes`);
  }
}

// ─── Domains ────────────────────────────────────────────────────────────

const NAME_RE = /^@([a-z][a-z0-9-]*)\/([a-z][a-z0-9_]*)$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i;
const SHA256_RE = /^[a-f0-9]{64}$/;
const VALID_TYPES = new Set(['domain', 'cluster']);
const VALID_STATUS = new Set(['experimental', 'reference', 'stable', 'staging', 'deprecated']);
const VALID_ACCESS = new Set(['open', 'licensed', 'runtime']);
const VALID_RELEASE_CHANNEL = new Set(['default', 'staging', 'internal']);
const VALID_ASSET_TYPES = new Set(['domain', 'cluster', 'creator_asset', 'organization_standard']);
const VALID_SUBSCRIPTION_MODELS = new Set(['free', 'one_time', 'subscription', 'enterprise', 'runtime_api']);
const VALID_RELEASE_STATUS = new Set([
  'pending_v0.7_republish',
  'published_unsigned',
  'published_signed',
]);

const seenNames = new Set();
const nameToEntry = new Map();

for (let i = 0; i < registry.domains.length; i++) {
  const d = registry.domains[i];
  const where = `domains[${i}]${d.name ? ` (${d.name})` : ''}`;

  // name
  if (typeof d.name !== 'string') {
    fail(`${where}: name required`);
    continue;
  }
  const m = d.name.match(NAME_RE);
  if (!m) {
    fail(`${where}: name does not match @scope/identifier format`);
    continue;
  }
  if (seenNames.has(d.name)) {
    fail(`${where}: duplicate name`);
    continue;
  }
  seenNames.add(d.name);
  nameToEntry.set(d.name, d);

  const scopeName = `@${m[1]}`;
  if (!registry.scopes[scopeName]) {
    fail(`${where}: scope ${scopeName} not registered in scopes{}`);
  }

  // type
  if (!VALID_TYPES.has(d.type)) {
    fail(`${where}: type must be "domain" or "cluster"`);
  }

  // version
  if (!SEMVER_RE.test(d.version || '')) {
    fail(`${where}: version "${d.version}" not semver`);
  }

  // status
  if (d.status && !VALID_STATUS.has(d.status)) {
    fail(`${where}: status "${d.status}" not in ${[...VALID_STATUS]}`);
  }

  // release_status
  if (d.release_status && !VALID_RELEASE_STATUS.has(d.release_status)) {
    fail(`${where}: release_status "${d.release_status}" invalid`);
  }

  // v2.1: yank/deprecation coherence
  if (d.yanked === true) {
    if (!d.yanked_reason) {
      warn(`${where}: yanked is true but yanked_reason is missing (v2.1 expects a short reason)`);
    }
    if (!d.yanked_at) {
      warn(`${where}: yanked is true but yanked_at timestamp is missing (v2.1)`);
    }
  }
  if (d.deprecated === true && !d.replaced_by) {
    warn(`${where}: deprecated is true but replaced_by is null (consider naming a successor)`);
  }
  if (d.judgment_version && !/^\d{4}\.\d{2}(\.\d+)?$/.test(d.judgment_version)) {
    warn(`${where}: judgment_version should be YYYY.MM or YYYY.MM.NN, got "${d.judgment_version}"`);
  }

  // ── access mode validation (v2.3) ──────────────────────────────────
  if (d.access && !VALID_ACCESS.has(d.access)) {
    fail(`${where}: access must be one of ${[...VALID_ACCESS].join(', ')}, got "${d.access}"`);
  }

  // ── release_channel validation (v2.3) ──────────────────────────────
  const channel = d.release_channel || 'default';
  if (!VALID_RELEASE_CHANNEL.has(channel)) {
    fail(`${where}: release_channel must be one of ${[...VALID_RELEASE_CHANNEL].join(', ')}, got "${channel}"`);
  }

  // ── asset_type validation (v2.3) ───────────────────────────────────
  if (d.asset_type && !VALID_ASSET_TYPES.has(d.asset_type)) {
    fail(`${where}: asset_type must be one of ${[...VALID_ASSET_TYPES].join(', ')}, got "${d.asset_type}"`);
  }

  // ── commercial asset required fields (v2.3) ────────────────────────
  const isCommercial = d.access === 'licensed' || d.access === 'runtime';
  const isStaging = channel === 'staging';
  const isDefault = channel === 'default';

  if (isCommercial) {
    if (!d.license || !d.license.url) {
      if (isDefault) fail(`${where}: commercial access requires license.url`);
      else warn(`${where}: commercial access should have license.url`);
    }
    if (!d.license || d.license.commercial !== true) {
      if (isDefault) fail(`${where}: commercial access requires license.commercial = true`);
      else warn(`${where}: commercial access should have license.commercial = true`);
    }
    if (d.license && d.license.type !== 'KCL-1.0') {
      warn(`${where}: commercial access should use license.type = "KCL-1.0", got "${d.license.type}"`);
    }
    if (!d.subscription) {
      if (isDefault) fail(`${where}: commercial access requires subscription block`);
      else warn(`${where}: commercial access should have subscription block`);
    } else {
      if (!VALID_SUBSCRIPTION_MODELS.has(d.subscription.model)) {
        fail(`${where}: subscription.model must be one of ${[...VALID_SUBSCRIPTION_MODELS].join(', ')}, got "${d.subscription.model}"`);
      }
      if (!d.subscription.price) {
        fail(`${where}: subscription.price is required for commercial assets`);
      }
      if (typeof d.subscription.includes_updates !== 'boolean') {
        warn(`${where}: subscription.includes_updates should be a boolean`);
      }
    }
    if (isDefault) {
      if (!d.signature || !/^ed25519:[a-f0-9]+$/i.test(d.signature)) {
        fail(`${where}: default-channel commercial asset requires valid ed25519 signature`);
      }
      if (!d.author || !d.author.pubkey || d.author.pubkey.includes('PLACEHOLDER') || d.author.pubkey.includes('placeholder')) {
        fail(`${where}: default-channel commercial asset requires real author.pubkey`);
      }
    }
  }

  // ── staging channel rules (v2.3) ───────────────────────────────────
  if (isStaging) {
    if (d.author && d.author.pubkey && (d.author.pubkey.includes('PLACEHOLDER') || d.author.pubkey.includes('placeholder'))) {
      warn(`${where}: staging channel — pubkey is placeholder, must be replaced before default release`);
    }
    if (!d.signature || d.signature === '') {
      warn(`${where}: staging channel — signature is empty, must be signed before default release`);
    }
    if (d.quality_badge === 'untested' && d.status === 'stable') {
      warn(`${where}: staging channel — status "stable" + quality_badge "untested" incompatible for default release`);
    }
  }

  // ── creator_asset verification (v2.3) ──────────────────────────────
  if (d.asset_type === 'creator_asset') {
    if (!d.verified_author || d.verified_author.verified !== true) {
      warn(`${where}: creator_asset type requires verified_author.verified = true`);
    }
  }

  // ── runtime_endpoint for runtime access (v2.3) ─────────────────────
  if (d.access === 'runtime' && isDefault) {
    if (!d.runtime_endpoint) {
      fail(`${where}: runtime access requires runtime_endpoint URL`);
    }
  }

  // ── quality_badge consistency checks ──────────────────────────────
  const badge = d.quality_badge;
  const testCount = d.test_count || 0;
  const domStatus = d.status;

  if (badge === 'tested' && testCount < 1) {
    fail(`${where}: quality_badge "tested" requires test_count >= 1 (got ${testCount})`);
  }
  if (badge === 'validated' && testCount < 10) {
    fail(`${where}: quality_badge "validated" requires test_count >= 10 (got ${testCount})`);
  }
  if (badge === 'expert_reviewed' && !d.reviewed_by) {
    warn(`${where}: quality_badge "expert_reviewed" should have reviewed_by field`);
  }
  if (badge === 'production_ready' && testCount < 30) {
    fail(`${where}: quality_badge "production_ready" requires test_count >= 30 (got ${testCount})`);
  }
  if (domStatus === 'stable' && badge === 'untested') {
    warn(`${where}: status "stable" but quality_badge "untested" — consider downgrading status to "experimental"`);
  }
  if (domStatus === 'stable' && testCount === 0) {
    warn(`${where}: status "stable" but test_count = 0 — stable domains should have eval cases`);
  }

  // kdna_url + sha256 coherence
  if (d.kdna_url) {
    if (!/^https:\/\//.test(d.kdna_url)) {
      fail(`${where}: kdna_url must be https://`);
    }
    if (!d.sha256 || !SHA256_RE.test(d.sha256)) {
      fail(`${where}: sha256 required (64 hex) when kdna_url set`);
    }
  } else {
    if (d.sha256) warn(`${where}: sha256 set but kdna_url null`);
    // Clusters never have kdna_url (they're logical bundles)
    if (d.type !== 'cluster' && d.release_status !== 'pending_v0.7_republish') {
      warn(`${where}: kdna_url null but release_status is "${d.release_status}"`);
    }
  }

  // signature
  if (d.signature !== null && d.signature !== undefined) {
    if (!/^ed25519:[a-f0-9]+$/i.test(d.signature)) {
      fail(`${where}: signature must be ed25519:<hex>`);
    }
  }

  // repo
  if (!d.repo || !/^https:\/\/github\.com\//.test(d.repo)) {
    warn(`${where}: repo should be an https github URL`);
  }

  // author
  if (!d.author || !d.author.name) {
    fail(`${where}: author.name required`);
  }

  // cluster shape
  if (d.type === 'cluster') {
    if (!d.cluster || !Array.isArray(d.cluster.domains)) {
      fail(`${where}: cluster.domains required for cluster type`);
    }
  }
}

// ─── Cluster reference resolution ──────────────────────────────────────

for (const d of registry.domains) {
  if (d.type !== 'cluster') continue;
  for (const ref of d.cluster?.domains || []) {
    if (!seenNames.has(ref)) {
      fail(`${d.name}: cluster references unknown domain ${ref}`);
    } else {
      const refEntry = nameToEntry.get(ref);
      if (refEntry.type !== 'domain') {
        fail(`${d.name}: cluster.domains[${ref}] must point to a domain, not ${refEntry.type}`);
      }
    }
  }
  for (const rule of d.cluster?.composition_rules || []) {
    for (const ref of rule.load || []) {
      if (!seenNames.has(ref)) {
        fail(`${d.name}: composition_rules references unknown domain ${ref}`);
      }
    }
  }
}

// ─── part_of_cluster back-references ───────────────────────────────────

for (const d of registry.domains) {
  if (!d.part_of_cluster) continue;
  const cluster = nameToEntry.get(d.part_of_cluster);
  if (!cluster) {
    fail(`${d.name}: part_of_cluster ${d.part_of_cluster} not found`);
  } else if (cluster.type !== 'cluster') {
    fail(`${d.name}: part_of_cluster ${d.part_of_cluster} is not a cluster`);
  } else if (!cluster.cluster.domains.includes(d.name)) {
    fail(`${d.name}: claims part_of_cluster ${d.part_of_cluster}, but cluster does not list it`);
  }
}

// ─── Official scope identity check ─────────────────────────────────────

for (const d of registry.domains) {
  const m = d.name.match(NAME_RE);
  if (!m) continue;
  const scopeName = `@${m[1]}`;
  const scope = registry.scopes[scopeName];
  if (!scope) continue;

  if (scope.type === 'official' || scope.type === 'community') {
    if (d.author?.pubkey && scope.trust_pubkey && !scope.trust_pubkey.includes('PLACEHOLDER')) {
      if (d.author.pubkey !== scope.trust_pubkey) {
        fail(`${d.name}: author.pubkey does not match scope ${scopeName}.trust_pubkey`);
      }
    }
  }
}

// ─── Remote checks ─────────────────────────────────────────────────────

function fetchHead(url) {
  try {
    execFileSync('curl', ['-fsSL', '-o', '/dev/null', '--head', url], {
      timeout: 15000,
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function fetchAndHash(url) {
  const tmp = `/tmp/kdna-verify-${Date.now()}-${Math.random().toString(36).slice(2)}.kdna`;
  try {
    execFileSync('curl', ['-fsSL', '-o', tmp, url], { timeout: 60000, stdio: 'pipe' });
    const buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    try {
      fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    return null;
  }
}

if (checkRemote) {
  console.log('Remote checks (kdna_url reachability + sha256 match)...');
  for (const d of registry.domains) {
    if (!d.kdna_url) continue;
    process.stdout.write(`  ${d.name}: `);
    if (!fetchHead(d.kdna_url)) {
      console.log('UNREACHABLE');
      fail(`${d.name}: kdna_url not reachable`);
      continue;
    }
    const actual = fetchAndHash(d.kdna_url);
    if (!actual) {
      console.log('DOWNLOAD FAILED');
      fail(`${d.name}: kdna_url download failed`);
    } else if (actual !== d.sha256) {
      console.log('SHA MISMATCH');
      fail(`${d.name}: sha256 mismatch — expected ${d.sha256}, got ${actual}`);
    } else {
      console.log('ok');
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log('');
console.log('─'.repeat(60));
console.log(`Domains: ${registry.domains.length}`);
console.log(`Scopes:  ${scopeNames.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors:   ${errors.length}`);

warnings.forEach((w) => console.warn(`⚠ ${w}`));
errors.forEach((e) => console.error(`✗ ${e}`));

if (errors.length === 0) {
  console.log('✓ Registry valid');
  process.exit(0);
}
process.exit(1);
