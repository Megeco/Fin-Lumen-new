const DAY_MS = 86_400_000;

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const clamp = value => Math.max(0, Math.min(100, Math.round(finite(value))));
const stamp = value => value ? new Date(`${value}T00:00:00Z`).getTime() : Number.POSITIVE_INFINITY;
const daysBetween = (from, to) => from && to ? Math.round((stamp(to) - stamp(from)) / DAY_MS) : null;

const median = values => {
  const sorted = values.filter(value => Number.isFinite(Number(value))).map(Number).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const percentage = (rows, predicate) => rows.length
  ? Math.round(rows.filter(predicate).length / rows.length * 100)
  : 0;

function reading(item = {}) {
  return {
    raw: item,
    date: item.date || item.start || item.peakDate || null,
    expansion: finite(item.expansionScore ?? item.expansion, 50),
    pressure: finite(item.pressureScore ?? item.pressure, 50),
    leadership: finite(item.leadershipProbability ?? item.leadership, 50),
    contacts: Array.isArray(item.transitDetails) ? item.transitDetails : []
  };
}

function contactKey(contact = {}) {
  return [contact.planet, contact.aspect, contact.targetPlanet || contact.natalPlanet]
    .map(value => String(value || "").toLowerCase())
    .join(":");
}

function contactLedger(item = {}) {
  const contacts = reading(item).contacts;
  const durableSupport = contacts.filter(contact => {
    const planet = String(contact.planet || "").toLowerCase();
    return finite(contact.score) >= 3 && ["jupiter", "saturn", "rahu", "ketu", "eclipse"].includes(planet);
  });
  const destructive = contacts.filter(contact => finite(contact.score) <= -4);
  const acutePressure = contacts.filter(contact => {
    const planet = String(contact.planet || "").toLowerCase();
    return finite(contact.score) < 0 && ["mars", "rahu", "ketu", "eclipse"].includes(planet);
  });
  return {
    durableSupport,
    destructive,
    acutePressure,
    durableSupportFamilies: [...new Set(durableSupport.map(contact => String(contact.planet || "").toLowerCase()))],
    destructiveFamilies: [...new Set(destructive.map(contact => String(contact.planet || "").toLowerCase()))]
  };
}

function mergeContactLedgers(items = []) {
  const contacts = items.flatMap(item => reading(item).contacts);
  const unique = [...new Map(contacts.map(contact => [contactKey(contact), contact])).values()];
  return contactLedger({ transitDetails: unique });
}

function isExpansionEvent(event = {}) {
  const type = String(event.eventType || event.signalClass || "").toUpperCase();
  return type.includes("EXPANSION") || type.includes("ACCUMULATION") || type.includes("LEADERSHIP");
}

function isPressureEvent(event = {}) {
  const type = String(event.eventType || event.signalClass || "").toUpperCase();
  return type.includes("PRESSURE") || type.includes("BREAK");
}

function eventStart(event = {}) {
  return event.start || event.date || event.peakDate || null;
}

function eventEnd(event = {}) {
  return event.end || event.date || event.peakDate || eventStart(event);
}

function groupDatedEvents(events = [], maximumGapDays = 16) {
  const episodes = [];
  for (const event of events.filter(event => eventStart(event)).sort((a, b) => stamp(eventStart(a)) - stamp(eventStart(b)))) {
    const start = eventStart(event);
    const end = eventEnd(event);
    const previous = episodes.at(-1);
    if (!previous || daysBetween(previous.end, start) > maximumGapDays) {
      episodes.push({ start, end, events: [event] });
    } else {
      if (stamp(end) > stamp(previous.end)) previous.end = end;
      previous.events.push(event);
    }
  }
  return episodes;
}

function compactContact(contact = {}) {
  return {
    planet: contact.planet || null,
    aspect: contact.aspect || null,
    targetPlanet: contact.targetPlanet || contact.natalPlanet || null,
    orb: Number.isFinite(Number(contact.orb)) ? Number(Number(contact.orb).toFixed(2)) : null,
    score: Number.isFinite(Number(contact.score)) ? Number(Number(contact.score).toFixed(2)) : null
  };
}

function authorityOf(inputs = {}, truth = {}) {
  const authority = truth.chartAuthority || inputs.company?.capitalAuthorityCeiling || inputs.company?.capital_authority_ceiling;
  return String(authority || "RESEARCH_ONLY").toUpperCase();
}

function durableEnterpriseConfirmation(truth = {}) {
  const natal = truth.natalSovereignty || {};
  const policy = String(natal.anchorPolicy || "").toUpperCase();
  const state = String(natal.anchorConfirmationState || natal.confirmationState || "").toUpperCase();
  return Boolean(natal.secondaryChartId) && policy.includes("DUAL") && ["CONFIRMED", "AGREES", "ALIGNED"].some(token => state.includes(token));
}

function passageFor(event = {}) {
  const pressure = finite(event.pressureScore ?? event.pressure, 50);
  const expansion = finite(event.expansionScore ?? event.expansion, 50);
  const pressureClass = String(event.pressureClass || "").toUpperCase();
  const blocked = pressureClass === "BREAK" || pressure >= 70 && pressure >= expansion + 5;
  return {
    type: blocked ? "BLOCKED_PASSAGE" : "CONTESTED_PASSAGE",
    label: event.label || (blocked ? "Structural pressure blocks rerating sovereignty" : "Pressure contests rerating sovereignty"),
    start: eventStart(event),
    peak: event.peakDate || event.date || eventStart(event),
    end: eventEnd(event),
    expansion,
    pressure,
    leadership: finite(event.leadershipProbability ?? event.leadership, null),
    pressureClass: pressureClass || (pressure >= 68 ? "HIGH" : "MEDIUM")
  };
}

function summarizeReratingEpisode(episode, classifiedRows, pressureEvents, inputs, truth) {
  const rows = classifiedRows.filter(row => stamp(row.date) >= stamp(episode.start) && stamp(row.date) <= stamp(episode.end));
  const evidenceItems = episode.events.concat(rows.map(row => row.raw));
  const ledger = mergeContactLedgers(evidenceItems);
  const spreads = rows.map(row => row.expansion - row.pressure);
  const durationDays = Math.max(1, daysBetween(episode.start, episode.end) + 1);
  const medianExpansion = Math.round(median(rows.map(row => row.expansion)));
  const medianPressure = Math.round(median(rows.map(row => row.pressure)));
  const medianLeadership = Math.round(median(rows.map(row => row.leadership)));
  const medianSpread = Math.round(median(spreads));
  const sovereigntyShare = percentage(rows, row => row.expansion > row.pressure);
  const meaningfulSovereigntyShare = percentage(rows, row => row.expansion >= row.pressure + 8);
  const leadershipPersistence = percentage(rows, row => row.leadership >= 64);
  const supportCoverage = percentage(rows, row => {
    const rowLedger = contactLedger(row.raw);
    return rowLedger.durableSupportFamilies.length >= 2 || rowLedger.durableSupport.length >= 3;
  });
  // A nodal contact to another node can amplify narrative without changing the
  // security's valuation relationship. Rerating therefore needs at least one
  // slow/eclipse contact to an operative company receptor. One exceptionally
  // strong Jupiter/Saturn/eclipse contact may stand in for a wider network.
  const reratingContacts = ledger.durableSupport.filter(contact => !["rahu", "ketu"].includes(String(contact.targetPlanet || contact.natalPlanet || "").toLowerCase()));
  const reratingFamilies = [...new Set(reratingContacts.map(contact => String(contact.planet || "").toLowerCase()))];
  const foundationalContacts = reratingContacts.filter(contact => ["jupiter", "saturn", "eclipse"].includes(String(contact.planet || "").toLowerCase()));
  const exactSlowSupport = foundationalContacts.some(contact =>
    finite(contact.score) >= 9 && finite(contact.orb, 99) <= 2 || finite(contact.score) >= 7 && finite(contact.orb, 99) <= 1.25
  );
  const causalNetwork = Boolean(foundationalContacts.length) && (reratingFamilies.length >= 2 || reratingContacts.length >= 3 || exactSlowSupport);
  const macroPermission = medianSpread >= 8 && medianPressure < 68;
  const candidate = rows.length >= 2 && durationDays >= 30 && medianExpansion >= 68 && medianLeadership >= 62 && sovereigntyShare >= 60 && causalNetwork;
  const qualified = candidate && durationDays >= 45 && medianLeadership >= 68 && medianSpread >= 10 && meaningfulSovereigntyShare >= 67 && leadershipPersistence >= 67 && macroPermission;
  const overlappingPressure = pressureEvents
    .filter(event => stamp(eventStart(event)) <= stamp(episode.end) && stamp(eventEnd(event)) >= stamp(episode.start))
    .filter(event => finite(event.pressureScore ?? event.pressure, 0) >= 65 || ["HIGH", "BREAK"].includes(String(event.pressureClass || "").toUpperCase()))
    .map(passageFor);
  const blockedPassage = overlappingPressure.find(passage => passage.type === "BLOCKED_PASSAGE");
  const contestedPassage = overlappingPressure.find(passage => passage.type === "CONTESTED_PASSAGE");
  const continuationAfterBlock = blockedPassage && rows.some(row => stamp(row.date) > stamp(blockedPassage.end) && row.expansion >= row.pressure + 8 && row.leadership >= 68);
  const blocked = Boolean(candidate && blockedPassage && !continuationAfterBlock);
  const contested = qualified && !blocked && Boolean(contestedPassage || rows.some(row => row.pressure >= 65 && row.expansion > row.pressure));
  const strongest = rows.slice().sort((a, b) => (b.expansion + b.leadership - b.pressure) - (a.expansion + a.leadership - a.pressure))[0];
  const eventPeak = episode.events
    .filter(event => event.peakDate || event.date)
    .sort((a, b) => (finite(b.expansionScore) + finite(b.leadership) - finite(b.pressureScore)) - (finite(a.expansionScore) + finite(a.leadership) - finite(a.pressureScore)))[0];
  const strongestDate = eventPeak?.peakDate || eventPeak?.date || strongest?.date || episode.start;
  const authority = authorityOf(inputs, truth);
  const durable = qualified && durableEnterpriseConfirmation(truth);
  let intrinsicStatus = blocked ? "BLOCKED" : durable ? "DURABLE" : contested ? "CONTESTED" : qualified ? "QUALIFIED" : candidate ? "CANDIDATE" : "EXPANSION_ONLY";
  let status = intrinsicStatus;
  let authorityLimit = null;
  if (authority === "RESEARCH_ONLY" && ["QUALIFIED", "CONTESTED", "DURABLE"].includes(status)) {
    authorityLimit = `${status}_STRUCTURE_WITH_RESEARCH_ONLY_NATAL_AUTHORITY`;
    status = "CANDIDATE";
  }
  const labelMap = {
    CANDIDATE: "Future Rerating Candidate",
    QUALIFIED: "Projected Rerating Qualified",
    DURABLE: "Projected Durable Rerating",
    CONTESTED: "Projected Contested Rerating",
    BLOCKED: "Projected Blocked Rerating",
    EXPANSION_ONLY: "Expansion Window — rerating not qualified"
  };
  return {
    status,
    intrinsicStatus,
    label: labelMap[status],
    authority,
    authorityLimit,
    projectedIgnition: episode.start,
    activeWindow: { start: episode.start, peak: strongestDate, end: episode.end },
    strongestAstroPhase: { date: strongestDate, label: "Strongest astro phase" },
    passages: overlappingPressure,
    diagnostics: {
      observations: rows.length,
      durationDays,
      medianExpansion,
      medianPressure,
      medianLeadership,
      medianExpansionSpread: medianSpread,
      expansionSovereigntyShare: sovereigntyShare,
      meaningfulSovereigntyShare,
      leadershipPersistence,
      supportCoverage,
      macroPermission,
      causalNetwork,
      supportFamilies: reratingFamilies,
      foundationalContactCount: foundationalContacts.length,
      supportiveContacts: reratingContacts.slice(0, 8).map(compactContact),
      blockedPassage: Boolean(blockedPassage),
      continuationAfterBlock: Boolean(continuationAfterBlock)
    }
  };
}

function buildReratingAssessment(inputs, truth, classifiedRows, current) {
  const eventLedger = Array.isArray(truth.eventLedger) ? truth.eventLedger : [];
  const expansionEpisodes = groupDatedEvents(eventLedger.filter(isExpansionEvent))
    .filter(episode => stamp(episode.end) >= stamp(current.date))
    .map(episode => summarizeReratingEpisode(episode, classifiedRows, eventLedger.filter(isPressureEvent), inputs, truth));
  const mapped = expansionEpisodes.filter(episode => episode.status !== "EXPANSION_ONLY");
  const selected = mapped[0] || null;
  const active = mapped.find(episode => stamp(episode.activeWindow.start) <= stamp(current.date) && stamp(episode.activeWindow.end) >= stamp(current.date));
  const currentBlocked = active?.passages?.some(passage => passage.type === "BLOCKED_PASSAGE" && stamp(passage.start) <= stamp(current.date) && stamp(passage.end) >= stamp(current.date));
  const currentContested = active?.passages?.some(passage => passage.type === "CONTESTED_PASSAGE" && stamp(passage.start) <= stamp(current.date) && stamp(passage.end) >= stamp(current.date));
  const presentState = currentBlocked ? "BLOCKED" : currentContested ? "CONTESTED" : active ? "ACTIVE" : selected && daysBetween(current.date, selected.projectedIgnition) <= 90 ? "FORMING" : "ABSENT";
  return {
    mode: "RESEARCH_VIEW_SHADOW_ONLY",
    publicGreenBandEligible: false,
    presentState,
    futureOutlook: selected,
    episodes: expansionEpisodes,
    rules: {
      ordinaryExpansionIsNotRerating: true,
      completeEpisodeMeasured: true,
      candidateHiddenFromPublicBand: true,
      researchOnlyAuthorityCapsAtCandidate: true,
      durableRequiresIndependentEnterpriseChart: true
    }
  };
}

function trajectory(values, threshold = 3) {
  if (values.length < 2) return { phase: "UNRESOLVED", delta: 0 };
  const delta = finite(values.at(-1)) - finite(values[0]);
  const middle = values.length > 2 ? finite(values[1]) : null;
  const peakLike = middle !== null && middle >= finite(values[0]) + threshold && middle >= finite(values.at(-1)) + threshold;
  if (peakLike) return { phase: "PEAKING", delta: Math.round(delta) };
  if (delta >= threshold) return { phase: "BUILDING", delta: Math.round(delta) };
  if (delta <= -threshold) return { phase: "RELEASING", delta: Math.round(delta) };
  return { phase: "STABLE", delta: Math.round(delta) };
}

function aspectPhases(current, next) {
  if (!current?.contacts?.length || !next?.contacts?.length) return [];
  const nextByKey = new Map(next.contacts.map(contact => [contactKey(contact), contact]));
  return current.contacts.map(contact => {
    const later = nextByKey.get(contactKey(contact));
    if (!later || !Number.isFinite(Number(contact.orb)) || !Number.isFinite(Number(later.orb))) return null;
    const nowOrb = Math.abs(Number(contact.orb));
    const nextOrb = Math.abs(Number(later.orb));
    return {
      contact: contactKey(contact),
      score: finite(contact.score),
      phase: nextOrb < nowOrb - 0.15 ? "APPLYING" : nextOrb > nowOrb + 0.15 ? "SEPARATING" : "EXACT_OR_STATIONARY",
      orb: Number(nowOrb.toFixed(2)),
      nextOrb: Number(nextOrb.toFixed(2))
    };
  }).filter(Boolean);
}

function conversionState(row, phase = {}, contacts = contactLedger(row.raw), context = {}) {
  const { expansion: e, pressure: p, leadership: l } = row;
  const expansionLead = e >= p + 8;
  const severeInterference = p >= 78 || (p >= 70 && p >= e + 5);
  const supportNetwork = contacts.durableSupportFamilies.length >= 2 || contacts.durableSupport.length >= 3;
  const operativeSupport = e >= 62 && l >= 58 && (supportNetwork || e >= 70);

  if (phase.expansion === "RELEASING" && phase.pressure === "BUILDING" && p >= 62) return "SUPPORT_DECAY_RENEWED_PRESSURE";
  if (severeInterference) return operativeSupport ? "CONTESTED_SUPPORT" : "SUPPORT_PRESENT";
  if (context.approachingSeriousPressure && operativeSupport) return "CONTESTED_SUPPORT";
  if (phase.pressure === "RELEASING" && operativeSupport && p >= 58) return "PRESSURE_RELEASE";
  if (e >= 74 && l >= 68 && expansionLead && p < 66 && supportNetwork) {
    return phase.expansion === "RELEASING" ? "MATURE_EXPANSION" : "CLEAN_EXPANSION";
  }
  if (e >= 68 && l >= 64 && e >= p - 2 && p < 72 && supportNetwork && phase.expansion !== "RELEASING") return "EARLY_EXPANSION";
  if (operativeSupport && p >= 60) return "CONTESTED_SUPPORT";
  if (operativeSupport) return "SUPPORT_PRESENT";
  return p >= 65 ? "SUPPORT_DECAY_RENEWED_PRESSURE" : "SUPPORT_PRESENT";
}

function groupEpisodes(rows, predicate, maximumGapDays = 45) {
  const episodes = [];
  for (const row of rows.filter(predicate)) {
    const previous = episodes.at(-1);
    if (!previous || daysBetween(previous.end, row.date) > maximumGapDays) {
      episodes.push({ start: row.date, end: row.date, rows: [row] });
    } else {
      previous.end = row.date;
      previous.rows.push(row);
    }
  }
  return episodes;
}

function summarizeEpisode(episode) {
  const rows = episode.rows;
  const peak = rows.slice().sort((a, b) => (b.expansion + b.leadership - b.pressure) - (a.expansion + a.leadership - a.pressure))[0];
  return {
    start: episode.start,
    end: episode.end,
    durationDays: Math.max(1, daysBetween(episode.start, episode.end) + 15),
    observations: rows.length,
    conversionStates: [...new Set(rows.map(row => row.conversionState))],
    peakExpansion: peak.expansion,
    peakPressure: peak.pressure,
    peakLeadership: peak.leadership,
    quality: clamp((peak.expansion * 0.45) + (peak.leadership * 0.45) - Math.max(0, peak.pressure - 55) * 0.35)
  };
}

function runwayLevel(score) {
  if (score >= 85) return "RARE";
  if (score >= 72) return "HIGH";
  if (score >= 55) return "DEVELOPING";
  return "LOW";
}

function episodeRunway(rows, breakMapped = false) {
  const convertedStates = new Set(["EARLY_EXPANSION", "CLEAN_EXPANSION", "MATURE_EXPANSION", "PRESSURE_RELEASE"]);
  const episodes = groupEpisodes(rows, row => convertedStates.has(row.conversionState)).map(summarizeEpisode);
  const seriousPressureEpisodes = groupEpisodes(rows, row => row.pressure >= 68).map(summarizeEpisode);
  const unresolvedPressure = seriousPressureEpisodes.filter(pressureEpisode => {
    const laterExpansion = episodes.find(episode => stamp(episode.start) > stamp(pressureEpisode.end) && daysBetween(pressureEpisode.end, episode.start) <= 180);
    const overlappingExpansion = episodes.find(episode => stamp(episode.start) <= stamp(pressureEpisode.end) && stamp(episode.end) >= stamp(pressureEpisode.start));
    return !laterExpansion && !overlappingExpansion;
  });
  const cleanEpisodes = episodes.filter(episode => episode.conversionStates.includes("CLEAN_EXPANSION"));
  const episodeCountScore = [0, 46, 72, 88][Math.min(3, episodes.length)];
  const episodeQuality = episodes.length ? episodes.reduce((sum, episode) => sum + episode.quality, 0) / episodes.length : 0;
  const durationQuality = episodes.length ? episodes.reduce((sum, episode) => sum + Math.min(100, episode.durationDays / 120 * 100), 0) / episodes.length : 0;
  const gaps = episodes.slice(1).map((episode, index) => daysBetween(episodes[index].end, episode.start));
  const separationQuality = gaps.length ? gaps.reduce((sum, gap) => sum + (gap >= 45 && gap <= 240 ? 100 : gap < 45 ? 55 : 35), 0) / gaps.length : (episodes.length ? 58 : 0);
  const pressureAbsorption = seriousPressureEpisodes.length
    ? clamp((seriousPressureEpisodes.length - unresolvedPressure.length) / seriousPressureEpisodes.length * 100)
    : 74;
  const unresolvedPenalty = unresolvedPressure.length * 12;
  const breakPenalty = breakMapped ? 22 : 0;
  let score = clamp(episodeCountScore * 0.30 + episodeQuality * 0.27 + durationQuality * 0.13 + separationQuality * 0.12 + pressureAbsorption * 0.18 - unresolvedPenalty - breakPenalty);
  if (!episodes.length) score = Math.min(score, 32);
  if (!cleanEpisodes.length) score = Math.min(score, 59);
  if (episodes.length === 1 && cleanEpisodes.length === 0) score = Math.min(score, 54);
  if (breakMapped) score = Math.min(score, 54);
  return {
    score,
    level: runwayLevel(score),
    episodes,
    seriousPressureEpisodes: seriousPressureEpisodes.length,
    unresolvedPressureEpisodes: unresolvedPressure.length,
    components: {
      episodeCount: episodes.length,
      episodeCountScore,
      episodeQuality: clamp(episodeQuality),
      durationQuality: clamp(durationQuality),
      separationQuality: clamp(separationQuality),
      pressureAbsorption,
      unresolvedPenalty,
      breakPenalty
    },
    explanation: `${episodes.length} converted expansion episode${episodes.length === 1 ? "" : "s"} counted once each; ${unresolvedPressure.length} unresolved serious-pressure episode${unresolvedPressure.length === 1 ? "" : "s"}. Repeated scan points inside one transit do not add separate runway authority.`
  };
}

export function buildShadowAstroAssessment(inputs = {}, truth = {}) {
  const scan = (Array.isArray(inputs.windows?.fullScan) ? inputs.windows.fullScan : [])
    .filter(item => item?.date)
    .sort((a, b) => stamp(a.date) - stamp(b.date));
  const currentRaw = inputs.replay || scan[0] || {};
  const current = reading({ ...currentRaw, date: truth.asOfDate || inputs.replayDate || currentRaw.date });
  const future = scan.filter(item => stamp(item.date) >= stamp(current.date)).map(reading);
  const phaseRows = [current, ...future.filter(row => row.date !== current.date).slice(0, 2)];
  const pressureTrajectory = trajectory(phaseRows.map(row => row.pressure));
  const expansionTrajectory = trajectory(phaseRows.map(row => row.expansion));
  const phase = { pressure: pressureTrajectory.phase, expansion: expansionTrajectory.phase };
  const currentContacts = contactLedger(current.raw);
  const approachingMappedPressure = (truth.eventLedger || []).some(event => {
    const eventDate = event.start || event.peakDate || event.date;
    const pressureEvent = String(event.eventType || "").includes("PRESSURE");
    const days = daysBetween(current.date, eventDate);
    return pressureEvent && days !== null && days >= 0 && days <= 60 && (finite(event.pressureScore) >= 68 || ["HIGH", "BREAK"].includes(String(event.pressureClass || "").toUpperCase()));
  });
  const approachingSeriousPressure = approachingMappedPressure || future.slice(1, 6).some(row =>
    daysBetween(current.date, row.date) <= 60 && row.pressure >= 68
  );
  const currentConversion = conversionState(current, phase, currentContacts, { approachingSeriousPressure });

  // Keep a fixed 24-month runway plus 60 days of look-ahead so a pressure
  // episode just beyond the runway boundary is treated consistently on
  // adjacent replay dates. The look-ahead may classify the boundary but is
  // never scored as an extra runway episode.
  const classificationSource = future.filter(row => daysBetween(current.date, row.date) <= 790);
  const classifiedRows = classificationSource.map((row, index, all) => {
    const nearby = all.slice(index, index + 3);
    const rowPhase = {
      pressure: trajectory(nearby.map(item => item.pressure)).phase,
      expansion: trajectory(nearby.map(item => item.expansion)).phase
    };
    const approachingPressure = all.slice(index + 1, index + 6).some(item =>
      daysBetween(row.date, item.date) <= 60 && item.pressure >= 68
    );
    return { ...row, phase: rowPhase, conversionState: conversionState(row, rowPhase, contactLedger(row.raw), { approachingSeriousPressure: approachingPressure }) };
  });
  const runwayRows = classifiedRows.filter(row => daysBetween(current.date, row.date) <= 730);
  const breakMapped = Boolean(truth.breakState?.mapped);
  const currentPressureEpisode = [];
  if (current.pressure >= 68) {
    for (const row of classifiedRows.slice(0, 8)) {
      if (row.pressure < 68) break;
      currentPressureEpisode.push(row);
    }
  }
  const supportSurvivesCulmination = currentPressureEpisode.length > 0 && currentPressureEpisode.every(row => {
    const ledger = contactLedger(row.raw);
    return row.expansion >= row.pressure - 8 && row.pressure < 82 && ledger.durableSupport.length >= 2;
  });
  const pressureOutcome = breakMapped
    ? (currentContacts.durableSupport.length >= 2 ? "BREAK_RISK_WITH_LATER_REPAIR_POTENTIAL" : "BREAK_RISK_PRESSURE")
    : current.pressure >= 68
      ? (supportSurvivesCulmination ? "ABSORBED_PRESSURE" : "PRESSURE_FOLLOWED_BY_REPAIR_TEST")
      : "NO_SEVERE_CURRENT_PRESSURE";
  const reratingAssessment = buildReratingAssessment(inputs, truth, classifiedRows, current);

  return {
    schemaVersion: "37.7.0-rerating-shadow-v1",
    mode: "SHADOW_DIAGNOSTIC_ONLY",
    authoritativeOutputChanged: false,
    phase: {
      pressure: pressureTrajectory,
      expansion: expansionTrajectory,
      aspects: aspectPhases(current, future.find(row => row.date !== current.date))
    },
    current: {
      pressureOutcome,
      expansionConversion: currentConversion,
      supportFamilies: currentContacts.durableSupportFamilies,
      destructivePressureFamilies: currentContacts.destructiveFamilies,
      durableSupportContactCount: currentContacts.durableSupport.length,
      destructiveContactCount: currentContacts.destructive.length,
      acutePressureContactCount: currentContacts.acutePressure.length
    },
    runway: episodeRunway(runwayRows, breakMapped),
    reratingAssessment,
    forwardStates: classifiedRows.slice(0, 16).map(row => ({
      date: row.date,
      expansion: row.expansion,
      pressure: row.pressure,
      leadership: row.leadership,
      pressurePhase: row.phase.pressure,
      expansionPhase: row.phase.expansion,
      expansionConversion: row.conversionState
    })),
    invariants: {
      consumesExistingAstrologyOnly: true,
      changesExistingScores: false,
      changesExistingWindows: false,
      changesExistingLanguage: false,
      containsPriceInput: false,
      containsTradingLanguage: false,
      elapsedTimeCannotCreateBreak: true
    }
  };
}

export default buildShadowAstroAssessment;
