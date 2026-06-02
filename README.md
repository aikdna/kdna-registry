# KDNA Registry

[![CI](https://github.com/aikdna/kdna-registry/actions/workflows/ci.yml/badge.svg)](https://github.com/aikdna/kdna-registry/actions/workflows/ci.yml) [![License](https://img.shields.io/badge/license-Apache%202.0-blue)](LICENSE)

Static registry for KDNA cognition assets. The `kdna` CLI reads this for asset discovery, `.kdna` download URLs, asset digests, signature verification, and revocation status.

**Schema version: 3.0** (see [SCHEMA.md](./SCHEMA.md))

Trust model: [KDNA Registry Trust Model v1](./TRUST_MODEL.md)

## What is KDNA Registry?

The KDNA Registry is not a token marketplace. It is not an NFT marketplace. It is a trusted catalog for AI-loadable cognitive assets.

The KDNA Registry is the canonical index of all published KDNA domain cognition packages. It is a machine-readable JSON file (`domains.json`) that tells the `kdna` CLI what domains exist, where to download them, how to verify them, and what quality and safety metadata they carry. Every domain entry includes a review status, risk level, internationalization level, quality badge, authoring provenance requirements, and a known limitations URL.

A `.kdna` asset is not created by writing JSON files. It is compiled by a
Studio-compatible authoring pipeline that performs human confirmation,
validation, canonicalization, identity generation, digest computation, signing,
optional encryption, and provenance recording.

Discover → Verify → Install → Load → License

## How to Use

```bash
kdna list --available           # Browse all registered domains
kdna install <name>             # Install a non-yanked official @aikdna/ asset
kdna install @scope/name        # Install a non-yanked scoped asset
kdna install @aikdna/writing    # Example: install one official reference asset
```

CLI flow:
1. Read registry trust metadata and reject expired snapshots/timestamps.
2. Resolve the entry and reject yanked or revoked assets.
3. Download `.kdna` from `asset_url`.
4. Verify root `mimetype` is `application/vnd.aikdna.kdna+zip`.
5. Verify whole-file `asset_digest` matches `domains.json`.
6. Verify Ed25519 `signature` against the scope `trust_pubkey`.
7. Store the immutable asset under `~/.kdna/packages/` with a `receipt.json`.

## For domain experts and creators

You don't need to be a developer to contribute your judgment to KDNA.

**If you are a domain expert** (writer, caregiver, designer, community operator, florist, product builder, or any practitioner with real judgment in a specific field), here's your path:

1. **Start with an interview, not a JSON file.** [KDNA Studio CLI](https://github.com/aikdna/kdna-studio-cli) (`@aikdna/kdna-studio-cli`) and Studio-compatible apps use `@aikdna/kdna-studio-core` to ask questions about your expertise — what you reject, what beginners get wrong, what signals you watch for — and generate a structured KDNA domain from your answers.
2. **Don't worry about JSON.** The Studio interview mode handles the encoding. You focus on what you know, not on formatting.
3. **Create through Studio.** Use KDNA Studio or a Studio-compatible compiler to Human Lock, compile, and export a `.kdna` file with authoring provenance.
4. **Publish when ready.** When your `.kdna` passes verification and you're satisfied with the judgment content, `kdna publish <file.kdna>` prepares the registry metadata.

**If you just want to use KDNA domains with your AI agent:**

```bash
npm install -g @aikdna/kdna-cli
kdna setup              # auto-detects your agent, installs kdna-loader
kdna install @scope/name        # install a non-yanked .kdna asset
```

That's it. Your agent can now load installed domain judgment. No coding required.

For detailed authoring guidance, see the [KDNA Authoring Guide](https://github.com/aikdna/kdna/blob/main/docs/authoring-guide.md).

---

## For developers: publishing to the registry

## Registry Entry Structure

Each domain entry in `domains.json` includes these key metadata fields:

| Field | Description |
|-------|-------------|
| `name` | Full `@scope/id` identifier |
| `version` | Semver version of the domain |
| `asset_url` | Direct download URL for the canonical `.kdna` asset |
| `asset_digest` | Whole-file asset digest: `sha256:<hex>` |
| `media_type` | Optional explicit media type. If present, MUST be `application/vnd.aikdna.kdna+zip` |
| `signature` | Ed25519 signature for provenance verification |
| `authoring` | Studio-compatible authoring provenance for trusted quality claims |
| `quality_badge` | Quality tier: `untested`, `tested`, `validated`, `expert_reviewed`, or `production_ready` |
| `risk_level` | Risk classification: `R0` (low) through `R3` (restricted) |
| `review_status` | Registry review status (see Review Model below) |
| `i18n_level` | Internationalization level: `L0` (en only) through `L4` (fully localized) |
| `languages` | Array of supported language codes |
| `default_language` | Primary language for fallback |
| `known_limitations_url` | Link to the domain's `docs/known-limitations.md` |
| `evals_url` | Link to public evaluation cases for tested or higher domains |
| `benchmark_report_url` | Link to public benchmark or before/after report |
| `deprecated` | Whether the domain has been superseded |
| `yanked` / `yanked_reason` | Whether the domain was pulled from new installations |

## Official Quality Badges

Official KDNA quality badges are issued only by the official registry or authorized registries. Forked tools may compute local validation results, but cannot claim official badge status unless signed by an authorized registry. Schema validation only proves structure; it does not prove judgment quality. Assets without Studio-compatible authoring provenance cannot be promoted into trusted registry channels above `untested`.

| Badge | Meaning | Min Eval Cases | Required Studio Evidence | Issued By |
|-------|---------|:---:|--------------------------|------------|
| `untested` | Schema validation only, no trusted authoring or judgment quality evidence | 0 | `reports/build-report.json`, `reports/provenance-report.json` | Author self-declared |
| `tested` | Studio-compatible provenance, Human Lock, and manual verification | >= 10 | Human Lock report + eval report | Author self-declared (requires signature) |
| `validated` | Automated scoring and raw outputs | >= 30 | Quality gate report + raw outputs or authorized review evidence | Official registry after automated check |
| `expert_reviewed` | Validated evidence plus independent domain expert review | >= 30 | Reviewer signature or review report | Official registry after expert sign-off |
| `production_ready` | Expert-reviewed evidence plus real-world deployment evidence | >= 30 | Deployment evidence + regression report | Official registry after deployment audit |

---

## Review Model

The default official install surface is a focused reference set: `@aikdna/kdna_authoring`, `@aikdna/agent_safety`, `@aikdna/prompt_diagnosis`, `@aikdna/code_review`, and `@aikdna/writing`. It is intended to demonstrate authoring, safety, prompt diagnosis, code review, and writing judgment across the core install, verify, and load flow. Other entries may remain in the registry as yanked experimental candidates.

The registry classifies domains by review status, per the [KDNA Governance Policy](https://github.com/aikdna/kdna/blob/main/docs/GOVERNANCE.md):

| Status | Meaning |
|--------|---------|
| **Unlisted** | Installable but not displayed in default listings |
| **Community** | Community-submitted, basic validation passed |
| **Verified** | Signature, provenance, quality gate passed |
| **Reviewed** | Human review completed |
| **Trusted** | Long-term maintenance, stable version history, no complaints |
| **Restricted** | High-risk, private registry or special review only |
| **Deprecated** | Superseded by replacement |
| **Yanked** | Severe risk — blocked from new installations |

## Yank Policy

Domains with severe safety issues may be yanked. Yanked domains are blocked from new installations. Authors may appeal moderation decisions by opening an issue with evidence. See [registry-policy.md](./registry-policy.md) for the full policy.

## Structure

```
kdna-registry/
├── domains.json                   # Machine-readable index (schema v3.0)
├── SCHEMA.md                      # Schema contract — required reading
├── TRUST_MODEL.md                 # Registry trust, revocation, and scope delegation
├── registry-policy.md             # Moderation and yank policy
├── OFFICIAL_REPUBLISH.md          # Official yanked-asset republish runbook
├── scripts/validate-registry.js   # Validator (offline + --remote)
├── scripts/check-domain-trust-gate.js # Quality/review/limitations trust gate
└── README.md
```

## Trust Gate

The registry must not let weak domains damage trust in KDNA itself. Run the trust gate before review:

```bash
node scripts/check-domain-trust-gate.js
```

The gate checks that quality badges, review status, tested evidence, yanked state, and known limitations metadata do not over-claim domain quality. `tested` domains may still ship with a warning when limitations are not published, but promotion to `validated`, `expert_reviewed`, `production_ready`, `reviewed`, or `trusted` requires public limitations and review evidence.

## Related Repos

- [KDNA main](https://github.com/aikdna/kdna) — Protocol, specification, governance
- [kdna-cli](https://github.com/aikdna/kdna-cli) — CLI toolchain
- [kdna-studio-core](https://github.com/aikdna/kdna-studio-core) — Authoring kernel (`@aikdna/kdna-studio-core`)
- [kdna-studio-cli](https://github.com/aikdna/kdna-studio-cli) — Command-line authoring entry (`@aikdna/kdna-studio-cli`, `kdna-studio`)
- [kdna-skills](https://github.com/aikdna/kdna-skills) — Ready-to-use agent skill integrations
- [kdna-vscode](https://github.com/aikdna/kdna-vscode) — VS Code extension for KDNA authoring
- [kdna-website](https://github.com/aikdna/kdna-website) — Main project website

## Ecosystem

```
KDNA Protocol → Studio Core → Domain Asset → Registry → CLI → Agent Loader
```

## External Publishing

Third-party creators should follow [PUBLISHING.md](./PUBLISHING.md). The short
version is:

- publish a canonical `.kdna` asset file,
- submit `asset_url` and `asset_digest`,
- include signature, limitations, evals, and quality evidence,
- run the Registry validators before opening a pull request.

Official KDNA maintainers should follow
[OFFICIAL_REPUBLISH.md](./OFFICIAL_REPUBLISH.md) before unyanking any official
asset.

## License

Domain entries are metadata only (CC0). Individual domain assets carry their own licenses (declared in each entry's `license` field).
