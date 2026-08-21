function normalizeDegree(degree) {
  return (((degree % 360) + 360) % 360);
}

function angleDistance(a, b) {
  const diff = Math.abs(normalizeDegree(a) - normalizeDegree(b));
  return Math.min(diff, 360 - diff);
}

const ASPECTS = [
  { name: "conjunction", angle: 0, orb: 6, weight: 1.0 },
  { name: "opposition", angle: 180, orb: 5, weight: 0.85 },
  { name: "trine", angle: 120, orb: 5, weight: 0.75 },
  { name: "square", angle: 90, orb: 5, weight: 0.65 },
  { name: "sextile", angle: 60, orb: 4, weight: 0.5 }
];

const PLANET_IMPORTANCE = {
  sun: 1.0,
  moon: 1.0,
  mercury: 0.9,
  venus: 1.0,
  mars: 0.85,
  jupiter: 1.0,
  saturn: 0.9,
  rahu: 1.0,
  ketu: 0.8
};

function title(value) {
  return String(value || "")
    .charAt(0)
    .toUpperCase() + String(value || "").slice(1);
}

function getNatalPlanets(natal) {
  return natal?.planets || natal || {};
}

function macroBehaviourForEvent(eventItem = {}) {
  const text = `${eventItem.type || ""} ${eventItem.resultingEnvironment || ""} ${eventItem.label || ""}`.toLowerCase();
  const has = (...needles) => needles.every(needle => text.includes(needle));
  const soft = /trine|sextile/.test(text);
  const hard = /square|opposition/.test(text);

  // Aspect-wide grammar. Planet names alone never decide direction: Saturn in
  // a trine is not automatically pressure, and a Jupiter conjunction is not
  // automatically clean. These classes describe the macro event before the
  // stock's natal receptor is considered.
  if (has("saturn", "mercury") && soft) {
    return {
      tone: "stabilisation",
      class: "DISCIPLINED_STABILISATION",
      label: "Disciplined stabilisation",
      description: "Saturn–Mercury support favours ordered repair, execution and disciplined follow-through inside the wider macro field."
    };
  }
  if (has("saturn", "venus") && hard) {
    return {
      tone: "pressure",
      class: "STRUCTURAL_COMPRESSION",
      label: "Structural valuation compression",
      description: "Saturn–Venus hard pressure tests valuation, preference and patience; supportive natal contacts may buffer but do not become the source of pressure."
    };
  }
  if (has("sun", "rahu") && hard) {
    return {
      tone: "volatility",
      class: "NARRATIVE_VOLATILITY_RESET",
      label: "Narrative volatility and reset",
      description: "Sun–Rahu hard activation amplifies attention, crowd emotion and rotation risk rather than producing simple cooling."
    };
  }
  if (has("jupiter", "mercury") && /conjunction/.test(text)) {
    return {
      tone: "expansion",
      class: "EXPANSION_ACCELERATION",
      label: "Expansion acceleration",
      description: "Jupiter–Mercury conjunction expands narrative, confidence and activity, with overheating or reversal risk if shadow pressure is also active."
    };
  }
  if (has("jupiter", "venus") && (soft || /conjunction/.test(text))) {
    return {
      tone: "expansion",
      class: "SUPPORTIVE_EXPANSION",
      label: "Supportive expansion",
      description: "Jupiter–Venus support favours preference, confidence and rerating; Rahu contacts can add speculative heat."
    };
  }
  if (/eclipse|reset/.test(text)) {
    return {
      tone: "reset",
      class: "RESET_INFLECTION",
      label: "Reset / inflection",
      description: "The eclipse/reset field raises inflection and reversal sensitivity; natal receptors determine whether the reset repairs or breaks."
    };
  }
  if (/retrograde|volatility/.test(text) || (text.includes("rahu") && !soft)) {
    return {
      tone: "volatility",
      class: "VOLATILITY_REVERSAL",
      label: "Volatility and reversal",
      description: "The macro field raises narrative heat, crowd sensitivity and reversal risk."
    };
  }
  if (hard || text.includes("pressure")) {
    return {
      tone: "pressure",
      class: "STRUCTURAL_COMPRESSION",
      label: "Structural pressure",
      description: "The macro field applies compression or discipline; the natal chart determines severity and survivability."
    };
  }
  if (soft || /jupiter|venus|expansion/.test(text)) {
    return {
      tone: "expansion",
      class: "SUPPORTIVE_EXPANSION",
      label: "Supportive expansion",
      description: "The macro field is expansion-supportive; the natal receptor determines strength, cleanliness and durability."
    };
  }
  return {
    tone: "transition",
    class: "MIXED_TRANSITION",
    label: "Mixed transition",
    description: "The macro event is transitional; natal contacts and the wider pressure field determine its expression."
  };
}

