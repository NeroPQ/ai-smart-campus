import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { isManualLiveRegistration, registerNextParticipant } from '../lib/evaluation-id.ts';

function makeDb(database: DatabaseSync) {
  return {
    prepare(sql: string) {
      return {
        bind(...values: unknown[]) {
          return {
            async run() {
              await new Promise<void>((resolve) => setImmediate(resolve));
              const result = database.prepare(sql).run(...values as never[]);
              return { meta: { changes: Number(result.changes) } };
            },
            async first<T>() {
              await new Promise<void>((resolve) => setImmediate(resolve));
              return (database.prepare(sql).get(...values as never[]) as T | undefined) ?? null;
            },
          };
        },
      };
    },
  };
}

function createDb() {
  const database = new DatabaseSync(':memory:');
  database.exec(`CREATE TABLE evaluation_attempts (
    key TEXT PRIMARY KEY NOT NULL,
    participant_id TEXT NOT NULL,
    is_qa INTEGER NOT NULL,
    access_hash TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  return { database, db: makeDb(database) };
}

test('concurrent registrations receive distinct sequential IDs', async () => {
  const { database, db } = createDb();

  const ids = await Promise.all(Array.from({ length: 40 }, (_, index) =>
    registerNextParticipant(db, `session-hash-${index}`, '2026-11-10T00:00:00.000Z'),
  ));

  assert.equal(new Set(ids).size, ids.length);
  assert.deepEqual(ids.sort(), Array.from({ length: 40 }, (_, index) => `ASC${String(index + 1).padStart(3, '0')}`));
  assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM evaluation_attempts').get()?.count), 40);
  database.close();
});

test('existing live ASC IDs are skipped and never overwritten', async () => {
  const { database, db } = createDb();
  const insert = database.prepare('INSERT INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)');
  insert.run('live:ASC001', 'ASC001', 'legacy-1', 'before', 'before');
  insert.run('live:ASC004', 'ASC004', 'legacy-4', 'before', 'before');
  insert.run('live:ASC9007199254740992', 'ASC9007199254740992', 'legacy-oversized', 'before', 'before');
  database.prepare('INSERT INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)').run('qa:QA001', 'QA001', 'qa-hash', 'before', 'before');

  const generated = await registerNextParticipant(db, 'new-session-hash', '2026-11-10T00:00:00.000Z');

  assert.equal(generated, 'ASC005');
  assert.equal(database.prepare('SELECT access_hash FROM evaluation_attempts WHERE key = ?').get('live:ASC001')?.access_hash, 'legacy-1');
  assert.equal(database.prepare('SELECT access_hash FROM evaluation_attempts WHERE key = ?').get('live:ASC004')?.access_hash, 'legacy-4');
  assert.equal(database.prepare('SELECT access_hash FROM evaluation_attempts WHERE key = ?').get('live:ASC9007199254740992')?.access_hash, 'legacy-oversized');
  assert.equal(database.prepare('SELECT is_qa FROM evaluation_attempts WHERE key = ?').get('qa:QA001')?.is_qa, 1);
  database.close();
});

test('oversized legacy IDs do not move the automatic sequence', async () => {
  const { database, db } = createDb();
  const insert = database.prepare('INSERT INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)');
  insert.run('live:ASC9007199254740992', 'ASC9007199254740992', 'legacy-beyond-safe-integer', 'before', 'before');
  insert.run('live:ASC99999999999999999', 'ASC99999999999999999', 'legacy-too-long', 'before', 'before');

  assert.equal(await registerNextParticipant(db, 'new-session-hash', '2026-11-10T00:00:00.000Z'), 'ASC001');
  database.close();
});

test('only canonical ASC identifiers affect the sequence maximum', async () => {
  const { database, db } = createDb();
  database.prepare('INSERT INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)').run('live:ABC004', 'ABC004', 'legacy-other-prefix', 'before', 'before');

  assert.equal(await registerNextParticipant(db, 'new-session-hash', '2026-11-10T00:00:00.000Z'), 'ASC001');
  database.close();
});

test('the allocator fails closed at the safe integer limit', async () => {
  const { database, db } = createDb();
  const id = 'ASC9007199254740991';
  database.prepare('INSERT INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, 0, ?, ?, ?)').run(`live:${id}`, id, 'legacy-max', 'before', 'before');

  await assert.rejects(() => registerNextParticipant(db, 'new-session-hash', '2026-11-10T00:00:00.000Z'), /sequence is exhausted/);
  assert.equal(Number(database.prepare('SELECT COUNT(*) AS count FROM evaluation_attempts').get()?.count), 1);
  database.close();
});

test('automatically allocated IDs start ASC001 when no live IDs exist', async () => {
  const { database, db } = createDb();
  database.prepare('INSERT INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, 1, ?, ?, ?)').run('qa:QA001', 'QA001', 'qa-hash', 'before', 'before');

  assert.equal(await registerNextParticipant(db, 'new-session-hash', '2026-11-10T00:00:00.000Z'), 'ASC001');
  database.close();
});

test('manual live IDs are rejected only for new registration, preserving QA and sessions', () => {
  assert.equal(isManualLiveRegistration('register', false, 'ASC99999999999999999'), true);
  assert.equal(isManualLiveRegistration('register', false, undefined), false);
  assert.equal(isManualLiveRegistration('register', true, 'QA001'), false);
  assert.equal(isManualLiveRegistration('state', false, 'ASC001'), false);
});
