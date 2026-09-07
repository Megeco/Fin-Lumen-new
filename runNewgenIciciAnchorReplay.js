import { writeFile } from "node:fs/promises";
import { astroEngine } from "../lib/astroEngine.js";

const episodes = [
  ["NEWGEN.NS", "Newgen", "RERATING_IGNITION", "2022-12-15", "Dec 2022"],
  ["NEWGEN.NS", "Newgen", "PRESSURE", "2024-01-15", "Jan 2024"],
  ["NEWGEN.NS", "Newgen", "PRESSURE", "2024-05-15", "May 2024"],
  ["NEWGEN.NS", "Newgen", "PRESSURE", "2024-09-15", "Sep 2024"],
  ["NEWGEN.NS", "Newgen", "BREAK", "2024-12-15", "Dec 2024–Jan 2025"],
  ["ICICIBANK.NS", "ICICI Bank", "RERATING_IGNITION", "2016-02-15", "Feb 2016"],
  ["ICICIBANK.NS", "ICICI Bank", "UNIVERSAL_PANDEMIC_SHOCK", "2020-03-15", "Mar 2020"],
  ["ICICIBANK.NS", "ICICI Bank", "REACCELERATION", "2020-07-15", "Jun–Sep 2020"],
  ["ICICIBANK.NS", "ICICI Bank", "PRESSURE_START", "2021-10-15", "Oct 2021"],
  ["ICICIBANK.NS", "ICICI Bank", "PRESSURE_LATE_PHASE", "2022-06-15", "Jun 2022"],
  ["ICICIBANK.NS", "ICICI Bank", "PRESSURE", "2024-12-15", "Dec 2024–Mar 2025"],
  ["ICICIBANK.NS", "ICICI Bank", "HIGH_PRESSURE", "2025-07-15", "Jun/Jul 2025 onward"],
  ["ICICIBANK.NS", "ICICI Bank", "RECOVERY", "2026-05-15", "May 2026"]
].map(([ticker, stock, type, anchor, userWindow]) => ({ ticker, stock, type, anchor, userWindow }));

const variants = {
  "NEWGEN.NS": [
    ["listing-0915-locked", "listing"],
    ["listing-1100-supplied", "listing-1100-test"],
    ["incorporation-1100-supplied", "incorporation-1100-test"]
  ],
  "ICICIBANK.NS": [["incorporation-1100-supplied-and-locked", "incorporation"]]
};

const phases = [["M6", -183], ["M3", -91], ["W6", -42], ["EVENT", 0], ["P6", 42], ["P3", 91]];

function shift(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function contact(c = {}) {
  return {
    planet: c.planet,
    target: c.targetPlanet,
    aspect: c.aspect,
    orb: c.orb,
    score: c.score,
    eclipseDate: c.eclipseDate || null
  };
}

function summarise(x) {
  const c = x._researchContext || {};
  const r = c.resonance || {};
  const contacts = [...(r.transitDetails || [])]
    .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0));
  const slow = contacts.filter(item => ["Jupiter", "Saturn", "Rahu", "Ketu", "Eclipse"].includes(item.planet));
  return {
    resolved: Boolean(c.company?.found),
    chart: {
      id: x.natal_chart_id || c.company?.selectedChartId || null,
      type: x.natal_chart_type || c.company?.chartType || null,
      date: x.natal_birth_date || c.company?.birthDate || null,
      time: c.company?.birthTime || null,
      city: c.company?.city || null,
      authority: c.company?.validationEligibility || c.company?.confidence || null
    },
    stock: {
      expansion: r.expansionScore,
      pressure: r.pressureScore,
      leadership: r.leadershipProbability,
      volatility: r.volatility,
      regime: r.regime,
      receptorClass: x.transit_receptor_class || null,
      receptorExpression: x.transit_receptor_expression || null
    },
    macro: {
      environment: c.macro?.environment,
      expansion: c.macro?.expansion,
      pressure: c.macro?.pressure,
      volatility: c.macro?.volatility
    },
    topContacts: contacts.slice(0, 12).map(contact),
    slowContacts: slow.slice(0, 12).map(contact),
    eclipseHits: (c.eclipseHits || []).slice(0, 10).map(hit => ({
      date: hit.eclipseDate,
      type: hit.eclipseType,
      target: hit.natalPlanet,
      aspect: hit.aspect,
      orb: hit.orb,
      severity: hit.severity,
      signalStrength: hit.signalStrength
    }))
  };
}

const requests = [];
for (const episode of episodes) {
  for (const [variant, chartId] of variants[episode.ticker]) {
    for (const [phase, days] of phases) {
      requests.push({ episode, variant, chartId, phase, days, date: shift(episode.anchor, days) });
    }
  }
}

const cache = new Map();
let cursor = 0;
async function worker() {
  while (cursor < requests.length) {
    const item = requests[cursor++];
    const key = `${item.episode.ticker}|${item.variant}|${item.date}`;
    if (!cache.has(key)) {
      const result = await astroEngine({
        symbol: item.episode.ticker,
        asOfDate: item.date,
        chartId: item.chartId,
        includeResearchContext: true
      });
      cache.set(key, summarise(result));
    }
    if (cursor % 12 === 0 || cursor === requests.length) console.error(`completed ${cursor}/${requests.length}`);
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));

const output = {
  methodology: {
    engine: "Fin-Lumen Pure Astro v37.7.0 preserved Swiss-backed engine",
    scope: "Company-specific anchor comparison only; no cross-stock doctrine or weighted blending inferred.",
    dates: "User-labelled episodes fixed before chart comparison.",
    phases: Object.fromEntries(phases),
    variants
  },
  generatedAt: new Date().toISOString(),
  episodes: episodes.map(episode => ({
    ...episode,
    variants: Object.fromEntries(variants[episode.ticker].map(([variant]) => [variant,
      phases.map(([phase, days]) => ({
        phase,
        daysFromAnchor: days,
        date: shift(episode.anchor, days),
        ...cache.get(`${episode.ticker}|${variant}|${shift(episode.anchor, days)}`)
      }))
    ]))
  }))
};

const outPath = new URL("../../Fin-Lumen-Newgen-ICICI-Anchor-Replay-Raw.json", import.meta.url);
await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`wrote ${outPath.pathname}: ${episodes.length} episodes, ${cache.size} unique snapshots`);
