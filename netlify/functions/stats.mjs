// GET /api/stats?from=YYYY-MM-DD&to=YYYY-MM-DD[&env=production|preview]
// Returns aggregate counts only (pageviews and Buy clicks by day, page, referrer host, slug, destination).
// No personal data exists in the store, so this is safe to read without a login.
// Optional gate: if the STATS_TOKEN environment variable is ever set in Netlify, ?token=<value> is required.
import { getStore } from '@netlify/blobs';
import { STORE_NAME, dayKey, envName, json } from '../lib/analytics-shared.mjs';

export const config = { path: '/api/stats' };

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
function addDays(ymd, n) {
  const d = new Date(ymd + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function bump(obj, k, n) { if (k) obj[k] = (obj[k] || 0) + n; }
function sortObj(o) { return Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1])); }

export default async (req, context) => {
  const url = new URL(req.url);
  const token = process.env.STATS_TOKEN;
  if (token && url.searchParams.get('token') !== token) return json({ ok: false, error: 'token required' }, 401);

  const today = dayKey();
  let to = url.searchParams.get('to') || today;
  let from = url.searchParams.get('from') || addDays(to, -29);
  if (!DAY_RE.test(from) || !DAY_RE.test(to) || from > to) return json({ ok: false, error: 'use from/to as YYYY-MM-DD' }, 400);
  if (addDays(from, 366) < to) return json({ ok: false, error: 'max range 366 days' }, 400);
  const env = ['production', 'preview'].includes(url.searchParams.get('env')) ? url.searchParams.get('env') : envName(context);

  const store = getStore({ name: STORE_NAME });
  const days = [];
  const totals = { pageviews: 0, buy_clicks: 0 };
  const pv_by_path = {}, pv_by_slug = {}, pv_by_referrer = {}, pv_by_utm_source = {};
  const buy_by_slug = {}, buy_by_destination = {}, buy_by_page = {}, buy_by_slug_destination = {};

  for (let d = from; d <= to; d = addDays(d, 1)) {
    const day = { date: d, pageviews: 0, buy_clicks: 0 };
    const counts = {};
    const prefix = `${env}/${d}/`;
    for await (const page of store.list({ prefix, paginate: true })) {
      for (const b of page.blobs) {
        // key = <prefix><bucket>/<random>; bucket may come back URL-encoded or decoded, so split on the LAST '/'.
        const rest = b.key.slice(prefix.length);
        const cut = rest.lastIndexOf('/');
        let bucket = cut > 0 ? rest.slice(0, cut) : rest;
        try { bucket = decodeURIComponent(bucket); } catch {}
        counts[bucket] = (counts[bucket] || 0) + 1;
      }
    }
    for (const [k, n] of Object.entries(counts)) {
      const [e, p, s, r, dest, u] = k.split('|');
      if (e === 'pageview') {
        day.pageviews += n; bump(pv_by_path, p, n); bump(pv_by_slug, s, n); bump(pv_by_referrer, r, n); bump(pv_by_utm_source, u, n);
      } else if (e === 'buy_click') {
        day.buy_clicks += n; bump(buy_by_slug, s || '(none)', n); bump(buy_by_destination, dest, n); bump(buy_by_page, p, n);
        bump(buy_by_slug_destination, `${s || '(none)'} -> ${dest}`, n);
      }
    }
    totals.pageviews += day.pageviews; totals.buy_clicks += day.buy_clicks;
    days.push(day);
  }

  return json({
    ok: true, env, from, to, timezone: 'America/Los_Angeles',
    note: 'Aggregate counts only. No cookies, IPs, user agents or visitor IDs are collected. Bots and DNT/GPC visitors are not counted.',
    totals,
    pageviews: { by_path: sortObj(pv_by_path), by_slug: sortObj(pv_by_slug), by_referrer: sortObj(pv_by_referrer), by_utm_source: sortObj(pv_by_utm_source) },
    buy_clicks: { by_slug: sortObj(buy_by_slug), by_destination: sortObj(buy_by_destination), by_page: sortObj(buy_by_page), by_slug_destination: sortObj(buy_by_slug_destination) },
    days,
  });
};
