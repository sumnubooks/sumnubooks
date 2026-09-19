# Rollback — Penny VIP Edge preview

**This branch is PREVIEW / NON-PRODUCTION ONLY. Do not merge to main. Do not deploy these Edge rules with production production settings.**

Use these steps to remove the Penny-only Edge gate and revert preview UI before any future production discussion.

## 1. Remove the Edge Function

Delete:

- `netlify/edge-functions/protect-penny-audio.js`
- the `netlify/edge-functions/` folder if it is then empty

## 2. Remove path config

Delete `netlify.toml`, or remove this block if other Netlify config has been added later:

```toml
[[edge_functions]]
  function = "protect-penny-audio"
  path = "/audio/audiobooks/a-penny-for-my-thoughts/*"
```

## 3. Remove the cookie bridge

Delete:

- `js/outseta-edge-token.js`

Remove this script tag from:

- `audiobook.html`
- `index.html`
- `audiobooks/a-penny-for-my-thoughts.html` (if that preview page is kept)

```html
<script src="js/outseta-edge-token.js"></script>
```

(or `/js/outseta-edge-token.js` on the preview landing)

## 4. Revert the Penny STREAM CTA

In `audiobooks.html`, restore the original Penny card button:

```html
<a class="btn btn-secondary" href="audiobooks.html">▶ STREAM</a>
```

Leave Unplugged / Jailhouse / Still Standing STREAM links untouched.

## 5. Remove the preview landing

Delete:

- `audiobooks/a-penny-for-my-thoughts.html`

## 6. Remove preview docs (optional)

Delete:

- `ROLLBACK.md`
- `TEST_MATRIX.md`

## 7. Netlify env vars (preview site only)

If these were added on the Deploy Preview / branch site, they can be removed after rollback:

- `OUTSETA_DOMAIN` (default is the public domain `sumnuvision-llc.outseta.com`)
- `OUTSETA_VIP_PLAN_UID` (default is the already-public plan uid `jW70XZmq`)

No API secrets are required for JWKS + profile-with-user-token verification. Do not commit secrets. Do not add production env just because this preview existed.

## 8. Confirm after revert

- Direct URLs under `/audio/audiobooks/a-penny-for-my-thoughts/` behave as they did on main (static files, no Edge 401/403).
- Payhip `https://payhip.com/b/9sX8Z` is unchanged.
- EPUB `/ebooks/a-penny-for-my-thoughts.epub` is unchanged (HOLD).
- Amazon links are unchanged (HOLD).
- Homepage / player `freeCount` values were never changed by this branch.
