# KDNA Registry

Static registry for KDNA domain cognition packages. The `kdna` CLI reads this for domain discovery and `.kdna` file download URLs, sha256, and signature verification.

**Schema version: 2.0** (see [SCHEMA.md](./SCHEMA.md))

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
1. Read registry index → find `kdna_url`
2. Download `.kdna` (ZIP, ~10KB)
3. Verify `sha256` matches `domains.json`
4. Verify Ed25519 `signature` against scope's `trust_pubkey`
5. Extract to `~/.kdna/domains/@scope/name/`

## For domain experts and creators

You don't need to be a developer to contribute your judgment to KDNA.

**If you are a domain expert** (writer, caregiver, designer, community operator, florist, product builder, or any practitioner with real judgment in a specific field), here's your path:

1. **Start with an interview, not a JSON file.** [KDNA Studio](https://github.com/aikdna/kdna-studio-core) (`@aikdna/kdna-studio`) asks you questions about your expertise — what you reject, what beginners get wrong, what signals you watch for — and generates a structured KDNA domain from your answers.
2. **Don't worry about JSON.** The Studio interview mode handles the encoding. You focus on what you know, not on formatting.
3. **Get feedback before publishing.** Run `kdna validate` on your domain to check for structural issues. Share the `.kdna` file with a peer for review.
4. **Publish when ready.** When your domain passes validation and you're satisfied with the judgment content, `kdna publish` sends it to the registry — complete with your Ed25519 signature that proves you authored it.

**If you just want to use KDNA domains with your AI agent:**

```bash
npm install -g @aikdna/kdna-cli
kdna setup              # auto-detects your agent, installs kdna-loader
kdna install @aikdna/writing   # install a domain (sha256 + Ed25519 verified)
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
| `kdna_url` | Direct download URL for the `.kdna` file |
| `sha256` | Content hash for integrity verification |
| `signature` | Ed25519 signature for provenance verification |
| `quality_badge` | Quality tier: `untested`, `tested`, `validated`, `expert_reviewed`, or `production_ready` |
| `risk_level` | Risk classification: `R0` (low) through `R3` (restricted) |
| `review_status` | Registry review status (see Review Model below) |
| `i18n_level` | Internationalization level: `L0` (en only) through `L4` (fully localized) |
| `languages` | Array of supported language codes |
| `default_language` | Primary language for fallback |
| `known_limitations_url` | Link to the domain's `docs/known-limitations.md` |
| `deprecated` | Whether the domain has been superseded |
| `yanked` / `yanked_reason` | Whether the domain was pulled from new installations |

## Official Quality Badges

Official KDNA quality badges are issued only by the official registry or authorized registries. Forked tools may compute local validation results, but cannot claim official badge status unless signed by an authorized registry.

| Badge | Meaning | Min Eval Cases | Issued By |
|-------|---------|:---:|------------|
| `untested` | Schema validation only, no judgment quality evidence | 0 | Author self-declared |
| `tested` | Eval cases with manual verification | >= 3 | Author self-declared (requires signature) |
| `validated` | >= 10 eval cases with automated scoring passing | >= 10 | Official registry after automated check |
| `expert_reviewed` | Externally reviewed by a domain expert | >= 10 | Official registry after expert sign-off |
| `production_ready` | Validated + real-world deployment evidence | >= 10 | Official registry after deployment audit |

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
├── domains.json                   # Machine-readable index (schema v2.0)
├── SCHEMA.md                      # Schema contract — required reading
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
KDNA Protocol → Studio Core → Domain Package → Registry → CLI → Agent Loader
```

## License

Domain entries are metadata only (CC0). Individual domain packages carry their own licenses (declared in each entry's `license` field).
