#!/usr/bin/env node
/**
 * Check localization coverage — verify all domains have at least en + zh-CN.
 * Exits 0 on success, 1 on missing localization (non-blocking).
 */

const fs = require('fs');
const path = require('path');

const registryPath = path.join(__dirname, '..', 'domains.json');

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const warnings = [];

for (const d of registry.domains) {
  const name = d.name;
  const langs = d.languages || [];
  const loc = d.localized || {};
  const i18nLevel = d.i18n_level || 'L0';

  if (!langs.includes('en')) {
    warnings.push(`${name}: missing 'en' in languages`);
  }
  if (!langs.includes('zh-CN')) {
    warnings.push(`${name}: missing 'zh-CN' localization`);
  }
  if (!loc['en'] || !loc['en'].display_name) {
    warnings.push(`${name}: missing en localized.display_name`);
  }
  if (langs.includes('zh-CN') && (!loc['zh-CN'] || !loc['zh-CN'].display_name)) {
    warnings.push(`${name}: has zh-CN language but missing localized.zh-CN.display_name`);
  }
  if (i18nLevel === 'L0' && langs.length > 1) {
    warnings.push(`${name}: i18n_level is L0 but has ${langs.length} languages`);
  }
}

if (warnings.length) {
  console.error('Localization coverage issues:');
  warnings.forEach(w => console.error(`  ⚠ ${w}`));
  console.error(`\n  ${warnings.length} warning(s) — ${registry.domains.length - warnings.length}/${registry.domains.length} domains complete`);
  process.exit(1);
}

console.log(`✓ All ${registry.domains.length} domains have complete localization`);
process.exit(0);
