# KDNA Registry Schema v3.0

This document specifies the data contract for `domains.json` in `kdna-registry`. All install/publish/CLI tooling must conform to this schema.

## Top-level structure

```json
{
  "schema_version": "3.0",
  "registry_version": "3.0.0",
  "updated": "ISO-8601 timestamp",
  "trust": { ... },
  "scopes": { ... },
  "domains": [ ... ]
}
```

### `schema_version` (required)

Semver string. Bumped only on breaking schema changes. CLIs read this and refuse to operate on unknown major versions.

Schema `3.0` is asset-first and breaking. Registry entries MUST publish canonical `.kdna` assets with `asset_url`, `media_type`, and `asset_digest`. `kdna_url`, bare `sha256`, singular `language`, and `kdna_spec` fields are invalid. Trusted entries with `quality_badge` `tested` or higher SHOULD include Studio-compatible `authoring` provenance. Entries promoted to `verified`, `reviewed`, or `trusted` MUST include it.

### `trust` (required)

Minimal registry trust metadata. This is intentionally TUF-inspired without claiming full TUF conformance.

```json
{
  "model": "kdna-registry-v1",
  "root": {
    "threshold": 1,
    "keys": [
      {
        "keyid": "aikdna-root-2026-05",
        "scheme": "ed25519",
        "pubkey": "ed25519:<hex>"
      }
    ]
  },
  "targets": {
    "threshold": 1,
    "delegated_scopes": ["@aikdna"]
  },
  "snapshot": {
    "registry_version": "3.0.0",
    "generated_at": "ISO-8601 timestamp",
    "expires_at": "ISO-8601 timestamp"
  },
  "timestamp": {
    "generated_at": "ISO-8601 timestamp",
    "expires_at": "ISO-8601 timestamp"
  },
  "revocations": []
}
```

- `snapshot.registry_version` MUST match top-level `registry_version`.
- `snapshot.expires_at` and `timestamp.expires_at` MUST be in the future.
- `revocations[]` blocks assets by `{ "name", "version", "asset_digest", "reason", "revoked_at" }`.
- A conforming installer MUST refuse expired, revoked, or yanked assets.

### `scopes` (required)

Map from `@scope` name → scope descriptor. Every domain's `name` must belong to a registered scope.

```json
{
  "@aikdna": {
    "type": "official" | "community" | "private",
    "description": "...",
    "trust_pubkey": "ed25519:<hex>",
    "registry_url": null | "https://...",
    "verified": true | false
  }
}
```

- `type: "official"` — controlled by KDNA core team; only entries signed by `trust_pubkey` are accepted
- `type: "community"` — third-party, identity verified via signature
- `type: "private"` — not listed in public registry; CLI routes lookup to `registry_url`
- `trust_pubkey` — the public key whose private counterpart must sign every domain in this scope
- `registry_url` — if non-null, CLI fetches domain metadata from this URL instead of the main registry (used by `private` scopes)

### `domains` (required)

Array of domain or cluster entries.

## Domain entry

