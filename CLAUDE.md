# CLAUDE.md

Guidance for future Claude Code sessions working in this repo.

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
unrelated single-file project (own `index.html`/`README.md`/`CLAUDE.md`,
own tech stack: Chart.js/D3/TopoJSON/PapaParse via CDN, red/cream theme,
fetches its incident data live from a Google Sheet). It was dropped in
verbatim and is intentionally **not** governed by this file's constraints
(palette, fonts, content.json-driven rendering, etc.) — those apply only to
the showcase site at the project root. Read `dashboard/CLAUDE.md` for that
subproject's own conventions; don't merge the two doc sets, they describe
unrelated architectures sharing nothing but a parent folder.

## Don't restate the live dashboard's numbers

Never hardcode the dashboard's own statistics (incident counts,
percentages, etc.) into this showcase site's copy. The dashboard computes
nearly all of its numbers live from a Google Sheet (see
`dashboard/README.md`) — duplicating a specific figure here means this
copy silently goes stale the moment the real data changes. Describe
features qualitatively instead (e.g. "an interactive map plots every
incident" not "a map of 77 incidents"). A fixed project scope like a date
range (e.g. "2016-2026") is fine to state since it isn't a live-computed
metric.

## Rendering must fail gracefully

Every render function in `script.js` checks for missing fields before using
them (missing heading/body skips a whole section, missing image shows a
placeholder box with the filename instead of crashing). Keep that pattern
when adding new fields — a missing or malformed `content.json` field should
never throw or break the page.

## Design constraints (do not relax without asking)

- Palette: black, yellow, and one cream/off-white only (see CSS variables
  `--black`, `--yellow`, `--cream` in `style.css`). No new colors, **with
  one documented exception**: the `.glass-panel` text panels (see below)
  intentionally pick up a dynamic tint sampled from their own photo —
  the user explicitly asked for this "liquid glass" treatment, overriding
  the fixed-palette rule for that one mechanism only. Chrome elements
  (kicker bar, section numeral, scroll-progress bar, footer rule, link
  hover) and body-text color stay fixed yellow/cream regardless — don't
  let the dynamic tint creep into anything outside `.glass-panel`.
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
