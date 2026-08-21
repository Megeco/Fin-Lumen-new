import { buildAstroTruthV36 } from "./v36/astroTruth.js";
import { buildBehaviourV35 } from "./v35/behaviour.js";
import { buildShadowAstroAssessment } from "./shadowAstroAssessment.js";
import { buildTemporalSovereigntyAssessment } from "./temporalSovereigntyEngine.js";

const DAY_MS = 86_400_000;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dateOf = value => value?.start || value?.date || value?.peakDate || null;
const endOf = value => value?.end || value?.date || value?.peakDate || null;
const stamp = value => value ? new Date(`${value}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;

function daysBetween(from, to) {
  if (!from || !to) return null;
  return Math.round((stamp(to) - stamp(from)) / DAY_MS);
}

function title(value) {
  return String(value || "UNRESOLVED")
    .replaceAll("_", " ")
    .replace(/\b\w/g, character => character.toUpperCase());
}

function stateLabel(state) {
  const labels = {
    RERATING_IGNITION: "RERATING IGNITION",
    CLEAN_EXPANSION: "CLEAN EXPANSION",
    ACTIVE_TACTICAL_LEADERSHIP: "ACTIVE TACTICAL LEADERSHIP",
    VOLATILE_EXPANSION: "VOLATILE EXPANSION",
    CONTESTED_CYCLE_EXPANSION: "CONTESTED CYCLE EXPANSION",
    SLOW_COMPOUNDER_DURABLE_DIGESTION: "DURABLE DIGESTION",
    PRESSURE_DIGESTION: "PRESSURE DIGESTION",
    BREAK_RESET_RISK: "BREAK-RISK PRESSURE",
    DORMANT_PHASE: "DORMANT PHASE",
    MATURE_LEADER: "MATURE LEADERSHIP",
    REPAIR_PHASE: "REPAIR PHASE",
    FORWARD_LEADERSHIP_WATCH: "FORWARD LEADERSHIP WATCH"
  };
  return labels[state] || title(state);
}

function eventKind(event = {}) {
  const type = String(event.eventType || "").toUpperCase();
  if (type.includes("BREAK") || type.includes("PRESSURE")) return "PRESSURE";
  if (type.includes("EXPANSION") || type.includes("ACCUMULATION") || type.includes("LEADERSHIP")) return "EXPANSION";
  return "CATALYST";
}

function eventLabel(event = {}) {
  if (event.label) return event.label;
  const labels = {
    TACTICAL_CATALYST: "Tactical catalyst",
    TACTICAL_PRESSURE: "Tactical pressure",
    STRUCTURAL_PRESSURE: "Structural pressure",
    CONFIRMATORY_PRESSURE: "Confirmed structural pressure",
    BREAK_PRESSURE: "Break-Risk pressure",
    ACCUMULATION_PRESSURE: "Pre-expansion pressure",
    STRATEGIC_ACCUMULATION: "Strategic expansion opening",
    STRATEGIC_EXPANSION: "Strategic expansion",
    LEADERSHIP_EXPANSION: "Leadership expansion",
    LONG_CYCLE_LEADERSHIP: "Long-cycle leadership"
  };
  return labels[event.eventType] || title(event.eventType || event.signalClass || "Astro event");
}

function publicEventType(value) {
  const type = String(value || "").toUpperCase();
  const map = {
    ACCUMULATION_PRESSURE: "PRE_EXPANSION_PRESSURE",
    STRATEGIC_ACCUMULATION: "EXPANSION_OPENING",
    CURRENT_EXPANSION: "CURRENT_EXPANSION",
    CURRENT_PRESSURE: "CURRENT_PRESSURE"
  };
  return map[type] || type || null;
}

function expectedExpression(event = {}) {
  const expansion = finite(event.expansionScore, 50);
  const pressure = finite(event.pressureScore, 50);
  const leadership = finite(event.leadership, 50);
  const kind = eventKind(event);
  const severity = String(event.pressureClass || "").toUpperCase();

  if (String(event.eventType || "").includes("BREAK") || severity === "BREAK") {
    return "Destructive structural pressure is concentrated; structural discontinuity or prolonged instability is astrologically possible.";
  }
  if (kind === "PRESSURE" && severity === "HIGH") {
    return expansion >= pressure - 8
      ? "High pressure contests expansion; expect violent digestion, failed acceleration attempts, or sharp rotation."
      : "High structural pressure dominates; expect compression, weakness, or an extended repair test.";
  }
  if (kind === "PRESSURE") {
    return expansion >= pressure - 5
      ? "Pressure is mixed with support; expect churn, digestion, and reversals rather than a clean directional break."
      : "Pressure leads the window; expect compression and delayed expression until the next supportive contact.";
  }
  if (kind === "EXPANSION" && expansion >= 72 && leadership >= 68) {
    return "Expansion and leadership align; rerating acceleration and stronger relative expression are favoured.";
  }
  if (kind === "EXPANSION") {
    return "Supportive structure improves; expansion can develop, though the pressure score still determines smoothness.";
  }
  return event.expectedBehaviour || event.netExpectedExpression || "The catalyst is mixed; the natal receptor decides whether it expresses as support, pressure, or volatility.";
}

function normalizeEvent(event) {
  if (!event || !dateOf(event)) return null;
  const kind = eventKind(event);
  const pressureClass = kind === "PRESSURE"
    ? String(event.pressureClass || (finite(event.pressureScore) >= 68 ? "HIGH" : finite(event.pressureScore) >= 58 ? "MEDIUM" : "LOW")).toUpperCase()
    : null;
  return {
    id: `${publicEventType(event.eventType) || kind}:${dateOf(event)}:${endOf(event)}`,
    kind,
    eventType: publicEventType(event.eventType),
    label: eventLabel(event),
    start: dateOf(event),
    peak: event.peakDate || event.date || dateOf(event),
    end: endOf(event),
    expansion: finite(event.expansionScore, null),
    pressure: finite(event.pressureScore, null),
    leadership: finite(event.leadership, null),
    pressureClass,
    signalClass: event.signalClass || null,
    expectedExpression: expectedExpression(event),
    supportiveContacts: event.supportiveNatalContacts || [],
    pressuringContacts: event.pressuringNatalContacts || [],
    volatileContacts: event.volatileNatalContacts || [],
    transitDetails: event.transitDetails || [],
    finAstroGrammar: event.finAstroGrammar || null,
    episodeContext: event.episodeContext || null,
    breakQualification: compactBreakQualification(event.breakQualification)
  };
}

function compactBreakQualification(value) {
  if (!value) return null;
  return {
    mapped: Boolean(value.mapped),
    basis: value.qualificationBasis || "DESTRUCTIVE_ASTROLOGY",
    label: value.label || null,
    destructiveNetwork: Boolean(value.aspectLedger?.destructiveBreakLoad),
    scoreCorroborated: Boolean(value.scoreCorroborated),
    dualAnchorRequired: Boolean(value.dualAnchorRequired),
    dualAnchorConfirmed: value.dualAnchorConfirmed !== false,
    evidence: Array.isArray(value.evidence) ? value.evidence.slice(0, 8) : [],
    futureSupportDate: value.firstSurvivalDate || null,
    futureExpansionRecoveryDate: value.firstCredibleRecoveryDate || null
  };
}

function compactReceptor(value = {}) {
  const scores = value?.scores || {};
  return {
    model: value.model || "Transit receptor model",
    expressionClass: value.expressionClass || null,
    expressionLabel: value.expressionLabel || null,
    confidenceLabel: value.confidenceLabel || null,
    scores: {
      expression: finite(scores.expressionScore, null),
      natalReliability: finite(scores.natalReliability ?? scores.natalReliabilityScore, null),
      receptorStrength: finite(scores.natalReceptorStrength, null),
      themeFit: finite(scores.sectorThemeFit, null),
      pressureInterference: finite(scores.pressureInterference, null)
    }
  };
}

function uniqueEvents(events) {
  const seen = new Set();
  return events.filter(Boolean).filter(event => {
    const key = `${event.kind}:${event.start}:${event.end}:${event.eventType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => stamp(a.start) - stamp(b.start) || stamp(a.peak) - stamp(b.peak));
}