```json
{
  "name": "@scope/identifier",      // REQUIRED, format: @[a-z][a-z0-9-]*/[a-z][a-z0-9_]*
  "type": "domain",                 // REQUIRED, "domain" | "cluster"
  "version": "MAJOR.MINOR.PATCH",   // REQUIRED, semver
  "spec_version": "1.0-rc",         // KDNA spec the package conforms to
  "status": "draft" | "experimental" | "stable" | "deprecated" | "staging",
  "access": "open" | "licensed" | "runtime",

  "asset_url": "https://...",       // REQUIRED for installable .kdna assets
  "media_type": "application/vnd.aikdna.kdna+zip",
  "asset_digest": "sha256:<64-hex>",// REQUIRED when asset_url set
  "signature": "ed25519:<hex>",     // REQUIRED for installable assets
  "release_status": "published_signed" | "published_unsigned" | "pending_v0.7_republish",
  "authoring": {
    "created_by": "kdna-studio" | "kdna-studio-cli" | "kdna-studio-sdk" | "third-party-studio-compatible" | "manual-dev-source",
    "compiler": "@aikdna/kdna-studio",
    "compiler_version": "0.3.0",
    "compiled_at": "2026-05-29T00:00:00Z",
    "human_confirmed": true,
    "human_lock_count": 8
  },

  "repo": "https://github.com/...", // source repository, not an install source
  "languages": ["en", "zh-CN"],          // v2.2: all supported BCP 47 language tags
  "default_language": "en",              // v2.2: canonical language of judgment content
  "i18n_level": "L1" | "L2" | "L3",     // v2.2: localization coverage level
  "localized": {                         // v2.2: locale-specific display metadata
    "en": { "display_name": "...", "description": "...", "core_insight": "..." },
    "zh-CN": { "display_name": "...", "description": "...", "core_insight": "..." }
  },
  "risk_level": "R0" | "R1" | "R2" | "R3",  // v2.2: risk classification
  "review_status": "community" | "verified" | "reviewed" | "trusted", // v2.2: review state
  "provenance_required": true,           // v2.2
  "signature_required": true,            // v2.2
  "yanked_reason": "<short text>",       // v2.2: why yanked
  "yanked_at": "<ISO timestamp>",        // v2.2: when yanked
  "author": {
    "name": "...",
    "id": "...",
    "pubkey": "ed25519:<hex>"       // must match scope.trust_pubkey for official scopes
  },
  "license": {
    "type": "CC-BY-4.0" | "KCL-1.0" | "MIT" | ...,
    "url": "https://...",
    "commercial": true | false,
    "allow_agent_use": true | false,
    "allow_redistribution": true | false,
    "allow_training": true | false
  },

  // ── Commercial asset fields (required when access is "licensed" or "runtime") ──
  "subscription": {
    "model": "free" | "one_time" | "subscription" | "enterprise" | "runtime_api",
    "price": "$X/seat/month" | "Free" | "Custom pricing",
    "billing_period": "monthly" | "annual" | null,
    "trial_available": true | false,
    "trial_duration_days": null | <number>,
    "includes_updates": true | false,
    "update_cadence": "monthly" | "quarterly" | "on_revision" | null
  },
  "verified_author": {
    "verified": true | false,
    "verification_method": "domain" | "social" | "manual" | null,
    "verified_at": "ISO-8601 timestamp"
  },
  "release_channel": "default" | "staging" | "internal",
  "runtime_endpoint": null | "https://runtime.aikdna.com/v1/...",
  "asset_type": "domain_judgment" | "personal_judgment" | "organization_standard" | "team_policy" | "creator_style" | "risk_guard",
  "privacy_level": "public" | "private" | "sensitive" | "regulated",

  "description": "≤200 chars",
  "core_insight": "single sentence",
  "keywords": [...],
  "domain_field": [...],
  "judgment_patterns": [...],

  "file_count": N,
  "test_count": N,
  "quality_badge": "untested" | "tested" | "validated" | "expert_reviewed" | "production_ready",
  "eval_score": 0-100,

  "deprecated": false,
  "yanked": false,
  "replaced_by": null | "@scope/name",

  "created": "YYYY-MM-DD",
  "updated": "YYYY-MM-DD"
}
```

## Cluster entry

A cluster bundles multiple standalone domains under a logical composition entry. Clusters can be represented in the registry before they are default-installable; yanked clusters are discovery records only and MUST be rejected by installers.

```json
{
  "name": "@aikdna/animation",
  "type": "cluster",
  "version": "0.2.1",
  // ... all the standard fields above ...
  "cluster": {
    "domains": [
      "@aikdna/motion_design_master",
      ...
    ],
    "composition_rules": [
      { "task": "<task>", "load": ["@scope/name", ...] }
    ]
  }
}
```

