// SIMPLE GLOBAL ACCESS GATE

if (window.netlifyIdentity) {

  netlifyIdentity.on("init", user => {
    checkAccess(user);
  });

  netlifyIdentity.on("login", user => {
    checkAccess(user);
  });

  netlifyIdentity.on("logout", () => {
    window.location.href = "/login.html";
  });

}

function checkAccess(user) {

  const path = window.location.pathname.toLowerCase();

  const protectedPage =
    path.includes("vip") ||
    path.includes("unlocked");

  if (protectedPage && !user) {
    window.location.href = "/login.html?redirect=" + encodeURIComponent(window.location.href);
  }
}