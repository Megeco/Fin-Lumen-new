import {
  resolveCompany
} from "./companyResolver.js";

import {
  generateRealNatalChart
} from "./realNatalGenerator.js";

import {
  generateRealTransits,
  getSign
} from "./realTransitGenerator.js";

import {
  calculateRealEclipseHits,
  getRelevantEclipses
} from "./realEclipseEngine.js";

import calculateTransitResonance from "./transitResonance.js";

import {
  scanForwardWindows
} from "./windowScanner.js";

import {
  getRealEphemeris
} from "./realEphemeris.js";

import {
  scanCatalystToNatal
} from "./catalystToNatal.js";

import {
  evaluateTransitReceptorFit
} from "./transitReceptorFitEngine.js";

import { analyzeCycleRunwayV36 } from "./v36/astroTruth.js";
import { buildPureAstroModel } from "./pureAstroModel.js";

function todayDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function daysBetween(fromDate, toDate) {
  const from = new Date(`${fromDate}T12:00:00Z`);
  const to = new Date(`${toDate}T12:00:00Z`);
  return Math.max(0, Math.round((to - from) / 86400000));
}

function pressureLabel(score) {
  if (score >= 68) return "HIGH";
  if (score >= 58) return "MEDIUM";
  return "LOW";
}

function anchorSnapshot(reading = {}, date = null) {
  const expansion = Number(reading?.expansionScore ?? 50);
  const pressure = Number(reading?.pressureScore ?? 50);
  const leadership = Number(reading?.leadershipProbability ?? reading?.leadership ?? 50);
  const productive = expansion >= 65 && leadership >= 62 && pressure < 75 && expansion >= pressure - 8;
  const structuralPressure = pressure >= 68 && pressure >= expansion + 5 && leadership < 58;
  const breakLike = pressure >= 78 && pressure >= expansion + 8 && leadership < 50;
  return {
    date: date || reading?.date || null,
    expansion,
    pressure,
    leadership,
    productive,
    structuralPressure,
    breakLike,
    direction: productive ? "EXPANSION" : structuralPressure ? "PRESSURE" : "MIXED",
    start: reading?.shadow?.preShadowStart || reading?.start || date || reading?.date || null,
    end: reading?.shadow?.postShadowEnd || reading?.end || date || reading?.date || null,
    peakDate: reading?.shadow?.peakDate || date || reading?.date || null,
    signalClass: reading?.signalClass || null,
    sourceWindowType: reading?.sourceWindowType || null
  };
}

function closestScanObservation(windows = {}, date = null, fallback = null) {
  if (!date) return fallback;
  const target = new Date(`${date}T00:00:00Z`).getTime();
  const scans = Array.isArray(windows?.fullScan) ? windows.fullScan : [];
  const closest = scans
    .filter(item => item?.date)
    .map(item => ({ item, gap: Math.abs(new Date(`${item.date}T00:00:00Z`).getTime() - target) / 86400000 }))
    .sort((a, b) => a.gap - b.gap)[0];
  return closest && closest.gap <= 16 ? closest.item : fallback;
}

function compareAnchorReadings(primaryReading, secondaryReading, date) {
  const primary = anchorSnapshot(primaryReading, date);
  const secondary = anchorSnapshot(secondaryReading, date);
  const expansionConfirmed = primary.productive && secondary.productive;
  const structuralExpansionSupport = !primary.productive && secondary.productive;
  const pressureConfirmed = primary.structuralPressure && secondary.structuralPressure;
  const materialPressureConfirmed = primary.pressure >= 58 && !primary.productive && secondary.structuralPressure;
  const destructiveAgreement = primary.breakLike && secondary.structuralPressure;
  const secondaryContradictsBreak = primary.breakLike && secondary.productive;
  const severeConflict = (primary.productive && secondary.breakLike) || (primary.breakLike && secondary.productive);
  const aligned = primary.direction === secondary.direction && primary.direction !== "MIXED";
  return {
    date,
    primary,
    secondary,
    expansionConfirmed,
    structuralExpansionSupport,
    pressureConfirmed,
    materialPressureConfirmed,
    destructiveAgreement,
    secondaryContradictsBreak,
    severeConflict,
    aligned,
    state: expansionConfirmed
      ? "EXPANSION_CONFIRMED"
      : structuralExpansionSupport
        ? "STRUCTURAL_EXPANSION_SUPPORT"
        : pressureConfirmed
          ? "PRESSURE_CONFIRMED"
          : materialPressureConfirmed
            ? "STRUCTURAL_PRESSURE_WARNING"
            : severeConflict
              ? "SEVERE_DIVERGENCE"
              : aligned
                ? "DIRECTION_CONFIRMED"
                : "MIXED_CONFIRMATION"
  };
}

