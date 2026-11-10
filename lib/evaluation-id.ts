type InsertResult = { meta?: { changes?: number } };
type InsertStatement = {
  run(): Promise<InsertResult>;
  first<T>(): Promise<T | null>;
};
type RegistrationDb = { prepare(sql: string): { bind(...values: unknown[]): InsertStatement } };
const MAX_PARTICIPANT_SEQUENCE = 9007199254740991;
const ASC_SEQUENCE_FILTER = `participant_id GLOB 'ASC[0-9]*'
  AND LENGTH(SUBSTR(participant_id, 4)) BETWEEN 3 AND 16
  AND SUBSTR(participant_id, 4) NOT GLOB '*[^0-9]*'
  AND CAST(SUBSTR(participant_id, 4) AS INTEGER) BETWEEN 1 AND ${MAX_PARTICIPANT_SEQUENCE}
  AND printf('%03d', CAST(SUBSTR(participant_id, 4) AS INTEGER)) = SUBSTR(participant_id, 4)`;

export function isManualLiveRegistration(action: unknown, qa: boolean, id: unknown): boolean {
  return action === 'register' && !qa && id !== undefined;
}

const INSERT_NEXT_PARTICIPANT = `
  INSERT OR IGNORE INTO evaluation_attempts
    (key, participant_id, is_qa, access_hash, created_at, updated_at)
  SELECT 'live:' || 'ASC' || printf('%03d', candidate.next_id), 'ASC' || printf('%03d', candidate.next_id), 0, ?, ?, ?
  FROM (
    SELECT COALESCE(MAX(CAST(SUBSTR(participant_id, 4) AS INTEGER)), 0) + 1 AS next_id
    FROM evaluation_attempts
    WHERE is_qa = 0 AND ${ASC_SEQUENCE_FILTER}
  ) AS candidate
  WHERE candidate.next_id <= ${MAX_PARTICIPANT_SEQUENCE}
`;

const SELECT_MAX_PARTICIPANT_SEQUENCE = `
  SELECT MAX(CAST(SUBSTR(participant_id, 4) AS INTEGER)) AS max_id
  FROM evaluation_attempts
  WHERE is_qa = 0 AND ${ASC_SEQUENCE_FILTER}
`;

/** Insert and allocate in one SQLite statement so concurrent registrations cannot claim the same ID. */
export async function registerNextParticipant(db: RegistrationDb, accessHash: string, now: string): Promise<string | null> {
  const created = await db.prepare(INSERT_NEXT_PARTICIPANT).bind(accessHash, now, now).run();
  if (created.meta?.changes !== 1) {
    const highest = await db.prepare(SELECT_MAX_PARTICIPANT_SEQUENCE).bind().first<{ max_id: number | null }>();
    if (Number(highest?.max_id) >= MAX_PARTICIPANT_SEQUENCE) throw new Error('Participant ID sequence is exhausted.');
    return null;
  }

  // The access hash is a fresh random per-session value, so it identifies this insert without a second counter table.
  const inserted = await db.prepare('SELECT participant_id FROM evaluation_attempts WHERE is_qa = 0 AND access_hash = ?').bind(accessHash).first<{ participant_id: string }>();
  if (!inserted || !/^ASC[0-9]{3,}$/.test(inserted.participant_id)) throw new Error('Generated participant ID was not found.');
  const sequence = Number(inserted.participant_id.slice(3));
  if (!Number.isSafeInteger(sequence) || sequence < 1 || inserted.participant_id !== `ASC${String(sequence).padStart(3, '0')}`) {
    throw new Error('Generated participant ID was outside the supported sequence range.');
  }
  return inserted.participant_id;
}