const STAGE_PRIORITY = {
  PRESSURE_CULMINATION: 100,
  PRESSURE_SOVEREIGN: 95,
  PRESSURE_ACTIVATION: 90,
  PRESSURE_RELEASE: 80,
  GENUINE_RECOVERY: 75,
  RECOVERY_FORMATION: 70,
  RERATING_RENEWAL: 68,
  RERATING_CONFIRMED: 65,
  RERATING_ACTIVE: 62,
  ACCELERATION_RENEWAL: 60,
  IGNITION_WATCH: 55,
  FORMATION_ACCUMULATION: 50,
  CONTINUATION_CONTESTED: 45,
  CONTINUATION_COMPRESSED: 42,
  EXPANSION_EXHAUSTION: 40,
  VULNERABILITY_FORMING: 35,
  PRESSURE_WARNING: 30,
  SUPPORT_SEED: 20
};

function consolidateCoincidentEvents(events = []) {
  const groups = new Map();
  for (const event of uniqueEvents(events)) {
    const key = event.start;
    groups.set(key, [...(groups.get(key) || []), event]);
  }
  return [...groups.values()].map(group => {
    if (group.length === 1) return group[0];
    const ordered = [...group].sort((a, b) =>
      (STAGE_PRIORITY[b.methodologyStage || b.eventType] || 0) - (STAGE_PRIORITY[a.methodologyStage || a.eventType] || 0)
    );
    const controlling = ordered[0];
    const labels = [...new Set(ordered.map(item => item.label))];
    return {
      ...controlling,
      id: `PASSAGE:${controlling.start}`,
      end: ordered.map(item => item.end || item.start).sort().at(-1),
      label: labels.join(" → "),
      coincidentStages: ordered.map(item => item.methodologyStage || item.eventType),
      expectedExpression: `One causally ordered passage: ${labels.join(" → ")}. ${controlling.expectedExpression || ""}`.trim()
    };
  }).sort((a, b) => stamp(a.start) - stamp(b.start) || stamp(a.peak) - stamp(b.peak));
}

