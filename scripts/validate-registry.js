#!/usr/bin/env node
/**
 * Validate kdna-registry/domains.json against schema v3.0.
 * See SCHEMA.md for the full contract.
 *
 * Usage:
 *   node scripts/validate-registry.js          # offline checks only
 *   node scripts/validate-registry.js --remote # also verify asset_url + asset_digest reachable
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const zlib = require("zlib");
const { execFileSync } = require("child_process");

const registryPath = path.join(__dirname, "..", "domains.json");
const checkRemote = process.argv.includes("--remote");

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
  registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
} catch (e) {
  console.error(`Cannot read/parse ${registryPath}: ${e.message}`);
  process.exit(1);
}

// ─── Top-level shape ────────────────────────────────────────────────────

if (registry.schema_version !== "3.0") {
  fail(
    `schema_version must be "3.0", got ${JSON.stringify(registry.schema_version)}`,
  );
}
if (!registry.trust || typeof registry.trust !== "object") {
  fail("trust metadata is required");
} else {
  if (registry.trust.model !== "kdna-registry-v1") {
    fail(
      `trust.model must be "kdna-registry-v1", got ${JSON.stringify(registry.trust.model)}`,
    );
  }
  if (registry.trust.snapshot?.registry_version !== registry.registry_version) {
    fail("trust.snapshot.registry_version must match registry_version");
  }
  for (const [label, value] of [
    ["trust.snapshot.expires_at", registry.trust.snapshot?.expires_at],
    ["trust.timestamp.expires_at", registry.trust.timestamp?.expires_at],
  ]) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      fail(`${label} must be an ISO timestamp`);
    } else if (date <= new Date()) {
      fail(`${label} is expired: ${value}`);
    }
  }
  if (!Array.isArray(registry.trust.revocations)) {
    fail("trust.revocations must be an array");
  }
}
if (!registry.scopes || typeof registry.scopes !== "object") {
  fail("scopes must be an object");
}
if (!Array.isArray(registry.domains)) {
  fail("domains must be an array");
}

if (errors.length) {
  errors.forEach((e) => console.error(`✗ ${e}`));
  process.exit(1);
}

// ─── Scopes ─────────────────────────────────────────────────────────────

const VALID_SCOPE_TYPES = new Set(["official", "community", "private"]);
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
  if (!scope.trust_pubkey || typeof scope.trust_pubkey !== "string") {
    fail(`scope ${scopeName}: trust_pubkey required`);
  } else if (
    !/^ed25519:[a-f0-9]+$/i.test(scope.trust_pubkey) &&
    !scope.trust_pubkey.startsWith("ed25519:PLACEHOLDER")
  ) {
    fail(`scope ${scopeName}: trust_pubkey must be ed25519:<hex>`);
  }
  if (scope.type === "private" && !scope.registry_url) {
    fail(`scope ${scopeName}: private scope needs registry_url`);
  }
  if (scope.type !== "private" && scope.registry_url) {
    warn(`scope ${scopeName}: registry_url only meaningful for private scopes`);
  }
}

// ─── Domains ────────────────────────────────────────────────────────────

const NAME_RE = /^@([a-z][a-z0-9-]*)\/([a-z][a-z0-9_]*)$/;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i;
const ASSET_DIGEST_RE = /^sha256:[a-f0-9]{64}$/;
const KDNA_MEDIA_TYPE = "application/vnd.aikdna.kdna+zip";
const VALID_TYPES = new Set(["domain", "cluster"]);
const VALID_STATUS = new Set([
  "draft",
  "experimental",
  "stable",
  "staging",
  "deprecated",
]);
const VALID_ACCESS = new Set(["open", "licensed", "runtime"]);
const VALID_RELEASE_CHANNEL = new Set(["default", "staging", "internal"]);
const VALID_PRIVACY = new Set(["public", "private", "sensitive", "regulated"]);
const VALID_ASSET_TYPES = new Set([
  "domain_judgment",
  "personal_judgment",
  "organization_standard",
  "team_policy",
  "creator_style",
  "risk_guard",
]);
const VALID_SUBSCRIPTION_MODELS = new Set([
  "free",
  "one_time",
  "subscription",
  "enterprise",
  "runtime_api",
]);
const VALID_RELEASE_STATUS = new Set([
  "pending_v0.7_republish",
  "published_unsigned",
  "published_signed",
]);

const seenNames = new Set();
const nameToEntry = new Map();

for (let i = 0; i < registry.domains.length; i++) {
  const d = registry.domains[i];
  const where = `domains[${i}]${d.name ? ` (${d.name})` : ""}`;

  // name
  if (typeof d.name !== "string") {
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
  if (!SEMVER_RE.test(d.version || "")) {
    fail(`${where}: version "${d.version}" not semver`);
  }
  if (d.spec_version !== "1.0-rc") {
    fail(
      `${where}: spec_version must be "1.0-rc", got ${JSON.stringify(d.spec_version)}`,
    );
  }
  if ("kdna_spec" in d) {
    fail(`${where}: kdna_spec is not allowed in schema 3.0; use spec_version`);
  }
  if ("language" in d) {
    fail(
      `${where}: language is not allowed in schema 3.0; use languages + default_language`,
    );
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
      warn(
        `${where}: yanked is true but yanked_reason is missing (v2.1 expects a short reason)`,
      );
    }
    if (!d.yanked_at) {
      warn(
        `${where}: yanked is true but yanked_at timestamp is missing (v2.1)`,
      );
    }
  }
  if (d.deprecated === true && !d.replaced_by) {
    warn(
      `${where}: deprecated is true but replaced_by is null (consider naming a successor)`,
    );
  }
  if (
    d.judgment_version &&
    !/^\d{4}\.\d{2}(\.\d+)?$/.test(d.judgment_version)
  ) {
    warn(
      `${where}: judgment_version should be YYYY.MM or YYYY.MM.NN, got "${d.judgment_version}"`,
    );
  }

  // ── access mode validation (v2.3) ──────────────────────────────────
  if (d.access && !VALID_ACCESS.has(d.access)) {
    fail(
      `${where}: access must be one of ${[...VALID_ACCESS].join(", ")}, got "${d.access}"`,
    );
  }

  // ── release_channel validation (v2.3) ──────────────────────────────
  const channel = d.release_channel || "default";
  if (!VALID_RELEASE_CHANNEL.has(channel)) {
    fail(
      `${where}: release_channel must be one of ${[...VALID_RELEASE_CHANNEL].join(", ")}, got "${channel}"`,
    );
  }

  // ── asset_type validation (v2.3) ───────────────────────────────────
  if (d.asset_type && !VALID_ASSET_TYPES.has(d.asset_type)) {
    fail(
      `${where}: asset_type must be one of ${[...VALID_ASSET_TYPES].join(", ")}, got "${d.asset_type}"`,
    );
  }

  // ── privacy_level validation ───────────────────────────────────────
  if (d.privacy_level && !VALID_PRIVACY.has(d.privacy_level)) {
    fail(
      `${where}: privacy_level must be one of ${[...VALID_PRIVACY].join(", ")}, got "${d.privacy_level}"`,
    );
  }

  // ── commercial asset required fields (v2.3) ────────────────────────
  const isCommercial = d.access === "licensed" || d.access === "runtime";
  const isStaging = channel === "staging";
  const isDefault = channel === "default";

  if (isCommercial) {
    if (!d.license || !d.license.url) {
      if (isDefault) fail(`${where}: commercial access requires license.url`);
      else warn(`${where}: commercial access should have license.url`);
    }
    if (!d.license || d.license.commercial !== true) {
      if (isDefault)
        fail(`${where}: commercial access requires license.commercial = true`);
      else
        warn(
          `${where}: commercial access should have license.commercial = true`,
        );
    }
    if (d.license && d.license.type !== "KCL-1.0") {
      warn(
        `${where}: commercial access should use license.type = "KCL-1.0", got "${d.license.type}"`,
      );
    }
    if (!d.subscription) {
      if (isDefault)
        fail(`${where}: commercial access requires subscription block`);
      else warn(`${where}: commercial access should have subscription block`);
    } else {
      if (!VALID_SUBSCRIPTION_MODELS.has(d.subscription.model)) {
        fail(
          `${where}: subscription.model must be one of ${[...VALID_SUBSCRIPTION_MODELS].join(", ")}, got "${d.subscription.model}"`,
        );
      }
      if (!d.subscription.price) {
        fail(`${where}: subscription.price is required for commercial assets`);
      }
      if (typeof d.subscription.includes_updates !== "boolean") {
        warn(`${where}: subscription.includes_updates should be a boolean`);
      }
    }
    if (isDefault) {
      if (!d.signature || !/^ed25519:[a-f0-9]+$/i.test(d.signature)) {
        fail(
          `${where}: default-channel commercial asset requires valid ed25519 signature`,
        );
      }
      if (
        !d.author ||
        !d.author.pubkey ||
        d.author.pubkey.includes("PLACEHOLDER") ||
        d.author.pubkey.includes("placeholder")
      ) {
        fail(
          `${where}: default-channel commercial asset requires real author.pubkey`,
        );
      }
    }
  }

  // ── staging channel rules (v2.3) ───────────────────────────────────
  if (isStaging) {
    if (
      d.author &&
      d.author.pubkey &&
      (d.author.pubkey.includes("PLACEHOLDER") ||
        d.author.pubkey.includes("placeholder"))
    ) {
      warn(
        `${where}: staging channel — pubkey is placeholder, must be replaced before default release`,
      );
    }
    if (!d.signature || d.signature === "") {
      warn(
        `${where}: staging channel — signature is empty, must be signed before default release`,
      );
    }
    if (d.quality_badge === "untested" && d.status === "stable") {
      warn(
        `${where}: staging channel — status "stable" + quality_badge "untested" incompatible for default release`,
      );
    }
  }

  // ── public personal/creator assets need identity evidence ───────────
  if (
    (d.asset_type === "personal_judgment" ||
      d.asset_type === "creator_style") &&
    d.privacy_level === "public"
  ) {
    if (!d.verified_author || d.verified_author.verified !== true) {
      warn(
        `${where}: public ${d.asset_type} requires verified_author.verified = true`,
      );
    }
  }

  // ── runtime_endpoint for runtime access (v2.3) ─────────────────────
  if (d.access === "runtime" && isDefault) {
    if (!d.runtime_endpoint) {
      fail(`${where}: runtime access requires runtime_endpoint URL`);
    }
  }

  // ── quality_badge consistency checks ──────────────────────────────
  const badge = d.quality_badge;
  const testCount = d.test_count || 0;
  const domStatus = d.status;

  if (badge === "tested" && testCount < 10) {
    fail(
      `${where}: quality_badge "tested" requires test_count >= 10 (got ${testCount})`,
    );
  }
  if (badge === "validated" && testCount < 30) {
    fail(
      `${where}: quality_badge "validated" requires test_count >= 30 (got ${testCount})`,
    );
  }
  if (badge === "expert_reviewed" && !d.reviewed_by) {
    warn(
      `${where}: quality_badge "expert_reviewed" should have reviewed_by field`,
    );
  }
  if (badge === "expert_reviewed" && testCount < 30) {
    fail(
      `${where}: quality_badge "expert_reviewed" requires test_count >= 30 (got ${testCount})`,
    );
  }
  if (badge === "production_ready" && testCount < 30) {
    fail(
      `${where}: quality_badge "production_ready" requires test_count >= 30 (got ${testCount})`,
    );
  }
  if (domStatus === "stable" && badge === "untested") {
    warn(
      `${where}: status "stable" but quality_badge "untested" — consider downgrading status to "experimental"`,
    );
  }
  if (domStatus === "stable" && testCount === 0) {
    warn(
      `${where}: status "stable" but test_count = 0 — stable domains should have eval cases`,
    );
  }

  const studioCompatible = new Set([
    "kdna-studio",
    "kdna-studio-cli",
    "kdna-studio-sdk",
    "third-party-studio-compatible",
  ]);
  const authoring = d.authoring;
  const promotedReview =
    d.review_status === "verified" ||
    d.review_status === "reviewed" ||
    d.review_status === "trusted";
  if (badge !== "untested") {
    if (!authoring) {
      warn(
        `${where}: quality_badge "${badge}" has no authoring provenance; trusted channels will reject promotion`,
      );
    } else if (!studioCompatible.has(authoring.created_by)) {
      warn(`${where}: quality_badge "${badge}" is not Studio-compatible (${authoring.created_by})`);
    }
  }
  if (promotedReview) {
    if (!authoring) {
      fail(`${where}: review_status ${d.review_status} requires authoring provenance`);
    } else {
      if (!studioCompatible.has(authoring.created_by)) {
        fail(`${where}: review_status ${d.review_status} requires Studio-compatible authoring.created_by`);
      }
      if (!authoring.compiler || !authoring.compiler_version || !authoring.compiled_at) {
        fail(`${where}: review_status ${d.review_status} requires compiler metadata`);
      }
      for (const field of ["asset_uid", "project_uid", "build_id", "domain_id", "content_digest"]) {
        if (!authoring[field] && !d[field]) {
          fail(`${where}: review_status ${d.review_status} requires authoring ${field}`);
        }
      }
      if (
        authoring.human_confirmed !== true ||
        !Number.isInteger(authoring.human_lock_count) ||
        authoring.human_lock_count < 1
      ) {
        fail(`${where}: review_status ${d.review_status} requires Human Lock provenance`);
      }
    }
  }

  if ("kdna_url" in d) {
    fail(`${where}: kdna_url is invalid in schema 3.0; use asset_url`);
  }
  if ("sha256" in d) {
    fail(`${where}: sha256 is invalid in schema 3.0; use asset_digest`);
  }

  // asset_url + asset_digest coherence
  if (d.asset_url) {
    if (!/^https:\/\//.test(d.asset_url)) {
      fail(`${where}: asset_url must be https://`);
    }
    if (d.media_type !== KDNA_MEDIA_TYPE) {
      fail(`${where}: media_type must be ${KDNA_MEDIA_TYPE}`);
    }
    if (!d.asset_digest || !ASSET_DIGEST_RE.test(d.asset_digest)) {
      fail(
        `${where}: asset_digest required as sha256:<64 hex> when asset_url set`,
      );
    }
  } else {
    if (d.media_type) warn(`${where}: media_type set but asset_url null`);
    if (d.asset_digest) warn(`${where}: asset_digest set but asset_url null`);
    // Clusters do not have asset_url (they're logical bundles)
    if (d.type !== "cluster" && d.release_status !== "pending_v0.7_republish") {
      warn(
        `${where}: asset_url null but release_status is "${d.release_status}"`,
      );
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
  if (d.type === "cluster") {
    if (!d.cluster || !Array.isArray(d.cluster.domains)) {
      fail(`${where}: cluster.domains required for cluster type`);
    }
  }
}

// ─── Cluster reference resolution ──────────────────────────────────────

for (const d of registry.domains) {
  if (d.type !== "cluster") continue;
  for (const ref of d.cluster?.domains || []) {
    if (!seenNames.has(ref)) {
      fail(`${d.name}: cluster references unknown domain ${ref}`);
    } else {
      const refEntry = nameToEntry.get(ref);
      if (refEntry.type !== "domain") {
        fail(
          `${d.name}: cluster.domains[${ref}] must point to a domain, not ${refEntry.type}`,
        );
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
  } else if (cluster.type !== "cluster") {
    fail(`${d.name}: part_of_cluster ${d.part_of_cluster} is not a cluster`);
  } else if (!cluster.cluster.domains.includes(d.name)) {
    fail(
      `${d.name}: claims part_of_cluster ${d.part_of_cluster}, but cluster does not list it`,
    );
  }
}

// ─── Official scope identity check ─────────────────────────────────────

for (const d of registry.domains) {
  const m = d.name.match(NAME_RE);
  if (!m) continue;
  const scopeName = `@${m[1]}`;
  const scope = registry.scopes[scopeName];
  if (!scope) continue;

  if (scope.type === "official" || scope.type === "community") {
    if (
      d.author?.pubkey &&
      scope.trust_pubkey &&
      !scope.trust_pubkey.includes("PLACEHOLDER")
    ) {
      if (d.author.pubkey !== scope.trust_pubkey) {
        fail(
          `${d.name}: author.pubkey does not match scope ${scopeName}.trust_pubkey`,
        );
      }
    }
  }
}

// ─── Remote checks ─────────────────────────────────────────────────────

function fetchHead(url) {
  try {
    execFileSync("curl", ["-fsSL", "-o", "/dev/null", "--head", url], {
      timeout: 15000,
      stdio: "pipe",
    });
    return true;
  } catch {
    return false;
  }
}

function findEndOfCentralDirectory(buf) {
  const min = Math.max(0, buf.length - 65557);
  for (let i = buf.length - 22; i >= min; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) return i;
  }
  return -1;
}

function readZipEntry(buf, targetName) {
  const eocd = findEndOfCentralDirectory(buf);
  if (eocd < 0) return null;
  const totalEntries = buf.readUInt16LE(eocd + 10);
  const centralDirOffset = buf.readUInt32LE(eocd + 16);
  let offset = centralDirOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (buf.readUInt32LE(offset) !== 0x02014b50) return null;
    const method = buf.readUInt16LE(offset + 10);
    const compressedSize = buf.readUInt32LE(offset + 20);
    const nameLen = buf.readUInt16LE(offset + 28);
    const extraLen = buf.readUInt16LE(offset + 30);
    const commentLen = buf.readUInt16LE(offset + 32);
    const localHeaderOffset = buf.readUInt32LE(offset + 42);
    const name = buf.slice(offset + 46, offset + 46 + nameLen).toString("utf8");
    offset += 46 + nameLen + extraLen + commentLen;
    if (name !== targetName) continue;

    if (buf.readUInt32LE(localHeaderOffset) !== 0x04034b50) return null;
    const localNameLen = buf.readUInt16LE(localHeaderOffset + 26);
    const localExtraLen = buf.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLen + localExtraLen;
    const compressed = buf.slice(dataStart, dataStart + compressedSize);
    if (method === 0) return compressed;
    if (method === 8) return zlib.inflateRawSync(compressed);
    return null;
  }
  return null;
}

function fetchAndInspect(url) {
  const tmp = `/tmp/kdna-verify-${Date.now()}-${Math.random().toString(36).slice(2)}.kdna`;
  try {
    execFileSync("curl", ["-fsSL", "-o", tmp, url], {
      timeout: 60000,
      stdio: "pipe",
    });
    const buf = fs.readFileSync(tmp);
    fs.unlinkSync(tmp);
    const mimetype = readZipEntry(buf, "mimetype");
    return {
      sha256: crypto.createHash("sha256").update(buf).digest("hex"),
      mimetype: mimetype ? mimetype.toString("utf8") : null,
    };
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
  console.log("Remote checks (asset_url reachability + asset_digest match)...");
  for (const d of registry.domains) {
    if (!d.asset_url) continue;
    if (d.yanked === true) {
      console.log(`  ${d.name}: skipped (yanked)`);
      continue;
    }
    process.stdout.write(`  ${d.name}: `);
    if (!fetchHead(d.asset_url)) {
      console.log("UNREACHABLE");
      fail(`${d.name}: asset_url not reachable`);
      continue;
    }
    const actual = fetchAndInspect(d.asset_url);
    if (!actual) {
      console.log("DOWNLOAD FAILED");
      fail(`${d.name}: asset_url download failed`);
    } else if (actual.mimetype !== KDNA_MEDIA_TYPE) {
      console.log("MIMETYPE MISMATCH");
      fail(
        `${d.name}: root mimetype must be ${KDNA_MEDIA_TYPE}, got ${JSON.stringify(actual.mimetype)}`,
      );
    } else if (`sha256:${actual.sha256}` !== d.asset_digest) {
      console.log("SHA MISMATCH");
      fail(
        `${d.name}: asset_digest mismatch — expected ${d.asset_digest}, got sha256:${actual.sha256}`,
      );
    } else {
      console.log("ok");
    }
  }
}

// ─── Report ─────────────────────────────────────────────────────────────

console.log("");
console.log("─".repeat(60));
console.log(`Domains: ${registry.domains.length}`);
console.log(`Scopes:  ${scopeNames.length}`);
console.log(`Warnings: ${warnings.length}`);
console.log(`Errors:   ${errors.length}`);

warnings.forEach((w) => console.warn(`⚠ ${w}`));
errors.forEach((e) => console.error(`✗ ${e}`));

if (errors.length === 0) {
  console.log("✓ Registry valid");
  process.exit(0);
}
process.exit(1);
