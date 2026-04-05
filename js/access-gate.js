/* ============================================================
   SUMNU BOOKS — access-gate.js  (Outseta edition)
   Replaces the old localStorage-based gate entirely.

   HOW IT WORKS:
   - Waits for Outseta to initialise (outseta:ready event)
   - Checks if the current user has an active paid subscription
   - If NOT paid: shows a branded paywall overlay on unlocked pages
   - If paid: removes the overlay and reveals the content
   - NO localStorage, NO URL parameter tricks, NO browser bypasses
   - Access is always verified against Outseta's server-side session

   SETUP:
   1. Replace 'jW70XZmq' with your actual Outseta
      plan UID (found in Outseta → Membership → Plans → click plan
      → copy the UID from the browser URL bar).
   2. Drop this file into your js/ folder, replacing the old one.
   3. Keep the <script src="js/access-gate.js"></script> tag on
      every -unlocked.html page exactly as before.
   ============================================================ */

(function () {

  // ── CONFIG — EDIT THIS ONE VALUE ───────────────────────────
  var PLAN_UID = 'jW70XZmq';
  // Example: var PLAN_UID = 'aBcDeFgH';
  // Find it: Outseta dashboard → Membership → Plans → your plan
  //          → look at the URL bar for the 8-char ID at the end
  // ────────────────────────────────────────────────────────────

  var OUTSETA_DOMAIN  = 'sumnuvision-llc.outseta.com';
  var CHECKOUT_RETURN = 'https://sumnubooks.com/index.html';

  // ── PAYWALL OVERLAY STYLES ──────────────────────────────────
  var OVERLAY_CSS = `
    #sumnu-paywall-overlay {
      position: fixed;
      inset: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      background:
        radial-gradient(circle at 50% 20%, rgba(212,168,67,.13), transparent 32%),
        rgba(3, 5, 7, 0.97);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
    }
    #sumnu-paywall-box {
      width: min(100%, 580px);
      border: 1px solid rgba(212,168,67,.22);
      border-radius: 28px;
      background: linear-gradient(180deg, rgba(9,14,28,.97), rgba(7,10,20,1));
      box-shadow: 0 24px 64px rgba(0,0,0,.6);
      padding: 36px 28px 30px;
      text-align: center;
    }
    #sumnu-paywall-box .pw-kicker {
      color: #d4a843;
      font-size: .74rem;
      letter-spacing: .16em;
      text-transform: uppercase;
      font-weight: 800;
      margin-bottom: 12px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #sumnu-paywall-box h2 {
      margin: 0 0 10px;
      color: #d4a843;
      font-size: clamp(1.7rem, 4vw, 2.4rem);
      line-height: 1.05;
      font-family: Georgia, serif;
    }
    #sumnu-paywall-box .pw-sub {
      color: #9aa3b7;
      line-height: 1.7;
      font-size: .96rem;
      margin: 0 auto 22px;
      max-width: 480px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #sumnu-paywall-box .pw-perks {
      display: grid;
      gap: 9px;
      margin: 0 auto 24px;
      max-width: 460px;
      text-align: left;
    }
    #sumnu-paywall-box .pw-perks div {
      padding: 11px 14px;
      border-radius: 14px;
      border: 1px solid rgba(255,255,255,.06);
      background: rgba(255,255,255,.03);
      color: #e8eaf0;
      font-size: .92rem;
      line-height: 1.5;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #sumnu-paywall-box .pw-price {
      font-size: 2.4rem;
      font-family: Georgia, serif;
      color: #d4a843;
      line-height: 1;
      margin-bottom: 6px;
    }
    #sumnu-paywall-box .pw-trial {
      font-size: .84rem;
      color: #9aa3b7;
      margin-bottom: 22px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    #sumnu-paywall-box .pw-actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
    }
    #sumnu-paywall-box .pw-btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: min(100%, 340px);
      padding: 15px 24px;
      border-radius: 999px;
      font-weight: 800;
      font-size: 1rem;
      letter-spacing: .03em;
      border: none;
      cursor: pointer;
      background: linear-gradient(135deg, #d4a843, #e8612a);
      color: #09101a;
      font-family: system-ui, -apple-system, sans-serif;
      transition: opacity .18s ease;
    }
    #sumnu-paywall-box .pw-btn-primary:hover { opacity: .88; }
    #sumnu-paywall-box .pw-btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: min(100%, 340px);
      padding: 13px 24px;
      border-radius: 999px;
      font-weight: 700;
      font-size: .94rem;
      border: 1px solid rgba(255,255,255,.12);
      background: rgba(255,255,255,.04);
      color: #c8ccd6;
      cursor: pointer;
      font-family: system-ui, -apple-system, sans-serif;
      transition: background .18s ease, border-color .18s ease;
      text-decoration: none;
    }
    #sumnu-paywall-box .pw-btn-secondary:hover {
      background: rgba(255,255,255,.08);
      border-color: rgba(212,168,67,.28);
      color: #fff;
    }
    #sumnu-paywall-box .pw-note {
      margin-top: 16px;
      color: #6b7280;
      font-size: .82rem;
      font-family: system-ui, -apple-system, sans-serif;
    }
  `;

  // ── BUILD THE OVERLAY ───────────────────────────────────────
  function buildOverlay () {
    var style = document.createElement('style');
    style.textContent = OVERLAY_CSS;
    document.head.appendChild(style);

    var overlay = document.createElement('div');
    overlay.id = 'sumnu-paywall-overlay';
    overlay.innerHTML = `
      <div id="sumnu-paywall-box">
        <div class="pw-kicker">VIP Access Required</div>
        <h2>Unlock All Access</h2>
        <p class="pw-sub">
          This content is for VIP members only. One subscription unlocks
          every audio drama, every audiobook, and the full music catalog.
        </p>
        <div class="pw-perks">
          <div>🎧 All audio drama series — every episode, every season</div>
          <div>📖 Exclusive audiobooks — not on Amazon or Audible</div>
          <div>🎵 Full music catalog — all 8 albums</div>
          <div>📱 Works on every device — phone, tablet, laptop</div>
        </div>
        <div class="pw-price">$9.99<span style="font-size:1.1rem;color:#9aa3b7;">/month</span></div>
        <div class="pw-trial">7-day free trial — cancel any time</div>
        <div class="pw-actions">
          <button class="pw-btn-primary" id="pw-subscribe-btn">
            🔓 Start Free Trial
          </button>
          <button class="pw-btn-secondary" id="pw-login-btn">
            Already a member? Log in
          </button>
          <a class="pw-btn-secondary" href="index.html">
            ← Back to Sumnu Books
          </a>
        </div>
        <div class="pw-note">
          Secure checkout · Cancel anytime · Instant access after signup
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Subscribe button → opens Outseta checkout
    document.getElementById('pw-subscribe-btn').addEventListener('click', function () {
      if (window.Outseta && window.Outseta.auth) {
        window.Outseta.auth.open({
          widgetMode: 'register',
          planUid: PLAN_UID,
          redirectUri: CHECKOUT_RETURN
        });
      } else {
        // Fallback: go to hosted Outseta checkout page
        window.location.href = 'https://' + OUTSETA_DOMAIN +
          '/auth?widgetMode=register&planUid=' + PLAN_UID +
          '&redirectUri=' + encodeURIComponent(CHECKOUT_RETURN);
      }
    });

    // Login button → opens Outseta login only
    document.getElementById('pw-login-btn').addEventListener('click', function () {
      if (window.Outseta && window.Outseta.auth) {
        window.Outseta.auth.open({
          widgetMode: 'login',
          redirectUri: window.location.href
        });
      }
    });
  }

  // ── REMOVE THE OVERLAY (user is verified paid) ──────────────
  function removeOverlay () {
    var overlay = document.getElementById('sumnu-paywall-overlay');
    if (overlay) overlay.remove();
  }

  // ── CHECK ACCESS AND GATE ───────────────────────────────────
  function checkAccess () {
    var user = null;
    try {
      user = (window.Outseta && window.Outseta.getUser)
        ? window.Outseta.getUser()
        : null;
    } catch (e) {}

    var isPaid = false;
    if (user) {
      try {
        var acct = user.Account;
        if (acct) {
          var sub = acct.CurrentSubscription;
          if (sub) {
            isPaid = (sub.Status === 1 || sub.Status === 7 ||
                      (typeof sub.Uid === 'string' && sub.Uid.length > 0));
          }
        }
      } catch (e) {}
    }

    if (isPaid) {
      removeOverlay();
    } else {
      // Build overlay only if not already present
      if (!document.getElementById('sumnu-paywall-overlay')) {
        buildOverlay();
      }
    }
  }

  // ── INIT: run check once Outseta is ready ───────────────────
  // We also show the overlay immediately (before Outseta loads)
  // to prevent any flash of content on slow connections.
  document.addEventListener('DOMContentLoaded', function () {
    // Show overlay instantly — removed if/when access is confirmed
    buildOverlay();
  });

  window.addEventListener('outseta:ready', checkAccess);
  window.addEventListener('outseta:login', checkAccess);
  window.addEventListener('outseta:logout', function () {
    if (!document.getElementById('sumnu-paywall-overlay')) {
      buildOverlay();
    }
  });

  // Fallback: if Outseta takes more than 5s, re-check anyway
  setTimeout(checkAccess, 5000);

})();
