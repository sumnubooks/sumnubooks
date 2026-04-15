# SUMNUBOOKS SITE NOTES — READ BEFORE MAKING CHANGES

## 1) CURRENT STABILITY RULE
Do not patch random sections of the homepage without checking the auth flow first.

This site had instability because:
- VIP state was flipping between signed-in and guest
- homepage shelves were injected by JavaScript
- some sections depended on auth events firing in the right order
- visual sections were duplicated on the VIP homepage

Before changing anything, back up:
- index.html
- login.html
- js/auth.js

---

## 2) SINGLE SOURCE OF TRUTH FOR LOGIN / VIP
VIP state must come from:

- `js/auth.js`

The rest of the site should treat `window.SumnuAuth` as the source of truth.

Functions currently expected by pages:
- `window.SumnuAuth.isVip()`
- `window.SumnuAuth.currentUser()`
- `window.SumnuAuth.refresh()`
- `window.SumnuAuth.login()`
- `window.SumnuAuth.register()`
- `window.SumnuAuth.logout()`

Important:
Do NOT build a second paywall system on top of this.
Do NOT reintroduce old overlay gate logic unless it is fully synced with `auth.js`.

---

## 3) AUTH EVENTS THE SITE EXPECTS
Several pages react to these events:

- `outseta:ready`
- `outseta:login`
- `outseta:logout`
- `outseta:refresh`

If `auth.js` is changed in the future, it must keep emitting those events or pages may:
- show guest state by mistake
- blank shelf content
- flicker between states
- lose “Welcome back” behavior

---

## 4) HOMEPAGE IS PARTLY JS-RENDERED
The homepage is not fully hard-coded.
Some card shelves are rendered into:

- `#seriesGrid`
- `#audiobookGrid`
- `#musicGrid`

That means homepage bugs may come from JavaScript even when the HTML looks fine.

If shelves disappear:
1. check `js/auth.js`
2. check whether `renderShelves()` is still being called
3. check browser back/forward behavior
4. check whether auth events are firing

---

## 5) VISUAL DIRECTION FOR VIP HOMEPAGE
Preferred VIP homepage direction:

Keep:
- logo
- “Welcome back, Eric”
- main content shelves
- actual radio section lower on page

Remove / avoid:
- duplicate quick-access blocks
- duplicate “continue listening” controls
- fake radio placeholder tile
- unnecessary helper text
- oversized buttons
- oversized cover cards
- extra pill rows under welcome section

Rule:
VIP homepage should feel cleaner than the public homepage, not busier.

---

## 6) DO NOT TOUCH THESE UNLESS NECESSARY
These are working well enough and should not be casually rewritten:

- books page
- audiobooks page
- video page
- music page
- splash screen
- floating gold dot effect

If changes are needed, make them page-specific.
Do not make global visual changes without testing the homepage first.

---

## 7) LOCAL STORAGE USAGE
Local storage was being used for progress / resume behavior, not as the main VIP unlock system.

Do NOT use local storage as the main paid-access authority.
Use it only for:
- player progress
- last played item
- UI preferences if needed

Paid access should continue to come from Outseta + `auth.js`.

---

## 8) BEFORE ANY FUTURE UPGRADE
Make a backup copy of:
- index.html
- login.html
- js/auth.js
- js/main.js
- js/data.js

Suggested folder:
- `/backup-before-change/`

Example file names:
- `index-backup-YYYY-MM-DD.html`
- `login-backup-YYYY-MM-DD.html`
- `auth-backup-YYYY-MM-DD.js`

---

## 9) SAFE CHANGE ORDER
If upgrading the site later, follow this order:

1. backup files
2. change one page only
3. test mobile first
4. test login state
5. test VIP state
6. test homepage shelves
7. test navigation away and back
8. only then change another page

Do not change:
- homepage layout
- auth system
- membership logic
all at the same time.

---

## 10) IF THE SITE STARTS FLICKERING AGAIN
Check these first:

### A. VIP / login flicker
Likely file:
- `js/auth.js`

### B. homepage shelves missing
Likely files:
- `index.html`
- `js/auth.js`
- `js/main.js`

### C. duplicate VIP blocks or broken mobile layout
Likely file:
- `index.html`

### D. blank account area
Likely file:
- `login.html`

---

## 11) DESIGN RULES FOR FUTURE WORK
Homepage only:
- slightly smaller cover cards
- slightly smaller buttons
- tighter spacing
- fewer duplicated calls to action

Do not shrink:
- books page
- audiobooks page
- video page
- music page

Those pages already feel right.

---

## 12) IF ADDING NEW VIP FEATURES LATER
Preferred future additions:
- better “Welcome back, Eric” personalization
- cleaner continue-listening logic tied to actual player progress
- homepage that hides public sales language for VIP users
- tighter mobile card sizing
- cleaner series-first experience

Avoid:
- stacked duplicate buttons
- placeholder blocks
- overlapping card types that repeat the same function

---

## 13) ROOT FOLDER NOTE
Place this file in the site root as:

- `SITE-NOTES-SUMNUBOOKS.md`

Optional second copy:
- `/backup-before-change/SITE-NOTES-SUMNUBOOKS.md`

