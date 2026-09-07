import assert from "node:assert/strict";
import { astroEngine } from "../lib/astroEngine.js";

async function reading(name, asOfDate) {
  const result = await astroEngine({ name, asOfDate });
  assert.equal(result.production_model_version, "37.9.14-full-macro-transit-windows-lock-candidate");
  assert.equal(result.astro_model.interpretation.invariants.changesRawScores, false);
  assert.equal(result.astro_model.interpretation.current.roleTrace.scoresBlended, false);
  return result.astro_model.interpretation.current;
}

const newgenBreak = await reading("NEWGEN.NS", "2024-12-15");
assert.equal(newgenBreak.pressureStage, "PRESSURE_ACTIVATION");
assert.equal(newgenBreak.roleTrace.expansionChartId, "listing");
assert.equal(newgenBreak.roleTrace.structuralChartId, "incorporation");

const ongcWarning = await reading("ONGC.NS", "2024-04-15");
assert.equal(ongcWarning.pressureStage, "VULNERABILITY_FORMING");
assert.equal(ongcWarning.roleTrace.structuralChartId, "statutory-commission");
const ongcCrossover = await reading("ONGC.NS", "2024-09-15");
assert.ok(["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(ongcCrossover.pressureStage));

const garwareBreak = await reading("GRWRHITECH.NS", "2025-01-15");
assert.equal(garwareBreak.pressureStage, "PRESSURE_ACTIVATION");
assert.equal(garwareBreak.roleTrace.structuralChartId, "incorporation");
assert.equal(garwareBreak.roleTrace.tradedDeteriorationChartId, "listing");
const garwareDecline = await reading("GRWRHITECH.NS", "2025-06-15");
assert.ok(["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(garwareDecline.pressureStage));
const garwareRecovery = await reading("GRWRHITECH.NS", "2025-09-15");
assert.equal(garwareRecovery.recoveryStage, "NONE");
assert.equal(garwareRecovery.pressureStage, "PRESSURE_CULMINATION");
assert.equal(garwareRecovery.roleTrace.expansionChartId, "listed-name-change-2022");

const cochinPeak = await reading("COCHINSHIP.NS", "2024-07-15");
assert.equal(cochinPeak.expansionStage, "CONTINUATION_COMPRESSED");
const cochinPressure = await reading("COCHINSHIP.NS", "2024-09-15");
assert.ok(["VULNERABILITY_FORMING", "PRESSURE_ACTIVATION"].includes(cochinPressure.pressureStage));

console.log("v37.9.14 role-chart integration passed: Newgen, ONGC, Garware and Cochin role authority verified without score blending or future-state overwrite.");
