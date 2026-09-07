import assert from "node:assert/strict";
import { buildShadowAstroAssessment } from "../lib/shadowAstroAssessment.js";
import { astroEngine } from "../lib/astroEngine.js";

const contact = (planet, aspect, targetPlanet, score, orb) => ({ planet, aspect, targetPlanet, score, orb });
const structuralSupport = [
  contact("Jupiter", "trine", "sun", 8, 0.8),
  contact("Saturn", "sextile", "jupiter", 5, 1.1)
];
const row = (date, expansionScore = 78, pressureScore = 52, leadershipProbability = 74, transitDetails = structuralSupport) => ({
  date, expansionScore, pressureScore, leadershipProbability, transitDetails
});
const rows = ["2026-09-01", "2026-09-16", "2026-10-01", "2026-10-16", "2026-10-31"].map(date => row(date));
const expansionEvent = {
  eventType: "STRATEGIC_EXPANSION",
  start: "2026-09-01",
  peakDate: "2026-10-01",
  end: "2026-10-31",
  expansionScore: 78,
  pressureScore: 52,
  leadership: 74,
  transitDetails: structuralSupport
};

function assessment(authority = "VERIFIED", eventLedger = [expansionEvent], scan = rows) {
  return buildShadowAstroAssessment({
    replayDate: "2026-08-10",
    replay: row("2026-08-10", 61, 64, 56),
    company: { capitalAuthorityCeiling: authority },
    windows: { fullScan: [row("2026-08-10", 61, 64, 56), ...scan] }
  }, {
    asOfDate: "2026-08-10",
    chartAuthority: authority,
    breakState: { mapped: false },
    eventLedger
  });
}

const verified = assessment();
const verifiedRerating = verified.reratingAssessment;
assert.equal(verifiedRerating.presentState, "FORMING");
assert.equal(verifiedRerating.futureOutlook.status, "QUALIFIED");
assert.equal(verifiedRerating.futureOutlook.label, "Projected Rerating Qualified");
assert.equal(verifiedRerating.futureOutlook.projectedIgnition, "2026-09-01");
assert.deepEqual(verifiedRerating.futureOutlook.activeWindow, {
  start: "2026-09-01", peak: "2026-10-01", end: "2026-10-31"
});
assert.equal(verifiedRerating.publicGreenBandEligible, false);

const researchOnly = assessment("RESEARCH_ONLY").reratingAssessment.futureOutlook;
assert.equal(researchOnly.status, "CANDIDATE");
assert.equal(researchOnly.intrinsicStatus, "QUALIFIED");
assert.match(researchOnly.authorityLimit, /RESEARCH_ONLY_NATAL_AUTHORITY/);

const nodalNarrative = [
  contact("Jupiter", "conjunction", "rahu", 8, 0.7),
  contact("Rahu", "conjunction", "venus", 7, 0.9),
  contact("Rahu", "trine", "ketu", 5, 0.5)
];
const nodalRows = rows.map(item => row(item.date, 80, 50, 75, nodalNarrative));
const nodalEvent = { ...expansionEvent, transitDetails: nodalNarrative };
assert.equal(assessment("VERIFIED", [nodalEvent], nodalRows).reratingAssessment.futureOutlook, null, "nodal amplification without a slow operative receptor must not become rerating");

const pressureEvent = {
  eventType: "STRUCTURAL_PRESSURE",
  start: "2026-10-16",
  peakDate: "2026-10-24",
  end: "2026-10-31",
  expansionScore: 65,
  pressureScore: 80,
  leadership: 45,
  pressureClass: "HIGH"
};
const blocked = assessment("VERIFIED", [expansionEvent, pressureEvent]).reratingAssessment.futureOutlook;
assert.equal(blocked.status, "BLOCKED");
assert.equal(blocked.label, "Projected Blocked Rerating");
assert.equal(blocked.passages[0].type, "BLOCKED_PASSAGE");

assert.equal(verified.invariants.changesExistingScores, false);
assert.equal(verified.invariants.changesExistingWindows, false);
assert.equal(verified.invariants.containsPriceInput, false);
assert.equal(verified.invariants.containsTradingLanguage, false);

const actual = new Map();
for (const name of ["ABB.NS", "BHARTIARTL.NS", "GRASIM.NS", "NEWGEN.NS"]) {
  const result = await astroEngine({ name, asOfDate: "2026-08-10" });
  actual.set(name, result.astro_model.research.shadowAssessment.reratingAssessment);
}
assert.ok(actual.get("ABB.NS"), "ABB must continue to calculate from its corrected distinct company anchor");
assert.equal(actual.get("BHARTIARTL.NS").presentState, "ACTIVE");
assert.equal(actual.get("BHARTIARTL.NS").futureOutlook.status, "QUALIFIED");
assert.deepEqual(actual.get("BHARTIARTL.NS").futureOutlook.activeWindow, { start: "2026-07-16", peak: "2026-09-26", end: "2026-11-11" });
assert.equal(actual.get("GRASIM.NS").futureOutlook.status, "CANDIDATE");
assert.equal(actual.get("GRASIM.NS").futureOutlook.intrinsicStatus, "QUALIFIED");
assert.equal(actual.get("GRASIM.NS").futureOutlook.projectedIgnition, "2026-09-12");
assert.equal(actual.get("NEWGEN.NS").futureOutlook, null);

console.log("v37.7 rerating architecture passed: dated episode, authority cap, nodal false-positive guard, and blocked passage verified.");
