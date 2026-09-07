import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import registry from "../lib/natalRegistry.js";
import { resolveCompany } from "../lib/companyResolver.js";
import { generateRealNatalChart } from "../lib/realNatalGenerator.js";
import { generateRealTransits } from "../lib/realTransitGenerator.js";
import { calculateRealEclipseHits, getRelevantEclipses } from "../lib/realEclipseEngine.js";
import calculateTransitResonance from "../lib/transitResonance.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const scannerSource = fs.readFileSync(path.join(root, "pages", "api", "get-stocks.js"), "utf8");
const baselineBlock = scannerSource.split("const FALLBACK_STOCKS")[0];
const productionSymbols = [...baselineBlock.matchAll(/\{\s*name:\s*"([^"]+)"\s*\}/g)].map(match => match[1]);

const DAY = 86_400_000;
const DEFAULT_STEP_DAYS = 14;
const DEFAULT_FORWARD_DAYS = 30;
const DEFAULT_HOLDOUT_MONTHS = 6;
const MARKET_CONTEXT_CACHE = new Map();
const PRICE_SYMBOL_ALIASES = {
  "BAJAJFINANCE.NS": "BAJFINANCE.NS",
  "DATAPATTERNS.NS": "DATAPATTNS.NS",
  "WPIL.NS": "WPIL.BO"
};

const arg = name => {
  const prefix = `--${name}=`;
  return process.argv.find(value => value.startsWith(prefix))?.slice(prefix.length) || null;
};

const flag = name => process.argv.includes(`--${name}`) || ["true", "1", "yes"].includes(String(arg(name) || "").toLowerCase());
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = (value, digits = 0) => Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
const iso = value => new Date(value).toISOString().slice(0, 10);
const addDays = (date, days) => iso(new Date(`${date}T12:00:00Z`).getTime() + days * DAY);
const addMonths = (date, months) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return iso(d);
};
const addYears = (date, years) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return iso(d);
};
const safeName = value => String(value || "unknown").replace(/[^a-z0-9_-]+/gi, "_");

function sovereigntyRows() {
  return productionSymbols.map(symbol => {
    const item = registry[symbol];
    return {
      symbol,
      preferredChartId: item?.preferredChartId || null,
      sourceVerification: item?.sourceVerification || "missing",
      anchorValidation: item?.anchorValidation || "missing",
      standardizedTwoYearValidation: item?.standardizedTwoYearValidation || "pending",
      timePrecision: item?.timePrecision || "missing",
      capitalAuthorityCeiling: item?.capitalAuthorityCeiling || "RESEARCH_ONLY",
      auditStatus: item?.auditStatus || "missing-registry-entry",
      candidateCount: item?.charts?.length || 0
    };
  });
}

function predictedBehaviour(reading = {}) {
  const expansion = Number(reading.expansion ?? reading.expansionScore ?? 50);
  const pressure = Number(reading.pressure ?? reading.pressureScore ?? 50);
  const leadership = Number(reading.leadership ?? reading.leadershipProbability ?? 50);
  if (expansion >= 62 && leadership >= 58 && expansion >= pressure + 6) return "UP";
  if (pressure >= 64 && pressure >= expansion + 6) return "DOWN";
  return "SIDEWAYS";
}

function readingShape(reading = {}) {
  const expansion = Number(reading.expansion ?? reading.expansionScore ?? 50);
  const pressure = Number(reading.pressure ?? reading.pressureScore ?? 50);
  const leadership = Number(reading.leadership ?? reading.leadershipProbability ?? 50);
  return {
    expansion,
    pressure,
    leadership,
    net: (expansion + leadership) / 2 - pressure,
    activation: Math.abs(expansion - 50) + Math.abs(pressure - 50) + Math.abs(leadership - 50),
    prediction: predictedBehaviour({ expansion, pressure, leadership })
  };
}

function topContacts(reading = {}) {
  return [...(reading.transitDetails || [])]
    .sort((a, b) => Math.abs(Number(b.score || 0)) - Math.abs(Number(a.score || 0)))
    .slice(0, 3)
    .map(item => `${item.planet} ${item.aspect} ${item.targetPlanet} (${Number(item.score || 0) >= 0 ? "+" : ""}${Math.round(Number(item.score || 0))})`)
    .join("; ");
}

function marketContext(date) {
  if (MARKET_CONTEXT_CACHE.has(date)) return MARKET_CONTEXT_CACHE.get(date);
  const transits = generateRealTransits(date);
  const eclipses = getRelevantEclipses(date, { daysBefore: 30, daysAfter: 30 });
  const context = { transits, eclipses };
  MARKET_CONTEXT_CACHE.set(date, context);
  return context;
}

async function replayScenario(symbol, chartId, date, includeContacts = true) {
  const company = await resolveCompany(symbol, null, { chartId, asOfDate: date });
  if (!company?.found) throw new Error(company?.error || `No registry entry for ${symbol}`);
  const natal = generateRealNatalChart(company);
  const { transits, eclipses } = marketContext(date);
  const eclipseHits = calculateRealEclipseHits(natal, {
    referenceDate: date,
    daysBefore: 30,
    daysAfter: 30,
    eclipses,
    orbLimit: 8
  });
  const reading = calculateTransitResonance(natal, { ...transits, relevantEclipses: eclipses, eclipseHits });
  const shaped = readingShape(reading);
  return {
    symbol,
    chartId,
    chartDate: natal.metadata.birthDate,
    replayDate: date,
    expansion: round(shaped.expansion),
    pressure: round(shaped.pressure),
    leadership: round(shaped.leadership),
    net: round(shaped.net, 2),
    activation: round(shaped.activation, 2),
    prediction: shaped.prediction,
    ...(includeContacts ? { contacts: topContacts(reading) } : {})
  };
}

