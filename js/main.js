/* SUMNU BOOKS - shared JS
   - Mobile nav toggle
   - One-audio-at-a-time
   - Books page rendering + search
   - Music page album grid expand/collapse
   - Music page: Sumnu Radio + Stream button + Video buttons
*/

(function () {
  const qs = (s, el=document) => el.querySelector(s);
  const qsa = (s, el=document) => Array.from(el.querySelectorAll(s));

  // Mobile nav
  const navToggle = qs('[data-nav-toggle]');
  const navLinks = qs('[data-nav-links]');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', (e) => {
      if (!navLinks.classList.contains('open')) return;
      const inside = navLinks.contains(e.target) || navToggle.contains(e.target);
      if (!inside) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // One-audio-at-a-time (includes Sumnu Radio)
  const enforceSingleAudio = () => {
    const audios = qsa('audio');

    audios.forEach(a => {
      if (a.dataset.singleAudioBound === '1') return;
      a.dataset.singleAudioBound = '1';

      a.addEventListener('play', () => {
        audios.forEach(other => {
          if (other !== a) {
            try { other.pause(); } catch (e) {}
          }
        });
      });
    });
  };

  function buildReaderLink(book){
    const params = new URLSearchParams({
      book: book.epubUrl,
      title: book.title,
      author: 'E. D. Lewis',
      back: 'books.html'
    });
    return 'reader.html?' + params.toString();
  }

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
      const genreEmoji = { 'Sci-Fi': '🚀', 'Thriller': '🔪', 'Urban Fiction': '🔥', 'Street Lit': '🔥', 'Nonfiction': '📘', 'Self-Help': '💡', 'Finance': '💰', 'Health': '🩺', 'Leadership': '🏆' };
      const genreLabel = b.genre || 'Street Lit';
      const genreIcon = genreEmoji[genreLabel] || '📖';
      const hasAudiobook = !!b.audiobookUrl;
      const hasEpub = !!b.epubUrl;
      const audiobookBtn = hasAudiobook
        ? `<a class="btn btn-primary btn-small" href="${escapeHtml(b.audiobookUrl)}" style="background:linear-gradient(135deg,#b8860b,#ffd700);color:#000;font-weight:800;">🎧 Audiobook $12.99</a>`
        : '';
      const readBtn = hasEpub
        ? `<a class="btn btn-secondary btn-small" href="${escapeHtml(buildReaderLink(b))}">📖 Read Now</a>`
        : '';

      return `
        <article class="card product book-card" data-book="${b.id}">
          <div class="book-cover-wrap">
            <img src="${b.cover}" alt="${escapeHtml(b.title)} cover" loading="lazy">
          </div>
          <div class="book-detail-panel" data-book-panel="${b.id}">
            <button class="book-close-btn" data-book-close="${b.id}" aria-label="Close">✕ Back</button>
            <div class="book-detail-title">${escapeHtml(b.title)}</div>
            <div class="book-detail-desc">${escapeHtml(b.desc)}</div>
            <div class="book-detail-meta">
              <span class="pill">${genreIcon} ${escapeHtml(genreLabel)}</span>
              <span class="price">${escapeHtml(b.price || '')}</span>
            </div>
            <div class="book-detail-actions">
              <button class="btn btn-secondary btn-small" data-audio-btn="${b.id}">🎧 Sample</button>
              ${readBtn}
              ${audiobookBtn}
              <a class="btn btn-primary btn-small" href="${b.buyUrl}" target="_blank" rel="noopener">🛒 Buy on Amazon</a>
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

    function closeAllPanels() {
      qsa('.book-card.panel-open').forEach(c => {
        c.classList.remove('panel-open');
        const panel = qs('[data-book-panel]', c);
        if (panel) panel.style.transform = 'translateY(100%)';
      });
    }

    function wireBookAudio() {
      // Cover tap — open detail panel
      qsa('.book-cover-wrap').forEach(wrap => {
        wrap.addEventListener('click', () => {
          const card = wrap.closest('.book-card');
          if (!card) return;
          const isOpen = card.classList.contains('panel-open');
          closeAllPanels();
          if (!isOpen) {
            card.classList.add('panel-open');
            const panel = qs('[data-book-panel]', card);
            if (panel) panel.style.transform = 'translateY(0)';
          }
        });
      });

      // Close button
      qsa('[data-book-close]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          closeAllPanels();
        });
      });

      // Sample audio
      qsa('[data-audio-btn]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = btn.getAttribute('data-audio-btn');
          const audioWrap = qs(`[data-audio-wrap="${id}"]`);
          if (!audioWrap) return;
          const isOpen = audioWrap.style.display === 'block';
          qsa('[data-audio-wrap]').forEach(w => { if (w !== audioWrap) w.style.display = 'none'; });
          audioWrap.style.display = isOpen ? 'none' : 'block';
          if (!isOpen) {
            const a = qs('audio', audioWrap);
            if (a) a.play().catch(()=>{});
          }
        });
      });
    }

    if (sortSel) sortSel.addEventListener('change', draw);
    if (searchInput) searchInput.addEventListener('input', () => {
      window.clearTimeout(renderBooks._t);
      renderBooks._t = window.setTimeout(draw, 120);
    });

    draw();
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

  // Music page: album expand/collapse + Stream button + per-track Video + Sumnu Radio
  function initMusicPage(){
    const grid = qs('[data-album-grid]');
    if(!grid) return; // only run on music.html

    const radioAudio = qs('#radioAudio');
    const radioToggle = qs('#radioToggle');
    const radioNext = qs('#radioNext');
    const radioNowTitle = qs('#radioNowTitle');

    const pauseRadio = () => {
      if(!radioAudio) return;
      try { radioAudio.pause(); } catch(e) {}
      if(radioToggle) radioToggle.textContent = '▶ Play';
    };

    const stopAllAudio = (exceptEl) => {
      qsa('audio').forEach(a => {
        if(a !== exceptEl){
          try { a.pause(); a.currentTime = 0; } catch(e) {}
        }
      });
    };

    const closeAll = () => {
      qsa('.album-card.is-open', grid).forEach(card => {
        card.classList.remove('is-open');
        const btn = qs('[data-album-toggle]', card);
        if(btn) btn.setAttribute('aria-expanded','false');
      });
    };

    const setStreamLinkForCard = (card) => {
      const panel = qs('[data-album-panel]', card);
      if(!panel) return;
      const linkEl = qs('[data-stream-link]', panel);
      if(!linkEl) return;
      const href = (card.getAttribute('data-stream') || '').trim();
      if(href && href !== '#'){
        linkEl.href = href;
        linkEl.style.display = '';
      } else {
        linkEl.href = '#';
        linkEl.style.display = 'none';
      }
    };

    const wireVideoButtons = () => {
      qsa('li.track[data-video]').forEach(li => {
        const url = (li.getAttribute('data-video') || '').trim();
        const btn = qs('[data-video-btn]', li);
        if(!btn) return;
        if(url){
          btn.href = url;
          btn.style.display = '';
        } else {
          btn.href = '#';
          btn.style.display = 'none';
        }
      });
    };

    // Album expand/collapse (one open at a time)
    grid.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-album-toggle]');
      const closeBtn = e.target.closest('[data-album-close]');
      const card = e.target.closest('.album-card');
      if(!card) return;

      if(closeBtn){
        card.classList.remove('is-open');
        const btn = qs('[data-album-toggle]', card);
        if(btn) btn.setAttribute('aria-expanded','false');
        stopAllAudio();
        pauseRadio();
        return;
      }

      if(toggle){
        const isOpen = card.classList.contains('is-open');
        closeAll();
        stopAllAudio();
        pauseRadio();

        if(!isOpen){
          card.classList.add('is-open');
          toggle.setAttribute('aria-expanded','true');
          setStreamLinkForCard(card);
          try { card.scrollIntoView({behavior:'smooth', block:'start'}); } catch(e) {}
        }
      }
    });

    // If any album/track audio plays, pause radio
    document.addEventListener('play', (e) => {
      if(e.target && e.target.tagName === 'AUDIO' && e.target !== radioAudio){
        pauseRadio();
      }
    }, true);

    // --- Sumnu Radio ---
    const buildRadioPlaylist = () => {
      const items = [];
      qsa('ol.tracklist li.track').forEach(li => {
        const srcEl = qs('source[src]', li);
        if(!srcEl) return;
        const rawSrc = srcEl.getAttribute('src');
        if(!rawSrc) return;
        const nameEl = qs('.track-name', li) || qs('.track-title', li);
        const title = nameEl ? nameEl.textContent.trim() : 'Track';
        items.push({ title, src: rawSrc });
      });
      return items;
    };

    let playlist = buildRadioPlaylist();
    let currentIndex = -1;

    const setNowPlaying = (text) => {
      if(radioNowTitle) radioNowTitle.textContent = text || '—';
    };

    const pickNextIndex = () => {
      if(!playlist.length) return -1;
      if(playlist.length === 1) return 0;
      let idx = Math.floor(Math.random() * playlist.length);
      if(idx === currentIndex){
        idx = (idx + 1) % playlist.length;
      }
      return idx;
    };

    const playIndex = (idx) => {
      if(!radioAudio || idx < 0 || idx >= playlist.length) return;
      currentIndex = idx;
      const item = playlist[idx];
      stopAllAudio(radioAudio);
      radioAudio.src = item.src;
      radioAudio.play().then(()=>{
        if(radioToggle) radioToggle.textContent = '⏸ Pause';
        setNowPlaying(item.title);
      }).catch(()=>{});
    };

    if(radioToggle && radioAudio){
      radioToggle.addEventListener('click', () => {
        playlist = buildRadioPlaylist();
        if(!playlist.length){
          setNowPlaying('No tracks found');
          return;
        }
        if(radioAudio.paused){
          const idx = currentIndex >= 0 ? currentIndex : pickNextIndex();
          playIndex(idx);
        } else {
          radioAudio.pause();
          radioToggle.textContent = '▶ Play';
        }
      });

      radioAudio.addEventListener('ended', () => {
        const idx = pickNextIndex();
        playIndex(idx);
      });
    }

    if(radioNext){
      radioNext.addEventListener('click', () => {
        playlist = buildRadioPlaylist();
        const idx = pickNextIndex();
        playIndex(idx);
      });
    }

    wireVideoButtons();
    enforceSingleAudio();
  }

  function escapeHtml(str){
    return String(str ?? '')
      .replace(/&/g,'&amp;')
      .replace(/</g,'&lt;')
      .replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;')
      .replace(/'/g,'&#39;');
  }

  document.addEventListener('DOMContentLoaded', () => {
    try { renderBooks(); } catch(e) {}
    try { wireZelleToggles(); } catch(e) {}
    try { initMusicPage(); } catch(e) {}
    try { enforceSingleAudio(); } catch(e) {}
  });

  window.renderBooks = renderBooks;
})();