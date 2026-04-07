/* ============================================================
   SUMNU BOOKS — animations.js
   Bold, dynamic JS-powered animations
   ============================================================ */
(function() {

  /* ── Custom cursor ── */
  function initCursor() {
    if (window.matchMedia('(max-width: 760px)').matches) return;
    if (window.matchMedia('(pointer: coarse)').matches) return;

    var dot  = document.createElement('div'); dot.id  = 'sumnu-cursor';
    var ring = document.createElement('div'); ring.id = 'sumnu-cursor-ring';
    document.body.appendChild(dot);
    document.body.appendChild(ring);

    var mx = 0, my = 0, rx = 0, ry = 0;

    document.addEventListener('mousemove', function(e) {
      mx = e.clientX; my = e.clientY;
      dot.style.left  = mx + 'px';
      dot.style.top   = my + 'px';
    });

    // Ring follows with lag
    (function animateRing() {
      rx += (mx - rx) * 0.12;
      ry += (my - ry) * 0.12;
      ring.style.left = rx + 'px';
      ring.style.top  = ry + 'px';
      requestAnimationFrame(animateRing);
    })();

    // Grow on interactive elements
    var interactives = 'a, button, .btn, .card, .media-item, .album-card, audio';
    document.addEventListener('mouseover', function(e) {
      if (e.target.closest(interactives)) {
        dot.style.width  = '20px';
        dot.style.height = '20px';
        dot.style.background = '#e8612a';
        ring.style.width  = '52px';
        ring.style.height = '52px';
        ring.style.opacity = '0.6';
      }
    });
    document.addEventListener('mouseout', function(e) {
      if (e.target.closest(interactives)) {
        dot.style.width  = '12px';
        dot.style.height = '12px';
        dot.style.background = '#d4a843';
        ring.style.width  = '36px';
        ring.style.height = '36px';
        ring.style.opacity = '1';
      }
    });
  }

  /* ── Scroll reveal ── */
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
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el) { io.observe(el); });
  }

  /* ── Auto-add scroll reveal to key elements ── */
  function autoTagScrollReveal() {
    var selectors = [
      { sel: '.page-hero h1',        cls: 'sr' },
      { sel: '.page-hero p',         cls: 'sr sr-d1' },
      { sel: '.page-hero .btn',      cls: 'sr sr-d2' },
      { sel: '.section-title',       cls: 'sr' },
      { sel: '.section-head',        cls: 'sr' },
      { sel: '.card-pad',            cls: 'sr sr-d1' },
    ];
    selectors.forEach(function(item) {
      document.querySelectorAll(item.sel).forEach(function(el) {
        if (!el.classList.contains('sr')) {
          item.cls.split(' ').forEach(function(c) { if(c) el.classList.add(c); });
        }
      });
    });
  }

  /* ── Heading pop trigger on scroll ── */
  function initHeadingPop() {
    var h2s = document.querySelectorAll('h2');
    if (!('IntersectionObserver' in window)) {
      h2s.forEach(function(h) { h.classList.add('animated'); });
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('animated');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    h2s.forEach(function(h) { io.observe(h); });
  }

  /* ── Floating gold particles ── */
  function initParticles() {
    var count = window.matchMedia('(max-width: 760px)').matches ? 4 : 8;
    for (var i = 0; i < count; i++) {
      (function(i) {
        var p = document.createElement('div');
        p.className = 'sumnu-particle';
        p.style.left     = Math.random() * 100 + 'vw';
        p.style.bottom   = '-10px';
        p.style.width    = (Math.random() * 3 + 2) + 'px';
        p.style.height   = p.style.width;
        p.style.opacity  = (Math.random() * 0.4 + 0.2).toString();
        var dur = (Math.random() * 12 + 10).toFixed(1) + 's';
        var delay = (Math.random() * 8).toFixed(1) + 's';
        p.style.animationDuration = dur;
        p.style.animationDelay   = delay;
        document.body.appendChild(p);
      })(i);
    }
  }

  /* ── Page transition on link click ── */
  function initPageTransitions() {
    document.addEventListener('click', function(e) {
      var link = e.target.closest('a[href]');
      if (!link) return;
      var href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') ||
          href.startsWith('mailto') || href.startsWith('tel') ||
          link.target === '_blank') return;
      e.preventDefault();
      document.body.classList.add('page-leaving');
      setTimeout(function() {
        window.location.href = href;
      }, 280);
    });
  }

  /* ── Cover tilt on mousemove (desktop) ── */
  function initTilt() {
    if (window.matchMedia('(max-width: 760px)').matches) return;
    document.querySelectorAll('.card.product, .ab-available, .media-item').forEach(function(card) {
      card.addEventListener('mousemove', function(e) {
        var rect = card.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width  - 0.5;
        var y = (e.clientY - rect.top)  / rect.height - 0.5;
        card.style.transform = 
          'translateY(-6px) scale(1.02) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg)';
      });
      card.addEventListener('mouseleave', function() {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
      });
      card.addEventListener('mouseenter', function() {
        card.style.transition = 'transform 0.1s ease';
      });
    });
  }

  /* ── Gold ripple on button click ── */
  function initRipple() {
    document.querySelectorAll('.btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var r = document.createElement('span');
        var rect = btn.getBoundingClientRect();
        var size = Math.max(rect.width, rect.height) * 2;
        r.style.cssText = [
          'position:absolute',
          'border-radius:50%',
          'background:rgba(212,168,67,.35)',
          'width:' + size + 'px',
          'height:' + size + 'px',
          'left:' + (e.clientX - rect.left - size/2) + 'px',
          'top:' + (e.clientY - rect.top  - size/2) + 'px',
          'transform:scale(0)',
          'pointer-events:none',
          'transition:transform 0.5s ease, opacity 0.5s ease',
          'opacity:1'
        ].join(';');
        btn.style.position = 'relative';
        btn.style.overflow = 'hidden';
        btn.appendChild(r);
        requestAnimationFrame(function() {
          r.style.transform = 'scale(1)';
          r.style.opacity   = '0';
        });
        setTimeout(function() { r.remove(); }, 600);
      });
    });
  }

  /* ── Number counter animation ── */
  function initCounters() {
    document.querySelectorAll('[data-count]').forEach(function(el) {
      var target = parseInt(el.getAttribute('data-count'), 10);
      var io = new IntersectionObserver(function(entries) {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        var start = 0, dur = 1200, startTime = null;
        function step(ts) {
          if (!startTime) startTime = ts;
          var progress = Math.min((ts - startTime) / dur, 1);
          var ease = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(ease * target);
          if (progress < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ── Init all ── */
  function init() {
    autoTagScrollReveal();
    initScrollReveal();
    initHeadingPop();
    initParticles();
    initPageTransitions();
    initCursor();
    initTilt();
    initRipple();
    initCounters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
