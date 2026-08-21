import assert from "node:assert/strict";
import fs from "node:fs";
import { buildPureAstroModel } from "../lib/pureAstroModel.js";
import { getRealEphemeris } from "../lib/realEphemeris.js";
import { computeMacroEnvironment } from "../lib/macroEnvironment.js";
import { astroEngine } from "../lib/astroEngine.js";

const baseCompany = {
  confidence: "HIGH",
  capitalAuthorityCeiling: "FULL_BUILD_ELIGIBLE",
  sourceVerification: "verified",
  anchorValidation: "definitive",
  timePrecision: "documented-time",
  selectedChartId: "test-chart"
};

const receptor = {
  expressionClass: "STRUCTURAL_PRESSURE",
  expressionLabel: "Structural pressure",
  scores: { expressionScore: 62, confidenceScore: 80 }
};

const destructiveContacts = [
  { planet: "saturn", targetPlanet: "sun", aspect: "square", orb: 1.2, score: -7 },
  { planet: "ketu", targetPlanet: "moon", aspect: "opposition", orb: 2.1, score: -6 },
  { planet: "mars", targetPlanet: "mars", aspect: "conjunction", orb: 1.8, score: -4 }
];

const laterSupport = {
  date: "2026-09-07",
  expansionScore: 72,
  pressureScore: 52,
  leadershipProbability: 70,
  transitDetails: [
    { planet: "jupiter", targetPlanet: "moon", aspect: "trine", orb: 1.0, score: 7 }
  ]
};

const breakRiskWindow = {
  date: "2026-08-08",
  episodeStart: "2026-08-01",
  episodeEnd: "2026-08-22",
  expansionScore: 54,
  pressureScore: 86,
  leadershipProbability: 39,
  transitDetails: destructiveContacts
};

const common = {
  replayDate: "2026-08-08",
  replay: {
    date: "2026-08-08",
    expansionScore: 54,
    pressureScore: 86,
    leadershipProbability: 39,
    transitDetails: destructiveContacts,
    activeClusters: ["Saturn", "Ketu", "Mars"],
    environmentSignature: "Destructive structural pressure"
  },
  windows: {
    windowMap: { tacticalRisk: breakRiskWindow, strategicRisk: breakRiskWindow },
    fullScan: [breakRiskWindow, laterSupport]
  },
  macroSnapshot: { environment: "PRESSURE", expansion: 8, pressure: 22 },
  transitReceptorFit: receptor,
  company: baseCompany,
  catalystScan: null,
  cyclePotentialScore: 46,
  cyclePotentialDetails: {
    score: 46,
    label: "LOW",
    episodes: [],
    postResetEpisodes: [],
    firstBreakDate: "2026-08-01",
    activationPlanets: ["saturn", "ketu"],
    components: {},
    explanation: "Destructive structural episode followed by separately reported support."
  }
};

const qualified = buildPureAstroModel(common);
assert.equal(qualified.version, "37.9.14-full-macro-transit-windows-lock-candidate");
assert.equal(qualified.current.state, "PEAK PRESSURE");
assert.equal(qualified.current.legacyState, "BREAK-RISK PRESSURE");
assert.ok(qualified.windows.breakRisk, "destructive structural astrology must map Break-Risk");
assert.equal(qualified.research.breakQualification.basis, "DESTRUCTIVE_ASTROLOGY");
assert.equal(qualified.research.breakQualification.futureSupportDate, "2026-09-07");
assert.match(qualified.research.breakQualification.timingRule, /elapsed time never creates/i);
assert.equal(qualified.cycle.runwayEndDate, "2026-08-01");
assert.equal(qualified.cycle.runwayStartDate, null);
assert.equal(qualified.cycle.runwayEndReason, "CURRENT_BREAK_RISK");
assert.equal(qualified.cycle.scanEndDate, "2028-08-08");

// The support state returns after only 30 days. Break-Risk still follows the
// destructive astrology; no arbitrary duration threshold may create or veto it.
assert.equal(qualified.research.breakQualification.mapped, true);

const severeScoreOnly = buildPureAstroModel({
  ...common,
  replay: { ...common.replay, transitDetails: [] },
  windows: {
    ...common.windows,
    windowMap: {
      tacticalRisk: { ...breakRiskWindow, transitDetails: [] },
      strategicRisk: { ...breakRiskWindow, transitDetails: [] }
    },
    fullScan: [{ ...breakRiskWindow, transitDetails: [] }, laterSupport]
  }
});
assert.equal(severeScoreOnly.windows.breakRisk, null, "a severe score without a destructive contact network must remain High pressure");
assert.equal(severeScoreOnly.current.pressureClass, "HIGH");

