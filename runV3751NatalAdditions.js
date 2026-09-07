import assert from "node:assert/strict";
import registry from "../lib/natalRegistry.js";
import { resolveCompany } from "../lib/companyResolver.js";

const expected = {
  "ABCAPITAL.NS": "2017-09-01",
  "ACUTAAS.NS": "2021-09-14",
  "CERA.NS": "2007-11-02",
  "GRASIM.NS": "1995-05-10",
  "GVT&D.NS": "2008-06-30",
  "VOLTAMP.NS": "2006-09-20",
  "MARUTI.NS": "2003-07-09",
  "ACE.NS": "2006-09-26",
  "SCHNEIDER.NS": "2012-03-20",
  "SANSERA.NS": "2021-09-24",
  "NEULANDLAB.NS": "2008-10-13",
  "LAURUSLABS.NS": "2016-12-19",
  "HSCL.NS": "2007-03-02",
  "HBLENGINE.NS": "2007-01-04"
};

for (const [symbol, date] of Object.entries(expected)) {
  const entry = registry[symbol];
  assert.ok(entry, `${symbol} must exist in the canonical natal registry`);
  assert.equal(entry.birthDate, date);
  assert.equal(entry.chartType, "listing");
  assert.equal(entry.birthTime, "09:15");
  assert.equal(entry.city, "Mumbai");
  assert.equal(entry.sourceVerification, "verified-primary-source");
  assert.equal(entry.anchorValidation, "untested");
  assert.equal(entry.capitalAuthorityCeiling, "RESEARCH_ONLY");
}

const tata = registry["TATAELXSI.NS"];
assert.equal(tata.birthDate, "1989-03-30");
assert.equal(tata.chartType, "incorporation");
assert.equal(tata.anchorValidation, "untested");

const correctedAnchors = {
  "ABB.NS": "1949-12-24",
  "AARTIIND.NS": "1984-09-28",
  "TATAELXSI.NS": "1989-03-30"
};
const fingerprints = new Set();
for (const [symbol, date] of Object.entries(correctedAnchors)) {
  const entry = registry[symbol];
  assert.equal(entry.birthDate, date);
  assert.equal(entry.chartType, "incorporation");
  assert.equal(entry.chartFingerprintCollision, false);
  assert.ok(!fingerprints.has(entry.chartFingerprint), `${symbol} must not clone another stock chart`);
  fingerprints.add(entry.chartFingerprint);
}

for (const alias of ["HBL ENGINE", "HBLENGINE LISTING", "HBLPOWER.NS"]) {
  const resolved = await resolveCompany(alias);
  assert.equal(resolved.found, true);
  assert.equal(resolved.aliasResolvedTo, "HBLENGINE.NS");
  assert.equal(resolved.birthDate, "2007-01-04");
}

console.log("Natal additions passed: source candidates resolve, HBL aliases converge, and ABB/AARTIIND/TATAELXSI use distinct corrected company anchors.");
