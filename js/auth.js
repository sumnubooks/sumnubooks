
(function () {
  const PLAN_UID = 'jW70XZmq';
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
    nullReadsAfterLogin: 0
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
      return keys.some(k => /outseta|token|jwt|access/i.test(k) && cleanString(localStorage.getItem(k)));
    } catch (e) {
      return false;
    }
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

    const user = await fetchUserStable();
    let nextUser = user;
    let nextUserKey = userKey(nextUser);

    if (!nextUser && previousUserKey) {
      const tokenHint = hasOutsetaTokenHint();

      // Prevent flicker: do not instantly demote a signed-in user on a transient null read.
      if (tokenHint && !options.forceSignOut) {
        state.nullReadsAfterLogin += 1;
        if (state.nullReadsAfterLogin < 4) {
          nextUser = state.user;
          nextUserKey = previousUserKey;
        }
      }
    } else {
      state.nullReadsAfterLogin = 0;
    }

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
      try {
        if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.signOut === 'function') {
          window.Outseta.auth.signOut();
        } else if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.logout === 'function') {
          window.Outseta.auth.logout();
        }
      } catch (err) {}

      state.user = null;
      state.vip = false;
      state.lastUserKey = '';
      state.lastVip = false;
      state.ready = true;
      setDomFlags(false, false);
      emit('outseta:logout', { user: null, vip: false });
      emit('outseta:refresh', { user: null, vip: false });
    }
  };

  async function boot() {
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
  window.addEventListener('accessToken.set', function () { scheduleRefresh(60); });
})();
