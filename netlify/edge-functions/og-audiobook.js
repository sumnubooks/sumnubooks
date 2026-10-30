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
 *   /listen/<slug>  (the URL every Share button shares; fresh path so Facebook
 *                    has no stale cache for it)
 *        link-preview crawlers  -> 200 tiny page with that book's meta (og:url = itself)
 *        everyone else          -> 302 to /audiobook.html?slug=<slug>&utm_source=share&utm_medium=social&utm_campaign=<slug>
 *                                  (incl. the Facebook in-app browser and search engines)
 *        unknown slug           -> 302 to /audiobooks.html
 *        audio series (SERIES)  -> same, but people go to /series.html?slug=<slug>&utm_…
 *        short alias (ALIASES)  -> treated as its canonical slug (og:url = canonical /listen URL);
 *                                  people get utm_content=<alias> on the 302
 *   og:url on every page for a book is https://sumnubooks.com/listen/<slug>; canonical
 *   stays the real player URL (audiobook.html?slug=) for search engines.
 *
 * IMPORTANT: facebookexternalhit sends "Range: bytes=0-524287". A Range (or
 * conditional) request makes the static file come back as 206/304, which we
 * can't rewrite — Facebook then saw the static default tags. So Range and
 * conditional headers are dropped before fetching the page, and the
 * rewritten page is always a full 200 (ignoring Range is valid HTTP).
 *
 * Keep BOOKS in sync with audiobookData in audiobook.html (title, tagline, cover).
 * Keep SERIES in sync with seriesData in series.html (title, tagline, cover).
 * SERIES slugs are only used for /listen/<slug>; the other routes stay audiobook-only.
 */
const SITE = 'https://sumnubooks.com';

