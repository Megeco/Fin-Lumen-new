import { useEffect, useMemo, useState } from "react";

const TODAY = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const human = value => String(value || "—").replaceAll("_", " ");
const clamp = (value, length = 120) => String(value || "—").length > length ? `${String(value).slice(0, length - 1)}…` : String(value || "—");

const EXPANSION_STAGE_TEXT = {
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
};

const PRESSURE_STAGE_TEXT = {
  NO_STRUCTURAL_PRESSURE_SEQUENCE: "No slow pressure pattern",
  PRESSURE_WARNING: "Early pressure warning — not in control",
  VULNERABILITY_FORMING: "Risk is rising, but expansion still leads",
  PRESSURE_ACTIVATION: "Pressure is starting to take control",
  PRESSURE_SOVEREIGN: "Pressure is in control",
  PRESSURE_CULMINATION: "Peak pressure",
  PRESSURE_RELEASE: "Pressure is easing",
  EXPANSION_EXHAUSTION: "Expansion support is fading"
};

const PRESSURE_STAGE_HELP = {
  NO_STRUCTURAL_PRESSURE_SEQUENCE: "No persistent slow-moving pressure pattern is active.",
  PRESSURE_WARNING: "Early warning only: pressure is building, but it has not taken control.",
  VULNERABILITY_FORMING: "Risk is increasing, but expansion still has control. This is not an active decline signal.",
  PRESSURE_ACTIVATION: "Pressure is beginning to overtake support. This marks the changeover, not the strongest pressure point.",
  PRESSURE_SOVEREIGN: "Pressure now has the stronger and more persistent astrological influence.",
  PRESSURE_CULMINATION: "The pressure pattern is near its strongest concentration. It may ease after this, but recovery still needs confirmation.",
  PRESSURE_RELEASE: "The difficult pattern is weakening. Recovery may begin, but it is not automatically established.",
  EXPANSION_EXHAUSTION: "Support is thinning. This is different from a confirmed structural Break-Risk phase."
};

const expansionStageText = stage => EXPANSION_STAGE_TEXT[stage] || human(stage || "unresolved");
const pressureStageText = stage => PRESSURE_STAGE_TEXT[stage] || human(stage || "unresolved");
const pressureStageHelp = stage => PRESSURE_STAGE_HELP[stage] || "This describes how far the pressure pattern has progressed.";
const directionText = (direction, scores = null) => {
  const expansion = Number(scores?.expansion);
  const pressure = Number(scores?.pressure);
  if (Number.isFinite(expansion) && Number.isFinite(pressure)) {
    if (expansion === pressure) return "BALANCED FORCES";
    return expansion > pressure ? "SUPPORT STRONGER" : "PRESSURE STRONGER";
  }
  return direction === "EXPANSION BIAS" ? "SUPPORT STRONGER" : direction === "PRESSURE BIAS" ? "PRESSURE STRONGER" : human(direction);
};

const FIELD_HELP = {
  "Regime": "The plain summary of what has the stronger influence now: support, pressure, recovery, or a mixed phase.",
  "Current Leadership /100": "How well the stock's chart can turn today's support into a clear, sustained move. It is not a return forecast.",
  "Pressure /100": "How much difficult astrology is active now. A high score means more strain, but does not automatically mean Break-Risk.",
  "Expansion /100": "How much supportive astrology is active now. A high score means stronger support, not a guaranteed price rise.",
  "30–60 Day Path": "The first meaningful change expected within the next 60 days.",
  "Next Astro Gate": "The next consequential macro transit that makes a close contact to this stock’s natal chart, with its expected stock-specific effect.",
  "Cycle / Rerating Potential": "The longer 24-month picture: how often expansion returns, how durable it is, and whether serious pressure interrupts it.",
  "Correction Mode": "The kind of weakness shown by the astrology: ordinary churn, slower consolidation, or qualified Break-Risk pressure.",
  "Forward Leadership /100": "How strongly the chart may express its best support across the 3–18 month strategic horizon. It is not a return forecast.",
  "Strategic Path": "The stock-specific pressure, expansion, recovery, and continuation sequence across approximately 3–18 months.",
  "Natal Chart Type": "The company date used for this stock's astrology, such as incorporation, listing, demerger, or statutory formation.",
  "Natal Authority": "How reliable and well-tested that company chart is. This is separate from the astrology scores.",
  "Current Signature": "The main mix of supportive and difficult planetary contacts active now.",
  "Shadow Rerating Outlook": "A research cross-check. It does not override the main reading.",
  "Pressure Window": "A dated period of rising or active strain. The wording tells you whether pressure is merely building, taking control, peaking, or easing.",
  "Cycle Runway": "How much repeat expansion potential appears over the next 24 months, and how well it survives pressure. It does not mean the price must rise for that entire period.",
  "Receptor": "The part of the company's natal chart being activated by a transit.",
  "Top Contacts": "The strongest current planet-to-company-chart contacts behind the reading."
};

function neutralAstroLanguage(value) {
  return String(value || "—")
    .replace(/protection first/gi, "pressure is the dominant macro condition")
    .replace(/protect(?:ion)?(?: into)? strength/gi, "pressure-sensitive expression")
    .replace(/future entry windows/gi, "later release or expansion windows")
    .replace(/entry windows/gi, "expansion windows")
    .replace(/selective accumulation/gi, "selective expansion bias")
    .replace(/fresh capital waits for cleaner absorption/gi, "support is not yet sovereign")
    .replace(/deployment/gi, "expression")
    .replace(/main opportunity/gi, "main support node")
    .replace(/opportunity selection/gi, "support differentiation")
    .replace(/\bOpportunity:/gi, "Support:")
    .replace(/\bRisk:/gi, "Pressure:");
}

function formatDate(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value || "—";
  return `${MONTHS[Number(match[2]) - 1]} ${Number(match[3])}, ${match[1]}`;
}

function range(window) {
  if (!window) return "No mapped window";
  const start = formatDate(window.start || window.date || window.peak);
  const end = formatDate(window.end || window.date || window.peak);
  const bounded = start === end ? start : `${start} – ${end}`;
  return window.continuesBeyondHorizon ? `${bounded} · continues beyond this horizon` : bounded;
}

function windowLine(window) {
  if (!window) return "No separate window mapped";
  if (window.qualificationDate) {
    const status = window.qualificationStatus === "ACTIVE_AS_OF" ? `active on ${formatDate(window.qualificationDate)}` : `qualifies ${formatDate(window.qualificationDate)}`;
    return `${window.label || "Break-Risk window"} · ${range(window)} · ${status}${window.peak && window.peak !== window.qualificationDate ? ` · strongest ${formatDate(window.peak)}` : ""}`;
  }
  return `${window.label || "Astro window"} · ${range(window)}${window.peak && window.peak !== window.start ? ` · peak ${formatDate(window.peak)}` : ""}`;
}

function shadowReratingLine(assessment) {
  const outlook = assessment?.futureOutlook;
  if (!outlook) return "No shadow rerating episode qualified";
  return `${outlook.label} · ignition ${formatDate(outlook.projectedIgnition)} · active ${range(outlook.activeWindow)}`;
}

function shadowPassageLine(outlook) {
  const passages = outlook?.passages || [];
  if (!passages.length) return "No contested or blocked passage mapped inside the episode";
  return passages.map(passage => `${human(passage.type)} · ${range(passage)}${passage.peak ? ` · strongest ${formatDate(passage.peak)}` : ""}`).join(" | ");
}

function toneForState(value) {
  const text = String(value || "").toUpperCase();
  if (text.includes("BREAK")) return "break";
  if (text.includes("PRESSURE") || text.includes("REPAIR") || text.includes("DIGESTION") || text.includes("VOLATIL") || text.includes("RESET")) return "pressure";
  if (text.includes("EXPANSION") || text.includes("RERATING") || text.includes("LEADERSHIP")) return "support";
  return "neutral";
}

function toneForEvent(event) {
  if (!event) return "neutral";
  if (event.pressureClass === "BREAK" || String(event.label || "").toUpperCase().includes("BREAK")) return "break";
  if (event.kind === "PRESSURE") return "pressure";
  if (event.kind === "EXPANSION") return "support";
  return "neutral";
}

function scoreLabel(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return "Unresolved";
  if (score >= 78) return "Strong";
  if (score >= 62) return "Building";
  if (score >= 48) return "Mixed";
  return "Weak";
}

function pressureScoreLabel(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return "Unresolved";
  if (score >= 78) return "Severe";
  if (score >= 68) return "High";
  if (score >= 58) return "Medium";
  return "Low";
}

function macroScoreLabel(kind, value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return "Unresolved";
  if (kind === "pressure") {
    if (score >= 45) return "Extreme";
    if (score >= 28) return "High";
    if (score >= 15) return "Elevated";
    return "Low";
  }
  if (kind === "volatility") {
    if (score >= 30) return "Transition-heavy";
    if (score >= 20) return "Elevated";
    if (score >= 10) return "Building";
    return "Low";
  }
  if (kind === "inflection" || kind === "reset") {
    if (score >= 30) return "Peak";
    if (score >= 20) return "Strong";
    if (score >= 10) return "Active";
    return "Quiet";
  }
  if (score >= 30) return "Strong";
  if (score >= 20) return "Active";
  if (score >= 10) return "Building";
  return "Light";
}

function isCurrentPathEvent(event) {
  return String(event?.eventType || "").startsWith("CURRENT_");
}

function firstForwardEvent(model, horizon = "tactical") {
  return (model?.paths?.[horizon] || []).find(event => !isCurrentPathEvent(event) && (!event.start || event.start > model.asOfDate)) || null;
}

function compactPath(model, horizon = "tactical") {
  const events = (model?.paths?.[horizon] || []).filter(event => !isCurrentPathEvent(event)).slice(0, 2);
  if (!events.length) return { title: "No separate shift mapped", date: "Current state continues", tone: "neutral" };
  return {
    title: events.map(event => event.label).join(" → "),
    date: events.map(event => range(event)).join(" · "),
    tone: toneForEvent(events[0])
  };
}

function stockCardHref(symbol) {
  return `/?stock=${encodeURIComponent(symbol || "")}&view=card`;
}

function openStockPopup(symbol) {
  if (typeof window === "undefined") return;
  window.open(
    stockCardHref(symbol),
    `finlumen-${String(symbol || "stock").replace(/[^a-z0-9]/gi, "-")}`,
    "popup=yes,width=1480,height=920,resizable=yes,scrollbars=yes"
  );
}

function Badge({ children, tone = "neutral" }) {
  return <span className={`badge ${tone}`}>{children || "—"}</span>;
}

function Metric({ label, value, note, tone = "neutral" }) {
  return (
    <div className={`metric ${tone}`}>
      <div className="eyebrow">{label}</div>
      <div className="metric-value">{value || "—"}</div>
      {note ? <div className="muted">{note}</div> : null}
    </div>
  );
}

function ColumnHeader({ label }) {
  const help = FIELD_HELP[label];
  return <span className="column-header" title={help || label}>{label}{help ? <span className="help-dot" aria-label={`${label}: ${help}`}>?</span> : null}</span>;
}

function BalanceBar({ pressure, expansion }) {
  const p = Math.max(0, Math.min(100, Number(pressure) || 0));
  const e = Math.max(0, Math.min(100, Number(expansion) || 0));
  return (
    <div className="balance-cell" title={`Pressure ${p}/100 · Expansion ${e}/100`}>
      <div className="balance-values"><span className="pressure-text">P {p}</span><span className="support-text">E {e}</span></div>
      <div className="balance-track"><span className="pressure-fill" style={{ width: `${p}%` }} /><span className="support-fill" style={{ width: `${e}%` }} /></div>
    </div>
  );
}

function ScoreGuide({ macro = false }) {
  const rows = macro ? [
    ["Pressure", "0–14 low · 15–27 elevated · 28–44 high · 45+ extreme"],
    ["Expansion", "Supportive aspects only. Inflection force is not counted here. 0–9 light · 10–19 building · 20–29 active · 30+ strong"],
    ["Inflection", "A temporary, event-gated turning-point field. It appears only when a validated eclipse corridor is active or approaching; it does not automatically imply a fall or rise. 10–19 active · 20–29 strong · 30+ peak"],
    ["Volatility", "0–9 low · 10–19 building · 20–29 elevated · 30+ transition-heavy"]
  ] : [
    ["Expansion", "How much supportive astrology is active now. 0–47 weak · 48–61 mixed · 62–77 building · 78–100 strong"],
    ["Pressure", "How much difficult astrology is active now. 0–57 low · 58–67 medium · 68–77 high · 78–100 severe"],
    ["Current leadership", "How well the chart can express support now. 0–47 weak · 48–61 mixed · 62–77 building · 78–100 strong"],
    ["Forward leadership", "How well the chart may express its best support across the 3–18 month strategic horizon; not a forecast of returns"],
    ["Cycle runway", "Repeat expansion potential over 24 months and its ability to survive pressure. 0–47 low · 48–61 mixed · 62–77 building · 78–100 strong"]
  ];
  return (
    <details className="score-guide">
      <summary>How to read these scores</summary>
      <div className="score-guide-note">All scores use a 0–100 strength scale. They are not percentages or return forecasts. Support, pressure, inflection intensity and volatility are measured separately, so several forces can be high at the same time.</div>
      <div className="score-guide-grid">{rows.map(([label, meaning]) => <div key={label}><strong>{label}</strong><span>{meaning}</span></div>)}</div>
      {macro ? <div className="score-guide-note">The headline is sovereignty-aware: it uses the active force ledger plus the applying 14-day sequence. A threshold or a larger Expansion number does not by itself establish which force controls immediate expression. Stock-level Break-Risk is never created by a score alone.</div> : null}
    </details>
  );
}

