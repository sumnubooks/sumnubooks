// Shared helpers for /api/hit and /api/stats (cookie-free aggregate analytics).
// Stores ONLY aggregate buckets per day (event|path|slug|referrer host|dest host|utm_source). No cookies, IPs, user agents, or visitor IDs are stored.
export const STORE_NAME = 'site-analytics';
export const TZ = 'America/Los_Angeles';

export function dayKey(date = new Date()) {
  // YYYY-MM-DD in Pacific time (the owner's zone)
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}

// Deploy context namespace so deploy-preview / branch traffic never mixes with production.
export function envName(context) {
  const c = (context && context.deploy && context.deploy.context) || process.env.CONTEXT || 'production';
  return c === 'production' ? 'production' : 'preview';
}

export function json(body, status = 200, extra = {}) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex', ...extra },
  });
}
