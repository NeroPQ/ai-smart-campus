/**
 * Verifies an ID token created by Apps Script's ScriptApp.getIdentityToken().
 * The audience and owner email must come from trusted server configuration;
 * neither value is inferred from the untrusted token.
 */

const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const MAX_TOKEN_LENGTH = 16_384;
const MAX_JWKS_KEYS = 32;
const DEFAULT_JWKS_TTL_MS = 5 * 60 * 1000;
const MAX_JWKS_TTL_MS = 60 * 60 * 1000;

type GoogleJwk = JsonWebKey & {
  kid?: string;
  use?: string;
  alg?: string;
  key_ops?: string[];
};

type CachedJwks = {
  keys: GoogleJwk[];
  fetchedAt: number;
  expiresAt: number;
};

export type GoogleIdTokenConfig = {
  /** Exact OAuth client ID expected in the token's `aud` claim. */
  audience: string;
  /** The single Google account allowed to call the sync endpoint. */
  ownerEmail: string;
};

export type VerifiedGoogleIdentity = {
  sub: string;
  email: string;
};

let jwksCache: CachedJwks | null = null;

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length % 4 === 1) return null;
  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  return copy;
}

function decodeJsonSegment<T>(segment: string): T | null {
  const bytes = decodeBase64Url(segment);
  if (!bytes) return null;
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function getJwksTtlMs(cacheControl: string | null): number {
  const maxAge = cacheControl?.match(/(?:^|,)\s*max-age\s*=\s*(\d+)/i);
  if (!maxAge) return DEFAULT_JWKS_TTL_MS;
  return Math.min(Number(maxAge[1]) * 1000, MAX_JWKS_TTL_MS);
}

async function fetchGoogleJwks(): Promise<CachedJwks> {
  const response = await fetch(GOOGLE_JWKS_URL, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    redirect: 'manual',
  });
  if (!response.ok) throw new Error('Google signing keys unavailable');

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { keys?: unknown }).keys)) {
    throw new Error('Invalid Google signing keys');
  }
  const keys = (payload as { keys: unknown[] }).keys;
  if (keys.length === 0 || keys.length > MAX_JWKS_KEYS) throw new Error('Invalid Google signing keys');

  const checkedKeys = keys.filter((key): key is GoogleJwk => {
    if (!key || typeof key !== 'object') return false;
    const jwk = key as GoogleJwk;
    return jwk.kty === 'RSA'
      && typeof jwk.kid === 'string'
      && /^[A-Za-z0-9_-]{1,128}$/.test(jwk.kid)
      && typeof jwk.n === 'string'
      && typeof jwk.e === 'string';
  });
  if (checkedKeys.length !== keys.length) throw new Error('Invalid Google signing keys');

  const fetchedAt = Date.now();
  return {
    keys: checkedKeys,
    fetchedAt,
    expiresAt: fetchedAt + getJwksTtlMs(response.headers.get('cache-control')),
  };
}

async function getGoogleJwks(forceRefresh = false): Promise<CachedJwks> {
  if (!forceRefresh && jwksCache && jwksCache.expiresAt > Date.now()) return jwksCache;
  const result = await fetchGoogleJwks();
  jwksCache = result;
  return result;
}

function validConfig(config: GoogleIdTokenConfig | null | undefined): config is GoogleIdTokenConfig {
  return Boolean(config)
    && typeof config?.audience === 'string'
    && config.audience.length > 0
    && config.audience.length <= 512
    && typeof config.ownerEmail === 'string'
    && config.ownerEmail.trim().length > 0
    && config.ownerEmail.length <= 320;
}

function isEmailVerified(value: unknown): boolean {
  // Google's Apps Script and OIDC examples have represented this claim as both
  // the JSON boolean and the string "true".
  return value === true || value === 'true';
}

function validClaims(
  payload: Record<string, unknown>,
  config: GoogleIdTokenConfig,
  nowSeconds: number,
): VerifiedGoogleIdentity | null {
  const issuer = payload.iss;
  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') return null;
  if (payload.aud !== config.audience) return null;
  if (payload.azp !== undefined && payload.azp !== config.audience) return null;

  const issuedAt = payload.iat;
  const expiresAt = payload.exp;
  if (!Number.isSafeInteger(issuedAt) || !Number.isSafeInteger(expiresAt)) return null;
  if (Number(expiresAt) <= nowSeconds || Number(issuedAt) > nowSeconds + 60 || Number(expiresAt) <= Number(issuedAt)) return null;
  if (payload.nbf !== undefined && (!Number.isSafeInteger(payload.nbf) || Number(payload.nbf) > nowSeconds)) return null;

  const subject = payload.sub;
  const email = payload.email;
  if (typeof subject !== 'string' || !/^[\x21-\x7e]{1,255}$/.test(subject)) return null;
  if (typeof email !== 'string' || !isEmailVerified(payload.email_verified)) return null;
  if (email.trim().toLowerCase() !== config.ownerEmail.trim().toLowerCase()) return null;

  return { sub: subject, email };
}

/**
 * Return the verified owner identity, or null for any invalid token or missing
 * server configuration. Errors are intentionally collapsed to null so token,
 * key-fetch, and parsing details are never returned to callers or logged here.
 */
export async function verifyGoogleIdToken(
  token: unknown,
  config: GoogleIdTokenConfig | null | undefined,
): Promise<VerifiedGoogleIdentity | null> {
  if (!validConfig(config) || typeof token !== 'string' || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;

  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => part.length === 0)) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = decodeJsonSegment<Record<string, unknown>>(encodedHeader);
  const payload = decodeJsonSegment<Record<string, unknown>>(encodedPayload);
  const signature = decodeBase64Url(encodedSignature);
  if (!header || !payload || !signature) return null;
  if (header.alg !== 'RS256' || (header.typ !== undefined && header.typ !== 'JWT')) return null;
  if (header.crit !== undefined || header.b64 !== undefined || header.jku !== undefined || header.x5u !== undefined) return null;
  if (typeof header.kid !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(header.kid)) return null;

  const identity = validClaims(payload, config, Math.floor(Date.now() / 1000));
  if (!identity) return null;

  try {
    let jwks = await getGoogleJwks();
    let candidates = jwks.keys.filter((key) => key.kid === header.kid);

    // A cached key set may have become stale after Google's signing-key
    // rotation. Refresh at most once per 30 seconds for an unknown kid.
    if (candidates.length === 0 && Date.now() - jwks.fetchedAt >= 30_000) {
      jwks = await getGoogleJwks(true);
      candidates = jwks.keys.filter((key) => key.kid === header.kid);
    }
    if (candidates.length !== 1) return null;

    const signingKey = candidates[0];
    if ((signingKey.use !== undefined && signingKey.use !== 'sig')
      || (signingKey.alg !== undefined && signingKey.alg !== 'RS256')
      || (signingKey.key_ops !== undefined && !signingKey.key_ops.includes('verify'))) return null;

    const cryptoKey = await crypto.subtle.importKey(
      'jwk',
      signingKey,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const signingInput = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
    const signatureValid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      toArrayBuffer(signature),
      toArrayBuffer(signingInput),
    );
    return signatureValid ? identity : null;
  } catch {
    return null;
  }
}