function InfoTable({ rows }) {
  return (
    <div className="info-table">
      {rows.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value, help], index) => (
        <div className="info-row" key={`${label}-${index}`}>
          <div className="info-label" title={help || FIELD_HELP[label] || label}>{label}{help || FIELD_HELP[label] ? <span className="help-dot" aria-label={`${label}: ${help || FIELD_HELP[label]}`}>?</span> : null}</div>
          <div className="info-value">{value}</div>
        </div>
      ))}
    </div>
  );
}

function ResearchSection({ title, note, rows }) {
  return (
    <section className="research-section">
      <div className="research-section-head">
        <h4>{title}</h4>
        {note ? <div className="muted">{note}</div> : null}
      </div>
      <InfoTable rows={rows} />
    </section>
  );
}

function WindowBand({ label, window, tone = "rerating" }) {
  if (!window) return null;
  const expected = distinctExplanation(window.label || human(window.eventType), window.expectedExpression);
  return (
    <div className={`window-band ${tone}`}>
      <div className="window-band-head">
        <span>{label}</span>
        <strong>{window.qualificationDate ? `${range(window)} · ${window.qualificationStatus === "ACTIVE_AS_OF" ? "active on" : "qualifies"} ${formatDate(window.qualificationDate)}${window.peak && window.peak !== window.qualificationDate ? ` · strongest ${formatDate(window.peak)}` : ""}` : range(window)}</strong>
      </div>
      <div className="window-band-title">{window.label || human(window.eventType)}</div>
      {window.reason ? <div>{window.reason}</div> : null}
      {expected ? <div>{expected}</div> : null}
    </div>
  );
}

function distinctExplanation(label, explanation) {
  const text = String(explanation || "").trim();
  if (!text) return "";
  const normalise = value => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();
  return normalise(text) === normalise(label) ? "" : text;
}

function PathTable({ title, subtitle, events = [] }) {
  return (
    <div className="path-card">
      <div className="eyebrow">{title}</div>
      <div className="muted path-subtitle">{subtitle}</div>
      {events.length ? events.map(event => (
        <div className="path-row" key={event.id || `${event.label}-${event.start}`}>
          <div className="path-date">{range(event)}</div>
          <div>
            <strong>{event.label}</strong>
            {distinctExplanation(event.label, event.expectedExpression) ? <div className="muted">{distinctExplanation(event.label, event.expectedExpression)}</div> : null}
            <div className="score-line">E {event.expansion ?? "—"}/100 · P {event.pressure ?? "—"}/100 · L {event.leadership ?? "—"}/100</div>
            {event.pressureStage ? <div className="stage-line">What this means: {pressureStageHelp(event.pressureStage)}</div> : event.pressureClass ? <div className="stage-line">Pressure intensity: {human(event.pressureClass)}</div> : null}
          </div>
        </div>
      )) : <div className="empty">No separate event is mapped inside this horizon.</div>}
    </div>
  );
}

function currentCatalyst(stock) {
  if (!stock?.catalyst_label) return "No near catalyst mapped";
  const timing = `${stock.catalyst_label}${stock.catalyst_date ? ` · ${formatDate(stock.catalyst_date)}` : ""}${Number.isFinite(Number(stock.days_to_event)) ? ` · ${Math.round(stock.days_to_event)} days` : ""}`;
  const contact = String(stock.catalyst_contact_text || "").trim();
  const effect = neutralAstroLanguage(stock.catalyst_net_expression || stock.catalyst_response || "");
  return [timing, contact ? `Leading stock-specific contact${contact.includes(";") ? "s" : ""}: ${contact}.` : "", effect ? `Expected expression: ${effect}` : ""].filter(Boolean).join(" ");
}

function correctionText(model) {
  const mode = model?.current?.correctionMode || "Normal";
  const map = {
    "Volatile Digestion": "Churn and reversals can absorb the active contacts without ending the broader cycle.",
    Discipline: "Pressure can slow or compress expression; the dated support path remains separate.",
    Reset: "Break-Risk pressure. A multi-carrier destructive structural network is qualified.",
    Normal: "No exceptional correction signature is dominant; ordinary volatility remains possible."
  };
  const publicMode = mode.toUpperCase() === "RESET" ? "Break-Risk pressure" : mode;
  return `${publicMode}. ${map[mode] || "Read the dated pressure and expansion windows separately."}`;
}

function correctionModeLabel(model) {
  const mode = String(model?.current?.correctionMode || "—");
  return mode.toUpperCase() === "RESET" ? "BREAK-RISK PRESSURE" : mode;
}

function isConstructiveExpansionEvent(event = {}) {
  if (event.kind !== "EXPANSION") return false;
  const stage = String(event.eventType || event.methodologyStage || "").toUpperCase();
  return ![
    "EXPANSION_EXHAUSTION",
    "CONTINUATION_COMPRESSED",
    "FAILED_RECOVERY_RISK",
    "RELEASE_ONLY"
  ].includes(stage);
}

function isActivePressurePhase(event = {}) {
  if (event.kind !== "PRESSURE") return false;
  const stage = String(event.eventType || event.pressureStage || event.methodologyStage || "").toUpperCase();
  return ["PRESSURE_ACTIVATION", "PRESSURE_SOVEREIGN", "PRESSURE_CULMINATION", "BREAK_PRESSURE"].includes(stage);
}

function strategicOutlookText(model) {
  const events = model?.paths?.strategic || [];
  const first = events[0] || null;
  const expansion = events.find(isConstructiveExpansionEvent) || null;
  const pressure = events.find(isActivePressurePhase) || null;
  const warning = events.find(event => event.kind === "PRESSURE" && !isActivePressurePhase(event) && ["PRESSURE_WARNING", "VULNERABILITY_FORMING"].includes(String(event.eventType || event.pressureStage || "").toUpperCase())) || null;
  const recovery = events.find(event => /RECOVERY|RELEASE|RENEWAL/.test(String(event.eventType || event.methodologyStage || ""))) || null;
  const episodes = model?.cycle?.episodes?.length || 0;
  const postReset = model?.cycle?.postResetEpisodes?.length || 0;
  const parts = [];

  if (model?.cycle?.runwayEndReason === "CURRENT_BREAK_RISK" || model?.cycle?.runwayBeginsUnderCurrentBreakRisk) {
    parts.push("The strategic path begins under an already-qualified Break-Risk phase, so later support is treated as recovery or re-formation rather than an uninterrupted runway.");
  } else if (Number(model?.cycle?.score) >= 78) {
    parts.push(`The longer structure is durable: ${episodes} separate expansion phase${episodes === 1 ? " is" : "s are"} mapped inside the 24-month runway.`);
  } else if (episodes) {
    parts.push(`${episodes} separate expansion phase${episodes === 1 ? " is" : "s are"} mapped, but the runway is interrupted or less persistent.`);
  } else {
    parts.push("No intact expansion runway is present at the start of the scan; any later support must establish itself as a fresh phase.");
  }

  if (first) parts.push(`The first meaningful medium-term change is ${String(first.label || "a new astro phase").toLowerCase()} around ${range(first)}.`);
  if (warning && (!pressure || warning.start < pressure.start)) parts.push(`An earlier pressure warning appears around ${range(warning)}, but expansion still has control at that stage.`);
  if (pressure) parts.push(`The first active pressure phase is ${String(pressure.label || "pressure").toLowerCase()} around ${range(pressure)}.`);
  else parts.push("No active pressure phase is established inside this strategic horizon.");
  if (expansion) parts.push(`The first constructive expansion passage is ${String(expansion.label || "expansion").toLowerCase()} around ${range(expansion)}.`);
  else parts.push("No separate constructive expansion passage is yet established inside this strategic horizon.");
  if (recovery && recovery !== expansion) parts.push(`A separate release or recovery passage appears around ${range(recovery)}.`);
  if (postReset) parts.push(`Expansion re-forms after serious pressure in ${postReset} later phase${postReset === 1 ? "" : "s"}.`);
  return parts.join(" ");
}

function strategicSequenceText(model) {
  const events = model?.paths?.strategic || [];
  if (!events.length) return "No separate strategic transition is mapped; the current structure persists into the medium term.";
  return events.slice(0, 6).map(event => `${event.label} · ${range(event)}`).join(" → ");
}

function longCycleInterpretation(model) {
  const episodes = model?.cycle?.episodes || [];
  const postReset = model?.cycle?.postResetEpisodes || [];
  const end = model?.cycle?.runwayEndDate || model?.cycle?.scanEndDate;
  if (model?.cycle?.runwayEndReason === "CURRENT_BREAK_RISK" || model?.cycle?.runwayBeginsUnderCurrentBreakRisk) {
    return `The cycle begins inside qualified Break-Risk pressure, so its ${model.cycle?.score ?? "—"}/100 runway score describes the absence of an intact starting runway—not the impossibility of later recovery.${postReset.length ? ` Support rebuilds into ${postReset.length} later expansion phase${postReset.length === 1 ? "" : "s"}.` : " No post-pressure expansion phase is yet established."}`;
  }
  if (Number(model?.cycle?.score) >= 78) {
    return `The chart has a strong repeating expansion structure: ${episodes.length} separate phase${episodes.length === 1 ? " is" : "s are"} mapped through ${formatDate(end)}, with pressure survival and leadership durability included in the runway score.`;
  }
  if (episodes.length) {
    return `Expansion remains available but is less continuous: ${episodes.length} separate phase${episodes.length === 1 ? " is" : "s are"} mapped through ${formatDate(end)}. Read the interruption and renewal sequence below rather than treating the runway as uninterrupted.`;
  }
  return "No separate forward expansion phase qualifies inside the measured runway. Later support signals remain visible in the dated stage map but have not formed a durable cycle sequence.";
}