function eventTone(eventItem) {
  return macroBehaviourForEvent(eventItem).tone;
}

function eventDegrees(eventItem) {
  const degrees = [];

  if (eventItem?.p1?.degree !== undefined) {
    degrees.push({
      planet: eventItem.p1.planet || eventItem.planets?.[0] || "macro",
      degree: eventItem.p1.degree
    });
  }

  if (eventItem?.p2?.degree !== undefined) {
    degrees.push({
      planet: eventItem.p2.planet || eventItem.planets?.[1] || "macro",
      degree: eventItem.p2.degree
    });
  }

  if (!degrees.length && typeof eventItem?.degree === "number") {
    degrees.push({
      planet: eventItem.planets?.[0] || eventItem.name || eventItem.label || "macro",
      degree: eventItem.degree
    });
  }

  if (!degrees.length && typeof eventItem?.siderealLongitude === "number") {
    degrees.push({
      planet: "eclipse",
      degree: eventItem.siderealLongitude
    });
  }

  return degrees.filter(item => typeof item.degree === "number" && Number.isFinite(item.degree));
}

function scoreHit(macroPlanet, natalPlanet, aspect, orb, tone) {
  const base = Math.max(0, 1 - orb / aspect.orb) * 100 * aspect.weight;
  const natalWeight = PLANET_IMPORTANCE[natalPlanet] || 0.7;
  let multiplier = natalWeight;

  if (tone === "expansion" && ["venus", "jupiter", "moon", "sun", "rahu"].includes(natalPlanet)) {
    multiplier += 0.35;
  }

  if (tone === "pressure" && ["saturn", "mercury", "sun", "mars", "venus"].includes(natalPlanet)) {
    multiplier += 0.3;
  }

  if (tone === "volatility" && ["rahu", "ketu", "moon", "mercury", "mars"].includes(natalPlanet)) {
    multiplier += 0.35;
  }

  if (String(macroPlanet).toLowerCase().includes("jupiter") && ["jupiter", "venus", "moon", "sun", "rahu"].includes(natalPlanet)) {
    multiplier += 0.25;
  }

  if (String(macroPlanet).toLowerCase().includes("venus") && ["venus", "moon", "jupiter", "rahu"].includes(natalPlanet)) {
    multiplier += 0.25;
  }

  return Math.round(base * multiplier);
}

