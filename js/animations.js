/* ============================================================
   SUMNU BOOKS — animations.js  (mobile-safe, canvas gold dust)
   NO click handlers. NO page transitions. Safe for all pages.
   ============================================================ */
(function() {

  /* ── Canvas gold dust particle system ── */
  function initParticles() {
    var canvas = document.createElement('canvas');
    canvas.id = 'gold-dust';
    canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:1;';
    // Push all page content above the canvas
    var style = document.createElement('style');
    style.textContent = 'header,main,footer,nav,section,.card,.card-tile,.media-item,.album-card,.product,.ab-available,.ab-upcoming,.shelf,.container,.logo-band { position:relative; z-index:2; }';
    document.head.appendChild(style);
    document.body.appendChild(canvas);

    var ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    var particles = [];
    for (var i = 0; i < 140; i++) {
      particles.push({
        x:       Math.random() * canvas.width,
        y:       Math.random() * canvas.height,
        radius:  Math.random() * 2.8 + 0.8,
        speedY:  Math.random() * 0.4 + 0.1,
        opacity: Math.random() * 0.3 + 0.1
      });
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(function(p) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212,175,55,' + p.opacity + ')';
        ctx.shadowColor = 'rgba(255,215,0,0.9)';
        ctx.shadowBlur  = 5;
        ctx.fill();
        p.y += p.speedY;
        if (p.y > canvas.height) {
          p.y = 0;
          p.x = Math.random() * canvas.width;
        }
      });
      requestAnimationFrame(draw);
    }
    draw();

    window.addEventListener('resize', function() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
    });
  }

  /* ── Scroll reveal — only adds a CSS class, zero click logic ── */
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