function ResearchDetails({ stock }) {
  const model = stock?.astro_model;
  if (!model) return null;
  const research = model.research || {};
  const natal = model.natal || {};
  const natalRoleText = (natal.chartRolePolicy?.roles || []).map(role => {
    const resolved = (natal.roleCharts || []).find(item => item.chart?.id === role.chartId)?.chart;
    const date = resolved?.date || (role.chartId === natal.primaryChartId ? stock.natal_birth_date : null);
    return `${role.chartId}${date ? ` (${formatDate(date)})` : ""}: ${human(role.role)}`;
  }).join(" · ");
  const breakRead = model.windows?.breakRisk?.breakQualification || research.breakQualification || {};
  const receptor = research.receptor || {};
  const reratingResearch = research.shadowAssessment?.reratingAssessment || {};
  const reratingOutlook = reratingResearch.futureOutlook || null;
  const reratingDiagnostics = reratingOutlook?.diagnostics || {};
  const contacts = research.contacts || [];
  const eclipses = (stock.relevant_eclipses || []).map(item => `${item.label || item.type || "Eclipse"}${item.date ? ` · ${formatDate(item.date)}` : ""}`);
  const hits = (stock.eclipse_hits || []).map(item => {
    const eclipse = `${human(item.eclipseKind || item.eclipseType || "Eclipse")} ${human(item.eclipseType || "eclipse")}`.trim();
    const receptor = human(item.natalPlanet || item.targetPlanet || "unresolved receptor");
    const aspect = human(item.aspect || "contact");
    const orb = Number.isFinite(Number(item.orb)) ? ` (${Number(item.orb).toFixed(2)}°)` : "";
    return `${eclipse} ${aspect} natal ${receptor}${orb}${item.eclipseDate ? ` · ${formatDate(item.eclipseDate)}` : ""}`;
  });
  const cycleEpisodes = model.cycle?.episodes || [];
  const postResetEpisodes = model.cycle?.postResetEpisodes || [];
  const longCycleEvents = model.paths?.longCycle || [];
  const longCycleEventText = longCycleEvents.map(event => `${event.label} · ${range(event)}`).join(" | ");
  const pressureInterruptions = [...(model.paths?.strategic || []), ...longCycleEvents].filter(event => event.kind === "PRESSURE");
  const cycleEpisodeText = cycleEpisodes.map(event => `${event.label || "Expansion"} · ${range(event)}${event.peak ? ` · peak ${formatDate(event.peak)}` : ""}`).join(" | ");
  const postResetText = postResetEpisodes.map(event => `${String(event.label || "Post-pressure re-formation").replace(/post-reset expansion/gi, "Post-pressure re-formation")} · ${range(event)}`).join(" | ");
  const runwayWindow = model.cycle?.runwayBeginsUnderCurrentBreakRisk
    ? `The qualified Break-Risk episode ${range(model.windows?.breakRisk)} is active on ${formatDate(model.asOfDate)}, so no intact runway exists at the scan start.${model.cycle?.runwayStartDate && model.cycle?.separateFutureBreakRiskDate ? ` The first post-current-pressure expansion runway is ${formatDate(model.cycle.runwayStartDate)} – ${formatDate(model.cycle.separateFutureBreakRiskDate)}; it ends at a separate future Break-Risk phase.` : " Any later recovery or re-formation is shown separately."}`
    : model.cycle?.runwayEndReason === "FIRST_BREAK_RISK"
      ? `${formatDate(model.cycle.runwayStartDate)} – ${formatDate(model.cycle.runwayEndDate)} · ${model.cycle.runwayStartsAfterCurrentPressure ? "begins with the first qualified expansion phase after the current pressure and " : ""}ends when the next qualified Break-Risk phase begins.`
      : `${formatDate(model.cycle?.runwayStartDate)} – ${formatDate(model.cycle?.scanEndDate)} · no qualified Break-Risk phase ends the runway inside this 24-month scan.`;
  const lastExpansionEnd = cycleEpisodes.length
    ? cycleEpisodes.map(event => event.end || event.peak || event.start).filter(Boolean).sort().at(-1)
    : null;
  const longCycleSummary = model.cycle?.runwayBeginsUnderCurrentBreakRisk
    ? `The qualified Break-Risk episode ${range(model.windows?.breakRisk)} is active on ${formatDate(model.asOfDate)}. ${cycleEpisodes.length === 1 ? "1 intact runway expansion phase is" : `${cycleEpisodes.length} intact runway expansion phases are`} mapped after the current episode.${model.cycle?.separateFutureBreakRiskDate ? ` A separate future Break-Risk phase begins ${formatDate(model.cycle.separateFutureBreakRiskDate)}.` : ""}${postResetEpisodes.length ? ` Support re-forms after pressure in ${postResetEpisodes.length} later phase${postResetEpisodes.length === 1 ? "" : "s"}.` : ""}`
    : `${cycleEpisodes.length} separate expansion phase${cycleEpisodes.length === 1 ? "" : "s"} mapped. ${model.cycle?.firstBreakRiskDate ? `The first qualified Break-Risk phase begins ${formatDate(model.cycle.firstBreakRiskDate)}.` : `No qualified Break-Risk phase is mapped before ${formatDate(model.cycle?.scanEndDate)}.`}${postResetEpisodes.length ? ` Expansion returns after pressure in ${postResetEpisodes.length} later phase${postResetEpisodes.length === 1 ? "" : "s"}.` : ""}`;
  const synopsisRows = [
    ["Model", `${model.version} · ${model.doctrine}`],
    ["Swiss astronomy", "Direct @swisseph/node calculation · SEFLG_SWIEPH hard-fail policy · sidereal Lahiri · mean lunar node"],
    ["Current astro condition", neutralAstroLanguage(model.current.story)],
    ["3–18 month reading", strategicOutlookText(model)],
    ["Long-cycle interpretation", longCycleInterpretation(model), FIELD_HELP["Cycle Runway"]],
    ["Dominant astro signature", research.environmentSignature || stock.environment_signature || "—"],
    ["Correction / pressure behaviour", correctionText(model)]
  ];
  const scoreRows = [
    ["Expansion", `${model.scores.expansion}/100 · ${scoreLabel(model.scores.expansion)} support`, FIELD_HELP["Expansion /100"]],
    ["Pressure", `${model.scores.pressure}/100 · ${pressureScoreLabel(model.scores.pressure)} pressure`, FIELD_HELP["Pressure /100"]],
    ["Current leadership", `${model.scores.currentLeadership}/100 · ${scoreLabel(model.scores.currentLeadership)} current expression`, FIELD_HELP["Current Leadership /100"]],
    ["Forward leadership", `${model.scores.forwardLeadership}/100 · ${scoreLabel(model.scores.forwardLeadership)} forward expression`, FIELD_HELP["Forward Leadership /100"]],
    ["Cycle runway", `${model.cycle?.level || "—"} · ${model.cycle?.score ?? "—"}/100 · ${cycleEpisodes.length} separate expansion phase${cycleEpisodes.length === 1 ? "" : "s"}`, FIELD_HELP["Cycle Runway"]],
    ["Current expansion stage", expansionStageText(model.current.expansionStage)],
    ["Current pressure stage", `${pressureStageText(model.current.pressureStage)}. ${pressureStageHelp(model.current.pressureStage)}`]
  ];
  const natalAnchorId = stock.natal_chart_id || natal.primaryChartId || "—";
  const natalAnchorType = stock.natal_chart_type || "—";
  const natalAnchorIdentity = String(natalAnchorId).toLowerCase() === String(natalAnchorType).toLowerCase()
    ? natalAnchorId
    : `${natalAnchorId} · ${natalAnchorType}`;
  const natalRows = [
    ["Natal authority", `${natal.chartAuthority || "—"} · reliability ${natal.reliability ?? "—"}/100 · ${natal.sourceVerification || "unverified"} · ${natal.anchorValidation || "untested"}`],
    ["Natal anchor", `${natalAnchorIdentity} · ${formatDate(stock.natal_birth_date)} ${stock.natal_birth_time || ""} · ${stock.natal_city || "—"}`],
    ["Time precision", `${natal.timePrecision || stock.natal_time_precision || "unknown"}. Proxy or uncertain times do not authorise angles or houses.`],
    ["Anchor policy", `${natal.anchorPolicy || "SINGLE ANCHOR"}${natal.secondaryChartId ? ` · secondary ${natal.secondaryChartId} · ${human(natal.confirmationState)}` : ""}`],
    ["Chart roles", natalRoleText || `${natal.primaryChartId || "single anchor"}: all authorised questions`],
    ["Natal behaviour archetype", stock.structural_cycle || "Computed natal profile"],
    ["Chart fingerprint", natal.chartFingerprintCollision ? `Collision blocked · also used by ${(natal.chartFingerprintPeers || []).join(", ")}` : "Unique within the production registry"]
  ];
  const transitRows = [
    ["Current signature", research.environmentSignature || stock.environment_signature || "—"],
    ["Active clusters", (research.clusters || []).join(" + ") || "No dense cluster mapped"],
    ["Catalyst timing", currentCatalyst(stock)],
    ["Transit receptor", `${receptor.expressionLabel || stock.transit_receptor_expression || "—"} · score ${receptor.scores?.expression ?? stock.transit_receptor_score ?? "—"} · ${receptor.confidenceLabel || stock.transit_receptor_confidence || "—"}`],
    ["Receptor basis", `Natal reliability ${receptor.scores?.natalReliability ?? "—"} · receptor strength ${receptor.scores?.receptorStrength ?? "—"} · theme fit ${receptor.scores?.themeFit ?? "—"} · pressure interference ${receptor.scores?.pressureInterference ?? "—"}`],
    ["Supportive receptors", (research.supportiveContacts || []).join(" | ") || "No separate supportive receptor mapped"],
    ["Pressuring receptors", (research.pressuringContacts || []).join(" | ") || "No separate pressuring receptor mapped"],
    ["Volatility triggers", (research.volatileContacts || []).join(" | ") || "No separate volatility trigger mapped"],
    ["Current contacts", neutralAstroLanguage(contacts.slice(0, 12).join(" | ") || stock.top_transits || "—")],
    ["Eclipses in scope", eclipses.join(" | ") || "No eclipse in the active scope"],
    ["Eclipse natal hits", hits.join(" | ") || "No material eclipse-to-natal hit in the active orb"],
    ["Next major transit response", neutralAstroLanguage(stock.catalyst_response || "—")]
  ];
  const sovereigntyRows = [
    ["Production expansion stage", expansionStageText(model.current.expansionStage)],
    ["Production pressure stage", `${pressureStageText(model.current.pressureStage)}. ${pressureStageHelp(model.current.pressureStage)}`],
    ["Rerating window", windowLine(model.windows?.rerating)],
    ["Break-Risk window", windowLine(model.windows?.breakRisk)],
    ["Break-Risk constitution", `${breakRead.label || "NO BREAK-RISK MAPPED"}. Basis: ${human(breakRead.basis)}; destructive network ${breakRead.destructiveNetwork ? "present" : "absent"}; score corroboration ${breakRead.scoreCorroborated ? "present" : "absent"}; ${breakRead.dualAnchorRequired ? `dual-anchor agreement ${breakRead.dualAnchorConfirmed ? "present" : "absent"}` : "single sovereign anchor"}.`],
    ["Break-Risk timing rule", breakRead.timingRule || "Elapsed time never creates Break-Risk."],
    ["Future support context", `${breakRead.futureSupportDate ? `support returns ${formatDate(breakRead.futureSupportDate)}` : "no separate support-return date mapped"}; ${breakRead.futureExpansionRecoveryDate ? `stronger expansion returns ${formatDate(breakRead.futureExpansionRecoveryDate)}` : "no separate expansion-recovery date mapped"}. These dates describe the later path; they do not determine Break-Risk.`],
    ["Pressure evidence tested for Break-Risk", (breakRead.evidence || []).join(" | ") || "No destructive evidence ledger mapped"]
  ];
  const shadowRows = [
    ["Shadow rerating cross-check", `${human(reratingResearch.presentState || "ABSENT")} now · ${shadowReratingLine(reratingResearch)}. Diagnostic reference only; temporal sovereignty remains authoritative.`],
    ["Projected ignition", reratingOutlook ? formatDate(reratingOutlook.projectedIgnition) : "No projected rerating ignition qualified"],
    ["Active rerating window", reratingOutlook ? range(reratingOutlook.activeWindow) : "No complete rerating episode qualified"],
    ["Strongest astro phase", reratingOutlook?.strongestAstroPhase?.date ? `Around ${formatDate(reratingOutlook.strongestAstroPhase.date)}. This is concentrated astrology, not a price peak.` : "No separate strongest phase mapped"],
    ["Contested / blocked passage", shadowPassageLine(reratingOutlook)],
    ["Rerating natal-authority limit", reratingOutlook?.authorityLimit ? human(reratingOutlook.authorityLimit) : reratingOutlook ? `${human(reratingOutlook.authority)} authority; no additional shadow downgrade` : "Not applicable"],
    ["Expansion sovereignty diagnostic", reratingOutlook ? `Median E−P ${reratingDiagnostics.medianExpansionSpread ?? "—"} · E>P ${reratingDiagnostics.expansionSovereigntyShare ?? "—"}% · meaningful sovereignty ${reratingDiagnostics.meaningfulSovereigntyShare ?? "—"}% · leadership persistence ${reratingDiagnostics.leadershipPersistence ?? "—"}% · ${reratingDiagnostics.durationDays ?? "—"} days` : "No qualifying episode"],
    ["Rerating causal network", reratingOutlook ? `${reratingDiagnostics.causalNetwork ? "Present" : "Absent"} · operative families ${(reratingDiagnostics.supportFamilies || []).join(", ") || "none"} · foundational contacts ${reratingDiagnostics.foundationalContactCount ?? 0} · macro permission ${reratingDiagnostics.macroPermission ? "present" : "absent"}` : "No qualifying episode"]
  ];
  const cycleRows = [
    ["Long-cycle strength", `${model.cycle?.level || "—"} · ${model.cycle?.score ?? "—"}/100 · ${cycleEpisodes.length} separate expansion phase${cycleEpisodes.length === 1 ? "" : "s"}.`, FIELD_HELP["Cycle Runway"]],
    ["Long-cycle interpretation", longCycleInterpretation(model), FIELD_HELP["Cycle Runway"]],
    ["Dated runway window", runwayWindow, FIELD_HELP["Cycle Runway"]],
    ["Long-cycle summary", longCycleSummary],
    ["Last mapped expansion phase ends", lastExpansionEnd ? formatDate(lastExpansionEnd) : "No separate expansion phase is mapped inside the 24-month runway."],
    ["Long-cycle expansion sequence", cycleEpisodeText || "No separate forward expansion phase is mapped inside the current horizon."],
    ["Beyond 18-month stage map", longCycleEventText || "No separate stage transition is mapped from month 19 through month 36."],
    ["Pressure interruptions", pressureInterruptions.length ? pressureInterruptions.map(event => `${event.label} · ${range(event)}`).join(" | ") : "No separate pressure interruption is mapped across the Strategic and long-cycle horizons."],
    ["Does expansion return after serious pressure?", postResetEpisodes.length ? `Yes. Expansion re-forms in ${postResetEpisodes.length} later phase${postResetEpisodes.length === 1 ? "" : "s"}.` : model.cycle?.firstBreakRiskDate ? "Not yet mapped after the first Break-Risk interruption." : "No qualified Break-Risk interruption occurs inside the measured runway."],
    ["Post-pressure re-formation", postResetText || "No separate post-pressure expansion episode is mapped."],
    ["Long-cycle activation planets", (model.cycle?.activationPlanets || []).join(", ") || "No dominant activation planet isolated."],
    [model.cycle?.runwayBeginsUnderCurrentBreakRisk ? "Break-Risk cycle status" : "First mapped Break-Risk date", model.cycle?.runwayBeginsUnderCurrentBreakRisk ? `${range(model.windows?.breakRisk)} · active on ${formatDate(model.asOfDate)}.${model.cycle?.separateFutureBreakRiskDate ? ` A separate future Break-Risk phase begins ${formatDate(model.cycle.separateFutureBreakRiskDate)}.` : " No separate future Break-Risk phase is mapped inside the cycle scan."}` : model.cycle?.firstBreakRiskDate ? formatDate(model.cycle.firstBreakRiskDate) : "No separate Break-Risk date is mapped inside the cycle scan."],
    ["Runway components", Object.entries(model.cycle?.components || {}).map(([key, value]) => `${human(key)} ${value}`).join(" · ") || "—"]
  ];
  return (
    <details className="research-details">
      <summary>Astro Research Details</summary>
      <div className="research-intro">A stock-specific reading of the current sky, the medium-term path, natal authority, causal transit evidence, and the wider cycle. This panel describes astrology only.</div>
      <ResearchSection title="Astro Synopsis" note="The old panel's useful broad view, rebuilt with the current temporal-sovereignty method." rows={synopsisRows} />
      <ResearchSection title="Scores & Cycle Position" note="All scores are 0–100 strengths, not percentages or return forecasts." rows={scoreRows} />
      <ResearchSection title="Natal Chart & Behaviour" note="Which company chart is speaking, how reliable it is, and what kind of behaviour it is authorised to describe." rows={natalRows} />
      <ResearchSection title="Current Transit Evidence" note="The active planetary network and the natal receptors through which it is expressing." rows={transitRows} />
      <ResearchSection title="Temporal Sovereignty Evidence" note="Formation, expansion, pressure, Break-Risk, release, and recovery are kept causally separate." rows={sovereigntyRows} />
      <ResearchSection title="Advanced Rerating Cross-check" note="Research diagnostic only. It never overrides the production temporal-sovereignty reading." rows={shadowRows} />
      <ResearchSection title="Long-Cycle Map" note="The full expansion sequence, interruptions, survival, renewal, and the path beyond the 18-month Strategic View." rows={cycleRows} />
    </details>
  );
}

