# KDNA Registry

Static registry for KDNA domain cognition packages. The `kdna` CLI reads this for domain discovery and `.kdna` file download URLs + sha256 + signature verification.

**Schema version: 2.0** (see [SCHEMA.md](./SCHEMA.md))

## Usage

```bash
kdna list --available           # Browse all registered domains
kdna install writing            # Short name → @aikdna/writing (official scope only)
kdna install @aikdna/writing    # Full @scope/name
kdna install @aikdna/animation  # Install a cluster (installs all sub-domains)
```

CLI flow:
1. Read registry → find `kdna_url`
2. Download `.kdna` (ZIP, ~10KB)
3. Verify `sha256` matches `domains.json`
4. Verify Ed25519 `signature` against scope's `trust_pubkey`
5. Extract to `~/.kdna/domains/@scope/name/`

## Add a Domain

For new domains under your own scope (`@yourname/<id>`):

1. Build your domain (`KDNA_Core.json`, `KDNA_Patterns.json`, etc. + `kdna.json` with `name: "@yourname/<id>"`).
2. `kdna identity init` to generate your Ed25519 keys.
3. `kdna publish ./your_domain --release-tag v0.1.0 --repo yourname/kdna-<id>` — packs, signs, uploads to GitHub Release, prints registry patch JSON.
4. Open a PR adding your scope to `scopes` (with your `trust_pubkey`) and the domain entry to `domains` in `domains.json`.
5. CI runs `node scripts/validate-registry.js` automatically.
6. For pre-submission verification: `node scripts/validate-registry.js --remote` checks that `kdna_url` resolves and `sha256` matches.

For domains under `@aikdna/`: only the core team's `trust_pubkey` is accepted. Open an issue to discuss before submitting.

See [SCHEMA.md](./SCHEMA.md) for the full contract.

## Structure

```
kdna-registry/
├── domains.json                   # Machine-readable index (schema v2.0)
├── SCHEMA.md                      # Schema contract — required reading
├── scripts/validate-registry.js   # Validator (offline + --remote)
└── README.md
```

## License

Domain entries are metadata only (CC0). Individual domain packages carry their own licenses (declared in each entry's `license` field).
