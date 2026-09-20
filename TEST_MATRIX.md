# TEST MATRIX — Penny VIP Edge preview

**PREVIEW / NON-PRODUCTION ONLY. Do not merge to main.**

Fill Deploy Preview results after Netlify builds this branch. Rows that need Eric’s VIP test account are marked.

## Allowlists documented on this branch

Explicit prefixes only — **not** site-wide `/audio/**`. Live main sample counts were not changed. No missing Chandra files were invented.

| Prefix | Allowlist (logged-out 200) | Protected (logged-out 401) |
| --- | --- | --- |
| `/audio/audiobooks/a-penny-for-my-thoughts/*` | `…-ch1.mp3` (Prologue), `…-ch2.mp3` (Chapter 1) | ch3+ |
| `/audio/series/here-eat-this/*` | `here-eat-this-ep1.mp3`, `here-eat-this-ep2.mp3` (freeCount: 2) | ep3+ |
| `/audio/audiobooks/still-standing/*` | `Still-Standing-Ch1.mp3`, `Still-Standing-Ch2.mp3` | Ch3+ |
| `/audio/audiobooks/the-jailhouse-lawyer/*` | `The-Jailhouse-Lawyer-Ch1.mp3`, `The-Jailhouse-Lawyer-Ch2.mp3` | Ch3+ |
| `/audio/audiobooks/chandra/*` | `chandra-ch1.mp3`, `chandra-ch2.mp3` **if present** (none in git) | any other file in folder |

**HOLD — no Edge:** `/audio/series/the-echo-origins/*`, `/audio/series/she-still-exists/*`, `/audio/series/other-man/*` until Eric Active VIP PASS on Penny / HET / Jailhouse / Still Standing. Mid-chapter logged-out **200** is expected until then.

Out of scope (must stay ungated): `/audio/music/**`, `/audio/audiobooks/unplugged/**`, Payhip, EPUB.

Exact allowlist filenames used by Edge (regex also anchors `[12]` so Ch10/ep10 never match as samples):

- Penny: `a-penny-for-my-thoughts-ch1.mp3`, `a-penny-for-my-thoughts-ch2.mp3`
- HET: `here-eat-this-ep1.mp3`, `here-eat-this-ep2.mp3`
- Still Standing: `Still-Standing-Ch1.mp3`, `Still-Standing-Ch2.mp3`
- Jailhouse Lawyer: `The-Jailhouse-Lawyer-Ch1.mp3`, `The-Jailhouse-Lawyer-Ch2.mp3`
- Chandra: `chandra-ch1.mp3`, `chandra-ch2.mp3` (folder empty in git — no files created)

## Active VIP playback (P1)

Logged-out 401 is not enough. After login on the **preview origin**, Edge must allow protected media.

**Root cause (fixed on this branch):** Edge treated Outseta `AccountStage` `1`/`7` as active, but Outseta uses **`2` Trialing / `3` Subscribing**. JWT includes `outseta:planUid` and **no** `accountStage`, so the JWT fallback never fired. `GET /profile?fields=*` also omitted `CurrentSubscription.Plan`, so an Active VIP cookie still got **403** — player chrome visible, no sound. `<audio>` only sends the cookie (not `Authorization`).

**How Eric verifies on Deploy Preview:**

1. Open https://deploy-preview-1--sumnubooks.netlify.app/login and sign in as Active VIP.
2. Open https://deploy-preview-1--sumnubooks.netlify.app/preview-vip-audio-diag.html
3. Pass if: `pageVipFlag=true`, `cookiePresent=true`, `edgeDiag.vip=true`, `pennyCh3=200` (header `X-Sumnu-Edge: allow-vip`).
4. Play Penny / HET / Jailhouse / Still Standing **chapter 3** — expect sound + seek/Range, not a silent control bar.
5. Logged-out / private window: same chapter 3 still **401**.

JSON probe (after login, cookie sent automatically in-browser): `/__preview/vip-audio-diag`

## Extended prefix curl (Deploy Preview)

Verified **2026-09-20** after `netlify/sumnubooks/deploy-preview` **SUCCESS** on `70f3800` (`https://deploy-preview-1--sumnubooks.netlify.app`). Logged-out `curl -sI` unless noted.

An earlier curl during **PENDING** still served the old Penny-only Edge (HET/Still/Jailhouse Ch3/ep3 looked like 200). After SUCCESS, those prefixes 401.

Path patterns match live URLs (directory prefixes are lowercase; filenames keep catalog case: `Still-Standing-ChN.mp3`, `The-Jailhouse-Lawyer-ChN.mp3`). One function `protect-vip-audio` is bound to five explicit `[[edge_functions]]` paths — not `/audio/**`.

