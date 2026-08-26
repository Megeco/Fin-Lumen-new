import assert from "node:assert/strict";
import fs from "node:fs";
import replayHandler from "../pages/api/replay-lab.js";

const replayDate = "2024-08-15";
const tickers = [
  "ANANTRAJ.NS", "BEL.NS", "BAJAJFINANCE.NS", "COCHINSHIP.NS", "ICICIBANK.NS",
  "ETERNAL.NS", "KPITTECH.NS", "VEDL.NS", "TATAPOWER.NS", "CUMMINSIND.NS",
  "ENGINERSIN.NS", "TRENT.NS", "CDSL.NS", "DMART.NS", "LUPIN.NS"
];

function runReplay(ticker) {
  return new Promise((resolve, reject) => {
    const req = { query: { ticker, date: replayDate, forwardDays: "730" } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.statusCode >= 400 ? reject(new Error(`${ticker}: ${body.error || this.statusCode}`)) : resolve(body); }
    };
    Promise.resolve(replayHandler(req, res)).catch(reject);
  });
}

function eventProjection(event) {
  if (!event) return null;
  return {
    kind: event.kind,
    eventType: event.eventType,
    label: event.label,
    start: event.start,
    peak: event.peak,
    end: event.end,
    expansion: event.expansion,
    pressure: event.pressure,
    leadership: event.leadership,
    pressureClass: event.pressureClass,
    signalClass: event.signalClass,
    breakMapped: Boolean(event.breakQualification?.mapped),
    evidence: event.breakQualification?.evidence || []
  };
}

const baselinePath = new URL("../../../replay-audit-15-model-output.json", import.meta.url);
const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
const baselineByTicker = new Map(baseline.results.map(result => [result.ticker, result]));
const results = [];

for (const ticker of tickers) {
  const payload = await runReplay(ticker);
  const model = payload.astroModel;
  const prior = baselineByTicker.get(ticker);
  assert.ok(prior, `${ticker}: baseline missing`);
  assert.equal(model.current.legacyState, prior.current.state, `${ticker}: legacy state provenance changed`);
  assert.deepEqual(model.scores, prior.scores, `${ticker}: authoritative scores changed`);
  assert.deepEqual(eventProjection(model.research.legacyWindowReference.rerating), prior.rerating, `${ticker}: legacy rerating reference changed`);
  assert.deepEqual(eventProjection(model.research.legacyWindowReference.pressure), prior.pressure, `${ticker}: legacy pressure reference changed`);
  assert.deepEqual(eventProjection(model.windows.breakRisk), prior.breakRisk, `${ticker}: authoritative Break-Risk window changed`);
  assert.equal(model.cycle.score, prior.cycle.score, `${ticker}: authoritative runway changed`);
  assert.deepEqual(model.cycle.episodes, prior.cycle.episodes, `${ticker}: authoritative episodes changed`);

  const shadow = model.research?.shadowAssessment;
  assert.ok(shadow, `${ticker}: shadow assessment missing`);
  assert.equal(shadow.authoritativeOutputChanged, false);
  assert.equal(model.interpretation.invariants.changesRawScores, false);
  assert.equal(model.interpretation.invariants.separateExpansionAndPressureLedgers, true);
  results.push({
    ticker,
    authoritative: {
      state: model.current.state,
      expansion: model.scores.expansion,
      pressure: model.scores.pressure,
      leadership: model.scores.currentLeadership,
      runway: model.cycle.score
    },
    shadow: {
      pressurePhase: shadow.phase.pressure.phase,
      expansionPhase: shadow.phase.expansion.phase,
      pressureOutcome: shadow.current.pressureOutcome,
      expansionConversion: shadow.current.expansionConversion,
      runway: shadow.runway.score,
      runwayLevel: shadow.runway.level,
      episodes: shadow.runway.episodes.length,
      seriousPressureEpisodes: shadow.runway.seriousPressureEpisodes,
      unresolvedPressureEpisodes: shadow.runway.unresolvedPressureEpisodes
    }
  });
}

const byTicker = new Map(results.map(result => [result.ticker, result]));
for (const ticker of ["TRENT.NS", "DMART.NS", "LUPIN.NS", "KPITTECH.NS"]) {
  assert.ok(byTicker.get(ticker).shadow.runway < byTicker.get(ticker).authoritative.runway, `${ticker}: shadow runway must challenge the inflated baseline`);
}
for (const ticker of ["ETERNAL.NS", "CUMMINSIND.NS", "ENGINERSIN.NS", "ANANTRAJ.NS", "BEL.NS"]) {
  assert.ok(byTicker.get(ticker).shadow.episodes >= 1, `${ticker}: successful expansion structure must be preserved as a converted episode`);
}

const output = {
  generatedAt: new Date().toISOString(),
  replayDate,
  mode: "TEMPORAL_INTERPRETATION_WITH_PRESERVED_RAW_ASTROLOGY",
  rawAstrologyParity: "PASS",
  results
};
fs.writeFileSync(new URL("../V37_6_15_STOCK_SHADOW_AUDIT.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.table(results.map(result => ({ ticker: result.ticker, oldRunway: result.authoritative.runway, shadowRunway: result.shadow.runway, conversion: result.shadow.expansionConversion, pressure: result.shadow.pressureOutcome })));
console.log("v37.6 fifteen-stock shadow audit passed");
