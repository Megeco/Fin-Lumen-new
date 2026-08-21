import { assessBreakEpisodeV35, buildAstroTruthV35 } from "../v35/astroTruth.js";

const stamp = value => value ? new Date(`${value}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;
const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dayMs = 24 * 60 * 60 * 1000;

function daysBetween(from, to) {
  if (!from || !to) return null;
  return Math.round((stamp(to) - stamp(from)) / dayMs);
}

function observation(item = {}) {
  const expansion = finite(item.expansionScore, 50);
  const pressure = finite(item.pressureScore, 50);
  const leadership = finite(item.leadershipProbability, 50);
  const supportive = expansion >= 65 && leadership >= 65 && pressure < 78 && expansion >= pressure - 8;
  const conviction = expansion >= 70 && leadership >= 68 && pressure < 68;
  const contestedSupport = expansion >= 62 && pressure >= 58 && pressure < 82 && expansion >= pressure - 8;
  const breakLike = pressure >= 78 && pressure >= expansion + 8 && leadership < 50;
  const quality = Math.max(0, Math.min(100,
    ((expansion + leadership) / 2) + Math.max(0, expansion - pressure) * 0.15 - Math.max(0, pressure - 68) * 0.2
  ));
  return { item, date: item.date, expansion, pressure, leadership, supportive, conviction, contestedSupport, breakLike, quality };
}

function groupEpisodes(items, predicate, maximumGapDays = 45) {
  const episodes = [];
  for (const item of items.filter(predicate)) {
    const previous = episodes.at(-1);
    if (!previous || daysBetween(previous.end, item.date) > maximumGapDays) {
      episodes.push({ start: item.date, end: item.date, observations: [item] });
    } else {
      previous.end = item.date;
      previous.observations.push(item);
    }
  }
  return episodes.map(episode => ({
    start: episode.start,
    end: episode.end,
    observations: episode.observations.length,
    peakExpansion: Math.max(...episode.observations.map(item => item.expansion)),
    peakLeadership: Math.max(...episode.observations.map(item => item.leadership)),
    averageQuality: Math.round(episode.observations.reduce((sum, item) => sum + item.quality, 0) / episode.observations.length)
  }));
}

function positiveSlowActivationBreadth(items) {
  const planets = new Set();
  let contacts = 0;
  for (const row of items.filter(item => item.supportive || item.contestedSupport)) {
    for (const contact of row.item?.transitDetails || []) {
      const planet = String(contact?.planet || "").toLowerCase();
      if (!["jupiter", "saturn", "rahu", "ketu", "eclipse"].includes(planet) || finite(contact?.score) <= 0) continue;
      planets.add(planet);
      contacts += 1;
    }
  }
  return {
    planets: [...planets],
    contactCount: contacts,
    score: Math.min(100, planets.size * 18 + Math.min(28, contacts * 2))
  };
}

function runwayLabel(score) {
  if (score >= 85) return "EXTREME";
  if (score >= 72) return "HIGH";
  if (score >= 55) return "MODERATE";
  if (score > 0) return "LOW";
  return "UNASSESSED";
}

/**
 * Long-cycle structure, not a best-month score.
 *
 * The 24-month decision horizon measures distinct expansion episodes,
 * productive-capital continuity, survival through medium pressure and breadth
 * of slow-planet/nodal activation. A later pressure episode can end or pause a
 * runway, but it cannot erase expansion that occurs before it.
 */
export function analyzeCycleRunwayV36(resonance = {}, windows = {}, anchorConfirmation = null) {
  const all = (Array.isArray(windows?.fullScan) ? windows.fullScan : [])
    .filter(item => item?.date)
    .sort((a, b) => stamp(a.date) - stamp(b.date));
  if (!all.length) {
    return {
      score: 0,
      label: "UNASSESSED",
      horizonMonths: 24,
      episodes: [],
      firstBreakDate: null,
      components: {},
      explanation: "No forward Swiss-Ephemeris scan is available."
    };
  }

  const start = all[0].date;
  const horizon = all.filter(item => daysBetween(start, item.date) <= 730).map(observation);
  const rawBreakEpisodes = groupEpisodes(horizon, item => item.breakLike);
  const dualConfirmationRequired = anchorConfirmation?.policy?.breakRequiresDualConfirmation === true;
  const breakAssessments = rawBreakEpisodes.map(episode => {
    const episodeObservations = horizon.filter(item => item.date >= episode.start && item.date <= episode.end);
    const peak = episodeObservations.slice().sort((a, b) =>
      (b.pressure - b.expansion) - (a.pressure - a.expansion) || b.pressure - a.pressure
    )[0];
    const candidate = peak?.item
      ? {
          ...peak.item,
          date: peak.date,
          episodeStart: episode.start,
          episodeEnd: episode.end,
          eventRootId: `PRESSURE:${episode.start}:${episode.end}`
        }
      : {};
    return assessBreakEpisodeV35({
      candidate,
      windows,
      company: anchorConfirmation ? { anchorConfirmation } : {}
    });
  });
  const breakEpisodes = rawBreakEpisodes.filter((episode, index) => breakAssessments[index]?.mapped);
  const firstBreakDate = breakEpisodes[0]?.start || null;
  const measuredRunway = firstBreakDate ? horizon.filter(item => stamp(item.date) < stamp(firstBreakDate)) : horizon;
  const postReset = firstBreakDate ? horizon.filter(item => stamp(item.date) > stamp(breakEpisodes[0].end)) : [];
  const episodes = groupEpisodes(measuredRunway, item => item.supportive);
  const postResetEpisodes = groupEpisodes(postReset, item => item.supportive);
  const supportive = measuredRunway.filter(item => item.supportive);
  const topQuality = supportive.map(item => item.quality).sort((a, b) => b - a).slice(0, 5);
  const quality = topQuality.length ? topQuality.reduce((sum, value) => sum + value, 0) / topQuality.length : 0;

  const repetitionScale = [0, 50, 76, 100];
  const repetition = episodes.length >= 3 ? 100 : repetitionScale[episodes.length];
  const firstSupportDays = supportive.length ? daysBetween(start, supportive[0].date) : null;
  const immediacy = firstSupportDays === null ? 0 : firstSupportDays <= 30 ? 100 : firstSupportDays <= 90 ? 82 : firstSupportDays <= 180 ? 58 : firstSupportDays <= 365 ? 32 : 12;
  const productiveDensity = Math.min(100, supportive.length / 6 * 100);
  const episodeGaps = episodes.slice(1).map((episode, index) => daysBetween(episodes[index].end, episode.start));
  const longestGap = episodeGaps.length ? Math.max(...episodeGaps) : null;
  const gapScore = longestGap === null ? (episodes.length ? 70 : 0) : longestGap <= 60 ? 100 : longestGap <= 120 ? 78 : longestGap <= 180 ? 52 : 25;
  const activationEfficiency = immediacy * 0.45 + productiveDensity * 0.35 + gapScore * 0.20;

  const pressureObservations = measuredRunway.filter(item => item.pressure >= 68);
  const survivingPressure = pressureObservations.filter(item => item.contestedSupport && !item.breakLike);
  const survivalRatio = pressureObservations.length ? survivingPressure.length / pressureObservations.length : null;
  const pressureSurvival = pressureObservations.length === 0 ? 76 : 48 + (survivalRatio * 47);
  const activation = positiveSlowActivationBreadth(measuredRunway);
  const current = observation({ ...resonance, date: start });
  const currentCycleFit = current.supportive ? current.quality : current.contestedSupport ? Math.max(45, current.quality - 10) : Math.max(20, current.quality - 25);
  const breakPenalty = Math.min(24, breakEpisodes.length * 10 + (breakEpisodes[0] && daysBetween(start, breakEpisodes[0].start) <= 180 ? 8 : 0));
  const topLeadership = supportive.map(item => item.leadership).sort((a, b) => b - a).slice(0, 5);
  const averageLeadership = topLeadership.length ? topLeadership.reduce((sum, value) => sum + value, 0) / topLeadership.length : 0;
  const durability = Math.min(100, averageLeadership * 1.25);

  const rawScore = quality * 0.22 + repetition * 0.18 + activationEfficiency * 0.14 + pressureSurvival * 0.12 + activation.score * 0.10 + currentCycleFit * 0.08 + durability * 0.16 - breakPenalty;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));
  let label = score > 0 ? runwayLabel(score) : "LOW";
  const peakLeadership = topLeadership.length ? topLeadership[0] : 0;
  // HIGH/EXTREME are durability statements, not merely dense-event labels.
  if (label === "EXTREME" && (episodes.length < 3 || peakLeadership < 72)) label = peakLeadership >= 70 ? "HIGH" : "MODERATE";
  if (label === "HIGH" && peakLeadership < 70) label = "MODERATE";

  return {
    score,
    label,
    horizonMonths: 24,
    idealThreshold: 75,
    exceptionalThreshold: 85,
    episodes,
    postResetEpisodes,
    productiveObservations: supportive.length,
    pressureEpisodes: groupEpisodes(measuredRunway, item => item.pressure >= 68).length,
    rawBreakCandidates: rawBreakEpisodes.length,
    dualAnchorRejectedBreakCandidates: breakAssessments.filter(assessment =>
      assessment.rawBreakCandidate && assessment.dualAnchorRequired && !assessment.dualAnchorConfirmed
    ).length,
    firstBreakDate,
    activationPlanets: activation.planets,
    components: {
      expansionQuality: Math.round(quality),
      repeatedExpansion: Math.round(repetition),
      activationEfficiency: Math.round(activationEfficiency),
      pressureSurvival: Math.round(pressureSurvival),
      activationBreadth: Math.round(activation.score),
      currentCycleFit: Math.round(currentCycleFit),
      leadershipDurability: Math.round(durability),
      breakPenalty
    },
    explanation: `${episodes.length} distinct productive expansion episode${episodes.length === 1 ? "" : "s"} in the measured runway; ${supportive.length} productive scan points; ${activation.planets.length} slow/nodal activation families; ${firstBreakDate ? `first Break-Risk episode ${firstBreakDate}, qualified by a destructive structural contact network${dualConfirmationRequired ? " and verified dual-anchor agreement" : ""}, with ${postResetEpisodes.length} later episode${postResetEpisodes.length === 1 ? "" : "s"} reported separately` : `${rawBreakEpisodes.length ? `${rawBreakEpisodes.length} severe pressure candidate${rawBreakEpisodes.length === 1 ? "" : "s"} remained High because the destructive astrology and/or required dual-anchor agreement was incomplete; ` : ""}no Break-Risk episode inside the measured runway`}. Future support timing is descriptive and never creates Break by elapsed time.`
  };
}

export function scoreCycleRunwayV36(resonance = {}, windows = {}) {
  return analyzeCycleRunwayV36(resonance, windows).score;
}

function eventFromWindow(window, eventType, horizon) {
  if (!window?.date) return null;
  const start = window.shadow?.preShadowStart || window.date;
  const end = window.shadow?.postShadowEnd || window.date;
  const isPressure = /PRESSURE/.test(eventType);
  const stableEpisodeId = isPressure ? `PRESSURE:${start}:${end}` : (window.shadow?.eventRootId || `${eventType}:${start}:${end}`);
  return {
    id: `${eventType}:${stableEpisodeId}`,
    stableEpisodeId,
    eventRootId: window.shadow?.eventRootId || null,
    eventType,
    horizon,
    peakDate: window.date,
    start,
    end,
    durationDays: daysBetween(start, end) + 1,
    expansionScore: window.expansionScore,
    pressureScore: window.pressureScore,
    leadership: window.leadership,
    pressureClass: window.pressureClass || null,
    signalClass: window.signalClass || null,
    breakQualification: window.breakQualification || null,
    macroBehaviour: window.macroBehaviour || null,
    supportiveNatalContacts: window.supportiveNatalContacts || [],
    pressuringNatalContacts: window.pressuringNatalContacts || [],
    volatileNatalContacts: window.volatileNatalContacts || [],
    transitDetails: window.transitDetails || [],
    finAstroGrammar: window.finAstroGrammar || null,
    episodeContext: window.episodeContext || null,
    netExpectedExpression: window.netExpectedExpression || null,
    expectedBehaviour: window.expectedBehaviour || null,
    label: window.label || null,
    sourceRole: window.role
  };
}

function confirmatoryPressureEvent(window = {}) {
  const comparison = window.comparison || {};
  const primary = comparison.primary || {};
  const secondary = comparison.secondary || {};
  const event = eventFromWindow(window, "CONFIRMATORY_PRESSURE", "STRATEGIC");
  if (!event) return null;
  return {
    ...event,
    expansionScore: primary.expansion,
    pressureScore: primary.pressure,
    leadership: primary.leadership,
    pressureClass: "HIGH",
    signalClass: "CONFIRMATORY_STRUCTURAL_PRESSURE",
    sourceRole: "SECONDARY_STRUCTURAL_CONFIRMATION",
    anchorConfirmationRole: "SECONDARY_HIGH_PRESSURE_NO_FRESH",
    primarySnapshot: primary,
    secondarySnapshot: secondary,
    secondaryPressureScore: secondary.pressure,
    secondaryExpansionScore: secondary.expansion,
    secondaryLeadership: secondary.leadership,
    destructiveAgreement: comparison.destructiveAgreement === true,
    label: "Confirmatory High Pressure"
  };
}

/** Shared astrological facts. No capital action is permitted in this layer. */
export function buildAstroTruthV36(inputs) {
  const cycleRunway = inputs?.cyclePotentialDetails || analyzeCycleRunwayV36(inputs?.replay, inputs?.windows);
  const base = buildAstroTruthV35({ ...inputs, cyclePotentialScore: cycleRunway.score });
  const natalConfidenceLabel = String(inputs?.company?.confidence || inputs?.company?.natal_confidence || "UNKNOWN").toUpperCase();
  const explicitAuthority = String(
    inputs?.company?.capitalAuthorityCeiling ||
    inputs?.company?.capital_authority_ceiling ||
    ""
  ).toUpperCase();
  // Natal sovereignty is explicit when the canonical registry supplies it.
  // Legacy confidence is retained only for synthetic tests and old user rows.
  const lowSourceConfidence = /LOW/.test(natalConfidenceLabel);
  const chartAuthority = explicitAuthority === "RESEARCH_ONLY"
    ? "RESEARCH_ONLY"
    : explicitAuthority === "PART_BUILD_MAX"
      ? "PROVISIONAL"
      : explicitAuthority === "FULL_BUILD_ELIGIBLE"
        ? "VERIFIED"
    : /NONE|UNVERIFIED|UNKNOWN|RESEARCH|CANDIDATE|INCONCLUSIVE/.test(natalConfidenceLabel)
      ? "RESEARCH_ONLY"
      : lowSourceConfidence
        ? "PROVISIONAL"
        : "VERIFIED";
  const w = base.windows || {};
  const tacticalPressureDuration = w.pressureWindow?.shadow
    ? daysBetween(w.pressureWindow.shadow.preShadowStart, w.pressureWindow.shadow.postShadowEnd) + 1
    : 0;
  const tacticalPressureIsStructural = tacticalPressureDuration > 90;
  const tacticalPressureEventType = w.pressureWindow?.pressureClass === "BREAK"
    ? "BREAK_PRESSURE"
    : tacticalPressureIsStructural ? "STRUCTURAL_PRESSURE" : "TACTICAL_PRESSURE";
  const tacticalPressureHorizon = tacticalPressureIsStructural ? "STRATEGIC" : "TACTICAL";
  const primaryLedger = [
    eventFromWindow(w.catalystWindow, "TACTICAL_CATALYST", "TACTICAL"),
    eventFromWindow(w.pressureWindow, tacticalPressureEventType, tacticalPressureHorizon),
    eventFromWindow(w.strategicPressureWindow, base.strategicSequence?.constructivePressure ? "ACCUMULATION_PRESSURE" : (w.strategicPressureWindow?.pressureClass === "BREAK" ? "BREAK_PRESSURE" : "STRUCTURAL_PRESSURE"), "STRATEGIC"),
    eventFromWindow(w.reentryWindow, "STRATEGIC_ACCUMULATION", "STRATEGIC"),
    eventFromWindow(w.strategicBuildWindow, "STRATEGIC_EXPANSION", "STRATEGIC"),
    eventFromWindow(w.fullBuildWindow, "LEADERSHIP_EXPANSION", "STRATEGIC"),
    eventFromWindow(w.longCycleWindow, "LONG_CYCLE_LEADERSHIP", "LONG_CYCLE")
  ].filter(Boolean);
  const confirmatoryPressure = (inputs?.company?.anchorConfirmation?.secondaryPressureWindows || [])
    .map(confirmatoryPressureEvent)
    .filter(Boolean);
  const rawLedger = [...primaryLedger];
  for (const warning of confirmatoryPressure) {
    const nativePressure = rawLedger.find(event =>
      ["TACTICAL_PRESSURE", "STRUCTURAL_PRESSURE", "BREAK_PRESSURE"].includes(event.eventType) &&
      event.peakDate === warning.peakDate
    );
    if (nativePressure) {
      nativePressure.pressureClass = "HIGH";
      nativePressure.anchorConfirmationRole = warning.anchorConfirmationRole;
      nativePressure.confirmatoryPressure = true;
      nativePressure.secondaryPressureScore = warning.secondaryPressureScore;
      nativePressure.secondaryExpansionScore = warning.secondaryExpansionScore;
      nativePressure.secondaryLeadership = warning.secondaryLeadership;
      nativePressure.secondarySnapshot = warning.secondarySnapshot;
      nativePressure.destructiveAgreement = warning.destructiveAgreement;
      nativePressure.label = nativePressure.label || warning.label;
    } else {
      rawLedger.push(warning);
    }
  }
  const priority = { BREAK_PRESSURE: 9, CONFIRMATORY_PRESSURE: 8, ACCUMULATION_PRESSURE: 7, STRUCTURAL_PRESSURE: 6, LEADERSHIP_EXPANSION: 5, STRATEGIC_EXPANSION: 4, STRATEGIC_ACCUMULATION: 3, TACTICAL_PRESSURE: 2, TACTICAL_CATALYST: 1, LONG_CYCLE_LEADERSHIP: 0 };
  const ledger = rawLedger
    .filter((event, index, all) => all.findIndex(other =>
      other.stableEpisodeId === event.stableEpisodeId &&
      (priority[other.eventType] || 0) > (priority[event.eventType] || 0)
    ) === -1)
    .filter((event, index, all) => all.findIndex(other => other.stableEpisodeId === event.stableEpisodeId && other.eventType === event.eventType) === index)
    .filter((event, index, all) => all.findIndex(other => other.eventType === event.eventType && other.peakDate === event.peakDate) === index)
    .sort((a, b) => stamp(a.start) - stamp(b.start) || stamp(a.peakDate) - stamp(b.peakDate));

  return {
    ...base,
    schemaVersion: "37.3.0",
    layer: "SHARED_ASTRO_TRUTH",
    cycleRunway,
    natalConfidenceLabel,
    chartAuthority,
    natalSovereignty: {
      sourceVerification: inputs?.company?.sourceVerification || inputs?.company?.source_verification || "unverified",
      anchorValidation: inputs?.company?.anchorValidation || inputs?.company?.anchor_validation || "untested",
      timePrecision: inputs?.company?.timePrecision || inputs?.company?.time_precision || "event-time-assumed",
      chartAuthority,
      auditStatus: inputs?.company?.auditStatus || inputs?.company?.audit_status || "unresolved",
      anchorPolicy: inputs?.company?.chartRolePolicy?.mode || inputs?.company?.anchorConfirmation?.mode || inputs?.company?.dualChartPolicy?.mode || "SINGLE_ANCHOR",
      primaryChartId: inputs?.company?.anchorConfirmation?.primaryChart?.id || inputs?.company?.selectedChartId || inputs?.company?.preferredChartId || null,
      secondaryChartId: inputs?.company?.anchorConfirmation?.secondaryChart?.id || inputs?.company?.secondaryChartId || inputs?.company?.chartRolePolicy?.roles?.find(role => role.chartId !== (inputs?.company?.selectedChartId || inputs?.company?.preferredChartId))?.chartId || null,
      chartRoles: inputs?.company?.chartRolePolicy?.roles || [],
      scoresBlended: false
    },
    eventLedger: ledger,
    invariants: {
      ...base.invariants,
      oneSharedAstrologyLayer: true,
      ledgerChronologicallyOrdered: true,
      containsCapitalLanguage: false,
      explicitNatalAuthorityIsSovereign: true,
      primaryChartOwnsDirectionTimingAndScores: true,
      secondaryChartChangesConfidenceNotDirection: true,
      stablePressureEpisodeIdentityIsSovereign: true,
      longPressureEpisodesAreStructuralNotTactical: true,
      dualAnchorScoresAreNeverBlended: true,
      secondaryChartMayCreateOnlySeverePressureGate: true,
      confirmatoryPressureNeverCreatesOpportunity: true,
      breakRequiresDestructiveAstroNetwork: true,
      recoveryTimingCannotCreateBreak: true,
      roleBasedChartsAreNeverAveraged: true
    }
  };
}
