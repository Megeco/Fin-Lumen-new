import { writeFile } from "node:fs/promises";
import { astroEngine } from "../lib/astroEngine.js";

const episodes = [
  ["BSE.NS", "BSE", "RERATING_IGNITION", "2023-05-15", "May–Jun 2023"],
  ["BSE.NS", "BSE", "PRESSURE", "2025-01-15", "Jan 2025"],
  ["BSE.NS", "BSE", "RECOVERY_REACCELERATION", "2025-03-15", "Mar 2025"],
  ["BSE.NS", "BSE", "PRESSURE", "2025-06-15", "Jun 2025"],
  ["BSE.NS", "BSE", "RECOVERY", "2025-09-15", "Sep 2025"],

  ["DIXON.NS", "Dixon", "RERATING_IGNITION", "2023-05-15", "May 2023"],
  ["DIXON.NS", "Dixon", "PRESSURE", "2025-01-15", "Jan 2025"],
  ["DIXON.NS", "Dixon", "RECOVERY", "2025-06-15", "Jun 2025"],
  ["DIXON.NS", "Dixon", "BREAK", "2025-09-15", "Sep 2025"],
  ["DIXON.NS", "Dixon", "POST_BREAK_RECOVERY", "2026-03-15", "Mar 2026"],

  ["ICICIBANK.NS", "ICICI Bank", "RERATING_IGNITION", "2016-02-15", "Feb 2016"],
  ["ICICIBANK.NS", "ICICI Bank", "UNIVERSAL_PANDEMIC_SHOCK", "2020-03-15", "Mar 2020"],
  ["ICICIBANK.NS", "ICICI Bank", "REACCELERATION", "2020-07-15", "Jun–Sep 2020"],
  ["ICICIBANK.NS", "ICICI Bank", "PRESSURE_START", "2021-10-15", "Oct 2021"],
  ["ICICIBANK.NS", "ICICI Bank", "PRESSURE_LATE_PHASE", "2022-06-15", "Jun 2022"],
  ["ICICIBANK.NS", "ICICI Bank", "PRESSURE", "2024-12-15", "Dec 2024–Mar 2025"],
  ["ICICIBANK.NS", "ICICI Bank", "HIGH_PRESSURE", "2025-07-15", "Jun/Jul 2025 onward"],
  ["ICICIBANK.NS", "ICICI Bank", "RECOVERY", "2026-05-15", "May 2026"],

  ["CUPID.NS", "Cupid", "RERATING_IGNITION", "2025-04-15", "Apr 2025"],
  ["CUPID.NS", "Cupid", "PRESSURE_ABSORBED", "2025-12-15", "Dec 2025"],

  ["TITAN.NS", "Titan", "RERATING_IGNITION", "2017-01-15", "Dec 2016–Jan 2017"],
  ["TITAN.NS", "Titan", "UNIVERSAL_PANDEMIC_SHOCK", "2020-03-15", "Mar 2020"],
  ["TITAN.NS", "Titan", "PRESSURE", "2022-10-15", "Oct 2022"],
  ["TITAN.NS", "Titan", "PRESSURE", "2024-01-15", "Jan 2024"],
  ["TITAN.NS", "Titan", "PRESSURE", "2024-04-15", "Apr 2024"],
  ["TITAN.NS", "Titan", "RECOVERY", "2025-09-15", "Sep 2025"],

  ["NEWGEN.NS", "Newgen", "RERATING_IGNITION", "2022-12-15", "Dec 2022"],
  ["NEWGEN.NS", "Newgen", "PRESSURE", "2024-01-15", "Jan 2024"],
  ["NEWGEN.NS", "Newgen", "PRESSURE", "2024-05-15", "May 2024"],
  ["NEWGEN.NS", "Newgen", "PRESSURE", "2024-09-15", "Sep 2024"],
  ["NEWGEN.NS", "Newgen", "BREAK", "2024-12-15", "Dec 2024–Jan 2025"],

  ["SIEMENS.NS", "Siemens", "RERATING_IGNITION", "2020-09-15", "Sep 2020"],
  ["SIEMENS.NS", "Siemens", "PRESSURE", "2021-12-15", "Dec 2021"],
  ["SIEMENS.NS", "Siemens", "PRESSURE", "2023-05-15", "May 2023"],
  ["SIEMENS.NS", "Siemens", "PRESSURE", "2023-09-15", "Sep 2023"],
  ["SIEMENS.NS", "Siemens", "BREAK", "2024-07-15", "Jul 2024"],
  ["SIEMENS.NS", "Siemens", "BREAK", "2024-12-15", "Dec 2024"],
  ["SIEMENS.NS", "Siemens", "POST_BREAK_RECOVERY", "2026-03-15", "Mar 2026"]
].map(([ticker, stock, type, anchor, userWindow]) => ({ ticker, stock, type, anchor, userWindow }));

