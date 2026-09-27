/* Mobile nav: adds a hamburger toggle to the shared site header on
   small screens. No dependencies, no tracking, no login. */
(function () {
  var header = document.querySelector('.site-header');
  var links = header && header.querySelector('#navLinks, .nav-links, .nav-links-shell, nav');
  if (!header || !links || header.querySelector('.sb-nav-toggle')) return;
  if (!links.id) links.id = 'navLinks';
  var bar = links.parentElement;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sb-nav-toggle';
  btn.setAttribute('aria-controls', links.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Open menu');
  btn.innerHTML = '<span class="sb-nav-icon" aria-hidden="true"><span></span><span></span><span></span></span><span class="sb-nav-text">Menu</span>';
  var brand = document.createElement('a');
  brand.href = 'index.html';
  brand.className = 'sb-nav-brand';
  brand.textContent = 'Sumnu Books';
  bar.insertBefore(brand, links);
  bar.insertBefore(btn, links);
  var root = document.documentElement;
  function set(open) {
    root.classList.toggle('sb-nav-open', open);
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    set(!root.classList.contains('sb-nav-open'));
  });
  links.addEventListener('click', function (e) {
    if (e.target.closest('a')) set(false);
  });
  document.addEventListener('click', function (e) {
    if (!header.contains(e.target)) set(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') set(false);
  });
  /* iOS/Android: play inline, never autoplay. */
  function tuneAudio(a) {
    a.setAttribute('playsinline', '');
    a.setAttribute('webkit-playsinline', '');
    a.removeAttribute('autoplay');
    if (!a.getAttribute('preload') || a.getAttribute('preload') === 'auto') a.setAttribute('preload', 'none');
  }
  document.querySelectorAll('audio').forEach(tuneAudio);
  if ('MutationObserver' in window) {
    new MutationObserver(function (muts) {
      muts.forEach(function (m) {
        m.addedNodes.forEach(function (n) {
          if (n.nodeType !== 1) return;
          if (n.tagName === 'AUDIO') tuneAudio(n);
          else if (n.querySelectorAll) n.querySelectorAll('audio').forEach(tuneAudio);
        });
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
})();
