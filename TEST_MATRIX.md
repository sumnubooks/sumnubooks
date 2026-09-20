# TEST MATRIX — Penny VIP Edge preview

**PREVIEW / NON-PRODUCTION ONLY. Do not merge to main.**

Fill Deploy Preview results after Netlify builds this branch. Rows that need Eric’s VIP test account are marked.

## Allowlist documented on this branch

Edge allowlists **both** current free-sample files. Live `freeCount` values on main were not changed.

| File | Why it is allowlisted |
| --- | --- |
| `/audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch1.mp3` | Homepage Penny freeCount is **1** (prologue / first file). Player `freeCount: 2` also treats ch1 as free. |
| `/audio/audiobooks/a-penny-for-my-thoughts/a-penny-for-my-thoughts-ch2.mp3` | `/audiobooks` SAMPLE clip. Player `freeCount: 2` also treats ch2 as free. |

Protected: any other path under `/audio/audiobooks/a-penny-for-my-thoughts/*` (ch3+).

Not in scope: `/audio/**` outside that Penny folder, Payhip, EPUB, Amazon.

## Rows

| # | Case | How to test on Deploy Preview | Result | Needs Eric VIP account? |
| --- | --- | --- | --- | --- |
| 1 | Free sample works | Open `/audiobooks` SAMPLE (ch2) and `/audiobooks/a-penny-for-my-thoughts` sample player. Logged-out `curl -I` of ch1 and ch2 should be **200**. | **PASS on Deploy Preview** (`https://deploy-preview-1--sumnubooks.netlify.app`): ch1 and ch2 return **200 audio/mpeg**. Range on ch2 returns **206**. Landing + catalog sample players load. | No |
| 2 | Logged-out cannot get protected chapters | Logged-out `curl -I` of ch3 (and any ch4+). Expect **401**, empty body, no `audio/mpeg`. Direct URL in a private window must not play. | **PASS on Deploy Preview**: ch3 returns **401**, `Cache-Control: private, no-store`, **0-byte body**. | No |
| 3 | Non-VIP cannot | Sign in with a logged-in but non-VIP Outseta user, then request ch3. Expect **403** (or 401 if no valid token cookie). | Pending. | Yes — need a non-VIP member account if Eric has one |
| 4 | Active VIP complete listen | Eric VIP: open `audiobook.html?slug=a-penny-for-my-thoughts`, confirm cookie `sumnu_outseta_access_token` is set, play ch3+ through later chapters. | Pending. | **Yes — Eric VIP test account** |
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

## Env vars (preview Netlify site)

No secrets are committed. JWKS is public. Set on the preview site if you want overrides:

- `OUTSETA_DOMAIN` = `sumnuvision-llc.outseta.com`
- `OUTSETA_VIP_PLAN_UID` = `jW70XZmq`

Do not put API keys in the repo. Do not copy these into production settings unless a later, explicit production plan says so.
