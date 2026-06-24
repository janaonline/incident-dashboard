#!/usr/bin/env node
/**
 * Recomputes every number shown on dashboard/index.html directly from the
 * live Google Sheet, using the same fetch URL, the same PapaParse options,
 * and the same aggregation formulas as the page itself — so this script's
 * output can be diffed against what the rendered page shows at any time.
 *
 * Usage: node dashboard/verify-data.js
 */
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');

function extractConst(name) {
  const m = html.match(new RegExp(`const ${name}\\s*=\\s*"([^"]*)"`));
  if (!m) throw new Error(`Could not find ${name} in index.html — has the script been restructured?`);
  return m[1];
}

const GOOGLE_SHEET_ID_OR_URL = extractConst('GOOGLE_SHEET_ID_OR_URL');
const SHEET_TAB_NAME = extractConst('SHEET_TAB_NAME');

function extractSheetId(input) {
  const m = String(input).match(/\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : input;
}
const GOOGLE_SHEET_ID = extractSheetId(GOOGLE_SHEET_ID_OR_URL);
const CSV_URL = `https://docs.google.com/spreadsheets/d/${GOOGLE_SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_TAB_NAME)}`;

function isYes(v) { return String(v).trim().toLowerCase() === 'yes'; }

function normalizeRow(r) {
  const get = (k) => {
    if (r[k] !== undefined) return r[k];
    const found = Object.keys(r).find(key => key.trim().toLowerCase() === k.toLowerCase());
    return found ? r[found] : undefined;
  };
  const str = (v) => (v === undefined || v === null) ? '' : String(v).trim();
  const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };

  return {
    incident_name: str(get('incident_name')),
    year: num(get('year')),
    state: str(get('state')),
    city: str(get('city')),
    category: str(get('category')) || 'Other',
    deaths: num(get('deaths')),
    preventability: num(get('preventability')),
    governance_failure: str(get('governance_failure')),
    regulatory_function_failed: str(get('regulatory_function_failed')),
    prior_warning: str(get('prior_warning')),
    repeat_offender: str(get('repeat_offender')),
    accountability_action: str(get('accountability_action')),
    govt_inquiry: str(get('govt_inquiry')),
    court_finding: str(get('court_finding')),
  };
}

function countConvictions(INCIDENTS) { return INCIDENTS.filter(i => /convict/i.test(i.accountability_action)).length; }
function countReform(INCIDENTS) { return INCIDENTS.filter(i => /reform|policy chang|regulation introduc|rule introduc/i.test(i.accountability_action)).length; }

