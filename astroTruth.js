const n = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const dateOf = item => item?.date || item?.dateOnly || item?.windowDate || null;
const dayMs = 24 * 60 * 60 * 1000;
const BREAK_ASSESSMENT_HORIZON_DAYS = 240;
const SURVIVAL_MAX_PRESSURE = 67;
const SURVIVAL_MIN_EXPANSION = 60;
const SURVIVAL_MIN_LEADERSHIP = 50;

function shiftDate(date, days) {
  if (!date) return null;
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function insideStrategicHorizon(item, replayDate) {
  const date = dateOf(item);
  if (!date || !replayDate) return false;
  const days = (new Date(`${date}T00:00:00Z`).getTime() - new Date(`${replayDate}T00:00:00Z`).getTime()) / dayMs;
  return days >= 0 && days <= 548; // 18 months, with a small calendar-month allowance.
}

function daysFrom(replayDate, item) {
  const date = dateOf(item);
  if (!date || !replayDate) return null;
  return Math.round((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${replayDate}T00:00:00Z`).getTime()) / dayMs);
}

function strategicWindowPosture(replayDate, candidate, tacticalLeadership) {
  const days = daysFrom(replayDate, candidate);
  if (days === null || days <= 30) return { phase: "ACTIVE", daysToWindow: Math.max(0, days || 0) };
  if (days <= 120) return { phase: "NEAR", daysToWindow: days };
  if (days <= 548) return { phase: "FORWARD", daysToWindow: days };
  return { phase: "LONG_CYCLE", daysToWindow: days };
}

function pressureClass(item = {}, forceBreak = false) {
  const pressure = n(item?.pressureScore, 50);
  // A single severe score is HIGH pressure, not Break. BREAK requires the
  // destructive structural aspect network assessed below.
  if (forceBreak) return "BREAK";
  if (pressure >= 68) return "HIGH";
  if (pressure >= 58) return "MEDIUM";
  return "LOW";
}

function shadowFor(item = {}, kind = "OPPORTUNITY", forceBreak = false) {
  const date = dateOf(item);
  if (!date) return null;
  const severity = pressureClass(item, forceBreak);
  const pressureDays = {
    LOW: { pre: 7, post: 7 },
    MEDIUM: { pre: 14, post: 10 },
    HIGH: { pre: 21, post: 14 },
    BREAK: { pre: 30, post: 21 }
  }[severity];
  const span = kind === "PRESSURE" ? pressureDays : { pre: 14, post: 14 };
  const episodeStart = item?.episodeStart || null;
  const episodeEnd = item?.episodeEnd || null;
  const preShadowStart = episodeStart || shiftDate(date, -span.pre);
  const postShadowEnd = episodeEnd || shiftDate(date, span.post);
  return {
    peakDate: date,
    preShadowStart,
    postShadowEnd,
    preShadowDays: Math.max(0, Math.round((new Date(`${date}T00:00:00Z`) - new Date(`${preShadowStart}T00:00:00Z`)) / dayMs)),
    postShadowDays: Math.max(0, Math.round((new Date(`${postShadowEnd}T00:00:00Z`) - new Date(`${date}T00:00:00Z`)) / dayMs)),
    eventRootId: item?.eventRootId || null,
    boundarySource: episodeStart || episodeEnd ? "STABLE_SWISS_SCORE_EPISODE" : "DEFAULT_EVENT_SHADOW"
  };
}

export function scoreCycleRunwayV35(resonance = {}, windows = {}) {
  const scans = Array.isArray(windows?.fullScan) ? windows.fullScan : [];
  const forward = scans.filter((_, index) => index >= 6);
  const productive = forward.filter(item => n(item?.expansionScore) >= 65 && n(item?.leadershipProbability) >= 65 && n(item?.pressureScore) < 75);
  const strong = productive.filter(item => n(item?.expansionScore) >= 70 && n(item?.leadershipProbability) >= 70 && n(item?.pressureScore) < 68);
  const breakWindows = forward.filter(item => n(item?.pressureScore) >= 78 && n(item?.pressureScore) >= n(item?.expansionScore) + 8);
  const topLeadership = productive.map(item => n(item?.leadershipProbability)).sort((a, b) => b - a).slice(0, 5);
  const durableLeadership = topLeadership.length ? topLeadership.reduce((sum, value) => sum + value, 0) / topLeadership.length : 0;
  const repetition = Math.min(24, strong.length * 4);
  const runway = Math.min(10, productive.length);
  const breakPenalty = Math.min(30, breakWindows.length * 5);
  const rareDurabilityLift = strong.length >= 8 && breakWindows.length === 0 && durableLeadership >= 85 ? 5 : 0;
  const score = Math.round(durableLeadership * 0.45 + repetition + runway + n(resonance?.leadershipProbability) * 0.08 + rareDurabilityLift - breakPenalty);
  return Math.max(0, Math.min(100, score));
}

function natalReliability(company = {}, receptor = {}) {
  const raw = Math.round(n(
    receptor?.scores?.natalReliability ??
    receptor?.scores?.natalReliabilityScore ??
    company?.natalReliability ??
    company?.confidenceScore,
    50
  ));
  const confidence = String(company?.confidence || company?.natal_confidence || "").trim().toUpperCase();
  const authorityCeiling = String(company?.capitalAuthorityCeiling || company?.capital_authority_ceiling || "").toUpperCase();

  // A computed chart is not automatically a high-confidence chart. In
  // particular, an explicit NONE/LOW registry confidence must cap strategic
  // authority even when a registered date lets the ephemeris calculate exact
  // planetary positions for that date.
  if (authorityCeiling === "RESEARCH_ONLY") return Math.min(raw, 50);
  if (authorityCeiling === "PART_BUILD_MAX") return Math.min(raw, 64);
  if (/NONE|UNVERIFIED|UNKNOWN|RESEARCH|CANDIDATE|INCONCLUSIVE/.test(confidence)) return Math.min(raw, 50);
  if (/LOW/.test(confidence)) return Math.min(raw, 54);
  return raw;
}

function productiveRecovery(item = {}) {
  const expansion = n(item?.expansionScore, 0);
  const pressure = n(item?.pressureScore, 100);
  const leadership = n(item?.leadershipProbability, 0);
  return expansion >= 65 && leadership >= 62 && pressure < 68 && expansion >= pressure - 8;
}

const lower = value => String(value || "").toLowerCase();

function compactContact(contact = {}) {
  return {
    planet: contact.planet || null,
    targetPlanet: contact.targetPlanet || contact.natalPlanet || null,
    aspect: contact.aspect || null,
    orb: n(contact.orb, null),
    score: n(contact.score ?? contact.rawScore, 0)
  };
}

/**
 * Break-pressure and survival contacts are deliberately asymmetric.
 *
 * Saturn/Ketu/eclipses can supply destructive structure; Mars and Rahu are
 * triggers/amplifiers and cannot prove a six-month Break by themselves.
 * Jupiter soft/conjunct contacts and Saturn soft contacts can supply durable
 * survival. Rahu may reinforce that support, but never creates it alone.
 */
export function classifyPressureSupportAspectsV35(item = {}) {
  const contacts = Array.isArray(item?.transitDetails) ? item.transitDetails : [];
  const hard = new Set(["conjunction", "square", "opposition"]);
  const soft = new Set(["conjunction", "trine", "sextile"]);
  const structuralTargets = new Set(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn", "rahu", "ketu"]);

  const destructive = contacts.filter(contact => {
    const planet = lower(contact?.planet);
    const target = lower(contact?.targetPlanet || contact?.natalPlanet);
    const aspect = lower(contact?.aspect);
    const score = n(contact?.score ?? contact?.rawScore, 0);
    if (!structuralTargets.has(target) || score >= 0 || !hard.has(aspect)) return false;
    return planet === "saturn" || planet === "ketu" || planet === "eclipse";
  });
  const acuteTriggers = contacts.filter(contact => {
    const planet = lower(contact?.planet);
    const target = lower(contact?.targetPlanet || contact?.natalPlanet);
    const aspect = lower(contact?.aspect);
    const score = n(contact?.score ?? contact?.rawScore, 0);
    return score < 0 && hard.has(aspect) && (
      (planet === "mars" && ["sun", "moon", "mars", "saturn"].includes(target)) ||
      (planet === "rahu" && ["sun", "moon", "rahu", "ketu"].includes(target))
    );
  });
  const durableSupport = contacts.filter(contact => {
    const planet = lower(contact?.planet);
    const aspect = lower(contact?.aspect);
    const score = n(contact?.score ?? contact?.rawScore, 0);
    if (score <= 0 || !soft.has(aspect)) return false;
    if (planet === "jupiter") return true;
    return planet === "saturn" && ["trine", "sextile"].includes(aspect);
  });
  const supportAmplifiers = contacts.filter(contact => {
    const planet = lower(contact?.planet);
    const aspect = lower(contact?.aspect);
    return planet === "rahu" && n(contact?.score ?? contact?.rawScore, 0) > 0 && soft.has(aspect);
  });
  const contestedExpansion = contacts.filter(contact => {
    const planet = lower(contact?.planet);
    const aspect = lower(contact?.aspect);
    return planet === "jupiter" && ["square", "opposition"].includes(aspect);
  });
  // Break-Risk is deliberately rarer than ordinary high pressure. A broad
  // eclipse contact or the two ends of the same nodal axis cannot manufacture
  // a destructive network. Require at least two independently meaningful
  // structural contacts, with wider tolerances reserved for the luminaries and
  // the slow-cycle planets.
  const coreBreakTargets = new Set(["sun", "moon", "jupiter", "saturn"]);
  const strictBreakContacts = destructive.filter(contact => {
    const planet = lower(contact?.planet);
    const target = lower(contact?.targetPlanet || contact?.natalPlanet);
    const orb = n(contact?.orb, 99);
    if (coreBreakTargets.has(target)) return orb <= 3;
    // Venus, Mars, Mercury, and the nodal axis may corroborate a break network,
    // but only when very tight; they cannot carry a wide eclipse thesis.
    return planet !== "eclipse" && orb <= 1.5;
  });
  const dedupedStrictBreakContacts = strictBreakContacts.filter((contact, index, all) => {
    const planet = lower(contact?.planet);
    const rawTarget = lower(contact?.targetPlanet || contact?.natalPlanet);
    const target = ["rahu", "ketu"].includes(rawTarget) ? "nodal-axis" : rawTarget;
    const aspect = lower(contact?.aspect);
    return all.findIndex(other => {
      const otherPlanet = lower(other?.planet);
      const rawOtherTarget = lower(other?.targetPlanet || other?.natalPlanet);
      const otherTarget = ["rahu", "ketu"].includes(rawOtherTarget) ? "nodal-axis" : rawOtherTarget;
      return otherPlanet === planet && otherTarget === target && lower(other?.aspect) === aspect;
    }) === index;
  });
  const strictCarrierFamilies = new Set(dedupedStrictBreakContacts.map(contact => lower(contact?.planet)));
  const strictCoreTargetCount = new Set(dedupedStrictBreakContacts
    .map(contact => lower(contact?.targetPlanet || contact?.natalPlanet))
    .filter(target => coreBreakTargets.has(target))).size;
  // Several natal planets in one tight natal cluster can all be struck by the
  // same Saturn transit. That is concentrated structural pressure, but it is
  // not automatically several independent destructive carriers. Break-Risk
  // therefore needs either carrier diversity or a single slow carrier hitting
  // at least two core structural receptors inside the strict orb.
  const destructiveBreakLoad = dedupedStrictBreakContacts.length >= 2 && (
    strictCarrierFamilies.size >= 2 || strictCoreTargetCount >= 2
  );

  return {
    destructiveBreakLoad,
    destructiveContacts: destructive.map(compactContact),
    strictBreakContacts: dedupedStrictBreakContacts.map(compactContact),
    acuteTriggerContacts: acuteTriggers.map(compactContact),
    durableSupportContacts: durableSupport.map(compactContact),
    supportAmplifierContacts: supportAmplifiers.map(compactContact),
    contestedExpansionContacts: contestedExpansion.map(compactContact),
    rules: {
      marsOrRahuAloneCanProveBreak: false,
      rahuAloneCanProveDurableSupport: false,
      jupiterHardAspectIsAutomaticBreakPressure: false,
      eclipseSoftAspectIsDurableSupport: false,
      duplicateNodalAxisContactsCountOnce: true,
      wideEclipseContactsCanProveBreak: false,
      minimumIndependentStructuralContacts: 2,
      singleCarrierClusterIsAutomaticBreak: false,
      minimumStructuralCarrierFamilies: 2,
      singleCarrierCoreTargetException: 2
    }
  };
}

function survivalRecovery(item = {}) {
  const expansion = n(item?.expansionScore, 0);
  const pressure = n(item?.pressureScore, 100);
  const leadership = n(item?.leadershipProbability, 0);
  const ledger = classifyPressureSupportAspectsV35(item);
  const durableSupportOperative = ledger.durableSupportContacts.length > 0;
  const scoreRenewal = expansion >= 65 && expansion >= pressure + 8 && leadership >= 55;
  return pressure <= SURVIVAL_MAX_PRESSURE && expansion >= SURVIVAL_MIN_EXPANSION &&
    leadership >= SURVIVAL_MIN_LEADERSHIP && expansion >= pressure - 8 &&
    (durableSupportOperative || scoreRenewal);
}

function longRepairQualification(candidateDate, windows = {}) {
  const scans = (Array.isArray(windows?.fullScan) ? windows.fullScan : [])
    .filter(item => dateOf(item) && candidateDate && dateOf(item) > candidateDate)
    .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
  const assessment = scans.filter(item => daysFrom(candidateDate, item) <= BREAK_ASSESSMENT_HORIZON_DAYS);
  const survival = assessment.find(survivalRecovery) || null;
  const recovery = assessment.find(productiveRecovery) || null;
  const survivalDays = survival ? daysFrom(candidateDate, survival) : null;
  const recoveryDays = recovery ? daysFrom(candidateDate, recovery) : null;
  const coverageDays = assessment.length ? daysFrom(candidateDate, assessment.at(-1)) : 0;
  const survivalAspectLedger = survival ? classifyPressureSupportAspectsV35(survival) : null;
  return {
    assessmentHorizonDays: BREAK_ASSESSMENT_HORIZON_DAYS,
    firstSurvivalDate: survival ? dateOf(survival) : null,
    survivalDays,
    survivalAspectLedger,
    firstCredibleRecoveryDate: recovery ? dateOf(recovery) : null,
    recoveryDays,
    assessedCoverageDays: coverageDays,
    supportReturnTest: {
      maxPressure: SURVIVAL_MAX_PRESSURE,
      minExpansion: SURVIVAL_MIN_EXPANSION,
      minLeadership: SURVIVAL_MIN_LEADERSHIP,
      durableSupportOrStrongScoreRenewalRequired: true
    }
  };
}

function anchorComparisonAt(company = {}, date = null) {
  const confirmation = company?.anchorConfirmation || null;
  if (!confirmation || confirmation.mode !== "ROLE_BASED_CONFIRMATION") return null;
  return confirmation.comparisons?.[date] || (date === confirmation.current?.date ? confirmation.current : null);
}

function breakLikeScore(item = {}) {
  const pressure = n(item?.pressureScore, 0);
  const expansion = n(item?.expansionScore, 50);
  const leadership = n(item?.leadershipProbability, 50);
  return pressure >= 78 && pressure >= expansion + 8 && leadership < 50;
}

function dateInsideEpisode(date, item = {}) {
  if (!date) return false;
  const start = item?.episodeStart || dateOf(item);
  const end = item?.episodeEnd || dateOf(item);
  return Boolean(start && end && date >= start && date <= end);
}

function episodeIdentity(item = {}) {
  const start = item?.episodeStart || dateOf(item);
  const end = item?.episodeEnd || dateOf(item);
  return item?.eventRootId || (start && end ? `PRESSURE:${start}:${end}` : null);
}

export function assessBreakEpisodeV35({ candidate = {}, windows = {}, narrativeCandidate = false, narrativeEvidence = [], company = {} } = {}) {
  const candidateDate = dateOf(candidate);
  const assessmentStartDate = candidate?.episodeStart || candidateDate;
  const aspectLedger = classifyPressureSupportAspectsV35(candidate);
  const destructiveNarrative = Boolean(narrativeCandidate || aspectLedger.destructiveBreakLoad);
  const scoreCorroborated = breakLikeScore(candidate);
  const rawCandidate = destructiveNarrative && scoreCorroborated;
  const recovery = longRepairQualification(assessmentStartDate, windows);
  const policy = company?.dualChartPolicy || company?.anchorConfirmation?.policy || {};
  const dualAnchorRequired = Boolean(policy?.breakRequiresDualConfirmation && company?.anchorConfirmation);
  const anchorComparison = anchorComparisonAt(company, candidateDate);
  const dualAnchorConfirmed = !dualAnchorRequired || anchorComparison?.destructiveAgreement === true;
  // v37.3: Break-Risk is an astrological state, not a time-without-recovery
  // rule. A severe score must be corroborated by a destructive Saturn/Ketu/
  // eclipse network. When a verified secondary anchor exists, it must agree.
  // Future support/recovery remains useful context but never creates or
  // cancels the present Break-Risk classification merely because N days pass.
  const mapped = rawCandidate && dualAnchorConfirmed;
  const aspectEvidence = aspectLedger.destructiveContacts.slice(0, 5).map(contact =>
    `${contact.planet} ${contact.aspect} natal ${contact.targetPlanet} (${contact.orb}°)`
  );
  const supportEvidence = (recovery.survivalAspectLedger?.durableSupportContacts || []).slice(0, 5).map(contact =>
    `${contact.planet} ${contact.aspect} natal ${contact.targetPlanet} (${contact.orb}°)`
  );

  return {
    ...recovery,
    mapped,
    complete: mapped,
    rawBreakCandidate: rawCandidate,
    narrativeBreakCandidate: destructiveNarrative,
    scoreCorroborated,
    qualificationBasis: "DESTRUCTIVE_ASTROLOGY",
    label: mapped
      ? "BREAK-RISK PRESSURE — DESTRUCTIVE STRUCTURAL NETWORK"
      : rawCandidate && dualAnchorRequired && !dualAnchorConfirmed
        ? "HIGH PRESSURE — DESTRUCTIVE SECONDARY-ANCHOR AGREEMENT ABSENT"
        : rawCandidate
          ? "HIGH PRESSURE — DESTRUCTIVE NETWORK NOT FULLY CONFIRMED"
            : "NO BREAK-RISK MAPPED",
    evidence: [...new Set([...(Array.isArray(narrativeEvidence) ? narrativeEvidence : []), ...aspectEvidence])],
    survivalEvidence: supportEvidence,
    date: candidateDate,
    assessmentStartDate,
    episodeId: episodeIdentity(candidate),
    episodeStart: candidate?.episodeStart || candidateDate,
    episodeEnd: candidate?.episodeEnd || candidateDate,
    aspectLedger,
    dualAnchorRequired,
    dualAnchorConfirmed,
    anchorConfirmationState: anchorComparison?.state || null,
    qualified: mapped
  };
}

function breakEvidence(reading = {}, receptor = {}, windows = {}, replayDate = null, company = {}, replay = {}) {
  const assessment = reading?.breakAssessment || {};
  const label = String(assessment?.label || "").toUpperCase();
  const near = receptor?.pressureInterference?.nearFieldGate || {};
  const receptorBreak = /BREAK|RESET/.test(String(near?.severity || "").toUpperCase());
  const narrativeCandidate = Boolean(assessment?.complete || receptorBreak || /BREAK EVIDENCE PRESENT|TERMINATED/.test(label));
  const tacticalRisk = windows?.windowMap?.tacticalRisk || null;
  const strategicRisk = windows?.windowMap?.strategicRisk || null;
  const statedDate = assessment?.date || near?.date || replayDate;
  const episodeRisk = [tacticalRisk, strategicRisk].find(item =>
    breakLikeScore(item) && dateInsideEpisode(statedDate, item)
  ) || null;
  const candidate = episodeRisk
    ? episodeRisk
    : { ...replay, date: statedDate };
  return assessBreakEpisodeV35({
    candidate,
    windows,
    narrativeCandidate,
    narrativeEvidence: assessment?.evidence,
    company
  });
}

function pressureType({ pressure, expansion, dormancy, breakState, receptor }) {
  if (breakState.mapped) return "BREAK_RESET";
  if (/DORMANT|RANGE|CAPITAL INEFFICIENT/.test(String(dormancy?.type || "").toUpperCase())) return "DORMANCY";
  const grammarKind = String(receptor?.finAstroGrammar?.pressure?.pressureKind || receptor?.pressureKind || "").toLowerCase();
  if (/volatile|churn|contested/.test(grammarKind) || (pressure >= 58 && expansion >= pressure - 8)) return "VOLATILE_DIGESTION";
  if (pressure >= 68) return "STRUCTURAL_DISCIPLINE";
  if (pressure >= 48) return "NOISE";
  return "LOW";
}

function windowSignal(item, role, forceBreak = false) {
  const expansion = n(item?.expansionScore, 50);
  const pressure = n(item?.pressureScore, 50);
  const leadership = n(item?.leadershipProbability, 50);

  if (role === "REENTRY_REVIEW" || role === "STRATEGIC_BUILD_REVIEW" || role === "FULL_BUILD_UPGRADE_REVIEW") {
    if (pressure >= 70 || leadership < 55) {
      return {
        signalClass: "CONTESTED_REENTRY",
        astroReading: `Contested re-entry: expansion ${Math.round(expansion)}, pressure ${Math.round(pressure)}, leadership ${Math.round(leadership)}. The dated path keeps deployment capped.`
      };
    }
    if (expansion >= pressure + 10 && leadership >= 65) {
      return {
        signalClass: "CONSTRUCTIVE_REENTRY",
        astroReading: `Constructive re-entry: expansion ${Math.round(expansion)}, pressure ${Math.round(pressure)}, leadership ${Math.round(leadership)}. Follow the deployment already assigned to this window.`
      };
    }
    return {
      signalClass: "SELECTIVE_REENTRY",
      astroReading: `Selective re-entry: expansion ${Math.round(expansion)}, pressure ${Math.round(pressure)}, leadership ${Math.round(leadership)}. The mapped action remains part-sized.`
    };
  }

  if (forceBreak) {
    return {
      signalClass: "BREAK_RESET_RISK",
      astroReading: `Break/reset-risk window: pressure ${Math.round(pressure)} exceeds expansion ${Math.round(expansion)}, with leadership ${Math.round(leadership)}.`
    };
  }
  if (pressure >= 65 && pressure >= expansion - 3) {
    return {
      signalClass: "STRUCTURAL_PRESSURE",
      astroReading: `Structural-pressure test: pressure ${Math.round(pressure)}, expansion ${Math.round(expansion)}, leadership ${Math.round(leadership)}.`
    };
  }
  if (pressure >= 58) {
    return {
      signalClass: "VOLATILE_DIGESTION",
      astroReading: `Volatile-digestion window: pressure ${Math.round(pressure)}, expansion ${Math.round(expansion)}, leadership ${Math.round(leadership)}.`
    };
  }
  return {
    signalClass: pressure >= 48 ? "NOISE" : "LOW_PRESSURE",
    astroReading: `${pressure >= 48 ? "Noise" : "Low-pressure"} window: pressure ${Math.round(pressure)}, expansion ${Math.round(expansion)}, leadership ${Math.round(leadership)}.`
  };
}

function cleanWindowLabel(item, role) {
  const raw = String(item?.label || item?.windowLabel || item?.windowType || "").trim();
  if (!raw) return null;
  const generic = new Set([
    "active_window",
    "tactical_risk",
    "strategic_risk",
    "accumulation",
    "strategic_accumulation",
    "strategic_opportunity",
    "long_range_cycle",
    String(role || "").toLowerCase()
  ]);
  return generic.has(raw.toLowerCase()) ? null : raw;
}

function windowRef(item, role, options = {}) {
  if (!item || !dateOf(item)) return null;
  const signal = windowSignal(item, role, Boolean(options.forceBreak));
  const kind = options.kind || (/PRESSURE|PROTECTION/.test(role) ? "PRESSURE" : "OPPORTUNITY");
  const severity = kind === "PRESSURE" ? pressureClass(item, options.forceBreak) : null;
  // Preserve the exact natal-contact network calculated by the forward
  // scanner.  Downstream event normalisation is already able to carry these
  // fields; older builds lost them here and later had only summary scores.
  const contacts = Array.isArray(item.transitDetails) ? item.transitDetails : [];
  const supportiveNatalContacts = contacts.filter(contact => Number(contact?.score || 0) > 0);
  const pressuringNatalContacts = contacts.filter(contact => Number(contact?.score || 0) < 0);
  const volatileNatalContacts = contacts.filter(contact =>
    ["rahu", "ketu", "mars", "mercury"].includes(String(contact?.planet || "").toLowerCase())
  );
  return {
    role,
    date: dateOf(item),
    label: cleanWindowLabel(item, role),
    sourceWindowType: item.windowType || null,
    expansionScore: n(item.expansionScore, null),
    pressureScore: n(item.pressureScore, null),
    leadership: n(item.leadershipProbability, null),
    pressureClass: severity,
    breakQualification: options.breakQualification || null,
    supportiveNatalContacts,
    pressuringNatalContacts,
    volatileNatalContacts,
    transitDetails: contacts,
    finAstroGrammar: item.finAstroGrammar || null,
    episodeContext: item.episodeContext || null,
    shadow: shadowFor(item, kind, options.forceBreak),
    ...signal
  };
}

function buildStrategicSequence({ replayDate, replay, strategicCandidate, strategicRisk, breakState, windows, company, breakNarrative = {} }) {
  const opportunityDate = dateOf(strategicCandidate);
  const riskDate = dateOf(strategicRisk);
  const daysToOpportunity = daysFrom(replayDate, strategicCandidate);
  const daysToPressure = daysFrom(replayDate, strategicRisk);
  const opportunityStrength = n(strategicCandidate?.expansionScore, n(replay?.expansionScore, 50));
  const opportunityLeadership = n(strategicCandidate?.leadershipProbability, n(replay?.leadershipProbability, 50));
  const strategicBreakAssessment = assessBreakEpisodeV35({
    candidate: strategicRisk || {},
    windows,
    narrativeCandidate: Boolean(
      breakNarrative?.complete && (!breakNarrative?.date || breakNarrative.date === riskDate)
    ),
    narrativeEvidence: breakNarrative?.evidence,
    company
  });
  const rawStrategicBreakCandidate = strategicBreakAssessment.rawBreakCandidate;
  const severeStrategicPressureCandidate = strategicBreakAssessment.scoreCorroborated;
  const strategicBreakQualified = strategicBreakAssessment.mapped;
  const severity = pressureClass(strategicRisk || replay, strategicBreakQualified);
  const pressureBeforeOpportunity = Boolean(
    riskDate && opportunityDate && daysToPressure >= 0 && daysToPressure < daysToOpportunity
  );
  const timelyOpportunity = daysToOpportunity !== null && daysToOpportunity >= 0 && daysToOpportunity <= 150;
  const credibleOpportunity = opportunityStrength >= 68 && opportunityLeadership >= 68;
  const constructivePressure = pressureBeforeOpportunity && severity !== "BREAK" && !severeStrategicPressureCandidate && timelyOpportunity && credibleOpportunity;
  const pressureShadow = strategicRisk ? shadowFor(strategicRisk, "PRESSURE", strategicBreakQualified) : null;
  const inPressureShadow = Boolean(
    pressureShadow && replayDate >= pressureShadow.preShadowStart && replayDate <= pressureShadow.postShadowEnd
  );
  const expansionImminent = daysToOpportunity !== null && daysToOpportunity >= 0 && daysToOpportunity <= 30;
  const expansionNear = daysToOpportunity !== null && daysToOpportunity >= 0 && daysToOpportunity <= 90;
  const dormantTooLong = daysToOpportunity === null || daysToOpportunity > 180;

  const breakMapped = breakState?.mapped || severity === "BREAK";
  const breakShadowApproaching = Boolean(breakMapped && daysToPressure !== null && daysToPressure >= 0);
  const currentBreakActive = Boolean(
    breakState?.mapped &&
    (!breakState.episodeStart || breakState.episodeStart <= replayDate) &&
    (!breakState.episodeEnd || breakState.episodeEnd >= replayDate)
  );

  let phase = "WAIT_FUTURE_WINDOW";
  if (currentBreakActive || (breakMapped && (inPressureShadow || daysToPressure === null || daysToPressure < 0))) phase = "BREAK_RISK";
  else if (breakShadowApproaching) phase = "PREPARE_PROTECTION";
  else if (constructivePressure && (inPressureShadow || expansionNear)) phase = expansionImminent ? "FULL_BUILD_ZONE" : "ACCUMULATE_PRESSURE";
  else if (constructivePressure) phase = "PREPARE_ACCUMULATION";
  else if (pressureBeforeOpportunity && severity === "HIGH") phase = "PREPARE_PROTECTION";
  else if (pressureBeforeOpportunity) phase = "WAIT_FUTURE_WINDOW";
  else if (daysToOpportunity !== null && daysToOpportunity <= 30 && credibleOpportunity) phase = "EXPANSION_IGNITION";
  else if (n(replay?.expansionScore, 50) >= 68 && n(replay?.leadershipProbability, 50) >= 65) phase = "ACTIVE_EXPANSION";
  else if (!dormantTooLong && credibleOpportunity) phase = "EARLY_POSITIONING";

  return {
    phase,
    pressureBeforeOpportunity,
    constructivePressure,
    pressureClass: severity,
    pressureDate: riskDate,
    daysToPressure,
    pressureShadow,
    opportunityDate,
    daysToOpportunity,
    inPressureShadow,
    expansionImminent,
    credibleOpportunity,
    dormantTooLong,
    breakQualification: strategicBreakAssessment
  };
}

function catalystWindowRef(catalystScan = {}) {
  const item = catalystScan?.best;
  if (!item || !dateOf(item)) return null;
  const mappedMacroClass = String(item?.macroBehaviour?.class || "").toUpperCase();
  const response = String(item?.expectedResponse || "").toLowerCase();
  const tone = String(item?.tone || "").toLowerCase();
  // Classify the stated astrological function, not incidental prose such as
  // "support remains stronger than pressure". Explicit constructive language
  // wins unless the response also names an actual adverse behaviour.
  const adverse = /narrative heat|quick reversal|crowd sensitivity|valuation compression|cooling|hesitation|break(?:down)?|reset risk|pressure (?:dominates|leads|builds)|volatile pressure/.test(response) || /^(pressure|volatile|reset)$/.test(tone);
  const constructive = /expansion|rerating|leadership|stronger bid|improved confidence|constructive|supportive|acceleration/.test(response) || /^(expansion|support|constructive)$/.test(tone);
  const pressure = adverse && !constructive;
  const expansion = constructive && !adverse;
  const role = pressure && !expansion ? "PRESSURE_CHECK" : expansion && !pressure ? "EXPANSION_REVIEW" : "CATALYST_REVIEW";
  const signalClass = ["EXPANSION_ACCELERATION", "SUPPORTIVE_EXPANSION"].includes(mappedMacroClass)
    ? "EXPANSION_RERATING"
    : mappedMacroClass === "DISCIPLINED_STABILISATION"
      ? "DISCIPLINED_STABILISATION"
      : mappedMacroClass === "STRUCTURAL_COMPRESSION"
        ? "COMPRESSION_COOLING"
        : ["NARRATIVE_VOLATILITY_RESET", "VOLATILITY_REVERSAL", "RESET_INFLECTION"].includes(mappedMacroClass)
          ? "VOLATILITY_REVERSAL"
          : /narrative heat|volatility|quick reversal|crowd sensitivity/.test(response)
            ? "VOLATILITY_REVERSAL"
            : /valuation compression|cooling|hesitation|pressure/.test(response)
              ? "COMPRESSION_COOLING"
              : /rerating|leadership|stronger bid|constructive/.test(response)
                ? "EXPANSION_RERATING"
                : "MIXED_TRANSITION";
  const signalLabel = signalClass.replaceAll("_", " ").toLowerCase();
  return {
    role,
    date: dateOf(item),
    shadow: {
      peakDate: dateOf(item),
      preShadowStart: shiftDate(dateOf(item), -14),
      postShadowEnd: shiftDate(dateOf(item), 7),
      preShadowDays: 14,
      postShadowDays: 7
    },
    label: item.label || "Catalyst",
    strength: item.strength || null,
    expectedBehaviour: item.expectedResponse || null,
    macroBehaviour: item.macroBehaviour || null,
    supportiveNatalContacts: item.supportiveNatalContacts || [],
    pressuringNatalContacts: item.pressuringNatalContacts || [],
    volatileNatalContacts: item.volatileNatalContacts || [],
    netExpectedExpression: item.netExpectedExpression || null,
    signalClass,
    astroReading: `${signalLabel.charAt(0).toUpperCase()}${signalLabel.slice(1)} catalyst; use the stock-specific natal contacts below for the expected expression.`,
    daysRemaining: n(item.daysRemaining, null)
  };
}

/** Pure astronomical-state projection. This layer must never emit capital actions. */
export function buildAstroTruthV35({ replayDate, replay = {}, windows = {}, macroSnapshot = {}, transitReceptorFit = {}, replayValidationIntelligence = {}, company = {}, catalystScan = {}, cyclePotentialScore = null }) {
  const reading = replayValidationIntelligence?.currentResearchReading || {};
  const map = windows?.windowMap || {};
  const expansionScore = Math.round(n(replay?.expansionScore, 50));
  const pressureScore = Math.round(n(replay?.pressureScore, 50));
  const tacticalLeadership = Math.round(n(replay?.leadershipProbability, 50));
  // Strategic capital is a 3–12/18 month bucket. A strong point near the end of
  // the two-year scanner must remain long-cycle context; it cannot leak back
  // into today's strategic leadership or capital approval.
  const strategicCandidate = [
    map?.strategicOpportunity,
    map?.strategicAccumulation,
    map?.accumulationOpen,
    windows?.strategic,
    windows?.bestWindow
  ].find(item => insideStrategicHorizon(item, replayDate)) || replay;
  const strategicLeadership = Math.round(n(strategicCandidate?.leadershipProbability, tacticalLeadership));
  const strategicWindow = strategicWindowPosture(replayDate, strategicCandidate, tacticalLeadership);
  const strategicOpportunityDate = dateOf(strategicCandidate) || replayDate;
  const dormancy = reading?.dormancy || {};
  const breakState = breakEvidence(reading, transitReceptorFit, windows, replayDate, company, replay);
  const currentAnchorComparison = anchorComparisonAt(company, replayDate) || company?.anchorConfirmation?.current || null;
  const confirmationRaisesPressure = Boolean(currentAnchorComparison?.materialPressureConfirmed);
  const strategicSequence = buildStrategicSequence({
    replayDate,
    replay,
    strategicCandidate,
    strategicRisk: map?.strategicRisk,
    breakState,
    windows,
    company,
    breakNarrative: reading?.breakAssessment || {}
  });
  const tacticalBreakAssessment = assessBreakEpisodeV35({
    candidate: map?.tacticalRisk || {},
    windows,
    company
  });
  const tacticalPressureWindow = windowRef(map?.tacticalRisk, "PRESSURE_CHECK", {
    kind: "PRESSURE",
    forceBreak: tacticalBreakAssessment.mapped,
    breakQualification: tacticalBreakAssessment
  });
  const strategicPressureWindow = windowRef(
    map?.strategicRisk,
    strategicSequence.constructivePressure ? "ACCUMULATION_PRESSURE_GATE" : "STRATEGIC_PROTECTION_REVIEW",
    {
      kind: "PRESSURE",
      forceBreak: strategicSequence.pressureClass === "BREAK",
      breakQualification: strategicSequence.breakQualification
    }
  );
  const type = pressureType({ pressure: pressureScore, expansion: expansionScore, dormancy, breakState, receptor: transitReceptorFit });

  return {
    schemaVersion: "35.8",
    layer: "ASTRO_TRUTH",
    asOfDate: replayDate,
    expansionScore,
    pressureScore,
    currentPressureClass: breakState.mapped ? "BREAK" : confirmationRaisesPressure ? "HIGH" : pressureClass(replay, false),
    pressureType: confirmationRaisesPressure && type !== "BREAK_RESET" ? "STRUCTURAL_DISCIPLINE" : type,
    tacticalLeadership,
    strategicLeadership,
    strategicLeadershipDate: strategicOpportunityDate,
    strategicWindowPhase: strategicWindow.phase,
    daysToStrategicWindow: strategicWindow.daysToWindow,
    pressureBeforeOpportunity: strategicSequence.pressureBeforeOpportunity,
    strategicSequence,
    dormancyLevel: String(dormancy?.type || (pressureScore < 55 && expansionScore < 55 ? "MEDIUM" : "LOW")).toUpperCase(),
    correctionMode: breakState.mapped ? "RESET" : type === "VOLATILE_DIGESTION" ? "DIGESTION" : type === "STRUCTURAL_DISCIPLINE" ? "DISCIPLINE" : "NORMAL",
    natalReliability: natalReliability(company, transitReceptorFit),
    receptorFit: {
      class: transitReceptorFit?.expressionClass || "UNRESOLVED",
      score: Math.round(n(transitReceptorFit?.scores?.expressionScore ?? transitReceptorFit?.expressionScore, 50)),
      confidence: Math.round(n(transitReceptorFit?.scores?.confidenceScore, 50))
    },
    cyclePotential: Math.round(n(cyclePotentialScore ?? replay?.cyclePotentialScore, strategicLeadership)),
    anchorConfirmation: company?.anchorConfirmation || null,
    breakState,
    macroEnvironment: {
      environment: macroSnapshot?.environment || null,
      expansion: n(macroSnapshot?.expansion, null),
      pressure: n(macroSnapshot?.pressure, null)
    },
    windows: {
      currentWindow: windowRef({ ...replay, date: replayDate }, "ACTIVE_WINDOW"),
      catalystWindow: catalystWindowRef(catalystScan),
      pressureWindow: tacticalPressureWindow,
      strategicPressureWindow,
      reentryWindow: windowRef(map?.accumulationOpen || map?.strategicAccumulation, "REENTRY_REVIEW"),
      strategicBuildWindow: windowRef(map?.strategicAccumulation || map?.strategicOpportunity, "STRATEGIC_BUILD_REVIEW"),
      fullBuildWindow: windowRef(map?.strategicOpportunity, "FULL_BUILD_UPGRADE_REVIEW"),
      longCycleWindow: windowRef(map?.longRangeCycle, "LONG_CYCLE_BACKGROUND")
    },
    evidence: {
      contacts: replay?.transitDetails || [],
      clusters: replay?.activeClusters || [],
      environmentSignature: replay?.environmentSignature || null,
      breakEvidence: breakState.evidence,
      pressureSupportLedger: {
        current: breakState,
        tactical: tacticalBreakAssessment,
        strategic: strategicSequence.breakQualification
      }
    },
    invariants: {
      containsCapitalLanguage: false,
      futureCannotRewritePresent: true,
      historicalCanChangeAstronomicalFacts: false,
      breakRequiresDestructiveAstroNetwork: true,
      recoveryTimingCannotCreateBreak: true,
      oneSovereignBreakClassifier: true
    }
  };
}
