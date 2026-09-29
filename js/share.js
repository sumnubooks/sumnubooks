/* Sumnu Books — per-audiobook Share.
   Phones (touch + Web Share API): native share sheet via navigator.share.
   Desktop / unsupported: copy the link + "Link copied" toast with Facebook / X / WhatsApp links.
   Shared URL is always https://sumnubooks.com/listen/<slug>: the og-audiobook edge function
   gives link-preview crawlers that book's meta and sends people to the player
   (audiobook.html?slug=<slug>&utm_source=share&utm_medium=social&utm_campaign=<slug>). */
(function () {
  var SITE = 'https://sumnubooks.com';
  // Player titles/taglines (keep in sync with audiobook.html + og-audiobook.js).
  var BOOKS = {
    'a-penny-for-my-thoughts': ['A Penny For My Thoughts', "He took her. He didn't expect to care."],
    'unplugged': ['Unplugged: 30 Days of Chaos', 'No cell service. No WiFi. Only chaos.'],
    'chandra': ['Chandra: Forbidden Obsession', "She survived the streets. It's what she knows that will get her killed."],
    'the-jailhouse-lawyer': ['The Jailhouse Lawyer', 'Inside the walls, knowledge is power.'],
    'still-standing': ['Still Standing', 'Before the empire... there was the beginning.'],
    'the-echo': ['The Echo', 'Power awakens. Pressure builds. The complete Echo origin story, now as a full audiobook.'],
    'the-clock': ['The Clock', 'When the numbers disappear, you have seven days.'],
    'she-still-exists': ['She Still Exists', "He built a world for the woman he lost — and inside it, she's helping him find her killer without knowing she's dead."]
  };

  function shareUrl(slug) {
    return SITE + '/listen/' + encodeURIComponent(slug);
  }

  function isPhone() {
    try { return window.matchMedia('(hover: none) and (pointer: coarse)').matches; } catch (e) { return false; }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }
  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', '');
    ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function injectStyles() {
    if (document.getElementById('sbShareStyles')) return;
    var css = '' +
      '.sb-share-toast{position:fixed;left:50%;bottom:calc(16px + env(safe-area-inset-bottom,0px));transform:translate(-50%,20px);' +
      'width:min(420px,calc(100vw - 24px));box-sizing:border-box;z-index:9999;opacity:0;pointer-events:none;' +
      'transition:opacity .2s ease,transform .2s ease;background:rgba(14,18,32,.97);color:#fff;border:1px solid rgba(212,168,67,.45);' +
      'border-radius:16px;padding:12px 12px 12px 16px;box-shadow:0 18px 50px rgba(0,0,0,.6);font-family:"DM Sans",system-ui,sans-serif;}' +
      '.sb-share-toast.show{opacity:1;transform:translate(-50%,0);pointer-events:auto;}' +
      '.sb-share-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}' +
      '.sb-share-msg{font-size:16px;font-weight:700;color:#d4a843;line-height:1.3;margin:0;}' +
      '.sb-share-close{min-width:44px;min-height:44px;border:none;background:none;color:rgba(255,255,255,.6);font-size:18px;cursor:pointer;border-radius:50%;}' +
      '.sb-share-url{display:block;width:100%;box-sizing:border-box;margin:6px 0 0;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.12);' +
      'background:rgba(255,255,255,.05);color:rgba(255,255,255,.75);font-size:16px;}' +
      '.sb-share-links{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;}' +
      '.sb-share-links a{flex:1 1 90px;display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:0 12px;border-radius:999px;' +
      'border:1px solid rgba(255,255,255,.16);color:#fff;text-decoration:none;font-size:16px;font-weight:600;background:rgba(255,255,255,.04);}' +
      '.sb-share-links a:hover,.sb-share-links a:focus-visible{border-color:#d4a843;color:#d4a843;}';
    var st = document.createElement('style');
    st.id = 'sbShareStyles'; st.textContent = css;
    document.head.appendChild(st);
  }

  var hideTimer = null;
  function showToast(opts, url, copied) {
    injectStyles();
    var t = document.getElementById('sbShareToast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'sbShareToast'; t.className = 'sb-share-toast';
      t.setAttribute('role', 'dialog'); t.setAttribute('aria-label', 'Share');
      document.body.appendChild(t);
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideToast(); });
    }
    var eu = encodeURIComponent(url);
    var line = opts.title + (opts.text ? ' — ' + opts.text : '');
    t.innerHTML =
      '<div class="sb-share-head"><p class="sb-share-msg" role="status" aria-live="polite"></p>' +
      '<button type="button" class="sb-share-close" aria-label="Close share options">✕</button></div>' +
      (copied ? '' : '<input class="sb-share-url" readonly aria-label="Share link">') +
      '<div class="sb-share-links">' +
      '<a target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=' + eu + '">Facebook</a>' +
      '<a target="_blank" rel="noopener" href="https://x.com/intent/tweet?text=' + encodeURIComponent(line) + '&url=' + eu + '">X</a>' +
      '<a target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(opts.title + ' — ' + url) + '">WhatsApp</a>' +
      '</div>';
    t.querySelector('.sb-share-msg').textContent = copied ? '✓ Link copied' : 'Copy this link:';
    var inp = t.querySelector('.sb-share-url');
    if (inp) { inp.value = url; setTimeout(function () { inp.focus(); inp.select(); }, 50); }
    t.querySelector('.sb-share-close').addEventListener('click', hideToast);
    t.classList.add('show');
    clearTimeout(hideTimer);
    hideTimer = setTimeout(hideToast, 8000);
    t.onmouseenter = function () { clearTimeout(hideTimer); };
  }
  function hideToast() {
    var t = document.getElementById('sbShareToast');
    if (t) t.classList.remove('show');
  }

  function share(opts) {
    var known = BOOKS[opts.slug] || [];
    opts = { slug: opts.slug, title: opts.title || known[0] || document.title, text: opts.text || known[1] || '' };
    // Always the absolute /listen/<slug> URL (never location.href / list-page anchors).
    var url = shareUrl(opts.slug);
    // url is passed on its own; text is the tagline only (no URL in text).
    var data = { title: opts.title, text: opts.text, url: url };
    if (navigator.share && isPhone()) {
      return navigator.share(data).catch(function (err) {
        if (err && err.name === 'AbortError') return; // user closed the share sheet
        return copyText(url).then(function (ok) { showToast(opts, url, ok); });
      });
    }
    return copyText(url).then(function (ok) { showToast(opts, url, ok); });
  }

  // Any element with data-share-slug becomes a share trigger.
  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-share-slug]');
    if (!el) return;
    e.preventDefault();
    e.stopPropagation();
    share({ slug: el.getAttribute('data-share-slug'), title: el.getAttribute('data-share-title') || '', text: el.getAttribute('data-share-text') || '' });
  });

  window.SumnuShare = { share: share, url: shareUrl, books: BOOKS };
})();