function buildDualAnchorConfirmation(company, primaryReading, primaryWindows, secondaryCompany, secondaryReading, secondaryWindows) {
  const policy = company?.dualChartPolicy;
  if (!policy || policy.mode !== "ROLE_BASED_CONFIRMATION" || !secondaryCompany?.found) return null;
  const dates = new Set([
    primaryWindows?.fullScan?.[0]?.date,
    ...(primaryWindows?.fullScan || []).map(item => item?.date),
    primaryWindows?.windowMap?.tacticalRisk?.date,
    primaryWindows?.windowMap?.strategicRisk?.date,
    primaryWindows?.windowMap?.strategicOpportunity?.date,
    primaryWindows?.windowMap?.strategicAccumulation?.date,
    ...(secondaryWindows?.fullScan || []).map(item => item?.date),
    secondaryWindows?.windowMap?.tacticalRisk?.date,
    secondaryWindows?.windowMap?.strategicRisk?.date
  ].filter(Boolean));
  const comparisons = {};
  for (const date of dates) {
    const primaryAtDate = closestScanObservation(primaryWindows, date, date === primaryWindows?.fullScan?.[0]?.date ? primaryReading : null);
    const secondaryAtDate = closestScanObservation(secondaryWindows, date, date === primaryWindows?.fullScan?.[0]?.date ? secondaryReading : null);
    if (primaryAtDate && secondaryAtDate) comparisons[date] = compareAnchorReadings(primaryAtDate, secondaryAtDate, date);
  }
  const currentDate = primaryWindows?.fullScan?.[0]?.date || null;
  const current = currentDate && comparisons[currentDate]
    ? comparisons[currentDate]
    : compareAnchorReadings(primaryReading, secondaryReading, currentDate);
  const severeConflictDates = Object.values(comparisons).filter(item => item.severeConflict).map(item => item.date);
  const confirmedExpansionDates = Object.values(comparisons).filter(item => item.expansionConfirmed).map(item => item.date);
  const confirmedPressureDates = Object.values(comparisons).filter(item => item.pressureConfirmed).map(item => item.date);
  const secondaryPressureWindows = [
    primaryWindows?.windowMap?.tacticalRisk,
    primaryWindows?.windowMap?.strategicRisk
  ]
    .filter(Boolean)
    .filter((window, index, all) => all.findIndex(other => other.date === window.date) === index)
    .map(window => {
      const primaryAtDate = closestScanObservation(primaryWindows, window.date, primaryReading);
      const secondaryAtDate = closestScanObservation(secondaryWindows, window.date, secondaryReading);
      return { ...window, comparison: compareAnchorReadings(primaryAtDate, secondaryAtDate, window.date) };
    })
    .filter(window =>
      window.comparison.secondary.breakLike ||
      (window.comparison.secondary.structuralPressure && window.comparison.secondary.pressure >= 75)
    );
  const confidenceAdjustment = current.state === "EXPANSION_CONFIRMED" || current.state === "PRESSURE_CONFIRMED"
    ? 4
    : current.severeConflict
      ? -10
      : -4;
  return {
    mode: policy.mode,
    policy,
    primaryChart: {
      id: company.selectedChartId || company.preferredChartId,
      chartType: company.chartType,
      date: company.birthDate,
      time: company.birthTime,
      role: "DIRECTION_TIMING_AUTHORITY"
    },
    secondaryChart: {
      id: secondaryCompany.selectedChartId,
      chartType: secondaryCompany.chartType,
      date: secondaryCompany.birthDate,
      time: secondaryCompany.birthTime,
      role: "STRUCTURAL_CONFIRMATION_ONLY"
    },
    scoresBlended: false,
    current,
    comparisons,
    severeConflictDates,
    confirmedExpansionDates,
    confirmedPressureDates,
    secondaryPressureWindows,
    confidenceAdjustment,
    doctrine: "Primary chart owns direction, scores and all dates. The secondary chart never creates an opportunity, date or blended score; severe contrary structure may upgrade a primary-mapped pressure window to High. Break-Risk requires destructive primary agreement; elapsed time is never qualifying evidence."
  };
}

