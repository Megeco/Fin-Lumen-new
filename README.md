# Fin-Lumen Pure Astro v37.9.14 — Full Macro Transit Windows Lock Candidate

## Vercel deployment package

This is the single-project Vercel package: the subscriber-facing Fin-Lumen dashboard is the home page and the full v37.9.14 Swiss Ephemeris engine runs in the same deployment.

Upload this folder to GitHub, then import that repository into Vercel with the **Next.js** framework preset. Leave the build and output settings at their defaults. The project contains fewer than 100 source files; do not upload `node_modules`, `.next`, or `.npm-cache`.

The daily watchlist refresh, approved natal registry, current engine readings, full research ledger, and historical replay are all included. Historical replays are available from 1990 through the present date.

> **GitHub compact edition:** This folder retains the complete production dependency graph for current readings, approved natal lookup, Swiss Ephemeris calculation and Historical Sky Replay. It also includes the primary acceptance suite and 30-stock Replay/live parity suite. Redundant development studies, duplicate legacy endpoints and archived audit reports remain preserved in the authoritative full backup but are not required to run this edition.

## What this release is

v37.9.14 preserves the complete Swiss-Ephemeris, sidereal-Lahiri astrology,
natal calculation, aspects, orbs, eclipses and raw Expansion/Pressure/Leadership
scores. It replaces point-in-time interpretation with the replay-validated
temporal-sovereignty methodology. The internal stages remain exact, while the
reader-facing card now explains them in everyday language.

The Macro layer now keeps five forces distinct: supportive expansion, pressure,
inflection, volatility, and transition. Eclipse inflection can no longer
inflate the Expansion score. The public macro state is selected from the active
force ledger plus the applying 14-day sequence, so a threshold or a larger raw
score does not by itself establish temporal sovereignty. Applying, exact, and
separating eclipse timing is preserved in the readable event stream.

Stock paths are now strictly horizon-bounded. When an event continues beyond a
30–60 day panel, the visible segment ends at that panel boundary and explicitly
reports that the underlying passage continues; a February 2027 endpoint can no
longer appear as though it belongs inside an August–October 2026 path.

Expansion exhaustion remains an expansion-state transition. It is no longer
inserted into the pressure stream or described as the first pressure passage.
Pressure passages must be supported by actual pressure activation, sovereignty,
culmination, release, or qualified Break-Risk geometry.

Replay receives the same macro scores, environment stage, force ledger,
sovereignty explanation, and event identity used by the live engine. Historical
price behaviour remains an external validation answer-key only; it is never a
live input or a same-sky-equals-same-outcome rule.

The Macro card now has two visibly different views. Simple explains what is
happening, why pressure is active, what support remains, and the relevant
transit sequence in ordinary language. Research exposes active versus applying
events, aspect orbs, tightening/separating status, exact score contribution,
the 14-day evidence sequence, and the sovereignty rule. Internal `reset`
classification remains available to the engine, but public wording uses
**Inflection** and explains that it is a temporary, event-gated turning-point
field rather than a prediction of a rise or fall. It is hidden when no validated
eclipse corridor is active or approaching. The lower stock table structure and
its Simple/Research views remain unchanged; MCX's production natal authority is
the one replay-supported exception, now using operational launch for direction
and incorporation for structural confirmation.

Future Break-Risk explanations are scoped to the future window they describe,
so IFCI's qualified February 2027 window is no longer paired with a current-date
"No Break-Risk mapped" note. Eclipse evidence names the exact natal receptor,
aspect, orb, and date rather than the generic phrase "natal point."

The two-year replay audit now rejects missing price values instead of coercing
them to zero and tests ordered role-based chart pairs, including operational or
corporatisation anchors. Production promotion remains a reviewed decision; no
raw replay ranking can automatically rewrite the natal registry.

The expanded card's next consequential catalyst now includes the exact leading
stock-specific natal contact and its expected expression. A line such as
“Venus–Rahu trine · 8 Sep” therefore no longer appears without saying which
natal receptor it activates and whether the mapped expression is constructive,
pressuring, or volatility/reversal-led.

The expected-expression sentence now balances the existing supportive and
pressuring natal-contact scores instead of inheriting the macro aspect's tone.
Thus a supportive Jupiter–Saturn macro window can read as balanced and contested
for one stock, but pressure-led for another whose exact Saturn receptors carry
the stronger weight. This changes explanatory language, not the underlying
Expansion, Pressure, Leadership or runway scores.

The visible leading-contact line is generated from the same classified
receptors that determine that conclusion. When support and restraint compete,
both leading contacts are shown; an unrelated high-scoring mixed contact can no
longer appear as though it caused a conclusion based on different geometry.

The production scanner now suppresses legacy test and alias rows after retaining
their underlying research records. Canonical Newgen, JioFin, Infosys, Cyient,
Cochin Shipyard and Voltamp rows appear once. Matching chart type and chart ID
are also printed once rather than producing labels such as “listing listing.”