function PureAstroCard({ stock, onClose, onDelete, standalone = false }) {
  const model = stock?.astro_model;
  if (!model) {
    return (
      <div className="expanded-card">
        <div className="detail-head"><div><div className="eyebrow">Expanded stock card</div><h2>{stock?.name}</h2></div><button onClick={onClose}>{standalone ? "Back to table" : "Close"}</button></div>
        <div className="empty">{stock?.astro_error || "Natal data is pending. Add or verify the chart to generate a stock-specific reading."}</div>
      </div>
    );
  }
  const tactical = model.paths?.tactical || [];
  const strategic = model.paths?.strategic || [];
  const pressure = model.windows?.pressure;
  const rerating = model.windows?.rerating;
  const breakRisk = model.windows?.breakRisk;
  const formation = model.windows?.formation;
  const continuation = model.windows?.continuation;
  const exhaustion = model.windows?.exhaustion;
  const recovery = model.windows?.recovery;
  const pressureWarning = model.windows?.pressureWarning;
  const tacticalForward = tactical.filter(event => !isCurrentPathEvent(event) && (!event.start || event.start > model.asOfDate));
  const tacticalPressure = tacticalForward.find(event => event.kind === "PRESSURE") || null;
  const tacticalRecovery = tacticalForward.find(event => /RECOVERY|RELEASE|RENEWAL/.test(String(event.eventType || event.methodologyStage || ""))) || null;
  const strategicPressure = strategic.find(isActivePressurePhase) || null;
  const strategicExpansion = strategic.find(isConstructiveExpansionEvent) || null;
  const registry = `${stock.registry_type || "USER"} · ${stock.natal_locked ? "Locked" : "Editable"}`;
  const natalAuthority = model.natal?.chartAuthority || "RESEARCH_ONLY";
  const natalReliability = model.natal?.reliability ?? "—";
  const limitedNatalAuthority = natalAuthority !== "VERIFIED";
  const cycleDateText = model.cycle.runwayEndReason === "CURRENT_BREAK_RISK" || model.cycle.runwayBeginsUnderCurrentBreakRisk
    ? "no intact runway at the scan start"
    : model.cycle.runwayStartsAfterCurrentPressure
      ? `${formatDate(model.cycle.runwayStartDate)} to ${formatDate(model.cycle.runwayEndDate)}`
      : `measured to ${formatDate(model.cycle.runwayEndDate)}`;
  const cyclePhaseText = model.cycle.runwayBeginsUnderCurrentBreakRisk
    ? `${model.cycle.episodes?.length || 0} intact post-current-pressure expansion phase${model.cycle.episodes?.length === 1 ? "" : "s"}${model.cycle.postResetEpisodes?.length ? ` + ${model.cycle.postResetEpisodes.length} post-pressure re-formation phase${model.cycle.postResetEpisodes.length === 1 ? "" : "s"}` : ""}`
    : `${model.cycle.episodes?.length || 0} intact expansion phase${model.cycle.episodes?.length === 1 ? "" : "s"}${model.cycle.postResetEpisodes?.length ? ` before Break-Risk + ${model.cycle.postResetEpisodes.length} post-pressure rebuild phase${model.cycle.postResetEpisodes.length === 1 ? "" : "s"}` : ""}`;
  const tacticalRows = [
    ["Current state", model.current.state],
    ["Pressure / expansion", `Pressure ${model.scores.pressure}/100 · Expansion ${model.scores.expansion}/100 · ${directionText(model.current.direction, model.scores)}`],
    ["Current leadership", `${model.scores.currentLeadership}/100 · ${model.current.velocity} velocity`, FIELD_HELP["Current Leadership /100"]],
    ["Expansion stage", expansionStageText(model.current.expansionStage)],
    ["Pressure stage", pressureStageText(model.current.pressureStage), pressureStageHelp(model.current.pressureStage)],
    ["Next consequential catalyst", currentCatalyst(stock)],
    ["Next pressure change", windowLine(tacticalPressure)],
    ["Next tactical recovery / release", windowLine(tacticalRecovery)],
    ["Correction behaviour", correctionText(model)],
    ["Expected expression", neutralAstroLanguage(model.current.story)]
  ];
  const strategicRows = [
    ["What to expect", strategicOutlookText(model)],
    ["Likely sequence", strategicSequenceText(model), FIELD_HELP["Strategic Path"]],
    ["Forward leadership", `${model.scores.forwardLeadership}/100`, FIELD_HELP["Forward Leadership /100"]],
    ["Cycle runway", `${model.cycle.level} · ${model.cycle.score}/100 · ${cyclePhaseText} · ${cycleDateText}`, FIELD_HELP["Cycle Runway"]],
    ["Next constructive expansion phase", windowLine(strategicExpansion)],
    ["Next active pressure phase", windowLine(strategicPressure)]
  ];
  return (
    <div className="expanded-card">
      <div className="detail-head">
        <div><div className="eyebrow">Expanded stock card</div><h2>{stock.name}</h2><div className="muted">Simple story first; tactical and strategic astrology separated below.</div></div>
        <div className="detail-actions">
          {!stock.natal_locked && onDelete ? <button className="danger-button" onClick={() => onDelete(stock)}>Remove</button> : null}
          {!standalone ? <button onClick={() => openStockPopup(stock.name)}>Open pop-up</button> : null}
          {!standalone ? <a className="button-link" href={stockCardHref(stock.name)} target="_blank" rel="noreferrer">Open new tab</a> : null}
          <button onClick={onClose}>{standalone ? "Back to table" : "Close"}</button>
        </div>
      </div>
      <div className="summary-card">
        <div className="summary-head"><div><div className="eyebrow">v37.9.14 Pure Astro · full-window lock candidate</div><h3>{model.current.state} · {directionText(model.current.direction, model.scores)}</h3></div><div className="registry"><div className="eyebrow">Natal authority</div>{human(natalAuthority)} · reliability {natalReliability}/100<div className="muted">Registry: {registry}</div></div></div>
        {limitedNatalAuthority ? <div className="authority-warning"><strong>{natalAuthority === "RESEARCH_ONLY" ? "Research-only natal authority." : "Provisional natal authority."}</strong> Stock-specific timing and classification remain provisional until this anchor is replay-validated.</div> : null}
        <WindowBand label="Rerating Window" window={rerating} tone="rerating" />
        <WindowBand label="Break-Risk Window" window={breakRisk} tone="break" />
        <div className="story-band">{model.current.story}</div>
        <div className="view-grid">
          <div className="view-card"><div className="eyebrow">30–60 days</div><h4>Tactical View</h4><InfoTable rows={tacticalRows} /></div>
          <div className="view-card"><div className="eyebrow">3–18 months</div><h4>Strategic View</h4><InfoTable rows={strategicRows} /></div>
        </div>
      </div>
      <div className="path-grid">
        <PathTable title="Tactical Timing Path" subtitle="Current state plus every mapped event inside 60 days." events={tactical} />
        <PathTable title="Strategic Timing Path" subtitle="The stock-specific pressure, expansion, recovery, and continuation sequence across approximately 3–18 months." events={strategic} />
      </div>
      <ResearchDetails stock={stock} />
    </div>
  );
}

function StockCardModal({ stock, onClose, onDelete }) {
  useEffect(() => {
    if (!stock) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = event => event.key === "Escape" && onClose?.();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [stock, onClose]);

  if (!stock) return null;
  return (
    <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose?.()}>
      <div className="modal-shell" role="dialog" aria-modal="true" aria-label={`${stock.name} expanded astro card`}>
        <PureAstroCard stock={stock} onClose={onClose} onDelete={onDelete} />
      </div>
    </div>
  );
}

function publicMacroLabel(value) {
  return String(value || "Macro field")
    .replace(/RESET/g, "INFLECTION")
    .replace(/\s*\/\s*/g, " · ");
}

function inflectionLabel(value) {
  const score = Number(value || 0);
  if (score >= 30) return "Peak";
  if (score >= 20) return "Strong";
  if (score >= 10) return "Active";
  return "Quiet";
}

function macroTimingText(event, asOfDate) {
  const hasWindow = event?.windowStart && event?.windowEnd;
  if (!hasWindow) {
    return `${human(event?.status || event?.phase || event?.timing || "active")} · ${event?.timing || formatDate(event?.date)}`;
  }
  const episode = range({ start: event.windowStart, end: event.windowEnd });
  const isEclipse = /eclipse/i.test(String(event.label || ""));
  const exact = event.exactDate ? ` · ${isEclipse ? "maximum" : "exact"} ${formatDate(event.exactDate)}` : "";
  const activeEvidence = event.evidenceRole === "active score evidence";
  const phase = String(event.status || event.phase || "ACTIVE").toUpperCase();
  const status = activeEvidence
    ? ` · ${phase === "ACTIVE" ? "active" : human(phase).toLowerCase()} on ${formatDate(asOfDate)}`
    : event.timing ? ` · ${event.timing}` : "";
  return `${episode}${exact}${status}`;
}

function MacroEvidenceTable({ title, events = [], empty, asOfDate }) {
  return (
    <section className="macro-evidence-section">
      <div className="research-section-head"><h4>{title}</h4></div>
      {events.length ? <div className="macro-evidence-table">
        <div className="macro-evidence-head"><span>Transit</span><span>Phase / timing</span><span>Orb</span><span>Score role</span><span>Astrological meaning</span></div>
        {events.map((event, index) => <div className="macro-evidence-row" key={`${title}-${event.label}-${event.date}-${index}`}>
          <strong>{event.label}</strong>
          <span>{macroTimingText(event, asOfDate)}</span>
          <span>{event.orb !== null && event.orb !== undefined ? `${event.orb}°${event.orbTrend ? ` · ${event.orbTrend}` : ""}` : "—"}</span>
          <span>{event.contribution || "Context only"}</span>
          <span>{neutralAstroLanguage(event.explanation || event.meaning || event.notes || "Stock-specific natal contacts decide expression.")}</span>
        </div>)}
      </div> : <div className="empty">{empty || "No separate evidence mapped."}</div>}
    </section>
  );
}

