/* ============================================================
   SUMNU BOOKS — animations.js
   SAFE version — NO click handlers, NO page transitions.
   Only: particle injection + scroll reveal observer.
   ============================================================ */
(function() {

  /* ── Inject fire-dust particles into body ── */
  function initParticles() {
    var count = 12;
    for (var i = 0; i < count; i++) {
      var p = document.createElement('div');
      p.className = 'sumnu-particle';
      document.body.appendChild(p);
    }
  }

  /* ── Scroll reveal — ONLY adds/removes a CSS class, zero click logic ── */
  function initScrollReveal() {
    var els = document.querySelectorAll('.sr');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function(el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    els.forEach(function(el) { io.observe(el); });
  }

  /* ── Init ── */
  function init() {
    initParticles();
    initScrollReveal();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
