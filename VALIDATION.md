# Release validation — 7 September 2026

## Passed

- Clean `npm ci` installation using the bundled Swiss Ephemeris archive.
- Compiled production server HTTP checks: dashboard 200; macro for 2026-09-07 200 (five active/four upcoming events); ICICI Bank replay for 2024-08-15 200; Titan current-date reading 200. The measured API calls took approximately 1.0–1.7 seconds on this machine.

- Production Next.js build and TypeScript checking.
- Six complete `astro_model` deep-equality comparisons: direct engine versus table API versus historical replay API.
- Swiss runtime audit: SEFLG_SWIEPH returned for Sun and Moon, Lahiri sidereal zodiac, mean lunar node, bundled ephemeris verified, hard-fail fallback policy.
- Invalid/impossible dates, array inputs, future dates, unsupported company, and POST request rejection.
- Server function dependency traces include `sepl_18.se1`, `semo_18.se1`, `seas_18.se1`, `sefstars.txt`, and `prebuilds/linux-x64/swisseph.node`.
- Source comparison against supplied ZIP: all astrology library files identical except `companyResolver.js`, whose external database lookup is disabled. No scoring or interpretation rule changed.
- Fixed publication data and shared company-admission requests removed from interface.
- External database code and dependency removed; the former configuration error is absent from the runtime source.
- The add-stock selector contains 90 entries and every advertised ticker resolves to a bundled chart (including the AIAENG alias). Hindustan Unilever and Britannia were removed from the selector because their charts are not in this registry.
- All 90 advertised companies completed the full current reading and forward-window calculation for 7 September 2026; zero calculations failed.
- The summary drawer, expanded drawer, and new-tab card all use the ChatGPT Site card component and styling. The older full-screen research modal is not routed by this build.
- A contaminated-repository build test injects obsolete Supabase API files before `npm run build`; the guarded pre-build cleanup removes them and the production build still succeeds with only the four current API routes.

| Company | Sky date | Engine reading | E /100 | P /100 |
| --- | --- | --- | --- | --- |
| ICICI Bank | 2024-08-15 | Rerating pausing | 62 | 51 |
| HDFC Bank | 2026-09-07 | Rerating established | 71 | 58 |
| Newgen | 2025-04-02 | Rerating established | 75 | 56 |
| Garware Hitech | 2026-09-07 | First signs of support | 72 | 71 |
| Bharti Airtel | 2026-09-07 | Expansion strengthening | 74 | 55 |
| GVT&D | 2025-01-15 | Expansion support fading | 55 | 59 |

## Scope and limits

These checks establish implementation consistency, not predictive accuracy. The original engine and chart evidence have not been independently scientifically validated in this work. Browser isolation is implemented through per-origin, per-profile localStorage and read-only server APIs; no browser automation was performed. Tests ran on Linux with Node 24; deployment targets Node 22 using the bundled N-API binding.

A legacy UI acceptance test was attempted and failed at its assertion that the old `pages/index.js` contains the old Rerating Window markup. It is retained as `test:legacy-ui`; this release uses `npm test` for the new integration gate. Live Vercel behavior must be checked after deployment.