Adding a new stock opens the natal editor immediately with the entered symbol
prefilled. Jio Financial's production authority is restored to the
user-confirmed 20 Jul 2023 demerger record-date chart (09:15 Mumbai proxy), with
the listing chart retained only as a research comparison.

Strategic cards distinguish constructive expansion from expansion-thread
exhaustion, pausing, and failed recovery. “Next constructive expansion phase”
can no longer point to “Expansion support is fading.”

They now make the same distinction on the pressure side. Vulnerability forming
and early warning remain visible in the chronology, but “Next active pressure
phase” begins only at pressure activation, sovereignty, culmination, or a
qualified Break-Risk event.

Break-Risk cards print the exact qualification date separately from the broader
pressure episode that contains it. Runway language likewise separates intact
pre-Break expansion phases from later post-pressure rebuild phases, preventing
a valid “zero intact phases” result from hiding mapped recovery structure.

Expanded cards suppress verbatim repetitions between a window or path headline
and its explanation, use singular grammar for one mapped phase, and avoid
printing the same natal chart ID and chart type twice.

This release makes the Strategic View stock-specific rather than explaining the
tab itself. It presents the medium-term horizon as **3–18 months**, adds a plain
"What to expect" interpretation and a compact likely sequence, and retains the
complete dated Strategic Timing Path below it.

Astro Research is now a structured hybrid of the older deep research panel and
the current temporal-sovereignty evidence. It restores the useful broad view,
stock response, natal behaviour, receptor evidence, and long-cycle narrative,
while excluding the retired HOLD/TRIM/entry/capital-deployment language. The
research is grouped into synopsis, scores and cycle position, natal authority,
current transits, temporal sovereignty, advanced rerating cross-checks, and the
full long-cycle map.

The underlying v37.3.1 synthesis combines the readable expanded-card hierarchy
and deep research visibility of v34.12 with the live astronomy, natal
sovereignty, and later transit logic of v37.2.

It does not issue trading instructions, position-sizing labels, or portfolio
verdicts. The production chain is:

> Swiss Ephemeris → separate expansion and pressure threads → persistence and
> compare support with pressure → identify which is stronger → date each change

The live interpretation distinguishes expansion formation, activation,
confirmation, continuation, acceleration and exhaustion; pressure warning,
activation, sovereignty, culmination and release; and release-only, failed
recovery, recovery formation and rerating renewal. Expansion and Pressure are
never subtracted, averaged or collapsed into one net score.

## Astronomy

- Direct `@swisseph/node` runtime.
- Sidereal Lahiri zodiac.
- Mean lunar node; Ketu is the exact opposite point.
- Exact UTC/Julian conversion.
- Native longitude speed for stations and retrograde states.
- Direct solar/lunar eclipse searches.
- Required `SEFLG_SWIEPH` result flag; Moshier fallback is a hard error.
- No static Swiss JSON execution path.

Run `/api/debug-astronomy` or `/api/precision-check` to inspect the provider,
returned flags, zodiac, ayanamsa, and current positions.

## Break-Risk constitution

The retired duration rule is not present. Break-Risk cannot be created
because a future support state is absent for an arbitrary number of days.

Break-Risk requires:

1. A severe pressure score that materially exceeds expansion while leadership
   is impaired.
2. A destructive structural contact network led by Saturn, Ketu, or eclipse
   contacts. Mars and Rahu may amplify or trigger but cannot prove Break-Risk
   by themselves.
3. Persistent destructive structure, receptor handoff and leadership
   suppression. Fall size and elapsed time never create Break-Risk.

Future support and renewed expansion dates remain useful path context. They do
not create or cancel Break-Risk merely because a duration threshold is crossed.

## Natal chart policy

- Documented time: full time-dependent calculation.
- Session-bounded event: retain only interval-stable factors.
- 09:15 Mumbai listing proxy: stable planets; no assumed angles or houses.
- 11:00 local incorporation proxy: stable planets; no assumed angles or houses.
- Noon is a software convention, not superior evidence.
- Rectified candidates remain research-only until independently validated.

The current registry remains backward-compatible with earlier database fields,
but v37.3 presents chart authority as `VERIFIED`, `PROVISIONAL`, or
`RESEARCH_ONLY`.

v37.5.1 adds source-verified NSE listing candidates for MARUTI, ACE, SCHNEIDER,
SANSERA, NEULANDLAB, LAURUSLABS, HSCL, and HBLENGINE. Their listing dates are
official; 09:15 Mumbai remains a declared session proxy. These charts calculate
full pressure/expansion paths but remain `RESEARCH_ONLY` until sovereignty
replay validates the preferred anchor.

