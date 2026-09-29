/*
 * og-audiobook — server-side link-preview meta for the audiobook player.
 *
 * Link crawlers (Facebook, X, iMessage, WhatsApp, Slack …) don't run JS, so
 * audiobook.html?slug=<slug> gets real per-book <title>, description,
 * Open Graph and Twitter tags written into its <head> here.
 * Unknown / missing slug => default site meta. Only touches GET 200 HTML;
 * everything else (HEAD, 304, errors) passes through untouched.
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

export default async (request, context) => {
  const res = await context.next();
  if (request.method !== 'GET' || res.status !== 200) return res;
  const type = res.headers.get('content-type') || '';
  if (!type.includes('text/html')) return res;

  const slug = new URL(request.url).searchParams.get('slug') || '';
  const m = metaFor(slug);
  let html = await res.text();

  // Drop any static OG/Twitter/canonical tags so there is exactly one set.
  html = html.replace(/\s*<meta\s+(?:property|name)=["'](?:og:|twitter:)[^>]*>/gi, '')
             .replace(/\s*<link\s+rel=["']canonical["'][^>]*>/gi, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(m.title)}</title>`);
  if (/<meta\s+name=["']description["'][^>]*>/i.test(html)) {
    html = html.replace(/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${esc(m.description)}">\n  ${headTags(m)}`);
  } else {
    html = html.replace(/<\/head>/i, `  <meta name="description" content="${esc(m.description)}">\n  ${headTags(m)}\n</head>`);
  }

  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag'); // body now differs per slug; let the browser revalidate normally
  headers.set('x-sumnu-og', m.slug || 'default');
  return new Response(html, { status: 200, headers });
};
