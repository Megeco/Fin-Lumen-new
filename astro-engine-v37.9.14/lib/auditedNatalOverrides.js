const INDIA = "India";
const IST = "Asia/Kolkata";

const chart = (id, chartType, date, city, time, source, confidence = "candidate") => ({
  id,
  chartType,
  date,
  time,
  city,
  country: INDIA,
  timezone: IST,
  confidence,
  source
});

const listing = (date, source, confidence = "replay-validated") =>
  chart("listing", "listing", date, "Mumbai", "09:15", source, confidence);

const incorporation = (date, city, source, confidence = "replay-validated") =>
  chart("incorporation", "incorporation", date, city, "11:00", source, confidence);

const selected = ({ preferredChartId, charts = [], confidence = "replay-validated", rejectedCandidates = [], companyName = null, capitalAuthorityCeiling = "FULL_BUILD_ELIGIBLE" }) => ({
  ...(companyName ? { companyName } : {}),
  preferredChartId,
  auditStatus: "user-confirmed-locked-preferred-anchor",
  sourceVerification: "verified-project-ledger",
  anchorValidation: "definitive-user-confirmed",
  timePrecision: String(preferredChartId).includes("listing") || preferredChartId === "listed-name-change-2022"
    ? "exchange-open-default"
    : preferredChartId === "incorporation"
      ? "incorporation-default"
      : "event-time-assumed",
  capitalAuthorityCeiling,
  standardizedTwoYearValidation: "not-required-locked-ledger",
  definitiveProductionAnchor: true,
  confidence,
  rejectedCandidates,
  charts
});

const finalized = options => ({
  ...selected(options),
  auditStatus: "two-year-validated-locked-preferred-anchor",
  anchorValidation: "definitive-two-year-astro-review",
  standardizedTwoYearValidation: "completed-2024-07-22-to-2026-07-22",
  definitiveProductionAnchor: true
});

const candidate = ({ preferredChartId = "incorporation", charts = [], sourceVerification = "verified-primary-source", companyName = null, auditStatus = "source-verified-anchor-untested" }) => ({
  ...(companyName ? { companyName } : {}),
  preferredChartId,
  auditStatus,
  sourceVerification,
  anchorValidation: "untested",
  timePrecision: String(preferredChartId).includes("listing") || String(preferredChartId).includes("record-date")
    ? "exchange-open-default"
    : "event-time-assumed",
  capitalAuthorityCeiling: "RESEARCH_ONLY",
  confidence: "research-candidate",
  charts
});

const PROJECT_LEDGER = "Fin-Lumen natal candidate ledger; replay-selected against contrasting expansion, pressure and dormancy episodes.";
const USER_LOCKED_LEDGER = "User-confirmed Fin-Lumen natal ledger; date and preferred production anchor are locked and may not be reopened by automated price-fit ranking.";
const FINAL45_LEDGER = "Fin-Lumen standardized two-year audit plus astrology-led episode review; expansion, pressure, reversal, dormancy and six-month holdout were reviewed before production lock.";

/**
 * Natal Sovereignty registry.
 *
 * A chart can calculate without being authorised. The four independent fields
 * below are intentionally not inferred from a legacy confidence label:
 * sourceVerification, anchorValidation, timePrecision and
 * capitalAuthorityCeiling.
 */
