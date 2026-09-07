const DAY_MS = 86_400_000;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const stamp = value => value ? new Date(`${value}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;
const daysBetween = (from, to) => from && to ? Math.round((stamp(to) - stamp(from)) / DAY_MS) : null;

const SLOW_CARRIERS = new Set(["jupiter", "saturn", "rahu", "ketu", "eclipse"]);
const STRUCTURAL_PRESSURE_CARRIERS = new Set(["saturn", "ketu", "eclipse"]);
const EXPRESSION_RECEPTORS = new Set(["sun", "moon", "mercury", "mars", "venus"]);
const FOUNDATION_RECEPTORS = new Set(["jupiter", "saturn", "rahu", "ketu", "sun", "venus", "mercury"]);

function dateOf(row = {}) {
  return row.date || row.start || row.peakDate || null;
}

function rowReading(row = {}) {
  return {
    raw: row,
    date: dateOf(row),
    expansion: finite(row.expansionScore ?? row.expansion, 50),
    pressure: finite(row.pressureScore ?? row.pressure, 50),
    leadership: finite(row.leadershipProbability ?? row.leadership, 50),
    contacts: Array.isArray(row.transitDetails) ? row.transitDetails : []
  };
}

function normalizedContact(contact = {}) {
  return {
    raw: contact,
    planet: String(contact.planet || "").toLowerCase(),
    aspect: String(contact.aspect || "").toLowerCase(),
    receptor: String(contact.targetPlanet || contact.natalPlanet || "").toLowerCase(),
    orb: Number.isFinite(Number(contact.orb)) ? Math.abs(Number(contact.orb)) : null,
    score: finite(contact.score)
  };
}

function contactKey(contact = {}) {
  const c = normalizedContact(contact);
  return `${c.planet}:${c.aspect}:${c.receptor}`;
}

function uniqueContacts(contacts = []) {
  return [...new Map(contacts.map(contact => [contactKey(contact), contact])).values()];
}

function contactEvidence(row = {}, nextRow = null) {
  const contacts = rowReading(row).contacts.map(normalizedContact);
  const nextByKey = new Map(rowReading(nextRow || {}).contacts.map(contact => [contactKey(contact), normalizedContact(contact)]));
  const support = contacts.filter(contact => SLOW_CARRIERS.has(contact.planet) && contact.score >= 3);
  const operativeSupport = support.filter(contact => !(contact.planet === "rahu" || contact.planet === "ketu") || !["rahu", "ketu"].includes(contact.receptor));
  const structuralPressure = contacts.filter(contact => STRUCTURAL_PRESSURE_CARRIERS.has(contact.planet) && contact.score <= -4);
  const acutePressure = contacts.filter(contact => ["mars", "rahu", "ketu", "eclipse"].includes(contact.planet) && contact.score < 0);
  const phaseOf = contact => {
    const later = nextByKey.get(`${contact.planet}:${contact.aspect}:${contact.receptor}`);
    if (!later || contact.orb === null || later.orb === null) return "UNRESOLVED";
    if (later.orb < contact.orb - 0.15) return "APPLYING";
    if (later.orb > contact.orb + 0.15) return "SEPARATING";
    return "EXACT_OR_STATIONARY";
  };
  return {
    support,
    operativeSupport,
    structuralPressure,
    acutePressure,
    supportFamilies: [...new Set(operativeSupport.map(contact => contact.planet))],
    supportReceptors: [...new Set(operativeSupport.map(contact => contact.receptor))],
    pressureFamilies: [...new Set(structuralPressure.map(contact => contact.planet))],
    pressureReceptors: [...new Set(structuralPressure.map(contact => contact.receptor))],
    expressionSupport: operativeSupport.filter(contact => EXPRESSION_RECEPTORS.has(contact.receptor)),
    foundationPressure: structuralPressure.filter(contact => FOUNDATION_RECEPTORS.has(contact.receptor)),
    applyingSupport: operativeSupport.filter(contact => phaseOf(contact) === "APPLYING"),
    exactSupport: operativeSupport.filter(contact => contact.orb !== null && contact.orb <= 1.25),
    applyingPressure: structuralPressure.filter(contact => phaseOf(contact) === "APPLYING"),
    exactPressure: structuralPressure.filter(contact => contact.orb !== null && contact.orb <= 1.25)
  };
}

function setAdds(current = [], previous = []) {
  const seen = new Set(previous);
  return current.some(value => !seen.has(value));
}

function trajectory(rows, index, key, span = 2) {
  const now = finite(rows[index]?.[key]);
  const later = finite(rows[Math.min(rows.length - 1, index + span)]?.[key], now);
  return later - now;
}

function featuresFor(rows, index) {
  const row = rows[index];
  const next = rows[index + 1] || null;
  const after = rows[index + 2] || next;
  const evidence = contactEvidence(row.raw, next?.raw);
  const nextEvidence = contactEvidence(next?.raw || {}, after?.raw);
  const supportNetwork = evidence.supportFamilies.length >= 2 || evidence.operativeSupport.length >= 3 || evidence.exactSupport.some(contact => ["jupiter", "saturn", "eclipse"].includes(contact.planet));
  const structuralNetwork = evidence.pressureFamilies.length >= 2 || evidence.foundationPressure.length >= 2 || evidence.exactPressure.some(contact => ["saturn", "ketu", "eclipse"].includes(contact.planet));
  const supportPersistent = [row, next, after].filter(Boolean).filter(item => {
    const e = contactEvidence(item.raw);
    return e.operativeSupport.length >= 2 || e.supportFamilies.length >= 2;
  }).length >= 2;
  const pressurePersistent = [row, next, after].filter(Boolean).filter(item => {
    const e = contactEvidence(item.raw);
    return e.structuralPressure.length >= 1 && (e.foundationPressure.length >= 1 || e.exactPressure.length >= 1);
  }).length >= 2;
  const supportBroadening = setAdds(nextEvidence.supportReceptors, evidence.supportReceptors) || setAdds(nextEvidence.supportFamilies, evidence.supportFamilies);
  const pressureBroadening = setAdds(nextEvidence.pressureReceptors, evidence.pressureReceptors) || setAdds(nextEvidence.pressureFamilies, evidence.pressureFamilies);
  const supportHandoff = supportPersistent && supportBroadening;
  const pressureHandoff = pressurePersistent && pressureBroadening;
  const expansionDelta = trajectory(rows, index, "expansion");
  const pressureDelta = trajectory(rows, index, "pressure");
  const leadershipDelta = trajectory(rows, index, "leadership");
  const advancingSupport = evidence.applyingSupport.length > 0 || supportHandoff || supportBroadening;
  const advancingPressure = evidence.applyingPressure.length > 0 || pressureHandoff || pressureBroadening;
  const supportSovereign = supportPersistent && supportNetwork && row.expansion >= 62 && row.leadership >= 58 && row.expansion >= row.pressure - 8 && !(advancingPressure && pressurePersistent && row.leadership < 50);
  const contestedExpansion = supportPersistent && advancingSupport && row.expansion >= 60 && row.leadership >= 52 && leadershipDelta >= 0 && !(pressureHandoff && row.leadership < 48);
  const presentSupportCanVetoPressure = supportHandoff && leadershipDelta >= 5 &&
    row.leadership >= 58 && row.expansion >= row.pressure - 8;
  const pressureSovereign = pressurePersistent && structuralNetwork && row.pressure >= 65 && row.leadership <= 54 &&
    (advancingPressure || pressureHandoff || evidence.exactPressure.length > 0) && !presentSupportCanVetoPressure;
  return {
    evidence,
    nextEvidence,
    supportNetwork,
    structuralNetwork,
    supportPersistent,
    pressurePersistent,
    supportBroadening,
    pressureBroadening,
    supportHandoff,
    pressureHandoff,
    advancingSupport,
    advancingPressure,
    expansionDelta,
    pressureDelta,
    leadershipDelta,
    supportSovereign,
    contestedExpansion,
    pressureSovereign
  };
}

function classifySingleChart(readingPackage = {}, truth = {}) {
  const rawRows = Array.isArray(readingPackage.windows?.fullScan) ? readingPackage.windows.fullScan : [];
  const rows = rawRows.filter(row => dateOf(row)).map(rowReading).sort((a, b) => stamp(a.date) - stamp(b.date));
  if (!rows.length) return { rows: [], current: null, windows: {}, chart: readingPackage.chart || null };

  let foundationAlive = Boolean(rows[0].raw?.episodeContext?.active);
  let priorPressureSovereign = false;
  let priorSupportSovereign = foundationAlive;
  const classified = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const f = featuresFor(rows, index);
    let expansionStage = "NO_EXPANSION_SEQUENCE";
    let pressureStage = "NO_STRUCTURAL_PRESSURE_SEQUENCE";
    let recoveryStage = "NONE";

    if (f.supportSovereign || f.contestedExpansion) {
      if (!foundationAlive) {
        expansionStage = f.supportSovereign && f.supportPersistent ? "RERATING_ACTIVE" : "IGNITION_WATCH";
      } else if (f.leadershipDelta >= 8 || f.expansionDelta >= 8 || (f.supportHandoff && (f.leadershipDelta >= 3 || f.expansionDelta >= 3))) {
        expansionStage = "ACCELERATION_RENEWAL";
      } else {
        expansionStage = f.supportSovereign ? "RERATING_CONFIRMED" : "CONTINUATION_CONTESTED";
      }
      if (f.supportSovereign) foundationAlive = true;
    } else if (f.supportPersistent && f.advancingSupport && !f.pressureSovereign) {
      expansionStage = foundationAlive ? "CONTINUATION_COMPRESSED" : (f.evidence.expressionSupport.length ? "IGNITION_WATCH" : "FORMATION_ACCUMULATION");
    } else if (foundationAlive && !f.pressureSovereign) {
      const supportDecaying = f.evidence.operativeSupport.length <= 1 && f.expansionDelta <= -4 && f.leadershipDelta <= -4;
      expansionStage = supportDecaying ? "EXPANSION_EXHAUSTION" : "CONTINUATION_COMPRESSED";
    } else if (f.evidence.operativeSupport.length > 0) {
      expansionStage = "SUPPORT_SEED";
    }

    if (f.pressureSovereign) {
      const localPeak = row.pressure >= finite(rows[index - 1]?.pressure, row.pressure) && row.pressure >= finite(rows[index + 1]?.pressure, row.pressure);
      pressureStage = localPeak && (f.evidence.exactPressure.length || f.pressureHandoff) ? "PRESSURE_CULMINATION" : "PRESSURE_SOVEREIGN";
    } else if (f.pressurePersistent && f.advancingPressure && row.pressure >= 58) {
      pressureStage = f.supportSovereign || priorSupportSovereign ? "VULNERABILITY_FORMING" : "PRESSURE_ACTIVATION";
    } else if (row.pressure >= 58 && f.evidence.structuralPressure.length && (f.evidence.applyingPressure.length || f.evidence.exactPressure.length)) {
      pressureStage = f.supportSovereign ? "VULNERABILITY_FORMING" : "PRESSURE_WARNING";
    } else if (priorPressureSovereign && (row.pressure <= finite(rows[index - 1]?.pressure, row.pressure) - 5 || f.evidence.structuralPressure.length === 0)) {
      pressureStage = "PRESSURE_RELEASE";
    }

    if (priorPressureSovereign || pressureStage === "PRESSURE_RELEASE") {
      if (f.pressureSovereign && f.evidence.operativeSupport.length) recoveryStage = "FAILED_RECOVERY_RISK";
      else if (pressureStage === "PRESSURE_RELEASE" && f.supportPersistent && row.expansion >= row.pressure - 8 && row.leadership >= 50 && row.pressure < 75) recoveryStage = "RECOVERY_FORMATION";
      else if (pressureStage === "PRESSURE_RELEASE") recoveryStage = "RELEASE_ONLY";
      else if (f.supportSovereign && !f.advancingPressure) recoveryStage = foundationAlive ? "RERATING_RENEWAL" : "GENUINE_RECOVERY";
    }

    const breakMappedHere = Boolean(truth.breakState?.mapped) && (
      !truth.breakState?.episodeStart || row.date >= truth.breakState.episodeStart
    ) && (!truth.breakState?.episodeEnd || row.date <= truth.breakState.episodeEnd);
    if (breakMappedHere && (f.structuralNetwork || truth.breakState?.aspectLedger?.destructiveBreakLoad)) {
      pressureStage = f.evidence.exactPressure.length || f.pressureHandoff ? "PRESSURE_CULMINATION" : "PRESSURE_SOVEREIGN";
      foundationAlive = false;
    }

    classified.push({
      date: row.date,
      expansion: row.expansion,
      pressure: row.pressure,
      leadership: row.leadership,
      expansionStage,
      pressureStage,
      recoveryStage,
      foundationAlive,
      sovereignty: f.pressureSovereign ? "PRESSURE" : f.supportSovereign ? "EXPANSION" : f.contestedExpansion ? "CONTESTED_EXPANSION" : "MIXED",
      evidence: {
        supportPersistent: f.supportPersistent,
        pressurePersistent: f.pressurePersistent,
        supportHandoff: f.supportHandoff,
        pressureHandoff: f.pressureHandoff,
        applyingSupport: f.evidence.applyingSupport.length,
        applyingPressure: f.evidence.applyingPressure.length,
        exactSupport: f.evidence.exactSupport.length,
        exactPressure: f.evidence.exactPressure.length,
        supportFamilies: f.evidence.supportFamilies,
        pressureFamilies: f.evidence.pressureFamilies,
        supportReceptors: f.evidence.supportReceptors,
        pressureReceptors: f.evidence.pressureReceptors,
        leadershipDelta: Math.round(f.leadershipDelta)
      }
    });
    priorPressureSovereign = ["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(pressureStage);
    priorSupportSovereign = ["RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL"].includes(expansionStage);
  }

  return {
    chart: readingPackage.chart || null,
    role: readingPackage.role || null,
    authorities: readingPackage.authorities || [],
    rows: classified,
    current: classified[0]
  };
}

function contiguousWindows(rows, field, accepted, label) {
  const windows = [];
  for (const row of rows.filter(row => accepted.has(row[field]))) {
    const prior = windows.at(-1);
    if (!prior || daysBetween(prior.end, row.date) > 16 || prior.stage !== row[field]) {
      windows.push({ stage: row[field], label: label(row[field]), start: row.date, peak: row.date, end: row.date, rows: [row] });
    } else {
      prior.end = row.date;
      prior.rows.push(row);
      const score = item => field === "pressureStage" ? item.pressure - item.expansion : item.expansion + item.leadership - item.pressure;
      if (score(row) > score(prior.rows.find(item => item.date === prior.peak) || prior.rows[0])) prior.peak = row.date;
    }
  }
  return windows.map(window => ({
    stage: window.stage,
    label: window.label,
    start: window.start,
    peak: window.peak,
    end: window.end,
    expansion: window.rows.find(row => row.date === window.peak)?.expansion,
    pressure: window.rows.find(row => row.date === window.peak)?.pressure,
    leadership: window.rows.find(row => row.date === window.peak)?.leadership
  }));
}

const expansionLabel = stage => ({
  NO_EXPANSION_SEQUENCE: "No clear expansion phase",
  SUPPORT_SEED: "First signs of support",
  FORMATION_ACCUMULATION: "Support is building",
  IGNITION_WATCH: "Expansion may be starting",
  RERATING_ACTIVE: "Rerating has started",
  RERATING_CONFIRMED: "Rerating is established",
  CONTINUATION_COMPRESSED: "Rerating intact, but pausing",
  CONTINUATION_CONTESTED: "Rerating continues, but pressure is competing",
  ACCELERATION_RENEWAL: "Expansion is strengthening again",
  EXPANSION_EXHAUSTION: "Expansion support is fading"
}[stage] || stage);

const pressureLabel = stage => ({
  NO_STRUCTURAL_PRESSURE_SEQUENCE: "No slow pressure pattern",
  PRESSURE_WARNING: "Early pressure warning — not in control",
  VULNERABILITY_FORMING: "Risk is rising, but expansion still leads",
  PRESSURE_ACTIVATION: "Pressure is starting to take control",
  PRESSURE_SOVEREIGN: "Pressure is in control",
  PRESSURE_CULMINATION: "Peak pressure",
  PRESSURE_RELEASE: "Pressure is easing"
}[stage] || stage);

const recoveryLabel = stage => ({
  FAILED_RECOVERY_RISK: "Brief support, but pressure is not cleared",
  RELEASE_ONLY: "Pressure is easing, but recovery is not established",
  RECOVERY_FORMATION: "Recovery is beginning",
  GENUINE_RECOVERY: "Recovery is established",
  RERATING_RENEWAL: "Rerating is restarting"
}[stage] || stage);

function roleHas(assessment, token) {
  return (assessment?.authorities || []).includes(token);
}

function rowOn(assessment, date) {
  return assessment?.rows?.find(row => row.date === date) || null;
}

function combineRoleAssessments(assessments = [], rolePolicy = null) {
  const primary = assessments.find(item => item.role === "PRIMARY") || assessments[0];
  const structural = assessments.find(item => roleHas(item, "STRUCTURAL_PRESSURE_BREAK")) || primary;
  const market = assessments.find(item => roleHas(item, "MARKET_EXPRESSION_RERATING")) || primary;
  const deterioration = assessments.find(item => roleHas(item, "TRADED_DETERIORATION")) || market;
  const renewal = assessments.find(item => roleHas(item, "RECOVERY_RENEWAL"));
  const dates = [...new Set(assessments.flatMap(item => item.rows.map(row => row.date)))].sort();
  const rows = dates.map(date => {
    const structuralRow = rowOn(structural, date) || rowOn(primary, date);
    const marketRow = rowOn(market, date) || rowOn(primary, date);
    const deteriorationRow = rowOn(deterioration, date) || marketRow;
    const renewalRow = rowOn(renewal, date);
    const expansionRow = renewalRow && ["RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL", "RECOVERY_FORMATION"].includes(renewalRow.expansionStage)
      ? renewalRow
      : marketRow;
    const structuralActive = ["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(structuralRow?.pressureStage);
    const marketStillSovereign = ["RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL"].includes(marketRow?.expansionStage);
    const marketFoundationOperative = marketRow?.foundationAlive && marketRow?.leadership >= 55 && [
      "RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL", "CONTINUATION_COMPRESSED", "CONTINUATION_CONTESTED"
    ].includes(marketRow?.expansionStage);
    const deteriorationActive = ["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(deteriorationRow?.pressureStage);
    const deteriorationConfirms = deteriorationActive || (["PRESSURE_WARNING", "VULNERABILITY_FORMING", "PRESSURE_ACTIVATION"].includes(deteriorationRow?.pressureStage) && deteriorationRow?.pressure >= 58 && deteriorationRow?.leadership <= 52);
    const structuralCrossover = ["VULNERABILITY_FORMING", "PRESSURE_ACTIVATION"].includes(structuralRow?.pressureStage) &&
      structuralRow?.pressure >= 68 && structuralRow?.evidence?.pressurePersistent &&
      marketRow?.leadership <= 54 && !marketStillSovereign;
    let pressureStage = structuralRow?.pressureStage || "NO_STRUCTURAL_PRESSURE_SEQUENCE";
    if (["PRESSURE_WARNING", "VULNERABILITY_FORMING", "PRESSURE_ACTIVATION"].includes(pressureStage) && marketStillSovereign) pressureStage = "VULNERABILITY_FORMING";
    if (structuralActive && marketStillSovereign) {
      pressureStage = rolePolicy?.crossoverRule === "STRUCTURAL_CAN_ACTIVATE_WHEN_MARKET_CHART_CONFLICTS"
        ? "PRESSURE_ACTIVATION"
        : "VULNERABILITY_FORMING";
    }
    if (structuralActive && !marketStillSovereign) {
      if (rolePolicy?.crossoverRule === "REQUIRE_MARKET_EXPRESSION_LOSS" && marketFoundationOperative) {
        pressureStage = "VULNERABILITY_FORMING";
      } else if (rolePolicy?.crossoverRule === "REQUIRE_TRADED_DETERIORATION_CONFIRMATION" && !deteriorationConfirms) {
        pressureStage = "VULNERABILITY_FORMING";
      } else if (rolePolicy?.crossoverRule === "REQUIRE_TRADED_DETERIORATION_CONFIRMATION" && deteriorationConfirms && !deteriorationActive) {
        pressureStage = "PRESSURE_ACTIVATION";
      } else {
        pressureStage = structuralRow.pressureStage;
      }
    }
    if (structuralCrossover) pressureStage = "PRESSURE_SOVEREIGN";
    if (!structuralActive && ["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(deteriorationRow?.pressureStage)) pressureStage = deteriorationRow.pressureStage;
    let recoveryStage = renewalRow && renewalRow.recoveryStage !== "NONE" ? renewalRow.recoveryStage
      : deteriorationRow && deteriorationRow.recoveryStage !== "NONE" ? deteriorationRow.recoveryStage
        : structuralRow?.recoveryStage || "NONE";
    let expansionStage = expansionRow?.expansionStage || "NO_EXPANSION_SEQUENCE";
    const renewalSoon = renewal?.rows?.some(row => row.date > date && daysBetween(date, row.date) <= 45 && [
      "RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL"
    ].includes(row.expansionStage));
    const recoveryHandoffForming = renewalSoon && deteriorationRow?.evidence?.leadershipDelta >= 3 && structuralRow?.evidence?.leadershipDelta >= 3;
    const presentRecoveryCanSpeak = structuralRow?.expansion >= structuralRow?.pressure - 8 &&
      structuralRow?.leadership >= 50 && structuralRow?.pressure < 75;
    if (structuralActive && recoveryHandoffForming && presentRecoveryCanSpeak) {
      pressureStage = "PRESSURE_RELEASE";
      recoveryStage = "RECOVERY_FORMATION";
      expansionStage = "IGNITION_WATCH";
    }
    return {
      ...expansionRow,
      date,
      expansionStage,
      pressureStage,
      recoveryStage,
      roleTrace: {
        expansionChartId: expansionRow === renewalRow ? renewal?.chart?.id : market?.chart?.id,
        structuralChartId: structural?.chart?.id,
        tradedDeteriorationChartId: deterioration?.chart?.id,
        scoresBlended: false
      }
    };
  });
  return { rows, current: rows[0] || null, structural, market, deterioration, renewal };
}

function interpretationStory(current = {}) {
  if (!current) return "No temporal interpretation is available.";
  const expansion = expansionLabel(current.expansionStage);
  const pressure = pressureLabel(current.pressureStage);
  const recovery = current.recoveryStage && current.recoveryStage !== "NONE" ? ` ${recoveryLabel(current.recoveryStage)}.` : "";
  if (current.pressureStage === "VULNERABILITY_FORMING" && ["RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL"].includes(current.expansionStage)) {
    return `${expansion}. Risk is rising, but expansion still has control. This is an early warning, not an active pressure phase.${recovery}`;
  }
  if (["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(current.pressureStage)) {
    return `${pressure}. A short burst of support does not yet mean that recovery has begun; support must remain strong after the pressure eases.${recovery}`;
  }
  if (current.expansionStage === "EXPANSION_EXHAUSTION") {
    return `${expansion}. Support is weakening, but the astrology does not yet show a confirmed Break-Risk phase.${recovery}`;
  }
  return `${expansion}. ${pressure}.${recovery}`;
}

export function buildTemporalSovereigntyAssessment({ truth = {}, primary = {}, roleReadings = [], rolePolicy = null } = {}) {
  const primaryPackage = {
    ...primary,
    role: "PRIMARY",
    authorities: primary.authorities || ["MARKET_EXPRESSION_RERATING", "STRUCTURAL_PRESSURE_BREAK", "TRADED_DETERIORATION", "RECOVERY_RENEWAL"]
  };
  const packages = [primaryPackage, ...roleReadings.filter(item => item?.chart?.id && item.chart.id !== primaryPackage.chart?.id)];
  const assessments = packages.map((item, index) => classifySingleChart(item, index === 0 ? truth : {}));
  const combined = combineRoleAssessments(assessments, rolePolicy);
  const rows = combined.rows;
  const expansionWindows = contiguousWindows(rows, "expansionStage", new Set([
    "FORMATION_ACCUMULATION", "IGNITION_WATCH", "RERATING_ACTIVE", "RERATING_CONFIRMED",
    "CONTINUATION_COMPRESSED", "CONTINUATION_CONTESTED", "ACCELERATION_RENEWAL", "EXPANSION_EXHAUSTION"
  ]), expansionLabel);
  const pressureWindows = contiguousWindows(rows, "pressureStage", new Set([
    "PRESSURE_WARNING", "VULNERABILITY_FORMING", "PRESSURE_ACTIVATION", "PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION", "PRESSURE_RELEASE"
  ]), pressureLabel);
  const recoveryWindows = contiguousWindows(rows, "recoveryStage", new Set([
    "FAILED_RECOVERY_RISK", "RELEASE_ONLY", "RECOVERY_FORMATION", "GENUINE_RECOVERY", "RERATING_RENEWAL"
  ]), recoveryLabel);
  const current = combined.current;
  const downsideMechanism = !current ? "UNRESOLVED"
    : ["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(current.pressureStage)
      ? (truth.breakState?.mapped || current.evidence?.pressureHandoff ? "STRUCTURAL_BREAK_OR_CONTINUING_DESTRUCTION" : "STRUCTURAL_PRESSURE_SEQUENCE")
      : current.expansionStage === "EXPANSION_EXHAUSTION"
        ? "EXPANSION_EXHAUSTION_SUPPORT_WITHDRAWAL"
        : current.foundationAlive && current.pressure >= 58
          ? "ORDINARY_CORRECTION_INTACT_FOUNDATION"
          : "NO_DOWNSIDE_MECHANISM_ACTIVE";
  return {
    schemaVersion: "37.9.0-temporal-sovereignty-v1.1",
    current: current ? { ...current, downsideMechanism, story: interpretationStory(current) } : null,
    windows: {
      expansionFormation: expansionWindows.find(window => ["FORMATION_ACCUMULATION", "IGNITION_WATCH"].includes(window.stage)) || null,
      rerating: expansionWindows.find(window => ["RERATING_ACTIVE", "RERATING_CONFIRMED", "ACCELERATION_RENEWAL"].includes(window.stage)) || null,
      continuation: expansionWindows.find(window => ["CONTINUATION_COMPRESSED", "CONTINUATION_CONTESTED"].includes(window.stage)) || null,
      exhaustion: expansionWindows.find(window => window.stage === "EXPANSION_EXHAUSTION") || null,
      pressureWarning: pressureWindows.find(window => ["PRESSURE_WARNING", "VULNERABILITY_FORMING"].includes(window.stage)) || null,
      pressureActivation: pressureWindows.find(window => window.stage === "PRESSURE_ACTIVATION") || null,
      pressureSovereign: pressureWindows.find(window => ["PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION"].includes(window.stage)) || null,
      pressureRelease: pressureWindows.find(window => window.stage === "PRESSURE_RELEASE") || null,
      recovery: recoveryWindows[0] || null,
      allExpansion: expansionWindows,
      allPressure: pressureWindows,
      allRecovery: recoveryWindows
    },
    roleReadings: assessments.map(item => ({ chart: item.chart, role: item.role, authorities: item.authorities, current: item.current })),
    macroContext: truth.macroEnvironment || null,
    forwardStates: rows.slice(0, 40),
    invariants: {
      consumesExistingSwissAstrologyOnly: true,
      changesRawScores: false,
      scoresBlendedAcrossCharts: false,
      separateExpansionAndPressureLedgers: true,
      earlyVulnerabilityCannotStartActivePressure: true,
      elapsedTimeCannotCreateBreak: true,
      fallSizeCannotCreateBreak: true,
      priceInputUsed: false,
      tradingInstructionLanguageUsed: false
    }
  };
}

export default buildTemporalSovereigntyAssessment;
