/* SUMNU BOOKS - shared JS
   - Mobile nav toggle
   - One-audio-at-a-time
   - Books page rendering + search
   - Music page accordion rendering
*/

(function () {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Mobile nav
  const navToggle = qs('[data-nav-toggle]');
  const navLinks = qs('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      const expanded = navLinks.classList.contains('open');
      navToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    });

    // Close on link click (mobile)
    qsa('a', navLinks).forEach(a => a.addEventListener('click', () => {
      navLinks.classList.remove('open');
      navToggle.setAttribute('aria-expanded', 'false');
    }));

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!navLinks.classList.contains('open')) return;
      const inside = navLinks.contains(e.target) || navToggle.contains(e.target);
      if (!inside) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // One-audio-at-a-time
  const enforceSingleAudio = () => {
    const audios = qsa('audio');
    audios.forEach(a => {
      a.addEventListener('play', () => {
        audios.forEach(other => {
          if (other !== a) other.pause();
        });
      });
    });
  };

  // Books rendering
  function renderBooks() {
    const host = qs('[data-books-grid]');
    if (!host || !window.SUMNU_DATA?.books) return;

    const data = window.SUMNU_DATA.books.slice();

    const sortSel = qs('[data-books-sort]');
    const searchInput = qs('[data-books-search]');

    function getFiltered() {
      const q = (searchInput?.value || '').trim().toLowerCase();
      let out = data.filter(b => !q || (b.title + ' ' + b.desc).toLowerCase().includes(q));
      const sort = sortSel?.value || 'new';
      if (sort === 'az') out.sort((a,b)=>a.title.localeCompare(b.title));
      if (sort === 'za') out.sort((a,b)=>b.title.localeCompare(a.title));
      if (sort === 'num') out.sort((a,b)=> (parseInt(a.id.replace('book',''),10) - parseInt(b.id.replace('book',''),10)));
      return out;
    }

    function card(b) {
      const formats = ['Paperback','Kindle','Audiobook'];
      return `
        <article class="card product" data-book="${b.id}">
          <div class="product-media">
            <div class="cover">
              <img src="${b.cover}" alt="${escapeHtml(b.title)} cover" loading="lazy">
            </div>
          </div>
          <div class="product-body">
            <div class="product-title">${escapeHtml(b.title)}</div>
            <div class="product-desc">${escapeHtml(b.desc)}</div>
            <div class="product-meta">
              <div class="pill">🔥 Street Lit</div>
              <div class="price">${escapeHtml(b.price || '')}</div>
            </div>
            <div class="product-desc" style="display:flex; gap:8px; flex-wrap:wrap;">
              ${formats.map(f=>`<span class="pill">${f}</span>`).join('')}
            </div>

            <div class="actions">
              <button class="btn btn-secondary btn-small" data-audio-btn="${b.id}">
                🎧 Sample
              </button>
              <a class="btn btn-primary btn-small" href="${b.buyUrl}" target="_blank" rel="noopener">
                🛒 Buy on Amazon
              </a>
            </div>

            <div style="display:none; margin-top:10px;" data-audio-wrap="${b.id}">
              <audio controls preload="none">
                <source src="${b.audioSample}" type="audio/mpeg">
              </audio>
</div>
          </div>
        </article>
      `;
    }

    function draw() {
      host.innerHTML = getFiltered().map(card).join('');
      wireBookAudio();
      enforceSingleAudio();
    }

    function wireBookAudio() {
      qsa('[data-audio-btn]').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.getAttribute('data-audio-btn');
          const wrap = qs(`[data-audio-wrap="${id}"]`);
          if (!wrap) return;
          const isOpen = wrap.style.display === 'block';
          // close other wraps
          qsa('[data-audio-wrap]').forEach(w => { if (w !== wrap) w.style.display = 'none'; });
          wrap.style.display = isOpen ? 'none' : 'block';
          if (!isOpen) {
            const a = qs('audio', wrap);
            if (a) a.play().catch(()=>{});
          }
        });
      });
    }

    if (sortSel) sortSel.addEventListener('change', draw);
    if (searchInput) searchInput.addEventListener('input', () => {
      // small debounce
      window.clearTimeout(renderBooks._t);
      renderBooks._t = window.setTimeout(draw, 120);
    });

    draw();
  }

  // Music rendering
  function renderAlbums() {
    const host = qs('[data-albums]');
    if (!host || !window.SUMNU_DATA?.albums) return;

    function albumCard(a) {
      const links = (a.links||[]).map(l => `
        <a class="btn btn-small btn-secondary" href="${l.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">${escapeHtml(l.label)}</a>
      `).join('');

      const tracks = (a.tracks||[]).map(t => `
        <div class="track">
          <div class="n">${t.n}.</div>
          <div class="tt">${escapeHtml(t.title)}</div>
          <audio controls preload="none">
            <source src="${encodeURI(t.src)}" type="audio/mpeg">
          </audio>
        </div>
      `).join('');

      return `
        <div class="accordion" data-acc="${a.id}">
          <div class="acc-head" role="button" tabindex="0" aria-expanded="false">
            <div class="acc-cover"><img src="${encodeURI(a.cover)}" alt="${escapeHtml(a.title)} cover" loading="lazy"></div>
            <div class="acc-info">
              <p class="t">${escapeHtml(a.title)}</p>
              <div class="m">
                <span class="pill">🎤 ${escapeHtml(a.artist)}</span>
                <span class="pill">📅 ${escapeHtml(a.year)}</span>
              </div>
            </div>
            <div class="acc-actions">${links}</div>
            <div class="acc-arrow">▼</div>
          </div>
          <div class="acc-body">
            ${tracks}
          </div>
        </div>
      `;
    }

    host.innerHTML = window.SUMNU_DATA.albums.map(albumCard).join('');

    // accordion behavior (only one open)
    qsa('[data-acc]').forEach(acc => {
      const head = qs('.acc-head', acc);
      const toggle = () => {
        const open = acc.classList.contains('open');
        qsa('[data-acc]').forEach(o => {
          o.classList.remove('open');
          const h = qs('.acc-head', o);
          if (h) h.setAttribute('aria-expanded','false');
        });
        if (!open) {
          acc.classList.add('open');
          head.setAttribute('aria-expanded','true');
        }
      };

      head.addEventListener('click', toggle);
      head.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
      });
    });

    enforceSingleAudio();
  }

  
  function wireZelleToggles(){
    qsa('[data-zelle-toggle]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const id = btn.getAttribute('data-zelle-toggle');
        const panel = qs(`[data-zelle-panel="${id}"]`);
        if (!panel) return;
        const open = panel.style.display === 'block';
        panel.style.display = open ? 'none' : 'block';
      });
    });
  }

  function escapeHtml(str){
    return String(str||'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'",'&#039;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    enforceSingleAudio();
    renderBooks();
    renderAlbums();
    wireZelleToggles();
  });

  // Scroll reveal (subtle)
  const revealEls = qsa('.reveal');
  if (revealEls.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('in-view');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => io.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

})();