| Prefix | Sample files (expect 200) | Protected files (expect 401) | Result |
| --- | --- | --- | --- |
| Penny | ch1, ch2 | ch3, ch10 | **PASS** — ch1/ch2 **200 audio/mpeg**; ch3/ch10 **401** empty `private,no-store` |
| Here Eat This | ep1, ep2 | ep3, ep8 | **PASS** — ep1/ep2 **200**; ep3/ep8 **401**. Range on ep1 **206** |
| Still Standing | `Still-Standing-Ch1.mp3`, `Ch2` | `Ch3`, `Ch10`, lowercase `still-standing-ch3.mp3` | **PASS** — Ch1/Ch2 **200**; Ch3/Ch10/lc-Ch3 **401** |
| Jailhouse Lawyer | `The-Jailhouse-Lawyer-Ch1.mp3`, `Ch2` | `Ch3`, `Ch10` | **PASS** — Ch1/Ch2 **200**; Ch3/Ch10 **401** |
| Chandra | ch1/ch2 if present | ch3 | **PASS / no files invented** — ch1/ch2 **404**; ch3 **401** (prefix live) |
| Music (out of scope) | `/audio/music/chapter-7/1-Chapter 7 Intro.mp3`, `/audio/music/the-profit-e/01 Rest In Unpeace.mp3` | — | **PASS** — both **200 audio/mpeg** (not 401) |
| Unplugged (out of scope) | `unplugged-ch2.mp3`, `unplugged-ch3.mp3` | — | **PASS** — both **200** |
| Payhip | `https://payhip.com/b/9sX8Z` | — | **PASS** — preview landing still that URL; no Edge on Payhip |
| /login blank-panel | `panel show signed-out-box` + **Log in to my account** | — | **PASS** — still in DP HTML |
| Echo / She Still Exists / Other Man | — | **HOLD — no Edge** | Do not gate until Eric VIP PASS. Mid-chapter **200** expected |
| Active VIP protected play | cookie + JWT plan `jW70XZmq` | ch3/ep3 **200/206** + sound | Pending Eric on diag page after this deploy |

## Log only (do not delay P1)

- **Chandra:** files absent — ch1/ch2 **404**, ch3 prefix **401**. Player lists invented `chandra-chN.mp3` slots. No files created.
- **The Maytricks:** homepage path `audio/music/the-maytricks/The May Tricks 01 The Beginning.mp3` **404**. Live file is `audio/music/the-maytricks/01 The Beginning.mp3`.
- **List Complete:** `01 Forgot All About Me.mp3` **200**; later catalog names (`05 I Do Believe final jne 22 2019mix.mp3`, `10 Porn Star.mp3`) **404** — dead tracks.

## Rows

| # | Case | How to test on Deploy Preview | Result | Needs Eric VIP account? |
| --- | --- | --- | --- | --- |
| 1 | Free sample works | Open `/audiobooks` SAMPLE (ch2) and `/audiobooks/a-penny-for-my-thoughts` sample player. Logged-out `curl -I` of ch1 and ch2 should be **200**. | **PASS on Deploy Preview** (`https://deploy-preview-1--sumnubooks.netlify.app`): ch1 and ch2 return **200 audio/mpeg**. Range on ch2 returns **206**. Landing + catalog sample players load. | No |
| 2 | Logged-out cannot get protected chapters | Logged-out `curl -I` of ch3 (and any ch4+). Expect **401**, empty body, no `audio/mpeg`. Direct URL in a private window must not play. | **PASS on Deploy Preview**: ch3 returns **401**, `Cache-Control: private, no-store`, **0-byte body**. | No |
| 3 | Non-VIP cannot | Sign in with a logged-in but non-VIP Outseta user, then request ch3. Expect **403** (or 401 if no valid token cookie). | Pending. | Yes — need a non-VIP member account if Eric has one |
| 4 | Active VIP complete listen | Eric VIP on preview origin: `/preview-vip-audio-diag.html` must show `vip=true` and Penny ch3 HEAD **200**. Then play Penny / HET / Jailhouse / Still Standing ch3+ with sound (not silent chrome). | Pending Eric after VIP-derivation fix. | **Yes — Eric VIP test account** |
| 5 | Expired loses access | Expired / cancelled VIP token+profile must not unlock ch3+. After logout, cookie cleared, ch3 returns 401. | Pending. | **Yes — expired/non-entitled account or Eric after cancelling** |
| 6 | Playback / seek / chapter | VIP: play, pause, seek, ±15s, next/prev, chapter sheet. Range requests should still 206/200 via `context.next()`. | Pending. | **Yes — Eric VIP** |
| 7 | Payhip unaffected | BUY / Buy & Download still `https://payhip.com/b/9sX8Z`. No Edge on Payhip. Purchase/download flow is off-site. | **PASS (code + preview UI)**: Penny BUY / Buy & Download still `https://payhip.com/b/9sX8Z`. Unplugged audio still 200 (not gated). | No |
| 8 | Rollback exists | `ROLLBACK.md` lists exact delete/revert steps for Edge, toml, cookie bridge, STREAM CTA, landing, docs. | **Verified in repo.** | No |

