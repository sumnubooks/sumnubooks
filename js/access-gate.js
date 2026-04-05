(function () {
  var PLAN_UID = "jW70XZmq";
  var LOGIN_URL = "login.html";
  var UNLOCK_URL = "unlock.html";

  function currentFile() {
    var path = window.location.pathname || "";
    var name = path.split("/").pop() || "index.html";
    return name;
  }

  function buildReturnUrl(targetFile) {
    return targetFile + "?redirect=" + encodeURIComponent(currentFile());
  }

  function showOverlay() {
    if (document.getElementById("vipGateOverlay")) return;

    var overlay = document.createElement("div");
    overlay.id = "vipGateOverlay";
    overlay.setAttribute("aria-hidden", "false");
    overlay.innerHTML = `
      <div class="vip-gate-backdrop"></div>
      <div class="vip-gate-card">
        <div class="vip-gate-kicker">VIP Access Required</div>
        <h2>Unlock this content</h2>
        <p>
          This page is part of your premium membership. Start your free trial
          or log in to continue.
        </p>
        <div class="vip-gate-actions">
          <a class="vip-gate-btn vip-gate-primary" href="${buildReturnUrl(UNLOCK_URL)}">Start Free Trial</a>
          <a class="vip-gate-btn vip-gate-secondary" href="${buildReturnUrl(LOGIN_URL)}">Log In</a>
        </div>
      </div>
    `;

    var css = document.createElement("style");
    css.id = "vipGateStyles";
    css.textContent = `
      #vipGateOverlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        display: grid;
        place-items: center;
      }
      .vip-gate-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(3,7,18,.82);
        backdrop-filter: blur(10px);
      }
      .vip-gate-card {
        position: relative;
        z-index: 2;
        width: min(92vw, 560px);
        padding: 28px 24px;
        border-radius: 28px;
        border: 1px solid rgba(212,168,67,.18);
        background: linear-gradient(180deg, rgba(9,14,28,.96), rgba(7,10,20,.99));
        box-shadow: 0 18px 50px rgba(0,0,0,.45);
        text-align: center;
        color: #edf1f7;
      }
      .vip-gate-kicker {
        color: #d4a843;
        font-size: .74rem;
        letter-spacing: .16em;
        text-transform: uppercase;
        font-weight: 800;
        margin-bottom: 10px;
      }
      .vip-gate-card h2 {
        margin: 0 0 10px;
        color: #d4a843;
        font-size: clamp(1.8rem, 4vw, 2.5rem);
        line-height: 1;
      }
      .vip-gate-card p {
        margin: 0 0 18px;
        color: #aeb6c8;
        line-height: 1.7;
      }
      .vip-gate-actions {
        display: flex;
        gap: 12px;
        justify-content: center;
        flex-wrap: wrap;
      }
      .vip-gate-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 180px;
        padding: 13px 18px;
        border-radius: 999px;
        text-decoration: none;
        font-weight: 800;
      }
      .vip-gate-primary {
        background: linear-gradient(135deg, #d4a843, #e8612a);
        color: #09101a;
      }
      .vip-gate-secondary {
        border: 1px solid rgba(255,255,255,.12);
        background: rgba(255,255,255,.05);
        color: #edf1f7;
      }
    `;
    document.head.appendChild(css);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  }

  function clearOverlay() {
    var overlay = document.getElementById("vipGateOverlay");
    if (overlay) overlay.remove();
    document.body.style.overflow = "";
  }

  function isProtectedPage() {
    var file = currentFile().toLowerCase();
    return file.indexOf("-unlocked.html") !== -1;
  }

  function checkGate() {
    if (!window.SumnuAuth) return;

    var loggedIn = window.SumnuAuth.isLoggedIn();
    var vip = window.SumnuAuth.isVip(PLAN_UID);

    if (!isProtectedPage()) {
      clearOverlay();
      return;
    }

    if (loggedIn && vip) {
      clearOverlay();
      return;
    }

    showOverlay();
  }

  window.addEventListener("outseta:ready", checkGate);
  window.addEventListener("outseta:login", checkGate);
  window.addEventListener("outseta:logout", checkGate);
  window.addEventListener("outseta:refresh", checkGate);

  document.addEventListener("DOMContentLoaded", function () {
    setTimeout(checkGate, 400);
  });
})();