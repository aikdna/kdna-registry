# KDNA Registry

Static registry for KDNA cognition assets. The `kdna` CLI reads this for asset discovery, `.kdna` download URLs, asset digests, signature verification, and revocation status.

**Schema version: 3.0** (see [SCHEMA.md](./SCHEMA.md))

Trust model: [KDNA Registry Trust Model v1](./TRUST_MODEL.md)

## What is KDNA Registry?

The KDNA Registry is not a token marketplace. It is not an NFT marketplace. It is a trusted catalog for AI-loadable cognitive assets.

The KDNA Registry is the canonical index of all published KDNA domain cognition packages. It is a machine-readable JSON file (`domains.json`) that tells the `kdna` CLI what domains exist, where to download them, how to verify them, and what quality and safety metadata they carry. Every domain entry includes a review status, risk level, internationalization level, quality badge, provenance requirements, and a known limitations URL.

Discover → Verify → Install → Load → License

## How to Use

```bash
kdna list --available           # Browse all registered domains
kdna install writing            # Short name (official @aikdna/ scope only)
kdna install @aikdna/writing    # Full @scope/name
kdna install @aikdna/animation  # Install a cluster (installs all sub-domains)
```

CLI flow:
1. Read registry trust metadata and reject expired snapshots/timestamps.
2. Resolve the entry and reject yanked or revoked assets.
3. Download `.kdna` from `asset_url`.
4. Verify whole-file `asset_digest` matches `domains.json`.
5. Verify Ed25519 `signature` against the scope `trust_pubkey`.
6. Store the immutable asset under `~/.kdna/packages/` with a `receipt.json`.

## For domain experts and creators

You don't need to be a developer to contribute your judgment to KDNA.

**If you are a domain expert** (writer, caregiver, designer, community operator, florist, product builder, or any practitioner with real judgment in a specific field), here's your path:

1. **Start with an interview, not a JSON file.** [KDNA Studio](https://github.com/aikdna/kdna-studio-core) (`@aikdna/kdna-studio`) asks you questions about your expertise — what you reject, what beginners get wrong, what signals you watch for — and generates a structured KDNA domain from your answers.
2. **Don't worry about JSON.** The Studio interview mode handles the encoding. You focus on what you know, not on formatting.
3. **Get feedback before publishing.** Run `kdna dev validate` on your source workspace, then share the `.kdna` file with a peer for review.
4. **Publish when ready.** When your domain passes validation and you're satisfied with the judgment content, `kdna publish` sends it to the registry — complete with your Ed25519 signature that proves you authored it.

**If you just want to use KDNA domains with your AI agent:**

```bash
npm install -g @aikdna/kdna-cli
kdna setup              # auto-detects your agent, installs kdna-loader
kdna install @aikdna/writing   # install a .kdna asset (asset digest + Ed25519 verified)
```

That's it. Your agent now loads domain judgment. No coding required.

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
| `signature` | Ed25519 signature for provenance verification |
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

Official KDNA quality badges are issued only by the official registry or authorized registries. Forked tools may compute local validation results, but cannot claim official badge status unless signed by an authorized registry.

| Badge | Meaning | Min Eval Cases | Issued By |
|-------|---------|:---:|------------|
| `untested` | Schema validation only, no judgment quality evidence | 0 | Author self-declared |
| `tested` | At least 10 eval cases with manual verification | >= 10 | Author self-declared (requires signature) |
| `validated` | At least 30 eval cases with automated scoring and raw outputs | >= 30 | Official registry after automated check |
| `expert_reviewed` | Validated evidence plus independent domain expert review | >= 30 | Official registry after expert sign-off |
| `production_ready` | Expert-reviewed evidence plus real-world deployment evidence | >= 30 | Official registry after deployment audit |

---

## Review Model

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
- [kdna-studio-core](https://github.com/aikdna/kdna-studio-core) — Authoring kernel (`@aikdna/kdna-studio`)
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

## License

Domain entries are metadata only (CC0). Individual domain assets carry their own licenses (declared in each entry's `license` field).