async function buildRoleChartReadings({ ticker, stock, date, company, transits, relevantEclipses }) {
  const policy = company?.chartRolePolicy;
  if (!policy || policy.mode !== "DISTINCT_ROLE_AUTHORITY" || !Array.isArray(policy.roles)) return [];
  const readings = [];
  for (const definition of policy.roles) {
    if (!definition?.chartId || definition.chartId === company.selectedChartId) continue;
    if (definition.effectiveFrom && date < definition.effectiveFrom) continue;
    if (definition.effectiveTo && date > definition.effectiveTo) continue;
    const roleCompany = await resolveCompany(ticker, stock, { asOfDate: date, chartId: definition.chartId });
    if (!roleCompany?.found || roleCompany.selectedChartId === company.selectedChartId) continue;
    const roleNatal = generateRealNatalChart(roleCompany);
    const roleEclipseHits = calculateRealEclipseHits(roleNatal, {
      referenceDate: date,
      daysBefore: 30,
      daysAfter: 30,
      eclipses: relevantEclipses,
      orbLimit: 8
    });
    const roleResonance = calculateTransitResonance(roleNatal, {
      ...transits,
      relevantEclipses,
      eclipseHits: roleEclipseHits
    });
    readings.push({
      role: definition.role,
      authorities: definition.authorities || [],
      effectiveFrom: definition.effectiveFrom || null,
      effectiveTo: definition.effectiveTo || null,
      chart: {
        id: roleCompany.selectedChartId,
        chartType: roleCompany.chartType,
        date: roleCompany.birthDate,
        time: roleCompany.birthTime,
        city: roleCompany.city,
        confidence: roleCompany.charts?.find(chart => chart.id === roleCompany.selectedChartId)?.confidence || roleCompany.confidence
      },
      resonance: roleResonance,
      windows: scanForwardWindows(roleNatal, date)
    });
  }
  return readings;
}

function compactTransitText(details = []) {
  const sorted = [...details]
    .filter(item => item?.planet && item?.targetPlanet)
    .sort((a, b) => Math.abs(b.score || 0) - Math.abs(a.score || 0))
    .slice(0, 4);

  if (!sorted.length) {
    return "No major natal transit hit inside current orb.";
  }

  return sorted
    .map(item => {
      const score = typeof item.score === "number" ? ` (${item.score > 0 ? "+" : ""}${Math.round(item.score)})` : "";
      const orb = typeof item.orb === "number" ? `, orb ${item.orb}°` : "";
      return `${item.planet} ${item.aspect} natal ${item.targetPlanet}${orb}${score}`;
    })
    .join("; ");
}

function behaviourFromResonance(resonance, catalystScan) {
  const regime = resonance.currentRegime || resonance.regime;
  const topTransit = compactTransitText(resonance.transitDetails);
  const catalyst = catalystScan?.best;
  const catalystLine = catalyst
    ? ` Upcoming catalyst read: ${catalyst.expectedResponse}`
    : "";

  if (regime === "Expansion") {
    return `Current response: expansion bias is active. ${topTransit}.${catalystLine}`;
  }

  if (regime === "Pressure") {
    return `Current response: pressure bias is active; repair quality and timing matter. ${topTransit}.${catalystLine}`;
  }

  if (regime === "Compression") {
    return `Current response: crowded/compressed sky; catalyst behaviour may dominate. ${topTransit}.${catalystLine}`;
  }

  return `Current response: mixed sky; wait for clearer natal activation. ${topTransit}.${catalystLine}`;
}

