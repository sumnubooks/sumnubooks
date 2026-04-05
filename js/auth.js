/* ============================================================
   SUMNU BOOKS — auth.js  (Outseta edition)

   IMPORTANT: This file no longer loads the Outseta script.
   The Outseta script tag must be placed directly in the <head>
   of every HTML page BEFORE this file is loaded.

   Add this to the <head> of every page, as the FIRST script:

   <script>
     window.outsetaOptions = { domain: 'sumnuvision-llc.outseta.com' };
   </script>
   <script src="https://cdn.outseta.com/outseta.min.js"></script>

   This file then provides the SumnuAuth helper API and fires
   the sumnu:auth event when Outseta is ready.
   ============================================================ */

(function (window, document) {

  // ── 3. HELPER: is the current user on an active paid plan? ──
  // Outseta exposes Outseta.getUser() after the widget loads.
  // A user with an active subscription will have a non-null
  // Account.CurrentSubscription object.
  function isActiveMember(user) {
    if (!user) return false;
    try {
      var acct = user.Account;
      if (!acct) return false;
      var sub = acct.CurrentSubscription;
      if (!sub) return false;
      // Status 1 = Active, Status 7 = Trialing
      return sub.NewRequiresPaymentInfo === false ||
             sub.Status === 1 ||
             sub.Status === 7 ||
             (typeof sub.Uid === 'string' && sub.Uid.length > 0);
    } catch (e) {
      return false;
    }
  }

  // ── 4. PUBLIC API ───────────────────────────────────────────
  window.SumnuAuth = {

    // Call this to get the current Outseta user object (or null)
    currentUser: function () {
      try {
        return (window.Outseta && window.Outseta.getUser)
          ? window.Outseta.getUser()
          : null;
      } catch (e) {
        return null;
      }
    },

    // Returns true if user is logged in AND has an active paid plan
    isVip: function () {
      return isActiveMember(this.currentUser());
    },

    // Open the Outseta login/register popup
    openLogin: function (redirectPath) {
      var opts = {};
      if (redirectPath) opts.redirectUri = redirectPath;
      try {
        if (window.Outseta && window.Outseta.auth) {
          window.Outseta.auth.open(opts);
        }
      } catch (e) {}
    },

    // Open the Outseta checkout / subscription popup
    openCheckout: function (planUid, redirectPath) {
      try {
        if (window.Outseta && window.Outseta.auth) {
          window.Outseta.auth.open({
            widgetMode: 'register|login',
            planUid: planUid || '',
            redirectUri: redirectPath || window.location.href
          });
        }
      } catch (e) {}
    },

    // Log the user out
    logout: function () {
      try {
        if (window.Outseta && window.Outseta.auth) {
          window.Outseta.auth.logout();
        }
      } catch (e) {}
    }
  };

  // ── 5. FIRE sumnu:auth EVENT WHEN OUTSETA IS READY ─────────
  // Outseta fires 'outseta:ready' on window when the widget boots.
  window.addEventListener('outseta:ready', function () {
    var user = window.SumnuAuth.currentUser();
    var vip  = isActiveMember(user);

    // Set data attributes on <html> so CSS can respond if needed
    document.documentElement.dataset.vip    = vip  ? 'true' : 'false';
    document.documentElement.dataset.member = user ? 'true' : 'false';

    // Dispatch for any page-level listeners
    window.dispatchEvent(new CustomEvent('sumnu:auth', {
      detail: { user: user || null, isVip: vip }
    }));
  });

  // Also re-fire on login / logout events from Outseta
  window.addEventListener('outseta:login', function () {
    var user = window.SumnuAuth.currentUser();
    var vip  = isActiveMember(user);
    document.documentElement.dataset.vip    = vip  ? 'true' : 'false';
    document.documentElement.dataset.member = user ? 'true' : 'false';
    window.dispatchEvent(new CustomEvent('sumnu:auth', {
      detail: { user: user || null, isVip: vip }
    }));
  });

  window.addEventListener('outseta:logout', function () {
    document.documentElement.dataset.vip    = 'false';
    document.documentElement.dataset.member = 'false';
    window.dispatchEvent(new CustomEvent('sumnu:auth', {
      detail: { user: null, isVip: false }
    }));
  });

})(window, document);
