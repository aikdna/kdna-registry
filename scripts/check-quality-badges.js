#!/usr/bin/env node
/**
 * Check quality_badge consistency — verify badges match their requirements.
 * Exits 0 on success, 1 on inconsistencies (non-blocking warning).
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'domains.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const warnings = [];

const badgeThresholds = {
  tested: 10,
  validated: 30,
  expert_reviewed: 30,
  production_ready: 30,
};

for (const d of registry.domains) {
  const name = d.name;
  const badge = d.quality_badge;
  const testCount = d.test_count || 0;
  const status = d.status;

  if (!badge) {
    warnings.push(`${name}: missing quality_badge`);
    continue;
  }

  // Badge-level requirements
  if (badge === 'tested' && testCount < badgeThresholds.tested) {
    warnings.push(`${name}: badge "tested" but test_count = ${testCount} (need >= ${badgeThresholds.tested})`);
  }
  if (badge === 'validated' && testCount < badgeThresholds.validated) {
    warnings.push(`${name}: badge "validated" but test_count = ${testCount} (need >= ${badgeThresholds.validated})`);
  }
  if (badge === 'expert_reviewed' && !d.reviewed_by) {
    warnings.push(`${name}: badge "expert_reviewed" but no reviewed_by`);
  }
  if (badge === 'expert_reviewed' && testCount < badgeThresholds.expert_reviewed) {
    warnings.push(`${name}: badge "expert_reviewed" but test_count = ${testCount} (need >= ${badgeThresholds.expert_reviewed})`);
  }
  if (badge === 'production_ready' && testCount < badgeThresholds.production_ready) {
    warnings.push(`${name}: badge "production_ready" but test_count = ${testCount} (need >= ${badgeThresholds.production_ready})`);
  }

  // Status-badge coherence
  if (status === 'stable' && badge === 'untested') {
    warnings.push(`${name}: status "stable" + badge "untested" — consider downgrading status or adding tests`);
  }
  if (status === 'stable' && testCount === 0) {
    warnings.push(`${name}: status "stable" but test_count = 0`);
  }

  // Staging channel check
  if (d.release_channel === 'staging' && badge === 'production_ready') {
    warnings.push(`${name}: staging channel with production_ready badge — inconsistent`);
  }
}

if (warnings.length) {
  console.error('Quality badge consistency issues:');
  warnings.forEach(w => console.error(`  ⚠ ${w}`));
  console.error(`\n  ${warnings.length} warning(s)`);
  process.exit(1);
}

console.log(`✓ All ${registry.domains.length} domains have consistent quality badges`);
process.exit(0);
