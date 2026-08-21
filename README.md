# Fin-Lumen v37.9.14 Integrated Research + Replay

Complete private-beta source distribution combining:

1. The cache-first Fin-Lumen subscriber interface
2. The production-runtime edition of Fin-Lumen Personal Research 1.0 / v37.9.14 Pure Astro
3. Live Historical Sky Replay
4. A collapsible full Research View in every expanded company card
5. The existing company-admission workflow and database migrations

## Architecture

```text
Subscriber interface
  ├─ current reading adapter ─────────────┐
  ├─ historical replay adapter ──────────┼─> v37.9.14 engine
  ├─ browser watchlist / reading cache   │      ├─ Swiss Ephemeris
  └─ company admission queue             │      ├─ approved natal registry
                                         │      ├─ temporal window scanner
                                         │      └─ replay/research ledger
                                         └─ no second interpretation engine
```

The engine remains the single astrology authority. The interface presents its outputs and never recalculates or blends them.

## Package contents

- `subscriber-interface/` — current Fin-Lumen interface, Replay UI, Research View, D1 schema and migrations
- `astro-engine-v37.9.14/` — complete production runtime, natal registry, Replay endpoint and two authoritative validation suites
- `docs/ARCHITECTURE.md` — boundaries and data flow
- `docs/DEPLOYMENT.md` — deployment instructions and account requirements
- `CHECKSUMS.sha256` — file-integrity manifest

## Important behavior

- Historical Sky Replay accepts an approved company and a past date.
- v37.9.14 reconstructs that date's sky and uses the approved natal chart.
- The result includes natal authority, macro sky, transit-to-natal contacts, scores, windows, long-cycle structure, eclipses, receptor fit, and the complete raw research payload.
- Published Archive retrieves stored publications only. It does not pretend that an arbitrary date was previously published.
- No technical indicators or price data enter the astrology calculation.

## Quick validation

```bash
cd astro-engine-v37.9.14
npm ci
npm test
npm run test:replay-parity

cd ../subscriber-interface
npm ci
npm run build
```

The interface defaults to the existing v37.9.14 engine deployment. No new database account is required for Replay or Research View.

## GitHub file limit

This compact distribution contains **91 files in total**. It is deliberately below GitHub's 100-file browser-upload ceiling. Only redundant development audits, duplicate legacy endpoints and non-runtime reports were omitted. The astrology runtime and user-facing capabilities are unchanged.