function findNatalHitsForEvent(eventItem, natal) {
  const degrees = eventDegrees(eventItem);
  const natalPlanets = getNatalPlanets(natal);
  const tone = eventTone(eventItem);
  const hits = [];

  for (const macro of degrees) {
    for (const [natalPlanet, natalDegree] of Object.entries(natalPlanets)) {
      if (typeof natalDegree !== "number") {
        continue;
      }

      const distance = angleDistance(macro.degree, natalDegree);

      for (const aspect of ASPECTS) {
        const orb = Math.abs(distance - aspect.angle);

        if (orb <= aspect.orb) {
          hits.push({
            macroPlanet: macro.planet,
            natalPlanet,
            aspect: aspect.name,
            orb: Number(orb.toFixed(2)),
            score: scoreHit(macro.planet, natalPlanet, aspect, orb, tone),
            tone
          });
        }
      }
    }
  }

  return hits
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

function strengthLabel(score) {
  if (score >= 145) return "VERY HIGH";
  if (score >= 100) return "HIGH";
  if (score >= 60) return "MODERATE";
  if (score > 0) return "LOW";
  return "NO DIRECT HIT";
}

function readinessLabel(days, strength, macroBehaviour = {}) {
  if (strength === "NO DIRECT HIT") return "Monitor only";
  if (days <= 2) return "Active now";
  if (days <= 10) return "Near catalyst";
  if (days <= 30) {
    const tone = String(macroBehaviour.tone || "").toLowerCase();
    if (tone === "expansion") return "Prepare for expansion";
    if (["pressure", "volatility", "reset"].includes(tone)) {
      // This is catalyst-contact intensity, not a BREAK classification.  BREAK
      // remains reserved for the sovereign six-month-plus recovery test.
      const pressure = ["VERY HIGH", "HIGH"].includes(strength)
        ? "HIGH"
        : strength === "MODERATE" ? "MEDIUM" : "LOW";
      return `Prepare for ${pressure} pressure`;
    }
    if (tone === "stabilisation") return "Prepare for repair / stabilisation";
    return "Prepare for mapped astro event";
  }
  return "Later window";
}

function contactValence(hit) {
  const macro = String(hit?.macroPlanet || "").toLowerCase();
  const natal = String(hit?.natalPlanet || "").toLowerCase();
  const aspect = String(hit?.aspect || "").toLowerCase();
  if (["square", "opposition"].includes(aspect)) return "PRESSURING";
  if (["trine", "sextile"].includes(aspect)) return "SUPPORTIVE";
  if (aspect === "conjunction") {
    if (["jupiter", "venus"].includes(macro) && ["jupiter", "venus", "sun", "moon", "mercury", "rahu"].includes(natal)) return "SUPPORTIVE";
    if (macro === "saturn" && ["jupiter", "venus", "sun", "moon", "mercury", "mars", "rahu"].includes(natal)) return "PRESSURING";
    if (["rahu", "ketu", "mars", "eclipse"].some(token => macro.includes(token))) return "VOLATILE";
  }
  return "MIXED";
}

function contactLabel(hit) {
  return `${title(hit.macroPlanet)} ${hit.aspect} natal ${hit.natalPlanet} (${hit.orb}°)`;
}

function classifyResponse(eventItem, hits, totalScore) {
  const macroBehaviour = macroBehaviourForEvent(eventItem);
  const tone = macroBehaviour.tone;
  const label = eventItem?.label || "Upcoming macro catalyst";
  const classified = hits.map(hit => ({ ...hit, valence: contactValence(hit) }));
  const supportive = classified.filter(hit => hit.valence === "SUPPORTIVE");
  const pressuring = classified.filter(hit => hit.valence === "PRESSURING");
  const volatile = classified.filter(hit => hit.valence === "VOLATILE");
  const topSupport = supportive[0] || null;
  const topPressure = pressuring[0] || null;
  const topVolatile = volatile[0] || null;
  const supportiveScore = supportive.reduce((sum, hit) => sum + Number(hit.score || 0), 0);
  const pressuringScore = pressuring.reduce((sum, hit) => sum + Number(hit.score || 0), 0);
  const orderedLeaders = tone === "pressure"
    ? [topPressure, topSupport, topVolatile]
    : tone === "volatility" || tone === "reset"
      ? [topVolatile, topPressure, topSupport]
      : [topSupport, topPressure, topVolatile];
  const leadingContacts = [...new Set(orderedLeaders.filter(Boolean).map(contactLabel))].slice(0, 2);

  if (!hits.length) {
    return {
      macroBehaviour,
      supportiveContacts: [],
      pressuringContacts: [],
      volatileContacts: [],
      leadingContacts: [],
      netExpectedExpression: `${label} remains macro background because no strong direct natal receptor is detected.`,
      expectedResponse: `${macroBehaviour.label}. No strong direct natal hit is detected; treat the event as macro background rather than a stock-specific trigger.`
    };
  }

  let netExpectedExpression = "Mixed expression; supportive and pressuring receptors must be carried separately.";
  if (tone === "expansion" && pressuring.length && supportive.length && pressuringScore > supportiveScore * 1.15) {
    netExpectedExpression = "The supportive macro window is strongly contested: natal restraint leads, so compression, delay or reversal risk outweighs clean rerating.";
  } else if (tone === "expansion" && pressuring.length && supportive.length) {
    netExpectedExpression = "Support and restraint are closely balanced; expect a contested rather than one-way rerating passage.";
  } else if (tone === "expansion" && pressuring.length) {
    netExpectedExpression = "The supportive macro window meets a natal constraint; expect compression, delay or reversal risk rather than clean rerating.";
  }
  else if (tone === "expansion" && (supportive.length || totalScore >= 100)) netExpectedExpression = "Constructive rerating and leadership search, subject to the wider pressure field.";
  else if (tone === "pressure" && supportive.length) netExpectedExpression = "Structural compression is partly buffered; expect delayed or disciplined support rather than automatic breakdown.";
  else if (tone === "pressure") netExpectedExpression = "Compression, hesitation or valuation cooling is the dominant expected expression.";
  else if (tone === "stabilisation" && pressuring.length) netExpectedExpression = "Disciplined stabilisation works against a natal constraint; expect delayed repair rather than clean acceleration.";
  else if (tone === "stabilisation") netExpectedExpression = "Ordered stabilisation and repair are favoured, subject to the broader pressure field.";
  else if (tone === "volatility") netExpectedExpression = "Narrative heat, rotation and reversals dominate over clean expansion.";
  else if (tone === "reset") netExpectedExpression = "Inflection/reset potential is active; supportive and pressuring receptors decide whether it repairs or breaks.";

  const receptorParts = [
    topSupport ? `Supportive receptor: ${contactLabel(topSupport)}.` : null,
    topPressure ? `Pressuring receptor: ${contactLabel(topPressure)}.` : null,
    topVolatile ? `Volatile receptor: ${contactLabel(topVolatile)}.` : null
  ].filter(Boolean);
  return {
    macroBehaviour,
    supportiveContacts: supportive.map(contactLabel),
    pressuringContacts: pressuring.map(contactLabel),
    volatileContacts: volatile.map(contactLabel),
    leadingContacts,
    supportiveScore,
    pressuringScore,
    netExpectedExpression,
    expectedResponse: `Macro behaviour: ${macroBehaviour.description} ${receptorParts.join(" ")} Net expected expression: ${netExpectedExpression}`
  };
}

export function scanCatalystToNatal(natal, macroPhases = [], options = {}) {
  const limit = options.limit || 8;
  const candidates = (macroPhases || [])
    .filter(item => typeof item.daysRemaining === "number" || typeof item.daysTill === "number")
    .filter(item => Number(item.daysRemaining ?? item.daysTill) <= (options.daysAhead || 45))
    .slice(0, limit);

  const scored = candidates.map(eventItem => {
    const hits = findNatalHitsForEvent(eventItem, natal);
    const totalScore = hits.reduce((sum, hit) => sum + hit.score, 0);
    const days = Number(eventItem.daysRemaining ?? eventItem.daysTill ?? 999);
    const strength = strengthLabel(totalScore);

    const response = classifyResponse(eventItem, hits, totalScore);
    return {
      label: eventItem.label || eventItem.name || "Macro catalyst",
      date: eventItem.date,
      exactIst: eventItem.exactIst,
      daysRemaining: days,
      tone: eventTone(eventItem),
      strength,
      score: totalScore,
      readiness: readinessLabel(days, strength, response.macroBehaviour),
      contacts: hits,
      contactText: hits.length
        ? hits.slice(0, 3).map(hit => `${title(hit.macroPlanet)} ${hit.aspect} natal ${hit.natalPlanet} (${hit.orb}°)`).join("; ")
        : "No tight natal contact detected",
      leadingContactText: response.leadingContacts.length
        ? response.leadingContacts.join("; ")
        : hits.length
          ? `${title(hits[0].macroPlanet)} ${hits[0].aspect} natal ${hits[0].natalPlanet} (${hits[0].orb}°)`
          : "No tight natal contact detected",
      macroBehaviour: response.macroBehaviour,
      supportiveNatalContacts: response.supportiveContacts,
      pressuringNatalContacts: response.pressuringContacts,
      volatileNatalContacts: response.volatileContacts,
      netExpectedExpression: response.netExpectedExpression,
      expectedResponse: response.expectedResponse
    };
  }).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.daysRemaining - b.daysRemaining;
  });

  const best = scored[0] || null;

  return {
    best,
    candidates: scored,
    summary: best
      ? `${best.label}: ${best.strength} catalyst; ${best.readiness}; ${best.contactText}`
      : "No upcoming macro catalyst available for natal scan."
  };
}

export default scanCatalystToNatal;
