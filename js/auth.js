(function (window, document) {
  const VIP_KEY = 'vipUnlocked';
  const WIDGET_SRC = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
  const LOGIN_PAGE = /(^|\/)login\.html$/i.test(window.location.pathname);
  let identityPromise;

  function readVip() {
    try { return localStorage.getItem(VIP_KEY) === 'true'; } catch (e) { return false; }
  }

  function writeVip(value) {
    try {
      if (value) localStorage.setItem(VIP_KEY, 'true');
      else localStorage.removeItem(VIP_KEY);
    } catch (e) {}
  }

  function setDocState(user) {
    document.documentElement.dataset.vip = user ? 'true' : 'false';
    document.documentElement.dataset.member = user ? 'true' : 'false';
  }

  function dispatch(user) {
    setDocState(user);
    window.dispatchEvent(new CustomEvent('sumnu:auth', {
      detail: { user: user || null, isVip: !!user }
    }));
  }

  function safeReload(flag) {
    if (LOGIN_PAGE) return;
    try {
      if (sessionStorage.getItem(flag) === '1') return;
      sessionStorage.setItem(flag, '1');
      window.location.reload();
    } catch (e) {}
  }

  function clearReloadFlags() {
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.indexOf('sumnu-auth-sync:') === 0) sessionStorage.removeItem(key);
      });
    } catch (e) {}
  }

  function syncUser(user) {
    const hadVip = readVip();
    const hasUser = !!user;
    const syncFlag = 'sumnu-auth-sync:' + window.location.pathname + ':' + (hasUser ? 'user' : 'guest');

    if (hasUser) {
      writeVip(true);
      clearReloadFlags();
      dispatch(user);
      if (!hadVip) safeReload(syncFlag);
      return;
    }

    if (hadVip) {
      writeVip(false);
      clearReloadFlags();
      dispatch(null);
      safeReload(syncFlag);
      return;
    }

    clearReloadFlags();
    dispatch(null);
  }

  function ensureWidget() {
    if (identityPromise) return identityPromise;
    identityPromise = new Promise((resolve, reject) => {
      if (window.netlifyIdentity) {
        resolve(window.netlifyIdentity);
        return;
      }
      const existing = document.querySelector('script[src="' + WIDGET_SRC + '"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.netlifyIdentity), { once: true });
        existing.addEventListener('error', () => reject(new Error('Netlify Identity failed to load.')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = WIDGET_SRC;
      script.async = true;
      script.onload = () => resolve(window.netlifyIdentity);
      script.onerror = () => reject(new Error('Netlify Identity failed to load.'));
      document.head.appendChild(script);
    });
    return identityPromise;
  }

  const ready = ensureWidget().then((ni) => {
    if (!ni) throw new Error('Netlify Identity not available.');
    if (!window.__SUMNU_AUTH_BOUND__) {
      window.__SUMNU_AUTH_BOUND__ = true;
      ni.on('init', syncUser);
      ni.on('login', (user) => {
        writeVip(true);
        clearReloadFlags();
        dispatch(user);
        try { ni.close(); } catch (e) {}
      });
      ni.on('logout', () => {
        writeVip(false);
        clearReloadFlags();
        dispatch(null);
      });
      ni.init();
    } else {
      try {
        const current = ni.currentUser ? ni.currentUser() : null;
        dispatch(current || null);
      } catch (e) {
        dispatch(null);
      }
    }
    return ni;
  }).catch((error) => {
    console.error(error);
    dispatch(readVip() ? { cached: true } : null);
    throw error;
  });

  window.SumnuAuth = {
    VIP_KEY,
    ready,
    readVip,
    writeVip,
    currentUser() {
      return window.netlifyIdentity && typeof window.netlifyIdentity.currentUser === 'function'
        ? window.netlifyIdentity.currentUser()
        : null;
    },
    isVip() {
      return !!this.currentUser() || readVip();
    },
    requireLogin(returnTo) {
      const target = returnTo || (window.location.pathname + window.location.search + window.location.hash);
      window.location.href = 'login.html?redirect=' + encodeURIComponent(target);
    },
    logout() {
      if (window.netlifyIdentity) return window.netlifyIdentity.logout();
      writeVip(false);
      dispatch(null);
      return Promise.resolve();
    }
  };
})(window, document);
