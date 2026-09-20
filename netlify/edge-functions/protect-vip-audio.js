/**
 * Shared VIP audio authorization for explicit prefixes only.
 * Title-specific logic is sample allowlist config — not separate auth paths.
 *
 * Allowlists (free samples; regex also anchors [12] so Ch10/ep10 never match):
 *   Penny     a-penny-for-my-thoughts-ch1.mp3, …-ch2.mp3
 *   HET       here-eat-this-ep1.mp3, here-eat-this-ep2.mp3
 *   Jailhouse The-Jailhouse-Lawyer-Ch1.mp3, …-Ch2.mp3
 *   Still     Still-Standing-Ch1.mp3, Still-Standing-Ch2.mp3
 *
 * Protected files require Outseta VIP plan jW70XZmq.
 * Cookie `sumnu_outseta_access_token` is enough — HTML5 <audio> cannot
 * send Authorization. JWT `outseta:planUid` and Outseta AccountStage
 * 2=Trialing / 3=Subscribing must entitle (not only 1/7).
 *
 * Not gated: Echo, She Still Exists, Other Man, Unplugged, /audio/music/**,
 * /ebooks/**.
 */

import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6?target=denonext";

const DEFAULT_DOMAIN = "sumnuvision-llc.outseta.com";
const DEFAULT_PLAN_UID = "jW70XZmq";
const ACTIVE_TEXT = new Set([
  "active", "trialing", "trial", "past_due", "pastdue",
  "non_renewing", "subscribing", "cancelling", "canceling"
]);
// Outseta AccountStage: 2 Trialing, 3 Subscribing, 4 Cancelling,
// 7 Past Due, 8 Cancelling Trial. NOT 5 Expired / 6 TrialExpired / 9 Paused.
const ACTIVE_NUMERIC = new Set([2, 3, 4, 7, 8]);
const DEAD_NUMERIC = new Set([5, 6, 9]);
const TOKEN_COOKIES = ["sumnu_outseta_access_token", "Outseta.nocode.accessToken"];
const PROFILE_FIELDS = [
  "*",
  "Account.Uid",
  "Account.AccountStage",
  "Account.AccountStageLabel",
  "Account.CurrentSubscription.*",
  "Account.CurrentSubscription.Plan.*",
  "Account.Subscriptions.*",
  "PersonAccount.Account.AccountStage",
  "PersonAccount.Account.CurrentSubscription.Plan.Uid"
].join(",");

const ALLOWLIST = new Set([
  "/audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch1.mp3",
  "/audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch2.mp3",
  "/audio/series/here-eat-this/here-eat-this-ep1.mp3",
  "/audio/series/here-eat-this/here-eat-this-ep2.mp3",
  "/audio/audiobooks/the-jailhouse-lawyer/The-Jailhouse-Lawyer-Ch1.mp3",
  "/audio/audiobooks/the-jailhouse-lawyer/The-Jailhouse-Lawyer-Ch2.mp3",
  "/audio/audiobooks/still-standing/Still-Standing-Ch1.mp3",
  "/audio/audiobooks/still-standing/Still-Standing-Ch2.mp3"
]);

const ALLOWLIST_RE = [
  /\/a-penny-for-my-thoughts-ch[12]\.mp3$/i,
  /\/here-eat-this-ep[12]\.mp3$/i,
  /\/The-Jailhouse-Lawyer-Ch[12]\.mp3$/i,
  /\/Still-Standing-Ch[12]\.mp3$/i
];

let jwks = null;

function env(context, key, fallback) {
  const fromContext = context && context.env && context.env[key];
  if (fromContext) return String(fromContext).trim();
  try {
    if (typeof Deno !== "undefined" && Deno.env && typeof Deno.env.get === "function") {
      const value = Deno.env.get(key);
      if (value) return String(value).trim();
    }
  } catch (_err) {}
  return fallback;
}

function outsetaDomain(context) {
  const raw = env(context, "OUTSETA_DOMAIN", DEFAULT_DOMAIN);
  return raw.replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function planUid(context) {
  return env(context, "OUTSETA_VIP_PLAN_UID", DEFAULT_PLAN_UID);
}

function deny(status, reason) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Netlify-CDN-Cache-Control": "no-store",
      "X-Sumnu-Edge": reason || `deny-${status}`
    }
  });
}

function normalizePath(pathname) {
  try {
    return decodeURIComponent(pathname || "").split("?")[0];
  } catch (_err) {
    return pathname || "";
  }
}

function isAllowlisted(pathname) {
  const path = normalizePath(pathname);
  if (ALLOWLIST.has(path)) return true;
  return ALLOWLIST_RE.some((re) => re.test(path));
}

function readCookie(header, name) {
  if (!header) return "";
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(part.slice(idx + 1).trim());
    } catch (_err) {
      return part.slice(idx + 1).trim();
    }
  }
  return "";
}

