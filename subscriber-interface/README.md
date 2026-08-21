# Fin-Lumen Subscriber Interface

The private-beta interface for Fin-Lumen Personal Research 1.0. It is a cache-first publication and research client for the authoritative **v37.9.14 Pure Astro engine**.

## What is included

- Combined, positional (45-day), and investor (24-month) watchlist views
- Up to 100 device-local watchlist entries
- Approved-company lookup and natal-admission queue
- Expanded and full-page company readings
- Collapsible **Research View** with the full v37.9.14 natal, transit, eclipse, scoring, temporal-window, and long-cycle payload
- Live **Historical Sky Replay** for any approved company and date
- Published Archive for stored publication batches

The interface does not implement a second astrology engine. Current readings and historical replays are requested from the v37.9.14 service through server-side adapter routes.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm ci
npm run dev
```

The default engine endpoint is:

```text
https://fin-lumen-pure-astro.vercel.app
```

To use another deployment, set:

```text
FIN_LUMEN_ENGINE_ORIGIN=https://your-engine.example.com
```

Do not expose database or engine credentials in browser-side environment variables.

## Persistence

- Watchlist order and preferences: browser local storage
- Cached readings: IndexedDB
- Company admission requests: D1 through the included schema and migrations
- Historical Replay: calculated on demand by v37.9.14 and cacheable by company/date
- Published Archive: immutable publication batches only

Replay and Research View do not require a new database account. A database is needed only when deploying the shared company-admission queue outside the current hosted Site.

## Validation

```bash
npm run build
npm test
```

The v37.9.14 engine has its own acceptance, natal, shadow, replay-parity, rerating, temporal-sovereignty, and role-chart checks in the combined distribution.
