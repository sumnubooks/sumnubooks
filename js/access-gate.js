(function () {
  const VIP_KEY = "vipUnlocked";
  const COMPAT_KEYS = [
    "vipUnlocked",
    "here-eat-this-unlocked",
    "beforeourwaterbreaks_unlocked",
    "before-our-water-breaks-unlocked",
    "other-man-unlocked",
    "otherman_unlocked",
    "vip-other-man-unlocked"
  ];

  function hasBrowserAccess() {
    try {
      return localStorage.getItem(VIP_KEY) === "true";
    } catch (e) {
      return false;
    }
  }

  function grantBrowserAccess() {
    try {
      COMPAT_KEYS.forEach(key => localStorage.setItem(key, "true"));
    } catch (e) {}
  }

  function getSafePathFromQuery() {
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("from") || params.get("redirect") || "";
      if (!raw) return "";
      if (/^https?:/i.test(raw)) return "";
      return raw.replace(/^\//, "");
    } catch (e) {
      return "";
    }
  }

  function currentPath() {
    return (window.location.pathname || "").split("/").pop() || "index.html";
  }

  function isProtectedPage() {
    const path = currentPath().toLowerCase();
    return path.includes("-unlocked.html");
  }

  function handleVipQueryFlag() {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("vip") === "true" || params.get("paid") === "true") {
        grantBrowserAccess();
        params.delete("vip");
        params.delete("paid");
        const clean = window.location.pathname + (params.toString() ? "?" + params.toString() : "") + window.location.hash;
        history.replaceState(null, "", clean);
      }
    } catch (e) {}
  }

  function redirectToUnlock() {
    const from = encodeURIComponent(currentPath());
    window.location.href = "unlock.html?from=" + from;
  }

  handleVipQueryFlag();

  if (window.netlifyIdentity) {
    window.netlifyIdentity.on("init", function (user) {
      if (user) {
        grantBrowserAccess();
        return;
      }

      if (isProtectedPage() && !hasBrowserAccess()) {
        redirectToUnlock();
      }
    });

    window.netlifyIdentity.on("login", function () {
      grantBrowserAccess();
    });

    window.netlifyIdentity.on("logout", function () {
      // Keep browser-paid access if it exists. Do not force-lock here.
    });

    window.netlifyIdentity.init();
  } else {
    if (isProtectedPage() && !hasBrowserAccess()) {
      redirectToUnlock();
    }
  }
})();