function nextWindowFrom(windows, startDate) {
  const candidates = [
    ...(windows?.catalystWindows || []),
    ...(windows?.expansionWindows || []),
    ...(windows?.pressureWindows || [])
  ]
    .filter(Boolean)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const candidate = candidates[0] || windows?.bestWindow || null;

  if (!candidate) {
    return {
      label: "No major 24-month window",
      days: "-",
      type: "No major catalyst cluster"
    };
  }

  return {
    label: candidate.environmentSignature || candidate.regime || "Astro window",
    days: daysBetween(startDate, candidate.date),
    type: candidate.activeClusters?.[0] || candidate.catalystWindow || candidate.regime || "Astro window",
    date: candidate.date,
    score: candidate.leadershipProbability
  };
}

function nextExpansionFrom(windows) {
  const map = windows?.windowMap || {};
  const candidate = map.accumulationOpen || map.tacticalOpportunity || map.strategicAccumulation || map.strategicOpportunity || (windows?.expansionWindows || [])[0] || windows?.bestWindow || null;

  if (!candidate) {
    return "No clear expansion window";
  }

  const role = candidate.windowRole || "Expansion window";
  return `${candidate.date}: ${role} / leadership ${candidate.leadershipProbability}`;
}


function scoreCycleAsymmetry(resonance, windows, catalystScan, natalProfile, anchorConfirmation = null) {
  return analyzeCycleRunwayV36(resonance, windows, anchorConfirmation);
}

function cyclePotentialLabel(score) {
  if (score >= 85) return "EXTREME";
  if (score >= 72) return "HIGH";
  if (score >= 55) return "MODERATE";
  if (score > 0) return "LOW";
  return "UNASSESSED";
}

function cycleTimingLabel(windows) {
  const map = windows?.windowMap || {};
  const first = map.accumulationOpen || map.strategicAccumulation || map.strategicOpportunity || windows?.nearestUsableWindow || windows?.bestWindow;
  if (!first?.date) return "No cycle window yet";
  const long = map.longRangeCycle?.date ? `; long-range cycle ${map.longRangeCycle.date}` : "";
  return `${first.date}: ${first.windowRole || first.regime || "Window"} / leadership ${first.leadershipProbability}${long}`;
}

function cyclePotentialNote(resonance, windows, catalystScan, cyclePotential, cycleRunway = null) {
  const current = resonance.multibaggerProbability || "UNASSESSED";
  const best = windows?.bestWindow;
  const catalyst = catalystScan?.best;

  if (!best) {
    return `Current asymmetry: ${current}. Cycle potential cannot yet be assessed without forward windows.`;
  }

  if (cycleRunway) {
    const pressure = cycleRunway.firstBreakDate
      ? ` First break-class episode: ${cycleRunway.firstBreakDate}.`
      : " No break-class episode is mapped inside the measured runway.";
    return `Current asymmetry: ${current}. Cycle runway: ${cyclePotential} (${cycleRunway.score}/100) from ${cycleRunway.episodes.length} distinct productive expansion episode${cycleRunway.episodes.length === 1 ? "" : "s"}; ${cycleRunway.productiveObservations} productive scan points and ${cycleRunway.activationPlanets.length} slow/nodal activation families.${pressure}`;
  }

  if (cyclePotential === current) {
    return `Current asymmetry and forward cycle potential are both ${cyclePotential}. Best observed forward window: ${cycleTimingLabel(windows)}.`;
  }

  return `Current asymmetry: ${current}. Forward cycle potential: ${cyclePotential}, based on best window ${cycleTimingLabel(windows)}${catalyst ? ` and upcoming catalyst ${catalyst.label}` : ""}.`;
}


