# Restore: Payhip music Buy buttons (removed 2026-09-27)

**What was removed:** the "Buy Album — $10.00" buttons for two EMC albums.

**Why:** on 2026-09-27 both Payhip product pages returned **404**, so the buttons led to dead checkouts. Everything else on the album panels (track players, Video links, cover, tracklist) was left alone.

**Restore when:** Eric republishes these products on Payhip or sends new URLs.

| Album | Removed Payhip URL | Price shown | Where it appeared |
|---|---|---|---|
| The Profit E | https://payhip.com/b/DJInH | $10.00 | music.html album panel |
| Still Pimpin' | https://payhip.com/b/VygoG | $10.00 | music.html album panel **and** the home page (index.html) music modal ("Buy Album — $10.00") |

All removal spots are marked in the code with `PAYHIP-REMOVED 2026-09-27`. That's an HTML comment just before the data `<script>` plus a JS comment on the data line. The served files deliberately don't contain the old IDs; this note holds them.

## Exact changes

### 1. music.html: `MUSIC_DATA` (originally line 199 in the `const MUSIC_DATA = [...]` line)
```diff
- "slug": "the-profit-e", "title": "The Profit E", "artist": "EMC", "year": "2024", "cover": "images/music/the-profit-e.jpg", "buy": "https://payhip.com/b/DJInH",
+ "slug": "the-profit-e", "title": "The Profit E", "artist": "EMC", "year": "2024", "cover": "images/music/the-profit-e.jpg", "buy": "",
- "slug": "still-pimpin", "title": "Still Pimpin", "artist": "EMC", "year": "2002", "cover": "images/music/still-pimpin.jpg", "buy": "https://payhip.com/b/VygoG",
+ "slug": "still-pimpin", "title": "Still Pimpin", "artist": "EMC", "year": "2002", "cover": "images/music/still-pimpin.jpg", "buy": "",
```

### 2. music.html: album panel template (layout only)
The Buy button is rendered from `album.buy`. So that albums without a buy link don't leave an empty action row, the whole `panel-actions` row now renders only when `album.buy` is set. Original markup:
```html
          <div class="panel-actions">
            ${album.buy ? `<a class="btn btn-primary" href="${album.buy}" target="_blank" rel="noopener">Buy Album — $10.00</a>` : ""}
          </div>
```
New markup (still renders exactly the same button once `buy` is filled in again):
```html
          ${album.buy ? `<div class="panel-actions">
            <a class="btn btn-primary" href="${album.buy}" target="_blank" rel="noopener">Buy Album — $10.00</a>
          </div>` : ""}
```
Rendered HTML of each removed button:
```html
<a class="btn btn-primary" href="https://payhip.com/b/DJInH" target="_blank" rel="noopener">Buy Album — $10.00</a>
<a class="btn btn-primary" href="https://payhip.com/b/VygoG" target="_blank" rel="noopener">Buy Album — $10.00</a>
```

### 3. index.html: home `music: [...]` data (originally line 1444)
```diff
- "slug": "still-pimpin", "title": "Still Pimpin", ... "cover": "images/music/still-pimpin.jpg", "buy": "https://payhip.com/b/VygoG", "items": [...]
+ "slug": "still-pimpin", "title": "Still Pimpin", ... "cover": "images/music/still-pimpin.jpg", "buy": "", "items": [...]
```
The home modal template is unchanged and renders the button only when `entry.buy` is set:
```html
${entry.type === 'music' && entry.buy ? `<a class="btn btn-secondary" href="${entry.buy}" target="_blank" rel="noopener">Buy Album — $10.00</a>` : ''}
```
Rendered HTML of the removed home promo button:
```html
<a class="btn btn-secondary" href="https://payhip.com/b/VygoG" target="_blank" rel="noopener">Buy Album — $10.00</a>
```

## How to restore
1. Put the working Payhip URL (the old one if republished, or the new one) back into the `"buy": ""` field for `the-profit-e` and/or `still-pimpin` in `music.html`, and for `still-pimpin` in `index.html`.
2. Keep the price text at `$10.00` unless Eric sets a new price.
3. Remove the `PAYHIP-REMOVED 2026-09-27` comments and delete this file.
4. Check that each URL returns 200 on payhip.com before merging.
