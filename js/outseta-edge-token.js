/**
 * Copies the Outseta JWT from localStorage / Outseta SDK into a first-party
 * cookie so Netlify Edge can verify VIP on gated audio prefixes.
 * HTML5 <audio> cannot send Authorization.
 *
 * Site auth stays on tokenStorage: 'local'. Logout clears the cookie.
 */
(function () {
  var COOKIE = "sumnu_outseta_access_token";
  var MAX_AGE = 60 * 60 * 12;

  function clean(value) {
    return value == null ? "" : String(value).trim().replace(/^Bearer\s+/i, "");
  }

  function looksLikeJwt(value) {
    var token = clean(value);
    var parts = token.split(".");
    if (parts.length !== 3 || token.length < 40) return false;
    try {
      var pad = parts[0].replace(/-/g, "+").replace(/_/g, "/");
      while (pad.length % 4) pad += "=";
      var hdr = JSON.parse(atob(pad));
      return !!(hdr && (hdr.alg || hdr.typ === "JWT"));
    } catch (_err) {
      return false;
    }
  }

  function extractJwt(raw) {
    var value = clean(raw);
    if (!value) return "";
    if (looksLikeJwt(value)) return value;
    if (value.charAt(0) === "{" || value.charAt(0) === "[") {
      try {
        var obj = JSON.parse(value);
        var keys = ["accessToken", "access_token", "AccessToken", "jwt", "id_token", "idToken", "token"];
        for (var i = 0; i < keys.length; i++) {
          if (obj && looksLikeJwt(obj[keys[i]])) return clean(obj[keys[i]]);
        }
        if (obj && obj.tokens && looksLikeJwt(obj.tokens.accessToken)) {
          return clean(obj.tokens.accessToken);
        }
      } catch (_err) {}
    }
    var embedded = value.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
    if (embedded && looksLikeJwt(embedded[0])) return embedded[0];
    return "";
  }

  function readFromOutsetaSync() {
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
          var token = extractJwt(result);
          if (token) return token;
        } catch (_err) {}
      }
    } catch (_err) {}
    return "";
  }

  function readFromOutsetaAsync(done) {
    try {
      if (!window.Outseta) return done("");
      var fn = window.Outseta.getAccessToken ||
        (window.Outseta.auth && window.Outseta.auth.getAccessToken);
      if (typeof fn !== "function") return done("");
      var result = fn.call(window.Outseta.auth || window.Outseta);
      if (result && typeof result.then === "function") {
        result.then(function (value) { done(extractJwt(value)); }).catch(function () { done(""); });
        return;
      }
      done(extractJwt(result));
    } catch (_err) {
      done("");
    }
  }

  function readFromStorage() {
    try {
      var preferred = [
        "Outseta.nocode.accessToken",
        "outseta.accessToken",
        "outseta:accessToken"
      ];
      var i;
      for (i = 0; i < preferred.length; i++) {
        var preferredValue = localStorage.getItem(preferred[i]);
        var preferredToken = extractJwt(preferredValue);
        if (preferredToken) return preferredToken;
      }
      var keys = Object.keys(localStorage || {});
      for (i = 0; i < keys.length; i++) {
        if (!/outseta|token|jwt|access/i.test(keys[i])) continue;
        var token = extractJwt(localStorage.getItem(keys[i]));
        if (token) return token;
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

  function cookiePresent() {
    return document.cookie.split(";").some(function (part) {
      return part.trim().indexOf(COOKIE + "=") === 0;
    });
  }

  function applyToken(token) {
    if (token) setCookie(token);
    else clearCookie();
    return token;
  }

  function sync() {
    var token = readFromOutsetaSync() || readFromStorage();
    applyToken(token);
    readFromOutsetaAsync(function (asyncToken) {
      if (asyncToken) applyToken(asyncToken);
    });
    return token;
  }

  window.SumnuEdgeToken = {
    sync: sync,
    clear: clearCookie,
    present: cookiePresent
  };

  sync();
  window.addEventListener("outseta:ready", sync);
  window.addEventListener("outseta:login", sync);
  window.addEventListener("outseta:refresh", sync);
  window.addEventListener("outseta:logout", clearCookie);
  window.addEventListener("accessToken.set", sync);
  window.addEventListener("storage", sync);
  setTimeout(sync, 200);
  setTimeout(sync, 600);
  setTimeout(sync, 1600);
})();
