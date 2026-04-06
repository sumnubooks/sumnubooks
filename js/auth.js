/* ============================================================
   SUMNU BOOKS — auth.js  (Outseta edition — corrected)
   Checks Account.CurrentSubscription which is what Outseta
   actually returns, not a Subscriptions array.
   ============================================================ */
(function () {
  var OUTSETA_READY_TIMEOUT = 12000;

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function normalizeUser(raw) {
    if (!raw) return null;
    return {
      uid:       raw.Uid || raw.uid || '',
      email:     raw.Email || raw.email || '',
      firstName: raw.FirstName || raw.firstName || '',
      lastName:  raw.LastName  || raw.lastName  || '',
      raw:       raw
    };
  }

  // Outseta JWT payload returns subscription at raw.Account.CurrentSubscription
  // The subscription object has Plan.Uid when active - BillingStage is NOT in JWT
  // Real data structure confirmed: { Plan: { Name, Uid }, StartDate, RenewalDate, ... }
  function hasActiveSub(rawUser) {
    if (!rawUser) return false;

    // PRIMARY: Check Account.CurrentSubscription.Plan (confirmed real structure)
    var acct = rawUser.Account || rawUser.account;
    if (acct) {
      var cur = acct.CurrentSubscription || acct.currentSubscription;
      if (cur) {
        // If there's a Plan with a Uid, the subscription is active
        var plan = cur.Plan || cur.plan;
        if (plan && (plan.Uid || plan.uid)) return true;
        // Also check BillingStage just in case full profile is loaded
        var stage = cur.BillingStage || cur.billingStage;
        if (stage === 2 || stage === 3) return true;
        // Check EndDate — if null subscription is ongoing
        var ended = cur.EndDate || cur.endDate;
        if (!ended && cur.StartDate) return true;
      }
    }

    // FALLBACK: PersonAccount array structure
    var pa = rawUser.PersonAccount || rawUser.personAccount;
    if (Array.isArray(pa)) {
      for (var i = 0; i < pa.length; i++) {
        var paAcct = (pa[i] && (pa[i].Account || pa[i].account));
        if (paAcct) {
          var paCur = paAcct.CurrentSubscription || paAcct.currentSubscription;
          if (paCur) {
            var paPlan = paCur.Plan || paCur.plan;
            if (paPlan && (paPlan.Uid || paPlan.uid)) return true;
          }
        }
      }
    }

    return false;
  }

  function buildApi() {
    var api = {
      _ready: false,
      _user:  null,
      _vip:   false,

      currentUser: function () { return api._user; },

      rawUser: function () {
        return window.Outseta && window.Outseta.getUser
          ? window.Outseta.getUser() : null;
      },

      isLoggedIn: function () { return !!api._user; },

      isVip: function () { return api._vip; },

      login: function (opts) {
        if (window.Outseta && window.Outseta.auth)
          window.Outseta.auth.open(Object.assign({ widgetMode: 'login' }, opts || {}));
      },

      signup: function (opts) {
        if (window.Outseta && window.Outseta.auth)
          window.Outseta.auth.open(Object.assign({ widgetMode: 'register' }, opts || {}));
      },

      logout: function () {
        if (window.Outseta && window.Outseta.auth) {
          if (window.Outseta.auth.signOut) window.Outseta.auth.signOut();
          else if (window.Outseta.auth.logout) window.Outseta.auth.logout();
        }
      },

      refresh: function () {
        var raw = window.Outseta && window.Outseta.getUser
          ? window.Outseta.getUser() : null;

        // getUser() can return a Promise on some versions
        if (raw && typeof raw.then === 'function') {
          raw.then(function(resolvedUser) {
            api._user = normalizeUser(resolvedUser);
            api._vip  = hasActiveSub(resolvedUser);
            dispatch('outseta:refresh', { user: api._user, vip: api._vip });
          });
          return { user: api._user, vip: api._vip };
        }

        api._user = normalizeUser(raw);
        api._vip  = hasActiveSub(raw);
        return { user: api._user, vip: api._vip };
      }
    };
    return api;
  }

  var SumnuAuth = buildApi();
  window.SumnuAuth = SumnuAuth;

  function finishReady() {
    SumnuAuth._ready = true;

    // getUser() may be async — handle both sync and Promise
    var result = window.Outseta && window.Outseta.getUser
      ? window.Outseta.getUser() : null;

    function afterGet(raw) {
      SumnuAuth._user = normalizeUser(raw);
      SumnuAuth._vip  = hasActiveSub(raw);
      dispatch('outseta:ready', { user: SumnuAuth._user, vip: SumnuAuth._vip });
      bindEvents();
    }

    if (result && typeof result.then === 'function') {
      result.then(afterGet);
    } else {
      afterGet(result);
    }
  }

  function waitForOutseta() {
    var started = Date.now();
    function poll() {
      if (window.Outseta && typeof window.Outseta.getUser === 'function') {
        finishReady();
        return;
      }
      if (Date.now() - started > OUTSETA_READY_TIMEOUT) {
        dispatch('outseta:error', { message: 'Outseta failed to load.' });
        return;
      }
      setTimeout(poll, 150);
    }
    poll();
  }

  function bindEvents() {
    // Poll every 2 seconds for auth state changes
    var prevEmail = SumnuAuth._user ? SumnuAuth._user.email : '';
    var prevVip   = SumnuAuth._vip;

    setInterval(function () {
      if (!SumnuAuth._ready) return;
      var raw = window.Outseta && window.Outseta.getUser
        ? window.Outseta.getUser() : null;

      function check(resolved) {
        var newUser = normalizeUser(resolved);
        var newVip  = hasActiveSub(resolved);
        var newEmail = newUser ? newUser.email : '';

        var wasLogged = !!prevEmail;
        var isLogged  = !!newEmail;

        SumnuAuth._user = newUser;
        SumnuAuth._vip  = newVip;

        if (!wasLogged && isLogged) {
          dispatch('outseta:login',   { user: newUser, vip: newVip });
        } else if (wasLogged && !isLogged) {
          dispatch('outseta:logout',  { user: null, vip: false });
        } else if (prevVip !== newVip) {
          dispatch('outseta:refresh', { user: newUser, vip: newVip });
        }

        prevEmail = newEmail;
        prevVip   = newVip;
      }

      if (raw && typeof raw.then === 'function') {
        raw.then(check);
      } else {
        check(raw);
      }
    }, 2000);
  }

  waitForOutseta();
})();