async function runCandidateWorkbench(symbol, dates, outcomes) {
  const entry = registry[symbol];
  if (!entry) throw new Error(`${symbol} is missing from the natal registry.`);
  if (!dates.length) throw new Error("Candidate workbench requires --dates=YYYY-MM-DD,YYYY-MM-DD,...");
  if (outcomes.length && outcomes.length !== dates.length) throw new Error("--outcomes must contain one UP, DOWN or SIDEWAYS answer for every replay date.");

  const candidates = candidateCharts(entry);
  const results = [];
  for (const chart of candidates) {
    for (const date of dates) {
      if (date >= chart.date) results.push(await replayScenario(symbol, chart.id, date));
    }
  }

  console.log(`\nManual episode workbench: ${symbol}`);
  console.log("Swiss Ephemeris · Lahiri · identical replay dates. This legacy mode never promotes a chart.");
  console.table(results);

  if (outcomes.length) {
    const ranking = candidates.map(chart => {
      const chartRows = results.filter(row => row.chartId === chart.id);
      const matches = chartRows.filter((row, index) => row.prediction === outcomes[index]).length;
      return {
        chartId: chart.id,
        chartDate: chart.date,
        matches: `${matches}/${outcomes.length}`,
        fitPercent: round(matches / outcomes.length * 100),
        reviewStatus: outcomes.length < 3 ? "INSUFFICIENT EPISODES" : matches === outcomes.length ? "STRONG SHORTLIST — HUMAN REVIEW" : matches >= Math.ceil(outcomes.length * 0.67) ? "SHORTLIST — HUMAN REVIEW" : "WEAK FIT"
      };
    }).sort((a, b) => b.fitPercent - a.fitPercent);
    console.log("\nDirection-fit shortlist (price outcomes are answer keys only):");
    console.table(ranking);
  }
}

function candidateCharts(entry = {}) {
  const seen = new Set();
  return (entry.charts || []).filter(chart => {
    if (!chart?.id || !chart?.date) return false;
    const key = `${chart.id}|${chart.date}|${chart.time || ""}|${chart.city || ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && line[index + 1] === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function normalizePriceRows(rows) {
  return rows.map(row => {
    const numeric = value => value === null || value === undefined || value === ""
      ? null
      : (Number.isFinite(Number(value)) ? Number(value) : null);
    const close = numeric(row.close);
    const suppliedAdjustedClose = numeric(row.adjustedClose);
    const adjustedClose = suppliedAdjustedClose ?? close;
    const factor = Number.isFinite(close) && close !== 0 ? adjustedClose / close : 1;
    const adjusted = value => {
      const parsed = numeric(value);
      return parsed === null ? adjustedClose : parsed * factor;
    };
    return {
      date: iso(row.date),
      open: adjusted(row.open),
      high: adjusted(row.high),
      low: adjusted(row.low),
      close: adjustedClose,
      volume: numeric(row.volume)
    };
  }).filter(row => row.date && Number.isFinite(row.close) && row.close > 0).sort((a, b) => a.date.localeCompare(b.date));
}

function readPriceCsv(file) {
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error(`Price CSV has no rows: ${file}`);
  const headers = parseCsvLine(lines[0]).map(value => value.toLowerCase().replace(/[^a-z0-9]+/g, ""));
  const index = (...names) => names.map(name => headers.indexOf(name)).find(value => value >= 0) ?? -1;
  const dateIndex = index("date", "timestamp");
  const closeIndex = index("close");
  const adjustedIndex = index("adjclose", "adjustedclose");
  if (dateIndex < 0 || (closeIndex < 0 && adjustedIndex < 0)) throw new Error(`CSV requires Date and Close or Adj Close columns: ${file}`);
  const value = (cells, position) => position >= 0 ? cells[position] : null;
  return normalizePriceRows(lines.slice(1).map(line => {
    const cells = parseCsvLine(line);
    return {
      date: value(cells, dateIndex),
      open: value(cells, index("open")),
      high: value(cells, index("high")),
      low: value(cells, index("low")),
      close: value(cells, closeIndex >= 0 ? closeIndex : adjustedIndex),
      adjustedClose: value(cells, adjustedIndex),
      volume: value(cells, index("volume"))
    };
  }));
}

async function fetchYahooPrices(symbol, startDate, endDate) {
  const period1 = Math.floor(new Date(`${startDate}T00:00:00Z`).getTime() / 1000);
  const period2 = Math.floor(new Date(`${endDate}T23:59:59Z`).getTime() / 1000) + 86_400;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?period1=${period1}&period2=${period2}&interval=1d&events=div%2Csplits`;
  const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Fin-Lumen natal-audit" } });
  if (!response.ok) throw new Error(`Yahoo price request failed for ${symbol} (${response.status})`);
  const json = await response.json();
  const result = json?.chart?.result?.[0];
  if (!result) throw new Error(json?.chart?.error?.description || `No price data returned for ${symbol}`);
  const quote = result.indicators?.quote?.[0] || {};
  const adjusted = result.indicators?.adjclose?.[0]?.adjclose || [];
  return normalizePriceRows((result.timestamp || []).map((timestamp, index) => ({
    date: new Date(timestamp * 1000).toISOString().slice(0, 10),
    open: quote.open?.[index],
    high: quote.high?.[index],
    low: quote.low?.[index],
    close: quote.close?.[index],
    adjustedClose: adjusted[index],
    volume: quote.volume?.[index]
  })));
}

function possibleCsvFiles(directory, symbol) {
  const stem = symbol.replace(/\.NS$/i, "");
  return [symbol, stem, safeName(symbol), safeName(stem)].flatMap(name => [
    path.join(directory, `${name}.csv`),
    path.join(directory, `${name.toLowerCase()}.csv`)
  ]);
}

async function loadPrices(symbol, { startDate, endDate, provider, pricesDir, cacheDir }) {
  if (pricesDir) {
    const file = possibleCsvFiles(pricesDir, symbol).find(candidate => fs.existsSync(candidate));
    if (file) return { rows: readPriceCsv(file), source: `CSV:${file}` };
    if (provider === "csv") throw new Error(`No CSV found for ${symbol} in ${pricesDir}`);
  }
  const cacheFile = path.join(cacheDir, `${safeName(symbol)}__${startDate}__${endDate}.json`);
  if (fs.existsSync(cacheFile) && !flag("refresh-prices")) {
    return { rows: JSON.parse(fs.readFileSync(cacheFile, "utf8")), source: `CACHE:${cacheFile}` };
  }
  if (provider === "csv") throw new Error(`CSV provider selected but no usable file was found for ${symbol}`);
  const providerSymbol = PRICE_SYMBOL_ALIASES[symbol] || symbol;
  const rows = await fetchYahooPrices(providerSymbol, startDate, endDate);
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(rows));
  return { rows, source: `Yahoo chart API:${providerSymbol} (adjusted for splits/dividends)` };
}

function lowerBound(prices, date) {
  let low = 0;
  let high = prices.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (prices[mid].date < date) low = mid + 1;
    else high = mid;
  }
  return low < prices.length ? low : -1;
}