Rules:

- Every name in `cluster.domains` MUST exist as a separate domain entry in the same registry
- Non-yanked sub-domains can be installed independently (`kdna install @scope/domain`)
- Non-yanked clusters MAY install or resolve their sub-domains according to CLI/runtime policy
- Yanked clusters and yanked sub-domains MUST NOT be installable
- Sub-domains MAY have a `part_of_cluster` field pointing back to the cluster

## Name format

```
@scope/identifier
```

- `@scope`: lowercase letters, digits, hyphens; starts with letter
- `identifier`: lowercase letters, digits, underscores; starts with letter
- Slash is the separator. No nesting.

Regex: `^@[a-z][a-z0-9-]*/[a-z][a-z0-9_]*$`

## Short-name alias

CLI MAY accept bare names and expand them to `@aikdna/<name>` for the official scope only. Non-official scopes always require `@scope/` prefix.

## Signature And Digest

`signature` is `ed25519:<hex>` where the signed payload is the canonical KDNA v1.0 content tree. Verification:

1. Verify `author.pubkey` matches `scopes[scope].trust_pubkey` (for official/verified scopes)
2. Verify the entry declares `media_type: "application/vnd.aikdna.kdna+zip"`
3. Download `.kdna`, verify root `mimetype` is exactly `application/vnd.aikdna.kdna+zip`
4. Compute the whole-file asset digest and verify it matches `asset_digest`
5. Canonicalize the content tree and verify Ed25519 signature with `author.pubkey`

## Deprecation lifecycle

- `deprecated: true` — domain still installable but CLI warns; suggest `replaced_by`
- `yanked: true` — version not recommended; CLI **refuses** new installs of yanked versions but does not touch existing installs
- `yanked_at: "<ISO timestamp>"` — when the yank decision was recorded (v2.1)
- `yanked_reason: "<short text>"` — why; surfaced verbatim by CLI to the user (v2.1)
- `replaced_by: "@scope/name"` — recommended successor (used by both deprecated and yanked)
- Files are NEVER deleted from CDN (npm left-pad lesson)

## v2.1 — Judgment-governance fields (recommended)

v2.1 adds fields that let `kdna verify --judgment` measure whether a domain
declares its boundaries, evidence, and failure modes. These fields are
**recommended, not required** — CLI surfaces a quality score for whether they
are present.

Inside `KDNA_Core.json > axioms[]` and `KDNA_Patterns.json > misunderstandings[]`:

```json
{
  "id": "axiom-1",
  "one_sentence": "...",
  "full_statement": "...",
  "why": "...",

  "confidence": "high" | "medium" | "low",
  "evidence_type": [
    "practice_pattern" | "case_observation" | "research_finding"
    | "industry_consensus" | "personal_experience" | "working_hypothesis"
  ],
  "applies_when": [
    "the buyer understands the offer but hesitates to commit"
  ],
  "does_not_apply_when": [
    "the buyer truly lacks budget",
    "the offer is irrelevant to the buyer"
  ],
  "failure_risk": "May over-diagnose psychological uncertainty and ignore real affordability."
}
```

`KDNA_Core.json > ontology[]` and `stances[]` (object form) may carry
`applies_when` / `does_not_apply_when`. `KDNA_Patterns.json > terminology.banned_terms[]`
may carry `applies_when`.

Rationale: KDNA encodes judgment frameworks. Saying "axiom X is true" without
saying _when it stops being true_ is the leading cause of judgment pollution.
This contract surfaces the boundary so loaders and reviewers can detect it.

## judgment_version (v2.1, optional)

Inside each domain's `kdna.json`, separately from `version` (semver):

```json
{
  "name": "@aikdna/writing",
  "version": "0.7.1",
  "judgment_version": "2026.05"
}
```

`version` follows semver and tracks structure / wire format. `judgment_version`
tracks when the encoded judgment was last revised (YYYY.MM). Used by
`kdna diff` to surface judgment-level changes that semver may hide.

