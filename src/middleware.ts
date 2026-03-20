import rateLimit from 'express-rate-limit';

// ── Rate limiting ────────────────────────────────────────────────────────────
// LLMs can burst heavily in short windows, so limits are generous per-minute
// but protect against sustained abuse.  Three tiers:
//
//   globalLimiter  — catches everything; 120 req/min is comfortable for a
//                    single LLM session.
//   mcpLimiter     — tighter cap on /mcp because each call may fan out to up
//                    to 20 parallel Wikipedia requests (multi_search_wikipedia).
//   searchLimiter  — REST /search/* is lightweight but most prone to hammering.
//
// All limiters use standard RateLimit-* response headers (RFC 6585 draft-7)
// so clients can back off gracefully.

export const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please wait before sending more requests.',
    retryAfter: 60
  }
});

export const mcpLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many MCP requests',
    message: 'MCP rate limit exceeded. Please wait before sending more tool calls.',
    retryAfter: 60
  }
});

export const searchLimiter = rateLimit({
  windowMs: 60_000,
  max: 90,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many search requests',
    message: 'Search rate limit exceeded. Please wait before sending more requests.',
    retryAfter: 60
  }
});
