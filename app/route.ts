import home from '../lib/site-home';
export const dynamic = 'force-dynamic';
export function GET() { return new Response(home, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' } }); }
