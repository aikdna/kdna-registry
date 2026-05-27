#!/usr/bin/env node
/**
 * Registry trust gate.
 *
 * This check protects user trust by making quality claims auditable. It does
 * not judge domain content correctness; it enforces that registry metadata does
 * not over-claim quality, review, or limitations evidence.
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'domains.json');
const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));

const errors = [];
const warnings = [];

const badgeRank = {
  untested: 0,
  tested: 1,
  validated: 2,
  expert_reviewed: 3,
  production_ready: 4,
};

const badgeThresholds = {
  tested: 10,
  validated: 30,
  expert_reviewed: 30,
  production_ready: 30,
};

const validReviewStatuses = new Set([
  'unlisted',
  'community',
  'verified',
  'reviewed',
  'trusted',
  'restricted',
  'deprecated',
]);

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function hasKnownLimitations(entry) {
  return (
    typeof entry.known_limitations_url === 'string' &&
    entry.known_limitations_url.trim().length > 0
  );
}

for (const entry of registry.domains || []) {
  const name = entry.name || '<unnamed>';
  const badge = entry.quality_badge;
  const review = entry.review_status;
  const testCount = entry.test_count || 0;

  if (!(badge in badgeRank)) {
    fail(`${name}: quality_badge must be one of ${Object.keys(badgeRank).join(', ')}`);
    continue;
  }

  if (!validReviewStatuses.has(review)) {
    fail(`${name}: review_status must be one of ${Array.from(validReviewStatuses).join(', ')}`);
  }

  if (!Object.prototype.hasOwnProperty.call(entry, 'known_limitations_url')) {
    fail(`${name}: known_limitations_url key is required, even when explicitly null`);
  }

  if (badge === 'tested' && testCount < badgeThresholds.tested) {
    fail(`${name}: quality_badge tested requires test_count >= ${badgeThresholds.tested}`);
  }

  if (badge === 'validated' && testCount < badgeThresholds.validated) {
    fail(`${name}: quality_badge validated requires test_count >= ${badgeThresholds.validated}`);
  }

  if (badge === 'expert_reviewed' && testCount < badgeThresholds.expert_reviewed) {
    fail(`${name}: quality_badge expert_reviewed requires test_count >= ${badgeThresholds.expert_reviewed}`);
  }

  if (badge === 'production_ready' && testCount < badgeThresholds.production_ready) {
    fail(`${name}: quality_badge production_ready requires test_count >= ${badgeThresholds.production_ready}`);
  }

  if (badgeRank[badge] >= badgeRank.validated && !hasKnownLimitations(entry)) {
    fail(`${name}: ${badge} requires a public known_limitations_url`);
  }

  if (badgeRank[badge] >= badgeRank.expert_reviewed && !entry.reviewed_by) {
    fail(`${name}: ${badge} requires reviewed_by`);
  }

  if ((review === 'verified' || review === 'reviewed' || review === 'trusted') && badgeRank[badge] < badgeRank.tested) {
    fail(`${name}: review_status ${review} requires quality_badge >= tested`);
  }

  if ((review === 'reviewed' || review === 'trusted') && !entry.reviewed_by) {
    fail(`${name}: review_status ${review} requires reviewed_by`);
  }

  if ((review === 'reviewed' || review === 'trusted') && !hasKnownLimitations(entry)) {
    fail(`${name}: review_status ${review} requires public known_limitations_url`);
  }

  if (entry.yanked === true && !entry.yanked_reason) {
    fail(`${name}: yanked domain requires yanked_reason`);
  }

  if (entry.status === 'stable' && badgeRank[badge] < badgeRank.tested) {
    warn(`${name}: stable status with quality_badge ${badge} is weak evidence`);
  }

  if (badgeRank[badge] >= badgeRank.tested && !hasKnownLimitations(entry)) {
    warn(`${name}: tested domains should publish known_limitations_url before promotion`);
  }
}

for (const warning of warnings) {
  console.warn(`WARN ${warning}`);
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`FAIL ${error}`);
  }
  console.error(`\nRegistry trust gate failed: ${errors.length} issue(s), ${warnings.length} warning(s)`);
  process.exit(1);
}

console.log(`Registry trust gate passed: ${(registry.domains || []).length} domains checked, ${warnings.length} warning(s)`);
