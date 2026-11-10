import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { build } from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const project = process.cwd();
const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'asc-google-id-token-'));
const bundled = path.join(temp, 'google-id-token.mjs');
await build({
  entryPoints: [path.join(project, 'lib/google-id-token.ts')],
  outfile: bundled,
  bundle: true,
  platform: 'node',
  format: 'esm',
});
const { verifyGoogleIdToken } = await import(pathToFileURL(bundled).href);

const audience = 'apps-script-client-id.apps.googleusercontent.com';
const ownerEmail = 'phanthienquang11234@gmail.com';
const now = Math.floor(Date.now() / 1000);
const signingPair = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const otherPair = await webcrypto.subtle.generateKey(
  { name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
  true,
  ['sign', 'verify'],
);
const publicJwk = { ...(await webcrypto.subtle.exportKey('jwk', signingPair.publicKey)), kid: 'google-key-1', use: 'sig', alg: 'RS256' };
const config = { audience, ownerEmail };
let jwks = { keys: [publicJwk] };
let failKeyFetch = false;
let fetchCount = 0;
const previousFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  fetchCount += 1;
  assert.equal(String(input), 'https://www.googleapis.com/oauth2/v3/certs');
  assert.equal(init?.method, 'GET');
  assert.equal(init?.redirect, 'manual');
  if (failKeyFetch) throw new Error('network failure');
  return new Response(JSON.stringify(jwks), {
    status: 200,
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=0' },
  });
};

const b64url = value => Buffer.from(value).toString('base64url');
async function signToken(claimOverrides = {}, options = {}) {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'google-key-1', ...options.header };
  const claims = {
    iss: 'https://accounts.google.com',
    aud: audience,
    sub: '110000000000000000001',
    email: ownerEmail,
    email_verified: true,
    iat: now - 10,
    exp: now + 300,
    ...claimOverrides,
  };
  const body = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(claims))}`;
  const privateKey = options.privateKey || signingPair.privateKey;
  const signature = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(body));
  return `${body}.${Buffer.from(signature).toString('base64url')}`;
}

try {
  const beforeMissingConfig = fetchCount;
  assert.equal(await verifyGoogleIdToken('', config), null);
  assert.equal(await verifyGoogleIdToken(await signToken(), undefined), null);
  assert.equal(await verifyGoogleIdToken(await signToken(), { audience: '', ownerEmail }), null);
  assert.equal(await verifyGoogleIdToken(await signToken(), { audience, ownerEmail: '  ' }), null);
  assert.equal(fetchCount, beforeMissingConfig, 'missing config must fail closed before network access');

  const valid = await verifyGoogleIdToken(await signToken(), config);
  assert.deepEqual(valid, { sub: '110000000000000000001', email: ownerEmail });
  assert.ok(fetchCount > beforeMissingConfig, 'valid verification obtains Google signing keys');

  assert.equal(await verifyGoogleIdToken(await signToken({ iss: 'https://attacker.example' }), config), null, 'rejects wrong issuer');
  assert.equal(await verifyGoogleIdToken(await signToken({ aud: 'another-client.apps.googleusercontent.com' }), config), null, 'rejects wrong audience');
  assert.equal(await verifyGoogleIdToken(await signToken({ aud: [audience] }), config), null, 'requires the exact fixed audience');
  assert.equal(await verifyGoogleIdToken(await signToken({ azp: 'other-client.apps.googleusercontent.com' }), config), null, 'rejects a different authorized presenter');
  assert.equal(await verifyGoogleIdToken(await signToken({ exp: now }), config), null, 'rejects expired tokens');
  assert.equal(await verifyGoogleIdToken(await signToken({ iat: now + 61 }), config), null, 'rejects future-issued tokens');
  assert.equal(await verifyGoogleIdToken(await signToken({ nbf: now + 1 }), config), null, 'rejects tokens that are not yet valid');
  assert.equal(await verifyGoogleIdToken(await signToken({ email: 'attacker@gmail.com' }), config), null, 'rejects a different owner email');
  assert.equal(await verifyGoogleIdToken(await signToken({ email_verified: false }), config), null, 'requires a verified owner email');

  // Google documentation shows the email_verified claim as a boolean in some
  // responses and as the string "true" in Apps Script / tokeninfo examples.
  assert.deepEqual(await verifyGoogleIdToken(await signToken({ email_verified: 'true', iss: 'accounts.google.com' }), config), {
    sub: '110000000000000000001',
    email: ownerEmail,
  });

  const invalidSignature = await signToken({}, { privateKey: otherPair.privateKey });
  assert.equal(await verifyGoogleIdToken(invalidSignature, config), null, 'rejects a signature made by another key');
  const [head, payload, signature] = (await signToken()).split('.');
  const signatureBytes = Buffer.from(signature, 'base64url');
  signatureBytes[0] ^= 0xff;
  assert.equal(await verifyGoogleIdToken(`${head}.${payload}.${signatureBytes.toString('base64url')}`, config), null, 'rejects tampered signature bytes');
  assert.equal(await verifyGoogleIdToken(await signToken({}, { header: { alg: 'none' } }), config), null, 'rejects algorithm substitution');
  assert.equal(await verifyGoogleIdToken('not-a-jwt', config), null, 'rejects malformed compact tokens');

  jwks = { keys: [] };
  assert.equal(await verifyGoogleIdToken(await signToken(), config), null, 'fails closed on malformed key sets');
  jwks = { keys: [publicJwk] };
  failKeyFetch = true;
  assert.equal(await verifyGoogleIdToken(await signToken(), config), null, 'fails closed when Google keys cannot be fetched');

  console.log('PASS Google ID token auth: config, Google JWKS, signature, issuer, audience, expiry, owner email, and fail-closed behavior');
} finally {
  globalThis.fetch = previousFetch;
  await fs.rm(temp, { recursive: true, force: true });
}
