#!/usr/bin/env node
// Sign the registry domains.json with Ed25519
// Usage: node scripts/sign-registry.js [--key <path-to-private-key>]

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const REGISTRY_FILE = path.join(__dirname, '..', 'domains.json');
const SIG_FILE = REGISTRY_FILE.replace(/\.json$/, '.sig');

function loadKey(keyPath) {
  if (keyPath) return fs.readFileSync(keyPath, 'utf8');
  const identityDir = process.env.KDNA_IDENTITY_DIR ||
    path.join(process.env.HOME || process.env.USERPROFILE || '.', '.kdna', 'identity');
  const keyFile = path.join(identityDir, 'kdna.key');
  if (!fs.existsSync(keyFile)) {
    console.error('No identity key found. Run: kdna identity init');
    console.error('Or provide a key path: node scripts/sign-registry.js --key <path>');
    process.exit(1);
  }
  return fs.readFileSync(keyFile, 'utf8');
}

function sign() {
  const args = process.argv.slice(2);
  const keyIdx = args.indexOf('--key');
  const keyPath = keyIdx >= 0 ? args[keyIdx + 1] : null;

  const privateKeyPem = loadKey(keyPath);
  const registryBuf = fs.readFileSync(REGISTRY_FILE);
  const signature = crypto.sign(null, registryBuf, privateKeyPem);

  fs.writeFileSync(SIG_FILE, signature);
  console.log(`Signed ${REGISTRY_FILE} → ${SIG_FILE}`);
  console.log(`Signature: ${signature.toString('hex').slice(0, 32)}...`);
}

function verify() {
  const registryBuf = fs.readFileSync(REGISTRY_FILE);
  if (!fs.existsSync(SIG_FILE)) {
    console.error('No signature file found. Run: node scripts/sign-registry.js');
    process.exit(1);
  }
  const signature = fs.readFileSync(SIG_FILE);

  // Load trusted public keys from registry trust metadata
  const registry = JSON.parse(registryBuf.toString());
  const rootKeys = (registry.trust?.root?.keys || []).filter(k => k.scheme === 'ed25519');

  if (rootKeys.length === 0) {
    console.error('No Ed25519 root keys in registry trust metadata');
    process.exit(1);
  }

  for (const key of rootKeys) {
    try {
      const ok = crypto.verify(null, registryBuf, crypto.createPublicKey(key.pubkey), signature);
      if (ok) {
        console.log(`✓ Signature verified with key ${key.keyid}`);
        process.exit(0);
      }
    } catch { /* try next key */ }
  }

  console.error('✗ Signature verification failed');
  process.exit(1);
}

const cmd = process.argv[2];
if (cmd === 'verify') verify();
else sign();
