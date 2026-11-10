// Server-side helpers; do not import this module into browser bundles.
export function participantKey(raw: unknown, qa: boolean): { id: string; key: string } | null {
  if (typeof raw !== 'string') return null;
  const id = raw.trim().toUpperCase();
  if (!/^[A-Z][A-Z0-9_-]{2,31}$/.test(id)) return null;
  if (qa !== /^QA[0-9]+$/.test(id)) return null;
  return { id, key: `${qa ? 'qa' : 'live'}:${id}` };
}

export function isAuthorizedAdmin(identityEmail: string | null, adminEmail: string | undefined): boolean {
  return !!identityEmail && !!adminEmail && identityEmail.trim().toLowerCase() === adminEmail.trim().toLowerCase();
}

export function scoreAnswers(answers: unknown, answerKey: readonly number[]): number | null {
  if (!Array.isArray(answers) || answers.length !== answerKey.length) return null;
  if (!answers.every((n) => Number.isInteger(n) && n >= 0 && n <= 2)) return null;
  return answers.reduce((sum, answer, index) => sum + (answer === answerKey[index] ? 1 : 0), 0);
}

export function csvCell(value: unknown): string {
  let text = value == null ? '' : String(value);
  if (/^[\s\u0000-\u001f]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function hashAccessToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return Array.from(new Uint8Array(bytes), (n) => n.toString(16).padStart(2, '0')).join('');
}
