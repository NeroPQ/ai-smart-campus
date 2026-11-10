import { env } from 'cloudflare:workers';
import { verifyGoogleIdToken } from '@/lib/google-id-token';

export const dynamic = 'force-dynamic';

const GOOGLE_ID_TOKEN_AUDIENCE = '189645506328-tf5uhef31v3mfnbl9kake65aih9ro7gu.apps.googleusercontent.com';
const MAX_PAGE_SIZE = 200;
const MAX_BODY_LENGTH = 2048;
const MAX_BEARER_TOKEN_LENGTH = 16_384;
const privateHeaders = { 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: privateHeaders });

async function readBoundedBody(request: Request): Promise<string | null> {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_LENGTH) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

type SyncRow = {
  key: string;
  participant_id: string;
  is_qa: number;
  pre_score: number | null;
  post_score: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
};

function constantTimeEqual(candidate: string, expected: string): boolean {
  const left = new TextEncoder().encode(candidate);
  const right = new TextEncoder().encode(expected);
  // Bound the work even if a malformed request supplies a very large value.
  let mismatch = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0);
  }
  return mismatch === 0;
}

function publicRow(row: SyncRow) {
  let rating: number | null = null;
  let comment = '';
  try {
    const feedback: unknown = row.feedback ? JSON.parse(row.feedback) : null;
    if (feedback && typeof feedback === 'object' && !Array.isArray(feedback)) {
      const value = feedback as { rating?: unknown; comment?: unknown };
      if (Number.isInteger(value.rating) && Number(value.rating) >= 1 && Number(value.rating) <= 5) rating = Number(value.rating);
      if (typeof value.comment === 'string') comment = value.comment.slice(0, 500);
    }
  } catch { /* A malformed legacy feedback record is exported as blank. */ }

  return {
    participantId: row.participant_id,
    isQa: row.is_qa === 1,
    preScore: row.pre_score,
    postScore: row.post_score,
    improvement: row.pre_score === null || row.post_score === null ? null : row.post_score - row.pre_score,
    rating,
    comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function POST(request: Request) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    return reply({ error: 'Content-Type must be application/json.' }, 415);
  }
  const length = Number(request.headers.get('content-length') || 0);
  if (length > MAX_BODY_LENGTH) return reply({ error: 'Request body is too large.' }, 413);

  let body: Record<string, unknown>;
  try {
    const raw = await readBoundedBody(request);
    if (raw === null) return reply({ error: 'Request body is too large.' }, 413);
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
    body = parsed as Record<string, unknown>;
  } catch {
    return reply({ error: 'Invalid JSON body.' }, 400);
  }

  const runtimeEnv = env as unknown as { SHEETS_SYNC_TOKEN?: string; ADMIN_EMAIL?: string };
  const authorization = request.headers.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer ([^\s]+)$/i);
  let authorized = false;

  if (authorization) {
    // A supplied bearer credential must validate as the configured Google
    // identity. Never downgrade a malformed bearer token to shared-secret auth.
    if (bearerMatch && bearerMatch[1].length <= MAX_BEARER_TOKEN_LENGTH) {
      authorized = Boolean(await verifyGoogleIdToken(bearerMatch[1], {
        audience: GOOGLE_ID_TOKEN_AUDIENCE,
        ownerEmail: runtimeEnv.ADMIN_EMAIL || '',
      }));
    }
  } else {
    // Keep the previous secret-based integration available during rollout and
    // as a rollback path. The Google ID token is the primary Apps Script path.
    const configured = runtimeEnv.SHEETS_SYNC_TOKEN;
    const supplied = typeof body.token === 'string' ? body.token : '';
    authorized = Boolean(configured
      && configured.length >= 32
      && configured.length <= 256
      && supplied.length <= 256
      && constantTimeEqual(supplied, configured));
  }

  if (!authorized) {
    return reply({ error: 'Unauthorized.' }, 401);
  }
  if (!env.DB) return reply({ error: 'Storage is unavailable.' }, 503);

  const cursor = body.cursor;
  if (cursor !== null && cursor !== undefined && (typeof cursor !== 'string' || cursor.length > 128)) {
    return reply({ error: 'Invalid cursor.' }, 400);
  }
  const pageSize = typeof body.limit === 'number' && Number.isInteger(body.limit)
    ? Math.max(1, Math.min(MAX_PAGE_SIZE, body.limit))
    : MAX_PAGE_SIZE;

  const rows = await env.DB.prepare(
    'SELECT key, participant_id, is_qa, pre_score, post_score, feedback, created_at, updated_at FROM evaluation_attempts WHERE key > ? ORDER BY key LIMIT ?',
  ).bind(typeof cursor === 'string' ? cursor : '', pageSize).all<SyncRow>();

  const lastKey = rows.results.at(-1)?.key ?? null;
  return reply({ rows: rows.results.map(publicRow), nextCursor: rows.results.length === pageSize ? lastKey : null });
}
