(function () {
  const PLAN_UID = 'jW70XZmq';
  const ACTIVE_STATUSES = new Set(['active', 'trialing', 'trial', 'past_due', 'non_renewing']);
  const state = {
    ready: false,
    user: null,
    vip: false,
    lastUserKey: '',
    lastVip: false,
    readyEmitted: false
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
    return cleanString(
      entry && (
        entry.Status || entry.status ||
        entry.SubscriptionStatus || entry.subscriptionStatus ||
        entry.PlanStatus || entry.planStatus
      )
    ).toLowerCase();
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
    if (status && ACTIVE_STATUSES.has(status)) return true;
    if (planUid && planUid === PLAN_UID && status !== 'canceled' && status !== 'cancelled' && status !== 'expired') return true;
    if (planName && planName.includes('vip') && status !== 'canceled' && status !== 'cancelled' && status !== 'expired') return true;
    return false;
  }

  function deriveVip(user) {
    if (!user || typeof user !== 'object') return false;

    const candidates = collectSubscriptionCandidates(user);
    if (candidates.some(entryLooksActive)) return true;

    const accountStatus = cleanString(
      getPath(user, ['Account', 'MembershipStatus']) ||
      getPath(user, ['Account', 'membershipStatus']) ||
      getPath(user, ['MembershipStatus']) ||
      getPath(user, ['membershipStatus'])
    ).toLowerCase();

    if (ACTIVE_STATUSES.has(accountStatus)) return true;

    return false;
  }

  async function fetchUser() {
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

  function userKey(user) {
    if (!user) return '';
    return cleanString(user.Uid || user.uid || user.Email || user.email || user.Name || user.name);
  }

  async function refreshState() {
    const user = await fetchUser();
    const vip = deriveVip(user);
    const nextUserKey = userKey(user);
    const userChanged = nextUserKey !== state.lastUserKey;
    const vipChanged = vip !== state.lastVip;

    state.user = user || null;
    state.vip = !!vip;
    state.ready = true;

    if (!state.readyEmitted) {
      state.readyEmitted = true;
      emit('outseta:ready', { user: state.user, vip: state.vip });
    }

    if (userChanged) {
      if (nextUserKey && !state.lastUserKey) emit('outseta:login', { user: state.user, vip: state.vip });
      if (!nextUserKey && state.lastUserKey) emit('outseta:logout', { user: null, vip: false });
    }

    // Only emit refresh when there's a real meaningful change
    // Don't emit if we have no user and never had one (avoids re-rendering locked state on every retry)
    const hadUser = !!state.lastUserKey;
    const hasUser = !!nextUserKey;
    if (vipChanged || (userChanged && (hadUser || hasUser))) {
      emit('outseta:refresh', { user: state.user, vip: state.vip });
    }

    state.lastUserKey = nextUserKey;
    state.lastVip = state.vip;
    document.documentElement.classList.toggle('vip-active', state.vip);
    document.documentElement.classList.toggle('vip-inactive', !state.vip);

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
    refresh: refreshState,
    login: function (redirectUri) {
      return openAuth({ widgetMode: 'login', redirectUri: redirectUri || window.location.href });
    },
    register: function (redirectUri) {
      return openAuth({ widgetMode: 'register', planUid: PLAN_UID, redirectUri: redirectUri || window.location.href });
    },
    logout: function () {
      try {
        localStorage.removeItem('vipUnlocked');
      } catch (err) {}

      try {
        if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.signOut === 'function') {
          window.Outseta.auth.signOut();
          setTimeout(refreshState, 200);
          return;
        }
      } catch (err) {}

      try {
        if (window.Outseta && window.Outseta.auth && typeof window.Outseta.auth.logout === 'function') {
          window.Outseta.auth.logout();
          setTimeout(refreshState, 200);
          return;
        }
      } catch (err) {}

      state.user = null;
      state.vip = false;
      state.lastUserKey = '';
      state.lastVip = false;
      emit('outseta:logout', { user: null, vip: false });
      emit('outseta:refresh', { user: null, vip: false });
    }
  };

  // First run at 50ms is blind (Outseta not loaded yet) — skip the DOM class toggle
  // so we don't flash vip-active on/off before we have real data.
  // All subsequent retries apply the class normally.
  const retrySchedule = [50, 300, 900, 1800, 3200, 5000];
  retrySchedule.forEach((ms, i) => {
    setTimeout(i === 0 ? async function() {
      // Quiet first probe — only update state, never touch the DOM class
      const user = await fetchUser();
      const vip = deriveVip(user);
      const nextUserKey = userKey(user);
      state.user = user || null;
      state.vip = !!vip;
      state.lastUserKey = nextUserKey;
      state.lastVip = state.vip;
      // Don't emit events or touch DOM yet — wait for the 300ms run
    } : refreshState, ms);
  });
  window.addEventListener('focus', refreshState);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refreshState();
  });
  window.addEventListener('storage', function () { setTimeout(refreshState, 50); });
})();
