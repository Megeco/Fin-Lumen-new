import assert from "node:assert/strict";
import fs from "node:fs";
import { astroEngine } from "../lib/astroEngine.js";
import registry from "../lib/natalRegistry.js";

const added = [
  "ABCAPITAL.NS", "ABB.NS", "ACUTAAS.NS", "CERA.NS",
  "GRASIM.NS", "GVT&D.NS", "VOLTAMP.NS"
];

const getStocksSource = fs.readFileSync(new URL("../pages/api/get-stocks.js", import.meta.url), "utf8");
for (const symbol of added) {
  assert.match(getStocksSource, new RegExp(`name:\\s*["']${symbol.replace(/[&.]/g, "\\$&")}["']`), `${symbol} must be in the visible baseline table`);
  assert.equal(registry[symbol]?.capitalAuthorityCeiling, "RESEARCH_ONLY");
  assert.equal(registry[symbol]?.sourceVerification, "verified-primary-source");
}

const result = await astroEngine({ name: "VOLTAMP.NS", asOfDate: "2026-08-09" });
const evidenceEvent = (result.astro_model?.paths?.rawAstroLedger || []).find(event =>
  (event.transitDetails || []).length ||
  (event.supportiveContacts || []).length ||
  (event.pressuringContacts || []).length
);

assert.ok(evidenceEvent, "At least one mapped event must retain its causal natal-contact evidence");
assert.ok(Array.isArray(evidenceEvent.transitDetails));
assert.ok(Array.isArray(evidenceEvent.supportiveContacts));
assert.ok(Array.isArray(evidenceEvent.pressuringContacts));
assert.ok("finAstroGrammar" in evidenceEvent);
assert.ok("episodeContext" in evidenceEvent);

console.log("v37.6.2 rerating evidence passed: seven Research Only stocks are table-visible and mapped events retain causal transit networks.");
