import { db } from "../../lib/db.js";
import { astroEngine } from "../../lib/astroEngine.js";

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_KEY = "finlumen:get-stocks:v23";

function getCacheStore() {
  if (!globalThis.__FINLUMEN_CACHE__) {
    globalThis.__FINLUMEN_CACHE__ = {};
  }
  return globalThis.__FINLUMEN_CACHE__;
}

function todayKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export const BASELINE_UNIVERSE = [
  { name: "TDPOWERSYS.NS" },
  { name: "BATAINDIA.NS" },
  { name: "PIIND.NS" },
  { name: "AARTIIND.NS" },
  { name: "AIAENG.NS" },
  { name: "CUMMINSIND.NS" },
  { name: "DIXON.NS" },
  { name: "NETWEB.NS" },
  { name: "SOLARINDS.NS" },
  { name: "ANANTRAJ.NS" },
  { name: "BAJAJFINANCE.NS" },
  { name: "BAJAJFINSV.NS" },
  { name: "BDL.NS" },
  { name: "BEL.NS" },
  { name: "BHARTIARTL.NS" },
  { name: "CARTRADE.NS" },
  { name: "CGPOWER.NS" },
  { name: "COALINDIA.NS" },
  { name: "DATAPATTERNS.NS" },
  { name: "DMART.NS" },
  { name: "ENGINERSIN.NS" },
  { name: "ETERNAL.NS" },
  { name: "FEDERALBNK.NS" },
  { name: "GRAVITA.NS" },
  { name: "GRWRHITECH.NS" },
  { name: "HINDZINC.NS" },
  { name: "IFCI.NS" },
  { name: "IOC.NS" },
  { name: "JIOFIN.NS" },
  { name: "KEI.NS" },
  { name: "LLOYDSENT.NS" },
  { name: "LT.NS" },
  { name: "LUPIN.NS" },
  { name: "MCX.NS" },
  { name: "NHPC.NS" },
  { name: "NMDC.NS" },
  { name: "NTPC.NS" },
  { name: "PCJEWELLER.NS" },
  { name: "PGEL.NS" },
  { name: "SBIN.NS" },
  { name: "SJVN.NS" },
  { name: "SKIPPER.NS" },
  { name: "TITAGARH.NS" },
  { name: "VEDL.NS" },
  { name: "TATAELXSI.NS" },
  { name: "TECHNOE.NS" },
  { name: "WPIL.NS" },
  { name: "IDEA.NS" },
  { name: "TCS.NS" },
  { name: "ICICIBANK.NS" },
  { name: "SUZLON.NS" },
  { name: "BSE.NS" },
  { name: "CDSL.NS" },
  { name: "PERSISTENT.NS" },
  { name: "KPITTECH.NS" },
  { name: "TITAN.NS" },
  { name: "TATAPOWER.NS" },
  { name: "MAZDOCK.NS" },
  { name: "TRENT.NS" },
  { name: "PFC.NS" },
  { name: "DIVISLAB.NS" },
  { name: "RELIANCE.NS" },
  { name: "FORTIS.NS" },
  { name: "INFY.NS" },
  { name: "HDFCBANK.NS" },
  { name: "COCHINSHIP.NS" },
  { name: "KAYNES.NS" },
  { name: "NEWGEN.NS" },
  { name: "RECLTD.NS" },
  { name: "CUPID.NS" },
  { name: "SIEMENS.NS" },
  { name: "CAMS.NS" },
  { name: "ONGC.NS" },
  { name: "HINDCOPPER.NS" },
  { name: "HCLTECH.NS" },
  { name: "MARUTI.NS" },
  { name: "ACE.NS" },
  { name: "SCHNEIDER.NS" },
  { name: "SANSERA.NS" },
  { name: "NEULANDLAB.NS" },
  { name: "LAURUSLABS.NS" },
  { name: "HSCL.NS" },
  { name: "HBLENGINE.NS" },
  { name: "ABCAPITAL.NS" },
  { name: "ABB.NS" },
  { name: "ACUTAAS.NS" },
  { name: "CERA.NS" },
  { name: "GRASIM.NS" },
  { name: "GVT&D.NS" },
  { name: "VOLTAMP.NS" },
];

const FALLBACK_STOCKS = BASELINE_UNIVERSE;

