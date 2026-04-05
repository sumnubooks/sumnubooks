(function () {
  var OUTSETA_READY_TIMEOUT = 12000;

  function dispatch(name, detail) {
    window.dispatchEvent(new CustomEvent(name, { detail: detail || {} }));
  }

  function normalizeUser(raw) {
    if (!raw) return null;
    return {
      uid: raw.Uid || raw.uid || raw.Id || raw.id || "",
      email: raw.Email || raw.email || "",
      firstName: raw.FirstName || raw.firstName || "",
      lastName: raw.LastName || raw.lastName || "",
      raw: raw
    };
  }

  function extractSubscriptions(rawUser) {
    if (!rawUser) return [];

    var possible =
      rawUser.Subscriptions ||
      rawUser.subscriptions ||
      rawUser.Account?.Subscriptions ||
      rawUser.Account?.subscriptions ||
      rawUser.PersonAccount?.Subscriptions ||
      rawUser.PersonAccount?.subscriptions ||
      [];

    if (!Array.isArray(possible)) return [];
    return possible;
  }

  function isActiveSubscription(sub) {
    if (!sub) return false;

    var status =
      String(
        sub.Status ||
        sub.status ||
        sub.SubscriptionStatus ||
        ""
      ).toLowerCase();

    // Accept active/trialing style states
    if (
      status.includes("active") ||
      status.includes("trial") ||
      status.includes("current") ||
      status.includes("paid")
    ) {
      return true;
    }

    // Some installs expose boolean flags
    if (sub.IsActive === true || sub.isActive === true) return true;

    return false;
  }

  function hasPlan(sub, planUid) {
    if (!planUid) return true;

    var candidates = [
      sub.PlanUid,
      sub.planUid,
      sub.Plan?.Uid,
      sub.plan?.uid,
      sub.Plan?.uid,
      sub.Name,
      sub.name
    ].filter(Boolean).map(function (v) {
      return String(v);
    });

    return candidates.indexOf(String(planUid)) !== -1;
  }

  function buildApi() {
    var api = {
      _ready: false,
      _user: null,
      _subscriptions: [],
      _planUid: null,

      setPlanUid: function (planUid) {
        api._planUid = planUid || null;
      },

      currentUser: function () {
        return api._user;
      },

      rawUser: function () {
        return window.Outseta?.getUser ? window.Outseta.getUser() : null;
      },

      subscriptions: function () {
        return api._subscriptions.slice();
      },

      isLoggedIn: function () {
        return !!api._user;
      },

      isVip: function (planUid) {
        var wanted = planUid || api._planUid || null;
        return api._subscriptions.some(function (sub) {
          return isActiveSubscription(sub) && hasPlan(sub, wanted);
        });
      },

      login: function (opts) {
        if (window.Outseta && window.Outseta.auth) {
          window.Outseta.auth.open(
            Object.assign({ widgetMode: "login" }, opts || {})
          );
        }
      },

      signup: function (opts) {
        if (window.Outseta && window.Outseta.auth) {
          window.Outseta.auth.open(
            Object.assign({ widgetMode: "register|login" }, opts || {})
          );
        }
      },

      logout: function () {
        if (window.Outseta && window.Outseta.auth && window.Outseta.auth.signOut) {
          window.Outseta.auth.signOut();
        } else if (window.Outseta && window.Outseta.auth && window.Outseta.auth.logout) {
          window.Outseta.auth.logout();
        }
      },

      refresh: function () {
        var raw = window.Outseta?.getUser ? window.Outseta.getUser() : null;
        api._user = normalizeUser(raw);
        api._subscriptions = extractSubscriptions(raw);
        return {
          user: api._user,
          subscriptions: api._subscriptions,
          vip: api.isVip()
        };
      }
    };

    return api;
  }

  var SumnuAuth = buildApi();
  window.SumnuAuth = SumnuAuth;

  function finishReady() {
    SumnuAuth._ready = true;
    SumnuAuth.refresh();
    dispatch("outseta:ready", {
      user: SumnuAuth.currentUser(),
      vip: SumnuAuth.isVip(),
      subscriptions: SumnuAuth.subscriptions()
    });
  }

  function waitForOutseta() {
    var started = Date.now();

    function poll() {
      if (window.Outseta && typeof window.Outseta.getUser === "function") {
        finishReady();
        bindEvents();
        return;
      }

      if (Date.now() - started > OUTSETA_READY_TIMEOUT) {
        dispatch("outseta:error", { message: "Outseta failed to load." });
        return;
      }

      setTimeout(poll, 150);
    }

    poll();
  }

  function bindEvents() {
    // Re-check state whenever the page regains focus
    window.addEventListener("focus", function () {
      var before = !!SumnuAuth.currentUser();
      var state = SumnuAuth.refresh();
      var after = !!state.user;

      if (!before && after) {
        dispatch("outseta:login", state);
      } else if (before && !after) {
        dispatch("outseta:logout", state);
      }
    });

    // Also poll lightly after widget actions
    var lastEmail = SumnuAuth.currentUser()?.email || "";

    setInterval(function () {
      if (!SumnuAuth._ready) return;

      var prevLogged = !!SumnuAuth.currentUser();
      var prevEmail = SumnuAuth.currentUser()?.email || "";
      var state = SumnuAuth.refresh();
      var nextLogged = !!state.user;
      var nextEmail = state.user?.email || "";

      if (!prevLogged && nextLogged) {
        dispatch("outseta:login", state);
      } else if (prevLogged && !nextLogged) {
        dispatch("outseta:logout", state);
      } else if (prevEmail !== nextEmail || lastEmail !== nextEmail) {
        dispatch("outseta:refresh", state);
      }

      lastEmail = nextEmail;
    }, 2000);
  }

  waitForOutseta();
})();