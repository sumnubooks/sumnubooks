/* SumnuBooks cookie-free analytics (aggregate counts only).
 * - One pageview beacon per page load and one beacon per outbound Buy click (Payhip / Amazon / Audible).
 * - No cookies, no localStorage/sessionStorage, no visitor or session IDs, no fingerprinting.
 * - Sends only: event type, page path, book slug, referrer HOST, Buy destination host, incoming utm_source.
 * - Skipped entirely when Do Not Track or Global Privacy Control is on, and for automated browsers.
 * - Safety net: any outbound Buy link that is missing UTM tags gets
 *   utm_source=sumnubooks&utm_medium=site&utm_campaign=<slug> added right before it is followed.
 * Endpoint: /api/hit (netlify/functions/hit.mjs). Read the data at /api/stats.
 */
(function () {
  'use strict';
  if (window.__sumnuAnalytics) return;
  window.__sumnuAnalytics = true;

  var BUY_HOST_RE = /(^|\.)(payhip\.com|amazon\.com|audible\.com)$/i;
  var SLUG_RE = /^[a-z0-9-]{1,80}$/;
  var nav = window.navigator || {};
  var optedOut = nav.doNotTrack === '1' || window.doNotTrack === '1' || nav.msDoNotTrack === '1' || nav.globalPrivacyControl === true;
  var automated = nav.webdriver === true;

  function send(payload) {
    if (optedOut || automated) return;
    try {
      var body = JSON.stringify(payload);
      if (nav.sendBeacon && nav.sendBeacon('/api/hit', body)) return;
      if (window.fetch) fetch('/api/hit', { method: 'POST', body: body, keepalive: true, credentials: 'omit' }).catch(function () {});
    } catch (e) {}
  }

  function pageSlug() {
    try {
      var q = new URLSearchParams(location.search);
      var s = (q.get('slug') || q.get('play') || q.get('series') || '').toLowerCase();
      return SLUG_RE.test(s) ? s : '';
    } catch (e) { return ''; }
  }

  function refHost() {
    try {
      if (!document.referrer) return 'direct';
      var h = new URL(document.referrer).hostname.toLowerCase();
      return h === location.hostname.toLowerCase() ? 'internal' : h;
    } catch (e) { return 'direct'; }
  }

  function utmSource() {
    try {
      var u = (new URLSearchParams(location.search).get('utm_source') || '').toLowerCase();
      return /^[a-z0-9._-]{1,40}$/.test(u) ? u : '';
    } catch (e) { return ''; }
  }

  function contextSlug(a) {
    var el = a.closest && a.closest('[data-slug],[data-share-slug],article[id]');
    var s = el ? (el.getAttribute('data-slug') || el.getAttribute('data-share-slug') || el.id || '') : '';
    s = s.toLowerCase();
    return SLUG_RE.test(s) ? s : (pageSlug() || 'sitewide');
  }

  function buyUrl(a) {
    var href = a.getAttribute && a.getAttribute('href');
    if (!href || !/^https?:/i.test(href)) return null;
    try {
      var u = new URL(href);
      return BUY_HOST_RE.test(u.hostname) ? u : null;
    } catch (e) { return null; }
  }

  // Add UTM tags if a Buy link somehow lacks them (all static links are already tagged in the HTML/JS data).
  function ensureUtm(a, u) {
    if (u.searchParams.get('utm_source')) return u;
    u.searchParams.set('utm_source', 'sumnubooks');
    u.searchParams.set('utm_medium', 'site');
    u.searchParams.set('utm_campaign', contextSlug(a));
    a.setAttribute('href', u.toString());
    return u;
  }

  function onClick(ev) {
    if (ev.type === 'auxclick' && ev.button !== 1) return;
    var t = ev.target;
    var a = t && t.closest ? t.closest('a[href]') : null;
    if (!a) return;
    var u = buyUrl(a);
    if (!u) return;
    u = ensureUtm(a, u);
    var slug = (u.searchParams.get('utm_campaign') || '').toLowerCase();
    send({
      e: 'buy',
      p: location.pathname,
      s: SLUG_RE.test(slug) ? slug : '',
      d: u.hostname.toLowerCase().replace(/^www\./, '').replace(/^.*\.(payhip\.com|amazon\.com|audible\.com)$/, '$1'),
      r: refHost(),
    });
  }

  document.addEventListener('click', onClick, true);
  document.addEventListener('auxclick', onClick, true);

  send({ e: 'pv', p: location.pathname, s: pageSlug(), r: refHost(), u: utmSource() });
})();