// A duplicated nodal-axis contact plus wide eclipse contacts is pressure
// evidence, but not two independent structural contacts.
const broadOrDuplicatedContacts = [
  { planet: "saturn", targetPlanet: "venus", aspect: "square", orb: 2.89, score: -5 },
  { planet: "ketu", targetPlanet: "rahu", aspect: "square", orb: 2.44, score: -2 },
  { planet: "ketu", targetPlanet: "ketu", aspect: "square", orb: 2.44, score: -1 },
  { planet: "eclipse", targetPlanet: "saturn", aspect: "opposition", orb: 4.23, score: -13 },
  { planet: "eclipse", targetPlanet: "sun", aspect: "opposition", orb: 5.69, score: -5 }
];
const broadPressureOnly = buildPureAstroModel({
  ...common,
  replay: { ...common.replay, transitDetails: broadOrDuplicatedContacts },
  windows: {
    ...common.windows,
    windowMap: {
      tacticalRisk: { ...breakRiskWindow, transitDetails: broadOrDuplicatedContacts },
      strategicRisk: { ...breakRiskWindow, transitDetails: broadOrDuplicatedContacts }
    },
    fullScan: [{ ...breakRiskWindow, transitDetails: broadOrDuplicatedContacts }, laterSupport]
  }
});
assert.equal(broadPressureOnly.windows.breakRisk, null, "wide eclipse and duplicated nodal-axis contacts must remain High pressure");
assert.equal(broadPressureOnly.current.pressureClass, "HIGH");

const serialized = JSON.stringify(qualified);
assert.doesNotMatch(serialized, /capital|deploy|\bbuy\b|\bsell\b|\bhold\b|\btrim\b|\bexit\b|part[_ ]build|full[_ ]build|no[_ ]fresh|183|drought/i);
assert.equal(qualified.invariants.containsTradingInstruction, false);
assert.equal(qualified.invariants.containsPositionSizing, false);

// The single-app Vercel edition uses the subscriber dashboard while keeping
// the engine contract unchanged. Test the integrated public surfaces here;
// engine and temporal-sovereignty assertions continue below.
const subscriberPage = fs.readFileSync(new URL("../components/Dashboard.js", import.meta.url), "utf8");
const legacyEngineInterfaceContract = fs.readFileSync(new URL("./legacy-engine-interface-contract.js", import.meta.url), "utf8");
const page = `${subscriberPage}\n${legacyEngineInterfaceContract}`;
assert.doesNotMatch(page, />\s*(BUY|SELL|HOLD|TRIM|EXIT|NO FRESH|PART BUILD|FULL BUILD)\s*</i);
assert.match(page, /Replay Lab/);
assert.match(page, /Historical Sky Replay/);
assert.match(page, /Research View/);
assert.match(page, /Astro engine interpretation/);
assert.match(page, /complete v37\.9\.14 natal, transit, eclipse, window and scoring ledger/);
assert.match(page, /not personalised investment advice/);
assert.match(page, /scores describe structure and intensity/i);
assert.match(page, /fetchHistoricalReplay/);
assert.match(page, /\/api\/engine\/replay/);
assert.match(page, /modal-backdrop/);

// Macro sovereignty: reset/inflection force must not inflate supportive
// expansion, and the applying sequence must be able to control expression
// without pretending that a low threshold alone establishes dominance.
const augustMacro = getRealEphemeris("2026-08-17");
assert.equal(augustMacro.pressure, 19);
assert.equal(augustMacro.expansion, 21);
assert.equal(augustMacro.reset, 25);
assert.equal(augustMacro.environment, "PRESSURE");
assert.equal(augustMacro.environmentLabel, "PRESSURE · INFLECTION · SUPPORT ACTIVE");
assert.equal(augustMacro.environmentStage, "PRESSURE_RESET_WITH_SUPPORT");
assert.equal(augustMacro.inflection, augustMacro.reset);
const quietInflectionMacro = getRealEphemeris("2026-05-15");
assert.equal(quietInflectionMacro.inflection, 0, "Inflection must be absent outside a validated eclipse corridor");
assert.equal(augustMacro.macroSovereignty.pressureAdvancing, true);
assert.match(augustMacro.macroReadable.headline, /strong support remains active underneath/i);
assert.doesNotMatch(augustMacro.macroReadable.headline, /Macro pressure is dominant; later release/i);
const separatingSolar = augustMacro.macroReadable.activeNow.find(item => /Solar eclipse/i.test(item.label));
assert.ok(separatingSolar);
assert.ok(separatingSolar.daysRemaining < 0, "separating eclipse must retain a signed past offset");
assert.match(separatingSolar.timing, /days ago/);
assert.ok(augustMacro.macroReadable.pressureExplanation.sequence.some(item => item.label === "Saturn-Venus opposition"));
assert.ok(augustMacro.macroReadable.pressureExplanation.sequence.some(item => item.label === "Sun-Rahu opposition"));
assert.ok(augustMacro.macroReadable.researchEvidence.active.some(item => item.contribution === "Expansion +10"));
assert.ok(augustMacro.macroReadable.researchEvidence.applying14Days.some(item => item.contribution === "Forward context only"));
assert.doesNotMatch(augustMacro.macroReadable.headline, /\breset\b/i);

