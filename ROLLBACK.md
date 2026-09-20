# Rollback — VIP Edge access control

This document matches the clean production PR only (Penny, Here Eat This, Jailhouse Lawyer, Still Standing). It does not include preview diagnostics, Chandra, Echo / She Still Exists / Other Man, or Penny landing-page work.

Use these steps to remove the VIP audio Edge gates and revert the auth/playback wiring.

## 1. Remove the Edge Function

Delete:

- `netlify/edge-functions/protect-vip-audio.js`
- the `netlify/edge-functions/` folder if it is then empty

## 2. Remove path config

Delete `netlify.toml`, or remove every `protect-vip-audio` `[[edge_functions]]` block:

- `/audio/audiobooks/a-penny-for-my-thoughts/*`
- `/audio/series/here-eat-this/*`
- `/audio/audiobooks/the-jailhouse-lawyer/*`
- `/audio/audiobooks/still-standing/*`

Do not leave a leftover site-wide `/audio/**` rule. Echo / She Still Exists / Other Man / Chandra / Unplugged / music were never gated by this PR.

## 3. Remove the cookie bridge

Delete:

- `js/outseta-edge-token.js`

Remove this script tag from:

- `audiobook.html`
- `series.html`
- `login.html`
- `unlock.html`

```html
<script src="js/outseta-edge-token.js"></script>
```

## 4. Revert player / login / unlock auth wiring

Restore these files to main (or revert the listed behaviors):

- `audiobook.html`
  - `authenticationCallbackUrl` back to `https://sumnubooks.com/`
  - remove `SumnuEdgeToken.sync()` before play / chapter load
  - locked chapters back to register-only (`widgetMode:'register'` / `unlock.html`)
- `series.html`
  - same callback, sync-before-play, and login-first revert as `audiobook.html`
- `login.html`
  - callback and `RETURN_URL` back to `https://sumnubooks.com/`
  - signed-out panel no longer visible immediately (`class="panel signed-out-box"` without `show`; login control as a `<button>`)
  - remove hosted existing-member login fallback
- `unlock.html`
  - callback and `RETURN_URL` back to `https://sumnubooks.com/`
  - remove login `redirectUri` and hosted-login fallback

Do not revert catalog, landing, STREAM CTAs, or homepage chapter mapping — this PR does not change those.

## 5. Remove this rollback doc

Delete:

- `ROLLBACK.md`

## 6. Netlify env vars (optional)

If these were added on the Netlify site, they can be removed after rollback:

- `OUTSETA_DOMAIN` (default is the public domain `sumnuvision-llc.outseta.com`)
- `OUTSETA_VIP_PLAN_UID` (default is the already-public plan uid `jW70XZmq`)

No API secrets are required for JWKS + profile-with-user-token verification. Do not commit secrets.

## 7. Confirm after revert

Logged-out `curl -sI` of these URLs must behave as static files again (no Edge `401` / `403`, no `X-Sumnu-Edge` header):

| Prefix | Sample | Mid / protected |
| --- | --- | --- |
| `/audio/audiobooks/a-penny-for-my-thoughts/` | `a-penny-for-my-thoughts-ch1.mp3`, `…-ch2.mp3` | `…-ch3.mp3` |
| `/audio/series/here-eat-this/` | `here-eat-this-ep1.mp3`, `here-eat-this-ep2.mp3` | `here-eat-this-ep3.mp3` |
| `/audio/audiobooks/the-jailhouse-lawyer/` | `The-Jailhouse-Lawyer-Ch1.mp3`, `…-Ch2.mp3` | `The-Jailhouse-Lawyer-Ch3.mp3` |
| `/audio/audiobooks/still-standing/` | `Still-Standing-Ch1.mp3`, `…-Ch2.mp3` | `Still-Standing-Ch3.mp3` |

After revert, all eight sample files and all four mid-chapter/episode files should return **200** `audio/mpeg` (or the same status they had on main before this PR).

Also confirm still ungated (unchanged by this PR, and still unchanged after rollback):

- `/audio/audiobooks/unplugged/unplugged-ch3.mp3`
- `/audio/series/the-echo-origins/` (mid episode)
- `/audio/series/she-still-exists/` (mid episode)
- `/audio/series/other-man/` (mid episode)
- `/audio/music/**`
- `/ebooks/**`