const EXCLUDED_STOCK_NAMES = new Set([
  "DIXON INC",
  "AIAENGG.NS",
  "PCJEWELLER",
  "PFC_NSE_LISTING_TEST",
  "BSE_LISTING_TEST",
  "ETERNAL NC",
  "HDFC MERGER",
  "JIOFIN_RECORD_DATE_TEST",
  "MAZDOCK TEST",
  "NEWGEN_LIST",
  "NEWGENINC.NS",
  "NEWGENLIST",
  "NEWGEN_LISTING_TEST",
  "NEWGEN_INCORPORATION_TEST",
  "JIOFIN_LISTING_TEST",
  "JIOFIN_DEMERGER_EFFECTIVE_TEST",
  "INFY_NSE_LISTING_TEST",
  "INFY_BSE_LISTING_TEST",
  "INFY_INCORPORATION_IDENTITY",
  "CYIENT LISTING",
  "COCHIN SHIP LISTING",
  "VOLTAMP INC",
  "PFC G TEST"
]);

function isHiddenResearchArtifact(symbol) {
  const value = String(symbol || "").trim().toUpperCase();
  return EXCLUDED_STOCK_NAMES.has(value) || /(?:^|_)TEST$/.test(value);
}

const STOCK_SYMBOL_ALIASES = {
  "SCHENIDER.NS": "SCHNEIDER.NS",
  "HBL ENGINE": "HBLENGINE.NS",
  "HBLENGINE LISTING": "HBLENGINE.NS",
  "HBLPOWER.NS": "HBLENGINE.NS"
};

function canonicalStockSymbol(rowOrValue) {
  const value = typeof rowOrValue === "object" && rowOrValue !== null
    ? rowOrValue.symbol || rowOrValue.name || rowOrValue.ticker
    : rowOrValue;
  const symbol = String(value || "").trim().toUpperCase();
  return STOCK_SYMBOL_ALIASES[symbol] || symbol;
}

function rowFreshness(row = {}) {
  const timestamp = Date.parse(row.updated_at || row.updatedAt || row.created_at || row.createdAt || "");
  const completeNatal = Boolean(row.birth_date || row.birthDate || row.incorporation_date || row.incorporationDate || row.listing_date || row.listingDate);
  const finalAuthority = String(row.confidence || row.natal_confidence || "").trim().toLowerCase() === "high" ||
    row.user_finalized === true ||
    String(row.capital_authority_ceiling || "").toUpperCase() === "FULL_BUILD_ELIGIBLE";
  const numericId = Number(row.id);
  return {
    timestamp: Number.isFinite(timestamp) ? timestamp : 0,
    completeNatal: completeNatal ? 1 : 0,
    finalAuthority: finalAuthority ? 1 : 0,
    numericId: Number.isFinite(numericId) ? numericId : 0
  };
}

function newerRow(candidate, current) {
  if (!current) return true;
  const a = rowFreshness(candidate);
  const b = rowFreshness(current);
  if (a.timestamp !== b.timestamp) return a.timestamp > b.timestamp;
  if (a.completeNatal !== b.completeNatal) return a.completeNatal > b.completeNatal;
  if (a.finalAuthority !== b.finalAuthority) return a.finalAuthority > b.finalAuthority;
  return a.numericId >= b.numericId;
}

// Older Supabase installations may not have a unique constraint on symbol/name.
// Collapse duplicates before calculation so the latest explicit user save is the
// one authoritative row used by the selector, table, natal resolver and engine.
function newestRowsBySymbol(rows = []) {
  const bySymbol = new Map();
  for (const row of rows || []) {
    const symbol = canonicalStockSymbol(row);
    if (!symbol) continue;
    if (newerRow(row, bySymbol.get(symbol))) bySymbol.set(symbol, row);
  }
  return [...bySymbol.values()];
}

function normalizeRows(rows) {
  return rows
    .filter(Boolean)
    .map(row => {
      const name = canonicalStockSymbol(row);
      return {
        ...row,
        id: row.id || `symbol:${name}`,
        identity_key: name,
        name
      };
    })
    .filter(row => row.name && !isHiddenResearchArtifact(row.name));
}

function mergeWithBaselineUniverse(rows) {
  const byName = new Map();

  for (const row of normalizeRows(BASELINE_UNIVERSE)) {
    byName.set(String(row.name || "").trim().toUpperCase(), {
      ...row,
      baseline_universe: true
    });
  }

  for (const row of normalizeRows(rows)) {
    const key = String(row.name || row.symbol || row.ticker || "").trim().toUpperCase();
    if (!key) continue;
    byName.set(key, {
      ...(byName.get(key) || {}),
      ...row,
      baseline_universe: Boolean(byName.get(key)?.baseline_universe),
      user_or_db_row: true
    });
  }

  return [...byName.values()].filter(row => row.name);
}