const BOOKS = {
  'a-penny-for-my-thoughts': { title: 'A Penny For My Thoughts', tagline: "He took her. He didn't expect to care.", cover: 'images/covers-square/a-penny-for-my-thoughts-20261024.webp?v=20261024', w: 1000, h: 1000 },
  'unplugged': { title: 'Unplugged: 30 Days of Chaos', tagline: 'No cell service. No WiFi. Only chaos.', cover: 'images/covers-square/unplugged-badge-20261022.webp', w: 1200, h: 1200 },
  'chandra': { title: 'Chandra: Forbidden Obsession', tagline: "She survived the streets. It's what she knows that will get her killed.", description: "Chandra: Forbidden Obsession by E. D. Lewis. She survived the streets. It's what she knows that will get her killed. The full audiobook is out now. Start free with the sample.", cover: 'images/covers-square/chandra-badge-20261022.webp', w: 1200, h: 1200 },
  'stolen-passage': { title: 'Stolen Passage', tagline: "Some people aren't passengers. They're cargo. And not everyone makes it ashore.", description: "Stolen Passage by E. D. Lewis. Some people aren't passengers. They're cargo. And not everyone makes it ashore. The full audiobook is out now. Start free with the sample.", cover: 'images/covers-square/stolen-passage-badge-20261022.webp', w: 1200, h: 1200 },
  'the-jailhouse-lawyer': { title: 'The Jailhouse Lawyer', tagline: 'Inside the walls, knowledge is power.', cover: 'images/covers-square/the-jailhouse-lawyer-badge-20261022.webp', w: 1200, h: 1200 },
  'still-standing': { title: 'Still Standing', tagline: 'Before the empire... there was the beginning.', cover: 'images/covers-square/still-standing.jpg?v=20260929', w: 1000, h: 1000 },
  'penny-authors-cut': { title: "A Penny For My Thoughts: The Author's Cut", tagline: "He took her. He didn't expect to care.", description: "A Penny For My Thoughts: The Author\u2019s Cut by E. D. Lewis. The expanded edition. Full audiobook out now. Start free with the sample.", cover: 'images/covers-square/penny-authors-cut-badge-20261022.webp', w: 1200, h: 1200 },
  'deanna': { title: "Deanna: The Predator Hunter", tagline: "She knows what you've done.", description: "Deanna: The Predator Hunter by E. D. Lewis. A psychological thriller. Full audiobook out now. Start free with the Chapter 1 sample.", cover: 'images/covers-square/deanna-20261020.webp', w: 1200, h: 1200 },
  'the-echo': { title: "The Echo: Origins", tagline: "Power awakens. Pressure builds. The complete Echo origin story, now as a full audiobook.", description: "The Echo: Origins by E. D. Lewis. Superhero sci-fi. Full audiobook out now. Start free with Chapters 1 and 2.", cover: 'images/covers-square/the-echo-origins-badge-20261029.webp', w: 1200, h: 1200 },
  'the-clock': { title: 'The Clock', tagline: 'When the numbers disappear, you have seven days.', description: 'When the numbers disappear, you have seven days. The full audiobook is out now. Start free with the Prologue and Chapter 1.', cover: 'images/covers-square/the-clock-badge-20261022.webp', w: 1200, h: 1200 },
  'still-pimpin': { title: 'Still Pimpin', tagline: 'An audiobook by E. D. Lewis. Out now. Start with the free sample.', description: 'Still Pimpin by E. D. Lewis. The full audiobook is out now. Start free with the sample.', cover: 'images/covers-square/still-pimpin-20261018.webp', w: 1000, h: 1000 },
  'bloodline': { title: 'Bloodline (Still Pimpin Book Two)', tagline: 'Still Pimpin Book Two. An audiobook by E. D. Lewis. Out now. Start with the free sample.', description: 'Bloodline, Still Pimpin Book Two, by E. D. Lewis. The full audiobook is out now. Start free with the sample.', cover: 'images/covers-square/bloodline-20261018.webp', w: 1000, h: 1000 },
  'still-pimpin-iii': { title: "Still Pimpin III: Like Father, Like Son", tagline: "Like Father, Like Son", description: "Still Pimpin III: Like Father, Like Son by E. D. Lewis. The Still Pimpin Saga, Book Three. Full audiobook out now. Start free with the Chapter 1 sample.", cover: 'images/covers-square/still-pimpin-iii-20261020.webp', w: 1200, h: 1200 },
  'toxic-bosses': { title: 'Turning the Tables on Toxic Bosses: A Practical Survival Guide (Revised and Expanded Edition)', tagline: 'Your boss is the problem. Now what?', description: 'Turning the Tables on Toxic Bosses by E. D. Lewis. Realistic, tested strategies for surviving bad management. Full audiobook plus companion workbook PDF, out now. Start free with the sample.', cover: 'images/covers-square/toxic-bosses-badge-20261022.webp', w: 1200, h: 1200 },
  'ai-for-real-life': { title: 'AI For Real Life: Simple Ways to Make Everyday Life Easier with Artificial Intelligence', tagline: 'Simple ways to use AI for money, meals, shopping, travel, and everyday problems.', description: 'AI For Real Life by E. D. Lewis. Simple ways to use AI for money, meals, shopping, travel, and everyday problems. Full audiobook plus Prompt Companion PDF, out now. Start free with the sample.', cover: 'images/covers-square/ai-for-real-life-badge-20261022.webp', w: 1200, h: 1200 },
  'the-yesterday-project': { title: 'The Yesterday Project: Book One, Part One', tagline: 'We are the experiment.', description: 'The Yesterday Project: Book One, Part One by E. D. Lewis. They weren\'t born. They were selected. Full audiobook out now. Start free with the Chapter 1 sample.', cover: 'images/covers-square/the-yesterday-project-20261020.webp', w: 1200, h: 1200 },
  'the-yesterday-project-part-two': { title: 'The Yesterday Project: Book One, Part Two', tagline: 'We are the experiment.', description: 'The Yesterday Project: Book One, Part Two by E. D. Lewis. Nod is gone. Popi wakes in the upper city with his memories and a house that answers when she speaks. Full audiobook out now. Start free with the Chapter 1 sample.', cover: 'images/covers-square/the-yesterday-project-part-two-20261024.webp?v=20261024', w: 1200, h: 1200 },
  'leadership-development': { title: 'Strategies for Leadership Development: Practical Strategies for New and Developing Leaders', tagline: 'You got the promotion. Now what?', description: 'Strategies for Leadership Development by E. D. Lewis. A practical guide for new and developing leaders. Full audiobook plus 39-page Companion Workbook PDF, out now. Start free with the sample.', cover: 'images/covers-square/leadership-development-20261019.webp', w: 1200, h: 1200 },
  'she-still-exists': { title: 'She Still Exists', tagline: "He built a world for the woman he lost — and inside it, she's helping him find her killer without knowing she's dead.", cover: 'images/covers-square/she-still-exists-20261021.webp', w: 1200, h: 1200 },
};

