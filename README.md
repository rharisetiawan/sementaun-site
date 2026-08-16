# Sementaun — Official Site

Static site for **Sementaun**, a pop/rock cover band side project from Malang, Indonesia.
Live covers, session schedule, and merch.

## Stack

Plain HTML, CSS, and vanilla JS — no build step, no dependencies. Deploys anywhere that
serves static files.

```
index.html          all page markup
css/style.css       design tokens + all styling
js/script.js        nav, click-to-load video embeds, scroll reveal, form
assets/img/         logos + optimised merch photos
serve.ps1           local dev server (Windows/PowerShell)
```

## Run locally

```bash
powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1
```

Then open <http://localhost:8080>.

Any static server works just as well, e.g. `python -m http.server 8080`.

## Editing content

**Merch** — each product is a `.merch-card` block in `index.html`. To add one, copy a card,
drop the photo in `assets/img/merch/`, and update the `src`, title, and price. Point the
card's `href` at the real store listing when the shop goes live.

Keep new photos under ~200 KB. The current set was resized to a 1200 px long edge at
JPEG quality 82.

**Videos** — each cover is a `.video-card` in the `#watch` section. Set `data-id` to the
YouTube video ID and point the thumbnail at
`https://i.ytimg.com/vi/<VIDEO_ID>/hqdefault.jpg`. Cards marked `is-hidden` sit behind the
"Show all" button.

Embeds load on click rather than up front, so the page stays fast with 29 videos on it.

**Sessions** — the three dates in `#sessions` are placeholders. Replace them with real
shows as they get confirmed.

## Still to wire up

- Fan club form has no backend — connect it to Mailchimp, Buttondown, or Formspree.
- Merch "View" links go to `#` — point them at a real store.
- Instagram link in the footer is a placeholder.
- Prices are placeholders.
