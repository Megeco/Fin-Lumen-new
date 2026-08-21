# Fin-Lumen v37.9.14 — single-app Vercel edition

This repository is the direct-deploy edition of Fin-Lumen. The subscriber dashboard, Historical Sky Replay, collapsible v37.9.14 Research View, natal registry, full astrology calculation chain, and native Swiss Ephemeris runtime are one Next.js application.

## Deploy to Vercel

1. Put the **contents of this folder** at the root of a GitHub repository. `package.json`, `pages`, `components`, `lib`, and `styles` must be visible at the repository root.
2. Import that repository into Vercel.
3. Keep **Root Directory** blank (or set it to `.`).
4. Vercel should detect **Next.js** automatically. Do not select `astro-engine-v37.9.14` or `subscriber-interface`; those nested folders do not exist in this corrected edition.
5. Deploy. No environment variables are required for the application or Replay Lab.

The included `vercel.json` installs the native Swiss Ephemeris dependency and runs the production build.

## What is included

- New Fin-Lumen subscriber interface and browser-first watchlist/cache (up to 100 stocks)
- v37.9.14 current readings
- Real Historical Sky Replay for an approved company and chosen date
- Complete collapsible Research View with natal, transit, eclipse, macro, receptor-fit, window, scoring, and replay evidence
- Version-controlled natal registry and approved overrides
- Native `@swisseph/node` runtime; no static astronomy substitute
- Existing new-company admission queue bridge
- Acceptance tests and 30-stock live/Replay parity tests

## Data and persistence

- Personal watchlist and reading cache stay in the user's browser.
- Approved natal records stay in this version-controlled repository.
- New-company requests are forwarded to the existing Fin-Lumen admission service and its current D1 store. No Supabase or new database account is needed.
- The top-right owner button opens the protected owner-review workspace on the existing Fin-Lumen Site.
- If the admission service is moved later, set `FIN_LUMEN_ADMISSION_ORIGIN` to its new origin; current readings and Replay do not depend on that variable.

## Local verification

```bash
npm install
npm test
npm run test:replay-parity
npm run build
npm start
```

Open `http://localhost:3000` after starting.

## Architecture boundary

The astrology engine remains v37.9.14. The interface calls local API routes inside the same Vercel deployment. Unknown company requests never create astrology or modify the approved registry automatically. Owner approval and a reviewed registry change remain required.

Fin-Lumen is an astro-driven phase-research model, not investment advice. Interface wording should describe what the model maps rather than present astrological readings as guaranteed market outcomes.
