(() => {
  const btn = document.getElementById("sumnuRadioBtn");
  const skip = document.getElementById("sumnuSkipBtn");
  const now = document.getElementById("sumnuNowPlaying");
  const player = document.getElementById("sumnuRadioPlayer");

  if (!btn || !skip || !now || !player) return;

  let tracks = [];
  let on = false;
  let lastIndex = -1;

  const MUSIC_PAGE_URL = "/music.html"; // your music page filename

  function pickRandomIndex() {
    if (tracks.length <= 1) return 0;
    let i;
    do { i = Math.floor(Math.random() * tracks.length); }
    while (i === lastIndex);
    lastIndex = i;
    return i;
  }

  function playRandom() {
    if (!tracks.length) {
      now.textContent = "No tracks found yet.";
      return;
    }
    const t = tracks[pickRandomIndex()];
    player.src = t.url;
    player.play().catch(() => {});
    now.textContent = `Now playing: ${t.title}`;
  }

  async function loadTracksFromMusicPage() {
    // Pull the list of songs from music.html by scanning for links/sources ending in .mp3/.wav
    const res = await fetch(MUSIC_PAGE_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load music page to build playlist.");

    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, "text/html");

    // Look for common patterns
    const urls = new Set();

    // <a href="...mp3">
    doc.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute("href") || "";
      if (/\.(mp3|wav)(\?.*)?$/i.test(href)) urls.add(href);
    });

    // <source src="...mp3">
    doc.querySelectorAll('source[src], audio[src]').forEach(el => {
      const src = el.getAttribute("src") || "";
      if (/\.(mp3|wav)(\?.*)?$/i.test(src)) urls.add(src);
    });

    // Build track objects with simple titles
    tracks = Array.from(urls).map(u => {
      const clean = u.split("?")[0];
      const file = clean.split("/").pop() || clean;
      const title = decodeURIComponent(file).replace(/\.(mp3|wav)$/i, "");
      return { url: u, title };
    });

    if (!tracks.length) {
      throw new Error("No audio links found on music.html. The music page must contain mp3/wav URLs.");
    }
  }

  async function start() {
    on = true;
    btn.textContent = "⏸ Stop Radio";
    skip.disabled = false;

    try {
      if (!tracks.length) await loadTracksFromMusicPage();
      playRandom();
    } catch (e) {
      on = false;
      btn.textContent = "▶️ Play Sumnu Radio (Shuffle)";
      skip.disabled = true;
      now.textContent = "Radio couldn’t start (no track links found).";
      console.error(e);
    }
  }

  function stop() {
    on = false;
    btn.textContent = "▶️ Play Sumnu Radio (Shuffle)";
    skip.disabled = true;
    player.pause();
    player.removeAttribute("src");
    now.textContent = "";
  }

  btn.addEventListener("click", () => {
    if (on) stop();
    else start();
  });

  skip.addEventListener("click", () => {
    if (on) playRandom();
  });

  player.addEventListener("ended", () => {
    if (on) playRandom();
  });
})();