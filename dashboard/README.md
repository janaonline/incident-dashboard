# India Safety Dashboard — Based on Open Source Data

A data journalism dashboard that documents, visualises, and analyses **77 fatal urban safety incidents in India from 2016 to 2026**. Built by Janaagraha, it draws on news reports, government inquiries, court records, CAG audits, and credible media investigations to surface patterns of governance failure behind preventable deaths.

---

## What this is

### For non-technical readers

This is an interactive web page — one file that you open in a browser — showing a decade of urban safety disasters in India and what they have in common. Click on a city on the map to read about that incident. Filter incidents by type. Expand any card for full details and links to original sources.

The core finding: these are not accidents. Nearly half of all incidents had documented prior warnings — notices issued, buildings flagged as dangerous, approvals denied — that were not acted on. In all 77 incidents, zero convictions have been recorded.

### For technical readers

A single-file, zero-build static web application. All logic, styles, and markup live in `index.html`. Data is fetched live at page load from a Google Sheet using the CSV export endpoint, parsed with PapaParse, and rendered using Chart.js (charts), D3.js + TopoJSON (India map), and vanilla DOM manipulation (everything else). No server, no bundler, no npm.

---

## Dashboard sections

### 1. Overview stats
Four headline numbers computed live from the sheet:
- Total deaths recorded
- Total incidents documented (2016–2026)
- Percentage of incidents with a documented prior warning
- Number of convictions recorded (zero)

### 2. Most important pattern — enforcement failure
A hero block showing what percentage of incidents had a known, documented risk that authorities failed to act on. The key finding: prior warnings were documented in roughly half of all incidents. In the remaining incidents, prior warning status is unknown — no incident is recorded as having had *no* prior warning.

Sub-metrics computed live:
- Number of incidents with documented prior warning
- Deaths in those foreseeable incidents
- Incidents at repeat-offender sites

### 3. Where the system breaks down — the regulatory chain
A visual flow showing the five links in the regulatory chain and where each one fails across the dataset:

```
Licence / Approval  →  Inspection  →  Enforcement  →  Incident Response  →  Conviction
(Usually granted)      (Fails in       (Fails in        (FIR/inquiry          (0 of 77
                        ~most cases)    ~most cases)     common)              incidents)
```

All percentages computed live from the sheet.

### 4. Geographic map
An SVG map of India (D3 + TopoJSON) with two views:
- **Cities view:** One bubble per incident, sized by death toll, coloured by incident category. Repeat-offender sites get a gold border. Click any bubble to jump to that incident's full record.
- **States view:** Choropleth fill by total deaths per state, with summary circles.

Hovering shows a tooltip with incident name, death count, location, and category.

### 5. Pattern cards
Four summary findings displayed alongside the map:
- Percentage of fire incidents with no Fire NOC, illegal construction, or unauthorised occupancy
- Total deaths from crowd management / stampede incidents (the highest-death category)
- Cities with 3 or more documented incidents (repeat failure sites)
- Percentage of incidents that reach a court finding

### 6. Incidents by category — two charts
Horizontal bar charts showing:
- **Number of incidents** per category
- **Total deaths** per category

Crowd Management / Stampede leads on both. Fire leads on incidents-per-death-toll ratio. Public Infrastructure Failure ranks high on deaths from a single event (Morbi bridge collapse).

### 7. A decade of fatal failures — year chart
Combination bar + line chart showing incidents (bars) and deaths (line) from 2016 to 2026. The 2025 spike reflects improved documentation coverage for recent events. 2026 data is partial.

### 8. Governance failure patterns — across all incidents
A horizontal bar chart showing 12 governance failure types and the percentage of incidents where each is documented. This chart reflects **published aggregate findings** from Janaagraha's 26-category coding and is not re-derived from the live incident sheet. Institutional Negligence is documented in 100% of incidents.

Top failure types:
| Failure type | % of incidents |
|---|---|
| Institutional Negligence | 100% |
| Enforcement Failure | 73% |
| Inspection Failure | 69% |
| Municipal Failure | 57% |
| Prior Warning Ignored | 49% |
| Licensing Failure | 47% |