v37.9 removes the generic 8 February 1995 NSE migration proxy from ABB India,
Aarti Industries and Tata Elxsi. They now calculate from distinct company
anchors: ABB India incorporation on 24 December 1949 in Bengaluru, Aarti
Industries incorporation on 28 September 1984 in Mumbai, and Tata Elxsi
incorporation on 30 March 1989 in Bengaluru. These corrected anchors are
explicitly marked for fresh replay validation rather than inheriting authority
from the discarded shared proxy. A registry-wide chart-fingerprint guard now
blocks any future exact chart clone from claiming independent stock-specific
authority.

## Chart lineage

The production doctrine is role-based:

- Enterprise root: incorporation or genuine successor formation.
- Security birth: first public valuation/first trade.
- Transformation node: merger, demerger, reverse merger, or control change only
  when the underlying identity actually changes.
- Activation node: record date, allotment, relisting, index admission, name
  change, split, bonus, or similar event; not an automatic natal replacement.

Documentary identity assigns jurisdiction. Replay validates the astrological
synthesis; historical prices do not choose whichever chart happens to fit.

Four validated role splits are encoded without blended scores:

- Newgen: listing for rerating expression; incorporation for structural
  pressure and Break.
- Cochin Shipyard: incorporation for formation/foundation; listing for traded
  vulnerability, continuing deterioration and failed-recovery risk.
- ONGC: statutory formation for structural warning/Break/release; listing for
  market-expression sovereignty and crossover timing.
- Garware Hi-Tech: original incorporation for structural foundation/Break;
  original listing for traded deterioration; 2022 listed-identity chart for
  recovery and renewed expression.

## Interface

v37.5.1 keeps the corrected v37.3.1 synthesis underneath a denser scanner built
for a large stock universe. Simple View is the default; Research View exposes
the fuller evidence table. The upper navigation separates Macro Astro
Environment, Next 30 Days, and Astro State Legend.

Pressure, expansion, reset, volatility, leadership, reliability, and cycle-runway
values are explicitly labelled `/100`. They are independent intensity scores,
not percentages or return forecasts. The interface includes separate stock and
macro score guides because the macro model uses lower event-load thresholds.

Every main-table heading now carries a concise hover definition, including
Current Leadership, Forward Leadership, Cycle Runway, Pressure, Expansion,
Regime, Tactical Path, Next Astro Gate, Correction Mode and Strategic Path.
Pressure stages use plain descriptions: starting to build, starting to take
control, in control, peak pressure, and easing. Technical stage codes remain
available inside the engine but are no longer shown as unexplained labels.

Every stock now has a dated 24-month runway line. It shows the scan start and
end, or ends at the first qualified Break-Risk phase when one occurs sooner.
The last mapped expansion-phase end and the wider month-19-to-36 map remain
separate so those dates cannot be confused.

The main table separates pressure and expansion into their own columns, keeps
the stock column fixed while scrolling, uses sticky headers, and limits colour
to semantic cues. The 36.9.12-style long-cycle research value has been restored
using only v37.3.1 outputs: cycle level, runway score, forward leadership,
mapped expansion episodes, post-pressure re-formation, activation planets, and the
first structurally qualified Break-Risk date.

Expanded stock cards open in an in-app modal. The stock name is also a real
card URL, so the browser context menu can open it in a new tab or window; the
card header provides dedicated pop-up and new-tab controls.

The scanner and expanded card show:

- current astro state and directional bias;
- pressure/expansion scores;
- current and forward leadership;
- green Rerating Window;
- mild-red Break-Risk Window only when structurally qualified;
- Tactical today-through-day-60, Strategic day-61-through-18-month, and
  Long-cycle month-19-through-month-36 paths;
- correction behaviour;
- cycle runway;
- natal source, time precision, anchor policy, and chart authority;
- supportive, pressuring, and volatile natal receptors;
- destructive Break-Risk evidence and future support context;
- eclipses, clusters, overlap, transit-receptor scores, and top contacts.

Replay Lab uses the same pure-astro synthesis and temporal interpretation as
the production card.

## Shadow calibration layer

v37.6.0 adds a diagnostic-only interpretation alongside Replay Research. It
consumes the existing astrology without changing any authoritative score,
window, Break-Risk finding, card story, or scanner conclusion.

The diagnostic maps:

- pressure and expansion as building, peaking, releasing, or stable;
- operative aspect contacts as applying, exact/stationary, or separating;
- severe pressure as absorbed, Break-Risk, or pressure followed by repair;
- support as present, contested, releasing into expansion, early expansion,
  clean expansion, mature expansion, or support decay/renewed pressure;
- a separate episode-based runway that counts one sustained transit as one
  episode and subtracts unresolved serious-pressure episodes.

The diagnostic appears only inside Replay Research. It is not used by the main
table, expanded card, production window selector, or existing long-cycle score.

## Install and verify

```bash
npm ci
npm test
npm run test:stock-smoke
npm run test:shadow
npm run test:shadow-panel
npm run test:shadow-stability
npm run build
```

The personal-use project depends on Swiss Ephemeris, which is dual-licensed.
Review the Swiss Ephemeris licensing terms before any public redistribution or
hosted public service.