function looksLikeJwt(value) {
  const token = String(value || "").trim().replace(/^Bearer\s+/i, "");
  const parts = token.split(".");
  if (parts.length !== 3 || token.length < 40) return false;
  try {
    let pad = parts[0].replace(/-/g, "+").replace(/_/g, "/");
    while (pad.length % 4) pad += "=";
    const json = atob(pad);
    const hdr = JSON.parse(json);
    return !!(hdr && (hdr.alg || hdr.typ === "JWT"));
  } catch (_err) {
    return false;
  }
}

function extractJwtFromValue(raw) {
  const value = String(raw || "").trim().replace(/^Bearer\s+/i, "");
  if (!value) return "";
  if (looksLikeJwt(value)) return value;
  if (value.charAt(0) === "{" || value.charAt(0) === "[") {
    try {
      const obj = JSON.parse(value);
      const keys = [
        "accessToken", "access_token", "AccessToken",
        "jwt", "id_token", "idToken", "token"
      ];
      for (const key of keys) {
        const nested = obj && obj[key];
        if (looksLikeJwt(nested)) return String(nested).trim().replace(/^Bearer\s+/i, "");
      }
      const deeper = obj && obj.tokens && (obj.tokens.accessToken || obj.tokens.access_token);
      if (looksLikeJwt(deeper)) return String(deeper).trim().replace(/^Bearer\s+/i, "");
    } catch (_err) {}
  }
  const embedded = value.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (embedded && looksLikeJwt(embedded[0])) return embedded[0];
  return "";
}

function extractToken(request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer && bearer[1]) {
    const fromAuth = extractJwtFromValue(bearer[1]);
    if (fromAuth) return fromAuth;
  }

  const cookieHeader = request.headers.get("cookie") || "";
  for (const name of TOKEN_COOKIES) {
    const value = readCookie(cookieHeader, name);
    const token = extractJwtFromValue(value);
    if (token) return token;
  }
  return "";
}

function cookieMeta(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  for (const name of TOKEN_COOKIES) {
    const value = readCookie(cookieHeader, name);
    if (value) {
      return { name, chars: value.length, jwt: !!extractJwtFromValue(value) };
    }
  }
  return { name: "", chars: 0, jwt: false };
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
    ["Subscriptions"],
    ["subscriptions"],
    ["Account", "Subscriptions"],
    ["Account", "subscriptions"],
    ["Account", "CurrentSubscription"],
    ["Account", "currentSubscription"],
    ["CurrentSubscription"],
    ["currentSubscription"],
    ["PersonAccount", "Subscriptions"],
    ["PersonAccount", "subscriptions"],
    ["PersonAccount", "Account", "CurrentSubscription"],
    ["Memberships"],
    ["memberships"],
    ["Plans"],
    ["plans"]
  ];
  const out = [];
  paths.forEach((path) => {
    asArray(getPath(user, path)).forEach((item) => out.push(item));
  });
  return out;
}

function cleanString(value) {
  return value == null ? "" : String(value).trim();
}

function statusOf(entry) {
  const raw = entry && (
    entry.Status ?? entry.status ??
    entry.SubscriptionStatus ?? entry.subscriptionStatus ??
    entry.PlanStatus ?? entry.planStatus ??
    entry.AccountStage ?? entry.accountStage ??
    entry.AccountStageLabel ?? entry.accountStageLabel ??
    entry.BillingStage ?? entry.billingStage
  );
  if (typeof raw === "number") return raw;
  const num = Number(raw);
  if (!Number.isNaN(num) && cleanString(raw) !== "") return num;
  return cleanString(raw).toLowerCase();
}

function statusIsActive(status) {
  if (typeof status === "number") return ACTIVE_NUMERIC.has(status) && !DEAD_NUMERIC.has(status);
  if (typeof status === "string" && status) return ACTIVE_TEXT.has(status);
  return false;
}

function statusIsDead(status) {
  if (typeof status === "number") return DEAD_NUMERIC.has(status);
  if (typeof status !== "string") return false;
  return status === "canceled" || status === "cancelled" || status === "expired" ||
    status === "trialexpired" || status === "trial_expired" || status === "paused";
}

function planUidOf(entry) {
  return cleanString(
    entry && (
      entry.PlanUid || entry.planUid ||
      getPath(entry, ["Plan", "Uid"]) || getPath(entry, ["plan", "uid"])
    )
  );
}

function planNameOf(entry) {
  return cleanString(
    entry && (
      entry.Name || entry.name || entry.PlanName || entry.planName ||
      getPath(entry, ["Plan", "Name"]) || getPath(entry, ["plan", "name"])
    )
  ).toLowerCase();
}

function entryLooksActive(entry, expectedPlan) {
  const status = statusOf(entry);
  const uid = planUidOf(entry);
  const planName = planNameOf(entry);
  const notDead = !statusIsDead(status);

  if (statusIsActive(status) && (!uid || uid === expectedPlan || planName.includes("vip"))) return true;
  if (uid && uid === expectedPlan && notDead) return true;
  if (planName && planName.includes("vip") && notDead) return true;
  return false;
}