function MacroPanel({ macro }) {
  const [research, setResearch] = useState(false);
  if (!macro) return <div className="panel empty">Macro environment is loading…</div>;
  const readable = macro.macroReadable || {};
  const activeEvents = (macro.activeEvents || []).slice(0, 6);
  const evidence = readable.researchEvidence || {};
  const pressureExplanation = readable.pressureExplanation || {};
  const pressureSequence = pressureExplanation.sequence || [];
  const label = publicMacroLabel(macro.environmentLabel || macro.environment || readable.headline);
  const inflectionScore = Number(macro.inflectionScore ?? macro.resetScore ?? 0);
  const inflectionActive = inflectionScore > 0;
  return (
    <section className="panel macro-panel">
      <div className="section-head"><div><div className="eyebrow">Market Astro Environment</div><h2>{label}</h2><div className="muted macro-headline">{neutralAstroLanguage(pressureExplanation.summary || readable.headline || macro.behaviour || "Current macro weather from the live sidereal sky.")}</div></div><div className="macro-view-actions"><div className="view-tabs" role="group" aria-label="Macro detail"><button className={!research ? "active" : ""} aria-pressed={!research} onClick={() => setResearch(false)}>Simple</button><button className={research ? "active" : ""} aria-pressed={research} onClick={() => setResearch(true)}>Research</button></div><Badge tone="support">Swiss Ephemeris · Lahiri</Badge></div></div>
      {!research ? <>
      <div className="macro-grid">
        <Metric label="Date" value={formatDate(macro.date)} />
        <Metric label="Pressure /100" value={macro.pressureScore} note={macroScoreLabel("pressure", macro.pressureScore)} tone="pressure" />
        <Metric label="Expansion /100" value={macro.expansionScore} note={macroScoreLabel("expansion", macro.expansionScore)} tone="support" />
        <Metric label="Volatility /100" value={macro.volatilityScore ?? macro.volatility} note={macroScoreLabel("volatility", macro.volatilityScore ?? macro.volatility)} />
        {inflectionActive ? <Metric label="Inflection" value={inflectionLabel(inflectionScore)} note="Temporary eclipse turning-point field; not automatically positive or negative" tone="pressure" /> : null}
        <Metric label="Moon" value={macro.moonSign || macro.moonEnvironment} />
      </div>
      <div className="macro-two macro-focus-grid">
        <div className="macro-focus pressure"><div className="eyebrow">What is happening now?</div><strong>{label}</strong><div className="muted">{neutralAstroLanguage(pressureExplanation.summary || readable.stockImplication || "The current macro sequence is mixed.")}</div><div className="macro-definition">Pressure describes the shared market weather. It can delay or distort expression without requiring every stock to fall.</div></div>
        <div className="macro-focus support"><div className="eyebrow">Support active underneath</div><strong>{readable.mainOpportunity?.label || macro.nextShift?.label || "No dominant support node"}</strong><div className="muted">{neutralAstroLanguage(readable.mainOpportunity?.meaning || readable.mainOpportunity?.notes || "Stock-specific natal receptors decide expression.")}</div></div>
      </div>
      <div className="macro-meaning"><strong>Why pressure is active:</strong> {neutralAstroLanguage(pressureExplanation.eclipseClimate || "The active and applying transit sequence is shown below.")}</div>
      {pressureSequence.length ? <div className="event-list simple-pressure-sequence">{pressureSequence.slice(0, 6).map((event, index) => <div key={`${event.label}-${event.date}-${index}`}><strong>{event.label}</strong> · {macroTimingText(event, macro.date)}<div className="muted">{neutralAstroLanguage(event.explanation || event.meaning || event.notes)}</div></div>)}</div> : null}
      </> : <>
        <div className="macro-grid research-macro-grid">
          <Metric label="Date" value={formatDate(macro.date)} />
          <Metric label="Pressure /100" value={macro.pressureScore} note={macroScoreLabel("pressure", macro.pressureScore)} tone="pressure" />
          <Metric label="Expansion /100" value={macro.expansionScore} note={macroScoreLabel("expansion", macro.expansionScore)} tone="support" />
          {inflectionActive ? <Metric label="Inflection /100" value={inflectionScore} note={macroScoreLabel("inflection", inflectionScore)} tone="pressure" /> : null}
          <Metric label="Volatility /100" value={macro.volatilityScore ?? macro.volatility} note={macroScoreLabel("volatility", macro.volatilityScore ?? macro.volatility)} />
          <Metric label="Transition /100" value={macro.macroAnalytics?.transitionScore ?? 0} note="Weighted background force" />
        </div>
        <ScoreGuide macro />
        <div className="macro-meaning"><strong>Why the classifier chose this state:</strong> {neutralAstroLanguage(evidence.sovereignty?.message || pressureExplanation.summary || "No separate sovereignty explanation mapped.")} <span className="muted">Rule: {evidence.sovereignty?.rule || "active forces plus applying sequence"}.</span></div>
        <MacroEvidenceTable title="Active transit evidence and score contribution" events={evidence.active || activeEvents} asOfDate={macro.date} />
        <MacroEvidenceTable title="Applying transits — next 14 days" events={evidence.applying14Days || []} empty="No separate applying transit is mapped inside 14 days." asOfDate={macro.date} />
      </>}
    </section>
  );
}

function Next30DaysPanel({ macro }) {
  if (!macro) return <section className="panel empty">The next 30-day map is loading…</section>;
  const readable = macro.macroReadable || {};
  const events = [...(readable.next30Days || []), ...(macro.phases || [])]
    .filter((event, index, all) => all.findIndex(other => (other.label || other.name) === (event.label || event.name) && (other.date || other.exactIst) === (event.date || event.exactIst)) === index)
    .slice(0, 12);
  return (
    <section className="panel next30-panel">
      <div className="section-head"><div><div className="eyebrow">Forward Macro Timing</div><h2>Next 30 Days</h2><div className="muted">Dated support, pressure, volatility and transition nodes from the same Swiss-backed environment.</div></div><Badge tone="support">Date ordered</Badge></div>
      <div className="next30-grid">
        {events.length ? events.map((event, index) => {
          const tone = toneForState(`${event.phase || ""} ${event.meaning || ""} ${event.notes || ""}`);
          return <article className={`next30-card ${tone}`} key={`${event.label || event.name}-${event.date || event.exactIst}-${index}`}><div className="event-date">{formatDate(event.date || event.exactIst)}</div><strong>{event.label || event.name || "Astro event"}</strong><div className="muted">{neutralAstroLanguage(event.meaning || event.notes || event.behaviour || event.phase || "Natal receptors determine stock-specific expression.")}</div></article>;
        }) : <div className="empty">No separate event is mapped inside the next 30 days.</div>}
      </div>
    </section>
  );
}

function AstroLegend() {
  const items = [
    ["Rerating / Expansion", "Supportive structure is leading; green and teal mark expansion-biased states and rerating windows.", "support"],
    ["Pressure Digestion", "Support and pressure coexist; amber marks churn, compression or contested expression.", "pressure"],
    ["High Pressure", "Pressure is materially dominant; mild red marks a defined stress window without automatically implying Break-Risk.", "high"],
    ["Break-Risk", "Deep red appears only when the destructive structural-contact constitution qualifies independently.", "break"],
    ["Transition / Pending", "Blue or grey marks a mixed transition, an unclassified catalyst, or natal data awaiting resolution.", "neutral"]
  ];
  return (
    <section className="panel legend-panel">
      <div className="section-head"><div><div className="eyebrow">Reading Guide</div><h2>Astro State Legend</h2><div className="muted">This legend explains the model’s astro states, colours and dated windows.</div></div></div>
      <div className="legend-grid">{items.map(([label, meaning, tone]) => <div className={`legend-card ${tone}`} key={label}><Badge tone={tone === "high" ? "pressure" : tone}>{label}</Badge><p>{meaning}</p></div>)}</div>
    </section>
  );
}

function EnvironmentTabs({ active, onChange }) {
  const tabs = [
    ["MACRO", "Macro Astro Environment"],
    ["NEXT30", "Next 30 Days"],
    ["LEGEND", "Astro State Legend"]
  ];
  return <nav className="environment-tabs" aria-label="Astro environment views">{tabs.map(([value, label]) => <button key={value} type="button" className={active === value ? "active" : ""} aria-pressed={active === value} onClick={() => onChange(value)}>{label}</button>)}</nav>;
}

function PriorityPanels({ stocks, onSelect }) {
  const computed = stocks.filter(stock => stock.astro_model);
  const groups = [
    ["Active expansion", computed.filter(stock => /EXPANSION|RERATING|LEADERSHIP/.test(stock.astro_model.current.state)).sort((a, b) => b.astro_model.scores.expansion - a.astro_model.scores.expansion)],
    ["Forward rerating", computed.filter(stock => stock.astro_model.windows.rerating).sort((a, b) => String(a.astro_model.windows.rerating.start).localeCompare(String(b.astro_model.windows.rerating.start)))],
    ["Pressure windows", computed.filter(stock => stock.astro_model.windows.pressure).sort((a, b) => String(a.astro_model.windows.pressure.start).localeCompare(String(b.astro_model.windows.pressure.start)))],
    ["Break-Risk windows", computed.filter(stock => stock.astro_model.windows.breakRisk).sort((a, b) => String(a.astro_model.windows.breakRisk.start).localeCompare(String(b.astro_model.windows.breakRisk.start)))]
  ];
  return <div className="priority-grid">{groups.map(([label, items]) => <div className="priority-card" key={label}><div className="eyebrow">{label}</div>{items.slice(0, 4).length ? items.slice(0, 4).map(stock => <button key={stock.name} onClick={() => onSelect(stock.name)}><strong>{stock.name}</strong><span>{label.includes("Pressure") || label.includes("Break") ? stock.astro_model.scores.pressure : stock.astro_model.scores.expansion}</span></button>) : <div className="muted">No current matches.</div>}</div>)}</div>;
}

function stockMatches(stock, filter) {
  const model = stock.astro_model;
  if (filter === "PENDING") return !model;
  if (!model) return filter === "ALL";
  if (filter === "EXPANSION") return model.current.direction === "EXPANSION BIAS";
  if (filter === "PRESSURE") return model.current.direction === "PRESSURE BIAS";
  if (filter === "RERATING") return Boolean(model.windows.rerating);
  if (filter === "BREAK") return Boolean(model.windows.breakRisk);
  return true;
}

function sortStocks(stocks, sort) {
  const rows = [...stocks];
  const value = (stock, key, fallback = -1) => stock.astro_model?.scores?.[key] ?? fallback;
  if (sort === "RUNWAY") return rows.sort((a, b) => value(b, "cycleRunway") - value(a, "cycleRunway"));
  if (sort === "LEADERSHIP") return rows.sort((a, b) => value(b, "currentLeadership") - value(a, "currentLeadership"));
  if (sort === "RERATING") return rows.sort((a, b) => String(a.astro_model?.windows?.rerating?.start || "9999").localeCompare(String(b.astro_model?.windows?.rerating?.start || "9999")));
  if (sort === "PRESSURE") return rows.sort((a, b) => String(a.astro_model?.windows?.pressure?.start || "9999").localeCompare(String(b.astro_model?.windows?.pressure?.start || "9999")));
  return rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
}

function EventCell({ event, empty = "No separate gate" }) {
  if (!event) return <span className="muted">{empty}</span>;
  return <div className={`event-cell ${toneForEvent(event)}`} title={event.expectedExpression || event.label}><strong>{event.label}</strong><span>{range(event)}</span></div>;
}

function AstroGateCell({ stock }) {
  if (!stock?.catalyst_label || !stock?.catalyst_date) return <span className="muted">No consequential natal transit mapped</span>;
  const effect = neutralAstroLanguage(stock.catalyst_net_expression || stock.catalyst_response || "Stock-specific natal response is unresolved.");
  const contact = String(stock.catalyst_contact_text || "").trim();
  const tone = stock.catalyst_macro_behaviour?.tone === "expansion" ? "support" : stock.catalyst_macro_behaviour?.tone === "pressure" ? "pressure" : "neutral";
  return <div className={`event-cell astro-gate ${tone}`} title={neutralAstroLanguage(stock.catalyst_response || effect)}><strong>{stock.catalyst_label}</strong><span>{formatDate(stock.catalyst_date)}{Number.isFinite(Number(stock.days_to_event)) ? ` · ${Math.round(stock.days_to_event)} days` : ""}</span>{contact ? <span className="gate-contact">{contact}</span> : null}<span className="gate-effect">{effect}</span></div>;
}

