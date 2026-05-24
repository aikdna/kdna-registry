# Contributing to KDNA Registry

This repository is the canonical KDNA domain registry — the index of all published KDNA domains, their versions, quality badges, risk levels, and i18n metadata.

For protocol-level guidance (schema, spec, judgment patterns), see the [main KDNA CONTRIBUTING.md](https://github.com/aikdna/kdna/blob/main/CONTRIBUTING.md).

## Adding a New Domain to the Registry

1. Publish your domain package to a reachable URL (GitHub Releases recommended)
2. Generate a sha256 checksum of the .kdna file
3. Have the package signed by a trusted scope pubkey (Ed25519)
4. Edit `domains.json` with your entry using the v2.2 schema format
5. Ensure all required fields are present: `languages`, `default_language`, `i18n_level`, `localized`, `risk_level`, `provenance_required`, `signature_required`
6. Do NOT use the deprecated `language` (singular) field — use `languages` + `default_language`
7. Open a PR for review

## Entry Format (Schema v2.2)

See [KDNA_I18N_SPEC.md](https://github.com/aikdna/kdna/blob/main/docs/KDNA_I18N_SPEC.md) for i18n field requirements. All official domains must be at least L1 in English and Chinese (zh-CN).

## Registry Moderation

Domains are classified by review status: `unlisted` → `community` → `verified` → `reviewed` → `trusted`.

See [registry-policy.md](https://github.com/aikdna/kdna/blob/main/docs/registry-policy.md) for the full moderation policy, including yank and appeal processes.

## Pull Request Checklist

- [ ] Entry follows schema v2.2 format
- [ ] `language` (deprecated) field is absent — `languages` + `default_language` used instead
- [ ] i18n fields are populated (`languages`, `default_language`, `i18n_level`, `localized`)
- [ ] sha256 matches the published .kdna file
- [ ] Signature is valid for the declared scope pubkey
- [ ] `risk_level` is set (R0–R3 per governance policy)
- [ ] `provenance_required` and `signature_required` are set
- [ ] `known_limitations_url` is populated or explicitly null

## License

- Code: Apache 2.0
- Documentation: CC BY 4.0
