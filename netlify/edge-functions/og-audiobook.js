/*
 * og-audiobook — server-side link-preview meta for the audiobook player.
 *
 * Link crawlers (Facebook, X, iMessage, WhatsApp, Slack …) don't run JS, so
 * per-book <title>, description, canonical, Open Graph and Twitter tags are
 * written into the <head> here:
 *   /audiobook.html?slug=<slug>  (and /audiobook)   -> that book; unknown slug -> default meta
 *   /?play=<slug>  (and /index.html)                 -> that book (og:url/canonical = player URL);
 *                                                      plain / is left untouched
 *   /audiobooks.html?slug=<slug> (and /audiobooks)   -> 302 to the player for that slug
 *
 * IMPORTANT: facebookexternalhit sends "Range: bytes=0-524287". A Range (or
 * conditional) request makes the static file come back as 206/304, which we
 * can't rewrite — Facebook then saw the static default tags. So Range and
 * conditional headers are dropped before fetching the page, and the
 * rewritten page is always a full 200 (ignoring Range is valid HTTP).
 *
 * Keep BOOKS in sync with audiobookData in audiobook.html (title, tagline, cover).
 */
const SITE = 'https://sumnubooks.com';

const BOOKS = {
  'a-penny-for-my-thoughts': { title: 'A Penny For My Thoughts', tagline: "He took her. He didn't expect to care.", cover: 'images/covers-square/a-penny-for-my-thoughts.jpg?v=20260929', w: 1000, h: 1000 },
  'unplugged': { title: 'Unplugged: 30 Days of Chaos', tagline: 'No cell service. No WiFi. Only chaos.', cover: 'images/covers-square/unplugged.jpg?v=20260929', w: 576, h: 576 },
  'chandra': { title: 'Chandra: Forbidden Obsession', tagline: "She survived the streets. It's what she knows that will get her killed.", cover: 'images/covers-square/chandra.jpg?v=20260929', w: 1000, h: 1000, comingSoon: true },
  'the-jailhouse-lawyer': { title: 'The Jailhouse Lawyer', tagline: 'Inside the walls, knowledge is power.', cover: 'images/covers-square/the-jailhouse-lawyer.jpg?v=20260928b', w: 1000, h: 1000 },
  'still-standing': { title: 'Still Standing', tagline: 'Before the empire... there was the beginning.', cover: 'images/covers-square/still-standing.jpg?v=20260929', w: 1000, h: 1000 },
  'the-echo': { title: 'The Echo', tagline: 'Power awakens. Pressure builds. The complete Echo origin story, now as a full audiobook.', cover: 'images/covers-square/the-echo-origins.jpg?v=20260929', w: 1000, h: 1000 },
  'the-clock': { title: 'The Clock', tagline: 'When the numbers disappear, you have seven days.', cover: 'images/covers-square/the-clock.jpg?v=20260929', w: 1000, h: 1000 },
  'she-still-exists': { title: 'She Still Exists', tagline: "He built a world for the woman he lost — and inside it, she's helping him find her killer without knowing she's dead.", cover: 'images/covers-square/she-still-exists.jpg?v=20260929', w: 1000, h: 1000 },
};

