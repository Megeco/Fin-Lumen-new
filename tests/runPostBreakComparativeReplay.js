import { writeFile } from "node:fs/promises";
import { astroEngine } from "../lib/astroEngine.js";

const cases = [
  { ticker: "NEWGEN.NS", stock: "Newgen", chartId: "incorporation-1100-test", role: "structural", start: "2024-06-15", end: "2026-06-15" },
  { ticker: "NEWGEN.NS", stock: "Newgen", chartId: "listing", role: "market-expression", start: "2024-06-15", end: "2026-06-15" },
  { ticker: "KAYNES.NS", stock: "Kaynes", chartId: "listing", role: "selected", start: "2024-06-15", end: "2026-06-15" },
  { ticker: "DIXON.NS", stock: "Dixon", chartId: "listing", role: "selected", start: "2024-06-15", end: "2026-06-15" },
  { ticker: "NEULANDLAB.NS", stock: "Neuland Labs", chartId: "listing", role: "research-only", start: "2022-03-15", end: "2026-06-15" },
  { ticker: "GRWRHITECH.NS", stock: "Garware Hitech", chartId: "listed-name-change-2022", role: "validated-preferred", start: "2022-10-15", end: "2026-06-15" }
];

const labelled = [
  ["NEWGEN.NS", "BREAK_START", "2024-12-15"], ["NEWGEN.NS", "DECLINE", "2025-03-15"], ["NEWGEN.NS", "DECLINE", "2025-06-15"], ["NEWGEN.NS", "DECLINE", "2025-09-15"], ["NEWGEN.NS", "DECLINE", "2025-12-15"],
  ["KAYNES.NS", "BREAK_START", "2024-12-15"], ["KAYNES.NS", "RECOVERY_ATTEMPT_START", "2025-03-15"], ["KAYNES.NS", "RECOVERY_ATTEMPT_END", "2025-09-15"], ["KAYNES.NS", "RENEWED_DECLINE", "2025-10-15"],
  ["DIXON.NS", "BREAK_START", "2024-12-15"], ["DIXON.NS", "RECOVERY_ATTEMPT", "2025-06-15"], ["DIXON.NS", "RECOVERY_FAILURE", "2025-09-15"], ["DIXON.NS", "RECOVERY_START", "2026-03-15"],
  ["NEULANDLAB.NS", "FORMATION_START", "2022-09-15"], ["NEULANDLAB.NS", "RERATING_IGNITION", "2023-03-15"], ["NEULANDLAB.NS", "BREAK_START", "2024-12-15"], ["NEULANDLAB.NS", "RECOVERY_START", "2025-03-15"], ["NEULANDLAB.NS", "RECOVERY_END", "2025-11-15"], ["NEULANDLAB.NS", "RENEWED_DECLINE", "2025-12-15"], ["NEULANDLAB.NS", "RECOVERY_START", "2026-04-15"],
  ["GRWRHITECH.NS", "RERATING_IGNITION", "2023-04-15"], ["GRWRHITECH.NS", "BREAK_START", "2025-01-15"], ["GRWRHITECH.NS", "DECLINE_END", "2025-08-15"], ["GRWRHITECH.NS", "RECOVERY_START", "2025-09-15"], ["GRWRHITECH.NS", "SECOND_RERATING", "2026-01-15"]
].map(([ticker, type, date]) => ({ticker, type, date}));

function monthlyDates(start, end) {
  const out = [];
  const d = new Date(`${start}T00:00:00Z`);
  const z = new Date(`${end}T00:00:00Z`);
  while (d <= z) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return out;
}

function contact(c = {}) {
  return { planet: c.planet, target: c.targetPlanet, aspect: c.aspect, orb: c.orb, score: c.score, eclipseDate: c.eclipseDate || null };
}

function summarise(x) {
  const c = x._researchContext || {};
  const r = c.resonance || {};
  const contacts = [...(r.transitDetails || [])].sort((a,b) => Math.abs(b.score || 0) - Math.abs(a.score || 0));
  return {
    chart: { id: x.natal_chart_id || c.company?.selectedChartId, type: x.natal_chart_type || c.company?.chartType, date: x.natal_birth_date || c.company?.birthDate, authority: c.company?.validationEligibility || c.company?.confidence },
    stock: { expansion: r.expansionScore, pressure: r.pressureScore, leadership: r.leadershipProbability, volatility: r.volatility, regime: r.regime },
    macro: { environment: c.macro?.environment, expansion: c.macro?.expansion, pressure: c.macro?.pressure, volatility: c.macro?.volatility },
    slowContacts: contacts.filter(v => ["Jupiter","Saturn","Rahu","Ketu","Eclipse"].includes(v.planet)).slice(0,12).map(contact),
    topContacts: contacts.slice(0,12).map(contact)
  };
}

const requests = cases.flatMap(c => monthlyDates(c.start, c.end).map(date => ({...c, date})));
let cursor = 0;
const results = [];
async function worker() {
  while (cursor < requests.length) {
    const q = requests[cursor++];
    const x = await astroEngine({symbol:q.ticker, asOfDate:q.date, chartId:q.chartId, includeResearchContext:true});
    results.push({...q, ...summarise(x)});
    if (cursor % 30 === 0) console.error(`${cursor}/${requests.length}`);
  }
}
await Promise.all(Array.from({length:4}, () => worker()));
results.sort((a,b) => `${a.ticker}|${a.role}|${a.date}`.localeCompare(`${b.ticker}|${b.role}|${b.date}`));
const output = { methodology:{engine:"Fin-Lumen Pure Astro v37.7.0 preserved Swiss-backed engine", cadence:"monthly 15th; user labels fixed independently", caveats:["Newgen charts interpreted separately, never averaged","Neuland chart is research-only","March 2020 excluded"]}, labelled, cases, snapshots:results };
const out = new URL("../../Fin-Lumen-Post-Break-Comparative-Replay-Raw.json", import.meta.url);
await writeFile(out, `${JSON.stringify(output,null,2)}\n`);
console.log(`wrote ${out.pathname}: ${results.length} snapshots`);