## Landing copy (preview only)

Marketing final copy is on `/audiobooks/a-penny-for-my-thoughts` only. Exact strings:

- Headline: A Penny For My Thoughts
- Subhead: Street-lit thriller by E. D. Lewis. Sample free — then listen full with VIP, or buy & download to own it.
- Sample CTA: Listen free sample
- VIP CTA: Listen Full with VIP
- VIP micro: Full listen while your membership is active · Stream/listen access · Free trial available (no downloads language; no MIXEMC)
- Own CTA: Buy & Download — $12.99
- Own micro: DRM-free MP3 · Keep forever · Exclusive to SumnuBooks — not on Amazon or Audible
- Chooser: VIP = access while you’re a member. $12.99 = own the files. Sample free, then pick what fits.
- Narrator/Runtime: omitted on customer-facing preview UI until authoritative (no TBD placeholder)
- Cross-sell is footer-only (`/audiobooks.html`); does not sit on Payhip/Outseta buttons.

## Scope checks on Deploy Preview (2026-09-19)

- Unplugged sample `.../unplugged/unplugged-ch2.mp3` still **200** (Penny-only path).
- EPUB `.../ebooks/a-penny-for-my-thoughts.epub` still **200** (HOLD, no Edge).
- Preview landing `/audiobooks/a-penny-for-my-thoughts` **200**.

## Verified in this repo / against current production (pre-preview)

- Production ch1, ch2, ch3, ch49 return **200** today (no Edge on main). That is the bypass this preview is meant to stop for protected chapters.
- Production **ch50.mp3 returns 404**. Investigation only — see below. No files created, removed, or renamed.
- EPUB `https://sumnubooks.com/ebooks/a-penny-for-my-thoughts.epub` is **200**. HOLD: no Edge change.
- JWKS live at `https://sumnuvision-llc.outseta.com/.well-known/jwks`.
- Player VIP route already exists: `audiobook.html?slug=a-penny-for-my-thoughts`. STREAM on `/audiobooks` for Penny now points there and is labeled **Listen with VIP**.

## Chapter structure (owner-approved preview mapping)

Display/player mapping only. **No audio files renamed, duplicated, created, or re-encoded.** Edge allowlist still **ch1 + ch2**.

| File | Player label |
| --- | --- |
| `...-ch1.mp3` | Prologue (free) |
| `...-ch2.mp3` | Chapter 1 (free) |
| `...-ch3.mp3` … `...-ch49.mp3` | Chapter 2 … Chapter 48 (VIP / Payhip) |

Customer-facing count: **1 Prologue + 48 Chapters** (49 playable parts). Phantom ch50 slot removed.

Ch50 search (no asset to restore): git has 49 MP3s (`ch1`–`ch49`); history/LFS/alternate names/production HEAD found no `ch50`.

## EPUB / Amazon / MIXEMC hard stops

- EPUB: no Edge, no new expose, no removal.
- Amazon: no link changes.
- MIXEMC / trial: not used as a primary CTA on the Penny preview landing.

## Preview auth callback (entitlement testing)

Outseta `authenticationCallbackUrl` is `(window.location.origin || '') + '/'` so Deploy Preview login returns to `deploy-preview-1--sumnubooks.netlify.app`, not production. `/login` Log in stays `widgetMode:'login'`. Locked Penny chapters call **login**, not register-only. Cookie bridge on `/login` and the player syncs `sumnu_outseta_access_token`. Edge VIP checks unchanged.

## Env vars (preview Netlify site)

No secrets are committed. JWKS is public. Set on the preview site if you want overrides:

- `OUTSETA_DOMAIN` = `sumnuvision-llc.outseta.com`
- `OUTSETA_VIP_PLAN_UID` = `jW70XZmq`

Do not put API keys in the repo. Do not copy these into production settings unless a later, explicit production plan says so.
