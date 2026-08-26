import assert from "node:assert/strict";
import { evaluateTransitReceptorFit } from "../lib/transitReceptorFitEngine.js";

const result = evaluateTransitReceptorFit({
  company: {
    symbol: "TCS.NS",
    sector: "software",
    confidence: "HIGH",
    birthTime: "09:15",
    incorporationDate: "1968-04-01"
  },
  natal: {
    metadata: {
      confidence: "HIGH",
      birthTime: "09:15",
      birthDate: "1968-04-01"
    }
  },
  transits: {
    positions: { jupiter: { sign: "Cancer" } }
  },
  replay: {
    expansionScore: 72,
    pressureScore: 58,
    transitDetails: []
  }
});

assert.equal(result.model, "Transit Receptor Model");
assert.ok(Number.isFinite(result.scores.expressionScore));
assert.ok(result.reading.length > 0);
assert.doesNotMatch(result.reading, /historical echo|replay memory/i);
assert.equal(Object.hasOwn(result.components, "historicalEcho"), false);

console.log("Production stock smoke test passed: receptor computation completes without historical-memory dependencies.");
