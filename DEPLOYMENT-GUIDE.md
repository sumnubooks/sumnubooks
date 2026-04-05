# Sumnu Books — Outseta Rebuild Deployment Guide

## What You're Replacing and Why

| Old File | New File | What Changed |
|---|---|---|
| js/auth.js | js/auth.js | Removes Netlify Identity. Loads Outseta instead. |
| js/access-gate.js | js/access-gate.js | Removes localStorage bypass. Uses Outseta server-verified access. |
| unlock.html | unlock.html | Removes PayPal form. Opens Outseta checkout popup. |
| login.html | login.html | Removes Netlify Identity widget. Shows Outseta member portal. |

Everything else — your CSS, your episode pages, your music, your books, your images — stays exactly the same.

---

## Step 1 — Find Your Plan UID (Do This First)

1. Log in to your Outseta dashboard at sumnuvision-llc.outseta.com
2. Go to **Membership** in the left sidebar
3. Click **Plans**
4. Click on your VIP plan
5. Look at the URL in your browser bar — it ends with something like `/plans/aBcDeFgH`
6. Copy that 8-character string at the end

You will paste this in **two places** in the next step.

---

## Step 2 — Add Your Plan UID to the Files

Open `access-gate.js` and find this line near the top:

```
var PLAN_UID = 'PASTE_YOUR_PLAN_UID_HERE';
```

Replace `PASTE_YOUR_PLAN_UID_HERE` with your real UID. Example:

```
var PLAN_UID = 'aBcDeFgH';
```

Then open `unlock.html` and find the same line and do the same thing.
Then open `login.html` and do the same thing.

That is the only code edit you need to make.

---

## Step 3 — Configure Outseta for Popup Mode

In your Outseta dashboard:

1. Go to **Settings → Auth & SSO**
2. Make sure **Embedded Widget** is enabled (not just hosted page)
3. Under **Allowed Domains**, add `sumnubooks.com` and `www.sumnubooks.com`
4. Under **Redirect URIs after login**, add `https://sumnubooks.com/index.html`
5. Save

---

## Step 4 — Set Up Your Membership Plan in Outseta

In Outseta → Membership → Plans → your VIP plan:

- Price: $9.99/month
- Trial period: 7 days
- Make sure the plan is **Active** (not draft)

---

## Step 5 — Upload the New Files to Netlify

Upload these files to your Netlify site, replacing the old ones:

```
js/auth.js          ← replaces old auth.js
js/access-gate.js   ← replaces old access-gate.js
unlock.html         ← replaces old unlock.html
login.html          ← replaces old login.html
```

To upload via Netlify drag-and-drop:
1. Go to your Netlify dashboard
2. Open your site
3. Go to **Deploys**
4. Drag your updated site folder onto the deploy area

---

## Step 6 — Update the Nav on Your Other Pages

In each of these files, find the old "Unlock" nav link and change it to "VIP Access":

**Find:**
```html
<a href="unlock.html?from=ANYTHING" class="vip-link nav-cta">Unlock</a>
```

**Replace with:**
```html
<a href="unlock.html" class="vip-link nav-cta">VIP Access</a>
```

Pages to update:
- index.html
- books.html
- music.html
- video.html
- audiobooks.html
- contact.html
- vip-audio-dramas_netflix_mobile.html
- vip-here-eat-this.html
- vip-other-man_netflix_mobile.html
- before-our-water-breaks-vip.html

---

## Step 7 — Remove the Old Netlify Identity Script Tags

Some of your pages have this line in the `<head>`:

```html
<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>
```

Remove that line from every page that has it. The pages that currently have it are:
- unlock.html (the old one — your new one doesn't have it)
- login.html (the old one — your new one doesn't have it)
- vip-audio-dramas_netflix_mobile.html

---

## Step 8 — Test the Full Flow

Once deployed, test this exact sequence:

**Test 1 — Paywall works:**
1. Open a private/incognito browser window
2. Go to `sumnubooks.com/vip-other-man-unlocked.html` directly
3. You should see the branded paywall overlay — NOT the episode content

**Test 2 — Checkout works:**
1. On the paywall, click "Start Free Trial"
2. The Outseta checkout popup should appear
3. Complete signup with a test email
4. You should land on index.html with full access

**Test 3 — Cross-device works:**
1. On a different device or browser, go to `sumnubooks.com/unlock.html`
2. Click "Already a member? Log in"
3. Log in with the same email
4. Go to any unlocked page — content should be visible

**Test 4 — Browser trick is blocked:**
1. Open browser console (F12)
2. Type: `localStorage.setItem("vipUnlocked","true")`
3. Navigate to `sumnubooks.com/vip-other-man-unlocked.html`
4. You should STILL see the paywall — localStorage is ignored entirely

---

## What the New System Does Differently

| Old System | New System |
|---|---|
| Access stored in browser localStorage | Access stored in Outseta's database |
| Anyone can bypass with browser console | No browser bypass possible |
| Login grants free access automatically | Login only restores access if you paid |
| PayPal return URL can be faked | Outseta verifies session server-side |
| Cross-device access broken | Cross-device access works perfectly |
| Free accounts get VIP content | Free accounts see paywall |

---

## If You Need Help

If anything doesn't work after deployment, the most likely cause is the Plan UID not being set correctly. Double-check that you replaced `PASTE_YOUR_PLAN_UID_HERE` in all three files with your real Outseta plan UID.

The second most likely cause is Outseta's allowed domains not including sumnubooks.com — check Step 3 above.
