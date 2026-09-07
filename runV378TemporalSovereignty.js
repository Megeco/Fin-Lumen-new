import assert from "node:assert/strict";
import { buildTemporalSovereigntyAssessment } from "../lib/temporalSovereigntyEngine.js";

const contact = (planet, aspect, targetPlanet, score, orb) => ({ planet, aspect, targetPlanet, score, orb });
const support = (jupiterOrb = 2, saturnOrb = 2.5) => [
  contact("Jupiter", "trine", "Sun", 8, jupiterOrb),
  contact("Saturn", "sextile", "Jupiter", 5, saturnOrb),
  contact("Rahu", "trine", "Mercury", 5, 1.8)
];
const damage = (saturnOrb = 2, ketuOrb = 2.5) => [
  contact("Saturn", "square", "Sun", -8, saturnOrb),
  contact("Ketu", "opposition", "Venus", -6, ketuOrb)
];
const row = (date, expansion, pressure, leadership, contacts, episodeContext = null) => ({
  date, expansionScore: expansion, pressureScore: pressure, leadershipProbability: leadership,
  transitDetails: contacts, ...(episodeContext ? { episodeContext } : {})
});
const pkg = (id, rows, authorities = [], role = "PRIMARY") => ({
  role, authorities, chart: { id, chartType: "test", date: "2000-01-01" }, windows: { fullScan: rows }
});

const highPressureFormation = buildTemporalSovereigntyAssessment({
  primary: pkg("single", [
    row("2026-01-01", 68, 72, 58, support(2.4, 2.8)),
    row("2026-01-16", 70, 72, 61, support(1.7, 2.1)),
    row("2026-01-31", 73, 71, 66, support(1.0, 1.5))
  ])
});
assert.ok(["IGNITION_WATCH", "RERATING_ACTIVE"].includes(highPressureFormation.current.expansionStage));
assert.notEqual(highPressureFormation.current.pressureStage, "PRESSURE_SOVEREIGN");

const earlyWarning = buildTemporalSovereigntyAssessment({
  primary: pkg("single", [
    row("2026-02-01", 76, 70, 70, [...support(1.2, 1.5), ...damage(3.0, 3.4)]),
    row("2026-02-16", 75, 72, 68, [...support(1.0, 1.3), ...damage(2.3, 2.7)]),
    row("2026-03-03", 72, 74, 62, [...support(1.3, 1.6), ...damage(1.6, 2.0)])
  ])
});
assert.equal(earlyWarning.current.pressureStage, "VULNERABILITY_FORMING");
assert.equal(earlyWarning.windows.pressureSovereign, null);
assert.equal(earlyWarning.windows.pressureWarning.label, "Risk is rising, but expansion still leads");

const exhaustion = buildTemporalSovereigntyAssessment({
  primary: pkg("single", [
    row("2026-04-01", 64, 55, 61, [contact("Jupiter", "trine", "Sun", 4, 4.5)], { active: true }),
    row("2026-04-16", 58, 57, 54, [], { active: true }),
    row("2026-05-01", 53, 60, 48, [], { active: true })
  ])
});
assert.equal(exhaustion.current.expansionStage, "EXPANSION_EXHAUSTION");
assert.equal(exhaustion.current.pressureStage, "NO_STRUCTURAL_PRESSURE_SEQUENCE");
assert.equal(exhaustion.windows.pressureSovereign, null);

const breakTruth = {
  breakState: {
    mapped: true, episodeStart: "2026-06-01", episodeEnd: "2026-07-15",
    aspectLedger: { destructiveBreakLoad: true }
  }
};
const structuralBreak = buildTemporalSovereigntyAssessment({
  truth: breakTruth,
  primary: pkg("single", [
    row("2026-06-01", 70, 78, 46, [...support(2.0, 2.5), ...damage(1.2, 1.4)]),
    row("2026-06-16", 67, 81, 40, [...support(2.4, 2.8), ...damage(0.7, 0.9)]),
    row("2026-07-01", 62, 82, 35, damage(1.1, 1.2))
  ])
});
assert.ok(["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(structuralBreak.current.pressureStage));
assert.equal(structuralBreak.current.foundationAlive, false);
assert.match(structuralBreak.current.story, /short burst of support does not yet mean/i);

const marketRows = [
  row("2026-08-01", 78, 58, 72, support(1.8, 2.0)),
  row("2026-08-16", 79, 60, 73, support(1.2, 1.5)),
  row("2026-08-31", 80, 61, 74, support(0.8, 1.0))
];
const structuralRows = [
  row("2026-08-01", 62, 76, 48, damage(1.8, 2.0)),
  row("2026-08-16", 60, 79, 43, damage(1.1, 1.3)),
  row("2026-08-31", 58, 81, 39, damage(0.7, 0.9))
];
const roleCrossover = buildTemporalSovereigntyAssessment({
  primary: pkg("listing", marketRows, ["MARKET_EXPRESSION_RERATING"], "PRIMARY"),
  roleReadings: [pkg("incorporation", structuralRows, ["STRUCTURAL_PRESSURE_BREAK"], "ENTERPRISE_FOUNDATION")],
  rolePolicy: { crossoverRule: "STRUCTURAL_CAN_ACTIVATE_WHEN_MARKET_CHART_CONFLICTS" }
});
assert.equal(roleCrossover.current.pressureStage, "PRESSURE_ACTIVATION");
assert.notEqual(roleCrossover.current.pressureStage, "PRESSURE_SOVEREIGN");
assert.equal(roleCrossover.current.roleTrace.scoresBlended, false);

// Future support must not rewrite a weak present into recovery. A current
// P75/E61/L35 state remains pressure-led even if a renewal chart strengthens
// inside the next 45 days.
const futureSupportCannotOverwritePresent = buildTemporalSovereigntyAssessment({
  primary: pkg("pressure-now", [
    row("2026-08-18", 61, 75, 35, damage(1.0, 1.2)),
    row("2026-09-02", 64, 72, 40, damage(1.7, 1.9)),
    row("2026-09-17", 69, 65, 58, support(1.2, 1.5))
  ], ["STRUCTURAL_PRESSURE_BREAK", "TRADED_DETERIORATION"]),
  roleReadings: [pkg("renewal-later", [
    row("2026-08-18", 56, 70, 42, damage(1.8, 2.1)),
    row("2026-09-02", 66, 61, 57, support(1.3, 1.6)),
    row("2026-09-17", 74, 54, 68, support(0.8, 1.0))
  ], ["RECOVERY_RENEWAL"], "RECOVERY")]
});
assert.notEqual(futureSupportCannotOverwritePresent.current.pressureStage, "PRESSURE_RELEASE");
assert.notEqual(futureSupportCannotOverwritePresent.current.recoveryStage, "RECOVERY_FORMATION");

assert.equal(roleCrossover.invariants.changesRawScores, false);
assert.equal(roleCrossover.invariants.elapsedTimeCannotCreateBreak, true);
assert.equal(roleCrossover.invariants.fallSizeCannotCreateBreak, true);

console.log("v37.9.14 temporal sovereignty passed: high-pressure expansion, early warning, exhaustion, Break, role crossover, and present-state protection verified.");