### 9. Preventability rating
Bar chart showing how incidents are distributed across preventability ratings 3, 4, and 5 (on a 1–5 scale). No incident in this dataset is rated below 3 — every incident in the dataset had available regulatory mechanisms that could have prevented it.

### 10. Accountability outcomes — the funnel
Horizontal bar chart showing what happens after each type of incident:

| Outcome | Computed from |
|---|---|
| FIR / Inquiry Filed | `govt_inquiry = yes` |
| Arrests Made | `accountability_action` contains "arrest" |
| Compensation Announced | `accountability_action` contains "compensat" or "ex-gratia" |
| Court Finding | `court_finding = yes` |
| Conviction Recorded | Hardcoded `0` — no conviction in dataset |
| Systemic Reform | Hardcoded `1` — only the 2025 New Delhi Railway Station stampede |

Pattern: inquiry and compensation are consistently triggered. Court findings are rare. Convictions are absent.

### 11. Top responsible institutions
Horizontal bar chart of the 8 institutions appearing most often as the primary responsible body across incidents, ranked by incident count with total deaths shown per institution.

### 12. The reform record
A single-number callout: **1 out of 77 incidents produced documented systemic reform** — the New Delhi Railway Station stampede (2025), which resulted in crowd-control reform announcements. Every other incident's documented response ends at inquiry, compensation, or ongoing investigation.

### 13. Key questions for policy and reform
Six framed questions for city administrators, regulators, and policymakers:
1. Why does enforcement not follow inspection?
2. What explains BMC's concentration of incidents?
3. What happens to warnings?
4. What does the accountability process produce?
5. Which regulatory functions are under-resourced?
6. What conditions produced the one reform?

### 14. Browse all incidents
A filterable card grid with all 77 incidents. Filter tabs include all categories plus a "Repeat Offenders" filter. Each card shows:
- Incident name and death count
- City, state, year
- Prior warning badge (⚠ Prior warning / ✓ No warning / ? Warning unknown)
- Repeat offender badge
- Pending badge (for recent incidents without court findings)
- Category colour dot

Click any card to expand it and see: category, description, immediate cause, governance failure, primary institution, regulatory function failed, accountability action, investigation status, preventability / injuries, and links to original sources.

---

## Data source and schema

Data is fetched live from Google Sheets as a CSV export. The sheet must be shared as "Anyone with the link can view" and have a tab named exactly `Incident Database`.

### Column schema

| Column | Description |
|---|---|
| `id` | Row number |
| `incident_name` | Name of the incident (required; rows without it are dropped) |
| `date` | Incident date |
| `year` | Year (numeric) |
| `state` | Indian state |
| `city` | City name |
| `lat` / `lng` | City-level geocoordinates for map placement |
| `category` | Incident type (12 categories) |
| `tier` | City tier classification |
| `deaths` | Number of deaths |
| `injuries` | Number of injuries |
| `ulb_authority` | Urban Local Body with jurisdiction |
| `brief_description` | Short summary of the incident |
| `immediate_cause` | Direct cause |
| `governance_failure` | Free-text description of governance failures |
| `primary_institution` | Main institution held responsible |
| `secondary_institution` | Additional responsible institution |
| `regulatory_function_failed` | Which regulatory function failed (inspection / enforcement / etc.) |
| `accountability_gap` | Description of accountability gap |
| `prior_warning` | `yes` / `no` / unknown — whether a prior warning was documented |
| `prior_violation` | Whether prior regulatory violations were recorded |
| `repeat_offender` | `yes` / `no` — whether the site had prior incidents |
| `accountability_action` | Actions taken (arrests, compensation, inquiry) |
| `evidence_strength` | Evidence strength score |
| `preventability` | Preventability rating 1–5 (all incidents in dataset score 3–5) |
| `govt_inquiry` | `yes` / `no` — government inquiry or FIR ordered |
| `court_finding` | `yes` / `no` — court reached a finding |
| `cag_audit` | Whether a CAG audit was conducted |
| `media_investigation` | Whether a media investigation was conducted |
| `multiple_reports` | Whether multiple independent reports exist |
| `investigation_status` | Current investigation status |
| `source_1` / `source_2` | URLs to primary sources |

### Incident categories