const phases = [
  ["M6", -183],
  ["M3", -91],
  ["W6", -42],
  ["EVENT", 0],
  ["P6", 42],
  ["P3", 91]
];

function shift(date, days) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function compactContact(c = {}) {
  return {
    planet: c.planet,
    target: c.targetPlanet,
    aspect: c.aspect,
    orb: c.orb,
    score: c.score,
    eclipseDate: c.eclipseDate || null,
    sign: c.transitSign || null
  };
}

function summarise(x, ticker, date) {
  const c = x._researchContext;
  const r = c?.resonance || {};
  const contacts = (r.transitDetails || [])
    .slice()
    .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0));
  const slow = contacts.filter(item => ["Jupiter", "Saturn", "Rahu", "Ketu", "Eclipse"].includes(item.planet));
  const shadow = x.astro_model?.shadowAssessment || x.astro_model?.shadow || null;
  return {
    ticker,
    date,
    resolved: Boolean(c?.company?.found),
    chart: {
      id: x.natal_chart_id || c?.company?.selectedChartId || null,
      type: x.natal_chart_type || c?.company?.chartType || null,
      authority: c?.company?.validationEligibility || c?.company?.confidence || null,
      source: x.natal_source || c?.company?.sourceNote || null,
      date: x.natal_birth_date || c?.company?.birthDate || null
    },
    stock: {
      expansion: r.expansionScore,
      pressure: r.pressureScore,
      leadership: r.leadershipProbability,
      volatility: r.volatility,
      regime: r.regime,
      signal: r.finAstroGrammar?.signal || r.grammarSignal || r.environmentConflict || null,
      pressureKind: r.finAstroGrammar?.pressure?.pressureKind || r.grammarPressureKind || null,
      receptorClass: x.transit_receptor_class || null,
      receptorExpression: x.transit_receptor_expression || null
    },
    macro: {
      environment: c?.macro?.environment,
      expansion: c?.macro?.expansion,
      pressure: c?.macro?.pressure,
      volatility: c?.macro?.volatility
    },
    topContacts: contacts.slice(0, 10).map(compactContact),
    slowContacts: slow.slice(0, 10).map(compactContact),
    eclipseHits: (c?.eclipseHits || []).slice(0, 10).map(hit => ({
      date: hit.eclipseDate,
      type: hit.eclipseType,
      target: hit.natalPlanet,
      aspect: hit.aspect,
      orb: hit.orb,
      severity: hit.severity,
      signalStrength: hit.signalStrength
    })),
    shadow: shadow ? {
      presentState: shadow.reratingAssessment?.presentState || shadow.presentReratingState || null,
      futureOutlook: shadow.reratingAssessment?.futureOutlook || shadow.futureReratingOutlook || null,
      episode: shadow.reratingAssessment?.episode || null
    } : null
  };
}

const requests = [];
for (const episode of episodes) {
  for (const [phase, days] of phases) {
    requests.push({ episode, phase, date: shift(episode.anchor, days) });
  }
}

const cache = new Map();
const unique = [...new Map(requests.map(r => [`${r.episode.ticker}|${r.date}`, r])).values()];
let cursor = 0;
async function worker() {
  while (cursor < unique.length) {
    const item = unique[cursor++];
    const x = await astroEngine({ symbol: item.episode.ticker, asOfDate: item.date, includeResearchContext: true });
    cache.set(`${item.episode.ticker}|${item.date}`, summarise(x, item.episode.ticker, item.date));
    if (cursor % 10 === 0 || cursor === unique.length) console.error(`completed ${cursor}/${unique.length}`);
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));

const output = {
  methodology: {
    engine: "Fin-Lumen Pure Astro v37.7.0 preserved Swiss-backed engine",
    anchors: "Price-defined by user before astrology inspection; representative mid-month dates used for approximate monthly windows.",
    phases: Object.fromEntries(phases.map(([phase, days]) => [phase, days])),
    pandemicControl: "March 2020 is a universal exogenous macro-shock control, not a stock-specific Break label."
  },
  generatedAt: new Date().toISOString(),
  episodes: episodes.map(episode => ({
    ...episode,
    checkpoints: phases.map(([phase, days]) => ({
      phase,
      daysFromAnchor: days,
      ...cache.get(`${episode.ticker}|${shift(episode.anchor, days)}`)
    }))
  }))
};

const outPath = new URL("../../Fin-Lumen-Seven-Stock-Episode-Astrology-Raw.json", import.meta.url);
await writeFile(outPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`wrote ${outPath.pathname} with ${episodes.length} episodes and ${unique.length} unique engine snapshots`);
