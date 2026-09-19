/**
 * PREVIEW ONLY — copies the Outseta JWT from localStorage / Outseta SDK
 * into a first-party cookie so Netlify Edge can verify VIP on
 * /audio/audiobooks/a-penny-for-my-thoughts/* requests.
 *
 * Site auth stays on tokenStorage: 'local'. This does not change VIP
 * derivation. Logout clears the cookie.
 */
(function () {
  var COOKIE = "sumnu_outseta_access_token";
  var MAX_AGE = 60 * 60 * 12;

  function clean(value) {
    return value == null ? "" : String(value).trim().replace(/^Bearer\s+/i, "");
  }

  function looksLikeJwt(value) {
    var token = clean(value);
    return token.split(".").length === 3 && token.length > 40;
  }

  function readFromOutseta() {
    try {
      if (!window.Outseta) return "";
      var candidates = [
        window.Outseta.getAccessToken,
        window.Outseta.getJwt,
        window.Outseta.auth && window.Outseta.auth.getAccessToken,
        window.Outseta.auth && window.Outseta.auth.getJwt
      ];
      for (var i = 0; i < candidates.length; i++) {
        if (typeof candidates[i] !== "function") continue;
        try {
          var result = candidates[i].call(window.Outseta.auth || window.Outseta);
          if (result && typeof result.then === "function") continue;
          if (looksLikeJwt(result)) return clean(result);
        } catch (_err) {}
      }
    } catch (_err) {}
    return "";
  }

  function readFromStorage() {
    try {
      var keys = Object.keys(localStorage || {});
      for (var i = 0; i < keys.length; i++) {
        if (!/outseta|token|jwt|access/i.test(keys[i])) continue;
        var value = localStorage.getItem(keys[i]);
        if (looksLikeJwt(value)) return clean(value);
      }
    } catch (_err) {}
    return "";
  }

  function setCookie(token) {
    var secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = COOKIE + "=" + encodeURIComponent(token) +
      "; Path=/; Max-Age=" + MAX_AGE + "; SameSite=Lax" + secure;
  }

  function clearCookie() {
    var secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = COOKIE + "=; Path=/; Max-Age=0; SameSite=Lax" + secure;
  }

  function sync() {
    var token = readFromOutseta() || readFromStorage();
    if (token) setCookie(token);
    else clearCookie();
    return token;
  }

  window.SumnuEdgeToken = {
    sync: sync,
    clear: clearCookie
  };

  sync();
  window.addEventListener("outseta:ready", sync);
  window.addEventListener("outseta:login", sync);
  window.addEventListener("outseta:refresh", sync);
  window.addEventListener("outseta:logout", clearCookie);
  window.addEventListener("accessToken.set", sync);
  window.addEventListener("storage", sync);
  setTimeout(sync, 400);
  setTimeout(sync, 1200);
})();
