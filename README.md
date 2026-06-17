# Editorial Scrollytelling Site

A single-page, scroll-driven editorial site built with plain HTML, CSS, and
vanilla JavaScript — no frameworks, no build step.

## Files

- `index.html` — page structure only (no copy in the markup)
- `style.css` — palette, typography, full-bleed layout, the cross-fade
  image stack, glass-panel tinting, scroll-reveal transitions
- `script.js` — fetches `content.json` and renders the hero, sections, and
  footer; reveals sections on scroll via `IntersectionObserver`; runs one
  scroll-linked loop that cross-fades each section's background image into
  the next, gently zooms it, and updates the progress bar; samples each
  photo's average color to tint its text panel; animates headlines in
  word-by-word
- `content.json` — **all editorial content lives here**: title, tagline,
  section headings/body text/images/captions, footer credit and links
- `images/` — your real photos live here. 4 are currently used in
  `content.json` (`image1.jpg`, `image3.jpg`, `image4.jpg`, `image5.jpg`);
  `image2.jpg`, `image6.jpg`, `image7.jpg` are uploaded but unused —
  swap them in, or add real dashboard screenshots, whenever you're ready
- `dashboard/` — a separate, self-contained app (the real "India Safety
  Dashboard") bundled into this project so the CTA/footer link can redirect
  to it locally instead of an external URL. It has its own
  `index.html`/`README.md`/`CLAUDE.md`/`package.json` and its own unrelated
  tech stack (Chart.js, D3, TopoJSON, PapaParse, a live Google Sheet fetch)
  — see `dashboard/README.md` for that subproject specifically; nothing
  above in this list applies to it

## Editing content

Open `content.json` and edit the values (not the field names):

- `site.title`, `site.tagline` — hero headline and subhead
- `site.heroImage`, `site.heroImageAlt` — hero background image filename
  (relative to the project root, e.g. `images/hero.jpg`) and its alt text
- `site.cta` — optional `{ "label": "...", "url": "..." }` for a hero
  call-to-action button. Omit this key entirely to hide the button. It
  currently points to the bundled `dashboard/index.html` and opens in the
  same tab (a real redirect to that page) — only relative/local URLs and
  `mailto:`/`tel:` links behave this way; an `http(s)://` URL would open
  in a new tab instead (see `footer.links` below for the same rule)
- `sections` — an array; add or remove objects to add or remove sections.
  Each needs `heading`, `body`, `image`, `imageAlt`; `caption` is optional
- `footer.credit` — footer credit line
- `footer.links` — optional array of `{ "label": "...", "url": "..." }`.
  Any `http(s)://` link automatically opens in a new tab; a relative path,
  `mailto:`, or `tel:` link stays in the same tab/app, no extra field
  needed

This site links to (and bundles, in `dashboard/`) the real "India Safety
Dashboard". That dashboard computes most of its own statistics live from a
Google Sheet, so this showcase's copy deliberately avoids quoting any of
its specific numbers (incident counts, percentages) — only qualitative
feature descriptions and the dashboard's fixed date range. Keep new copy
number-free for the same reason if you edit `content.json` further.

Every image renders full-bleed (full viewport width and height), so use
large, high-resolution photos for the best result — they're cropped to
fill the frame with `object-fit: cover`. There are currently 4 sections;
add more by pushing another `{heading, body, image, imageAlt, caption}`
entry and dropping the matching file in `images/` — no code changes
needed, the number of sections is entirely driven by this array (10 total
is the tested range).

Note: a couple of the unused uploaded photos are quite large (`image2.jpg`
is ~12MB) — fine for local viewing, but worth compressing before any of
them go live anywhere public, since the project deliberately has no
build/image-pipeline step to do that automatically.

If an image filename is missing or the file can't be found, the site shows
a dark striped placeholder with the filename instead of a broken image —
nothing is fetched from the internet.

## Running locally

Because `script.js` uses `fetch()` to load `content.json`, opening
`index.html` directly with a `file://` URL will fail in some browsers due
to CORS restrictions on local file fetches. Serve the folder instead with
any simple static server, for example:

```
python -m http.server 8000
```

then visit `http://localhost:8000/`.

## Design notes

- Colors: black (background), yellow (accent/headlines/chrome), cream
  (body text) stay fixed everywhere — **except** the text panels, which
  pick up a soft, dynamic color tint sampled from their own photo (a
  "liquid glass" frosted-panel effect), by explicit request.
- Fonts: Playfair Display (headlines) and Inter (body), loaded from Google
  Fonts.
- Layout: every section is a full-bleed, full-viewport-height image with
  text overlaid on top in a translucent glass card (alternating left/right
  by section order), dimmed locally behind the text with a gradient so the
  rest of the photo stays vibrant.
- Motion: as you scroll, each section's image smoothly cross-fades/dissolves
  into the next (rather than cutting hard from one screen to the next) and
  gently zooms in while it's the focus; headlines reveal word-by-word as
  they scroll into view; the hero has its own slow continuous zoom; a thin
  yellow progress bar at the top of the page tracks how far down you've
  scrolled. Everything respects the OS-level "reduce motion" accessibility
  setting — with it on, the cross-fade/zoom/progress-bar motion turns off
  entirely and every section's photo is simply shown full-bleed and static.