## v3.0 Asset-First Break

v3.0 is a clean break:

- Every installable entry uses `asset_url`, `media_type`, and `asset_digest`.
- `kdna_url`, `sha256`, `kdna_spec`, and singular `language` are invalid.
- Top-level `trust` metadata is required.
- Installers refuse expired registries, yanked entries, and revoked assets.
- The registry publishes `.kdna` assets only, never raw domain directories.
- Studio-compatible authoring provenance gates quality badge promotion:
  `manual-dev-source` or missing provenance is capped at `untested` in trusted
  channels.

## Commercial Asset & Staging Channel

### Access modes

The `access` field now supports three modes:

| Mode       | Description                                                  | Registry visibility                 | Install requirement                                                                             |
| ---------- | ------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------- |
| `open`     | Free, publicly available domain                              | Listed in default channel           | `kdna install @scope/name`                                                                      |
| `licensed` | Commercial domain with client-side encrypted `.kdna` entries | Listed only with valid license      | `kdna install @scope/name`, then `kdna license activate @scope/name --key <key> --server <url>` |
| `runtime`  | Commercial domain served via Runtime API                     | Listed only with valid subscription | `kdna install @scope/name --runtime`                                                            |

### Commercial asset required fields

When `access` is `licensed` or `runtime`, the following fields become REQUIRED:

- `license.url` — canonical KCL-1.0 URL
- `license.commercial` — must be `true`
- `license.allow_redistribution` — must be `false`
- `subscription.model` — one of `one_time`, `subscription`, `enterprise`, `runtime_api`
- `subscription.price` — human-readable price
- `subscription.includes_updates` — boolean
- `signature` — must be present and valid `ed25519:<hex>`
- `author.pubkey` — must be present

### Release channels

The `release_channel` field controls registry visibility:

| Channel    | Description                                  | Validator behavior                                                           |
| ---------- | -------------------------------------------- | ---------------------------------------------------------------------------- |
| `default`  | Main registry, visible to all users          | Standard validation                                                          |
| `staging`  | Pre-release validation, not publicly visible | Standard metadata validation; cannot be installed as a trusted default asset |
| `internal` | Organization-private, not in public index    | Skipped by public registry CI                                                |

### Staging channel rules

- Domains in `staging` channel are NOT listed in the default `kdna list --available` output.
- CLI can access staging with `kdna list --channel staging`.
- Domains MUST graduate to `default` channel before public release.
- Graduation requires: valid signature, real pubkey, quality_badge ≥ `tested`, license.url present.

### Asset type classification

The `asset_type` field classifies domains by their intended use:

| Type                    | Description                                    | quality_badge requirements                |
| ----------------------- | ---------------------------------------------- | ----------------------------------------- |
| `domain_judgment`       | Standard domain judgment asset                 | Standard badge progression                |
| `personal_judgment`     | Individual's explicit judgment system          | Requires verified_author when public      |
| `organization_standard` | Organizational policy/standard domain          | Requires organization pubkey verification |
| `team_policy`           | Team-level operating judgment and policy       | Standard badge progression                |
| `creator_style`         | Creator's taste, style, and recurring judgment | Requires verified_author when public      |
| `risk_guard`            | Safety or risk-boundary judgment asset         | Requires stronger review evidence         |

### Validated commercial fields

Commercial assets passing through the validator must satisfy:

1. `access: "licensed"` or `"runtime"` → all commercial required fields present
2. `release_channel: "default"` + `access: "licensed"` → `signature` is valid ed25519 hex, `author.pubkey` is not placeholder
3. `release_channel: "staging"` → cannot be treated as a trusted default asset
4. public `personal_judgment` or `creator_style` → `verified_author.verified` must be `true`
5. `subscription.model` is one of the valid subscription model values
6. `license.type` is `KCL-1.0` when `access` is `licensed` or `runtime`
