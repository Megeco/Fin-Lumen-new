import {
  getRealEphemeris
} from "./realEphemeris.js";

export function computeMacroEnvironment(date) {
  const ephemeris = getRealEphemeris(date);

  return {
    environment: ephemeris.environment,
    environmentLabel: ephemeris.environmentLabel,
    environmentStage: ephemeris.environmentStage,
    dominantForce: ephemeris.dominantForce,
    pressureScore: ephemeris.pressure,
    expansionScore: ephemeris.expansion,
    resetScore: ephemeris.reset,
    volatility: ephemeris.volatility,
    transitionScore: ephemeris.transition,
    moonClimate: ephemeris.moonClimate,
    moonSign: ephemeris.moonSign,
    activeEvents: ephemeris.activeEvents.slice(0, 5),
    phases: ephemeris.phases.slice(0, 5),
    transits: ephemeris.transits,
    macroSovereignty: ephemeris.macroSovereignty,
    forceLedger: ephemeris.macroAnalytics?.forceLedger || null,
    headline: ephemeris.macroReadable?.headline || ephemeris.environmentLabel,
    stockImplication: ephemeris.macroReadable?.stockImplication || null,
    interpretation: ephemeris.macroSovereignty?.message || null,
    source: "real_ephemeris_macro_sovereignty"
  };
}

export default computeMacroEnvironment;
