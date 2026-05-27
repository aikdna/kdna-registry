# Publishing a Third-Party KDNA Asset

This is the external publishing path for creators who want a `.kdna` asset to
appear in the public Registry.

The Registry accepts canonical `.kdna` assets only. Raw source directories,
repository archives, `kdna_url`, and bare `sha256` fields are legacy forms and
are rejected by schema v3.

## Publishing Flow

1. **Choose or request a scope**
   - Use your organization scope when possible, for example `@acme/legal_review`.
   - Open a scope request issue if the scope is new.
   - The Registry maintainers assign a `trust_pubkey` for verified scopes.

2. **Build the asset**
   - Author in KDNA Studio/Core or a compatible tool.
   - Export a single `.kdna` file.
   - Dev source directories are allowed only as authoring workspaces.

3. **Validate locally**

   ```bash
   kdna dev validate ./source
   kdna dev pack ./source --out ./dist/legal_review-0.1.0.kdna
   kdna inspect ./dist/legal_review-0.1.0.kdna
   kdna verify ./dist/legal_review-0.1.0.kdna
   ```

4. **Sign and publish the asset file**
   - Publish the `.kdna` file to a stable release URL.
   - Sign with the scope key when the asset is official for that scope.
   - Keep released `.kdna` files immutable.

5. **Add or update the Registry entry**
   - Use `asset_url`, not `kdna_url`.
   - Use `asset_digest` in `sha256:<64-hex>` form, not `sha256`.
   - Include `signature` when signed.
   - Include `known_limitations_url`, `evals_url`, and `benchmark_report_url`
     for any asset requesting `tested` or higher quality.

6. **Run Registry checks**

   ```bash
   node scripts/validate-registry.js
   node scripts/validate-registry.js --remote
   node scripts/check-quality-badges.js
   ```

7. **Open a pull request**
   - Include the asset URL, digest, release tag, scope owner, quality target,
     and review notes.

## Required Metadata

Each published entry must include:

- `name`
- `version`
- `asset_url`
- `asset_digest`
- `release_status`
- `license`
- `quality_badge`
- `risk_level`
- `review_status`
- `yanked`
- `deprecated`

## Quality Badge Evidence

| Badge | Minimum evidence |
| --- | --- |
| `untested` | Structural validation and a visible README. |
| `tested` | `evals_url`, known limitations, and at least one before/after or rubric report. |
| `validated` | Repeatable benchmark report showing improvement over a baseline. |
| `expert_reviewed` | Independent reviewer identity and review notes. |
| `production_ready` | Deployment evidence, monitoring/audit path, and rollback/yank plan. |

## Required Boundary Documents

Every third-party asset should publish:

- Scope
- Out of scope
- Known limitations
- Failure risks
- Misuse cases
- Eval cases
- Benchmark or before/after report when available

## Versioning and Yank Policy

- Patch versions may fix wording, examples, and metadata without changing core
  judgment.
- Minor versions may add axioms, cases, scenarios, or self-checks.
- Major versions are required for removed or materially changed judgments.
- Yank a version if it is unsafe, mislicensed, corrupt, or signed by a
  compromised key.
- Never replace a file at an existing `asset_url` with different bytes.

## Pull Request Checklist

- [ ] `.kdna` asset is publicly downloadable.
- [ ] `asset_digest` matches the released file.
- [ ] Signature verifies, or the entry is clearly unsigned/community.
- [ ] Known limitations URL is present.
- [ ] Eval or benchmark evidence supports the requested quality badge.
- [ ] Risk level and review status are justified.
- [ ] `node scripts/validate-registry.js --remote` passes.