function buildSampleDates(startDate, endDate, stepDays) {
  const dates = [];
  for (let date = startDate; date <= endDate; date = addDays(date, stepDays)) dates.push(date);
  return dates;
}

function priceMetric(prices, benchmark, date, forwardDays) {
  const start = lowerBound(prices, date);
  const end = lowerBound(prices, addDays(date, forwardDays));
  if (start < 0 || end < 0 || end <= start) return null;
  const base = prices[start].close;
  const final = prices[end].close;
  const window = prices.slice(start, end + 1);
  const maxGain = Math.max(...window.map(row => row.high)) / base - 1;
  const maxDrawdown = Math.min(...window.map(row => row.low)) / base - 1;
  let benchmarkReturn = null;
  if (benchmark?.length) {
    const benchmarkStart = lowerBound(benchmark, date);
    const benchmarkEnd = lowerBound(benchmark, addDays(date, forwardDays));
    if (benchmarkStart >= 0 && benchmarkEnd > benchmarkStart) {
      benchmarkReturn = benchmark[benchmarkEnd].close / benchmark[benchmarkStart].close - 1;
    }
  }
  const stockReturn = final / base - 1;
  return {
    requestedDate: date,
    marketDate: prices[start].date,
    forwardMarketDate: prices[end].date,
    stockReturn,
    benchmarkReturn,
    relativeReturn: benchmarkReturn === null ? null : stockReturn - benchmarkReturn,
    targetReturn: benchmarkReturn === null ? stockReturn : stockReturn * 0.7 + (stockReturn - benchmarkReturn) * 0.3,
    maxGain,
    maxDrawdown,
    range: maxGain - maxDrawdown
  };
}