function phaseFitFrom(windows, resonance, cyclePotential) {
  const map = windows?.windowMap || {};
  const first = map.accumulationOpen || map.strategicAccumulation || map.strategicOpportunity || windows?.nearestUsableWindow || windows?.bestWindow;
  const bestDate = first?.date || "";
  const bestLeadership = Number(first?.leadershipProbability || 0);
  const currentLeadership = Number(resonance.leadershipProbability || 0);

  if (currentLeadership >= 70 && ["HIGH", "EXTREME"].includes(cyclePotential)) {
    return "Both / Active Now";
  }

  if (bestDate && bestDate < "2027-07-01" && bestLeadership >= 70) {
    return "Cycle 1 Leader";
  }

  if (bestDate && bestDate >= "2027-07-01" && bestLeadership >= 70) {
    return "Cycle 2 Leader";
  }

  if (map.longRangeCycle?.date && !bestDate) {
    return "Long-range Watch";
  }

  return "Unclear / Watch";
}

function natalSourceFrom(company, natal) {
  const confidence = String(company?.confidence || natal?.metadata?.confidence || "unknown").toUpperCase();
  const birthDate = natal?.metadata?.birthDate || company?.birthDate || company?.listingDate || company?.incorporationDate || null;
  const chartType = company?.chartType || natal?.metadata?.chartType || null;
  const sourceLabel = String(chartType || "").toLowerCase().includes("listing")
    ? "selected listing chart"
    : String(chartType || "").toLowerCase().includes("record-date")
      ? "selected record-date chart"
      : String(chartType || "").toLowerCase().includes("incorporation")
        ? "selected incorporation chart"
        : "selected natal chart";

  return {
    computed_from_natal: true,
    natal_confidence: confidence,
    natal_source: sourceLabel,
    natal_birth_date: birthDate,
    natal_chart_id: company?.selectedChartId || company?.preferredChartId || null,
    natal_chart_type: chartType,
    natal_birth_time: company?.birthTime || natal?.metadata?.birthTime || null,
    natal_city: company?.city || company?.registeredOffice?.city || natal?.metadata?.city || null,
    natal_timezone: company?.timezone || company?.registeredOffice?.timezone || natal?.metadata?.timezone || null,
    natal_audit_status: company?.auditStatus || "unresolved",
    natal_source_verification: company?.sourceVerification || "unverified",
    natal_anchor_validation: company?.anchorValidation || "untested",
    natal_time_precision: company?.timePrecision || "event-time-assumed",
    natal_model_authority: company?.capitalAuthorityCeiling === "FULL_BUILD_ELIGIBLE"
      ? "VERIFIED"
      : company?.capitalAuthorityCeiling === "PART_BUILD_MAX"
        ? "PROVISIONAL"
        : "RESEARCH_ONLY",
    natal_user_finalized: Boolean(company?.userFinalized),
    natal_production_status: company?.productionStatus || (company?.capitalAuthorityCeiling === "FULL_BUILD_ELIGIBLE" ? "FINAL" : "RESEARCH"),
    natal_source_detail: company?.source || company?.sourceNote || "unknown",
    natal_merger_date: company?.mergerDate || null,
    natal_merger_chart_id: company?.mergerChartId || null,
    natal_merger_date_precision: company?.mergerDatePrecision || null,
    natal_anchor_policy: company?.anchorConfirmation?.mode || company?.dualChartPolicy?.mode || "SINGLE_ANCHOR",
    natal_secondary_chart_id: company?.anchorConfirmation?.secondaryChart?.id || company?.secondaryChartId || null,
    natal_secondary_chart_type: company?.anchorConfirmation?.secondaryChart?.chartType || null,
    natal_secondary_birth_date: company?.anchorConfirmation?.secondaryChart?.date || null,
    natal_secondary_birth_time: company?.anchorConfirmation?.secondaryChart?.time || null,
    natal_anchor_confirmation: company?.anchorConfirmation ? {
      mode: company.anchorConfirmation.mode || null,
      primaryChart: company.anchorConfirmation.primaryChart || null,
      secondaryChart: company.anchorConfirmation.secondaryChart || null,
      current: company.anchorConfirmation.current || null
    } : null,
    natal_chart_role_policy: company?.chartRolePolicy ? {
      mode: company.chartRolePolicy.mode,
      scoresBlended: false,
      roles: company.chartRolePolicy.roles || [],
      doctrine: company.chartRolePolicy.doctrine || null
    } : null,
    natal_company_name: company?.companyName || natal?.metadata?.companyName || company?.symbol,
    natal_calculation: natal?.metadata?.calculation || "ephemeris-derived natal chart",
    registry_source: company?.registrySource || "unknown",
    registry_type: company?.registryType || (company?.registrySource === "built-in-registry" ? "CORE" : "USER"),
    natal_locked: Boolean(company?.locked || company?.registrySource === "built-in-registry"),
    data_lock_note: company?.locked || company?.registrySource === "built-in-registry"
      ? "Core registry stock — natal data locked. Edit only in code."
      : "User-added natal data can be edited in the app."
  };
}