// Audio series (player: series.html?slug=<slug>). Used by /listen/<slug> only.
const SERIES = {
  'here-eat-this': { title: 'Here... Eat This', tagline: 'A dinner table. A pressure chamber. A story built on suspicion, betrayal, and what gets served when trust is already dead.', cover: 'images/covers-square/here-eat-this-20261021.webp', w: 1200, h: 1200 },
  'other-man': { title: 'Other Man', tagline: "He didn't steal his life. He replaced it.", cover: 'images/covers-square/other-man-clean.jpg?v=20261001', w: 1000, h: 1000 },
};

// Short /listen/<alias> URLs (easy to say out loud) -> canonical slug in BOOKS or SERIES.
const ALIASES = {
  'penny': 'a-penny-for-my-thoughts',
};

const DEFAULT_META = {
  title: 'Audiobooks by E. D. Lewis · Sumnu Books',
  description: 'Listen to free sample chapters of audiobooks by E. D. Lewis on SumnuBooks.',
  image: `${SITE}/images/logos/sumnu-books-logo.png?v=20260929`,
  w: 640, h: 640,
  alt: 'Sumnu Books logo',
  url: `${SITE}/audiobooks.html`,
};

const esc = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const listenUrl = (slug) => `${SITE}/listen/${encodeURIComponent(slug)}`;
const isSeries = (slug) => !!slug && Object.prototype.hasOwnProperty.call(SERIES, slug);
const playerPath = (slug) => {
  const e = encodeURIComponent(slug);
  const page = isSeries(slug) ? '/series.html' : '/audiobook.html';
  return `${page}?slug=${e}&utm_source=share&utm_medium=social&utm_campaign=${e}`;
};
// Link-preview crawlers (not search engines: those get the real page via 302).
// iMessage sends "facebookexternalhit/1.1 Facebot Twitterbot/1.0".
const PREVIEW_BOT = /facebookexternalhit|facebookcatalog|facebot|meta-externalagent|meta-externalfetcher|twitterbot|linkedinbot|slackbot|whatsapp|telegrambot|discordbot|pinterest|redditbot|skypeuripreview|embedly|vkshare|snapchat|bitlybot|tumblr|mastodon|iframely|applebot|quora link preview|outbrain|google-inspectiontool/i;

