# Registry Policy

The KDNA registry is a curated index of domain cognition packages. It is not an automatic listing.

## Asset Boundary Policy

The KDNA Registry is **not a token marketplace**. It is **not an NFT marketplace**. It is **not a financial product**. KDNA cognitive assets are licensed judgment packages — not crypto assets, not speculative instruments, not tradeable tokens.

- No token, no NFT, no crypto asset
- No marketplace speculation or trading
- No auction or bidding mechanisms
- No financialization of judgment assets
- Standard content licenses only (CC-BY-4.0, Apache-2.0)

The Registry provides: **Discover → Verify → Install → Load → License**. It does not provide: trade, speculate, tokenize, or auction.

## Review Levels

| Level | Meaning | Requirements |
|-------|---------|-------------|
| `unlisted` | Installable but not displayed | Basic validation |
| `community` | Community-submitted | Signature + validate + provenance |
| `verified` | Trust chain verified | community + quality_badge ≥ tested |
| `reviewed` | Human-reviewed | verified + expert review |
| `trusted` | Long-term trusted | reviewed + 30 days stable |
| `restricted` | High-risk, limited access | Special review |
| `deprecated` | Superseded | Must have replaced_by |
| `yanked` | Severely blocked | Install rejected |

## Yank Policy

A domain MAY be yanked if it:
- Contains harmful or dangerous judgment
- Has forged provenance or signatures
- Fails current KDNA asset-format requirements, including the root `mimetype`
  marker or canonical `.kdna` verification contract
- Violates the risk policy (e.g., R3 domain in public registry)
- Has been reported with verified safety issues

Yanked domains are:
- Not available for new installations
- Not displayed in default listings
- Blocked by kdna-loader with a safety warning

## Appeal Process

Authors may appeal moderation decisions by opening an issue in [aikdna/kdna-registry](https://github.com/aikdna/kdna-registry/issues) with:
1. Domain name and version
2. Reason for appeal
3. Evidence supporting the appeal

Appeals are reviewed by registry maintainers within 14 days.
