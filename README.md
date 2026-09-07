# Fin-Lumen · Personal Research

Complete Vercel deployment package — v37.9.14-personal.2.

Uses the interface from the Fin-Lumen ChatGPT Site with the v37.9.14 astrology engine from your supplied ZIP. No ChatGPT API key, Supabase account, external database, or subscription system is required.

## Deploy on Vercel

1. Extract this ZIP on your computer. Upload its CONTENTS to a new GitHub repository. `package.json`, `pages`, `lib`, `components`, and `vendor` must be at the repository root. Upload the vendor archive intact; do not extract it.
2. In Vercel choose Add New → Project and import that repository.
3. Framework preset: **Next.js**. Root directory: the repository root (`.`). Node.js: **22.x**.
4. Keep the supplied defaults: install `npm ci`, build `npm run build`, standard Next.js output directory. No environment variables are required.
5. Deploy. Open the resulting Vercel URL. Readings calculate as the page opens; the first load may take several seconds.
6. Check Replay Lab with ICICIBANK and 15 August 2024. This build should return Rerating pausing, expansion 62/100 and pressure 51/100.
7. Share the Vercel URL with your friends. Each browser starts with the same ten companies and then saves its own additions and removals.

After deployment, confirm that the footer below the stock table says **Personal build 37.9.14.2**. That visible marker is the quickest way to distinguish this build from the older Vercel interface.

This is a complete application, not an update patch. Do not overlay it on an older repository or preserve obsolete API files. The correct deployment has a dark navy FIN–LUMEN header, a “Personal research · Friends & family” introduction, a side-drawer stock card, and “Personal build 37.9.14.2” beneath the table. If you see “Look up a stock,” “Refresh readings,” the old full-screen research card, or any database-configuration message, Vercel is still building the old repository contents.

If reusing a Vercel project, replace the repository contents completely, clear custom build/output overrides and remove old environment variables. A fresh GitHub repository is the safest route because GitHub’s browser upload does not delete obsolete files from an existing repository.

## Separate personal tables

- Each browser profile stores only its own watchlist and preferred horizon view using localStorage.
- Adding or removing a company does not modify anyone else's watchlist or the bundled universe.
- Limit: 100 companies per browser profile. The add-stock box lists the 90 companies supported by the bundled natal registry. Unknown companies return a clear reviewed-chart-unavailable message and are not added.
- Clearing site data, private browsing, changing browser profiles, or switching to a different domain can reset the table. Different devices do not sync. People sharing one browser profile share that profile's table.
- There are no accounts or login gate. Watchlist separation is not access control for the website: anyone who can access the deployment URL can use the research interface.
- Server memory may cache identical company/date calculations for speed. It stores no shared watchlists and is not required for persistence.

## Readings and replay

- Today uses the India (IST) calendar date. The page refreshes the date on focus and every minute, recalculating when the day changes. The refresh button forces a reload of the current table.
- Current and historical stock requests call `astroEngine` from the supplied build. The old placeholder replay and fixed 20 August 2026 readings have been removed.
- Replay is a recalculation using today's bundled natal registry and model rules applied to the chosen historical sky. It is NOT an immutable record of a prediction made on that day and does not measure investment performance.
- The macro panels calculate Active Now and Next 30 Days. Stock summaries show at most three model path entries intersecting the next 45 days. Detailed cards retain full model windows, contacts, chart evidence and longer cycles.
- The 24-month potential uses the engine's own cycle score and horizon, not a newly computed interface score. Scores are model intensities, not return forecasts or probabilities.
- The astronomy, scoring, windows and interpretation code is preserved. Only `lib/companyResolver.js` was adjusted to disable external database lookup; the bundled natal records and chart-selection rules remain intact.
- Added companies do not trigger automatic internet research or new natal-chart construction.

## Swiss Ephemeris

`vendor/swisseph-node-1.3.0.tgz` is the upstream package, bundled intact. It includes the Linux native module, C sources and planetary/lunar ephemeris data. `npm ci` installs it locally. Other normal framework dependencies are downloaded during deployment.

The engine requires Swiss Ephemeris with Lahiri sidereal positions and the mean lunar node. Its existing hard-failure check prevents silently substituting Moshier calculations. The server tracing configuration includes the ephemeris files and native binding in Vercel functions.

Native calculations run in Node.js server functions, never the Edge runtime or the browser. Function duration is configured to 60 seconds; the client requests stocks in a small queue. Hosting usage limits still apply.

## Verification

Run `npm ci`, `npm test`, and `npm run build`.

`npm test` checks six direct/table-API/replay model comparisons plus invalid inputs and read-only methods. See VALIDATION.md for release results.

The original tests and research audit files are retained for traceability. `test:legacy-ui` checks the OLD interface and is not a release gate for this redesigned front end. Some other historical tests also assume the old page layout; use `npm test` for this package's integration gate.

This package has been built and exercised locally. Your live Vercel deployment has not been performed from this conversation.

## Runtime and dependency notes

The framework was updated from Next.js 14.2.5 to 15.5.24; React remains 18.2.0. This follows the current maintenance release listed by Next.js: https://nextjs.org/blog. The change is for deployment maintenance and does not alter the astrology engine.

Retain the original LICENSE and the included dependency notices. The bundled Swiss Ephemeris package declares AGPL-3.0. No API keys or user credentials are included.
