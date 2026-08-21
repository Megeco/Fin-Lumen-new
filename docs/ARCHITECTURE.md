# Architecture and authority boundaries

## One-way model

```text
Swiss sky + approved natal record
              ↓
   v37.9.14 Pure Astro engine
              ↓
 current reading / historical replay payload
              ↓
      subscriber presentation
```

The subscriber interface is downstream. It cannot change natal selection, scores, phase authority, tactical/strategic chronology, long-cycle structure, or Break-Risk qualification.

## Current readings

`subscriber-interface/app/api/engine/stock/route.ts` resolves an approved company and retrieves its v37.9.14 reading. Browser caching prevents the whole table from recalculating on each page load.

## Historical Replay

`subscriber-interface/app/api/engine/replay/route.ts` validates the ticker/date and requests:

```text
/api/replay-lab?ticker=...&date=...&forwardDays=730&raw=1
```

The engine then calculates:

- Time/place-aware natal positions
- Historical Swiss Ephemeris transits
- Relevant eclipse field and natal hits
- Transit-to-natal resonance
- Macro environment
- Receptor fit
- Tactical, strategic, and long-range windows
- Cycle runway and v37.9.14 interpretation

The adapter canonicalizes the displayed engine version to v37.9.14 while retaining the original route label in the returned payload.

## Research View

Research View loads only when its dropdown is opened. It exposes:

- Model and raw Expansion/Pressure
- Leadership, regime, expression, and confidence
- Selected natal chart and competing candidates
- Date, time, place, timezone, source, and validation status
- Macro environment and dominant forces
- Ranked transit-to-natal contacts
- Temporal paths, windows, cycle ledger, sector context, and receptor fit
- Complete raw replay/research JSON

This keeps the ordinary expanded card readable while preserving the entire evidence record for the owner.

## Data and persistence

- Browser local storage: personal table and display preferences
- IndexedDB: cached company readings
- D1: shared company-admission requests and owner-review state
- Engine registry: version-controlled approved natal records
- Published Archive: immutable publication batches