- Crowd Management / Stampede
- Fire
- Industrial Accident
- Building Collapse
- Transport Infrastructure Failure
- Hospital Safety Failure
- Public Infrastructure Failure
- Flooding / Waterlogging Related Failure
- Amusement / Recreation Safety Failure
- School / Institutional Safety Failure
- Electrical Safety Failure
- Other

---

## Technical implementation

### Tech stack

| Layer | Technology |
|---|---|
| Markup & layout | HTML5, CSS custom properties, CSS Grid, `clamp()` for fluid type |
| Charts | Chart.js 4.4.1 |
| Map | D3.js 7.8.5 + TopoJSON 3.0.2 |
| CSV parsing | PapaParse 5.4.1 |
| Typography | Inter + Inter Tight (Google Fonts) |
| Map geometry | `datamaps` India TopoJSON (fetched from jsDelivr CDN) |
| Data backend | Google Sheets (CSV export URL) |
| Build tooling | None |
| Runtime dependencies | None (CDN only) |

### Files

```
index.html   — the entire application (HTML + CSS + JS, ~1130 lines)
README.md    — this file
CLAUDE.md    — developer reference for AI-assisted development
```

### How to run locally

The page fetches data from Google Sheets. Browser security blocks external fetches from `file://` URLs, so you must serve the file over HTTP:

```bash
# Python
python3 -m http.server 8000
# then open http://localhost:8000/index.html

# Node.js
npx serve .

# VS Code
Install the Live Server extension — right-click index.html — Open with Live Server
```

### Connecting your own Google Sheet

1. Create a Google Sheet with a tab named exactly `Incident Database` (case-sensitive).
2. Add columns matching the schema above (header row in row 1).
3. Share the sheet: **Share → Anyone with the link → Viewer**.
4. Open `index.html` in a text editor and find the two constants near the top of the `<script>` block:

```js
const GOOGLE_SHEET_ID_OR_URL = "PASTE_YOUR_GOOGLE_SHEET_ID_OR_URL_HERE";
const SHEET_TAB_NAME = "Incident Database";
```

5. Replace the first value with either:
   - The sheet ID (the long string between `/d/` and `/edit` in the URL), or
   - The full URL from your browser's address bar — the ID is extracted automatically.

### Deployment

Upload `index.html` to any static host:
- **Vercel:** `vercel --prod` or drag-and-drop in the dashboard
- **Netlify:** drag-and-drop the file
- **GitHub Pages:** push to a repository and enable Pages

No build step. No environment variables. No server. The page fetches all data client-side at load time.

### Troubleshooting common errors

| Error | Cause | Fix |
|---|---|---|
| "Cannot fetch data when opened as a local file" | Opened via `file://` | Run a local HTTP server (see above) |
| "HTTP 403" or HTML received instead of CSV | Sheet not shared publicly | Share → Anyone with the link → Viewer |
| "Tab name doesn't match" | Tab is not named `Incident Database` | Rename the tab exactly |
| Blank map | CDN fetch for `ind.topo.json` failed | Check network; map degrades gracefully with a text message |
| Chart not updating | Old Chart.js instance not destroyed | Each render function destroys the previous instance before creating a new one |

---

## Methodology notes

- **Data compilation:** 77 incidents drawn from news reports, Wikipedia, government inquiry records, court records, CAG reports, and credible media investigations (2016–2026).
- **Near-duplicates:** Some incidents appear as multiple rows reflecting multiple source reports of the same event. All rows are retained as documented in the source dataset.
- **Map coordinates:** City-level approximations geocoded from location names — not precise incident-site coordinates.
- **Governance failure chart:** The 12-category prevalence chart reflects published aggregate findings from Janaagraha's original 26-category coding. It is displayed as a standalone reference and is not re-derived from the live sheet.
- **Convictions:** Hardcoded to zero — no incident in the dataset has a recorded conviction as of the data compilation date.
- **Reform count:** Hardcoded to 1 — only the 2025 New Delhi Railway Station stampede produced documented systemic reform.
- **Preventability floor:** No incident in this dataset is rated below 3 on the 1–5 scale. This is a characteristic of the curated dataset, not a display constraint.

---

## About

**India Safety Dashboard — Based on Open Source Data** is a Janaagraha initiative to make urban safety failure patterns visible to policymakers, administrators, researchers, and the public.

Suggestions and corrections are welcome via the source spreadsheet.
