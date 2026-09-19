/**
 * PREVIEW / NON-PRODUCTION ONLY
 * Protects ONLY /audio/audiobooks/a-penny-for-my-thoughts/*
 *
 * Allowlist (matches CURRENT live free-sample behavior; does not change main counts):
 *   - /audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch1.mp3
 *       Homepage Penny freeCount is 1 (prologue / first file). Player freeCount is 2.
 *   - /audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch2.mp3
 *       /audiobooks SAMPLE clip. Player freeCount includes ch2.
 *
 * Choice: allowlist BOTH ch1 and ch2 so catalog sample, homepage prologue,
 * and VIP-player free chapters keep working. All other Penny chapter files
 * require a verified Outseta VIP entitlement for plan jW70XZmq.
 *
 * Outseta verification (official):
 *   1) JWKS: https://<domain>/.well-known/jwks  + jose jwtVerify
 *   2) Fresh entitlement: GET /api/v1/profile?fields=* with Bearer token
 *      (JWT planUid can be stale after expiry)
 *
 * Pass-through uses context.next() so Range / 206 / seek still work.
 * Protected responses are Cache-Control: private, no-store so CDN cannot
 * re-serve a VIP-fetched chapter to logged-out visitors.
 *
 * EPUB: HOLD — this function does not touch /ebooks/**
 */

import { createRemoteJWKSet, jwtVerify } from "https://esm.sh/jose@5.9.6?target=denonext";

const DEFAULT_DOMAIN = "sumnuvision-llc.outseta.com";
const DEFAULT_PLAN_UID = "jW70XZmq";
const ACTIVE_TEXT = new Set(["active", "trialing", "trial", "past_due", "non_renewing", "subscribing"]);
const ACTIVE_NUMERIC = new Set([1, 7]);
const TOKEN_COOKIES = ["sumnu_outseta_access_token", "Outseta.nocode.accessToken"];

const ALLOWLIST = new Set([
  "/audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch1.mp3",
  "/audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch2.mp3"
]);

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

function deny(status) {
  return new Response(null, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "CDN-Cache-Control": "no-store",
      "Netlify-CDN-Cache-Control": "no-store"
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
  return /\/a-penny-for-my-thoughts-ch[12]\.mp3$/i.test(path);
}

function readCookie(header, name) {
  if (!header) return "";
  const parts = header.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key !== name) continue;
    return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return "";
}

function extractToken(request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const bearer = auth.match(/^Bearer\s+(.+)$/i);
  if (bearer && bearer[1]) return bearer[1].trim();

  const cookieHeader = request.headers.get("cookie") || "";
  for (const name of TOKEN_COOKIES) {
    const value = readCookie(cookieHeader, name);
    if (value && value.split(".").length === 3) return value.replace(/^Bearer\s+/i, "");
  }
  return "";
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
    entry.BillingStage ?? entry.billingStage
  );
  if (typeof raw === "number") return raw;
  const num = Number(raw);
  if (!Number.isNaN(num) && cleanString(raw) !== "") return num;
  return cleanString(raw).toLowerCase();
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
  const activeByStatus =
    (typeof status === "number" && ACTIVE_NUMERIC.has(status)) ||
    (typeof status === "string" && ACTIVE_TEXT.has(status));
  const notDead =
    status !== "canceled" &&
    status !== "cancelled" &&
    status !== "expired" &&
    status !== 3 &&
    status !== 4;

  if (activeByStatus && (!uid || uid === expectedPlan || planName.includes("vip"))) return true;
  if (uid && uid === expectedPlan && notDead) return true;
  if (planName && planName.includes("vip") && notDead) return true;
  return false;
}

function deriveVip(profile, expectedPlan, jwtPayload) {
  if (profile && typeof profile === "object") {
    const candidates = collectSubscriptionCandidates(profile);
    if (candidates.some((entry) => entryLooksActive(entry, expectedPlan))) return true;

    const accountStatus = statusOf(
      getPath(profile, ["Account", "MembershipStatus"]) ||
      getPath(profile, ["Account", "membershipStatus"]) ||
      getPath(profile, ["Account", "AccountStage"]) ||
      getPath(profile, ["Account", "accountStage"]) ||
      getPath(profile, ["MembershipStatus"]) ||
      getPath(profile, ["membershipStatus"]) ||
      ""
    );
    if (
      (typeof accountStatus === "number" && ACTIVE_NUMERIC.has(accountStatus)) ||
      (typeof accountStatus === "string" && ACTIVE_TEXT.has(accountStatus))
    ) {
      const accountPlan = cleanString(
        getPath(profile, ["Account", "CurrentSubscription", "Plan", "Uid"]) ||
        getPath(profile, ["Account", "currentSubscription", "Plan", "Uid"]) ||
        getPath(profile, ["Account", "CurrentSubscription", "plan", "uid"])
      );
      if (!accountPlan || accountPlan === expectedPlan) return true;
    }
  }

  if (jwtPayload) {
    const jwtPlan = cleanString(jwtPayload["outseta:planUid"] || jwtPayload.planUid);
    const jwtStage = cleanString(
      jwtPayload["outseta:accountStage"] ||
      jwtPayload["outseta:subscriptionStage"] ||
      jwtPayload.accountStage ||
      ""
    ).toLowerCase();
    if (jwtPlan === expectedPlan && jwtStage && ACTIVE_TEXT.has(jwtStage)) return true;
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
  const response = await fetch(`https://${domain}/api/v1/profile?fields=*`, {
    headers: { Authorization: `bearer ${token}` }
  });
  if (!response.ok) return null;
  return response.json();
}

async function passThrough(context, { cachePrivate }) {
  const origin = await context.next();
  const headers = new Headers(origin.headers);
  if (cachePrivate) {
    headers.set("Cache-Control", "private, no-store");
    headers.set("CDN-Cache-Control", "no-store");
    headers.set("Netlify-CDN-Cache-Control", "no-store");
    headers.set("Vary", "Cookie, Authorization");
  }
  return new Response(origin.body, {
    status: origin.status,
    statusText: origin.statusText,
    headers
  });
}

export default async (request, context) => {
  const url = new URL(request.url);
  if (isAllowlisted(url.pathname)) {
    return passThrough(context, { cachePrivate: false });
  }

  const token = extractToken(request);
  if (!token) return deny(401);

  const domain = outsetaDomain(context);
  const expectedPlan = planUid(context);

  let payload = null;
  try {
    payload = await verifyJwt(token, domain);
  } catch (_err) {
    return deny(401);
  }

  let profile = null;
  try {
    profile = await fetchProfile(token, domain);
  } catch (_err) {
    profile = null;
  }

  if (!profile) return deny(401);
  if (!deriveVip(profile, expectedPlan, payload)) return deny(403);

  return passThrough(context, { cachePrivate: true });
};
