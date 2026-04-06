/* ============================================================
   SUMNU BOOKS — auth-debug.js
   Add this temporarily to index.html BEFORE auth.js to see
   exactly what Outseta.getUser() returns for your account.
   Remove after debugging.
   ============================================================ */
window.addEventListener('outseta:ready', function() {
  setTimeout(function() {
    if (!window.Outseta || !window.Outseta.getUser) {
      console.log('SUMNU DEBUG: Outseta.getUser not available');
      return;
    }

    var result = window.Outseta.getUser();

    function inspect(user) {
      console.log('=== SUMNU AUTH DEBUG ===');
      console.log('Full user object:', JSON.stringify(user, null, 2));
      
      if (!user) {
        console.log('DEBUG: No user logged in');
        return;
      }

      console.log('Email:', user.Email || user.email || 'NOT FOUND');
      
      var acct = user.Account || user.account;
      console.log('Account:', acct ? 'EXISTS' : 'NOT FOUND');
      
      if (acct) {
        var cur = acct.CurrentSubscription || acct.currentSubscription;
        console.log('CurrentSubscription:', cur ? JSON.stringify(cur) : 'NOT FOUND');
        
        if (cur) {
          console.log('BillingStage:', cur.BillingStage || cur.billingStage || 'NOT FOUND');
          console.log('Status:', cur.Status || cur.status || 'NOT FOUND');
          console.log('Plan:', cur.Plan || cur.plan || 'NOT FOUND');
        }
      }

      var subs = user.Subscriptions || user.subscriptions;
      console.log('Subscriptions array:', subs ? JSON.stringify(subs) : 'NOT FOUND');

      console.log('SumnuAuth.isVip():', window.SumnuAuth ? window.SumnuAuth.isVip() : 'SumnuAuth not loaded');
      console.log('=== END DEBUG ===');
    }

    if (result && typeof result.then === 'function') {
      result.then(inspect);
    } else {
      inspect(result);
    }
  }, 1500);
});
