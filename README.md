# KDNA Registry

Static registry for KDNA domain cognition packages. Used by the `kdna` CLI for domain discovery, search, and installation.

## Usage

```bash
kdna list --available     # Browse all registered domains
kdna install writing      # Install a domain (clone repo to ~/.kdna/domains/)
kdna search "writing"     # Search domains by keyword (coming soon)
```

## Add a Domain

1. Create a standalone KDNA-compatible repo named `kdna-<domain>` with `KDNA_Core.json`, `KDNA_Patterns.json`, and `kdna.json` manifest.
2. Open a PR adding your domain entry to `domains.json`.
3. Run `node scripts/validate-registry.js`.
4. After review and validation, your domain will be discoverable via `kdna list --available`.

See [registry policy](https://github.com/knowledge-dna/KDNA/blob/main/docs/registry-policy.md) for inclusion criteria.

## Structure

```
kdna-registry/
├── domains.json       # Machine-readable index of all registered domains
├── packages/          # Tarball packages for offline/distribution installs
├── README.md
└── README.zh.md
```

## License

Domain entries are metadata only (CC0). Individual domain packages carry their own licenses.
