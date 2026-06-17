# CLAUDE.md

Guidance for future Claude Code sessions working in this repo.

This repo holds two unrelated projects under one folder: an editorial
scrollytelling showcase site at the project root, and a real, separate data
dashboard app bundled inside `dashboard/`. Their CLAUDE.md guidance used to
live in two separate files (root `CLAUDE.md` and `dashboard/CLAUDE.md`); both
are merged into this single file now — **Part 1** below governs the root
showcase site, **Part 2** governs `dashboard/`. They describe unrelated
architectures and conventions; don't let guidance from one part bleed into
the other just because they're now in the same file.

---

# Part 1 — Showcase site (project root)

## What this is

A static, single-page scrollytelling site. Plain HTML/CSS/vanilla JS only —
no frameworks, no bundler, no `npm install`. It must keep running by simply
serving the folder (or opening `index.html`, modulo the `fetch()` CORS
caveat noted in `README.md`).

## The one rule that matters most

**`content.json` is the single source of truth for all editorial content.**
`index.html` must never contain hardcoded headlines, body copy, captions,
or image filenames — those are injected by `script.js` at runtime from
`content.json`. If a change requires adding text or an image reference to
the markup directly, it's the wrong change; add a field to `content.json`
and render it from `script.js` instead.

Corollary: the number of content sections is driven entirely by the
`sections` array in `content.json`. Never hardcode a fixed count of
sections in HTML or JS.

## Content schema (content.json)

```
{
  "site": {
    "title", "tagline", "heroImage", "heroImageAlt",
    "cta": { "label", "url" }  // optional - omit entirely to hide the hero button
  },
  "sections": [
    { "heading", "body", "image", "imageAlt", "caption" }  // caption optional
  ],
  "footer": { "credit", "links": [ { "label", "url" } ] }  // links optional
}
```

`site.cta` was added to support a hero call-to-action button (`#hero-cta` in
`index.html`, rendered in `renderHero()` in `script.js`) — it's optional and
omitted by default; the button stays `display: none` (see `.hero__cta` in
`style.css`) unless `renderHero()` adds the `.has-link` class, which only
happens when both `cta.label` and `cta.url` are present. It currently points
to `dashboard/index.html` (a real app bundled in this same project — see
"The bundled dashboard" below) and is a same-tab redirect by design: it's an
internal page now, not an external site, so there's no `target`/`rel` on the
`<a>` in `index.html`. If `cta.url` is ever pointed at a genuinely external
site again, reintroducing `target="_blank" rel="noopener noreferrer"` on
that markup would be the right call — but don't add it back just because a
URL happens to start with `http`; make that an explicit decision.

`footer.links` entries get new-tab-or-not behavior automatically via a
URL-scheme check in `renderFooter()`, not a schema field: any `link.url`
starting with `http://`/`https://` gets `target="_blank" rel="noopener
noreferrer"`; everything else (relative paths like `dashboard/index.html`,
`mailto:`, `tel:`, in-page anchors) is left without `target`, so it
navigates in the same tab/app. This is why the footer's "View Dashboard"
link (now `dashboard/index.html`) needed no JS changes to become same-tab
when its URL changed from external to local — the existing heuristic
already does the right thing. Don't add a `target`/`newTab` field to the
schema for this — the scheme check is the simpler, sufficient mechanism.

If you need to add or rename a field, say so explicitly — don't change the
schema silently, since the human editor relies on these exact field names.

## The bundled dashboard (`dashboard/`)

`dashboard/` contains the actual, real "India Safety Dashboard" app that
this showcase site describes and links to — a completely separate,
unrelated single-file project (own `index.html`/`package.json`, own tech
stack: Chart.js/D3/TopoJSON/PapaParse via CDN, fetches its incident data
live from a Google Sheet). It was dropped in verbatim and is intentionally
**not** governed by this Part's constraints (palette, fonts,
content.json-driven rendering, etc.) — those apply only to the showcase
site at the project root. It originally shipped with its own light
red/cream theme, but was later redesigned to a dark black-background theme
with its own duplicated (not shared) copies of this site's glass-panel
tinting, kinetic word-reveal heading, and scroll-progress-bar mechanisms —
see "Visual redesign" in **Part 2** below for specifics. Read Part 2 for
that subproject's own conventions; don't merge the two projects'
conventions in your head just because their docs now live in one file —
they describe unrelated architectures sharing nothing but a parent folder
(and, now, a similar look).