function metaFor(slug, allowSeries = false) {
  if (allowSeries && isSeries(slug)) {
    const sr = SERIES[slug];
    return {
      slug,
      title: `${sr.title} · Audio series by E. D. Lewis · Sumnu Books`,
      ogTitle: `${sr.title} — Listen free`,
      description: sr.tagline,
      image: `${SITE}/${sr.cover}`,
      w: sr.w, h: sr.h,
      alt: `${sr.title} audio series cover`,
      url: `${SITE}/series.html?slug=${encodeURIComponent(slug)}`,
      ogUrl: listenUrl(slug),
    };
  }
  const b = Object.prototype.hasOwnProperty.call(BOOKS, slug) ? BOOKS[slug] : null;
  if (!b) return { slug: null, ...DEFAULT_META };
  return {
    slug,
    title: b.comingSoon ? `${b.title} · Audiobook coming soon · Sumnu Books` : `${b.title} · Audiobook by E. D. Lewis · Sumnu Books`,
    ogTitle: b.comingSoon ? `${b.title} — Audiobook coming soon` : `${b.title} — Listen free`,
    description: b.description || b.tagline,
    image: `${SITE}/${b.cover}`,
    w: b.w, h: b.h,
    alt: `${b.title} audiobook cover`,
    url: `${SITE}/audiobook.html?slug=${encodeURIComponent(slug)}`,
    ogUrl: listenUrl(slug),
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
    `<meta property="og:url" content="${esc(m.ogUrl || m.url)}">`,
    `<meta property="og:image" content="${esc(m.image)}">`,
    `<meta property="og:image:secure_url" content="${esc(m.image)}">`,
    `<meta property="og:image:type" content="${m.image.includes('.png') ? 'image/png' : m.image.includes('.webp') ? 'image/webp' : 'image/jpeg'}">`,
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

function listenPage(m, slug) {
  const to = SITE + playerPath(slug);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(m.title)}</title>
  <meta name="description" content="${esc(m.description)}">
  ${headTags({ ...m, url: m.ogUrl })}
  <style>body{margin:0;background:#0a0e1a;color:#fff;font:16px/1.5 "DM Sans",system-ui,sans-serif;text-align:center;padding:32px 16px}img{width:240px;max-width:70vw;height:auto;border-radius:12px}a{display:inline-block;margin-top:16px;min-height:44px;line-height:44px;padding:0 20px;border-radius:999px;background:#d4a843;color:#0a0e1a;font-weight:700;text-decoration:none}</style>
</head>
<body>
  <img src="${esc(m.image)}" alt="${esc(m.alt)}" width="${m.w}" height="${m.h}">
  <h1>${esc(m.ogTitle || m.title)}</h1>
  <p>${esc(m.description)}</p>
  <a href="${esc(to)}">Listen on Sumnu Books</a>
  <script>location.replace(${JSON.stringify(to)});</script>
</body>
</html>
`;
}

export default async (request, context) => {
  const url = new URL(request.url);
  const p = (url.pathname.replace(/\/+$/, '') || '/').toLowerCase();

  // Share URL: /listen/<slug>
  if (p === '/listen' || p.startsWith('/listen/')) {
    const asked = decodeURIComponent(p.slice('/listen/'.length).split('/')[0] || '');
    const slug = has(ALIASES, asked) ? ALIASES[asked] : asked;
    const nocache = { 'cache-control': 'public, max-age=0, must-revalidate', vary: 'User-Agent' };
    const ua = request.headers.get('user-agent') || '';
    const isBot = PREVIEW_BOT.test(ua);
    // Per-slug visit log (Netlify edge function logs). No PII: referrer host only, no IP/UA.
    let refHost = '';
    try { refHost = new URL(request.headers.get('referer') || '').hostname; } catch (_e) {}
    const known = has(BOOKS, slug) || has(SERIES, slug);
    console.log('listen_visit ' + JSON.stringify({ slug: known ? slug : 'unknown', alias: asked !== slug && known ? asked : null, who: isBot ? 'crawler' : 'person', ref: refHost || null }));
    if (!known) {
      return new Response(null, { status: 302, headers: { ...nocache, location: new URL('/audiobooks.html', url.origin).toString(), 'x-sumnu-og': 'listen:unknown' } });
    }
    if (isBot) {
      const headers = { ...nocache, 'content-type': 'text/html; charset=utf-8', 'x-sumnu-og': slug };
      if (request.method === 'HEAD') return new Response(null, { status: 200, headers });
      return new Response(listenPage(metaFor(slug, true), slug), { status: 200, headers });
    }
    const to = new URL(playerPath(slug), url.origin);
    if (asked !== slug) to.searchParams.set('utm_content', asked);
    url.searchParams.forEach((v, k) => to.searchParams.set(k, v)); // any incoming utm overrides the defaults
    return new Response(null, { status: 302, headers: { ...nocache, location: to.toString(), 'x-sumnu-og': 'listen:' + slug } });
  }

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