const earlyAugustMacro = getRealEphemeris("2026-08-03");
assert.equal(earlyAugustMacro.expansion, 5, "only the separate Jupiter-Uranus support may contribute to expansion");
assert.equal(earlyAugustMacro.reset, 21);
assert.equal(earlyAugustMacro.environmentLabel, "INFLECTION TRANSITION");
assert.deepEqual(earlyAugustMacro.macroAnalytics.forceLedger.activeSupportNodes, ["Jupiter-Uranus sextile"]);

const macroReplay = computeMacroEnvironment("2026-08-17");
assert.equal(macroReplay.environmentLabel, augustMacro.environmentLabel);
assert.equal(macroReplay.resetScore, augustMacro.reset);
assert.deepEqual(macroReplay.forceLedger, augustMacro.macroAnalytics.forceLedger);
assert.doesNotMatch(JSON.stringify(macroReplay), /trim|accumulat|\bhold\b|\bbuy\b|\bsell\b|deploy/i);

const pandemicWarning = getRealEphemeris("2020-03-15");
assert.equal(pandemicWarning.environment, "PRESSURE");
assert.equal(pandemicWarning.environmentStage, "PRESSURE_ADVANCING");
assert.ok(pandemicWarning.activeEvents.some(item => item.label === "Saturn-Pluto conjunction"));
assert.ok(pandemicWarning.activeEvents.some(item => item.label === "Saturn-Uranus square"));
const pandemicPeak = getRealEphemeris("2020-03-23");
assert.equal(pandemicPeak.environment, "EXTREME PRESSURE");
assert.ok(pandemicPeak.activeEvents.some(item => item.label === "Mars-Pluto conjunction"));

const octoberReset = getRealEphemeris("2024-10-01");
assert.equal(octoberReset.environmentLabel, "HIGH PRESSURE · INFLECTION ACTIVE");
assert.equal(octoberReset.expansion, 0, "eclipse reset must remain separate from support on historical replay dates");
assert.equal(octoberReset.reset, 29);

// ICICI regression, 18 Aug 2026: the pressure is genuine, but four hard
// contacts from the same Saturn carrier into a tight natal cluster must not
// masquerade as several independent destructive forces. Support survives and
// strengthens later, so this is High/Peak pressure rather than Break-Risk.
const icici = await astroEngine({ name: "ICICIBANK.NS", asOfDate: "2026-08-18" });
assert.equal(icici.astro_model.current.state, "PRESSURE IN CONTROL");
assert.equal(icici.astro_model.current.pressureClass, "HIGH");
assert.equal(icici.astro_model.current.correctionMode, "DISCIPLINE");
assert.equal(icici.astro_model.windows.breakRisk, null);
assert.equal(icici.astro_model.research.breakQualification.mapped, false);
assert.equal(icici.astro_model.research.breakQualification.destructiveNetwork, false);
assert.equal(icici.astro_model.cycle.episodes.length, 2);
assert.equal(icici.astro_model.cycle.score, 70);
assert.equal(icici.catalyst_label, "Mars-Saturn square");
assert.equal(icici.catalyst_date, "2026-09-01");
assert.match(icici.catalyst_response, /Mars opposition natal Venus/i);

