(function () {
  var PLAN_UID = 'jW70XZmq';
  var CHECKOUT_RETURN = window.location.href;
  var overlayBuilt = false;
  var accessResolved = false;
  var revealTimer = null;

  var OVERLAY_CSS = '\n'
    + '#sumnu-paywall-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;background:radial-gradient(circle at 50% 20%, rgba(212,168,67,.13), transparent 32%),rgba(3,5,7,.97);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:1;transition:opacity .22s ease;}\n'
    + '#sumnu-paywall-box{width:min(100%,580px);border:1px solid rgba(212,168,67,.22);border-radius:28px;background:linear-gradient(180deg, rgba(9,14,28,.97), rgba(7,10,20,1));box-shadow:0 24px 64px rgba(0,0,0,.6);padding:36px 28px 30px;text-align:center;}\n'
    + '#sumnu-paywall-box .pw-kicker{color:#d4a843;font-size:.74rem;letter-spacing:.16em;text-transform:uppercase;font-weight:800;margin-bottom:12px;font-family:system-ui,-apple-system,sans-serif;}\n'
    + '#sumnu-paywall-box h2{margin:0 0 10px;color:#d4a843;font-size:clamp(1.7rem,4vw,2.4rem);line-height:1.05;font-family:Georgia,serif;}\n'
    + '#sumnu-paywall-box .pw-sub{color:#9aa3b7;line-height:1.7;font-size:.96rem;margin:0 auto 22px;max-width:480px;font-family:system-ui,-apple-system,sans-serif;}\n'
    + '#sumnu-paywall-box .pw-perks{display:grid;gap:9px;margin:0 auto 24px;max-width:460px;text-align:left;}\n'
    + '#sumnu-paywall-box .pw-perks div{padding:11px 14px;border-radius:14px;border:1px solid rgba(255,255,255,.06);background:rgba(255,255,255,.03);color:#e8eaf0;font-size:.92rem;line-height:1.5;font-family:system-ui,-apple-system,sans-serif;}\n'
    + '#sumnu-paywall-box .pw-price{font-size:2.4rem;font-family:Georgia,serif;color:#d4a843;line-height:1;margin-bottom:6px;}\n'
    + '#sumnu-paywall-box .pw-trial{font-size:.84rem;color:#9aa3b7;margin-bottom:22px;font-family:system-ui,-apple-system,sans-serif;}\n'
    + '#sumnu-paywall-box .pw-actions{display:flex;flex-direction:column;gap:12px;align-items:center;}\n'
    + '#sumnu-paywall-box .pw-btn-primary{display:inline-flex;align-items:center;justify-content:center;width:min(100%,340px);padding:15px 24px;border-radius:999px;font-weight:800;font-size:1rem;letter-spacing:.03em;border:none;cursor:pointer;background:linear-gradient(135deg, #d4a843, #e8612a);color:#09101a;font-family:system-ui,-apple-system,sans-serif;transition:opacity .18s ease;}\n'
    + '#sumnu-paywall-box .pw-btn-primary:hover{opacity:.88;}\n'
    + '#sumnu-paywall-box .pw-btn-secondary{display:inline-flex;align-items:center;justify-content:center;width:min(100%,340px);padding:13px 24px;border-radius:999px;font-weight:700;font-size:.94rem;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#c8ccd6;cursor:pointer;font-family:system-ui,-apple-system,sans-serif;transition:background .18s ease,border-color .18s ease;text-decoration:none;}\n'
    + '#sumnu-paywall-box .pw-btn-secondary:hover{background:rgba(255,255,255,.08);border-color:rgba(212,168,67,.28);color:#fff;}\n'
    + '#sumnu-paywall-box .pw-note{margin-top:16px;color:#6b7280;font-size:.82rem;font-family:system-ui,-apple-system,sans-serif;}\n'
    + 'html.sumnu-gate-pending body{visibility:hidden !important;}\n'
    + 'html.sumnu-gate-ready body{visibility:visible !important;}\n';

  function injectCssOnce() {
    if (document.getElementById('sumnu-paywall-style')) return;
    var style = document.createElement('style');
    style.id = 'sumnu-paywall-style';
    style.textContent = OVERLAY_CSS;
    document.head.appendChild(style);
  }

  function revealPage() {
    if (accessResolved) return;
    accessResolved = true;
    document.documentElement.classList.remove('sumnu-gate-pending');
    document.documentElement.classList.add('sumnu-gate-ready');
    if (revealTimer) {
      clearTimeout(revealTimer);
      revealTimer = null;
    }
  }

  function buildOverlay() {
    injectCssOnce();
    if (overlayBuilt && document.getElementById('sumnu-paywall-overlay')) return;

    var overlay = document.createElement('div');
    overlay.id = 'sumnu-paywall-overlay';
    overlay.innerHTML = ''
      + '<div id="sumnu-paywall-box">'
      +   '<div class="pw-kicker">VIP Access Required</div>'
      +   '<h2>Unlock All Access</h2>'
      +   '<p class="pw-sub">This content is for VIP members only. One subscription unlocks every audio drama, every audiobook, and the full music catalog.</p>'
      +   '<div class="pw-perks">'
      +     '<div>🎧 All audio drama series — every episode, every season</div>'
      +     '<div>📖 Exclusive audiobooks — not on Amazon or Audible</div>'
      +     '<div>🎵 Full music catalog — all 8 albums</div>'
      +     '<div>📱 Works on every device — phone, tablet, laptop</div>'
      +   '</div>'
      +   '<div class="pw-price">$9.99<span style="font-size:1.1rem;color:#9aa3b7;">/month</span></div>'
      +   '<div class="pw-trial">7-day free trial — cancel any time</div>'
      +   '<div class="pw-actions">'
      +     '<button class="pw-btn-primary" id="pw-subscribe-btn">🔓 Start Free Trial</button>'
      +     '<button class="pw-btn-secondary" id="pw-login-btn">Already a member? Log in</button>'
      +     '<a class="pw-btn-secondary" href="/">← Back to Sumnu Books</a>'
      +   '</div>'
      +   '<div class="pw-note">Secure checkout · Cancel anytime · Instant access after signup</div>'
      + '</div>';

    document.body.appendChild(overlay);
    overlayBuilt = true;

    var subscribeBtn = document.getElementById('pw-subscribe-btn');
    var loginBtn = document.getElementById('pw-login-btn');

    if (subscribeBtn) {
      subscribeBtn.addEventListener('click', function () {
        if (window.SumnuAuth && typeof window.SumnuAuth.register === 'function') {
          window.SumnuAuth.register(CHECKOUT_RETURN);
          return;
        }
        if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.open === 'function') {
          window.Outseta.auth.open({ widgetMode: 'register', planUid: PLAN_UID, redirectUri: CHECKOUT_RETURN });
        }
      });
    }

    if (loginBtn) {
      loginBtn.addEventListener('click', function () {
        if (window.SumnuAuth && typeof window.SumnuAuth.login === 'function') {
          window.SumnuAuth.login(window.location.href);
          return;
        }
        if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.open === 'function') {
          window.Outseta.auth.open({ widgetMode: 'login', redirectUri: window.location.href });
        }
      });
    }
  }

  function removeOverlay() {
    var overlay = document.getElementById('sumnu-paywall-overlay');
    if (!overlay) return;
    overlay.style.opacity = '0';
    setTimeout(function () {
      if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 220);
  }

  function gateToCurrentState() {
    var vip = !!(window.SumnuAuth && typeof window.SumnuAuth.isVip === 'function' && window.SumnuAuth.isVip());
    revealPage();
    if (vip) {
      removeOverlay();
    } else {
      buildOverlay();
    }
  }

  function refreshAndGate(reason) {
    if (window.SumnuAuth && typeof window.SumnuAuth.refresh === 'function') {
      Promise.resolve(window.SumnuAuth.refresh(reason || 'access-gate')).finally(gateToCurrentState);
      return;
    }
    gateToCurrentState();
  }

  document.documentElement.classList.add('sumnu-gate-pending');
  injectCssOnce();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      refreshAndGate('dom-ready');
    });
  } else {
    refreshAndGate('immediate');
  }

  window.addEventListener('outseta:ready', gateToCurrentState);
  window.addEventListener('outseta:login', gateToCurrentState);
  window.addEventListener('outseta:logout', gateToCurrentState);
  window.addEventListener('outseta:refresh', gateToCurrentState);

  revealTimer = setTimeout(function () {
    refreshAndGate('failsafe');
  }, 9000);
})();
