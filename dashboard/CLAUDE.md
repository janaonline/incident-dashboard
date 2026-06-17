# CLAUDE.md — India Safety Dashboard

## Project overview

Single-file static web application (`index.html`) — a data journalism dashboard tracking fatal urban safety incidents in India from 2016–2026. Data is fetched live from a Google Sheet and rendered entirely in the browser. No build step, no server, no framework.

**Live data source:** Google Sheet ID `1o3j5JGzCfzakkHF2jUaiPwHyLeNtnFSdY3391KMIj50`, tab `Incident Database`.

---

## Architecture

Everything lives in `index.html`:
- `<style>` — all CSS, using custom properties
- `<body>` — static HTML shell with placeholder elements
- `<script>` — all application logic (~720 lines of vanilla JS)

No bundler. No npm. No dependencies to install. Open in a browser (served over HTTP/HTTPS — not `file://`) and it works.

### External CDN dependencies

| Library | Version | Purpose |
|---|---|---|
| Chart.js | 4.4.1 | Bar, line, and combo charts |
| D3.js | 7.8.5 | SVG map rendering and projections |
| TopoJSON | 3.0.2 | Parsing India state boundary geometry |
| PapaParse | 5.4.1 | CSV parsing from Google Sheets |
| Inter / Inter Tight | Google Fonts | Typography |
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

---

## Key global state

| Variable | Type | Description |
|---|---|---|
| `INCIDENTS` | `Array<Object>` | All loaded incident records after normalisation |
| `currentCat` | `string` | Active category filter (`'All'` by default) |
| `mapView` | `'city'` \| `'state'` | Map toggle state |
| `catIncChart`, `catDeathChart`, `yearChart`, `govChart`, `preventChart`, `accChart` | Chart.js instances | Kept globally so `.destroy()` can be called on re-render |

---

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

---

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

---

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

---

## Map implementation notes

- India state boundaries come from `https://cdn.jsdelivr.net/npm/datamaps@0.5.10/src/js/data/ind.topo.json` fetched at render time.
- Projection: `d3.geoMercator()` centred at `[82, 22]`, scale `780`.
- State name matching (`matchStateName()`) does word-by-word fuzzy comparison to tolerate variations like "Jammu & Kashmir" vs TopoJSON's encoding.
- City mode: one bubble per incident row, sized by `√deaths × 0.85`, clamped to `[4, 13]` px radius.
- State mode: choropleth fill by death-count bracket + summary circle at representative lat/lng.
- Map tooltip is a positioned `div` — not an SVG element — so it can overflow the SVG bounds.
- Clicking a city bubble calls `jumpToIncident(idx)` which resets filters, re-renders the list, scrolls to the card, and pulses a highlight class for 2.2 s.

---

## CSS design system

All values are defined as CSS custom properties on `:root`.

| Token | Value |
|---|---|
| `--red` | `#A32D2D` (primary brand) |
| `--red-light` | `#FCEBEB` |
| `--red-mid` | `#E24B4A` |
| `--amber` | `#B06A10` |
| `--blue` | `#1557A0` |
| `--green` | `#2E5E0E` |
| `--purple` | `#46409E` |
| `--bg` | `#F4F2EE` |
| `--surface` | `#FFFFFF` |
| `--font` | `'Inter'` stack |
| `--font-tight` | `'Inter Tight'` (headings and big numbers) |

Responsive breakpoints are handled inline with `clamp()` for typography and `@media` queries for layout grid changes (640 px, 680 px, 520 px, 600 px).

---

## Error and loading states

- `file://` protocol: immediately shows an error explaining CORS restriction and how to run a local server.
- Unconfigured sheet ID: shows configuration instructions.
- Network error or wrong sharing settings: shows detailed diagnostics including the exact CSV URL being used.
- Successful load but render crash: shows the render error with the live incident count so users know data loaded fine.
- All errors go into `#errorContainer`; the main content is in `#mainContainer` — both start hidden, only one is shown.

---

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

---

## Important caveats in the data

- The **governance failure prevalence chart** is hardcoded from published Janaagraha aggregate findings (26-category coding). It is **not** re-derived from the live sheet columns. Do not change those percentages without a new published source.
- `reform` count is hardcoded to `1` in `renderReform()` — reflecting that only the 2025 New Delhi Railway Station stampede produced documented systemic reform.
- `convictions` is hardcoded to `0` in `renderStats()` — no conviction has been recorded in any incident in the dataset.
- `preventability` scores in the dataset all fall in the `3–5` range; the chart only shows those three bars. This is a data characteristic, not a display bug.
- Some incidents appear as near-duplicate rows (same event, multiple source reports) — this is intentional, not a deduplication failure.
