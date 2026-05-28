# Official Asset Republish Runbook

This runbook restores official assets that were yanked because their published
`.kdna` files do not satisfy the current v1.0-rc asset contract.

The registry must not unyank an asset until the new release passes remote
validation. A valid republished asset must have:

- root `mimetype` entry with `application/vnd.aikdna.kdna+zip`
- canonical `kdna.json` manifest using `spec_version`, not `kdna_spec`
- whole-file `asset_digest` in `sha256:<hex>` form
- manifest and registry `signature` from the official scope identity
- immutable GitHub release asset URL

## 1. Pick The Next Asset

```bash
npm run report:yanked
```

Republish official assets in this order:

1. Lowest-risk, high-utility open assets such as `@aikdna/writing`
2. Core operating domains such as `@aikdna/decision_state`
3. Safety or higher-risk domains after extra review
4. Cluster sub-domains after the individual domain workflow is stable

## 2. Rebuild And Sign

From the source domain repository:

```bash
kdna publish --check .
kdna publish . --release-tag vX.Y.Z --repo aikdna/<repo>
```

Use the registry patch printed by `kdna publish`. Do not hand-edit digest,
signature, or asset URL values.

## 3. Update Registry Entry

In `domains.json`, update the matching entry:

- `version`
- `asset_url`
- `asset_digest`
- `content_digest`
- `signature`
- `release_status: "published_signed"`
- `yanked: false`
- `yanked_reason: null`
- `yanked_at: null`
- `updated`

Keep `media_type` as `application/vnd.aikdna.kdna+zip`.

## 4. Verify Before Merge

```bash
npm run release:preflight
npm run validate:remote
```

`validate:remote` downloads every non-yanked asset and verifies reachability,
root `mimetype`, and `asset_digest`. If it fails, keep the asset yanked.

## 5. Verify Install After Merge

After registry CI passes on `main`:

```bash
HOME=/tmp/kdna-install-smoke kdna install @aikdna/<name> --yes
HOME=/tmp/kdna-install-smoke kdna verify @aikdna/<name> --trust
```

The expected result is a successful install and trust verification, not a
post-download signature, digest, or mimetype error.
