import assert from "node:assert/strict";
import { astroEngine } from "../lib/astroEngine.js";
import replayLabHandler from "../pages/api/replay-lab.js";

const calibrationTickers = [
  "ANANTRAJ.NS", "BEL.NS", "BAJAJFINANCE.NS", "COCHINSHIP.NS", "CUMMINSIND.NS",
  "DMART.NS", "ENGINERSIN.NS", "ETERNAL.NS", "ICICIBANK.NS", "KPITTECH.NS",
  "LUPIN.NS", "TATAPOWER.NS", "TRENT.NS", "VEDL.NS", "CDSL.NS",
  "CGPOWER.NS", "DIXON.NS", "GRAVITA.NS", "KAYNES.NS", "KEI.NS",
  "NEWGEN.NS", "SIEMENS.NS", "TDPOWERSYS.NS", "CUPID.NS", "LT.NS",
  "CARTRADE.NS", "TITAN.NS", "HDFCBANK.NS", "MCX.NS", "CAMS.NS"
];

function runReplayLab(ticker, date) {
  return new Promise((resolve, reject) => {
    const req = { query: { ticker, date, forwardDays: "730", raw: "1" } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) {
        if (this.statusCode >= 400) reject(new Error(`${ticker} ${date}: ${body.error || this.statusCode}`));
        else resolve(body);
      }
    };
    Promise.resolve(replayLabHandler(req, res)).catch(reject);
  });
}

async function assertParity(ticker, date) {
  const live = await astroEngine({ symbol: ticker, asOfDate: date, includeResearchContext: true });
  const replay = await runReplayLab(ticker, date);
  assert.deepEqual(replay.astroModel, live.astro_model, `${ticker} ${date}: authoritative model drift`);
  assert.equal(replay.input.chartId, live.natal_chart_id, `${ticker} ${date}: natal anchor drift`);
  assert.deepEqual(replay.research.baseTransits, live._researchContext.transits, `${ticker} ${date}: Swiss transit drift`);
  assert.deepEqual(replay.research.relevantEclipses, live._researchContext.relevantEclipses, `${ticker} ${date}: eclipse-horizon drift`);
  assert.deepEqual(replay.research.replay, live._researchContext.resonance, `${ticker} ${date}: resonance drift`);
  assert.deepEqual(replay.research.windows, live._researchContext.windows, `${ticker} ${date}: window drift`);
  const liveMacro = live._researchContext.macro;
  assert.equal(replay.macroSnapshot.environment, liveMacro.environment, `${ticker} ${date}: macro environment drift`);
  assert.equal(replay.macroSnapshot.environmentLabel, liveMacro.environmentLabel, `${ticker} ${date}: macro label drift`);
  assert.equal(replay.macroSnapshot.environmentStage, liveMacro.environmentStage, `${ticker} ${date}: macro stage drift`);
  assert.equal(replay.macroSnapshot.pressure, liveMacro.pressure, `${ticker} ${date}: macro pressure drift`);
  assert.equal(replay.macroSnapshot.expansion, liveMacro.expansion, `${ticker} ${date}: macro expansion drift`);
  assert.equal(replay.macroSnapshot.reset, liveMacro.reset, `${ticker} ${date}: macro reset drift`);
  assert.equal(replay.macroSnapshot.volatility, liveMacro.volatility, `${ticker} ${date}: macro volatility drift`);
  assert.deepEqual(replay.macroSnapshot.forceLedger, liveMacro.macroAnalytics.forceLedger, `${ticker} ${date}: macro force-ledger drift`);
  assert.deepEqual(replay.macroSnapshot.macroSovereignty, liveMacro.macroSovereignty, `${ticker} ${date}: macro sovereignty drift`);
  return {
    ticker,
    date,
    chartId: live.natal_chart_id,
    expansion: live.astro_model.scores.expansion,
    pressure: live.astro_model.scores.pressure,
    leadership: live.astro_model.scores.currentLeadership,
    confidence: live.astro_model.scores.confidence
  };
}

const results = [];
for (const ticker of calibrationTickers) results.push(await assertParity(ticker, "2024-08-15"));

// Explicit temporal-anchor and dual-anchor checks outside the common start date.
for (const [ticker, date] of [
  ["ETERNAL.NS", "2025-04-02"],
  ["HDFCBANK.NS", "2026-04-15"],
  ["MCX.NS", "2026-04-15"]
]) results.push(await assertParity(ticker, date));

assert.equal(results.length, 33);
console.table(results);
console.log("v37.6 Replay Lab/live-engine parity passed for 30 calibration stocks plus temporal-anchor checks");