function unresolvedAstro(stock, symbol, error) {
  return {
    structural_cycle: "NATAL DATA PENDING",
    current_pressure: "UNKNOWN",
    next_pressure: "UNKNOWN",
    expansion_current: "Not computed",
    next_ignition: "-",
    current_window: "Add natal data",
    next_event: "Natal chart unavailable",
    days_to_event: "-",
    expected_behaviour:
      "Fin-Lumen has no reliable natal chart for this ticker yet, so stock-specific behaviour is intentionally not inferred.",
    catalyst_label: "Not computed",
    catalyst_strength: "NONE",
    catalyst_readiness: "Add natal data",
    catalyst_response: "Natal chart required before catalyst-to-stock response can be inferred.",
    catalyst_contacts: [],
    expected_drawdown: "Not assessed",
    recovery_window: "Not assessed",
    expansion_quality: "Not assessed",
    phase_risk: "Not assessed",
    leadership_probability: null,
    multibagger_probability: "UNASSESSED",
    current_multibagger_probability: "UNASSESSED",
    cycle_multibagger_potential: "UNASSESSED",
    cycle_potential_score: null,
    cycle_potential_window: "Add natal data",
    cycle_potential_note: "Cycle potential cannot be assessed without a reliable natal chart.",
    environment_signature: "Natal missing",
    cluster_density: null,
    overlap_intensity: {},
    natal_profile: null,
    natal_temperament: null,
    natal_confidence: "NONE",
    natal_source: "missing from natal registry",
    natal_birth_date: null,
    natal_company_name: symbol,
    computed_from_natal: false,
    registry_source: "missing",
    registry_type: "USER",
    natal_locked: false,
    data_quality_note: error || "Company not found in natal registry. Add incorporation/listing date to compute.",
    transit_details: []
  };
}

