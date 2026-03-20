// ── Input sanitization ───────────────────────────────────────────────────────
// Strips null bytes, ASCII control characters, and common SQL/NoSQL injection
// patterns before values reach the Wikipedia API.  Applied to every
// user-supplied query and title parameter.  This addresses the two risk
// patterns flagged by the security scanner:
//   • search_wikipedia            → query param
//   • summarize_article_for_query → query param
// All other title/topic params are sanitized for consistency.

export const SQL_INJECTION_RE =
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|TRUNCATE|REPLACE|MERGE)\b|--|;|\/\*|\*\/|xp_|0x[0-9a-fA-F]+)/gi;

export function sanitizeInput(value: unknown, maxLength = 500): string {
  if (typeof value !== 'string') return '';
  return value
    .replace(/\0/g, '')                                        // null bytes
    .replace(/[\x01-\x08\x0b\x0c\x0e-\x1f\x7f]/g, '')        // control chars
    .replace(SQL_INJECTION_RE, '')                             // injection keywords
    .trim()
    .substring(0, maxLength);
}

export function sanitizeTitle(value: unknown): string { return sanitizeInput(value, 300); }
export function sanitizeQuery(value: unknown): string { return sanitizeInput(value, 500); }