function ShadowReratingCell({ assessment }) {
  const outlook = assessment?.futureOutlook;
  if (!outlook) return <span className="muted">No episode qualified</span>;
  return <div className="event-cell shadow-rerating" title={`Research View only · present state ${human(assessment.presentState)}`}><strong>{outlook.label}</strong><span>Ignition {formatDate(outlook.projectedIgnition)}</span><span>Active {range(outlook.activeWindow)}</span></div>;
}

function StockTable({ stocks, researchView, onSelect }) {
  const simpleHeaders = [
    "Stock",
    "Regime",
    "Current Leadership /100",
    "Pressure /100",
    "Expansion /100",
    "30–60 Day Path",
    "Next Astro Gate",
    "Cycle / Rerating Potential",
    "Correction Mode",
    "Forward Leadership /100",
    "Strategic Path"
  ];
  const researchHeaders = [
    "Stock",
    "Natal Chart Type",
    "Natal Authority",
    "Current Signature",
    "Regime",
    "Current Leadership /100",
    "Pressure /100",
    "Expansion /100",
    "30–60 Day Path",
    "Next Astro Gate",
    "Shadow Rerating Outlook",
    "Pressure Window",
    "Cycle Runway",
    "Correction Mode",
    "Forward Leadership /100",
    "Receptor",
    "Top Contacts"
  ];
  return (
    <div className={`table-scroll ${researchView ? "research-table" : "simple-table"}`}>
      <table><thead><tr>{(researchView ? researchHeaders : simpleHeaders).map(header => <th key={header}><ColumnHeader label={header} /></th>)}</tr></thead><tbody>
        {stocks.map(stock => {
          const model = stock.astro_model;
          const chartType = stock.natal_chart_type || "";
          const chartId = stock.natal_chart_id || model?.natal?.primaryChartId || "";
          const showChartId = chartId && String(chartId).toLowerCase() !== String(chartType).toLowerCase();
          const tone = toneForState(model?.current?.state);
          const tactical = firstForwardEvent(model, "tactical");
          const strategic = compactPath(model, "strategic");
          const state = model?.current?.state || "NATAL PENDING";
          const stockCell = <td className="stock-cell"><a href={stockCardHref(stock.name)} onClick={event => { event.preventDefault(); event.stopPropagation(); onSelect(stock.name); }}><strong>{stock.name}</strong></a><a className="new-window-link" href={stockCardHref(stock.name)} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()} aria-label={`Open ${stock.name} in a new tab`} title="Open expanded card in a new tab">↗</a><span>{model ? `${human(model.natal?.chartAuthority || "RESEARCH_ONLY")} · reliability ${model.natal?.reliability ?? "—"}/100` : "Natal pending"}</span></td>;
          const regimeCell = <td className={`regime-cell ${tone}`}><Badge tone={tone}>{state}</Badge><span>{model ? directionText(model.current.direction, model.scores) : "Chart awaiting resolution"}</span></td>;
          const currentLeadershipCell = <td className="score-cell leadership-score"><strong>{model?.scores?.currentLeadership ?? "—"}</strong><span>{scoreLabel(model?.scores?.currentLeadership)}</span></td>;
          const pressureCell = <td className="score-cell pressure-score"><strong>{model?.scores?.pressure ?? "—"}</strong><span>{pressureScoreLabel(model?.scores?.pressure)}</span></td>;
          const expansionCell = <td className="score-cell expansion-score"><strong>{model?.scores?.expansion ?? "—"}</strong><span>{scoreLabel(model?.scores?.expansion)}</span></td>;
          const tacticalCell = <td><EventCell event={tactical} empty="Current expression continues" /></td>;
          const nextGateCell = <td><AstroGateCell stock={stock} /></td>;
          const cycleCell = <td className="cycle-cell">{model ? <><strong>{model.cycle.level} · {model.cycle.score}/100</strong><span>{model.windows.rerating ? `Rerating ${range(model.windows.rerating)}` : "No separate rerating window"}</span></> : "—"}</td>;
          const correctionCell = <td><Badge tone={toneForState(model?.current?.correctionMode)}>{correctionModeLabel(model)}</Badge></td>;
          const forwardLeadershipCell = <td className="score-cell"><strong>{model?.scores?.forwardLeadership ?? "—"}</strong><span>{scoreLabel(model?.scores?.forwardLeadership)}</span></td>;
          const strategicCell = <td><div className={`event-cell ${strategic.tone}`} title={strategic.title}><strong>{strategic.title}</strong><span>{strategic.date}</span></div></td>;
          return (
            <tr key={stock.name} className={`stock-row ${tone}`} onClick={() => onSelect(stock.name)} title="Click for the expanded astro card">
              {stockCell}
              {researchView ? <>
                <td><div className="clamped-cell" title={`${chartId || "—"} · ${chartType || "unresolved"}`}>{chartType ? human(chartType) : "—"}{showChartId ? <span className="cell-note">{chartId}</span> : null}</div></td>
                <td><strong>{model?.natal?.chartAuthority || "NATAL PENDING"}</strong><span className="cell-note">Reliability {model?.natal?.reliability ?? "—"}/100</span></td>
                <td><div className="clamped-cell" title={model?.research?.environmentSignature || stock.environment_signature}>{model?.research?.environmentSignature || stock.environment_signature || "—"}</div></td>
                {regimeCell}{currentLeadershipCell}{pressureCell}{expansionCell}{tacticalCell}{nextGateCell}
                <td><ShadowReratingCell assessment={model?.research?.shadowAssessment?.reratingAssessment} /></td>
                <td><EventCell event={model?.windows?.pressure} empty="No separate window" /></td>
                <td className="cycle-cell">{model ? <><strong>{model.cycle.level} · {model.cycle.score}/100</strong><span>{model.cycle.episodes?.length || 0} expansion episode(s)</span></> : "—"}</td>
                {correctionCell}{forwardLeadershipCell}
                <td><div className="clamped-cell" title={stock.transit_receptor_expression}>{stock.transit_receptor_expression || "—"}</div></td>
                <td><div className="clamped-cell" title={neutralAstroLanguage(stock.top_transits)}>{clamp(neutralAstroLanguage(stock.top_transits), 155)}</div></td>
              </> : <>{regimeCell}{currentLeadershipCell}{pressureCell}{expansionCell}{tacticalCell}{nextGateCell}{cycleCell}{correctionCell}{forwardLeadershipCell}{strategicCell}</>}
            </tr>
          );
        })}
      </tbody></table>
    </div>
  );
}

