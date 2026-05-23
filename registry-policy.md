# Registry Policy

The KDNA registry is a curated index of domain cognition packages. It is not an automatic listing.

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
- Violates the risk policy (e.g., R3 domain in public registry)
- Has been reported with verified safety issues

Yanked domains are:
- Not available for new installations
- Not displayed in default listings
- Blocked by kdna-loader with a safety warning

## Appeal Process

Authors may appeal moderation decisions by opening an issue in [knowledge-dna/kdna-registry](https://github.com/knowledge-dna/kdna-registry/issues) with:
1. Domain name and version
2. Reason for appeal
3. Evidence supporting the appeal

Appeals are reviewed by registry maintainers within 14 days.