export async function astroEngine(stock) {
  const ticker = stock?.name || stock?.symbol || "UNKNOWN";
  const requestedAsOf = String(stock?.asOfDate || stock?.as_of_date || "").trim();
  const requestedChartId = String(stock?.chartId || stock?.chart_id || "").trim() || null;
  const includeResearchContext = Boolean(stock?.includeResearchContext || stock?.include_research_context);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(requestedAsOf) ? requestedAsOf : todayDate();
  const company = await resolveCompany(ticker, stock, { asOfDate: date, chartId: requestedChartId });

  if (!company?.found) {
    return unresolvedAstro(stock, ticker, company?.error);
  }

  const natal = generateRealNatalChart(company);
  const transits = generateRealTransits(date);
  const relevantEclipses = getRelevantEclipses(date, {
    daysBefore: 30,
    daysAfter: 30
  });

  const eclipseHits = calculateRealEclipseHits(natal, {
    referenceDate: date,
    daysBefore: 30,
    daysAfter: 30,
    eclipses: relevantEclipses,
    orbLimit: 8
  });

  const resonance = calculateTransitResonance(natal, {
    ...transits,
    relevantEclipses,
    eclipseHits
  });

  const macro = getRealEphemeris(date);
  const catalystScan = scanCatalystToNatal(natal, macro?.phases || [], {
    daysAhead: 45,
    limit: 8
  });

  const windows = scanForwardWindows(natal, date);
  const roleChartReadings = await buildRoleChartReadings({
    ticker,
    stock,
    date,
    company,
    transits,
    relevantEclipses
  });
  let anchorConfirmation = null;
  if (company?.dualChartPolicy?.mode === "ROLE_BASED_CONFIRMATION" && company?.secondaryChartId) {
    const secondaryCompany = await resolveCompany(ticker, stock, { asOfDate: date, chartId: company.secondaryChartId });
    if (secondaryCompany?.found && secondaryCompany.selectedChartId !== company.selectedChartId) {
      const secondaryNatal = generateRealNatalChart(secondaryCompany);
      const secondaryEclipseHits = calculateRealEclipseHits(secondaryNatal, {
        referenceDate: date,
        daysBefore: 30,
        daysAfter: 30,
        eclipses: relevantEclipses,
        orbLimit: 8
      });
      const secondaryResonance = calculateTransitResonance(secondaryNatal, {
        ...transits,
        relevantEclipses,
        eclipseHits: secondaryEclipseHits
      });
      const secondaryWindows = scanForwardWindows(secondaryNatal, date);
      anchorConfirmation = buildDualAnchorConfirmation(
        company,
        resonance,
        windows,
        secondaryCompany,
        secondaryResonance,
        secondaryWindows
      );
    }
  }
  const productionCompany = anchorConfirmation ? { ...company, anchorConfirmation } : company;
  const next = nextWindowFrom(windows, date);
  const natalSource = natalSourceFrom(productionCompany, natal);
  const pressure = pressureLabel(resonance.pressureScore);
  const behaviour = behaviourFromResonance(resonance, catalystScan);
  const natalProfile = resonance.natalProfile || natal.natalProfile;
  const cycleRunway = scoreCycleAsymmetry(resonance, windows, catalystScan, natalProfile, anchorConfirmation);
  const cyclePotentialScore = cycleRunway.score;
  const cyclePotential = cycleRunway.label || cyclePotentialLabel(cyclePotentialScore);
  const cycleNote = cyclePotentialNote(resonance, windows, catalystScan, cyclePotential, cycleRunway);
  const phaseFitValue = phaseFitFrom(windows, resonance, cyclePotential);
  const transitReceptorFit = evaluateTransitReceptorFit({
    company: productionCompany,
    natal,
    transits,
    replay: resonance,
    macro
  });

  const astroModel = buildPureAstroModel({
    replayDate: date,
    replay: resonance,
    windows,
    macroSnapshot: macro,
    transitReceptorFit,
    company: productionCompany,
    catalystScan,
    cyclePotentialScore,
    cyclePotentialDetails: cycleRunway,
    roleChartReadings
  });

  const result = {
    structural_cycle: natalProfile?.natalArchetype || "Computed Natal Profile",
    current_pressure: astroModel.current.pressureClass || pressure,
    next_pressure: resonance.rotationRisk,
    expansion_current: nextExpansionFrom(windows),
    next_ignition: typeof (catalystScan?.best?.daysRemaining ?? next.days) === "number" ? `${catalystScan?.best?.daysRemaining ?? next.days} Days` : next.days,
    current_window: catalystScan?.best?.readiness || resonance.catalystWindow || next.type,
    next_event: catalystScan?.best?.label || next.label,
    days_to_event: catalystScan?.best?.daysRemaining ?? next.days,
    catalyst_label: catalystScan?.best?.label || "No near macro catalyst",
    catalyst_date: catalystScan?.best?.date || null,
    catalyst_exact_ist: catalystScan?.best?.exactIst || null,
    catalyst_strength: catalystScan?.best?.strength || "NO DIRECT HIT",
    catalyst_score: catalystScan?.best?.score || 0,
    catalyst_readiness: catalystScan?.best?.readiness || "Monitor only",
    catalyst_response: catalystScan?.best?.expectedResponse || "No stock-specific macro catalyst response detected.",
    catalyst_macro_behaviour: catalystScan?.best?.macroBehaviour || null,
    catalyst_supportive_natal_contacts: catalystScan?.best?.supportiveNatalContacts || [],
    catalyst_pressuring_natal_contacts: catalystScan?.best?.pressuringNatalContacts || [],
    catalyst_volatile_natal_contacts: catalystScan?.best?.volatileNatalContacts || [],
    catalyst_net_expression: catalystScan?.best?.netExpectedExpression || null,
    catalyst_contacts: catalystScan?.best?.contacts || [],
    catalyst_contact_text: catalystScan?.best?.leadingContactText || catalystScan?.best?.contactText || "No tight natal contact detected",
    expected_behaviour: astroModel.current.story,
    leadership_probability: resonance.leadershipProbability,
    cycle_potential_score: cyclePotentialScore,
    cycle_runway_components: cycleRunway.components,
    cycle_runway_episodes: cycleRunway.episodes,
    cycle_runway_first_break: cycleRunway.firstBreakDate,
    cycle_runway_ideal_threshold: cycleRunway.idealThreshold,
    cycle_runway_exceptional_threshold: cycleRunway.exceptionalThreshold,
    cycle_potential_window: cycleTimingLabel(windows),
    cycle_potential_note: cycleNote,
    cycle_potential_confidence: astroModel.scores.confidence,
    cycle_potential_next_gate: astroModel.windows.nextEvent,
    cycle_potential_next_tactical_gate: astroModel.paths.tactical.find(item => item.start > date) || null,
    cycle_potential_next_strategic_gate: astroModel.paths.strategic.find(item => item.start > date) || null,
    phase_fit: phaseFitValue,
    current_regime_label: resonance.currentRegime || resonance.regime,
    environment_signature: resonance.environmentSignature,
    cluster_density: resonance.clusterDensity,
    overlap_intensity: resonance.overlapIntensity,
    natal_profile: natalProfile,
    natal_temperament: resonance.natalTemperament,
    top_transits: compactTransitText(resonance.transitDetails),
    resonance_profile: resonance.resonanceProfile,
    transit_moon_sign: resonance.transitMoonSign,
    moon_environment: resonance.moonEnvironment,
    current_regime: resonance.currentRegime || resonance.regime,
    pressure_score: resonance.pressureScore,
    expansion_score: resonance.expansionScore,
    environment_type: resonance.environmentType,
    active_clusters: resonance.activeClusters,
    relevant_eclipses: relevantEclipses,
    eclipse_hits: eclipseHits,
    transit_receptor_expression: transitReceptorFit.expressionLabel,
    transit_receptor_class: transitReceptorFit.expressionClass,
    transit_receptor_score: transitReceptorFit.scores.expressionScore,
    transit_receptor_confidence: transitReceptorFit.confidenceLabel,
    astro_model: astroModel,
    production_model_version: astroModel.version,
    production_source: "v37.9.14-full-macro-transit-windows-lock-candidate",
    production_current_state: astroModel.current.state,
    production_single_story: astroModel.current.story,
    production_timing_path: astroModel.paths.strategic,
    production_pressure_window: astroModel.windows.pressure,
    production_rerating_window: astroModel.windows.rerating,
    production_break_risk_window: astroModel.windows.breakRisk,
    production_temporal_interpretation: astroModel.interpretation,
    current_transits: {
      jupiter: {
        degree: transits.positions?.jupiter?.degree,
        sign: transits.positions?.jupiter?.sign
      },
      saturn: {
        degree: transits.positions?.saturn?.degree,
        sign: transits.positions?.saturn?.sign
      },
      rahu: {
        degree: transits.positions?.rahu?.degree,
        sign: transits.positions?.rahu?.sign
      },
      ketu: {
        degree: transits.positions?.ketu?.degree,
        sign: transits.positions?.ketu?.sign
      },
      moon: {
        degree: transits.positions?.moon?.degree,
        sign: getSign(transits.moon)
      }
    },
    ...natalSource
  };

  if (includeResearchContext) {
    result._researchContext = {
      date,
      company: productionCompany,
      natal,
      transits,
      relevantEclipses,
      eclipseHits,
      resonance,
      macro,
      catalystScan,
      windows,
      transitReceptorFit,
      cycleRunway,
      anchorConfirmation,
      roleChartReadings
    };
  }

  return result;
}

export default astroEngine;
