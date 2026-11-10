import { env } from 'cloudflare:workers';
import { preQuestions, postQuestions } from '../../../lib/evaluation-questions';
import { participantKey, hashAccessToken, scoreAnswers } from '../../../lib/evaluation-policy';
import { isManualLiveRegistration, registerNextParticipant } from '../../../lib/evaluation-id';

export const dynamic = 'force-dynamic';
type Row = { key: string; participant_id: string; is_qa: number; access_hash: string; pre_score: number | null; post_score: number | null; lessons: string; feedback: string | null; version: number };
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
const publicQuestions = (items: typeof preQuestions) => items.map(({ prompt, options }) => ({ prompt, options }));
const view = (row: Row) => ({ id: row.participant_id, qa: !!row.is_qa, preScore: row.pre_score, postScore: row.post_score, lessons: JSON.parse(row.lessons), feedbackDone: row.feedback !== null, version: row.version });

export async function POST(request: Request) {
  if (!env.DB) return reply({ error: 'Lưu trữ chưa sẵn sàng.' }, 503);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return reply({ error: 'Yêu cầu không hợp lệ.' }, 415);
  if (Number(request.headers.get('content-length') || 0) > 12000) return reply({ error: 'Dữ liệu quá dài.' }, 413);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return reply({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  let body: Record<string, unknown>;
  try { const raw = await request.text(); if (raw.length > 12000) return reply({ error: 'Dữ liệu quá dài.' }, 413); body = JSON.parse(raw); if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error(); } catch { return reply({ error: 'Dữ liệu không hợp lệ.' }, 400); }
  const qa = body.qa === true;
  if (isManualLiveRegistration(body.action, qa, body.id)) return reply({ error: 'Mã tham gia được cấp tự động; hãy bỏ mã khỏi yêu cầu.' }, 400);
  const autoId = body.action === 'register' && !qa;
  const participant = autoId ? null : participantKey(body.id, qa);
  if (!participant && !autoId) return reply({ error: 'Mã không hợp lệ. Mã QA chỉ dùng trong chế độ thử nghiệm.' }, 400);
  const db = env.DB;
  if (body.action === 'register') {
    if (body.consent !== true) return reply({ error: 'Cần xác nhận đồng ý tham gia.' }, 400);
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    const token = Array.from(bytes, n => n.toString(16).padStart(2, '0')).join('');
    const hash = await hashAccessToken(token);
    const now = new Date().toISOString();
    try {
      if (autoId) {
        const id = await registerNextParticipant(db, hash, now);
        if (!id) return reply({ error: 'Không thể cấp mã tham gia lúc này; hãy thử lại.' }, 503);
        return reply({ id, qa: false, token, questions: publicQuestions(preQuestions) }, 201);
      }
      const created = await db.prepare('INSERT OR IGNORE INTO evaluation_attempts (key, participant_id, is_qa, access_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)').bind(participant!.key, participant!.id, qa ? 1 : 0, hash, now, now).run();
      if (created.meta.changes !== 1) return reply({ error: 'Mã đã được dùng; hãy dùng mã truy cập đã lưu hoặc chọn mã khác.' }, 409);
      return reply({ id: participant!.id, qa, token, questions: publicQuestions(preQuestions) }, 201);
    } catch {
      return reply({ error: 'Lưu trữ tạm thời không sẵn sàng; hãy thử lại.' }, 503);
    }
  }
  const token = typeof body.token === 'string' ? body.token : '';
  if (!/^[a-f0-9]{64}$/.test(token)) return reply({ error: 'Mã truy cập không hợp lệ.' }, 403);
  const row = await db.prepare('SELECT key, participant_id, is_qa, access_hash, pre_score, post_score, lessons, feedback, version FROM evaluation_attempts WHERE key = ?').bind(participant!.key).first<Row>();
  if (!row || row.access_hash !== await hashAccessToken(token)) return reply({ error: 'Mã tham gia hoặc mã truy cập không đúng.' }, 403);
  if (body.action === 'state') return reply({ attempt: view(row), questions: row.pre_score === null ? publicQuestions(preQuestions) : row.post_score === null && JSON.parse(row.lessons).length === 3 ? publicQuestions(postQuestions) : [] });
  let sql = ''; let values: unknown[] = [];
  if (body.action === 'pre') {
    const score = scoreAnswers(body.answers, preQuestions.map(q => q.correct));
    if (score === null || row.pre_score !== null) return reply({ error: 'Pre-test chưa hợp lệ hoặc đã được nộp.' }, 409);
    sql = 'UPDATE evaluation_attempts SET pre_answers = ?, pre_score = ?, updated_at = ?, version = version + 1 WHERE key = ? AND version = ? AND pre_score IS NULL';
    values = [JSON.stringify(body.answers), score];
  } else if (body.action === 'lesson') {
    if (row.pre_score === null || row.post_score !== null || !Number.isInteger(body.lesson) || Number(body.lesson) < 1 || Number(body.lesson) > 3) return reply({ error: 'Không thể ghi nhận bài học.' }, 409);
    const lessons = [...new Set([...JSON.parse(row.lessons), Number(body.lesson)])].sort();
    sql = 'UPDATE evaluation_attempts SET lessons = ?, updated_at = ?, version = version + 1 WHERE key = ? AND version = ? AND post_score IS NULL';
    values = [JSON.stringify(lessons)];
  } else if (body.action === 'post') {
    const score = scoreAnswers(body.answers, postQuestions.map(q => q.correct));
    if (score === null || row.pre_score === null || row.post_score !== null || JSON.parse(row.lessons).length !== 3) return reply({ error: 'Cần hoàn thành pre-test và ba bài học trước post-test.' }, 409);
    sql = 'UPDATE evaluation_attempts SET post_answers = ?, post_score = ?, updated_at = ?, version = version + 1 WHERE key = ? AND version = ? AND post_score IS NULL';
    values = [JSON.stringify(body.answers), score];
  } else if (body.action === 'feedback') {
    if (row.post_score === null || row.feedback !== null || !Number.isInteger(body.rating) || Number(body.rating) < 1 || Number(body.rating) > 5 || typeof body.comment !== 'string' || body.comment.length > 500) return reply({ error: 'Feedback không hợp lệ hoặc đã được gửi.' }, 409);
    sql = 'UPDATE evaluation_attempts SET feedback = ?, updated_at = ?, version = version + 1 WHERE key = ? AND version = ? AND feedback IS NULL';
    values = [JSON.stringify({ rating: body.rating, comment: body.comment.trim() })];
  } else return reply({ error: 'Thao tác không hợp lệ.' }, 400);
  const result = await db.prepare(sql).bind(...values, new Date().toISOString(), participant!.key, row.version).run();
  if (result.meta.changes !== 1) return reply({ error: 'Dữ liệu vừa thay đổi ở nơi khác; hãy tải lại.' }, 409);
  const updated = await db.prepare('SELECT key, participant_id, is_qa, access_hash, pre_score, post_score, lessons, feedback, version FROM evaluation_attempts WHERE key = ?').bind(participant!.key).first<Row>();
  return reply({ attempt: view(updated!) });
}