function percentile(values, p) {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

function labelActualObservations(raw) {
  const typicalMove = percentile(raw.map(row => Math.abs(row.stockReturn)), 0.5) || 0.06;
  const threshold = clamp(typicalMove * 0.9, 0.055, 0.12);
  const reversalThreshold = clamp(threshold * 1.5, 0.10, 0.18);
  return {
    threshold,
    reversalThreshold,
    rows: raw.map(row => {
      const reversal = row.maxGain >= reversalThreshold && row.maxDrawdown <= -reversalThreshold;
      const dormant = Math.abs(row.stockReturn) < threshold * 0.6 && row.range < threshold * 1.5;
      let actual = "SIDEWAYS";
      if (row.stockReturn >= threshold || (row.maxGain >= threshold * 1.35 && row.maxDrawdown > -threshold)) actual = "UP";
      else if (row.stockReturn <= -threshold || (row.maxDrawdown <= -threshold * 1.35 && row.maxGain < threshold)) actual = "DOWN";
      return { ...row, actual, reversal, dormant };
    })
  };
}

function isListing(chart = {}) {
  return String(chart.chartType || chart.id || "").toLowerCase().includes("listing");
}

function isIncorporation(chart = {}) {
  return String(chart.chartType || chart.id || "").toLowerCase().includes("incorporation");
}

function buildHypotheses(charts, includeBlends) {
  const hypotheses = charts.map(chart => ({
    id: chart.id,
    type: "single-chart",
    chartIds: [chart.id],
    label: `${chart.id} · ${chart.date}`,
    chartDate: chart.date,
    complexityPenalty: 0
  }));
  if (!includeBlends) return hypotheses;
  const listings = charts.filter(isListing);
  const incorporations = charts.filter(isIncorporation);
  for (const listing of listings) {
    for (const incorporation of incorporations) {
      hypotheses.push({
        id: `blend-70-30__${listing.id}__${incorporation.id}`,
        type: "numerical-70-30",
        chartIds: [listing.id, incorporation.id],
        label: `70% ${listing.id} / 30% ${incorporation.id}`,
        chartDate: [listing.date, incorporation.date].sort().at(-1),
        complexityPenalty: 2
      });
    }
  }
  // Test every dated anchor as the direction chart and every other anchor as
  // the structural overlay. Some companies have a meaningful operational
  // launch or corporatisation chart in addition to listing/incorporation.
  for (const direction of charts) {
    for (const structural of charts) {
      if (direction.id === structural.id) continue;
      hypotheses.push({
        id: `role-based__${direction.id}__${structural.id}`,
        type: "role-based-dual-chart",
        chartIds: [direction.id, structural.id],
        label: `${direction.id} direction + ${structural.id} structural overlay`,
        chartDate: [direction.date, structural.date].sort().at(-1),
        complexityPenalty: 1
      });
    }
  }
  return hypotheses;
}

async function calculateBaseChartSeries(symbol, charts, dates) {
  const series = {};
  for (const chart of charts) {
    const company = await resolveCompany(symbol, null, { chartId: chart.id });
    if (!company?.found) throw new Error(company?.error || `Unable to resolve ${symbol}/${chart.id}`);
    const natal = generateRealNatalChart(company);
    const rows = [];
    for (const date of dates) {
      if (date < chart.date) continue;
      const { transits, eclipses } = marketContext(date);
      const eclipseHits = calculateRealEclipseHits(natal, {
        referenceDate: date,
        daysBefore: 30,
        daysAfter: 30,
        eclipses,
        orbLimit: 8
      });
      const reading = calculateTransitResonance(natal, { ...transits, relevantEclipses: eclipses, eclipseHits });
      series[chart.id] ||= new Map();
      series[chart.id].set(date, { replayDate: date, ...readingShape(reading), contacts: topContacts(reading) });
      rows.push(date);
    }
    if (!rows.length) series[chart.id] ||= new Map();
  }
  return series;
}

function hypothesisSeries(hypothesis, baseSeries, dates) {
  if (hypothesis.type === "single-chart") return dates.map(date => baseSeries[hypothesis.chartIds[0]]?.get(date)).filter(Boolean);
  const [directionId, structuralId] = hypothesis.chartIds;
  return dates.map(date => {
    const direction = baseSeries[directionId]?.get(date);
    const structural = baseSeries[structuralId]?.get(date);
    if (!direction || !structural) return null;
    let expansion;
    let pressure;
    let leadership;
    if (hypothesis.type === "numerical-70-30") {
      expansion = direction.expansion * 0.7 + structural.expansion * 0.3;
      pressure = direction.pressure * 0.7 + structural.pressure * 0.3;
      leadership = direction.leadership * 0.7 + structural.leadership * 0.3;
    } else {
      expansion = direction.expansion;
      leadership = direction.leadership * 0.8 + structural.leadership * 0.2;
      pressure = Math.max(direction.pressure, direction.pressure * 0.7 + structural.pressure * 0.3);
    }
    const shaped = readingShape({ expansion, pressure, leadership });
    return {
      replayDate: date,
      ...shaped,
      contacts: hypothesis.type === "role-based-dual-chart"
        ? `Direction: ${direction.contacts || "—"}; structural overlay: ${structural.contacts || "—"}`
        : `Direction: ${direction.contacts || "—"}; structural overlay: ${structural.contacts || "—"}`
    };
  }).filter(Boolean);
}

function ranks(values) {
  const indexed = values.map((value, index) => ({ value, index })).sort((a, b) => a.value - b.value);
  const output = Array(values.length);
  for (let start = 0; start < indexed.length;) {
    let end = start;
    while (end + 1 < indexed.length && indexed[end + 1].value === indexed[start].value) end += 1;
    const rank = (start + end) / 2 + 1;
    for (let index = start; index <= end; index += 1) output[indexed[index].index] = rank;
    start = end + 1;
  }
  return output;
}

function pearson(left, right) {
  if (left.length !== right.length || left.length < 3) return 0;
  const leftMean = left.reduce((sum, value) => sum + value, 0) / left.length;
  const rightMean = right.reduce((sum, value) => sum + value, 0) / right.length;
  let numerator = 0;
  let leftSquare = 0;
  let rightSquare = 0;
  for (let index = 0; index < left.length; index += 1) {
    const a = left[index] - leftMean;
    const b = right[index] - rightMean;
    numerator += a * b;
    leftSquare += a * a;
    rightSquare += b * b;
  }
  return leftSquare && rightSquare ? numerator / Math.sqrt(leftSquare * rightSquare) : 0;
}

const spearman = (left, right) => pearson(ranks(left), ranks(right));

function classRecall(rows, label) {
  const actual = rows.filter(row => row.actual === label);
  return actual.length ? actual.filter(row => row.prediction === label).length / actual.length : null;
}

function macroF1(rows) {
  const scores = ["UP", "DOWN", "SIDEWAYS"].map(label => {
    const tp = rows.filter(row => row.actual === label && row.prediction === label).length;
    const fp = rows.filter(row => row.actual !== label && row.prediction === label).length;
    const fn = rows.filter(row => row.actual === label && row.prediction !== label).length;
    return tp ? 2 * tp / (2 * tp + fp + fn) : 0;
  });
  return scores.reduce((sum, value) => sum + value, 0) / scores.length;
}

function metrics(rows, expectedCount) {
  if (!rows.length) return { samples: 0, score: 0 };
  const accuracy = rows.filter(row => row.actual === row.prediction).length / rows.length;
  const upRecall = classRecall(rows, "UP");
  const downRecall = classRecall(rows, "DOWN");
  const sidewaysRecall = classRecall(rows, "SIDEWAYS");
  const dormantRows = rows.filter(row => row.dormant);
  const dormancyRecall = dormantRows.length
    ? dormantRows.filter(row => row.expansion < 58 && row.pressure < 58 && row.leadership < 58).length / dormantRows.length
    : null;
  const reversalRows = rows.filter(row => row.reversal);
  const reversalRecall = reversalRows.length
    ? reversalRows.filter(row => row.expansion >= 58 && row.pressure >= 58).length / reversalRows.length
    : null;
  const netCorrelation = spearman(rows.map(row => row.net), rows.map(row => row.targetReturn));
  const expansionCorrelation = spearman(rows.map(row => row.expansion), rows.map(row => row.maxGain));
  const pressureCorrelation = spearman(rows.map(row => row.pressure), rows.map(row => -row.maxDrawdown));
  const available = value => value === null ? 0.5 : value;
  const coverage = clamp(rows.length / Math.max(1, expectedCount), 0, 1);
  const score = accuracy * 20
    + macroF1(rows) * 15
    + Math.max(0, netCorrelation) * 15
    + Math.max(0, expansionCorrelation) * 8
    + Math.max(0, pressureCorrelation) * 8
    + available(upRecall) * 8
    + available(downRecall) * 8
    + available(sidewaysRecall) * 5
    + available(dormancyRecall) * 5
    + available(reversalRecall) * 4
    + coverage * 4;
  return {
    samples: rows.length,
    score: round(score, 2),
    directionAccuracy: round(accuracy * 100, 1),
    macroF1: round(macroF1(rows) * 100, 1),
    upRecall: round(available(upRecall) * 100, 1),
    downRecall: round(available(downRecall) * 100, 1),
    sidewaysRecall: round(available(sidewaysRecall) * 100, 1),
    dormancyRecall: round(available(dormancyRecall) * 100, 1),
    reversalRecall: round(available(reversalRecall) * 100, 1),
    netReturnCorrelation: round(netCorrelation, 3),
    expansionGainCorrelation: round(expansionCorrelation, 3),
    pressureDrawdownCorrelation: round(pressureCorrelation, 3),
    coverage: round(coverage * 100, 1)
  };
}

const EVENT_TYPES = {
  expansion: {
    weight: 30,
    astro: row => row.expansion >= 64 && row.leadership >= 60 && row.expansion >= row.pressure + 5,
    actual: row => row.actual === "UP",
    astroStrength: row => (row.expansion + row.leadership) / 2 - row.pressure,
    actualStrength: row => Math.max(row.stockReturn, row.maxGain)
  },
  pressure: {
    weight: 30,
    astro: row => row.pressure >= 64 && row.pressure >= row.expansion + 5,
    actual: row => row.actual === "DOWN",
    astroStrength: row => row.pressure - (row.expansion + row.leadership) / 2,
    actualStrength: row => -row.maxDrawdown
  },
  dormancy: {
    weight: 15,
    astro: row => row.expansion < 58 && row.pressure < 60 && row.leadership < 58,
    actual: row => row.dormant,
    astroStrength: row => 60 - Math.max(row.expansion, row.pressure, row.leadership),
    actualStrength: row => 1 / (0.01 + Math.abs(row.stockReturn) + row.range)
  },
  reversal: {
    weight: 10,
    astro: row => row.expansion >= 60 && row.pressure >= 60,
    actual: row => row.reversal,
    astroStrength: row => Math.min(row.expansion, row.pressure) - 50,
    actualStrength: row => row.range
  }
};

function mergeEpisodes(rows, predicate, strength, maxGapDays) {
  const active = rows.filter(predicate).sort((a, b) => a.requestedDate.localeCompare(b.requestedDate));
  const episodes = [];
  for (const row of active) {
    const last = episodes.at(-1);
    const gap = last ? (new Date(`${row.requestedDate}T00:00:00Z`) - new Date(`${last.end}T00:00:00Z`)) / DAY : Infinity;
    if (!last || gap > maxGapDays) {
      episodes.push({ start: row.requestedDate, end: row.requestedDate, peak: row, strength: strength(row) });
    } else {
      last.end = row.requestedDate;
      const nextStrength = strength(row);
      if (nextStrength > last.strength) {
        last.peak = row;
        last.strength = nextStrength;
      }
    }
  }
  return episodes;
}

function matchEpisodes(predicted, actual, stepDays, forwardDays) {
  const used = new Set();
  const matches = [];
  for (const prediction of predicted) {
    const predictionMs = new Date(`${prediction.peak.requestedDate}T00:00:00Z`).getTime();
    const candidates = actual.map((episode, index) => {
      const actualMs = new Date(`${episode.peak.requestedDate}T00:00:00Z`).getTime();
      return { episode, index, lagDays: (actualMs - predictionMs) / DAY };
    }).filter(item => !used.has(item.index) && item.lagDays >= -stepDays && item.lagDays <= forwardDays)
      .sort((a, b) => Math.abs(a.lagDays) - Math.abs(b.lagDays));
    const match = candidates[0];
    if (match) {
      used.add(match.index);
      matches.push({ prediction, actual: match.episode, lagDays: match.lagDays });
    }
  }
  return matches;
}

function eventMetrics(rows, stepDays, forwardDays) {
  if (!rows.length) return { samples: 0, score: 0, actualEpisodes: 0, predictedEpisodes: 0, matchedEpisodes: 0, byType: {} };
  const byType = {};
  let weightedF1 = 0;
  let applicableWeight = 0;
  let predictedTotal = 0;
  let actualTotal = 0;
  let matchedTotal = 0;
  const lags = [];
  const predictedStrengths = [];
  const actualStrengths = [];
  for (const [type, config] of Object.entries(EVENT_TYPES)) {
    const predicted = mergeEpisodes(rows, config.astro, config.astroStrength, stepDays * 1.5);
    const actual = mergeEpisodes(rows, config.actual, config.actualStrength, stepDays * 1.5);
    const matches = matchEpisodes(predicted, actual, stepDays, forwardDays);
    const precision = predicted.length ? matches.length / predicted.length : (actual.length ? 0 : 1);
    const recall = actual.length ? matches.length / actual.length : (predicted.length ? 0 : 1);
    const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
    const applicable = predicted.length > 0 || actual.length > 0;
    if (applicable) {
      weightedF1 += f1 * config.weight;
      applicableWeight += config.weight;
    }
    predictedTotal += predicted.length;
    actualTotal += actual.length;
    matchedTotal += matches.length;
    for (const match of matches) {
      lags.push(match.lagDays);
      predictedStrengths.push(match.prediction.strength);
      actualStrengths.push(match.actual.strength);
    }
    byType[type] = {
      predicted: predicted.length,
      actual: actual.length,
      matched: matches.length,
      precision: round(precision * 100, 1),
      recall: round(recall * 100, 1),
      f1: round(f1 * 100, 1),
      meanLagDays: matches.length ? round(matches.reduce((sum, item) => sum + item.lagDays, 0) / matches.length, 1) : null
    };
  }
  const typeScore = applicableWeight ? weightedF1 / applicableWeight * 85 : 0;
  const timingScore = lags.length
    ? lags.reduce((sum, lag) => sum + clamp(1 - Math.abs(lag) / Math.max(forwardDays, 1), 0, 1), 0) / lags.length
    : 0;
  const intensityCorrelation = predictedStrengths.length >= 3 ? spearman(predictedStrengths, actualStrengths) : 0;
  const score = typeScore + timingScore * 8 + Math.max(0, intensityCorrelation) * 7;
  return {
    samples: rows.length,
    score: round(score, 2),
    actualEpisodes: actualTotal,
    predictedEpisodes: predictedTotal,
    matchedEpisodes: matchedTotal,
    episodePrecision: round((predictedTotal ? matchedTotal / predictedTotal : 0) * 100, 1),
    episodeRecall: round((actualTotal ? matchedTotal / actualTotal : 0) * 100, 1),
    timingScore: round(timingScore * 100, 1),
    intensityCorrelation: round(intensityCorrelation, 3),
    byType
  };
}

function scoreHypothesis(hypothesis, astroRows, actualRows, holdoutStart, stepDays = DEFAULT_STEP_DAYS, forwardDays = DEFAULT_FORWARD_DAYS) {
  const actualByDate = new Map(actualRows.map(row => [row.requestedDate, row]));
  const joined = astroRows.map(astro => {
    const actual = actualByDate.get(astro.replayDate);
    return actual ? { ...actual, ...astro } : null;
  }).filter(Boolean);
  const calibrationRows = joined.filter(row => row.requestedDate < holdoutStart);
  const holdoutRows = joined.filter(row => row.requestedDate >= holdoutStart);
  const expectedCalibration = actualRows.filter(row => row.requestedDate < holdoutStart).length;
  const expectedHoldout = actualRows.filter(row => row.requestedDate >= holdoutStart).length;
  const calibration = eventMetrics(calibrationRows, stepDays, forwardDays);
  const holdout = eventMetrics(holdoutRows, stepDays, forwardDays);
  const continuousDiagnostics = {
    calibration: metrics(calibrationRows, expectedCalibration),
    holdout: metrics(holdoutRows, expectedHoldout)
  };
  const sufficient = calibration.samples >= 12 && holdout.samples >= 6 && calibration.actualEpisodes >= 3 && holdout.actualEpisodes >= 2;
  const stabilityPenalty = sufficient ? Math.abs(calibration.score - holdout.score) * 0.15 : 20;
  const finalScore = Math.max(0, calibration.score * 0.55 + holdout.score * 0.45 - stabilityPenalty - hypothesis.complexityPenalty);
  return {
    ...hypothesis,
    samples: joined.length,
    calibration,
    holdout,
    continuousDiagnostics,
    stabilityPenalty: round(stabilityPenalty, 2),
    complexityPenalty: hypothesis.complexityPenalty,
    finalScore: round(finalScore, 2),
    sufficient,
    joined
  };
}

function shortlistStatus(ranking) {
  const top = ranking[0];
  const next = ranking[1];
  if (!top || !top.sufficient) return { status: "INSUFFICIENT DATA", margin: null, promotable: false };
  if (!next) return { status: "NO COMPARATOR — VERIFY MORE CANDIDATE ANCHORS", margin: null, promotable: false };
  const margin = next ? top.finalScore - next.finalScore : top.finalScore;
  if (top.finalScore >= 65 && top.holdout.score >= 62 && margin >= 7) {
    return { status: "STRONG SHORTLIST — HUMAN CONFIRMATION REQUIRED", margin: round(margin, 2), promotable: false };
  }
  if (top.finalScore >= 58 && top.holdout.score >= 55 && margin >= 4) {
    return { status: "SHORTLIST — HUMAN REVIEW REQUIRED", margin: round(margin, 2), promotable: false };
  }
  if (top.finalScore >= 45 && top.holdout.score >= 40 && margin >= 7) {
    return { status: "RELATIVE LEADER — MANUAL ASTRO REVIEW", margin: round(margin, 2), promotable: false };
  }
  if (margin < 4) return { status: "AMBIGUOUS — KEEP RESEARCH ONLY", margin: round(margin, 2), promotable: false };
  if (margin >= 7) return { status: "LOW ABSOLUTE FIT — REVIEW TRANSLATOR/ANCHORS", margin: round(margin, 2), promotable: false };
  return { status: "INCONCLUSIVE — KEEP RESEARCH ONLY", margin: round(margin, 2), promotable: false };
}

function importantEpisodes(rows) {
  const unique = new Map();
  const take = (label, candidates, sorter, count = 2) => {
    for (const row of [...candidates].sort(sorter).slice(0, count)) {
      if (!unique.has(row.requestedDate)) unique.set(row.requestedDate, { label, ...row });
    }
  };
  take("strongest expansion", rows.filter(row => row.actual === "UP"), (a, b) => b.stockReturn - a.stockReturn);
  take("deepest pressure", rows.filter(row => row.actual === "DOWN"), (a, b) => a.maxDrawdown - b.maxDrawdown);
  take("reversal", rows.filter(row => row.reversal), (a, b) => b.range - a.range, 1);
  take("dormancy", rows.filter(row => row.dormant), (a, b) => Math.abs(a.stockReturn) - Math.abs(b.stockReturn), 1);
  return [...unique.values()].sort((a, b) => a.requestedDate.localeCompare(b.requestedDate)).map(row => ({
    episode: row.label,
    date: row.requestedDate,
    actual: row.actual,
    prediction: row.prediction,
    stockReturn30d: round(row.stockReturn * 100, 2),
    relativeReturn30d: row.relativeReturn === null ? null : round(row.relativeReturn * 100, 2),
    maxGain30d: round(row.maxGain * 100, 2),
    maxDrawdown30d: round(row.maxDrawdown * 100, 2),
    expansion: round(row.expansion),
    pressure: round(row.pressure),
    leadership: round(row.leadership),
    topContacts: row.contacts
  }));
}

async function auditOneSymbol(symbol, options, benchmarkPrices) {
  const entry = registry[symbol];
  if (!entry) throw new Error(`${symbol} is missing from the natal registry.`);
  const charts = candidateCharts(entry);
  if (!charts.length) throw new Error(`${symbol} has no dated natal candidates.`);
  const priceResult = await loadPrices(symbol, options);
  const prices = priceResult.rows;
  if (prices.length < 100) throw new Error(`${symbol} has only ${prices.length} daily price rows; two-year audit requires at least 100.`);
  const lastAvailable = prices.at(-1).date < options.endDate ? prices.at(-1).date : options.endDate;
  const signalEnd = addDays(lastAvailable, -options.forwardDays);
  if (signalEnd <= options.startDate) throw new Error(`${symbol} lacks a full forward-price horizon inside the requested period.`);
  const dates = buildSampleDates(options.startDate, signalEnd, options.stepDays);
  const rawActual = dates.map(date => priceMetric(prices, benchmarkPrices, date, options.forwardDays)).filter(Boolean);
  const actual = labelActualObservations(rawActual);
  const baseSeries = await calculateBaseChartSeries(symbol, charts, dates);
  const hypotheses = buildHypotheses(charts, options.includeBlends);
  const holdoutStart = addMonths(signalEnd, -options.holdoutMonths);
  const ranking = hypotheses.map(hypothesis => scoreHypothesis(
    hypothesis,
    hypothesisSeries(hypothesis, baseSeries, dates),
    actual.rows,
    holdoutStart,
    options.stepDays,
    options.forwardDays
  )).sort((a, b) => b.finalScore - a.finalScore);
  const decision = shortlistStatus(ranking);
  const top = ranking[0];
  return {
    schemaVersion: "3.0",
    symbol,
    companyName: entry.companyName || symbol,
    generatedAt: new Date().toISOString(),
    method: "Astrology is calculated first and unchanged; adjusted price behaviour is used only as the answer key. No automatic registry promotion.",
    requestedPeriod: { startDate: options.startDate, endDate: options.endDate },
    testedSignalPeriod: { startDate: options.startDate, endDate: signalEnd, forwardDays: options.forwardDays, stepDays: options.stepDays },
    split: { calibrationEnd: addDays(holdoutStart, -1), holdoutStart, holdoutEnd: signalEnd },
    priceSource: priceResult.source,
    benchmark: options.benchmark,
    actualBehaviourThresholds: { directionalMovePercent: round(actual.threshold * 100, 2), reversalRangePercent: round(actual.reversalThreshold * 100, 2) },
    existingRegistryState: {
      preferredChartId: entry.preferredChartId,
      sourceVerification: entry.sourceVerification,
      anchorValidation: entry.anchorValidation,
      standardizedTwoYearValidation: entry.standardizedTwoYearValidation || "pending",
      capitalAuthorityCeiling: entry.capitalAuthorityCeiling,
      definitiveProductionAnchor: Boolean(entry.definitiveProductionAnchor)
    },
    candidates: charts.map(chart => ({
      id: chart.id,
      chartType: chart.chartType,
      date: chart.date,
      time: chart.time,
      city: chart.city,
      timePrecision: String(chart.chartType || "").includes("listing") ? "exchange-open-default" : "event/default-time — Moon precision limited",
      confidence: chart.confidence,
      source: chart.source
    })),
    hypotheses: ranking.map(({ joined, ...row }) => row),
    recommendation: {
      ...decision,
      topHypothesisId: top?.id || null,
      topHypothesisType: top?.type || null,
      topHypothesisLabel: top?.label || null,
      finalScore: top?.finalScore ?? null,
      holdoutScore: top?.holdout?.score ?? null,
      rule: entry.definitiveProductionAnchor
        ? "Locked-ledger reference only. Automated fit may evaluate the translator but cannot reopen or downgrade the natal anchor."
        : "A shortlist is evidence for human confirmation, never automatic natal promotion. Source verification and time-precision review remain independent gates."
    },
    topHypothesisEpisodes: top ? importantEpisodes(top.joined) : []
  };
}

function csvEscape(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeAuditArtifacts(reports, failures, options) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const runDir = path.join(options.outputDir, `two-year-${stamp}`);
  fs.mkdirSync(runDir, { recursive: true });
  const summary = reports.map(report => ({
    symbol: report.symbol,
    ledgerStatus: report.existingRegistryState.definitiveProductionAnchor ? "LOCKED_REFERENCE_ONLY" : "REQUIRES_REVIEW",
    existingPreferred: report.existingRegistryState.preferredChartId,
    topHypothesis: report.recommendation.topHypothesisId,
    hypothesisType: report.recommendation.topHypothesisType,
    finalScore: report.recommendation.finalScore,
    holdoutScore: report.recommendation.holdoutScore,
    margin: report.recommendation.margin,
    status: report.recommendation.status,
    candidateCount: report.candidates.length
  }));
  fs.writeFileSync(path.join(runDir, "audit-results.json"), JSON.stringify({
    schemaVersion: "3.0",
    generatedAt: new Date().toISOString(),
    productionImpact: "none",
    automaticPromotion: false,
    options: {
      startDate: options.startDate,
      endDate: options.endDate,
      stepDays: options.stepDays,
      forwardDays: options.forwardDays,
      holdoutMonths: options.holdoutMonths,
      includeBlends: options.includeBlends,
      benchmark: options.benchmark
    },
    summary,
    failures,
    reports
  }, null, 2));
  const reviewSummary = summary.filter(row => row.ledgerStatus === "REQUIRES_REVIEW");
  const headers = Object.keys(reviewSummary[0] || summary[0] || { symbol: "" });
  const csv = [headers.join(","), ...reviewSummary.map(row => headers.map(key => csvEscape(row[key])).join(","))].join("\n");
  fs.writeFileSync(path.join(runDir, "review-queue.csv"), `${csv}\n`);
  const markdown = [
    "# Fin-Lumen two-year natal audit review queue",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "> Astrology was calculated before comparison. Price is the answer key only. No result in this report changes the production registry automatically.",
    "",
    "| Symbol | Existing anchor | Top hypothesis | Final | Holdout | Margin | Review status |",
    "|---|---|---|---:|---:|---:|---|",
    ...reviewSummary.map(row => `| ${row.symbol} | ${row.existingPreferred || "—"} | ${row.topHypothesis || "—"} | ${row.finalScore ?? "—"} | ${row.holdoutScore ?? "—"} | ${row.margin ?? "—"} | ${row.status} |`),
    ...(!reviewSummary.length ? ["| — | — | — | — | — | — | No unlocked records in this run |"] : []),
    ...(summary.some(row => row.ledgerStatus === "LOCKED_REFERENCE_ONLY") ? ["", "## Locked reference results", "", "These rows may diagnose the astrology translator but cannot change the confirmed natal ledger.", "", ...summary.filter(row => row.ledgerStatus === "LOCKED_REFERENCE_ONLY").map(row => `- ${row.symbol}: ${row.topHypothesis || "—"} (reference status: ${row.status})`)] : []),
    ...(failures.length ? ["", "## Failures", "", ...failures.map(item => `- ${item.symbol}: ${item.error}`)] : [])
  ].join("\n");
  fs.writeFileSync(path.join(runDir, "review-queue.md"), `${markdown}\n`);
  return runDir;
}

async function runTwoYearAudit(symbols, options) {
  fs.mkdirSync(options.cacheDir, { recursive: true });
  let benchmarkPrices = [];
  let benchmarkWarning = null;
  if (options.benchmark) {
    try {
      benchmarkPrices = (await loadPrices(options.benchmark, options)).rows;
    } catch (error) {
      benchmarkWarning = `Benchmark unavailable; absolute stock behaviour only: ${error.message}`;
      console.warn(benchmarkWarning);
    }
  }
  const reports = [];
  const failures = [];
  for (let index = 0; index < symbols.length; index += 1) {
    const symbol = symbols[index];
    console.log(`\n[${index + 1}/${symbols.length}] Two-year natal audit: ${symbol}`);
    try {
      const report = await auditOneSymbol(symbol, options, benchmarkPrices);
      reports.push(report);
      console.table(report.hypotheses.map(row => ({
        hypothesis: row.id,
        type: row.type,
        final: row.finalScore,
        calibration: row.calibration.score,
        holdout: row.holdout.score,
        samples: row.samples
      })));
      console.log(`${report.recommendation.status}: ${report.recommendation.topHypothesisId} (margin ${report.recommendation.margin ?? "—"}).`);
    } catch (error) {
      failures.push({ symbol, error: error.message });
      console.error(`${symbol}: ${error.message}`);
      if (!options.continueOnError) throw error;
    }
  }
  if (benchmarkWarning) failures.unshift({ symbol: options.benchmark, error: benchmarkWarning, nonFatal: true });
  const runDir = writeAuditArtifacts(reports, failures, options);
  console.log(`\nAudit complete: ${reports.length} reports, ${failures.filter(item => !item.nonFatal).length} failures.`);
  console.log(`Review artifacts: ${runDir}`);
  console.log("Production registry unchanged. Human confirmation is mandatory before promotion.");
  if (failures.some(item => !item.nonFatal)) process.exitCode = 1;
}

function runSelfTest() {
  const actual = [];
  const good = [];
  const bad = [];
  for (let index = 0; index < 40; index += 1) {
    const requestedDate = addDays("2024-01-01", index * 14);
    const phase = index % 3;
    const actualLabel = phase === 0 ? "UP" : phase === 1 ? "DOWN" : "SIDEWAYS";
    const stockReturn = actualLabel === "UP" ? 0.12 : actualLabel === "DOWN" ? -0.12 : 0.01;
    actual.push({ requestedDate, actual: actualLabel, stockReturn, targetReturn: stockReturn, maxGain: actualLabel === "UP" ? 0.15 : 0.03, maxDrawdown: actualLabel === "DOWN" ? -0.15 : -0.03, dormant: actualLabel === "SIDEWAYS", reversal: false });
    const goodReading = actualLabel === "UP"
      ? readingShape({ expansion: 75, pressure: 45, leadership: 72 })
      : actualLabel === "DOWN"
        ? readingShape({ expansion: 45, pressure: 75, leadership: 45 })
        : readingShape({ expansion: 52, pressure: 52, leadership: 52 });
    good.push({ replayDate: requestedDate, ...goodReading });
    bad.push({ replayDate: requestedDate, ...readingShape({ expansion: 52, pressure: 52, leadership: 52 }) });
  }
  const hypothesis = { id: "test", type: "single-chart", chartIds: ["test"], label: "test", chartDate: "2000-01-01", complexityPenalty: 0 };
  const holdoutStart = addMonths(actual.at(-1).requestedDate, -4);
  const goodScore = scoreHypothesis(hypothesis, good, actual, holdoutStart);
  const badScore = scoreHypothesis(hypothesis, bad, actual, holdoutStart);
  if (!(goodScore.finalScore > badScore.finalScore + 20)) throw new Error(`Self-test ranking failed: good=${goodScore.finalScore}, bad=${badScore.finalScore}`);
  const blends = buildHypotheses([
    { id: "listing", chartType: "listing", date: "2020-01-01" },
    { id: "incorporation", chartType: "incorporation", date: "2000-01-01" }
  ], true);
  if (!blends.some(item => item.type === "numerical-70-30") || !blends.some(item => item.type === "role-based-dual-chart")) throw new Error("Self-test blend generation failed");
  if (!blends.some(item => item.id === "role-based__incorporation__listing")) throw new Error("Self-test ordered role generation failed");
  const normalized = normalizePriceRows([
    { date: "2026-01-01", close: 100, adjustedClose: 98 },
    { date: "2026-01-02", close: null, adjustedClose: null },
    { date: "2026-01-03", close: "", adjustedClose: "" }
  ]);
  if (normalized.length !== 1 || normalized[0].close !== 98) throw new Error("Self-test missing-price normalization failed");
  console.log(`Two-year audit self-test passed. Good=${goodScore.finalScore}; weak=${badScore.finalScore}; hypotheses=${blends.length}.`);
}

const rows = sovereigntyRows();
const missing = rows.filter(row => !registry[row.symbol]);
const completed = rows.filter(row => registry[row.symbol]?.definitiveProductionAnchor === true);
const outstanding = rows.filter(row => registry[row.symbol]?.definitiveProductionAnchor !== true);
const authorityLeaks = rows.filter(row => (
  registry[row.symbol]?.definitiveProductionAnchor === true
    ? /LOW-SOURCE/.test(String(registry[row.symbol]?.confidence || "").toUpperCase())
      ? row.capitalAuthorityCeiling !== "PART_BUILD_MAX"
      : row.capitalAuthorityCeiling !== "FULL_BUILD_ELIGIBLE"
    : row.capitalAuthorityCeiling !== "RESEARCH_ONLY"
));
const priority = row => row.sourceVerification !== "unverified" && String(row.sourceVerification).includes("verified") ? 1
    : row.candidateCount > 1 ? 2 : 3;

if (flag("self-test")) {
  runSelfTest();
} else if (flag("two-year") || arg("mode") === "two-year") {
  const endDate = arg("end") || new Date().toISOString().slice(0, 10);
  const startDate = arg("start") || addYears(endDate, -2);
  const requested = String(arg("symbol") || "").split(",").map(value => value.trim().toUpperCase()).filter(Boolean);
  const symbols = flag("all")
    ? productionSymbols.filter(symbol => flag("include-locked") || registry[symbol]?.definitiveProductionAnchor !== true)
    : requested;
  if (!symbols.length) throw new Error("Two-year mode requires --symbol=TICKER.NS or --all.");
  const outputDir = path.resolve(arg("output-dir") || path.join(root, "data", "natalAuditRuns"));
  const options = {
    startDate,
    endDate,
    stepDays: Number(arg("step-days") || DEFAULT_STEP_DAYS),
    forwardDays: Number(arg("forward-days") || DEFAULT_FORWARD_DAYS),
    holdoutMonths: Number(arg("holdout-months") || DEFAULT_HOLDOUT_MONTHS),
    includeBlends: !["false", "0", "no"].includes(String(arg("include-blends") || "true").toLowerCase()),
    benchmark: arg("benchmark") === "none" ? null : (arg("benchmark") || "^NSEI"),
    provider: String(arg("provider") || "auto").toLowerCase(),
    pricesDir: arg("prices-dir") ? path.resolve(arg("prices-dir")) : null,
    cacheDir: path.join(outputDir, "price-cache"),
    outputDir,
    continueOnError: flag("all") || flag("continue-on-error")
  };
  if (!Number.isFinite(options.stepDays) || options.stepDays < 7) throw new Error("--step-days must be at least 7 to limit overlapping samples.");
  if (!Number.isFinite(options.forwardDays) || options.forwardDays < 10) throw new Error("--forward-days must be at least 10.");
  await runTwoYearAudit(symbols, options);
} else {
  const workbenchSymbol = String(arg("symbol") || "").trim().toUpperCase();
  if (workbenchSymbol) {
    const dates = String(arg("dates") || "").split(",").map(value => value.trim()).filter(Boolean);
    const outcomes = String(arg("outcomes") || "").split(",").map(value => value.trim().toUpperCase()).filter(Boolean);
    await runCandidateWorkbench(workbenchSymbol, dates, outcomes);
  } else {
    console.log(`Natal Sovereignty audit: ${completed.length}/${rows.length} production symbols user-confirmed and locked; ${outstanding.length} outstanding; ${missing.length} missing registry entries.`);
    console.log(`Locked-ledger confirmations: ${completed.length}/${rows.length}.`);
    console.log(`Authority leaks: ${authorityLeaks.length}.`);
    console.table(outstanding.sort((a, b) => priority(a) - priority(b) || a.symbol.localeCompare(b.symbol)));
    console.log("\nContinuous audit: npm run audit:natal:two-year -- --symbol=BATAINDIA.NS");
    console.log("Outstanding universe: npm run audit:natal:two-year -- --all --continue-on-error");
    console.log("Include locked anchors as non-sovereign research references: add --include-locked");
    console.log("CSV fallback: add --provider=csv --prices-dir=/absolute/path/to/csv-folder");
  }
}

if (missing.length || authorityLeaks.length) process.exitCode = 1;