async function main() {
  console.log(`Fetching live sheet: ${CSV_URL}\n`);
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching sheet`);
  const text = await res.text();
  if (text.trim().startsWith('<')) throw new Error('Received HTML instead of CSV — sheet may not be shared publicly or tab name is wrong');

  const parsed = Papa.parse(text, { header: true, dynamicTyping: true, skipEmptyLines: true, delimitersToGuess: [',', '\t', '|', ';'] });
  const INCIDENTS = parsed.data.map(normalizeRow).filter(r => r.incident_name);

  const total = INCIDENTS.length;
  const totalDeaths = INCIDENTS.reduce((s, i) => s + i.deaths, 0);
  const warned = INCIDENTS.filter(i => isYes(i.prior_warning));
  const warnPct = Math.round(warned.length / total * 100);
  const warnedDeaths = warned.reduce((s, i) => s + i.deaths, 0);
  const repeatCount = INCIDENTS.filter(i => isYes(i.repeat_offender)).length;
  const convictions = countConvictions(INCIDENTS);
  const reform = countReform(INCIDENTS);

  const inspectionFail = INCIDENTS.filter(i => /inspection/i.test(i.regulatory_function_failed)).length;
  const enforcementFail = INCIDENTS.filter(i => /enforcement/i.test(i.regulatory_function_failed)).length;
  const firFiled = INCIDENTS.filter(i => isYes(i.govt_inquiry)).length;
  const courtFindings = INCIDENTS.filter(i => isYes(i.court_finding)).length;
  const inspPct = Math.round(inspectionFail / total * 100);
  const enfPct = Math.round(enforcementFail / total * 100);
  const firPct = Math.round(firFiled / total * 100);

  const fireIncidents = INCIDENTS.filter(i => i.category === 'Fire');
  const fireNoNOC = fireIncidents.filter(i => /no fire noc|no noc|without.*noc|lacked.*noc|illegal/i.test(i.governance_failure));
  const firePct = fireIncidents.length ? Math.round(fireNoNOC.length / fireIncidents.length * 100) : 0;
  const stampedeDeaths = INCIDENTS.filter(i => i.category === 'Crowd Management / Stampede').reduce((s, i) => s + i.deaths, 0);
  const cityCounts = {};
  INCIDENTS.forEach(i => { cityCounts[i.city + ', ' + i.state] = (cityCounts[i.city + ', ' + i.state] || 0) + 1; });
  const repeatCities = Object.entries(cityCounts).filter(([, v]) => v >= 3).length;
  const courtPct = Math.round(courtFindings / total * 100);

  const catAgg = {};
  INCIDENTS.forEach(i => {
    if (!catAgg[i.category]) catAgg[i.category] = { count: 0, deaths: 0 };
    catAgg[i.category].count++;
    catAgg[i.category].deaths += i.deaths;
  });

  const years = [...new Set(INCIDENTS.map(i => i.year))].sort((a, b) => a - b);

  const preventCounts = { 3: 0, 4: 0, 5: 0 };
  INCIDENTS.forEach(i => { if (preventCounts[i.preventability] !== undefined) preventCounts[i.preventability]++; });

  const arrests = INCIDENTS.filter(i => /arrest/i.test(i.accountability_action)).length;
  const compensation = INCIDENTS.filter(i => /compensat|ex-gratia/i.test(i.accountability_action)).length;

  const cityAgg = {};
  INCIDENTS.forEach(i => {
    const key = i.city + ', ' + i.state;
    if (!cityAgg[key]) cityAgg[key] = { count: 0, deaths: 0 };
    cityAgg[key].count++;
    cityAgg[key].deaths += i.deaths;
  });
  const topCities = Object.entries(cityAgg).sort((a, b) => b[1].count - a[1].count).slice(0, 10);

  console.log('=== Overview (renderStats) ===');
  console.log(`Deaths recorded: ${totalDeaths.toLocaleString()}`);
  console.log(`Incidents documented: ${total}`);
  console.log(`Had documented prior warning: ${warnPct}%`);
  console.log(`Convictions recorded: ${convictions}`);

  console.log('\n=== Hero (renderHero) ===');
  console.log(`Prior-warning rate: ${warnPct}% (${warned.length} of ${total})`);
  console.log(`Deaths in warned incidents: ${warnedDeaths.toLocaleString()}`);
  console.log(`Repeat-offender sites: ${repeatCount}`);

  console.log('\n=== Accountability chain (renderChain) ===');
  console.log(`Inspection failure: ${inspPct}% of incidents`);
  console.log(`Enforcement failure: ${enfPct}% of incidents`);
  console.log(`Inquiries ordered: ${firPct}%`);
  console.log(`Court findings: ${courtFindings} of ${total}`);
  console.log(`Convictions: ${convictions}`);

  console.log('\n=== Patterns panel (renderPatterns) ===');
  console.log(`Fire incidents without NOC: ${firePct}%`);
  console.log(`Stampede/crowd-management deaths: ${stampedeDeaths.toLocaleString()}`);
  console.log(`Cities with 3+ incidents: ${repeatCities}`);
  console.log(`Court-finding rate: ${courtPct}% (${courtFindings} of ${total})`);

  console.log('\n=== Accountability funnel (renderAccountability) ===');
  console.log(`FIR / Inquiry Filed: ${firFiled}`);
  console.log(`Arrests Made: ${arrests}`);
  console.log(`Compensation Announced: ${compensation}`);
  console.log(`Court Finding: ${courtFindings}`);
  console.log(`Conviction Recorded: ${convictions}`);
  console.log(`Systemic Reform: ${reform}`);

  console.log('\n=== Category aggregates (renderCategoryCharts) ===');
  Object.entries(catAgg).sort((a, b) => b[1].count - a[1].count).forEach(([cat, agg]) => {
    console.log(`  ${cat}: ${agg.count} incidents, ${agg.deaths} deaths`);
  });

  console.log('\n=== Year aggregates (renderYearChart) ===');
  years.forEach(y => {
    const rows = INCIDENTS.filter(i => i.year === y);
    console.log(`  ${y}: ${rows.length} incidents, ${rows.reduce((s, i) => s + i.deaths, 0)} deaths`);
  });

  console.log('\n=== Preventability (renderPreventChart) ===');
  console.log(`  3 — Moderate: ${preventCounts[3]}`);
  console.log(`  4 — High: ${preventCounts[4]}`);
  console.log(`  5 — Maximum: ${preventCounts[5]}`);

  console.log('\n=== Top 10 cities (renderCityChart) ===');
  topCities.forEach(([city, agg]) => console.log(`  ${city}: ${agg.count} incidents, ${agg.deaths} deaths`));

  console.log(`\nDone. Compare these numbers against the live page at the same moment — they should match exactly.`);
}

main().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
