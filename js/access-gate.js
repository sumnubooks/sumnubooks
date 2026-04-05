(function (window) {
  const LOGIN_PAGE = 'login.html';
  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === '1') return;

  function redirectToLogin() {
    const target = window.location.pathname + window.location.search + window.location.hash;
    window.location.replace(LOGIN_PAGE + '?redirect=' + encodeURIComponent(target));
  }

  function allow() {
    document.documentElement.dataset.gate = 'open';
  }

  function block() {
    document.documentElement.dataset.gate = 'locked';
    redirectToLogin();
  }

  function checkNow() {
    const auth = window.SumnuAuth;
    const user = auth && typeof auth.currentUser === 'function' ? auth.currentUser() : null;
    const hasVip = auth && typeof auth.readVip === 'function' ? auth.readVip() : false;
    if (user || hasVip) {
      if (auth && typeof auth.writeVip === 'function') auth.writeVip(true);
      allow();
      return;
    }
    block();
  }

  if (window.SumnuAuth && window.SumnuAuth.ready) {
    window.SumnuAuth.ready.then(checkNow).catch(block);
  } else {
    block();
  }

  window.addEventListener('sumnu:auth', function (event) {
    if (event.detail && event.detail.isVip) allow();
  });
})(window);