function activeOrFuture(events, asOfDate) {
  return events.filter(event => !event.end || stamp(event.end) >= stamp(asOfDate));
}

function currentEvent(truth, behaviour, asOfDate) {
  return normalizeEvent({
    id: `CURRENT:${asOfDate}`,
    eventType: behaviour.direction === "EXPANSION_BIASED" ? "CURRENT_EXPANSION" : "CURRENT_PRESSURE",
    label: stateLabel(behaviour.state),
    start: asOfDate,
    date: asOfDate,
    end: asOfDate,
    peakDate: asOfDate,
    expansionScore: truth.expansionScore,
    pressureScore: truth.pressureScore,
    leadership: truth.tacticalLeadership,
    pressureClass: behaviour.direction === "PRESSURE_BIASED" ? truth.currentPressureClass : null,
    signalClass: behaviour.state,
    expectedBehaviour: `${stateLabel(behaviour.state)}: expansion ${truth.expansionScore}, pressure ${truth.pressureScore}, leadership ${truth.tacticalLeadership}.`
  });
}

function reratingCandidate(events, truth, behaviour, asOfDate) {
  const current = currentEvent(truth, behaviour, asOfDate);
  const candidates = [current, ...events]
    .filter(event => event.kind === "EXPANSION")
    .filter(event => finite(event.expansion, 0) >= 62 && finite(event.leadership, 0) >= 58)
    .filter(event => finite(event.pressure, 50) < 78 || finite(event.expansion, 0) >= finite(event.pressure, 0) - 5);
  return activeOrFuture(candidates, asOfDate)[0] || null;
}

