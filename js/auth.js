
(function () {
  const PLAN_UID = 'jW70XZmq';
  const SIGNED_OUT_KEY = 'sumnuAuthSignedOut';
  const CLEARED_TOKEN_KEY = 'sumnuAuthClearedToken';
  const KEEP_STORAGE_KEYS = new Set([
    'sumnuLastPlayed',
    'sumnuBannerDismissed',
    'splashSeen',
    SIGNED_OUT_KEY,
    CLEARED_TOKEN_KEY
  ]);
  const AUTH_STORAGE_KEYS = [
    'Outseta.nocode.accessToken',
    'Outseta.nocode.idToken'
  ];
  const AUTH_COOKIE_NAMES = [
    'sumnu_outseta_access_token',
    'Outseta.nocode.accessToken',
    'Outseta.nocode.idToken'
  ];
  const ACTIVE_TEXT_STATUSES = new Set(['active', 'trialing', 'trial', 'past_due', 'non_renewing']);
  const ACTIVE_NUMERIC_STATUSES = new Set([1, 7]);
  const state = {
    ready: false,
    user: null,
    vip: false,
    lastUserKey: '',
    lastVip: false,
    readyEmitted: false,
    booting: true,
    nullReadsAfterLogin: 0,
    signedOut: false
  };

  function emit(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function cleanString(value) {
    return (value == null ? '' : String(value)).trim();
  }

  function getPath(obj, path) {
    return path.reduce((acc, key) => (acc && acc[key] != null ? acc[key] : undefined), obj);
  }

  function asArray(value) {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  }

  function hasOutsetaTokenHint() {
    try {
      const keys = Object.keys(localStorage || {});
      return keys.some(k => isAuthStorageKey(k) && cleanString(localStorage.getItem(k)));
    } catch (e) {
      return false;
    }
  }

  function isKeepStorageKey(key) {
    if (KEEP_STORAGE_KEYS.has(key)) return true;
    if (/^sumnu_reader_/i.test(key)) return true;
    if (/^sumnuLast/i.test(key)) return true;
    if (/^sumnuBanner/i.test(key)) return true;
    if (key === 'outseta.debug' || key === 'outseta.options-override') return true;
    return false;
  }

  function isAuthStorageKey(key) {
    if (!key || isKeepStorageKey(key)) return false;
    if (AUTH_STORAGE_KEYS.indexOf(key) !== -1) return true;
    if (/^Outseta\.nocode\./i.test(key)) return true;
    if (/outseta/i.test(key) && /token|jwt|user|profile|account/i.test(key)) return true;
    if (/^(accessToken|idToken|refreshToken|access_token|id_token|refresh_token)$/i.test(key)) return true;
    return false;
  }

  function storageLooksLikeAuthValue(raw) {
    const value = cleanString(raw);
    if (!value) return false;
    if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(value)) return true;
    if (value.charAt(0) !== '{' && value.charAt(0) !== '[') return false;
    try {
      const obj = JSON.parse(value);
      if (!obj || typeof obj !== 'object') return false;
      return !!(
        obj.accessToken || obj.access_token || obj.AccessToken ||
        obj.idToken || obj.id_token || obj.refreshToken ||
        obj.tokens || obj.Uid || obj.Email
      );
    } catch (e) {
      return false;
    }
  }

  function readSignedOutFlag() {
    try {
      return sessionStorage.getItem(SIGNED_OUT_KEY) === '1';
    } catch (e) {
      return false;
    }
  }

  function snapshotAccessToken() {
    try {
      if (window.Outseta && typeof window.Outseta.getAccessToken === 'function') {
        const token = window.Outseta.getAccessToken();
        if (token && typeof token.then !== 'function') return cleanString(token);
      }
    } catch (e) {}
    try {
      return cleanString(
        localStorage.getItem('Outseta.nocode.accessToken') ||
        sessionStorage.getItem('Outseta.nocode.accessToken')
      );
    } catch (e) {
      return '';
    }
  }

  function rememberClearedToken() {
    const token = snapshotAccessToken();
    try {
      if (token) sessionStorage.setItem(CLEARED_TOKEN_KEY, token);
      else sessionStorage.removeItem(CLEARED_TOKEN_KEY);
    } catch (e) {}
  }

  function currentTokenIsFreshLogin() {
    const current = snapshotAccessToken();
    if (!current) return false;
    try {
      const cleared = sessionStorage.getItem(CLEARED_TOKEN_KEY) || '';
      return !cleared || current !== cleared;
    } catch (e) {
      return true;
    }
  }

  function setSignedOutFlag(on) {
    state.signedOut = !!on;
    try {
      if (on) sessionStorage.setItem(SIGNED_OUT_KEY, '1');
      else {
        sessionStorage.removeItem(SIGNED_OUT_KEY);
        sessionStorage.removeItem(CLEARED_TOKEN_KEY);
      }
    } catch (e) {}
  }

  function isSignedOutLatch() {
    return !!(state.signedOut || readSignedOutFlag());
  }

  function clearAuthStorage() {
    [localStorage, sessionStorage].forEach(function (store) {
      if (!store) return;
      try {
        AUTH_STORAGE_KEYS.forEach(function (key) {
          try { store.removeItem(key); } catch (e) {}
        });
        const keys = Object.keys(store);
        keys.forEach(function (key) {
          if (isAuthStorageKey(key)) {
            try { store.removeItem(key); } catch (e) {}
            return;
          }
          if (isKeepStorageKey(key)) return;
          if (/token|jwt/i.test(key) && storageLooksLikeAuthValue(store.getItem(key))) {
            try { store.removeItem(key); } catch (e) {}
          }
        });
      } catch (e) {}
    });
  }

  function clearAuthCookies() {
    if (window.SumnuEdgeToken && typeof window.SumnuEdgeToken.clearAll === 'function') {
      window.SumnuEdgeToken.clearAll();
      return;
    }
    const names = AUTH_COOKIE_NAMES.slice();
    try {
      document.cookie.split(';').forEach(function (part) {
        const name = part.split('=')[0].trim();
        if (name && /outseta|sumnu_outseta/i.test(name) && names.indexOf(name) === -1) {
          names.push(name);
        }
      });
    } catch (e) {}
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    names.forEach(function (name) {
      document.cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax' + secure;
      document.cookie = name + '=; Path=/; Max-Age=0' + secure;
    });
  }

  function clearOutsetaSdk() {
    try {
      if (window.Outseta && typeof window.Outseta.setAccessToken === 'function') {
        window.Outseta.setAccessToken(null);
      }
    } catch (e) {}
    try {
      if (window.Outseta && typeof window.Outseta.setIdToken === 'function') {
        window.Outseta.setIdToken(null);
      }
    } catch (e) {}
  }

  function blockEdgeTokenSync() {
    if (window.SumnuEdgeToken && typeof window.SumnuEdgeToken.blockUntilLogin === 'function') {
      window.SumnuEdgeToken.blockUntilLogin();
    } else {
      clearAuthCookies();
    }
  }

  function allowEdgeTokenSync() {
    if (window.SumnuEdgeToken && typeof window.SumnuEdgeToken.allowSync === 'function') {
      window.SumnuEdgeToken.allowSync();
    }
  }

  function clearAllAuthState() {
    clearOutsetaSdk();
    clearAuthStorage();
    blockEdgeTokenSync();
  }

  function markSignedInFromToken() {
    setSignedOutFlag(false);
    allowEdgeTokenSync();
  }

  function collectSubscriptionCandidates(user) {
    const paths = [
      ['Subscriptions'],
      ['subscriptions'],
      ['Account', 'Subscriptions'],
      ['Account', 'subscriptions'],
      ['Account', 'CurrentSubscription'],
      ['Account', 'currentSubscription'],
      ['CurrentSubscription'],
      ['currentSubscription'],
      ['PersonAccount', 'Subscriptions'],
      ['PersonAccount', 'subscriptions'],
      ['Memberships'],
      ['memberships'],
      ['Plans'],
      ['plans']
    ];

    const out = [];
    paths.forEach(path => {
      const value = getPath(user, path);
      asArray(value).forEach(item => out.push(item));
    });
    return out;
  }

  function statusOf(entry) {
    const raw = entry && (
      entry.Status ?? entry.status ??
      entry.SubscriptionStatus ?? entry.subscriptionStatus ??
      entry.PlanStatus ?? entry.planStatus
    );

    if (typeof raw === 'number') return raw;
    const num = Number(raw);
    if (!Number.isNaN(num) && cleanString(raw) !== '') return num;
    return cleanString(raw).toLowerCase();
  }

  function planUidOf(entry) {
    return cleanString(
      entry && (
        entry.PlanUid || entry.planUid || entry.Uid || entry.uid ||
        getPath(entry, ['Plan', 'Uid']) || getPath(entry, ['plan', 'uid'])
      )
    );
  }

  function planNameOf(entry) {
    return cleanString(
      entry && (
        entry.Name || entry.name || entry.PlanName || entry.planName ||
        getPath(entry, ['Plan', 'Name']) || getPath(entry, ['plan', 'name'])
      )
    ).toLowerCase();
  }

  function entryLooksActive(entry) {
    const status = statusOf(entry);
    const planUid = planUidOf(entry);
    const planName = planNameOf(entry);

    const activeByStatus =
      (typeof status === 'number' && ACTIVE_NUMERIC_STATUSES.has(status)) ||
      (typeof status === 'string' && ACTIVE_TEXT_STATUSES.has(status));

    const notDead =
      status !== 'canceled' &&
      status !== 'cancelled' &&
      status !== 'expired' &&
      status !== 3 &&
      status !== 4;

    if (activeByStatus) return true;
    if (planUid && planUid === PLAN_UID && notDead) return true;
    if (planName && planName.includes('vip') && notDead) return true;
    return false;
  }

  function deriveVip(user) {
    if (!user || typeof user !== 'object') return false;

    const candidates = collectSubscriptionCandidates(user);
    if (candidates.some(entryLooksActive)) return true;

    const accountStatus = statusOf(
      getPath(user, ['Account', 'MembershipStatus']) ||
      getPath(user, ['Account', 'membershipStatus']) ||
      getPath(user, ['MembershipStatus']) ||
      getPath(user, ['membershipStatus']) ||
      ''
    );

    if (
      (typeof accountStatus === 'number' && ACTIVE_NUMERIC_STATUSES.has(accountStatus)) ||
      (typeof accountStatus === 'string' && ACTIVE_TEXT_STATUSES.has(accountStatus))
    ) {
      return true;
    }

    return false;
  }

  async function fetchUserOnce() {
    try {
      if (window.Outseta && typeof window.Outseta.getUser === 'function') {
        const result = await window.Outseta.getUser();
        if (result) return result;
      }
    } catch (err) {}

    try {
      if (window.Outseta && window.Outseta.auth) {
        if (typeof window.Outseta.auth.getUser === 'function') {
          const result = await window.Outseta.auth.getUser();
          if (result) return result;
        }
        if (typeof window.Outseta.auth.getCurrentUser === 'function') {
          const result = await window.Outseta.auth.getCurrentUser();
          if (result) return result;
        }
      }
    } catch (err) {}

    return null;
  }

  async function fetchUserStable() {
    const attempts = [0, 150, 350, 700];
    let found = null;
    for (const wait of attempts) {
      if (wait) {
        await new Promise(r => setTimeout(r, wait));
      }
      const u = await fetchUserOnce();
      if (u) {
        found = u;
        break;
      }
    }
    return found;
  }

  function userKey(user) {
    if (!user) return '';
    return cleanString(
      user.Uid || user.uid ||
      user.Email || user.email ||
      user.Name || user.name
    );
  }

  function setDomFlags(vip, signedIn) {
    document.documentElement.classList.toggle('vip-active', !!vip);
    document.documentElement.classList.toggle('vip-inactive', !vip);
    document.documentElement.classList.toggle('signed-in', !!signedIn);
    document.documentElement.classList.toggle('signed-out', !signedIn);
  }

  async function refreshState(options) {
    options = options || {};
    const previousUserKey = state.lastUserKey;
    const previousVip = state.lastVip;

    if (isSignedOutLatch() && !options.allowRehydrate) {
      if (currentTokenIsFreshLogin()) {
        markSignedInFromToken();
      } else {
        state.nullReadsAfterLogin = 0;
        clearAllAuthState();
        return applyResolvedState(null, previousUserKey, previousVip);
      }
    }

    const user = await fetchUserStable();
    let nextUser = user;
    let nextUserKey = userKey(nextUser);

    if (nextUserKey) {
      markSignedInFromToken();
    }

    if (!nextUser && previousUserKey) {
      const tokenHint = hasOutsetaTokenHint();

      // Prevent flicker: do not instantly demote a signed-in user on a transient null read.
      if (tokenHint && !options.forceSignOut && !isSignedOutLatch()) {
        state.nullReadsAfterLogin += 1;
        if (state.nullReadsAfterLogin < 4) {
          nextUser = state.user;
          nextUserKey = previousUserKey;
        }
      }
    } else {
      state.nullReadsAfterLogin = 0;
    }

    return applyResolvedState(nextUser, previousUserKey, previousVip);
  }

  function applyResolvedState(nextUser, previousUserKey, previousVip) {
    let nextUserKey = userKey(nextUser);

    const nextVip = deriveVip(nextUser);
    const signedIn = !!nextUserKey;

    state.user = nextUser || null;
    state.vip = !!nextVip;
    state.ready = true;
    state.booting = false;

    if (!state.readyEmitted) {
      state.readyEmitted = true;
      emit('outseta:ready', { user: state.user, vip: state.vip });
    }

    setDomFlags(state.vip, signedIn);

    const userChanged = nextUserKey !== previousUserKey;
    const vipChanged = state.vip !== previousVip;

    if (userChanged) {
      if (nextUserKey && !previousUserKey) emit('outseta:login', { user: state.user, vip: state.vip });
      if (!nextUserKey && previousUserKey) emit('outseta:logout', { user: null, vip: false });
    }

    // Always emit refresh once ready so pages repaint reliably.
    emit('outseta:refresh', { user: state.user, vip: state.vip });

    state.lastUserKey = nextUserKey;
    state.lastVip = state.vip;

    return { user: state.user, vip: state.vip };
  }

  function openAuth(options) {
    if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.open === 'function') {
      window.Outseta.auth.open(options || {});
      return true;
    }
    return false;
  }

  window.SumnuAuth = {
    isReady: function () { return state.ready; },
    currentUser: function () { return state.user; },
    isVip: function () { return !!state.vip; },
    refresh: function () { return refreshState(); },
    login: function (redirectUri) {
      return openAuth({ widgetMode: 'login', redirectUri: redirectUri || window.location.href });
    },
    register: function (redirectUri) {
      return openAuth({ widgetMode: 'register', planUid: PLAN_UID, redirectUri: redirectUri || window.location.href });
    },
    logout: function () {
      state.nullReadsAfterLogin = 0;
      rememberClearedToken();
      setSignedOutFlag(true);

      // Official Outseta.logout() lives on the nocode module (not auth.signOut,
      // which does not exist) and redirects to "/". Clear tokens in place so
      // leftover JWTs cannot rehydrate the session after navigation.
      try {
        if (window.Outseta && typeof window.Outseta.setAccessToken === 'function') {
          window.Outseta.setAccessToken(null);
        } else if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.signOut === 'function') {
          window.Outseta.auth.signOut();
        } else if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.logout === 'function') {
          window.Outseta.auth.logout();
        }
      } catch (err) {}
      try {
        if (window.Outseta && typeof window.Outseta.setIdToken === 'function') {
          window.Outseta.setIdToken(null);
        }
      } catch (err) {}

      clearAuthStorage();
      blockEdgeTokenSync();

      state.user = null;
      state.vip = false;
      state.lastUserKey = '';
      state.lastVip = false;
      state.ready = true;
      setDomFlags(false, false);
      emit('outseta:logout', { user: null, vip: false });
      emit('outseta:refresh', { user: null, vip: false });

      // Outseta may rewrite storage asynchronously; wipe again after it settles.
      setTimeout(clearAllAuthState, 50);
      setTimeout(clearAllAuthState, 250);
      setTimeout(clearAllAuthState, 800);
    }
  };

  async function boot() {
    if (readSignedOutFlag()) {
      if (currentTokenIsFreshLogin()) {
        markSignedInFromToken();
      } else {
        state.signedOut = true;
        clearAllAuthState();
      }
    }

    // Wait for Outseta to load instead of probing too early and causing guest flashes
    const started = Date.now();
    while (!(window.Outseta && (typeof window.Outseta.getUser === 'function' || (window.Outseta.auth && typeof window.Outseta.auth.getUser === 'function')))) {
      if (Date.now() - started > 8000) break;
      await new Promise(r => setTimeout(r, 120));
    }

    await refreshState();

    // a couple of quiet follow-up reads after boot to catch the post-login hydration window
    setTimeout(refreshState, 400);
    setTimeout(refreshState, 1200);
  }

  boot();

  let refreshTimer = null;
  function scheduleRefresh(delay) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(refreshState, delay || 80);
  }

  window.addEventListener('focus', function () { scheduleRefresh(120); });
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) scheduleRefresh(150);
  });
  window.addEventListener('pageshow', function () { scheduleRefresh(120); });
  window.addEventListener('storage', function () { scheduleRefresh(80); });

  // Some Outseta builds fire auth lifecycle events; listen if present without requiring them.
  window.addEventListener('accessToken.set', function () {
    markSignedInFromToken();
    scheduleRefresh(60);
  });
  try {
    if (window.Outseta && typeof window.Outseta.on === 'function') {
      window.Outseta.on('accessToken.set', function () {
        markSignedInFromToken();
        scheduleRefresh(60);
      });
    }
  } catch (e) {}
})();