function NatalEditor({ stocks, onSaved, requestedStock }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const [form, setForm] = useState({ symbol: "", companyName: "", chartType: "incorporation", birthDate: "", birthTime: "11:00", city: "", country: "India", timezone: "Asia/Kolkata", confidence: "low", source: "" });
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const chartChange = value => setForm(current => ({ ...current, chartType: value, birthTime: value.includes("listing") ? "09:15" : "11:00", city: value.includes("listing") ? "Mumbai" : current.city === "Mumbai" ? "" : current.city }));
  const loadStock = symbol => {
    const stock = stocks.find(item => item.name === symbol);
    if (!stock) return set("symbol", symbol);
    setForm(current => ({ ...current, symbol: stock.name, companyName: stock.natal_company_name || stock.company_name || stock.name, chartType: stock.natal_chart_type || "incorporation", birthDate: stock.natal_birth_date || "", birthTime: stock.natal_birth_time || "11:00", city: stock.natal_city || "", confidence: String(stock.natal_confidence || "low").toLowerCase(), source: stock.natal_source_detail || "" }));
  };
  useEffect(() => {
    const symbol = String(requestedStock?.symbol || "").trim().toUpperCase();
    if (!symbol) return;
    setOpen(true);
    const stock = stocks.find(item => item.name === symbol);
    if (stock) loadStock(symbol);
    else setForm(current => ({ ...current, symbol, companyName: symbol }));
    requestAnimationFrame(() => document.getElementById("natal-registry")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, [requestedStock?.nonce]);
  const save = async () => {
    setStatus("Saving natal chart…");
    const response = await fetch("/api/upsert-natal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) return setStatus(body.error || "Could not save natal chart.");
    setStatus(body.warning || "Natal chart saved.");
    await onSaved?.();
  };
  return <section className="panel" id="natal-registry"><div className="section-head"><div><div className="eyebrow">Natal Registry</div><h2>Add or edit natal data</h2><div className="muted">Use this editor after adding a stock. 09:15 Mumbai and 11:00 local remain declared proxies when exact times are unavailable; proxy angles and houses are suppressed.</div></div><button onClick={() => setOpen(value => !value)}>{open ? "Close natal editor" : "Add / edit natal data"}</button></div>{open ? <div className="form-grid"><label>Stock<select value={form.symbol} onChange={event => loadStock(event.target.value)}><option value="">Select or type below</option>{stocks.filter(stock => !stock.natal_locked).map(stock => <option key={stock.name}>{stock.name}</option>)}</select><input placeholder="SYMBOL.NS" value={form.symbol} onChange={event => set("symbol", event.target.value.toUpperCase())} /></label><label>Company<input value={form.companyName} onChange={event => set("companyName", event.target.value)} /></label><label>Chart type<select value={form.chartType} onChange={event => chartChange(event.target.value)}><option value="incorporation">Incorporation</option><option value="listing">Listing / first market</option><option value="merger">Merger / successor</option><option value="demerger">Demerger / successor</option><option value="record-date">Record date / activation only</option></select></label><label>Date<input type="date" value={form.birthDate} onChange={event => set("birthDate", event.target.value)} /></label><label>Time<input type="time" value={form.birthTime} onChange={event => set("birthTime", event.target.value)} /></label><label>City<input value={form.city} onChange={event => set("city", event.target.value)} /></label><label>Country<input value={form.country} onChange={event => set("country", event.target.value)} /></label><label>Timezone<input value={form.timezone} onChange={event => set("timezone", event.target.value)} /></label><label>Model status<select value={form.confidence} onChange={event => set("confidence", event.target.value)}><option value="low">Research only</option><option value="medium">Provisional</option><option value="high">Verified / final</option></select></label><label className="wide">Source note<input value={form.source} onChange={event => set("source", event.target.value)} placeholder="Document, exchange notice, or declared proxy" /></label><div className="wide form-actions"><button className="primary" onClick={save}>Save natal chart</button><span className="muted">{status}</span></div></div> : null}</section>;
}

function ReplayLab() {
  const [ticker, setTicker] = useState("ICICIBANK.NS");
  const [date, setDate] = useState(TODAY());
  const [forwardDays, setForwardDays] = useState("730");
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState("");
  const run = async () => {
    setStatus("Running Swiss-backed replay…"); setResult(null);
    const response = await fetch(`/api/replay-lab?ticker=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}&forwardDays=${forwardDays}`);
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) return setStatus(body.error || "Replay failed.");
    setResult(body); setStatus("");
  };
  const model = result?.astroModel;
  const shadow = model?.research?.shadowAssessment;
  return <section className="panel"><div className="section-head"><div><div className="eyebrow">Replay Lab</div><h2>Swiss-backed Astro Replay</h2><div className="muted">Replay isolates the selected date, then maps later pressure and expansion windows without allowing the future to rewrite the present.</div></div><button className="primary" onClick={run}>Run replay</button></div><div className="replay-form"><label>Ticker<input value={ticker} onChange={event => setTicker(event.target.value.toUpperCase())} /></label><label>Replay date<input type="date" value={date} onChange={event => setDate(event.target.value)} /></label><label>Forward horizon<select value={forwardDays} onChange={event => setForwardDays(event.target.value)}><option value="90">3 months</option><option value="180">6 months</option><option value="365">12 months</option><option value="540">18 months</option><option value="730">24 months</option></select></label><span className="muted">{status}</span></div>{model ? <div className="replay-result"><div className="story-band"><strong>{result.replaySummary?.ticker} · {formatDate(date)} · {model.current.state}</strong><div>{model.current.story}</div></div><WindowBand label="Rerating Window" window={model.windows.rerating} /><WindowBand label="Break-Risk Window" window={model.windows.breakRisk} tone="break" /><div className="path-grid"><PathTable title="Replay Tactical Path" subtitle="Current state plus mapped events inside 60 days." events={model.paths.tactical} /><PathTable title="Replay Strategic Path" subtitle="Chronological pressure and expansion path." events={model.paths.strategic.filter(event => !event.start || event.start <= (() => { const d = new Date(`${date}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + Number(forwardDays)); return d.toISOString().slice(0, 10); })())} /></div><details className="research-details"><summary>Replay research details</summary><InfoTable rows={[["Natal source", `${result.resolvedCompany?.chartType || "—"} · ${formatDate(result.resolvedCompany?.birthDate)} ${result.resolvedCompany?.birthTime || ""} · ${result.resolvedCompany?.city || "—"}`],["Pressure / expansion", `${model.scores.pressure} / ${model.scores.expansion}`],["Leadership", `${model.scores.currentLeadership} current · ${model.scores.forwardLeadership} forward`],["Top contacts", (result.replaySummary?.topContactText || []).join(" | ") || "—"],["Macro", result.macroSnapshot?.headline || "—"],["Chart validation", result.replaySummary?.chartValidation?.expectedChartBehaviour || "—"],["Shadow phase diagnostic", shadow ? `Pressure ${human(shadow.phase?.pressure?.phase)} · expansion ${human(shadow.phase?.expansion?.phase)} · ${human(shadow.current?.pressureOutcome)} · ${human(shadow.current?.expansionConversion)}` : "—"],["Shadow episode runway", shadow ? `${shadow.runway?.level || "—"} · ${shadow.runway?.score ?? "—"}/100 · ${shadow.runway?.episodes?.length || 0} converted episode(s). Diagnostic only; authoritative card unchanged.` : "—"]]} /></details></div> : null}</section>;
}

export default function Home() {
  const [stocks, setStocks] = useState([]);
  const [macro, setMacro] = useState(null);
  const [selected, setSelected] = useState("");
  const [standaloneCard, setStandaloneCard] = useState(false);
  const [environmentView, setEnvironmentView] = useState("MACRO");
  const [filter, setFilter] = useState("ALL");
  const [sort, setSort] = useState("NAME");
  const [researchView, setResearchView] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [natalTarget, setNatalTarget] = useState(null);
  const [status, setStatus] = useState("Loading Swiss-backed model…");
  const fetchAll = async (refresh = false) => {
    setStatus("Refreshing astrology…");
    const [stockResponse, macroResponse] = await Promise.all([fetch(`/api/get-stocks${refresh ? "?refresh=1" : ""}`), fetch("/api/macro")]);
    const [stockBody, macroBody] = await Promise.all([stockResponse.json().catch(() => []), macroResponse.json().catch(() => null)]);
    if (!stockResponse.ok || !Array.isArray(stockBody)) setStatus(stockBody?.error || "Could not load stocks.");
    else { setStocks(stockBody); setStatus(`Updated ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST`); }
    if (macroResponse.ok) setMacro(macroBody);
  };
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedStock = params.get("stock");
    if (requestedStock) setSelected(requestedStock.toUpperCase());
    setStandaloneCard(params.get("view") === "card");
    fetchAll(false);
  }, []);
  const visible = useMemo(() => sortStocks(stocks.filter(stock => stockMatches(stock, filter)), sort), [stocks, filter, sort]);
  const selectedStock = stocks.find(stock => stock.name === selected) || null;
  const addStock = async () => {
    if (!newSymbol.trim()) return;
    const submittedSymbol = newSymbol.trim().toUpperCase();
    setStatus("Adding stock…");
    const response = await fetch("/api/add-stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: submittedSymbol }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) return setStatus(body.error || "Could not add stock.");
    setNewSymbol("");
    await fetchAll(true);
    setNatalTarget({ symbol: body?.saved?.name || body?.saved?.symbol || submittedSymbol, nonce: Date.now() });
  };
  const deleteStock = async stock => {
    if (!window.confirm(`Remove ${stock.name} from the user registry?`)) return;
    const response = await fetch("/api/delete-stock", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: stock.name }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || body.success === false) return setStatus(body.error || "Could not remove stock.");
    setSelected(""); await fetchAll(true);
  };
  const closeStandalone = () => {
    if (typeof window === "undefined") return;
    if (window.opener) window.close();
    else window.location.assign("/");
  };
  return (
    <main>
      {standaloneCard ? (
        <div className="standalone-card-page">
          {selectedStock ? <PureAstroCard stock={selectedStock} standalone onClose={closeStandalone} onDelete={deleteStock} /> : <section className="panel empty">{status}</section>}
        </div>
      ) : <>
        <header className="hero"><div><div className="eyebrow">Fin-Lumen Pure Astro</div><h1>Pressure, Expansion & Rerating Map</h1><p>Real Swiss Ephemeris · sidereal Lahiri · natal-receptor astrology · no price inputs · no trading instructions</p></div><button className="primary" onClick={() => fetchAll(true)}>Refresh model</button></header>
        <EnvironmentTabs active={environmentView} onChange={setEnvironmentView} />
        {environmentView === "MACRO" ? <MacroPanel macro={macro} /> : null}
        {environmentView === "NEXT30" ? <Next30DaysPanel macro={macro} /> : null}
        {environmentView === "LEGEND" ? <AstroLegend /> : null}
        <section className="panel add-panel"><div><div className="eyebrow">Stock universe</div><h2>Add or inspect a stock</h2><div className="muted">Add a symbol and its natal-details form will open immediately, prefilled with that stock. It remains Natal Pending until the chart is saved.</div></div><div className="add-control"><input placeholder="VOLTAMP.NS" value={newSymbol} onChange={event => setNewSymbol(event.target.value.toUpperCase())} onKeyDown={event => event.key === "Enter" && addStock()} /><button onClick={addStock}>Add stock + natal details</button><a className="button-link" href="#natal-registry">Edit existing natal data</a></div><div className="muted">{status}</div></section>
        <NatalEditor stocks={stocks} requestedStock={natalTarget} onSaved={() => fetchAll(true)} />
        <PriorityPanels stocks={stocks} onSelect={setSelected} />
        <section className="panel scanner-panel"><div className="section-head"><div><div className="eyebrow">Stock-Specific Astro Behaviour</div><h2>Pressure and expansion scanner</h2><div className="muted">Familiar scanner information in a denser, score-explicit layout. Simple View is for rapid scanning; Research View keeps the full evidence table.</div></div><div className="view-tabs" role="group" aria-label="Table detail"><button className={!researchView ? "active" : ""} aria-pressed={!researchView} onClick={() => setResearchView(false)}>Simple View</button><button className={researchView ? "active" : ""} aria-pressed={researchView} onClick={() => setResearchView(true)}>Research View</button></div></div><ScoreGuide /><div className="controls"><label>View<select value={filter} onChange={event => setFilter(event.target.value)}><option value="ALL">All stocks</option><option value="EXPANSION">Expansion-biased</option><option value="PRESSURE">Pressure-biased</option><option value="RERATING">Rerating window mapped</option><option value="BREAK">Break-Risk mapped</option><option value="PENDING">Natal pending</option></select></label><label>Sort<select value={sort} onChange={event => setSort(event.target.value)}><option value="NAME">Stock name</option><option value="RUNWAY">Cycle runway</option><option value="LEADERSHIP">Current leadership</option><option value="RERATING">Nearest rerating window</option><option value="PRESSURE">Nearest pressure window</option></select></label><span className="muted">{visible.length} of {stocks.length} shown</span><span className="table-hint">Click a row for the pop-up card · right-click the stock name to open separately</span></div><StockTable stocks={visible} researchView={researchView} onSelect={setSelected} /></section>
        <ReplayLab />
        <footer>Fin-Lumen v37.9.14 · full-window lock candidate · stock episodes + macro transit ranges + selected-date status · Swiss Ephemeris hard-fail astronomy</footer>
        <StockCardModal stock={selectedStock} onClose={() => setSelected("")} onDelete={deleteStock} />
      </>}
      <style jsx global>{`
        :root{color-scheme:light;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#142033;background:#f4f7fb}
        *{box-sizing:border-box}
        body{margin:0;background:#f4f7fb}
        button,input,select{font:inherit}
        button,.button-link{border:1px solid #cbd5e1;background:white;border-radius:9px;padding:9px 13px;cursor:pointer;font-weight:750;color:#172033;text-decoration:none;display:inline-flex;align-items:center;justify-content:center}
        button:hover,.button-link:hover{border-color:#0f766e;color:#0f5f58}
        .primary{background:#0f766e;color:white;border-color:#0f766e}
        .danger-button{color:#991b1b;border-color:#fecaca;background:#fffafa}
        .authority-warning{margin:12px 0;padding:11px 13px;border:1px solid #f1c56a;border-radius:9px;background:#fff8e8;color:#713f12;line-height:1.45}
        input,select{border:1px solid #cbd5e1;border-radius:8px;padding:9px 10px;background:white;min-width:0}
        main{max-width:1760px;margin:auto;padding:20px}
        .hero{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;padding:22px 4px}
        .hero h1{font-size:34px;margin:2px 0 6px}.hero p{margin:0;color:#536174}
        .panel,.expanded-card{background:#fff;border:1px solid #dce4ef;border-radius:14px;padding:18px;margin-bottom:16px;box-shadow:0 6px 22px rgba(15,23,42,.045)}
        .section-head,.detail-head,.summary-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
        .section-head h2,.detail-head h2,.summary-head h3,.add-panel h2{margin:2px 0 5px}
        .eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:850;color:#536174}
        .muted,.cell-note{font-size:13px;color:#64748b;line-height:1.4}
        .cell-note{display:block;margin-top:4px}
        .badge{display:inline-block;border-radius:999px;padding:5px 9px;font-size:11px;font-weight:850;border:1px solid #dbe4ef;background:#f8fafc;white-space:nowrap}
        .badge.support{color:#166534;background:#eaf9f0;border-color:#a7dfbc}
        .badge.pressure{color:#8a4b08;background:#fff4d9;border-color:#edca78}
        .badge.break{color:#991b1b;background:#ffe8eb;border-color:#f2a6af}
        .macro-headline{max-width:1100px;margin-top:4px}.macro-view-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap;justify-content:flex-end}.macro-grid{display:grid;grid-template-columns:repeat(6,minmax(120px,1fr));gap:9px;margin-top:14px}
        .metric{border:1px solid #dce4ef;background:white;border-radius:10px;padding:11px}.metric.support{background:#eefaf3;border-color:#b7e4cf}.metric.pressure{background:#fff6e4;border-color:#efd29a}
        .metric-value{font-size:18px;font-weight:850;margin:2px 0}
        .macro-two{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}.macro-two>div{padding:12px;border:1px solid #dce4ef;border-radius:10px}.macro-focus.support{background:#f0faf4;border-left:5px solid #35a867}.macro-focus.pressure{background:#fff7e8;border-left:5px solid #dda732}.macro-definition{font-size:12px;line-height:1.45;margin-top:9px;padding-top:8px;border-top:1px solid rgba(120,92,32,.18);color:#6b5a33}.macro-meaning{padding:12px 14px;border:1px solid #cad7e6;border-radius:10px;background:#f5f8fc;line-height:1.5}
        .event-list{display:grid;gap:9px;margin-top:10px}.event-list>div{border-left:3px solid #94a3b8;padding-left:10px}.compact-events,.simple-pressure-sequence{grid-template-columns:repeat(2,minmax(0,1fr));margin-top:14px}.simple-pressure-sequence>div{padding:9px 10px;border:1px solid #e1e7ef;border-left:4px solid #dda732;border-radius:8px;background:#fffaf0}
        .macro-evidence-section{margin-top:13px;border:1px solid #d5dee9;border-radius:10px;overflow:hidden}.macro-evidence-table{display:grid}.macro-evidence-head,.macro-evidence-row{display:grid;grid-template-columns:minmax(165px,.9fr) minmax(145px,.7fr) minmax(90px,.42fr) minmax(125px,.55fr) minmax(300px,1.8fr);gap:10px;padding:10px 12px;align-items:start}.macro-evidence-head{background:#edf2f7;font-size:10px;text-transform:uppercase;letter-spacing:.04em;font-weight:850;color:#405069}.macro-evidence-row{border-top:1px solid #e5eaf0;font-size:12px;line-height:1.42}.macro-evidence-row:nth-child(odd){background:#fbfcfe}.macro-evidence-row span{color:#526176}.research-macro-grid{grid-template-columns:repeat(6,minmax(125px,1fr))}
        .environment-tabs{display:flex;gap:6px;border-bottom:1px solid #cbd5e1;margin:0 0 14px;padding:0 4px;overflow-x:auto}
        .environment-tabs button{border-radius:9px 9px 0 0;border-bottom:0;background:#e9eef5;color:#405069;white-space:nowrap;padding:11px 16px}
        .environment-tabs button.active{background:#fff;color:#0f766e;border-color:#9fb0c5;box-shadow:inset 0 -3px #0f766e}
        .next30-grid{display:grid;grid-template-columns:repeat(3,minmax(230px,1fr));gap:10px;margin-top:14px}
        .next30-card{border:1px solid #dce4ef;border-left:5px solid #7c93ad;border-radius:10px;padding:12px;background:#f8fafc;min-height:112px}.next30-card.support{background:#effaf3;border-color:#a7dfbc}.next30-card.pressure{background:#fff5df;border-color:#edca78}.next30-card.break{background:#ffeaed;border-color:#f2a6af}.event-date{font-size:12px;color:#526176;font-weight:800;margin-bottom:5px}
        .legend-grid{display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));gap:10px;margin-top:14px}.legend-card{border:1px solid #dce4ef;border-radius:10px;padding:12px;background:#f8fafc}.legend-card.support{background:#effaf3;border-color:#a7dfbc}.legend-card.pressure{background:#fff5df;border-color:#edca78}.legend-card.high,.legend-card.break{background:#ffeaed;border-color:#f2a6af}.legend-card p{font-size:13px;line-height:1.42;color:#475569;margin:9px 0 0}
        .add-panel{display:grid;grid-template-columns:minmax(240px,1fr) minmax(260px,480px) auto;gap:16px;align-items:center}.add-control{display:flex;gap:8px}.add-control input{flex:1}
        .form-grid{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr));gap:12px;margin-top:16px}.form-grid label,.replay-form label,.controls label{display:grid;gap:5px;font-size:12px;font-weight:750;color:#475569}.form-grid label input,.form-grid label select{width:100%}.wide{grid-column:1/-1}.form-actions{display:flex;align-items:center;gap:12px}
        .priority-grid{display:grid;grid-template-columns:repeat(4,minmax(200px,1fr));gap:12px;margin-bottom:16px}.priority-card{background:white;border:1px solid #dce4ef;border-radius:12px;padding:12px}.priority-card button{display:flex;width:100%;justify-content:space-between;margin-top:7px;text-align:left;padding:7px 8px}
        .view-tabs{display:inline-flex;border:1px solid #aab8ca;border-radius:10px;padding:3px;background:#edf2f7;white-space:nowrap}.view-tabs button{border:0;border-radius:7px;background:transparent;padding:8px 13px;color:#526176}.view-tabs button.active{background:white;color:#0f766e;box-shadow:0 1px 4px rgba(15,23,42,.16)}
        .score-guide{margin-top:12px;border:1px solid #cfd9e6;border-radius:10px;background:#f8fafc;padding:10px 12px}.score-guide summary{cursor:pointer;font-weight:850;color:#334155}.score-guide-note{font-size:12px;color:#526176;line-height:1.45;margin-top:8px}.score-guide-grid{display:grid;grid-template-columns:repeat(4,minmax(220px,1fr));gap:8px;margin-top:9px}.score-guide-grid>div{background:white;border:1px solid #dde5ef;border-radius:8px;padding:9px}.score-guide-grid strong,.score-guide-grid span{display:block}.score-guide-grid span{font-size:12px;color:#64748b;margin-top:3px}
        .controls{display:flex;align-items:end;gap:14px;margin:12px 0;flex-wrap:wrap}.table-hint{margin-left:auto;font-size:12px;color:#526176;background:#f1f5f9;border-radius:8px;padding:8px 10px}
        .table-scroll{overflow:auto;border:1px solid #b8c7d9;border-radius:10px;background:#fff;max-height:72vh;box-shadow:inset 0 1px 0 #fff}
        table{border-collapse:separate;border-spacing:0;width:100%;font-size:12px;line-height:1.32}
        .simple-table table{min-width:1720px}.research-table table{min-width:2650px}
        th{position:sticky;top:0;z-index:3;background:#e7edf5;color:#203047;text-align:left;padding:9px 8px;border-bottom:1px solid #aebdce;white-space:normal;font-size:10px;text-transform:uppercase;letter-spacing:.035em}.column-header{display:inline;line-height:1.35}.help-dot{display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;margin-left:5px;border:1px solid #8fa1b7;border-radius:50%;font-size:9px;font-weight:900;color:#40536c;background:#fff;vertical-align:middle;cursor:help;text-transform:none;letter-spacing:0}
        td{padding:8px;border-bottom:1px solid #e5ebf2;vertical-align:top;background:#fff}
        .table-scroll th:first-child{left:0;z-index:5;box-shadow:2px 0 5px rgba(15,23,42,.08)}.table-scroll td:first-child{position:sticky;left:0;z-index:2;box-shadow:2px 0 5px rgba(15,23,42,.06)}
        .stock-row{cursor:pointer}.stock-row:hover td{background:#fff9ed}.stock-row td:first-child{border-left:4px solid #a3b1c2}.stock-row.support td:first-child{border-left-color:#35a867}.stock-row.pressure td:first-child{border-left-color:#dda732}.stock-row.break td:first-child{border-left-color:#d64254}
        .simple-table th:nth-child(1),.simple-table td:nth-child(1){width:140px;min-width:140px}.simple-table th:nth-child(2),.simple-table td:nth-child(2){width:170px;min-width:170px}.simple-table th:nth-child(3),.simple-table td:nth-child(3),.simple-table th:nth-child(4),.simple-table td:nth-child(4),.simple-table th:nth-child(5),.simple-table td:nth-child(5),.simple-table th:nth-child(10),.simple-table td:nth-child(10){width:108px;min-width:108px}.simple-table th:nth-child(6),.simple-table td:nth-child(6){width:180px;min-width:180px}.simple-table th:nth-child(7),.simple-table td:nth-child(7){width:245px;min-width:245px}.simple-table th:nth-child(8),.simple-table td:nth-child(8){width:210px;min-width:210px}.simple-table th:nth-child(9),.simple-table td:nth-child(9){width:125px;min-width:125px}.simple-table th:nth-child(11),.simple-table td:nth-child(11){width:235px;min-width:235px}
        .research-table th,.research-table td{min-width:128px}.research-table th:first-child,.research-table td:first-child{min-width:140px}.research-table th:nth-child(4),.research-table td:nth-child(4),.research-table th:last-child,.research-table td:last-child{min-width:185px}.research-table th:nth-child(9),.research-table td:nth-child(9),.research-table th:nth-child(10),.research-table td:nth-child(10),.research-table th:nth-child(11),.research-table td:nth-child(11),.research-table th:nth-child(12),.research-table td:nth-child(12){min-width:175px}
        .stock-cell a:first-child{color:#142033;text-decoration:none}.stock-cell a:first-child:hover{text-decoration:underline;color:#0f766e}.stock-cell>span{display:block;margin-top:5px;font-size:11px;color:#627187;text-transform:uppercase}.new-window-link{font-size:15px;margin-left:7px;color:#0f766e;text-decoration:none}
        .regime-cell>span:last-child,.score-cell span,.cycle-cell span,.event-cell span{display:block;margin-top:5px;color:#627187;font-size:11px}.regime-cell.support{background:#f3fbf6}.regime-cell.pressure{background:#fff9eb}.regime-cell.break{background:#fff0f2}
        .score-cell strong{font-size:17px}.pressure-score{background:#fffaf0}.pressure-score strong{color:#a45b0a}.expansion-score{background:#f3fbf6}.expansion-score strong{color:#167342}.leadership-score strong{color:#173f88}.cycle-cell strong{font-size:12px}.clamped-cell,.event-cell strong{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.event-cell{border-left:4px solid #93a3b7;padding-left:7px;min-height:38px}.event-cell.support{border-left-color:#35a867}.event-cell.pressure{border-left-color:#dda732}.event-cell.break{border-left-color:#d64254}.astro-gate .gate-contact{color:#334155;font-weight:700}.astro-gate .gate-effect{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;line-height:1.3;color:#526174}
        .balance-values{display:flex;justify-content:space-between;font-weight:850}.pressure-text{color:#b45309}.support-text{color:#168044}.balance-track{display:grid;grid-template-rows:5px 5px;gap:3px;margin-top:7px;background:#edf2f7;border-radius:5px;padding:2px}.balance-track span{display:block;border-radius:3px}.pressure-fill{background:#e5a634}.support-fill{background:#35a867}
        .expanded-card{border-color:#b9c9da;background:#f8fafc}.detail-actions{display:flex;gap:8px;flex-wrap:wrap}.summary-card{background:white;border:1px solid #9dc6ef;border-radius:13px;padding:14px;margin-top:12px}.registry{text-align:right}.story-band{margin-top:11px;padding:13px;border:1px solid #9dc6ef;border-radius:10px;background:#eaf4ff;color:#173f88;font-weight:750;line-height:1.5}.window-band{margin-top:12px;padding:12px;border-radius:11px;line-height:1.45}.window-band.rerating{background:#d9f8ee;border:1px solid #62cbb0;color:#134e4a}.window-band.break{background:#ffeaed;border:1px solid #f2a6af;color:#881337}.window-band-head{display:flex;justify-content:space-between;gap:14px;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.window-band-title{font-weight:850;margin-top:4px}.event-cell.shadow-rerating{border-left-color:#0f766e;background:#eefbf8}.event-cell.shadow-rerating strong{color:#0f5f59}.event-cell.shadow-rerating span{display:block}
        .view-grid,.path-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:13px}.view-card,.path-card{background:#f8fafc;border:1px solid #c8d9ec;border-radius:11px;padding:12px}.view-card h4{margin:2px 0 8px}.info-table{display:grid}.info-row{display:grid;grid-template-columns:minmax(130px,.38fr) 1fr;gap:10px;padding:9px 0;border-bottom:1px solid #e5e7eb}.info-row:last-child{border-bottom:0}.info-label{font-size:11px;text-transform:uppercase;letter-spacing:.04em;font-weight:800;color:#526176}.info-value{line-height:1.45}.path-subtitle{margin:4px 0 8px}.path-row{display:grid;grid-template-columns:160px 1fr;gap:10px;padding:10px 0;border-bottom:1px solid #e5e7eb}.path-row:last-child{border-bottom:0}.path-date{font-weight:750}.score-line{font-size:12px;color:#475569;margin-top:3px}.stage-line{font-size:12px;color:#7c4a0d;margin-top:3px;font-weight:750}.research-details{background:white;border:1px solid #d5dee9;border-radius:11px;padding:12px;margin-top:14px}.research-details summary,details summary{cursor:pointer;font-weight:800}.research-intro{margin:10px 0 12px;padding:10px 12px;background:#f2f7fc;border-left:4px solid #5f88b5;border-radius:7px;color:#40546b;line-height:1.5}.research-section{margin-top:12px;border:1px solid #dbe4ee;border-radius:10px;overflow:hidden}.research-section-head{padding:10px 12px;background:#f7f9fc;border-bottom:1px solid #dbe4ee}.research-section-head h4{margin:0 0 3px;color:#26384c}.research-section-head .muted{font-size:12px}.research-section>.info-table{padding:0 12px}.research-section .info-row{grid-template-columns:minmax(170px,.32fr) 1fr}
        .modal-backdrop{position:fixed;inset:0;z-index:1000;background:rgba(15,23,42,.48);padding:22px;display:flex;align-items:flex-start;justify-content:center}.modal-shell{width:min(1580px,100%);height:calc(100vh - 44px);overflow:auto;border-radius:16px;box-shadow:0 24px 70px rgba(15,23,42,.35)}.modal-shell .expanded-card{margin:0;min-height:100%;border-radius:16px}.standalone-card-page{max-width:1580px;margin:0 auto}.standalone-card-page .expanded-card{margin:0}
        .empty{padding:14px;color:#64748b}.replay-form{display:grid;grid-template-columns:repeat(3,minmax(180px,1fr)) auto;gap:12px;align-items:end;margin-top:14px}.replay-result{margin-top:14px}footer{text-align:center;color:#64748b;padding:20px}
        @media(max-width:1200px){.legend-grid{grid-template-columns:repeat(3,1fr)}.next30-grid{grid-template-columns:repeat(2,1fr)}}
        @media(max-width:1050px){.priority-grid{grid-template-columns:1fr 1fr}.macro-grid{grid-template-columns:repeat(3,1fr)}.score-guide-grid{grid-template-columns:1fr}.add-panel{grid-template-columns:1fr}.form-grid{grid-template-columns:1fr 1fr}.compact-events,.simple-pressure-sequence{grid-template-columns:1fr}.macro-evidence-head{display:none}.macro-evidence-row{grid-template-columns:1fr 1fr}.macro-evidence-row span:last-child{grid-column:1/-1}}
        @media(max-width:720px){main{padding:10px}.hero,.section-head,.detail-head,.summary-head{display:block}.hero button,.section-head>.view-tabs{margin-top:10px}.macro-view-actions{justify-content:flex-start;margin-top:10px}.macro-grid,.macro-two,.priority-grid,.view-grid,.path-grid,.form-grid,.replay-form,.next30-grid,.legend-grid{grid-template-columns:1fr}.macro-evidence-row{grid-template-columns:1fr}.macro-evidence-row span:last-child{grid-column:auto}.info-row,.path-row{grid-template-columns:1fr}.controls{align-items:stretch;flex-direction:column}.table-hint{margin-left:0}.add-control{flex-direction:column}.registry{text-align:left;margin-top:8px}.window-band-head{display:block}.modal-backdrop{padding:0}.modal-shell{height:100vh;border-radius:0}.modal-shell .expanded-card{border-radius:0}.environment-tabs{padding:0}.detail-actions{margin-top:10px}}
      `}</style>
    </main>
  );
}
