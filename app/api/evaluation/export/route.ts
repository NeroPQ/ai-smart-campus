import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { csvCell, isAuthorizedAdmin } from '../../../../lib/evaluation-policy';

export const dynamic = 'force-dynamic';
type ExportRow = { participant_id: string; pre_score: number | null; post_score: number | null; feedback: string | null; created_at: string; updated_at: string };
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const configured = (env as unknown as { ADMIN_EMAIL?: string }).ADMIN_EMAIL;
  if (!user || !isAuthorizedAdmin(user.email, configured)) return new Response('Không có quyền xuất dữ liệu.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  if (!env.DB) return new Response('Lưu trữ chưa sẵn sàng.', { status: 503 });
  const qa = new URL(request.url).searchParams.get('qa') === '1';
  const results = await env.DB.prepare('SELECT participant_id, pre_score, post_score, feedback, created_at, updated_at FROM evaluation_attempts WHERE is_qa = ? ORDER BY created_at LIMIT 5001').bind(qa ? 1 : 0).all<ExportRow>();
  if (results.results.length > 5000) return new Response('Dữ liệu vượt giới hạn xuất; cần phân trang.', { status: 413 });
  const rows = [['Participant ID','Pre-test','Post-test','Improvement','Rating','Feedback','Created UTC','Updated UTC'].map(csvCell).join(',')];
  for (const row of results.results) {
    let feedback: { rating?: number; comment?: string } = {};
    try { feedback = row.feedback ? JSON.parse(row.feedback) : {}; } catch { /* leave malformed feedback blank */ }
    const delta = row.pre_score === null || row.post_score === null ? '' : String(row.post_score - row.pre_score);
    rows.push([csvCell(row.participant_id), row.pre_score ?? '', row.post_score ?? '', delta, feedback.rating ?? '', csvCell(feedback.comment ?? ''), csvCell(row.created_at), csvCell(row.updated_at)].join(','));
  }
  return new Response('\ufeff' + rows.join('\r\n') + '\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${qa ? 'QA-TEST' : 'participants'}-evaluation.csv"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
}
