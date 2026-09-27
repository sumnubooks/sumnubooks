/**
 * Paid-audio block (no login, no membership, no third-party auth).
 *
 * Runs on every file under /audio/audiobooks/* and /audio/series/*
 * (see netlify.toml). Only the free sample files below are served;
 * everything else (paid chapters/episodes, stray files) gets 403 and is
 * never cached. Paid audio is sold as downloads through Payhip, so the
 * site itself never needs to stream it.
 *
 * Free samples (chapters/episodes 1–2 per title; [12] is anchored so
 * Ch10/ep12 never match):
 *   Penny      a-penny-for-my-thoughts-ch1/2.mp3
 *   Unplugged  unplugged-ch1/2.mp3            (Prologue + Ch 1)
 *   Jailhouse  The-Jailhouse-Lawyer-Ch1/2.mp3
 *   Still      Still-Standing-Ch1/2.mp3
 *   Echo       audiobooks/the-echo/the-echo-origins-ch1/2.mp3
 *   HET        here-eat-this-ep1/2.mp3
 *   Other Man  other-man-ep1/2.mp3
 *   BOWB       before-our-water-breaks-ep1/2.mp3
 *   Stolen     Stolen_Passage_Chapter_1/2.mp3
 *   She Still  she-still-exists-ch1/2.mp3
 *   Echo (legacy series path) the-echo-origins-ep1/2.mp3
 *
 * /audio/music/** (Sumnu Radio) is not routed through this function.
 * To add a new title's samples, add one line to SAMPLE_RE.
 */

const SAMPLE_RE = [
  /^\/audio\/audiobooks\/a-penny-for-my-thoughts\/a-penny-for-my-thoughts-ch[12]\.mp3$/i,
  /^\/audio\/audiobooks\/unplugged\/unplugged-ch[12]\.mp3$/i,
  /^\/audio\/audiobooks\/the-jailhouse-lawyer\/The-Jailhouse-Lawyer-Ch[12]\.mp3$/i,
  /^\/audio\/audiobooks\/still-standing\/Still-Standing-Ch[12]\.mp3$/i,
  /^\/audio\/audiobooks\/the-echo\/the-echo-origins-ch[12]\.mp3$/i,
  /^\/audio\/series\/here-eat-this\/here-eat-this-ep[12]\.mp3$/i,
  /^\/audio\/series\/other-man\/other-man-ep[12]\.mp3$/i,
  /^\/audio\/series\/before-our-water-breaks\/before-our-water-breaks-ep[12]\.mp3$/i,
  /^\/audio\/series\/stolen-passage\/Stolen_Passage_Chapter_[12]\.mp3$/i,
  /^\/audio\/series\/she-still-exists\/she-still-exists-ch[12]\.mp3$/i,
  /^\/audio\/series\/the-echo-origins\/the-echo-origins-ep[12]\.mp3$/i
];

function normalizePath(pathname) {
  let path = pathname || "";
  try {
    path = decodeURIComponent(path);
  } catch (_err) {
    return "";
  }
  // Collapse duplicate slashes; refuse any dot-segments outright.
  path = path.replace(/\/{2,}/g, "/");
  if (/(^|\/)\.\.?(\/|$)/.test(path)) return "";
  return path;
}

function isSample(pathname) {
  const path = normalizePath(pathname);
  return !!path && SAMPLE_RE.some((re) => re.test(path));
}

function blocked() {
  return new Response("This chapter is part of the full title. Buy it at https://sumnubooks.com/audiobooks.html\n", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Netlify-CDN-Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "X-Sumnu-Edge": "deny-paid"
    }
  });
}

export default async (request, context) => {
  const url = new URL(request.url);
  if (isSample(url.pathname)) {
    const res = await context.next();
    try {
      res.headers.set("X-Sumnu-Edge", "allow-sample");
    } catch (_err) {}
    return res;
  }
  return blocked();
};
