import assert from "node:assert/strict";
import { buildShadowAstroAssessment } from "../lib/shadowAstroAssessment.js";

const contact = (planet, aspect, targetPlanet, score, orb) => ({ planet, aspect, targetPlanet, score, orb });
const row = (date, expansionScore, pressureScore, leadershipProbability, transitDetails = []) => ({
  date,
  expansionScore,
  pressureScore,
  leadershipProbability,
  transitDetails
});

const support = [
  contact("Jupiter", "trine", "sun", 8, 1.8),
  contact("Saturn", "sextile", "jupiter", 5, 1.2)
];

const absorbed = buildShadowAstroAssessment({
  replayDate: "2025-01-01",
  replay: row("2025-01-01", 72, 70, 67, support),
  windows: { fullScan: [
    row("2025-01-01", 72, 70, 67, support),
    row("2025-01-16", 74, 66, 70, support),
    row("2025-01-31", 77, 60, 73, support)
  ] }
}, { asOfDate: "2025-01-01", breakState: { mapped: false } });

assert.equal(absorbed.current.pressureOutcome, "ABSORBED_PRESSURE");
assert.equal(absorbed.phase.pressure.phase, "RELEASING");
assert.ok(["PRESSURE_RELEASE", "CONTESTED_SUPPORT"].includes(absorbed.current.expansionConversion));
assert.equal(absorbed.authoritativeOutputChanged, false);

const falseReratingRows = [
  row("2025-01-01", 69, 73, 62, [contact("Jupiter", "trine", "sun", 4, 2.0)]),
  row("2025-01-16", 70, 75, 61, [contact("Jupiter", "trine", "sun", 4, 1.5)]),
  row("2025-01-31", 67, 79, 54, [contact("Saturn", "square", "venus", -8, 1.0)]),
  row("2025-02-15", 64, 81, 49, [contact("Saturn", "square", "venus", -10, 0.5)])
];
const falseRerating = buildShadowAstroAssessment({
  replayDate: "2025-01-01",
  replay: falseReratingRows[0],
  windows: { fullScan: falseReratingRows }
}, { asOfDate: "2025-01-01", breakState: { mapped: false } });

assert.ok(["CONTESTED_SUPPORT", "SUPPORT_DECAY_RENEWED_PRESSURE"].includes(falseRerating.current.expansionConversion));
assert.ok(falseRerating.runway.score <= 54, "one contested supportive sequence must not receive high runway");
assert.equal(falseRerating.runway.episodes.length, 0, "support without conversion must not become a rerating episode");

const twoEpisodeRows = [
  row("2025-01-01", 76, 55, 72, support),
  row("2025-01-16", 79, 54, 75, support),
  row("2025-01-31", 74, 58, 70, support),
  row("2025-05-01", 60, 69, 52, [contact("Saturn", "square", "sun", -6, 1.0)]),
  row("2025-06-15", 70, 62, 66, support),
  row("2025-06-30", 78, 54, 74, support),
  row("2025-07-15", 76, 57, 71, support)
];
const durable = buildShadowAstroAssessment({
  replayDate: "2025-01-01",
  replay: twoEpisodeRows[0],
  windows: { fullScan: twoEpisodeRows }
}, { asOfDate: "2025-01-01", breakState: { mapped: false } });

assert.equal(durable.runway.episodes.length, 2);
assert.ok(durable.runway.score >= 55, "two separated converted episodes with repair should retain developing runway");
assert.ok(durable.runway.score < 90, "episode runway must not saturate merely from repeated scan points");

const repeatedPoints = buildShadowAstroAssessment({
  replayDate: "2025-01-01",
  replay: twoEpisodeRows[0],
  windows: { fullScan: Array.from({ length: 10 }, (_, index) => row(
    new Date(Date.UTC(2025, 0, 1 + index * 15)).toISOString().slice(0, 10),
    78,
    54,
    74,
    support
  )) }
}, { asOfDate: "2025-01-01", breakState: { mapped: false } });

assert.equal(repeatedPoints.runway.episodes.length, 1, "one long transit must count as one episode");
assert.ok(repeatedPoints.runway.score < durable.runway.score, "repetition inside one transit must not outrank two separated episodes");

assert.deepEqual(absorbed.invariants, {
  consumesExistingAstrologyOnly: true,
  changesExistingScores: false,
  changesExistingWindows: false,
  changesExistingLanguage: false,
  containsPriceInput: false,
  containsTradingLanguage: false,
  elapsedTimeCannotCreateBreak: true
});

console.log("v37.6 shadow-assessment tests passed");