function jwtPlanOf(payload) {
  if (!payload) return "";
  return cleanString(
    payload["outseta:planUid"] ||
    payload.planUid ||
    payload["outseta:PlanUid"]
  );
}

function deriveVip(profile, expectedPlan, jwtPayload) {
  const jwtPlan = jwtPlanOf(jwtPayload);
  if (jwtPlan && jwtPlan === expectedPlan) return true;

  if (profile && typeof profile === "object") {
    const candidates = collectSubscriptionCandidates(profile);
    if (candidates.some((entry) => entryLooksActive(entry, expectedPlan))) return true;

    const accountStage = statusOf(
      getPath(profile, ["Account"]) ||
      getPath(profile, ["PersonAccount", "Account"]) ||
      ""
    );
    if (statusIsActive(accountStage)) {
      const accountPlan = cleanString(
        getPath(profile, ["Account", "CurrentSubscription", "Plan", "Uid"]) ||
        getPath(profile, ["Account", "currentSubscription", "Plan", "Uid"]) ||
        getPath(profile, ["PersonAccount", "Account", "CurrentSubscription", "Plan", "Uid"])
      );
      if (!accountPlan || accountPlan === expectedPlan) return true;
    }
  }

  return false;
}

function getJwks(domain) {
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`https://${domain}/.well-known/jwks`));
  }
  return jwks;
}

async function verifyJwt(token, domain) {
  const { payload } = await jwtVerify(token, getJwks(domain), {
    clockTolerance: 30
  });
  return payload;
}

async function fetchProfile(token, domain) {
  const response = await fetch(
    `https://${domain}/api/v1/profile?fields=${encodeURIComponent(PROFILE_FIELDS)}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!response.ok) return { ok: false, status: response.status, profile: null };
  try {
    return { ok: true, status: response.status, profile: await response.json() };
  } catch (_err) {
    return { ok: false, status: response.status, profile: null };
  }
}

async function evaluateAccess(request, context) {
  const token = extractToken(request);
  const cookie = cookieMeta(request);
  const domain = outsetaDomain(context);
  const expectedPlan = planUid(context);
  const result = {
    cookiePresent: !!cookie.name,
    cookieName: cookie.name || null,
    cookieChars: cookie.chars,
    tokenChars: token.length,
    jwtExtracted: !!token,
    jwtVerified: false,
    jwtHasVipPlan: false,
    profileOk: false,
    profileHttp: 0,
    vip: false,
    reason: "no-token"
  };

  if (!token) return result;

  let payload = null;
  try {
    payload = await verifyJwt(token, domain);
    result.jwtVerified = true;
  } catch (_err) {
    payload = null;
    result.jwtVerified = false;
  }

  result.jwtHasVipPlan = jwtPlanOf(payload) === expectedPlan;

  let profile = null;
  try {
    const fetched = await fetchProfile(token, domain);
    result.profileHttp = fetched.status;
    result.profileOk = fetched.ok;
    profile = fetched.profile;
  } catch (_err) {
    profile = null;
  }

  if (!result.jwtVerified && !result.profileOk) {
    result.reason = "token-unverified";
    return result;
  }

  result.vip = deriveVip(profile, expectedPlan, payload);
  if (result.vip) {
    result.reason = result.jwtHasVipPlan ? "jwt-plan" : "profile-vip";
  } else {
    result.reason = "not-vip";
  }
  return result;
}

function applyPrivateHeaders(headers, cachePrivate, edgeTag) {
  if (cachePrivate) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Netlify-CDN-Cache-Control", "no-store");
    headers.set("Vary", "Cookie, Authorization");
  }
  if (edgeTag) headers.set("X-Sumnu-Edge", edgeTag);
}

async function passThrough(context, { cachePrivate, edgeTag }) {
  const origin = await context.next();
  try {
    applyPrivateHeaders(origin.headers, cachePrivate, edgeTag);
    return origin;
  } catch (_err) {
    const headers = new Headers(origin.headers);
    applyPrivateHeaders(headers, cachePrivate, edgeTag);
    return new Response(origin.body, {
      status: origin.status,
      statusText: origin.statusText,
      headers
    });
  }
}

export default async (request, context) => {
  const url = new URL(request.url);

  if (isAllowlisted(url.pathname)) {
    return passThrough(context, { cachePrivate: false, edgeTag: "allow-sample" });
  }

  const evalResult = await evaluateAccess(request, context);
  if (!evalResult.jwtExtracted) return deny(401, "deny-notoken");
  if (!evalResult.jwtVerified && !evalResult.profileOk) return deny(401, "deny-unverified");
  if (!evalResult.vip) return deny(403, "deny-notvip");

  return passThrough(context, { cachePrivate: true, edgeTag: "allow-vip" });
};