function pressureCandidate(events, asOfDate) {
  return activeOrFuture(events.filter(event => event.kind === "PRESSURE"), asOfDate)[0] || null;
}

function breakCandidate(events, truth, asOfDate) {
  const event = activeOrFuture(events.filter(item => item.eventType === "BREAK_PRESSURE" || item.pressureClass === "BREAK"), asOfDate)[0];
  if (event) return event;
  if (!truth.breakState?.mapped) return null;
  return normalizeEvent({
    id: truth.breakState.episodeId || `BREAK:${truth.breakState.episodeStart || truth.breakState.date}`,
    eventType: "BREAK_PRESSURE",
    label: truth.breakState.label,
    start: truth.breakState.episodeStart || truth.breakState.date,
    peakDate: truth.breakState.date,
    end: truth.breakState.episodeEnd || truth.breakState.date,
    expansionScore: truth.expansionScore,
    pressureScore: truth.pressureScore,
    leadership: truth.tacticalLeadership,
    pressureClass: "BREAK",
    breakQualification: truth.breakState
  });
}

function dateAt(asOfDate, offsetDays) {
  const value = new Date(`${asOfDate}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + offsetDays);
  return value.toISOString().slice(0, 10);
}

function pathBetween(events, asOfDate, firstDay, lastDay, current = null) {
  const start = dateAt(asOfDate, firstDay);
  const end = dateAt(asOfDate, lastDay);
  const selected = events.filter(event => event.start >= start && event.start <= end);
  return consolidateCoincidentEvents(current ? [current, ...selected] : selected).map(event => {
    if (!event.end || stamp(event.end) <= stamp(end)) return event;
    return {
      ...event,
      end,
      actualEnd: event.end,
      continuesBeyondHorizon: true,
      peakBeyondHorizon: Boolean(event.peak && stamp(event.peak) > stamp(end))
    };
  });
}

function nextTransition(events, asOfDate) {
  const future = consolidateCoincidentEvents(events.filter(event => stamp(event.start) > stamp(asOfDate)));
  return future[0] || null;
}

function temporalEvent(window, kind) {
  if (!window?.start) return null;
  return {
    id: `TEMPORAL:${window.stage}:${window.start}:${window.end}`,
    kind,
    eventType: window.stage,
    label: window.label,
    start: window.start,
    peak: window.peak || window.start,
    end: window.end || window.start,
    expansion: finite(window.expansion, null),
    pressure: finite(window.pressure, null),
    leadership: finite(window.leadership, null),
    pressureClass: kind === "PRESSURE" ? (window.stage === "PRESSURE_CULMINATION" ? "HIGH" : null) : null,
    pressureStage: kind === "PRESSURE" ? window.stage : null,
    methodologyStage: window.stage,
    expectedExpression: window.label
  };
}

function temporalStateLabel(current, fallback) {
  if (!current) return fallback;
  if (current.pressureStage === "PRESSURE_CULMINATION") return "PEAK PRESSURE";
  if (current.pressureStage === "PRESSURE_SOVEREIGN") return "PRESSURE IN CONTROL";
  if (current.pressureStage === "PRESSURE_ACTIVATION") return "PRESSURE TAKING CONTROL";
  const labels = {
    FORMATION_ACCUMULATION: "SUPPORT BUILDING",
    IGNITION_WATCH: "EXPANSION MAY BE STARTING",
    RERATING_ACTIVE: "RERATING STARTED",
    RERATING_CONFIRMED: "RERATING ESTABLISHED",
    CONTINUATION_COMPRESSED: "RERATING PAUSING",
    CONTINUATION_CONTESTED: "RERATING UNDER PRESSURE",
    ACCELERATION_RENEWAL: "EXPANSION STRENGTHENING",
    EXPANSION_EXHAUSTION: "EXPANSION SUPPORT FADING",
    SUPPORT_SEED: "FIRST SIGNS OF SUPPORT"
  };
  return labels[current.expansionStage] || fallback;
}

function runwayLevel(score) {
  if (score >= 85) return "RARE";
  if (score >= 72) return "HIGH";
  if (score >= 55) return "DEVELOPING";
  return "LOW";
}

function chartAuthority(company = {}, truth = {}) {
  if (truth.chartAuthority) return truth.chartAuthority;
  const source = String(company.capitalAuthorityCeiling || company.capital_authority_ceiling || "").toUpperCase();
  if (source === "FULL_BUILD_ELIGIBLE") return "VERIFIED";
  if (source === "PART_BUILD_MAX") return "PROVISIONAL";
  return "RESEARCH_ONLY";
}

function compactContact(contact = {}) {
  const planet = contact.planet || "Transit";
  const target = contact.targetPlanet || contact.natalPlanet || "natal point";
  const aspect = contact.aspect || "contact";
  const orb = Number.isFinite(Number(contact.orb)) ? ` · orb ${Number(contact.orb).toFixed(2)}°` : "";
  const score = Number.isFinite(Number(contact.score)) ? ` · ${Number(contact.score) > 0 ? "+" : ""}${Math.round(Number(contact.score))}` : "";
  return `${planet} ${aspect} natal ${target}${orb}${score}`;
}

export function buildPureAstroModel(inputs = {}) {
  const truth = buildAstroTruthV36(inputs);
  const behaviour = buildBehaviourV35(truth);
  const shadowAssessment = buildShadowAstroAssessment(inputs, truth);
  const temporalAssessment = buildTemporalSovereigntyAssessment({
    truth,
    primary: {
      chart: {
        id: inputs.company?.selectedChartId || inputs.company?.preferredChartId || null,
        chartType: inputs.company?.chartType || null,
        date: inputs.company?.birthDate || null,
        time: inputs.company?.birthTime || null,
        city: inputs.company?.city || null
      },
      authorities: inputs.company?.chartRolePolicy?.roles?.find(role => role.chartId === (inputs.company?.selectedChartId || inputs.company?.preferredChartId))?.authorities,
      resonance: inputs.replay,
      windows: inputs.windows
    },
    roleReadings: inputs.roleChartReadings || [],
    rolePolicy: inputs.company?.chartRolePolicy || null
  });
  const asOfDate = truth.asOfDate || inputs.replayDate;
  const events = uniqueEvents((truth.eventLedger || []).map(normalizeEvent));
  const current = currentEvent(truth, behaviour, asOfDate);
  const legacyRerating = reratingCandidate(events, truth, behaviour, asOfDate);
  const legacyPressure = pressureCandidate(events, asOfDate);
  const rerating = temporalEvent(temporalAssessment.windows.rerating, "EXPANSION");
  const formation = temporalEvent(temporalAssessment.windows.expansionFormation, "EXPANSION");
  const continuation = temporalEvent(temporalAssessment.windows.continuation, "EXPANSION");
  const exhaustion = temporalEvent(temporalAssessment.windows.exhaustion, "EXPANSION");
  const pressureWarning = temporalEvent(temporalAssessment.windows.pressureWarning, "PRESSURE");
  const pressure = temporalEvent(
    temporalAssessment.windows.pressureSovereign || temporalAssessment.windows.pressureActivation,
    "PRESSURE"
  );
  const recovery = temporalEvent(temporalAssessment.windows.recovery, "EXPANSION");
  const interpretationEvents = uniqueEvents([
    ...(temporalAssessment.windows.allExpansion || []).map(window => temporalEvent(window, "EXPANSION")),
    ...(temporalAssessment.windows.allPressure || []).map(window => temporalEvent(window, "PRESSURE")),
    ...(temporalAssessment.windows.allRecovery || []).map(window => temporalEvent(window, "EXPANSION"))
  ]);
  const breakRisk = breakCandidate(events, truth, asOfDate);
  const runway = inputs.cyclePotentialDetails || truth.cycleRunway || {};
  const breakEpisodeActiveNow = Boolean(
    breakRisk &&
    stamp(breakRisk.start) <= stamp(asOfDate) &&
    stamp(breakRisk.end || breakRisk.start) >= stamp(asOfDate) &&
    truth.breakState?.mapped
  );
  const runwayBreakInsideSelectedEpisode = Boolean(
    breakRisk && runway.firstBreakDate &&
    stamp(runway.firstBreakDate) >= stamp(breakRisk.start) &&
    stamp(runway.firstBreakDate) <= stamp(breakRisk.end || breakRisk.start)
  );
  const qualifiedBreakRisk = breakRisk ? {
    ...breakRisk,
    qualificationDate: breakEpisodeActiveNow
      ? asOfDate
      : runwayBreakInsideSelectedEpisode
        ? runway.firstBreakDate
        : breakRisk.peak || breakRisk.start,
    qualificationStatus: breakEpisodeActiveNow ? "ACTIVE_AS_OF" : "QUALIFIES_ON",
    episodeStart: breakRisk.start,
    episodeEnd: breakRisk.end
  } : null;
  const currentBreakActive = breakEpisodeActiveNow;
  const separateFutureRunwayBreak = Boolean(
    runway.firstBreakDate &&
    (!currentBreakActive || !runwayBreakInsideSelectedEpisode)
  );
  const firstRunwayExpansionDate = runway.episodes?.[0]?.start || null;
  const runwayStartDate = currentBreakActive ? firstRunwayExpansionDate : asOfDate;
  const currentBreakStartsRunwayScan = Boolean(runway.firstBreakDate && stamp(runway.firstBreakDate) <= stamp(asOfDate));
  const confidence = behaviour.confidence;
  const direction = behaviour.direction === "EXPANSION_BIASED" ? "EXPANSION BIAS" : "PRESSURE BIAS";
  const nearest = nextTransition(interpretationEvents, asOfDate);

  const legacyState = stateLabel(behaviour.state);
  const state = temporalStateLabel(temporalAssessment.current, legacyState);
  const methodologyStory = temporalAssessment.current?.story || `${legacyState}. ${direction}.`;
  const story = `${methodologyStory} Expansion ${truth.expansionScore}/100, pressure ${truth.pressureScore}/100, current leadership ${truth.tacticalLeadership}/100. ${nearest ? `Next mapped stage: ${nearest.label}, ${nearest.start}${nearest.end && nearest.end !== nearest.start ? `–${nearest.end}` : ""}.` : "No separate forward stage is mapped."}`;
  const currentStageEvent = temporalAssessment.current ? {
    ...current,
    id: `CURRENT_STAGE:${asOfDate}`,
    eventType: temporalAssessment.current.pressureStage !== "NO_STRUCTURAL_PRESSURE_SEQUENCE"
      ? temporalAssessment.current.pressureStage
      : temporalAssessment.current.expansionStage,
    label: state,
    expectedExpression: methodologyStory
  } : current;

  const breakLedger = truth.breakState || {};
  const supportContacts = (inputs.catalystScan?.best?.supportiveNatalContacts || [])
    .concat(breakLedger.aspectLedger?.durableSupportContacts || [])
    .map(contact => typeof contact === "string" ? contact : compactContact(contact));
  const pressureContacts = (inputs.catalystScan?.best?.pressuringNatalContacts || [])
    .concat(breakLedger.aspectLedger?.destructiveContacts || [])
    .map(contact => typeof contact === "string" ? contact : compactContact(contact));
  const volatileContacts = (inputs.catalystScan?.best?.volatileNatalContacts || [])
    .concat(breakLedger.aspectLedger?.acuteTriggerContacts || [])
    .map(contact => typeof contact === "string" ? contact : compactContact(contact));

  return {
    version: "37.9.14-full-macro-transit-windows-lock-candidate",
    doctrine: "Swiss Ephemeris → map support and pressure separately → identify which is stronger → date each change",
    asOfDate,
    current: {
      state,
      legacyState,
      direction,
      expansionStage: temporalAssessment.current?.expansionStage || null,
      pressureStage: temporalAssessment.current?.pressureStage || null,
      recoveryStage: temporalAssessment.current?.recoveryStage || null,
      durability: title(behaviour.durability),
      velocity: title(behaviour.velocity),
      pressureClass: truth.currentPressureClass,
      pressureType: title(truth.pressureType),
      correctionMode: title(truth.correctionMode),
      story
    },
    scores: {
      expansion: truth.expansionScore,
      pressure: truth.pressureScore,
      currentLeadership: truth.tacticalLeadership,
      forwardLeadership: truth.strategicLeadership,
      cycleRunway: finite(runway.score, truth.cyclePotential),
      confidence,
      natalReliability: truth.natalReliability,
      receptorFit: truth.receptorFit?.score ?? null
    },
    windows: {
      rerating: rerating ? {
        ...rerating,
        level: runwayLevel(finite(runway.score, truth.cyclePotential)),
        reason: currentBreakActive
          ? `Qualified Break-Risk pressure is active inside the full ${breakRisk.start}–${breakRisk.end} episode; ${runway.episodes?.length === 1 ? "1 intact runway expansion phase is" : `${runway.episodes?.length ?? 0} intact runway expansion phases are`} mapped after the current episode${separateFutureRunwayBreak ? ` before a separate future Break-Risk on ${runway.firstBreakDate}` : ""}${runway.postResetEpisodes?.length ? `; ${runway.postResetEpisodes.length} post-pressure re-formation phase${runway.postResetEpisodes.length === 1 ? "" : "s"}` : ""}; runway ${finite(runway.score, truth.cyclePotential)}/100; leadership ${rerating.leadership ?? truth.strategicLeadership}/100.`
          : runway.firstBreakDate
          ? `${runway.episodes?.length ?? 0} intact expansion phase${runway.episodes?.length === 1 ? "" : "s"} before long-cycle Break-Risk on ${runway.firstBreakDate}${runway.postResetEpisodes?.length ? `; ${runway.postResetEpisodes.length} post-pressure rebuild phase${runway.postResetEpisodes.length === 1 ? "" : "s"}` : ""}; runway ${finite(runway.score, truth.cyclePotential)}/100; leadership ${rerating.leadership ?? truth.strategicLeadership}/100.`
          : `${runway.episodes?.length ?? 0} separate future expansion phase${runway.episodes?.length === 1 ? "" : "s"}; runway ${finite(runway.score, truth.cyclePotential)}/100; leadership ${rerating.leadership ?? truth.strategicLeadership}/100.`
      } : null,
      pressure,
      pressureWarning,
      breakRisk: qualifiedBreakRisk,
      formation,
      continuation,
      exhaustion,
      recovery,
      nextEvent: nearest
    },
    paths: {
      tactical: pathBetween(interpretationEvents, asOfDate, 1, 60, currentStageEvent),
      strategic: pathBetween(interpretationEvents, asOfDate, 61, 548),
      longCycle: pathBetween(interpretationEvents, asOfDate, 549, 1080),
      all: interpretationEvents,
      rawAstroLedger: events
    },
    cycle: {
      level: runway.label || runwayLevel(finite(runway.score, truth.cyclePotential)),
      score: finite(runway.score, truth.cyclePotential),
      episodes: runway.episodes || [],
      postResetEpisodes: runway.postResetEpisodes || [],
      firstBreakRiskDate: runway.firstBreakDate || null,
      horizonMonths: runway.horizonMonths || 24,
      scanStartDate: asOfDate,
      scanEndDate: dateAt(asOfDate, runway.horizonMonths === 24 ? 730 : Math.round((runway.horizonMonths || 24) * 30.4375)),
      runwayStartDate,
      runwayEndDate: runway.firstBreakDate || dateAt(asOfDate, runway.horizonMonths === 24 ? 730 : Math.round((runway.horizonMonths || 24) * 30.4375)),
      runwayEndReason: currentBreakStartsRunwayScan ? "CURRENT_BREAK_RISK" : runway.firstBreakDate ? "FIRST_BREAK_RISK" : "SCAN_LIMIT",
      runwayStartsAfterCurrentPressure: currentBreakActive && Boolean(firstRunwayExpansionDate),
      runwayBeginsUnderCurrentBreakRisk: currentBreakActive,
      separateFutureBreakRiskDate: separateFutureRunwayBreak ? runway.firstBreakDate : null,
      activationPlanets: runway.activationPlanets || [],
      components: runway.components || {},
      explanation: runway.explanation || "Forward cycle scan available."
    },
    natal: {
      chartAuthority: chartAuthority(inputs.company, truth),
      confidenceLabel: truth.natalConfidenceLabel,
      reliability: truth.natalReliability,
      sourceVerification: truth.natalSovereignty?.sourceVerification || "unverified",
      anchorValidation: truth.natalSovereignty?.anchorValidation || "untested",
      timePrecision: truth.natalSovereignty?.timePrecision || "unknown",
      anchorPolicy: truth.natalSovereignty?.anchorPolicy || "SINGLE_ANCHOR",
      primaryChartId: truth.natalSovereignty?.primaryChartId || null,
      secondaryChartId: truth.natalSovereignty?.secondaryChartId || null,
      chartRolePolicy: inputs.company?.chartRolePolicy || null,
      roleCharts: temporalAssessment.roleReadings || [],
      chartFingerprint: inputs.company?.chartFingerprint || null,
      chartFingerprintCollision: Boolean(inputs.company?.chartFingerprintCollision),
      chartFingerprintPeers: inputs.company?.chartFingerprintPeers || [],
      confirmationState: behaviour.anchorConfirmationState
    },
    interpretation: temporalAssessment,
    research: {
      environmentSignature: truth.evidence?.environmentSignature || null,
      clusters: truth.evidence?.clusters || [],
      contacts: (truth.evidence?.contacts || []).map(compactContact),
      supportiveContacts: [...new Set(supportContacts)],
      pressuringContacts: [...new Set(pressureContacts)],
      volatileContacts: [...new Set(volatileContacts)],
      breakQualification: {
        mapped: Boolean(breakLedger.mapped),
        basis: breakLedger.qualificationBasis || "DESTRUCTIVE_ASTROLOGY",
        label: breakLedger.label || "NO BREAK-RISK MAPPED",
        destructiveNetwork: Boolean(breakLedger.aspectLedger?.destructiveBreakLoad),
        scoreCorroborated: Boolean(breakLedger.scoreCorroborated),
        dualAnchorRequired: Boolean(breakLedger.dualAnchorRequired),
        dualAnchorConfirmed: breakLedger.dualAnchorConfirmed !== false,
        evidence: breakLedger.evidence || [],
        futureSupportDate: breakLedger.firstSurvivalDate || null,
        futureExpansionRecoveryDate: breakLedger.firstCredibleRecoveryDate || null,
        timingRule: "Future support timing is descriptive; elapsed time never creates Break-Risk."
      },
      receptor: compactReceptor(inputs.transitReceptorFit),
      macro: truth.macroEnvironment,
      shadowAssessment,
      temporalSovereignty: temporalAssessment,
      legacyWindowReference: {
        rerating: legacyRerating,
        pressure: legacyPressure
      }
    },
    invariants: {
      containsTradingInstruction: false,
      containsPositionSizing: false,
      containsPriceInput: false,
      futureCannotRewritePresent: true,
      breakRequiresDestructiveAstroNetwork: true,
      elapsedTimeCannotCreateBreak: true,
      separateExpansionAndPressureLedgers: true,
      chartRoleScoresNeverBlended: true,
      earlyVulnerabilityCannotStartActivePressure: true,
      fallSizeCannotCreateBreak: true
    }
  };
}

export default buildPureAstroModel;
