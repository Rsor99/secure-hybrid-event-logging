#!/usr/bin/env node
// Generates an Ed25519 keypair in the format expected by ExonumAnchor.
// Run: node scripts/gen-exonum-keypair.js
// Then paste the output into your .env file.

const { generateKeyPairSync } = require('crypto');

const { privateKey, publicKey } = generateKeyPairSync('ed25519');

const pubDer  = publicKey.export({ type: 'spki',  format: 'der' });
const privDer = privateKey.export({ type: 'pkcs8', format: 'der' });

// SPKI DER: 12-byte header + 32-byte public key
const pubHex  = pubDer.subarray(12).toString('hex');
// PKCS8 DER: 16-byte header + 32-byte seed
const seedHex = privDer.subarray(16, 48).toString('hex');

console.log('Add these to your .env:\n');
console.log(`EXONUM_PUBLIC_KEY=${pubHex}`);
console.log(`EXONUM_SECRET_KEY=${seedHex}`);