// Horizon and classification regressions: a tactical path may describe only
// its own 60-day slice, and declining expansion is not a pressure event.
const mcx = await astroEngine({ name: "MCX.NS", asOfDate: "2026-08-18" });
assert.equal(mcx.natal_chart_id, "operational-launch");
assert.equal(mcx.astro_model.natal.secondaryChartId, "incorporation");
assert.ok(mcx.astro_model.paths.tactical.every(item => item.end <= "2026-10-17"));
const clippedMcxPassage = mcx.astro_model.paths.tactical.find(item => item.continuesBeyondHorizon);
assert.ok(clippedMcxPassage);
assert.equal(clippedMcxPassage.end, "2026-10-17");
assert.ok(clippedMcxPassage.actualEnd > clippedMcxPassage.end);
assert.ok(mcx.astro_model.paths.strategic
  .filter(item => item.eventType === "EXPANSION_EXHAUSTION")
  .every(item => item.kind === "EXPANSION"));
assert.ok(!mcx.astro_model.paths.strategic
  .some(item => item.kind === "PRESSURE" && item.eventType === "EXPANSION_EXHAUSTION"));

// IFCI's current date is not a Break-Risk state, but its separately dated
// February 2027 window is qualified by exact eclipse-to-natal geometry.
const ifci = await astroEngine({ name: "IFCI.NS", asOfDate: "2026-08-18" });
assert.equal(ifci.astro_model.research.breakQualification.mapped, false);
assert.equal(ifci.astro_model.windows.breakRisk.start, "2027-02-04");
assert.equal(ifci.astro_model.windows.breakRisk.breakQualification.mapped, true);
assert.ok(ifci.astro_model.windows.breakRisk.breakQualification.evidence
  .some(item => /Eclipse opposition natal saturn \(1\.51°\)/i.test(item)));

// The card must render exact eclipse receptor/aspect/orb fields and scope the
// qualification text to the future Break-Risk window when one is displayed.
assert.match(page, /model\.windows\?\.breakRisk\?\.breakQualification \|\| research\.breakQualification/);
assert.match(page, /item\.natalPlanet/);
assert.match(page, /item\.aspect/);
assert.match(page, /item\.orb/);
assert.doesNotMatch(page, /eclipse → natal point/);

// Expanded-card catalysts must identify the stock receptor and expected
// expression, not stop at a generic macro aspect and date.
assert.match(page, /Leading stock-specific contact/);
assert.match(page, /Expected expression:/);
assert.match(page, /Next consequential catalyst/);
assert.match(page, /function distinctExplanation/);
assert.match(page, /natalAnchorIdentity/);

// Exhaustion, compressed continuation and failed recovery belong to the
// expansion thread, but must not be advertised as constructive expansion.
assert.match(page, /function isConstructiveExpansionEvent/);
assert.match(page, /Next constructive expansion phase/);
assert.match(page, /Next active pressure phase/);
assert.match(page, /function isActivePressurePhase/);

// Adding a stock opens and prefills the natal editor in the same flow.
assert.match(page, /Add stock \+ natal details/);
assert.match(page, /requestedStock=\{natalTarget\}/);

// Preserve the user-confirmed JioFin record-date anchor.
const jiofin = await astroEngine({ name: "JIOFIN.NS", asOfDate: "2026-08-18" });
assert.equal(jiofin.natal_chart_id, "demerger-record-date");
assert.equal(jiofin.natal_chart_type, "record-date");

// A supportive macro aspect does not automatically make the stock response
// supportive. The net sentence must follow the balance of exact natal hits.
const solar = await astroEngine({ name: "SOLARINDS.NS", asOfDate: "2026-08-18" });
assert.match(solar.catalyst_net_expression, /support and restraint are closely balanced/i);
assert.match(solar.catalyst_contact_text, /Jupiter trine natal sun.*Saturn conjunction natal sun/i);
const federal = await astroEngine({ name: "FEDERALBNK.NS", asOfDate: "2026-08-18" });
assert.match(federal.catalyst_net_expression, /strongly contested/i);
assert.match(federal.catalyst_contact_text, /Jupiter trine natal rahu.*Saturn conjunction natal rahu/i);

// Early vulnerability is not an active pressure phase. The strategic card
// must wait for activation/sovereignty/culmination before using that label.
const td = await astroEngine({ name: "TDPOWERSYS.NS", asOfDate: "2026-08-18" });
assert.equal(td.astro_model.paths.strategic.find(isActive => ["PRESSURE_ACTIVATION", "PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION", "BREAK_PRESSURE"].includes(isActive.eventType))?.start, "2027-06-08");
const fortis = await astroEngine({ name: "FORTIS.NS", asOfDate: "2026-08-18" });
assert.match(fortis.catalyst_contact_text, /Mercury trine natal mercury.*Jupiter opposition natal mercury/i);

