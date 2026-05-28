# KDNA Registry Trust Model v1

The KDNA Registry is an asset-first trust catalog. It does not make a `.kdna`
asset trustworthy by listing it; it gives installers and runtimes enough signed
metadata to decide whether the asset should be downloaded, verified, loaded, or
blocked.

This model is TUF-inspired, but it does not claim full TUF conformance.

## Trust Objects

| Object | Purpose |
| --- | --- |
| `root` | Registry root trust keys and signing threshold. |
| `targets` | Delegated scopes allowed to publish asset metadata. |
| `snapshot` | Registry version and expiry for rollback/freeze protection. |
| `timestamp` | Freshness metadata checked before install. |
| `revocations` | Asset-specific blocks by name, version, and digest. |
| `scopes` | Scope public keys used to verify `.kdna` asset signatures. |
| `domains` | Asset metadata: `asset_url`, `asset_digest`, `signature`, quality, review, yank state. |

## Installer Requirements

A conforming installer MUST:

1. Reject an unknown registry schema major version.
2. Reject expired `snapshot.expires_at` or `timestamp.expires_at`.
3. Reject yanked assets for new installs.
4. Reject revoked assets when `{ name, version, asset_digest }` matches a
   `revocations[]` entry.
5. Download only from `asset_url`.
6. Verify root `mimetype` is `application/vnd.aikdna.kdna+zip`.
7. Verify the whole-file `asset_digest` before loading.
8. Verify Ed25519 `signature` against the scope `trust_pubkey` when
   `signature_required` is true or when trust mode is requested.
9. Store the immutable `.kdna` file as the trust source; caches are rebuildable.

## Scope Delegation

Each registry scope owns a public key:

```json
{
  "@example": {
    "type": "community",
    "trust_pubkey": "ed25519:<hex>",
    "verified": true
  }
}
```

Rules:

- `@aikdna` is the official scope.
- Community scopes require manual registry review before inclusion.
- Private scopes may set `registry_url` and publish their own registry metadata.
- A scope key signs assets in that scope; it does not sign assets in another
  scope.

## Revocation And Yank

`yanked: true` is a registry moderation state. It blocks new installs while
preserving existing local packages.

`revocations[]` is a trust state. It blocks a specific asset digest because the
asset is compromised, incorrectly signed, illegally distributed, or otherwise
unsafe to load.

Installers should surface the reason verbatim when refusing an asset.

## Key Rotation

Key rotation is performed by adding a new scope key and publishing a registry
version that keeps the old key valid long enough for already-published assets to
verify. New releases must use the new key after the rotation date.

A future registry version may introduce threshold signatures for root and scope
keys. Until then, v1 uses one Ed25519 key per active scope.

## Compatibility Boundary

This trust model protects open asset distribution. Licensed and runtime assets
also require entitlement checks, license activation, or runtime access control.
Those controls are layered on top of registry trust and do not replace digest or
signature verification.
