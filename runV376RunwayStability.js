import assert from "node:assert/strict";
import fs from "node:fs";
import replayHandler from "../pages/api/replay-lab.js";

const tickers = [
  "ANANTRAJ.NS", "BEL.NS", "BAJAJFINANCE.NS", "COCHINSHIP.NS", "ICICIBANK.NS",
  "ETERNAL.NS", "KPITTECH.NS", "VEDL.NS", "TATAPOWER.NS", "CUMMINSIND.NS",
  "ENGINERSIN.NS", "TRENT.NS", "CDSL.NS", "DMART.NS", "LUPIN.NS"
];
const dates = ["2024-08-15", "2024-08-30"];

function replay(ticker, date) {
  return new Promise((resolve, reject) => {
    const req = { query: { ticker, date, forwardDays: "730" } };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(body) { this.statusCode >= 400 ? reject(new Error(`${ticker} ${date}: ${body.error || this.statusCode}`)) : resolve(body); }
    };
    Promise.resolve(replayHandler(req, res)).catch(reject);
  });
}

const rows = [];
for (const ticker of tickers) {
  const values = [];
  for (const date of dates) {
    const payload = await replay(ticker, date);
    values.push({
      date,
      authoritativeRunway: payload.astroModel.cycle.score,
      shadowRunway: payload.astroModel.research.shadowAssessment.runway.score
    });
  }
  rows.push({
    ticker,
    values,
    authoritativeDelta: Math.abs(values[1].authoritativeRunway - values[0].authoritativeRunway),
    shadowDelta: Math.abs(values[1].shadowRunway - values[0].shadowRunway)
  });
}

const median = values => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];
const authoritativeMedianDelta = median(rows.map(row => row.authoritativeDelta));
const shadowMedianDelta = median(rows.map(row => row.shadowDelta));
const authoritativeLargeJumps = rows.filter(row => row.authoritativeDelta >= 15).length;
const shadowLargeJumps = rows.filter(row => row.shadowDelta >= 15).length;

assert.ok(shadowMedianDelta <= authoritativeMedianDelta, "episode runway should be at least as stable at the panel median");
assert.ok(shadowLargeJumps <= authoritativeLargeJumps, "episode runway must not create more adjacent-date jumps of 15+ points");

const output = {
  generatedAt: new Date().toISOString(),
  dates,
  authoritativeMedianDelta,
  shadowMedianDelta,
  authoritativeLargeJumps,
  shadowLargeJumps,
  rows
};
fs.writeFileSync(new URL("../V37_6_RUNWAY_STABILITY_AUDIT.json", import.meta.url), `${JSON.stringify(output, null, 2)}\n`);
console.table(rows.map(row => ({ ticker: row.ticker, oldDelta: row.authoritativeDelta, shadowDelta: row.shadowDelta })));
console.log(`Runway stability passed: median delta ${authoritativeMedianDelta} → ${shadowMedianDelta}; 15+ jumps ${authoritativeLargeJumps} → ${shadowLargeJumps}`);
