// POST /api/hit — records one aggregate counter increment.
// Body (text/plain JSON via navigator.sendBeacon):
//   { e: 'pv' | 'buy', p: '/path', s?: 'slug', r?: 'referrer-host'|'direct'|'internal', d?: 'payhip.com'|'amazon.com'|'audible.com', u?: 'utm_source' }
// Nothing identifying is stored: no cookies, no IP, no user agent, no visitor/session id.
import { getStore } from '@netlify/blobs';
import { STORE_NAME, MAX_KEYS_PER_DAY, dayKey, envName, json } from '../lib/analytics-shared.mjs';

export const config = { path: '/api/hit' };

const BOT_RE = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|embedly|curl|wget|python|httpclient|monitor/i;
const DESTS = new Set(['payhip.com', 'amazon.com', 'audible.com']);

function clean(v, re, max) {
  if (typeof v !== 'string') return '';
  v = v.trim().toLowerCase().slice(0, max);
  return re.test(v) ? v : '';
}
function cleanPath(p) {
  if (typeof p !== 'string') return '';
  p = p.split(/[?#]/)[0].slice(0, 80);
  if (!/^\/[A-Za-z0-9._\-\/]*$/.test(p)) return '';
  if (p === '/index.html' || p === '/index') p = '/';
  return p;
}

export default async (req, context) => {
  if (req.method !== 'POST') return json({ ok: false, error: 'POST only' }, 405, { allow: 'POST' });
  // Respect Do Not Track / Global Privacy Control at the server too.
  if (req.headers.get('dnt') === '1' || req.headers.get('sec-gpc') === '1') return new Response(null, { status: 204 });
  // UA is read only to drop bots; it is never stored.
  if (BOT_RE.test(req.headers.get('user-agent') || '')) return new Response(null, { status: 204 });

  let body;
  try {
    const text = (await req.text()).slice(0, 2048);
    body = JSON.parse(text);
  } catch { return json({ ok: false, error: 'bad body' }, 400); }

  const e = body.e === 'pv' ? 'pageview' : body.e === 'buy' ? 'buy_click' : '';
  const p = cleanPath(body.p);
  if (!e || !p) return json({ ok: false, error: 'bad event' }, 400);
  const s = clean(body.s, /^[a-z0-9-]{1,80}$/, 80);
  let r = clean(body.r, /^[a-z0-9.-]{1,80}$/, 80) || 'direct';
  r = r.replace(/^www\./, '');
  let d = '';
  if (e === 'buy_click') {
    d = clean(body.d, /^[a-z0-9.-]{1,80}$/, 80).replace(/^www\./, '');
    if (!DESTS.has(d)) d = 'other';
  }
  const u = clean(body.u, /^[a-z0-9._-]{1,40}$/, 40);

  const counterKey = [e, p, s, r, d, u].join('|');
  const store = getStore({ name: STORE_NAME, consistency: 'strong' });
  const key = `${envName(context)}/${dayKey()}`;

  // Optimistic concurrency: read + conditional write, retry on conflict.
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await store.getWithMetadata(key, { type: 'json' });
    const data = (cur && cur.data) || { v: 1, counts: {} };
    const k = (counterKey in data.counts || Object.keys(data.counts).length < MAX_KEYS_PER_DAY)
      ? counterKey : [e, '(overflow)', '', '', d, ''].join('|');
    data.counts[k] = (data.counts[k] || 0) + 1;
    // Conditional write when the store gives us an ETag (Netlify production does); plain write otherwise.
    const opts = cur ? (cur.etag ? { onlyIfMatch: cur.etag } : {}) : { onlyIfNew: true };
    const res = await store.setJSON(key, data, opts);
    if (!res || res.modified !== false) return new Response(null, { status: 204 });
    await new Promise((ok) => setTimeout(ok, 20 + Math.random() * 60));
  }
  return json({ ok: false, error: 'busy' }, 503);
};