## Don't restate the live dashboard's numbers

Never hardcode the dashboard's own statistics (incident counts,
percentages, etc.) into this showcase site's copy. The dashboard computes
nearly all of its numbers live from a Google Sheet (see Part 2 below) —
duplicating a specific figure here means this copy silently goes stale the
moment the real data changes. Describe features qualitatively instead
(e.g. "an interactive map plots every incident" not "a map of 77
incidents"). A fixed project scope like a date range (e.g. "2016-2026") is
fine to state since it isn't a live-computed metric.

## Rendering must fail gracefully

Every render function in `script.js` checks for missing fields before using
them (missing heading/body skips a whole section, missing image shows a
placeholder box with the filename instead of crashing). Keep that pattern
when adding new fields — a missing or malformed `content.json` field should
never throw or break the page.

## Light/dark theme toggle

A persistent light/dark toggle exists (`#themeToggle` in `index.html`),
driven by a `data-theme="dark"|"light"` attribute on `<html>` and persisted to
`localStorage` under the shared key `isd-theme` (same key used by
`dashboard/index.html` — Part 2 — so the choice syncs across both pages on one
origin via the `storage` event; default is `dark` when nothing is saved). A
blocking inline script is the first child of `<head>`, before the stylesheet
link, so the correct theme applies before first paint (no flash of the wrong
theme). The toggle ripples in via the View Transitions API
(`document.startViewTransition`, `switchTheme()` in `script.js`), clipping an
expanding circle from the icon over 1000ms — this is the only approach that
ripples correctly over the full-bleed photo backgrounds rather than wiping a
flat color over them. It degrades to an instant swap (no ripple, no
crossfade) in browsers without the View Transitions API and under
`prefers-reduced-motion: reduce`.

**The black/yellow/cream-only palette rule below is intentionally relaxed for
light mode** (owner-approved) — `--black`/`--charcoal`/`--yellow`/`--cream`
are theme-scoped in `style.css` (`[data-theme="dark"]` keeps today's exact
values; `[data-theme="light"]` swaps in a full light palette). In light mode
`--yellow` resolves to a contrast-safe deep amber (`#b8860b`) for text/chrome,
since the bright brand yellow fails contrast as text on a light background.
The hero CTA button is the one place that must *not* follow that flip: it's a
bright-yellow fill with dark text in both themes, so it uses two
theme-invariant tokens instead, `--yellow-fill` (always `#f5c400`) and
`--ink-on-fill` (always `#1c1b18`) — don't repoint it at `--yellow`/`--black`
or it inherits the theme flip and the text contrast breaks in light mode.

`applyTintFromImage()` (script.js) is theme-aware: it stores each panel's
sampled hue/saturation in `data-tint-h`/`data-tint-s` instead of only using
them once, and derives `--tint-r/g/b` at a lightness of `0.32` in dark mode or
`0.85` in light mode (`tintLightness()`). `reapplyTints()` re-derives every
stored panel's tint at the new lightness and is called on toggle and on the
cross-tab `storage` sync — necessary because the tint is set as an inline
style, which would otherwise permanently pin the dark-mode tint regardless of
`[data-theme]`.

The photo scrims (`.content-section__scrim`, `.hero__overlay`) scale via a
`--scrim-strength` custom property (`0.92` dark, `0.55` light) rather than
going transparent in light mode — text sits directly on photos with no other
backing, so a real scrim is still needed for legibility even with dark ink
text in light mode.

`.content-section__caption` (the small uppercase label under each section's
body text, e.g. "Interactive incident map") needed its own light-mode
override, `#2e2b26` — a muted mid-gray (`#5a554c`) was tried first but tested
too low-contrast against the glass panel, since the panel's actual rendered
color is a blur of whatever photo sits behind it (unpredictable, can be
bright) rather than a flat surface. Don't reintroduce a lighter caption color
on the assumption the panel is a fixed light tone — verify against a real
screenshot, not just the panel's nominal tint value.

`.hero__title` and `.content-section__heading` also needed a light-mode
override, for the same underlying reason: `var(--yellow)` in light mode is
`#b8860b` (amber), which sits in a contrast deadzone against the glass panel
— the panel's actual rendered brightness is dominated by the real, blurred
photo behind it (`backdrop-filter`), only lightly tinted at low alpha, so it
varies with the photo and amber isn't reliably dark or light enough against
it either way. Both selectors get
`[data-theme="light"] { color: var(--cream); }` instead — reusing the same
dark-ink color already proven legible for body text in this same panel
context, rather than introducing a new color. `.content-section__kicker`
(decorative accent bar, not text) and `.content-section__index` (the faint
"01"/"02" numeral, which sits outside the glass-panel directly over the
photo, not inside a card) deliberately keep `var(--yellow)` — this fix is
scoped to text actually inside a `.glass-panel`. Dark mode is untouched.

## Design constraints (do not relax without asking)

- Palette: black, yellow, and one cream/off-white only (see CSS variables
  `--black`, `--yellow`, `--cream` in `style.css`) **in dark mode** — see
  "Light/dark theme toggle" above for the approved light-mode exception. No
  new colors beyond the two theme palettes, **with one further documented
  exception**: the `.glass-panel` text panels (see below)
  intentionally pick up a dynamic tint sampled from their own photo —
  the user explicitly asked for this "liquid glass" treatment, overriding
  the fixed-palette rule for that one mechanism only. Chrome elements
  (kicker bar, section numeral, scroll-progress bar, footer rule, link
  hover) and body-text color stay fixed yellow/cream (per-theme) regardless —
  don't let the dynamic tint creep into anything outside `.glass-panel`.
- Fonts: exactly two Google Fonts — Playfair Display (display/headlines)
  and Inter (body) — loaded via `<link>` tags in `index.html`. No
  additional typefaces, no local font files.
- No animation libraries — scroll reveals use `IntersectionObserver`
  toggling an `.is-visible` class; the cross-fade/parallax/progress-bar
  motion all runs from one shared `requestAnimationFrame` loop
  (`startScrollEngine`); color extraction uses the native Canvas API
  (`applyTintFromImage`). All vanilla, no libraries.
- No external image hosting — `<img>` sources only ever come from filenames
  in `content.json` under a local `images/` folder.
- No analytics, tracking, or third-party embeds.

## Layout

The hero keeps its own self-contained full-bleed image (`.hero__media`)
with a continuous CSS `kenburns` zoom keyframe. Content sections do **not**
each own their own image — instead, `renderSections()` builds two parallel
trees inside `#sections`: a single shared `#image-stack` (`position: fixed`,
one `.image-layer` per section, all absolutely stacked on top of each
other) and the normal-flow `.content-section` text panels that scroll over
it. This split exists specifically so that, as you scroll from section N to
N+1, both images can be cross-faded in the same stacking context — when
sections each owned their own clipped `position:absolute` image box,
N's image was physically clipped to N's box and could never visually bleed
into N+1's box, which is why the original per-section-media version felt
like a hard slideshow cut rather than a fluid dissolve. Don't reintroduce
a per-section image box; if you need to change how images are laid out,
keep the shared-stack split intact.

**Stacking-context gotcha (cost real debugging time, don't reintroduce):**
neither `#sections` nor `.image-stack` may have an opaque `background`, and
`#sections` must stay unpositioned (no `position`/`z-index`). `.image-stack`
is `position: fixed; inset: 0`, so it visually covers the *entire viewport
at every scroll position* — including over the hero (which sits before it
in the DOM) and over the footer (which sits after it). If `#sections` were
given its own `z-index`, that value would make this whole subtree paint
above the footer regardless of DOM order; if `.image-stack` itself had an
opaque background, it would permanently blot out the hero, since DOM order
alone already puts it above `.hero` once both are positioned. The container
and any never-active `.image-layer` must stay genuinely transparent — only
an `.image-layer` actually made opaque by `startScrollEngine()` should ever
paint anything visible there. If the hero or footer ever silently goes
black/empty again, check this first before touching the cross-fade math.

`startScrollEngine()` (the single rAF loop in `script.js`) is the one place
driving all scroll-linked motion: `measureSections()` caches each section's
absolute document position once via `getBoundingClientRect() + scrollY`
(deliberately *not* `offsetTop`, which would be relative to whichever
ancestor ends up as the offsetParent rather than the document — re-run on
debounced resize) rather than reading layout every frame, computes a
continuous 0→1 progress per section, and from that derives (a) the matching
`.image-layer`'s cross-fade opacity via `edgeFadeOpacity()` — each section's
fade zone is centered *on the boundary it shares with its neighbor*
(extending `overlap` px to either side of that boundary, not just inward),
which is what makes adjacent sections' opacities sum to ~1 through the
handoff instead of both hitting 0 at the same instant — (b) a small
continuous zoom on that layer's `.media-inner`, and (c) the `#scroll-progress`
bar width. Text reveal (`observeReveals`, `.is-visible`) stays a one-shot
`IntersectionObserver` toggle, deliberately *not* continuous — only the
image layer is meant to feel "alive"; text should stay reliably readable
once revealed, including when scrolling back up.

Headlines (`.kinetic-heading`) are split word-by-word in JS
(`buildKineticText`) into masked spans that slide up into view on reveal,
staggered by a small per-word `transition-delay`.

### Dynamic "liquid glass" tinting

`applyTintFromImage()` draws each loaded image into a small offscreen
canvas, averages its pixels, and sets `--tint-r/--tint-g/--tint-b` custom
properties on that section's `.content-section__text` (and on
`#hero-content` for the hero) — consumed by the `.glass-panel` CSS rule as
a translucent, blurred (`backdrop-filter`) background tint with a specular
top-edge highlight. If extraction fails or an image is missing, the panel
just keeps the neutral default tint defined on `:root` — never crashes.
There's an `@supports` fallback to a flat (non-blurred) tinted background
for browsers without `backdrop-filter`.

### Reduced motion

`prefers-reduced-motion: reduce` (media query at the bottom of `style.css`,
plus the early-return in `startScrollEngine()`) does two things: disables
all transitions/animations, and switches the entire cross-fade mechanism
off — `#image-stack` is hidden and each section's own
`.content-section__media-fallback` (built alongside the image-stack layer
in `renderSections()`, normally `display: none`) is shown instead, so the
page degrades to one full-bleed image per section in normal flow, fully
visible with zero JS-driven motion. Keep building that fallback element
whenever `renderSections()` changes — it's not optional scaffolding.

---

# Part 2 — Dashboard app (`dashboard/`)

## Project overview

Single-file static web application (`index.html`) — a data journalism dashboard tracking fatal urban safety incidents in India from 2016–2026. Data is fetched live from a Google Sheet and rendered entirely in the browser. No build step, no server, no framework.

**Live data source:** Google Sheet ID `1o3j5JGzCfzakkHF2jUaiPwHyLeNtnFSdY3391KMIj50`, tab `Incident Database`.

## Architecture

Everything lives in `index.html`:
- `<style>` — all CSS, using custom properties
- `<body>` — static HTML shell with placeholder elements
- `<script>` — all application logic (~780 lines of vanilla JS)

No bundler. No npm. No dependencies to install. Open in a browser (served over HTTP/HTTPS — not `file://`) and it works.

### External CDN dependencies

| Library | Version | Purpose |
|---|---|---|
| Chart.js | 4.4.1 | Bar, line, and combo charts |
| D3.js | 7.8.5 | SVG map rendering and projections |
| TopoJSON | 3.0.2 | Parsing India state boundary geometry |
| PapaParse | 5.4.1 | CSV parsing from Google Sheets |
| Inter / Inter Tight | Google Fonts | Body text, stat numbers, chart labels |
| Playfair Display | Google Fonts | `<h1>` headline only (`--font-display`) — added in the dark-theme redesign, see "Visual redesign" below |
| datamaps `ind.topo.json` | 0.5.10 | India map TopoJSON (fetched at runtime) |

### Data flow

```
Google Sheet (CSV export URL)
  → fetch()
  → PapaParse (header-based CSV → JS objects)
  → normalizeRow() (field name canonicalisation + type coercion)
  → INCIDENTS[] (global array)
  → renderAll() (dispatches all section renders)
```

## Key global state

| Variable | Type | Description |
|---|---|---|
| `INCIDENTS` | `Array<Object>` | All loaded incident records after normalisation |
| `currentCat` | `string` | Active category filter (`'All'` by default) |
| `mapView` | `'city'` \| `'state'` | Map toggle state |
| `catIncChart`, `catDeathChart`, `yearChart`, `govChart`, `preventChart`, `accChart` | Chart.js instances | Kept globally so `.destroy()` can be called on re-render |

## Data schema — `normalizeRow()` output

Every row from the Google Sheet is normalised to this shape. Field names are matched case-insensitively so minor header variation in the sheet doesn't break parsing.

| Field | Type | Notes |
|---|---|---|
| `id` | number | Row identifier |
| `incident_name` | string | Required — rows without this are dropped |
| `date` | string | |
| `year` | number | Used for timeline chart |
| `state` | string | Used for map state matching |
| `city` | string | |
| `lat` / `lng` | number | City-level geocode; used for map bubble placement |
| `category` | string | One of 12 categories (defaults to `'Other'`) |
| `tier` | string | City tier |
| `deaths` | number | Primary metric |
| `injuries` | number | |
| `ulb_authority` | string | Urban Local Body with jurisdiction |
| `brief_description` | string | |
| `immediate_cause` | string | |
| `governance_failure` | string | Free-text; regex-searched in several render functions |
| `primary_institution` | string | Aggregated in institution ranking |
| `secondary_institution` | string | |
| `regulatory_function_failed` | string | Regex-searched for `inspection` / `enforcement` |
| `accountability_gap` | string | |
| `prior_warning` | string | `'yes'` / `'no'` / other — tested via `isYes()` |
| `prior_violation` | string | |
| `repeat_offender` | string | `'yes'` / `'no'` — tested via `isYes()` |
| `accountability_action` | string | Regex-searched for `arrest`, `compensat`, `ex-gratia` |
| `evidence_strength` | number | |
| `preventability` | number | 1–5 scale; no incident in dataset is below 3 |
| `govt_inquiry` | string | `'yes'` / `'no'` — proxied as FIR/inquiry filed |
| `court_finding` | string | `'yes'` / `'no'` |
| `cag_audit` | string | |
| `media_investigation` | string | |
| `multiple_reports` | string | |
| `investigation_status` | string | |
| `source_1` / `source_2` | string | URLs; rendered as clickable links in incident cards |

## Incident categories and colours

```js
const catColors = {
  'Crowd Management / Stampede': '#E24B4A',
  'Fire': '#B06A10',
  'Industrial Accident': '#1557A0',
  'Building Collapse': '#A32D2D',
  'Transport Infrastructure Failure': '#2E5E0E',
  'Hospital Safety Failure': '#46409E',
  'Public Infrastructure Failure': '#7C2D12',
  'Flooding / Waterlogging Related Failure': '#0E7490',
  'Amusement / Recreation Safety Failure': '#9D174D',
  'School / Institutional Safety Failure': '#854D0E',
  'Electrical Safety Failure': '#4D7C0F',
  'Other': '#5A5955'
};
```

## Render functions

Each section of the page has a dedicated function. `renderAll()` calls all of them in sequence after data loads.

| Function | What it renders |
|---|---|
| `renderStats()` | Overview stat cards (deaths, incidents, % warned, convictions) |
| `renderHero()` | "Most important pattern" hero block with prior-warning breakdown |
| `renderChain()` | Licence → inspection → enforcement → response → conviction chain |
| `renderMap()` | D3 SVG map, city bubbles or state choropleth |
| `renderMapLegend()` | Legend below the map (called from `renderMap`) |
| `renderPatterns()` | Four pattern cards (fire NOC, stampede deaths, repeat cities, court %) |
| `renderCategoryCharts()` | Two Chart.js horizontal bar charts (incidents & deaths by category) |
| `renderYearChart()` | Combo bar+line chart (incidents & deaths per year) |
| `renderGovFailureChart()` | Static bar chart — 12 governance failure types (hardcoded % from published aggregate) |
| `renderPreventChart()` | Preventability rating bar chart (ratings 3–5) |
| `renderAccountability()` | Accountability funnel chart + text bars (FIR → conviction) |
| `renderInstitutions()` | Top 8 institutions ranked by incident count |
| `renderReform()` | Reform number (currently hardcoded to `1`) |
| `renderFilters()` | Category filter tab bar |
| `renderIncidents()` | Filterable incident card grid |
| `observeReveals()` | Not a data renderer — re-arms the reveal-on-scroll `IntersectionObserver` for `.reveal-section` elements; called last in `renderAll()` (see "Visual redesign" below) |

## Map implementation notes

- India state boundaries come from `https://cdn.jsdelivr.net/npm/datamaps@0.5.10/src/js/data/ind.topo.json` fetched at render time.
- Projection: `d3.geoMercator()` centred at `[82, 22]`, scale `780`.
- State name matching (`matchStateName()`) does word-by-word fuzzy comparison to tolerate variations like "Jammu & Kashmir" vs TopoJSON's encoding.
- City mode: one bubble per incident row, sized by `√deaths × 0.85`, clamped to `[4, 13]` px radius.
- State mode: choropleth fill by death-count bracket + summary circle at representative lat/lng.
- Map tooltip is a positioned `div` — not an SVG element — so it can overflow the SVG bounds.
- Clicking a city bubble calls `jumpToIncident(idx)` which resets filters, re-renders the list, scrolls to the card, and pulses a highlight class for 2.2 s.

## CSS design system

All values are defined as CSS custom properties, theme-scoped across
`:root, [data-theme="dark"]` and `[data-theme="light"]` (see "Light/dark
theme toggle" below) rather than a single flat `:root` block. These were
overhauled in the dark-theme redesign (see "Visual redesign" below) — the
table reflects current dark-mode values, not the original light red/cream
theme; most are overridden in `[data-theme="light"]`.

| Token | Value |
|---|---|
| `--red` | `#FF6B6B` (primary brand / data accent) |
| `--red-light` | `rgba(255,107,107,0.16)` |
| `--red-mid` | `#FF8A80` |
| `--amber` | `#F5A623` |
| `--blue` | `#5B9BD9` |
| `--green` | `#6FCF6F` |
| `--purple` | `#9F97E8` |
| `--gray` | `#9A9890` |
| `--text` / `--text-muted` / `--text-light` | `#F3EFE6` / `#B8B4AC` / `#8A8782` |
| `--bg` | `#0A0A0A` (body uses a radial gradient from `--charcoal` to `--black`) |
| `--surface` / `--surface-2` | `rgba(255,255,255,0.05)` / `rgba(255,255,255,0.03)` — translucent, since most former flat-surface cards (`.stat-card`, `.chart-card`, `.inc-card`, etc.) now render via `.glass-panel` instead |
| `--yellow` / `--black` / `--charcoal` / `--charcoal-light` / `--cream` | `#F5C400` / `#0A0A0A` / `#161616` / `#1F1F1F` / `#F3EFE6` — pulled in to match the parent showcase site's chrome (scroll-progress bar, footer rule, `<h1>` color) |
| `--font` | `'Inter'` stack |
| `--font-tight` | `'Inter Tight'` (stat numbers, big numbers) |
| `--font-display` | `'Playfair Display'` — `<h1>` headline only |
| `--tint-r` / `--tint-g` / `--tint-b` | `24` / `24` / `24` — default `.glass-panel` tint; `.hero-enforcement` overrides these inline to a reddish tone. Unlike the parent showcase site's `applyTintFromImage()`, nothing here samples color from a photo — there are no photo-backed panels in the dashboard, so the tint is always one of these static values |

Per-category and per-state chart/map colors (`catColors`, `getStateColor()`,
`axisColors()`) were also retuned for a dark background — see "Visual
redesign" and "Light/dark theme toggle" below.

Responsive breakpoints are handled inline with `clamp()` for typography and `@media` queries for layout grid changes (640 px, 680 px, 520 px, 600 px).

## Visual redesign — dark theme + motion parity with the parent showcase site

The dashboard originally shipped with a light, red/cream theme of its own.
It was later redesigned to visually echo the parent showcase site's
black/yellow palette and motion language, while remaining a fully separate
codebase — none of this is shared CSS/JS, it's duplicated and adapted
in-place inside this file's own `<style>`/`<script>` blocks:

- **Background:** switched from flat `--bg: #F4F2EE` to a near-black
  `radial-gradient(ellipse at top, var(--charcoal) 0%, var(--black) 60%)`.
- **`.glass-panel`:** a translucent, blurred (`backdrop-filter: blur(16px)
  saturate(150%)`) card background applied to nearly every former flat
  `var(--surface)` card (`.stat-card`, `.hero-enforcement`, `.chain-section`,
  `.map-wrap`, `.chart-card`, `.inst-section`, `.reform-banner`,
  `.question-card`, `.inc-card`). It's the same visual mechanism as the
  parent site's `.glass-panel`, but with a static tint (see `--tint-r/g/b`
  above) rather than one sampled per-image — there's no equivalent of
  `applyTintFromImage()` here.
- **Kinetic headline:** the `<h1>` ("India Urban Safety Failures / 2016 –
  2026") is split word-by-word via a duplicated `buildKineticText()` and
  revealed once on load via `initKineticHeading()`, using the same
  `.kinetic-heading`/`.word-mask`/`.word` CSS pattern as the parent site's
  headlines. Respects `prefers-reduced-motion: reduce` by skipping straight
  to the final text instead of animating.
- **Scroll-progress bar:** `#scrollProgress` is a fixed top bar updated every
  frame by `startScrollProgress()`, the same `requestAnimationFrame`
  technique (and yellow accent) as the parent site's `#scroll-progress`.
  Disabled under reduced motion.
- **Reveal-on-scroll:** every top-level `.section` got a `.reveal-section`
  class; `observeReveals()` (called at the end of `renderAll()`, so it
  re-observes after every data re-render) is a one-shot
  `IntersectionObserver` that adds `.is-visible`, with `.stat-card` and
  `.question-card` children staggering in via per-`nth-child`
  `transition-delay`.
- **Chart/map colors:** `catColors`, `getStateColor()`, badge backgrounds,
  and map stroke/fill colors were all re-tuned for contrast against the
  dark background. Chart tick/label colors are resolved via `axisColors()`
  (see "Light/dark theme toggle" below) rather than fixed constants, since
  they now need to differ by theme.
- Both `initKineticHeading()` and `startScrollProgress()` run once at script
  init, before `loadData()` — independent of the data-driven render cycle.

## Light/dark theme toggle

A persistent light/dark toggle exists (`#themeToggle`), driven by
`data-theme="dark"|"light"` on `<html>` and persisted to `localStorage` under
the shared key `isd-theme` — the same key the parent showcase site
(Part 1) uses, so the choice syncs across both pages on one origin via the
`storage` event; default is `dark` when nothing is saved. A blocking inline
script is the first child of `<head>`, before any CDN `<script>` tags, so the
correct theme applies before first paint. The toggle ripples in via the View
Transitions API (`switchTheme()`), clipping an expanding circle from the icon
over 1000ms, and degrades to an instant swap in browsers without it and under
`prefers-reduced-motion: reduce`. This is a separate, duplicated
implementation from the showcase's — no files are shared between the two
projects, only the `localStorage` key name.

Theme-scoped tokens live in `:root, [data-theme="dark"]` (today's values,
unchanged) and a new `[data-theme="light"]` block — including a light
`--bg-gradient`, light `--text`/`--surface`/`--border` tokens, and
`--map-stroke`/`--map-nodata`/`--tooltip-bg`/`--tooltip-border`/`--track-bg`
for the map and tooltip. `--red`/`--amber`/`--blue`/`--green`/`--purple`
keep the same hex values in both themes — they read fine on light too.

**`.header` is deliberately *not* themed** (explicit owner decision): its dark
maroon gradient, cream body text, and yellow `<h1>` stay pinned to their
literal dark-mode hex values in both themes, rather than reading from
`--cream`/`--yellow`. A dark hero band in an otherwise light UI is a
deliberate, intentional look — and pinning avoids the same kind of contrast
break the parent showcase site's hero CTA button would have hit (see Part 1)
if header text read from the theme-flipped tokens.

**`.hero-enforcement`** (the "Most important pattern" panel) hit the same
class of bug and needed the same kind of fix: it sets its own fixed dark-red
`--tint-r/g/b` override and hardcodes `color: #fff` on all its children
(`.hero-pct`, `.hero-label`, `.hero-headline`, `.hero-desc`, `.hb-num`,
`.hb-label`) via inheritance — this is intentional, always-on branding, not a
photo-derived tint. At `.glass-panel`'s normal low alpha (`0.22`–`0.45`), that
dark-red tint composited against the *light* page background turned the
panel pale pink, and the hardcoded white text became unreadable.
`[data-theme="light"] .hero-enforcement` overrides the background to a much
higher alpha (`0.92`) so the panel stays a solid dark red regardless of page
background, leaving the dark-mode rule (which already worked) untouched. Any
future card that pins its own tint + hardcoded text color this way needs the
same per-theme alpha check — `.glass-panel`'s default alpha assumes the
tinted color and the page background are compatible in lightness, which only
holds in dark mode for this panel.

`.glass-panel`'s blur/border/shadow mechanics were tuned to match the parent
showcase site's `.glass-panel` exactly (`border`/`border-top-color` alpha
`0.14`/`0.32`, `border-radius: 20px`, `box-shadow: 0 12px 40px
rgba(0,0,0,0.35)`, a `background-color 0.6s ease` transition, and
`@supports` blur/saturate/alpha `20px`/`160%`/`0.22`) — by owner request, to
look like the same "liquid glass" family in both projects. This is visual
mechanics only: dashboard cards still flip color with the theme exactly as
before (light cream + dark text in light mode, dark + light text in dark
mode) — no dynamic per-card photo-sampled tinting was added, since the
dashboard has no photo backgrounds to sample from and porting that system
was explicitly ruled out as unnecessary complexity. `border-radius` and
`box-shadow` are set as literals scoped to this one rule rather than by
changing the shared `--radius-lg`/`--shadow` tokens, since `--shadow` is
still used elsewhere (`.map-tooltip`, `.pattern-card`'s inline inset
shadow) and must keep its own `0.45` alpha there. Known minor cosmetic
quirk: `.stat-card`/`.question-card` each set their own `transition`
shorthand (for their scroll-reveal opacity/transform animation), which —
same CSS specificity, later in source order — silently overrides
`.glass-panel`'s new `background-color` transition for just those two card
types; their background still changes correctly on toggle, it just snaps
instead of fading, which is imperceptible next to the ripple's own motion.

Chart axis/label colors are resolved per-render via `axisColors()` (dark:
`#8A8782`/`#D9D6CE`, light: `#4a463e`/`#1c1b18`) instead of the old fixed
`CHART_AXIS_MUTED`/`CHART_AXIS_LABEL` constants. `refreshThemedViews()`
re-runs the chart/map renderers (guarded by `if (!INCIDENTS.length) return;`)
on toggle and on the cross-tab `storage` sync — it never touches
`convictions`, `reform`, the governance-failure percentages, or the
preventability 3–5 bars. `renderMap()`'s topojson fetch is cached in
`TOPO_CACHE` (the original fetch body is now a `drawMap(data)` helper) so
toggling theme doesn't re-hit the CDN; the state-path stroke and no-data fill
read `var(--map-stroke)`/`var(--map-nodata)` directly so they resolve live
without needing a redraw, though `refreshThemedViews()` still calls
`renderMap()` for consistency with the other re-themed charts.

## Error and loading states

- `file://` protocol: immediately shows an error explaining CORS restriction and how to run a local server.
- Unconfigured sheet ID: shows configuration instructions.
- Network error or wrong sharing settings: shows detailed diagnostics including the exact CSV URL being used.
- Successful load but render crash: shows the render error with the live incident count so users know data loaded fine.
- All errors go into `#errorContainer`; the main content is in `#mainContainer` — both start hidden, only one is shown.

## How to develop

**To run locally:**
```bash
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```
Or use any static file server (VS Code Live Server, `npx serve`, Vercel CLI, etc.).

**To change the data source:**
Edit the two constants near the top of the `<script>` block:
```js
const GOOGLE_SHEET_ID_OR_URL = "YOUR_SHEET_ID_OR_FULL_URL";
const SHEET_TAB_NAME = "Incident Database";  // must match exactly, case-sensitive
```

**To add a new chart section:**
1. Add a `<canvas id="myChart">` inside a `.chart-card` in the HTML.
2. Write a `renderMyChart()` function following the existing pattern (destroy existing instance, create new `Chart()`).
3. Call `renderMyChart()` from `renderAll()`.

**To add a new data column:**
1. Add the field to the `return` object in `normalizeRow()`.
2. Reference it as `inc.my_field` in render functions.

**To deploy:** Upload `index.html` to any static host (Vercel, Netlify, GitHub Pages). No build step required.

## Important caveats in the data

- The **governance failure prevalence chart** is hardcoded from published Janaagraha aggregate findings (26-category coding). It is **not** re-derived from the live sheet columns. Do not change those percentages without a new published source.
- `reform` count is hardcoded to `1` in `renderReform()` — reflecting that only the 2025 New Delhi Railway Station stampede produced documented systemic reform.
- `convictions` is hardcoded to `0` in `renderStats()` — no conviction has been recorded in any incident in the dataset.
- `preventability` scores in the dataset all fall in the `3–5` range; the chart only shows those three bars. This is a data characteristic, not a display bug.
- Some incidents appear as near-duplicate rows (same event, multiple source reports) — this is intentional, not a deduplication failure.