export default async function handler(req, res) {
  try {
    const refresh = req.query.refresh === "1" || req.query.refresh === "true";
    const requestedSymbols = new Set(String(req.query.symbols || "")
      .split(",")
      .map(value => value.trim().toUpperCase())
      .filter(Boolean));
    const cache = getCacheStore();
    const symbolCacheKey = requestedSymbols.size ? [...requestedSymbols].sort().join(",") : "ALL";
    const cacheKey = `${CACHE_KEY}:${todayKey()}:${symbolCacheKey}`;
    const cached = cache[cacheKey];

    if (!refresh && cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      res.setHeader("X-FinLumen-Cache", "HIT");
      res.setHeader("Cache-Control", "no-store, max-age=0");
      return res.status(200).json(cached.payload);
    }

    res.setHeader("X-FinLumen-Cache", refresh ? "BYPASS" : "MISS");
    res.setHeader("Cache-Control", "no-store, max-age=0");
    let rows = [];
    let dataSource = "supabase";
    const [stockResult, natalResult] = await Promise.allSettled([
      db.getAll(),
      db.getNatalRegistryRows()
    ]);
    const stockRows = stockResult.status === "fulfilled" && Array.isArray(stockResult.value)
      ? newestRowsBySymbol(stockResult.value)
      : [];
    const natalRows = natalResult.status === "fulfilled" && Array.isArray(natalResult.value)
      ? newestRowsBySymbol(natalResult.value)
      : [];
    const natalUniverseRows = natalRows
      .filter(row => row?.symbol)
      .map(row => ({
        // Carry the authoritative registry snapshot into the same stock
        // calculation request.  The resolver must not depend on a second,
        // separately cached Supabase read after this row has already been
        // fetched successfully.
        ...row,
        name: String(row.symbol).trim().toUpperCase(),
        company_name: row.company_name || row.symbol,
        natal_registry_row: true,
        natal_registry_snapshot: row,
        natal_pending: !row.birth_date && !row.incorporation_date && !row.listing_date,
        expected_behaviour: !row.birth_date && !row.incorporation_date && !row.listing_date
          ? "Natal data pending; add chart details in the Natal Registry Editor."
          : undefined
      }));

    rows = normalizeRows([...stockRows, ...natalUniverseRows]);
    if (stockResult.status === "rejected" && natalResult.status === "rejected") {
      dataSource = "baseline-universe";
    } else if (stockResult.status === "rejected") {
      dataSource = "supabase-natal-registry+baseline-universe";
    } else if (natalResult.status === "rejected") {
      dataSource = "supabase-stocks+baseline-universe";
    }

    rows = mergeWithBaselineUniverse(rows);
    if (requestedSymbols.size) {
      rows = rows.filter(row => requestedSymbols.has(String(row.name || "").trim().toUpperCase()));
    }
    if (dataSource === "supabase") dataSource = "supabase+baseline-universe";

    if (!rows.length) {
      dataSource = "baseline-universe";
      rows = normalizeRows(FALLBACK_STOCKS);
    }

    const enriched = await Promise.all(
      rows.map(async stock => {
        try {
          const astro = await astroEngine(stock);

          return {
            ...stock,
            ...astro,
            data_source: dataSource,
            computed_at: new Date().toISOString()
          };
        } catch (err) {
          return {
            ...stock,
            data_source: dataSource,
            astro_error: err.message,
            structural_cycle: stock.structural_cycle || "UNCLASSIFIED",
            current_pressure: stock.current_pressure || "UNKNOWN",
            next_event: stock.next_event || "Astro computation error",
            expected_behaviour: stock.expected_behaviour || err.message,
            environment_score: stock.environment_score ?? 0,
            computed_at: new Date().toISOString()
          };
        }
      })
    );

    cache[cacheKey] = {
      createdAt: Date.now(),
      payload: enriched
    };

    return res.status(200).json(enriched);
  } catch (err) {
    return res.status(500).json({
      success: false,
      route: "/api/get-stocks",
      error: err.message,
      stack: err.stack
    });
  }
}

export { canonicalStockSymbol, newestRowsBySymbol };