const auditedNatalOverrides = {
  // Source-verified NSE listing anchors added in v37.5.1. These calculate in
  // production so the stocks no longer remain Natal Pending, but they retain
  // RESEARCH_ONLY authority until a sovereignty replay selects and validates
  // the listing chart against any incorporation or successor alternative.
  "ABCAPITAL.NS": candidate({ companyName: "Aditya Birla Capital Limited", preferredChartId: "listing", charts: [listing("2017-09-01", "Official NSE equity security master: ABCAPITAL listed 1 Sep 2017; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "ABB.NS": candidate({ companyName: "ABB India Limited", preferredChartId: "incorporation", charts: [incorporation("1949-12-24", "Bengaluru", "ABB India Limited CIN L32202KA1949PLC032923 records incorporation on 24 Dec 1949. The generic 8 Feb 1995 NSE migration date is retained nowhere as a stock-specific natal anchor.", "source-verified-anchor-revalidation-required")] }),
  "ACUTAAS.NS": candidate({ companyName: "Acutaas Chemicals Limited (formerly Ami Organics Limited)", preferredChartId: "listing", charts: [listing("2021-09-14", "Official NSE equity security master: ACUTAAS/AMIORG listed 14 Sep 2021; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "CERA.NS": candidate({ companyName: "Cera Sanitaryware Limited", preferredChartId: "listing", charts: [listing("2007-11-02", "Official NSE equity security master: CERA listed 2 Nov 2007; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "GRASIM.NS": candidate({ companyName: "Grasim Industries Limited", preferredChartId: "listing", charts: [listing("1995-05-10", "Official NSE equity security master: GRASIM listed 10 May 1995; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "GVT&D.NS": candidate({ companyName: "GE Vernova T&D India Limited", preferredChartId: "listing", charts: [listing("2008-06-30", "Official NSE equity security master: GVT&D listed 30 Jun 2008; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "VOLTAMP.NS": candidate({ companyName: "Voltamp Transformers Limited", preferredChartId: "listing", charts: [listing("2006-09-20", "Official NSE equity security master: VOLTAMP listed 20 Sep 2006; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "MARUTI.NS": candidate({ companyName: "Maruti Suzuki India Limited", preferredChartId: "listing", charts: [listing("2003-07-09", "Official NSE equity security master: MARUTI listed 9 Jul 2003; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "ACE.NS": candidate({ companyName: "Action Construction Equipment Limited", preferredChartId: "listing", charts: [listing("2006-09-26", "Official NSE equity security master: ACE listed 26 Sep 2006; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "SCHNEIDER.NS": candidate({ companyName: "Schneider Electric Infrastructure Limited", preferredChartId: "listing", charts: [listing("2012-03-20", "Official NSE equity security master: SCHNEIDER listed 20 Mar 2012; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "SANSERA.NS": candidate({ companyName: "Sansera Engineering Limited", preferredChartId: "listing", charts: [listing("2021-09-24", "Official NSE equity security master: SANSERA listed 24 Sep 2021; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "NEULANDLAB.NS": candidate({ companyName: "Neuland Laboratories Limited", preferredChartId: "listing", charts: [listing("2008-10-13", "Official NSE equity security master: NEULANDLAB listed 13 Oct 2008; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "LAURUSLABS.NS": candidate({ companyName: "Laurus Labs Limited", preferredChartId: "listing", charts: [listing("2016-12-19", "Official NSE equity security master: LAURUSLABS listed 19 Dec 2016; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "HSCL.NS": candidate({ companyName: "Himadri Speciality Chemical Limited", preferredChartId: "listing", charts: [listing("2007-03-02", "Official NSE equity security master: HSCL listed 2 Mar 2007; 09:15 Mumbai is a declared session proxy.", "source-verified-research-candidate")] }),
  "HBLENGINE.NS": candidate({ companyName: "HBL Engineering Limited", preferredChartId: "listing", charts: [listing("2007-01-04", "Official NSE equity security master: HBLENGINE listed 4 Jan 2007; 09:15 Mumbai is a declared session proxy. The Dec 2024 company/symbol name change does not create a second traded-security chart.", "source-verified-research-candidate")] }),

  // A–Gravita: selections already completed in the replay programme.
  "AARTIIND.NS": candidate({ companyName: "Aarti Industries Limited", preferredChartId: "incorporation", charts: [incorporation("1984-09-28", "Mumbai", "Company incorporation record retained in the Fin-Lumen natal audit inventory. The generic 8 Feb 1995 NSE migration date is not authorised as a stock-specific anchor.", "source-verified-anchor-revalidation-required")] }),
  "AIAENG.NS": selected({ preferredChartId: "listing", rejectedCandidates: ["incorporation"], charts: [listing("2005-12-14", PROJECT_LEDGER)] }),
  "ANANTRAJ.NS": selected({ preferredChartId: "incorporation", confidence: "replay-validated-low-source", capitalAuthorityCeiling: "PART_BUILD_MAX", rejectedCandidates: ["listing-alternate-2006-01-17"], charts: [incorporation("1985-07-30", "Haryana", PROJECT_LEDGER, "replay-validated-low-source")] }),
  "DMART.NS": selected({ preferredChartId: "listing", rejectedCandidates: ["incorporation"], charts: [listing("2017-03-21", PROJECT_LEDGER)] }),
  "BSE.NS": selected({ preferredChartId: "listing", confidence: "validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2017-02-03", PROJECT_LEDGER, "validated-high")] }),
  "BAJAJFINANCE.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2003-04-01", PROJECT_LEDGER, "replay-validated-high")] }),
  "BAJAJFINSV.NS": selected({ preferredChartId: "listing", rejectedCandidates: ["incorporation"], charts: [listing("2008-05-26", PROJECT_LEDGER)] }),
  "BATAINDIA.NS": {
    ...selected({ preferredChartId: "listing", charts: [
      listing("2003-06-18", "NSE listing record: listed 18 Jun 2003; locked primary price-cycle chart.", "user-confirmed-locked"),
      incorporation("1931-12-23", "Kolkata", "Company incorporation record: 23 Dec 1931; locked secondary structural overlay with assumed 11:00 time.", "user-confirmed-secondary-overlay")
    ] }),
    secondaryChartId: "incorporation",
    dualChartPolicy: {
      mode: "ROLE_BASED_CONFIRMATION",
      directionAuthority: "listing",
      timingAuthority: "listing",
      opportunityAuthority: "listing",
      structuralConfirmation: "incorporation",
      disagreementEffect: "CONFIDENCE_ONLY",
      secondaryMayCreateOpportunity: false,
      secondaryMayVetoOrdinaryPressure: false,
      secondaryMayCapFullBuildOnSevereConflict: true,
      breakRequiresDualConfirmation: true
    }
  },
  "BDL.NS": selected({ preferredChartId: "incorporation", confidence: "replay-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("1970-07-16", "Hyderabad", PROJECT_LEDGER, "replay-validated-high")] }),
  "BEL.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2000-07-19", PROJECT_LEDGER, "replay-validated-high")] }),
  "BHARTIARTL.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2002-02-15", PROJECT_LEDGER, "replay-validated-high")] }),
  "CGPOWER.NS": selected({ preferredChartId: "incorporation", confidence: "replay-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("1937-04-28", "Mumbai", "Official exchange filing confirms the date; incorporation chart passed the Oct 2020–Jun 2021 turnaround replay.", "replay-validated-high")] }),
  "CARTRADE.NS": selected({ preferredChartId: "incorporation", confidence: "replay-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("2000-04-28", "Mumbai", PROJECT_LEDGER, "replay-validated-high")] }),
  "CDSL.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2017-06-30", PROJECT_LEDGER, "replay-validated-high")] }),
  "COCHINSHIP.NS": {
    ...selected({ preferredChartId: "incorporation", confidence: "replay-validated-high", charts: [
      incorporation("1972-03-29", "Kochi", `${PROJECT_LEDGER} Validated for rerating formation and structural foundation.`, "replay-validated-high"),
      listing("2017-08-11", "Exchange listing chart; validated as a distinct traded-vulnerability, crash-continuation and failed-recovery role.", "replay-validated-role")
    ] }),
    chartRolePolicy: {
      mode: "DISTINCT_ROLE_AUTHORITY",
      scoresBlended: false,
      crossoverRule: "REQUIRE_TRADED_DETERIORATION_CONFIRMATION",
      roles: [
        { chartId: "incorporation", role: "ENTERPRISE_FOUNDATION", authorities: ["EXPANSION_FOUNDATION", "STRUCTURAL_PRESSURE_BREAK"] },
        { chartId: "listing", role: "TRADED_EXPRESSION", authorities: ["MARKET_EXPRESSION_RERATING", "TRADED_DETERIORATION", "FAILED_RECOVERY"] }
      ],
      doctrine: "Incorporation owns formation/foundation; listing owns traded vulnerability and continuing deterioration. Macro is a trigger/amplifier. Charts are never averaged."
    }
  },
  "CUMMINSIND.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("1995-03-28", PROJECT_LEDGER, "replay-validated-high")] }),
  "CUPID.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2016-09-16", PROJECT_LEDGER, "replay-validated-high")] }),
  "DATAPATTERNS.NS": selected({ preferredChartId: "incorporation", confidence: "replay-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("1998-11-11", "Bengaluru", PROJECT_LEDGER, "replay-validated-high")] }),
  "DIVISLAB.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2003-03-12", PROJECT_LEDGER, "replay-validated-high")] }),
  "DIXON.NS": selected({ companyName: "Dixon Technologies (India) Limited", preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [
    incorporation("1993-01-15", "Alwar", "SEBI prospectus incorporation candidate; rejected as production anchor.", "rejected-candidate"),
    listing("2017-09-18", PROJECT_LEDGER, "replay-validated-high")
  ] }),
  "ENGINERSIN.NS": selected({ preferredChartId: "incorporation", charts: [incorporation("1965-03-15", "New Delhi", PROJECT_LEDGER)] }),
  "FORTIS.NS": selected({ preferredChartId: "incorporation", confidence: "replay-validated-moderate", charts: [incorporation("1996-02-28", "Chandigarh", PROJECT_LEDGER, "replay-validated-moderate")] }),
  "GRWRHITECH.NS": {
    ...selected({ preferredChartId: "listed-name-change-2022", charts: [
      incorporation("1957-06-06", "Mumbai", "Legacy original-incorporation record; date is provisionally replay-validated but source/time/place authority remains limited.", "replay-validated-role-low-source"),
      listing("1981-05-26", "Original listing record; provisionally replay-validated for traded deterioration and continuing decline; primary exchange verification pending.", "replay-validated-role"),
      chart("listed-name-change-2022", "listed-name-change", "2022-02-03", "Mumbai", "09:15", `${PROJECT_LEDGER} Validated for post-2022 recovery and renewed market expression.`, "replay-validated")
    ] }),
    chartRolePolicy: {
      mode: "DISTINCT_ROLE_AUTHORITY",
      scoresBlended: false,
      crossoverRule: "REQUIRE_TRADED_DETERIORATION_CONFIRMATION",
      roles: [
        { chartId: "incorporation", role: "ENTERPRISE_FOUNDATION", authorities: ["EXPANSION_FOUNDATION", "STRUCTURAL_PRESSURE_BREAK"] },
        { chartId: "listing", role: "ORIGINAL_TRADED_EXPRESSION", authorities: ["TRADED_DETERIORATION", "FAILED_RECOVERY"] },
        { chartId: "listed-name-change-2022", role: "CURRENT_IDENTITY_EXPRESSION", effectiveFrom: "2022-02-03", authorities: ["MARKET_EXPRESSION_RERATING", "RECOVERY_RENEWAL"] }
      ],
      doctrine: "Original incorporation owns structural foundation/Break; original listing owns continuing traded decline; the 2022 identity chart owns later recovery/renewal. Charts are never averaged."
    }
  },
  "GRAVITA.NS": selected({ preferredChartId: "listing", confidence: "replay-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2010-11-16", PROJECT_LEDGER, "replay-validated-high")] }),

  // User-confirmed alphabetical natal ledger: every main-table record through
  // HDFC Bank is a locked production anchor. Automated two-year rankings may
  // study these records, but may never downgrade, replace or re-queue them.
  "CAMS.NS": selected({ companyName: "Computer Age Management Services Limited", preferredChartId: "incorporation", confidence: "user-confirmed-locked", charts: [
    incorporation("1988-05-25", "Chennai", USER_LOCKED_LEDGER, "user-confirmed-locked"),
    chart("public-conversion", "public-conversion", "2019-09-27", "Chennai", "11:00", "CAMS annual report: fresh public-company certificate dated 27 Sep 2019.", "secondary-candidate"),
    chart("bse-listing", "listing", "2020-10-01", "Mumbai", "09:15", "CAMS annual report: BSE listing 1 Oct 2020.", "secondary-candidate"),
    chart("nse-listing", "listing", "2021-05-07", "Mumbai", "09:15", "CAMS company filing: NSE listing 7 May 2021.", "secondary-candidate")
  ] }),
  "COALINDIA.NS": selected({ companyName: "Coal India Limited", preferredChartId: "incorporation", confidence: "user-confirmed-locked", charts: [
    incorporation("1975-06-14", "Kolkata", USER_LOCKED_LEDGER, "user-confirmed-locked"),
    chart("coal-india-formation", "statutory-formation", "1975-11-01", "Kolkata", "15:00", "Official PSU formation date retained as a secondary research chart.", "secondary-candidate"),
    listing("2010-11-04", "Exchange listing date retained as a secondary research chart.", "secondary-candidate")
  ] }),
  "ETERNAL.NS": selected({ companyName: "Eternal Limited / Zomato Limited", preferredChartId: "name-change-eternal", confidence: "user-confirmed-locked", charts: [
    incorporation("2010-01-18", "Gurugram", "Locked legal-entity structural chart.", "secondary-structural-overlay"),
    listing("2021-07-23", "Locked traded-security history chart.", "secondary-market-overlay"),
    chart("name-change-eternal", "name-change", "2025-03-20", "New Delhi", "11:00", `${USER_LOCKED_LEDGER} Current-identity chart applies from 20 Mar 2025 onward.`, "user-confirmed-locked")
  ] }),
  "FEDERALBNK.NS": selected({ companyName: "The Federal Bank Limited", preferredChartId: "incorporation", confidence: "user-confirmed-locked", charts: [
    incorporation("1931-04-23", "Nedumpuram", USER_LOCKED_LEDGER, "user-confirmed-locked")
  ] }),
  "HCLTECH.NS": selected({ companyName: "HCL Technologies Limited", preferredChartId: "incorporation", confidence: "user-confirmed-locked", charts: [
    incorporation("1991-11-12", "New Delhi", USER_LOCKED_LEDGER, "user-confirmed-locked"),
    chart("name-change-hcltech", "name-change", "1999-10-06", "New Delhi", "11:00", "HCLTech fresh-certificate date retained as a secondary research chart.", "secondary-candidate"),
    listing("2000-01-10", "HCLTech listing date retained as a secondary research chart.", "secondary-candidate")
  ] }),
  "HDFCBANK.NS": {
    ...selected({ companyName: "HDFC Bank Limited", preferredChartId: "merger-effective-2023", confidence: "user-confirmed-locked", charts: [
      incorporation("1994-08-30", "Mumbai", "Pre-merger legal-entity chart retained as a structural overlay.", "secondary-structural-overlay"),
      listing("1995-11-08", "Pre-merger traded-security chart retained as a secondary overlay.", "secondary-market-overlay"),
      chart("merger-effective-2023", "merger-effective", "2023-07-01", "Mumbai", "11:00", `${USER_LOCKED_LEDGER} HDFC Ltd merger effective 1 Jul 2023; event time uses the project default.`, "user-confirmed-locked")
    ] }),
    mergerDate: "2023-07-01",
    mergerChartId: "merger-effective-2023",
    mergerDatePrecision: "effective-date-confirmed-time-assumed"
  },

  // Previously promoted out of sequence; returned to the post-HDFC queue.
  "JIOFIN.NS": candidate({
    preferredChartId: "demerger-record-date",
    auditStatus: "source-verified-anchor-awaiting-sovereignty-replay",
    charts: [
      chart("demerger-record-date", "record-date", "2023-07-20", "Mumbai", "09:15", "Official demerger record date; candidate anchor.", "research-candidate"),
      chart("fresh-name-certificate", "scheme-effective", "2023-07-25", "Mumbai", "11:00", "Official fresh certificate/name date; candidate anchor.", "research-candidate"),
      listing("2023-08-21", "Official BSE/NSE listing date; candidate anchor.", "research-candidate")
    ]
  }),

  "TATAPOWER.NS": candidate({
    companyName: "The Tata Power Company Limited",
    preferredChartId: "incorporation",
    charts: [
      incorporation("1919-09-18", "Mumbai", "Tata Power annual return: incorporation date 18 Sep 1919; 11:00 is the project default.", "research-candidate"),
      listing("1996-04-02", "Project candidate ledger — exchange listing candidate; final primary-source manifest pending.", "research-candidate")
    ],
    sourceVerification: "incorporation-verified-listing-pending"
  }),

  "VEDL.NS": candidate({
    preferredChartId: "incorporation",
    auditStatus: "restructured-entity-anchor-untested",
    charts: [
      incorporation("1965-06-25", "Mumbai", "Project candidate ledger; primary-source manifest pending.", "research-candidate"),
      chart("demerger-effective-2026", "demerger-effective", "2026-05-01", "Mumbai", "09:15", "Official Vedanta scheme effective/record date; structural-event candidate.", "research-candidate")
    ],
    sourceVerification: "mixed-source-status"
  }),

  // Live-table names absent from the user's original sheet. These facts were
  // reconciled against primary company/exchange material in this release.
  "PIIND.NS": candidate({ companyName: "PI Industries Limited", charts: [incorporation("1946-12-31", "Udaipur", "PI Industries annual return/annual report: registration date 31 Dec 1946.", "research-candidate")] }),
  "PERSISTENT.NS": candidate({ companyName: "Persistent Systems Limited", preferredChartId: "incorporation", charts: [
    incorporation("1990-05-30", "Pune", "Persistent annual report: incorporated 30 May 1990.", "research-candidate"),
    listing("2010-04-06", "Persistent FY2010 annual report: BSE/NSE listing 6 Apr 2010.", "research-candidate")
  ] }),
  "WPIL.NS": candidate({ companyName: "WPIL Limited", charts: [incorporation("1952-02-26", "Kolkata", "WPIL annual report MGT-9: registration date 26 Feb 1952.", "research-candidate")] }),
  "IDEA.NS": candidate({ companyName: "Vodafone Idea Limited", preferredChartId: "incorporation", charts: [
    incorporation("1995-03-14", "Mumbai", "Vodafone Idea scheme/annual report: continuing company incorporated 14 Mar 1995 as Birla Communications Limited.", "research-candidate"),
    chart("vodafone-idea-merger-effective", "merger-effective", "2018-08-31", "Gandhinagar", "11:00", "Vodafone Idea annual report: merger implemented 31 Aug 2018; event time is an explicit default.", "research-candidate")
  ] }),
  "ONGC.NS": candidate({ companyName: "Oil and Natural Gas Corporation Limited", preferredChartId: "company-conversion", charts: [
    chart("statutory-commission", "statutory-formation", "1956-08-14", "New Delhi", "11:00", "ONGC official institutional history; statutory formation candidate.", "research-candidate"),
    chart("company-conversion", "company-conversion", "1993-06-23", "New Delhi", "11:00", "ONGC corporate conversion candidate; exact source manifest retained for final audit.", "research-candidate"),
    listing("1993-08-10", "SEBI ONGC offer document: shares already listed/permitted for NSE trading on 10 Aug 1993.", "research-candidate")
  ], sourceVerification: "mixed-source-status" }),
  "HINDCOPPER.NS": candidate({ companyName: "Hindustan Copper Limited", charts: [
    incorporation("1967-11-09", "Kolkata", "Hindustan Copper official company page: incorporated 9 Nov 1967.", "research-candidate"),
    chart("bse-listing", "listing", "1994-08-02", "Mumbai", "09:15", "Hindustan Copper annual report: BSE listing effective 2 Aug 1994.", "research-candidate"),
    chart("nse-listing", "listing", "2010-09-15", "Mumbai", "09:15", "Hindustan Copper annual report: NSE listing effective 15 Sep 2010.", "research-candidate")
  ] }),
};

/**
 * Post-HDFC natal ledger, finalized 22 Jul 2026.
 *
 * The aggregate audit score was evidence, not the selector. Each choice was
 * reviewed against the actual expansion, pressure, dormancy and holdout
 * episodes. Close numerical blends were not promoted unless they established
 * a stable, separately useful role; no unresolved blend is represented as a
 * live production calculation.
 */
const finalizedPostHDFCLedger = {
  "TDPOWERSYS.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2011-09-08", FINAL45_LEDGER, "two-year-validated-high")] }),
  "PIIND.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-single-anchor", charts: [incorporation("1946-12-31", "Udaipur", FINAL45_LEDGER, "two-year-validated-single-anchor")] }),
  "NETWEB.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-moderate", rejectedCandidates: ["listing"], charts: [incorporation("1999-09-22", "Faridabad", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "SOLARINDS.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2006-04-03", FINAL45_LEDGER, "two-year-validated-high")] }),
  "HINDZINC.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [listing("2006-11-20", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "IFCI.NS": finalized({ preferredChartId: "corporatisation-1993", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation", "statutory-formation", "listing"], charts: [chart("corporatisation-1993", "corporatisation", "1993-05-21", "New Delhi", "11:00", FINAL45_LEDGER, "two-year-validated-high")] }),
  "IOC.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-high", rejectedCandidates: ["present-ioc-formation", "listing"], charts: [incorporation("1959-06-30", "New Delhi", FINAL45_LEDGER, "two-year-validated-high")] }),
  "JIOFIN.NS": finalized({ preferredChartId: "demerger-record-date", confidence: "user-confirmed-record-date-primary", rejectedCandidates: ["incorporation", "fresh-name-certificate"], charts: [
    chart("demerger-record-date", "record-date", "2023-07-20", "Mumbai", "09:15", "User-confirmed Fin-Lumen chronological replay: the official demerger record-date chart gave the best stock-behaviour fit and is production-sovereign.", "user-confirmed-record-date-primary"),
    listing("2023-08-21", "Official listing chart retained for research comparison only; it must not override the user-confirmed record-date anchor.", "research-candidate")
  ] }),
  "KEI.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2006-03-23", FINAL45_LEDGER, "two-year-validated-high")] }),
  "LLOYDSENT.NS": finalized({ preferredChartId: "name-change-2023", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [chart("name-change-2023", "name-change", "2023-09-06", "Mumbai", "11:00", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "LT.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-single-anchor", charts: [incorporation("1946-02-07", "Mumbai", FINAL45_LEDGER, "two-year-validated-single-anchor")] }),
  "LUPIN.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("1994-11-30", FINAL45_LEDGER, "two-year-validated-high")] }),
  "MCX.NS": {
    ...finalized({ preferredChartId: "operational-launch", confidence: "dual-anchor-replay-validated", charts: [
      listing("2012-03-09", "MCX listing chart retained as a researched comparison anchor; the standardized replay did not support it as the primary direction chart.", "research-candidate"),
      incorporation("2002-04-19", "Mumbai", "MCX incorporation replay: secondary structural/cycle confirmation anchor. The 11:00 time is assumed.", "dual-anchor-confirmatory"),
      chart("operational-launch", "operational-launch", "2003-11-10", "Mumbai", "11:00", "MCX operational-launch replay: primary direction and timing anchor; it led both calibration and holdout against adjusted two-year price behaviour.", "dual-anchor-primary")
    ] }),
    secondaryChartId: "incorporation",
    rejectedCandidates: ["listing"],
    dualChartPolicy: {
      mode: "ROLE_BASED_CONFIRMATION",
      directionAuthority: "operational-launch",
      timingAuthority: "operational-launch",
      opportunityAuthority: "operational-launch",
      structuralConfirmation: "incorporation",
      disagreementEffect: "CONFIDENCE_ONLY",
      secondaryMayCreateOpportunity: false,
      secondaryMayVetoOrdinaryPressure: false,
      secondaryMayCapFullBuildOnSevereConflict: true,
      breakRequiresDualConfirmation: true
    }
  },
  "NHPC.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("1975-11-07", "Faridabad", FINAL45_LEDGER, "two-year-validated-high")] }),
  "NMDC.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2008-03-03", FINAL45_LEDGER, "two-year-validated-high")] }),
  "NTPC.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation", "name-change-2005"], charts: [listing("2004-11-05", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "PCJEWELLER.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-moderate", rejectedCandidates: ["listing"], charts: [incorporation("2005-04-13", "New Delhi", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "PGEL.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-low", rejectedCandidates: ["listing"], charts: [incorporation("2003-03-17", "Greater Noida", FINAL45_LEDGER, "two-year-validated-low")] }),
  "SBIN.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-moderate", rejectedCandidates: ["listing"], charts: [incorporation("1955-07-01", "Mumbai", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "SJVN.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [listing("2010-05-20", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "SKIPPER.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("1981-03-05", "Kolkata", FINAL45_LEDGER, "two-year-validated-high")] }),
  "TITAGARH.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation", "name-change-2023"], charts: [listing("2008-04-21", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "VEDL.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-high", rejectedCandidates: ["listing"], charts: [
    incorporation("1965-06-25", "Mumbai", FINAL45_LEDGER, "two-year-validated-high"),
    chart("demerger-effective-2026", "demerger-effective", "2026-05-01", "Mumbai", "09:15", "Post-demerger structural overlay retained; insufficient post-event history to replace the locked primary.", "secondary-structural-overlay")
  ] }),
  "TATAELXSI.NS": candidate({ companyName: "Tata Elxsi Limited", preferredChartId: "incorporation", charts: [incorporation("1989-03-30", "Bengaluru", "Company incorporation record retained in the Fin-Lumen natal audit inventory; Tata Elxsi states that business commenced on 5 May 1989. The generic 8 Feb 1995 NSE migration date is not authorised as a stock-specific anchor.", "source-verified-anchor-revalidation-required")] }),
  "TECHNOE.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2018-12-04", FINAL45_LEDGER, "two-year-validated-high")] }),
  "WPIL.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-single-anchor", charts: [incorporation("1952-02-26", "Kolkata", FINAL45_LEDGER, "two-year-validated-single-anchor")] }),
  "IDEA.NS": finalized({ preferredChartId: "vodafone-idea-merger-effective", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [chart("vodafone-idea-merger-effective", "merger-effective", "2018-08-31", "Gandhinagar", "11:00", `${FINAL45_LEDGER} Current merged identity governs the post-2018 traded entity.`, "two-year-validated-moderate")] }),
  "TCS.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [listing("2004-08-25", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "ICICIBANK.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-moderate", rejectedCandidates: ["listing", "fpo-2004"], charts: [incorporation("1994-01-05", "Mumbai", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "SUZLON.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2005-10-19", FINAL45_LEDGER, "two-year-validated-high")] }),
  "PERSISTENT.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [listing("2010-04-06", FINAL45_LEDGER, "two-year-validated-moderate")] }),
  "KPITTECH.NS": finalized({ preferredChartId: "demerger-effective", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation", "listing"], charts: [chart("demerger-effective", "demerger-effective", "2019-01-15", "Pune", "11:00", `${FINAL45_LEDGER} Effective date corrected from the appointed date of 1 Jan to the scheme-effective date of 15 Jan 2019.`, "two-year-validated-moderate")] }),
  "TITAN.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-moderate", rejectedCandidates: ["name-change-2013"], charts: [incorporation("1984-07-26", "Bengaluru", `${FINAL45_LEDGER} Incorporation retained because the later cosmetic name change did not provide stable holdout pressure authority.`, "two-year-validated-moderate")] }),
  "TATAPOWER.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-high", rejectedCandidates: ["listing"], charts: [incorporation("1919-09-18", "Mumbai", FINAL45_LEDGER, "two-year-validated-high")] }),
  "MAZDOCK.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2020-10-12", FINAL45_LEDGER, "two-year-validated-high")] }),
  "TRENT.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("2004-09-24", FINAL45_LEDGER, "two-year-validated-high")] }),
  "PFC.NS": finalized({ preferredChartId: "listing", confidence: "user-confirmed-listing-preferred", rejectedCandidates: ["incorporation"], charts: [
    listing("2007-02-23", "User-confirmed Fin-Lumen replay finding: the listing chart captures PFC's traded behaviour better than the incorporation chart and is production-sovereign.", "user-confirmed-listing-preferred"),
    incorporation("1986-07-16", "New Delhi", "Rejected production candidate retained for research comparison; it must not override the user-confirmed listing anchor.", "rejected-candidate")
  ] }),
  "RELIANCE.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", rejectedCandidates: ["incorporation"], charts: [listing("1995-11-29", FINAL45_LEDGER, "two-year-validated-high")] }),
  "INFY.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-moderate", rejectedCandidates: ["first-indian-listing-1993", "listing"], charts: [incorporation("1981-07-02", "Bengaluru", `${FINAL45_LEDGER} Infosys confirms only June 1993 for its first Indian listing, so the unverified 1 Jun placeholder cannot be production-sovereign.`, "two-year-validated-moderate")] }),
  "KAYNES.NS": finalized({ preferredChartId: "listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation"], charts: [listing("2022-11-22", `${FINAL45_LEDGER} Listing retained after the focused replay caught the active rally/churn and later acceleration path more faithfully than the generic aggregate score.`, "two-year-validated-moderate")] }),
  "NEWGEN.NS": {
    ...finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", charts: [
      listing("2018-01-29", `${FINAL45_LEDGER} Validated for market-expression and rerating ignition.`, "two-year-validated-high"),
      incorporation("1992-06-05", "New Delhi", "Legacy incorporation record; replay-validated as the structural-pressure, survival and Break authority; source/time remain declared proxies.", "replay-validated-structural-role")
    ] }),
    chartRolePolicy: {
      mode: "DISTINCT_ROLE_AUTHORITY",
      scoresBlended: false,
      crossoverRule: "STRUCTURAL_CAN_ACTIVATE_WHEN_MARKET_CHART_CONFLICTS",
      roles: [
        { chartId: "listing", role: "TRADED_EXPRESSION", authorities: ["MARKET_EXPRESSION_RERATING", "TRADED_DETERIORATION"] },
        { chartId: "incorporation", role: "ENTERPRISE_FOUNDATION", authorities: ["STRUCTURAL_PRESSURE_BREAK", "SURVIVAL_RELEASE"] }
      ],
      doctrine: "Listing owns market ignition; incorporation owns structural pressure, survival and Break. Conflict is displayed and never averaged."
    }
  },
  "RECLTD.NS": candidate({
    companyName: "REC Limited",
    preferredChartId: "incorporation",
    auditStatus: "targeted-revalidation-required-low-absolute-fit",
    sourceVerification: "candidate-dates-recorded-anchor-unresolved",
    charts: [
      incorporation("1969-07-25", "New Delhi", "Provisional incorporation candidate. The two-year audit had low absolute fit and missed major expansion/pressure episodes; no production lock is claimed.", "research-candidate"),
      listing("2008-03-12", "Provisional listing candidate retained for the focused astrology-led REC replay; it also failed to establish stable full-period authority.", "research-candidate")
    ]
  }),
  "SIEMENS.NS": finalized({ preferredChartId: "incorporation", confidence: "two-year-validated-low", rejectedCandidates: ["listing"], charts: [incorporation("1957-03-02", "Mumbai", `${FINAL45_LEDGER} Incorporation retained because it preserved holdout pressure/dormancy information; the listing-only chart collapsed out of sample.`, "two-year-validated-low")] }),
  "ONGC.NS": {
    ...finalized({ preferredChartId: "listing", confidence: "two-year-validated-high", charts: [
      listing("1993-08-10", `${FINAL45_LEDGER} Validated for traded expansion sovereignty and tighter crossover timing.`, "two-year-validated-high"),
      chart("statutory-commission", "statutory-formation", "1956-08-14", "New Delhi", "11:00", "ONGC official institutional history; replay-validated for structural warning, Break persistence and release.", "replay-validated-structural-role"),
      chart("company-conversion", "company-conversion", "1993-06-23", "New Delhi", "11:00", "ONGC corporate conversion candidate; retained for research comparison but carries no production role.", "rejected-candidate")
    ] }),
    chartRolePolicy: {
      mode: "DISTINCT_ROLE_AUTHORITY",
      scoresBlended: false,
      crossoverRule: "REQUIRE_MARKET_EXPRESSION_LOSS",
      roles: [
        { chartId: "listing", role: "TRADED_EXPRESSION", authorities: ["MARKET_EXPRESSION_RERATING", "TRADED_DETERIORATION"] },
        { chartId: "statutory-commission", role: "STATUTORY_FOUNDATION", authorities: ["STRUCTURAL_PRESSURE_BREAK", "SURVIVAL_RELEASE"] }
      ],
      doctrine: "Statutory formation owns structural warning/Break/release; listing owns current market-expression sovereignty and prevents premature pressure activation. Charts are never averaged."
    }
  },
  "HINDCOPPER.NS": finalized({ preferredChartId: "nse-listing", confidence: "two-year-validated-moderate", rejectedCandidates: ["incorporation", "bse-listing"], charts: [chart("nse-listing", "listing", "2010-09-15", "Mumbai", "09:15", FINAL45_LEDGER, "two-year-validated-moderate")] })
};

export default { ...auditedNatalOverrides, ...finalizedPostHDFCLedger };
