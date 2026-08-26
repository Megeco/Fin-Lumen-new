// REAL MACRO ASTRO ENGINE (v28.5)
// This file is now a translator over the Swiss-backed real ephemeris layer.
// It must not simulate macro regimes with synthetic cycles.

import { computeMacroEnvironment } from "./macroEnvironment.js";

function istToday() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function regimeFromEnvironment(environment, pressure, expansion, volatility) {
  if (environment === "EXTREME PRESSURE") return "EXTREME PRESSURE";
  if (environment === "HIGH PRESSURE") return "HIGH PRESSURE";
  if (environment === "PRESSURE") return "PRESSURE";
  if (environment === "EXPANSION") return volatility >= 20 ? "VOLATILE EXPANSION" : "EXPANSION";
  if (environment === "VOLATILE TRANSITION") return "VOLATILE TRANSITION";
  if (pressure >= 45) return "EXTREME PRESSURE";
  if (pressure >= 28 && expansion >= 28) return "CONFLICT / HIGH-ENERGY TUG";
  if (pressure >= 28) return "HIGH PRESSURE";
  if (expansion >= 28 && volatility >= 20) return "VOLATILE EXPANSION";
  if (expansion >= 20) return "EXPANSION";
  if (pressure >= 15) return "PRESSURE";
  return "BALANCED";
}

function macroScoreFromRealSky(pressure, expansion) {
  // Interpretable balance score, not a synthetic cycle:
  // 50 = balanced, above 50 = expansion leads, below 50 = pressure leads.
  return Math.max(0, Math.min(100, 50 + Number(expansion || 0) - Number(pressure || 0)));
}

export function runMacroEngine(date = istToday()) {
  const macro = computeMacroEnvironment(date);
  const pressure = Number(macro.pressureScore || 0);
  const expansion = Number(macro.expansionScore || 0);
  const volatility = Number(macro.volatility || 0);
  const score = macroScoreFromRealSky(pressure, expansion);
  const regime = regimeFromEnvironment(macro.environment, pressure, expansion, volatility);

  return {
    macro_score: Number(score.toFixed(2)),
    regime,
    environment: macro.environment,
    pressureScore: pressure,
    expansionScore: expansion,
    resetScore: Number(macro.resetScore || 0),
    volatility,
    environmentLabel: macro.environmentLabel,
    environmentStage: macro.environmentStage,
    dominantForce: macro.dominantForce,
    interpretation: macro.interpretation,
    source: "real_ephemeris_translator"
  };
}

export default runMacroEngine;