const DEFAULT_META = {
  title: 'Audiobooks by E.D. Lewis · Sumnu Books',
  description: 'Listen to free sample chapters of audiobooks by E.D. Lewis on SumnuBooks.',
  image: `${SITE}/images/logos/sumnu-books-logo.png?v=20260929`,
  w: 640, h: 640,
  alt: 'Sumnu Books logo',
  url: `${SITE}/audiobooks.html`,
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function metaFor(slug) {
  const b = Object.prototype.hasOwnProperty.call(BOOKS, slug) ? BOOKS[slug] : null;
  if (!b) return { slug: null, ...DEFAULT_META };
  return {
    slug,
    title: b.comingSoon ? `${b.title} · Audiobook coming soon · Sumnu Books` : `${b.title} · Audiobook by E.D. Lewis · Sumnu Books`,
    ogTitle: b.comingSoon ? `${b.title} — Audiobook coming soon` : `${b.title} — Listen free`,
    description: b.tagline,
    image: `${SITE}/${b.cover}`,
    w: b.w, h: b.h,
    alt: `${b.title} audiobook cover`,
    url: `${SITE}/audiobook.html?slug=${encodeURIComponent(slug)}`,
  };
}

function headTags(m) {
  const t = m.ogTitle || m.title;
  return [
    `<link rel="canonical" href="${esc(m.url)}">`,
    `<meta property="og:site_name" content="Sumnu Books">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(t)}">`,
    `<meta property="og:description" content="${esc(m.description)}">`,
    `<meta property="og:url" content="${esc(m.url)}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    `<meta property="og:image:secure_url" content="${esc(m.image)}">`,
    `<meta property="og:image:type" content="${m.image.includes('.png') ? 'image/png' : 'image/jpeg'}">`,
    `<meta property="og:image:width" content="${m.w}">`,
    `<meta property="og:image:height" content="${m.h}">`,
    `<meta property="og:image:alt" content="${esc(m.alt)}">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${esc(t)}">`,
    `<meta name="twitter:description" content="${esc(m.description)}">`,
    `<meta name="twitter:image" content="${esc(m.image)}">`,
    `<meta name="twitter:image:alt" content="${esc(m.alt)}">`,
  ].join('\n  ');
}

const has = (o, k) => !!k && Object.prototype.hasOwnProperty.call(o, k);
const STRIP_REQ = ['range', 'if-range', 'if-none-match', 'if-modified-since', 'if-match', 'if-unmodified-since'];

export default async (request, context) => {
  const url = new URL(request.url);
  const p = (url.pathname.replace(/\/+$/, '') || '/').toLowerCase();

  // List page with ?slug= -> that book's player (keeps utm etc.).
  if (p === '/audiobooks.html' || p === '/audiobooks') {
    const s = url.searchParams.get('slug');
    if (!has(BOOKS, s)) return; // untouched
    const to = new URL('/audiobook.html', url.origin);
    url.searchParams.forEach((v, k) => to.searchParams.append(k, v));
    return new Response(null, { status: 302, headers: { location: to.toString(), 'cache-control': 'public, max-age=0, must-revalidate', 'x-sumnu-og': 'redirect:' + s } });
  }

  let slug;
  if (p === '/' || p === '/index.html' || p === '/index') {
    slug = url.searchParams.get('play');
    if (!has(BOOKS, slug)) return; // plain home keeps its own meta, untouched
  } else {
    slug = url.searchParams.get('slug') || '';
  }

  // Always fetch the full page (see note above about Facebook's Range header).
  const fwd = new Headers(request.headers);
  STRIP_REQ.forEach((h) => fwd.delete(h));
  const res = await context.next(new Request(request, { headers: fwd }));

  const type = res.headers.get('content-type') || '';
  if (res.status !== 200 || !type.includes('text/html')) return res;
  const m = metaFor(slug);

  const headers = new Headers(res.headers);
  ['content-length', 'etag', 'last-modified', 'accept-ranges', 'content-range'].forEach((h) => headers.delete(h));
  headers.set('x-sumnu-og', m.slug || 'default');
  if (request.method === 'HEAD') return new Response(null, { status: 200, headers });

  let html = await res.text();
  // Drop any static OG/Twitter/canonical tags (all of them) so there is exactly one set.
  html = html.replace(/\s*<meta\s+(?:property|name)=["'](?:og:|twitter:)[^>]*>/gi, '')
             .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(m.title)}</title>`);
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/gi, '')
               .replace(/<\/title>/i, `</title>\n  <meta name="description" content="${esc(m.description)}">\n  ${headTags(m)}`);
  } else {
    html = html.replace(/<\/title>/i, `</title>\n  <meta name="description" content="${esc(m.description)}">\n  ${headTags(m)}`);
  }
  return new Response(html, { status: 200, headers });
};