// The card carries both the exact qualification date and the broader pressure
// episode instead of presenting their different dates as a contradiction.
const ioc = await astroEngine({ name: "IOC.NS", asOfDate: "2026-08-18" });
assert.equal(ioc.astro_model.windows.breakRisk.qualificationDate, "2027-01-09");
assert.equal(ioc.astro_model.windows.breakRisk.qualificationStatus, "QUALIFIES_ON");
assert.equal(ioc.astro_model.windows.breakRisk.episodeStart, "2026-10-26");
assert.equal(ioc.astro_model.cycle.runwayStartsAfterCurrentPressure, false);
assert.match(ioc.catalyst_contact_text, /Saturn opposition natal rahu/i);
const abb = await astroEngine({ name: "ABB.NS", asOfDate: "2026-08-18" });
assert.equal(abb.astro_model.cycle.episodes.length, 0);
assert.equal(abb.astro_model.cycle.postResetEpisodes.length, 4);
assert.equal(abb.astro_model.cycle.runwayStartsAfterCurrentPressure, false);

// An already-active Break episode must not inherit the qualification date of
// a separate later cycle. Its status is current; the later break stays separate.
const bel = await astroEngine({ name: "BEL.NS", asOfDate: "2026-08-18" });
assert.equal(bel.astro_model.windows.breakRisk.qualificationStatus, "ACTIVE_AS_OF");
assert.equal(bel.astro_model.windows.breakRisk.qualificationDate, "2026-08-18");
assert.equal(bel.astro_model.cycle.runwayBeginsUnderCurrentBreakRisk, true);
assert.equal(bel.astro_model.cycle.separateFutureBreakRiskDate, "2027-06-23");
assert.match(bel.astro_model.windows.rerating.reason, /full 2026-07-29–2026-09-26 episode.*1 intact runway expansion phase is mapped after the current episode/i);

const nmdc = await astroEngine({ name: "NMDC.NS", asOfDate: "2026-08-18" });
assert.equal(nmdc.astro_model.cycle.runwayBeginsUnderCurrentBreakRisk, true);
assert.equal(nmdc.astro_model.cycle.separateFutureBreakRiskDate, null);
assert.match(nmdc.astro_model.windows.rerating.reason, /0 intact runway expansion phases are mapped after the current episode/i);

assert.match(page, /Research-only natal authority/);
assert.match(page, /BALANCED FORCES/);
assert.match(page, /Break-Risk cycle status/);
assert.match(page, /no intact runway exists at the scan start/);
assert.match(page, /\$\{range\(window\)\} · \$\{window\.qualificationStatus === "ACTIVE_AS_OF" \? "active on" : "qualifies"\}/);
assert.match(page, /The qualified Break-Risk episode \$\{range\(model\.windows\?\.breakRisk\)\} is active on/);

// Macro evidence must expose the complete, backtestable in-orb or station
// interval. "Active now" alone is not a timing window.
const macroAug20 = getRealEphemeris("2026-08-20");
const activeMacro = new Map(macroAug20.macroReadable.researchEvidence.active.map(event => [event.label, event]));
assert.deepEqual(
  [activeMacro.get("Saturn-Venus opposition")?.windowStart, activeMacro.get("Saturn-Venus opposition")?.exactDate, activeMacro.get("Saturn-Venus opposition")?.windowEnd],
  ["2026-08-17", "2026-08-21", "2026-08-25"]
);
assert.deepEqual(
  [activeMacro.get("SATURN retrograde active")?.windowStart, activeMacro.get("SATURN retrograde active")?.windowEnd],
  ["2026-07-26", "2026-12-11"]
);
assert.deepEqual(
  [activeMacro.get("Lunar eclipse in Aquarius")?.windowStart, activeMacro.get("Lunar eclipse in Aquarius")?.exactDate, activeMacro.get("Lunar eclipse in Aquarius")?.windowEnd],
  ["2026-07-29", "2026-08-28", "2026-09-27"]
);
const applyingMacro = new Map(macroAug20.macroReadable.researchEvidence.applying14Days.map(event => [event.label, event]));
assert.deepEqual(
  [applyingMacro.get("Mercury-Rahu opposition")?.windowStart, applyingMacro.get("Mercury-Rahu opposition")?.exactDate, applyingMacro.get("Mercury-Rahu opposition")?.windowEnd],
  ["2026-08-23", "2026-08-25", "2026-08-27"]
);
assert.match(page, /function macroTimingText/);
assert.match(page, /maximum.*exact/);

console.log("v37.9.14 lock audit passed: full stock and macro transit windows remain backtestable, selected-date status is secondary, and card language is clean");
