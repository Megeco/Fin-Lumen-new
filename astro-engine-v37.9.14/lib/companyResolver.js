import registry from "./natalRegistry.js";
import { createClient } from "@supabase/supabase-js";
import { getMemoryNatalEntries } from "./natalMemoryRegistry.js";

const ALIASES = {
  "AIAENGG.NS": "AIAENG.NS",
  "AIAENG.NS": "AIAENGG.NS",
  "PCJEWELLER": "PCJEWELLER.NS",
  "PCJEWELLER.NS": "PCJEWELLER",
  "SCHENIDER.NS": "SCHNEIDER.NS",
  "HBL ENGINE": "HBLENGINE.NS",
  "HBLENGINE LISTING": "HBLENGINE.NS",
  "HBLPOWER.NS": "HBLENGINE.NS"
};

let cachedSupabase = null;
let dynamicCache = null;
let dynamicCacheAt = 0;
function chartDefaults(chartType = "incorporation") {
  const type = String(chartType || "incorporation").toLowerCase();
  if (type.includes("listing") || type.includes("record-date")) {
    return { time: "09:15", city: "Mumbai", country: "India", timezone: "Asia/Kolkata" };
  }
  return { time: "11:00", city: "", country: "India", timezone: "Asia/Kolkata" };
}

function normalizeChart(chart = {}, fallback = {}) {
  const chartType = chart.chartType || chart.chart_type || fallback.chartType || "incorporation";
  const defaults = chartDefaults(chartType);
  return {
    id: chart.id || chart.chartId || chart.chart_id || chartType,
    chartType,
    date: chart.date || chart.birthDate || chart.birth_date || chart.incorporationDate || chart.incorporation_date || chart.listingDate || chart.listing_date || fallback.birthDate || fallback.incorporationDate || fallback.listingDate || null,
    time: chart.time || chart.birthTime || chart.birth_time || fallback.birthTime || defaults.time,
    city: chart.city || fallback.city || defaults.city,
    country: chart.country || fallback.country || defaults.country,
    timezone: chart.timezone || fallback.timezone || defaults.timezone,
    confidence: chart.confidence || fallback.confidence || "low",
    source: chart.source || chart.sourceNote || fallback.source || "manual natal registry",
    note: chart.note || chart.sourceNote || fallback.sourceNote || ""
  };
}

function chartDateMs(chart) {
  const d = chart?.date || chart?.birthDate || chart?.birth_date || chart?.incorporationDate || chart?.listingDate;
  const ms = d ? new Date(`${d}T00:00:00Z`).getTime() : NaN;
  return Number.isFinite(ms) ? ms : null;
}

function eligibleChartsForDate(charts = [], asOfDate = null) {
  if (!asOfDate) return charts;
  const asOfMs = new Date(`${asOfDate}T23:59:59Z`).getTime();
  if (!Number.isFinite(asOfMs)) return charts;
  const eligible = charts.filter(chart => {
    const ms = chartDateMs(chart);
    return ms === null || ms <= asOfMs;
  });
  return eligible.length ? eligible : charts;
}

function applyPreferredChart(entry = {}, requestedChartId = null, options = {}) {
  const fallback = {
    chartType: entry.chartType, birthDate: entry.birthDate, birthTime: entry.birthTime,
    incorporationDate: entry.incorporationDate, listingDate: entry.listingDate,
    city: entry.city || entry.registeredOffice?.city, country: entry.country || entry.registeredOffice?.country,
    timezone: entry.timezone || entry.registeredOffice?.timezone, confidence: entry.confidence,
    source: entry.source, sourceNote: entry.sourceNote
  };
  const charts = Array.isArray(entry.charts) && entry.charts.length
    ? entry.charts.map(chart => normalizeChart(chart, fallback))
    : [normalizeChart({}, fallback)].filter(chart => chart.date);

  // v33.1: promoted research charts may be preferred in production, but never before
  // their event date. Explicit Replay Lab chartId remains allowed for research comparison.
  const selectable = requestedChartId ? charts : eligibleChartsForDate(charts, options.asOfDate || options.date || null);
  const selectedId = requestedChartId || entry.preferredChartId || selectable[0]?.id;
  const selected = selectable.find(chart => chart.id === selectedId) || selectable[0] || charts[0] || null;
  if (!selected) return { ...entry, charts, preferredChartId: null };
  const finalUserAuthority = entry.userFinalized === true || entry.capitalAuthorityCeiling === "FULL_BUILD_ELIGIBLE";
  return {
    ...entry, charts, preferredChartId: selected.id, selectedChartId: selected.id,
    chartType: selected.chartType, birthDate: selected.date, birthTime: selected.time,
    city: selected.city, country: selected.country, timezone: selected.timezone,
    // A stale confidence value nested inside an older chart JSON object must
    // not undo the user's newer row-level High/Final decision. The selected
    // chart still governs date/time/place; finality governs authority.
    confidence: finalUserAuthority ? entry.confidence : selected.confidence,
    source: selected.source, sourceNote: selected.note || entry.sourceNote,
    incorporationDate: selected.chartType === "incorporation" ? selected.date : entry.incorporationDate,
    listingDate: String(selected.chartType).includes("listing") ? selected.date : entry.listingDate,
    registeredOffice: { city: selected.city, country: selected.country, timezone: selected.timezone }
  };
}

function normalizeTicker(ticker) {
  return String(ticker || "")
    .toUpperCase()
    .trim();
}

function supabaseEnv() {
  const url = String(
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL ||
    ""
  ).trim().replace(/\/+$/, "");

  const key = String(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ""
  ).trim();

  return { url, key };
}

function getSupabaseClient() {
  const { url, key } = supabaseEnv();

  if (!url || !key || !/^https?:\/\//i.test(url)) {
    return null;
  }

  if (!cachedSupabase) {
    cachedSupabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  }

  return cachedSupabase;
}

function clearDynamicRegistryCache() {
  dynamicCache = null;
  dynamicCacheAt = 0;
}


function parseLegacySourceNoteMeta(note) {
  const out = {};
  String(note || "").split(";").forEach(part => {
    const idx = part.indexOf("=");
    if (idx <= 0) return;
    const key = part.slice(0, idx).trim().toLowerCase();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = value;
  });
  return out;
}

function normalizeRegistryRow(row) {
  if (!row) {
    return null;
  }

  const legacyMeta = parseLegacySourceNoteMeta(row.source_note || row.sourceNote || row.note);
  const confidence = String(row.confidence || row.natal_confidence || legacyMeta.confidence || "low").trim().toLowerCase();
  // A schema-compatible save rewrites source_note and the core chart columns,
  // but may be unable to rewrite older optional authority columns. The metadata
  // from that same newest save therefore outranks stale database defaults.
  const explicitAuthority = String(
    legacyMeta.capital_authority_ceiling ||
    row.capital_authority_ceiling ||
    row.capitalAuthorityCeiling ||
    ""
  ).trim().toUpperCase();
  const finalizedValue = Object.hasOwn(legacyMeta, "user_finalized")
    ? legacyMeta.user_finalized
    : row.user_finalized ?? row.userFinalized;
  const userFinalized = [true, "true", "1", "yes"].includes(
    finalizedValue
  );
  // Backward compatibility: older user-created natal rows predate the
  // user_finalized/authority columns. A High rating in the editable user
  // registry is itself the user's finality decision. On partially migrated
  // schemas, a stale/default RESEARCH_ONLY column can coexist with newer FINAL
  // metadata in source_note; the current High save must outrank that stale
  // default or a complete chart is calculated but incorrectly suppressed.
  const highConfidenceFinal = confidence === "high";
  const capitalAuthorityCeiling = highConfidenceFinal
    ? "FULL_BUILD_ELIGIBLE"
    : explicitAuthority || "RESEARCH_ONLY";
  const auditStatus = highConfidenceFinal
    ? (/^(|manual-entry|natal-pending|unresolved)$/i.test(String(legacyMeta.audit_status || row.audit_status || row.auditStatus || ""))
      ? "user-confirmed-final"
      : legacyMeta.audit_status || row.audit_status || row.auditStatus)
    : legacyMeta.audit_status || row.audit_status || row.auditStatus || "manual-entry";
  const sourceVerification = highConfidenceFinal
    ? (/^(|unverified)$/i.test(String(legacyMeta.source_verification || row.source_verification || row.sourceVerification || ""))
      ? "user-confirmed"
      : legacyMeta.source_verification || row.source_verification || row.sourceVerification)
    : legacyMeta.source_verification || row.source_verification || row.sourceVerification || "unverified";
  const anchorValidation = highConfidenceFinal
    ? (/^(|untested|unresolved)$/i.test(String(legacyMeta.anchor_validation || row.anchor_validation || row.anchorValidation || ""))
      ? "definitive-user-confirmed"
      : legacyMeta.anchor_validation || row.anchor_validation || row.anchorValidation)
    : legacyMeta.anchor_validation || row.anchor_validation || row.anchorValidation || "untested";
  const productionStatus = highConfidenceFinal
    ? "FINAL"
    : legacyMeta.production_status || row.production_status || row.productionStatus || "RESEARCH";

  return {
    companyName:
      row.company_name || row.companyName || row.name || row.symbol,

    incorporationDate:
      row.incorporation_date || row.incorporationDate || row.birth_date || row.birthDate,

    listingDate:
      row.listing_date || row.listingDate || row.natal_listing_date || row.natalListingDate,

    birthDate:
      row.birth_date || row.birthDate || row.natal_birth_date || row.natalBirthDate || legacyMeta.birth_date || row.incorporation_date || row.incorporationDate,

    birthTime:
      row.birth_time || row.birthTime || row.natal_birth_time || row.natalBirthTime || row.time || legacyMeta.birth_time,

    chartType:
      row.chart_type || row.chartType || row.natal_chart_type || row.natalChartType || legacyMeta.chart_type,

    registeredOffice: {
      city:
        row.city || row.registered_city || row.registeredOffice?.city || "",

      country:
        row.country || row.registered_country || row.registeredOffice?.country || "India",

      timezone:
        row.timezone || row.registeredOffice?.timezone || "Asia/Kolkata"
    },

    city: row.city || row.registered_city || row.registeredOffice?.city || "",
    country: row.country || row.registered_country || row.registeredOffice?.country || "India",
    timezone: row.timezone || row.registeredOffice?.timezone || "Asia/Kolkata",

    confidence,

    source:
      row.source || row.source_note || row.natal_source || "manual natal registry",

    sourceNote:
      row.source_note || row.note || "Manual/dynamic natal registry entry",

    preferredChartId: row.preferred_chart_id || row.preferredChartId || row.chart_id || row.chartId || legacyMeta.chart_id || null,
    charts: Array.isArray(row.charts) ? row.charts : null,
    auditStatus,
    sourceVerification,
    anchorValidation,
    timePrecision: legacyMeta.time_precision || row.time_precision || row.timePrecision || "event-time-assumed",
    capitalAuthorityCeiling,
    userFinalized: userFinalized || highConfidenceFinal,
    productionStatus
  };
}

function mergeRuntimeMemoryEntries(persistentEntries = {}, memoryEntries = {}) {
  const merged = { ...persistentEntries };
  // Runtime-memory entries are created only after the user has just saved and
  // permanent persistence was unavailable. They are therefore the freshest
  // authority for this server session and must outrank a stale persistent row.
  for (const [symbol, row] of Object.entries(memoryEntries || {})) {
    const key = normalizeTicker(symbol);
    if (key) merged[key] = normalizeRegistryRow(row);
  }
  return merged;
}

function lookupStatic(symbol) {
  if (registry[symbol]) {
    return registry[symbol];
  }

  const alias = ALIASES[symbol];

  if (alias && registry[alias]) {
    return {
      ...registry[alias],
      aliasResolvedFrom: symbol,
      aliasResolvedTo: alias
    };
  }

  return null;
}

function isBuiltInRegistrySymbol(ticker) {
  const symbol = normalizeTicker(ticker);
  const entry = lookupStatic(symbol);
  return Boolean(entry?.incorporationDate || entry?.listingDate || entry?.birthDate);
}

async function loadDynamicRegistry() {
  const now = Date.now();

  if (dynamicCache && now - dynamicCacheAt < 60_000) {
    return dynamicCache;
  }

  const supabase = getSupabaseClient();

  if (!supabase) {
    dynamicCache = {};
    const memoryEntries = getMemoryNatalEntries();
    for (const [symbol, row] of Object.entries(memoryEntries)) {
      dynamicCache[normalizeTicker(symbol)] = normalizeRegistryRow(row);
    }
    dynamicCacheAt = now;
    return dynamicCache;
  }

  try {
    const { data, error } = await supabase
      .from("natal_registry")
      .select("*");

    if (error) {
      throw error;
    }

    dynamicCache = {};

    for (const row of data || []) {
      const symbol = normalizeTicker(row.symbol || row.ticker || row.name);

      if (symbol) {
        dynamicCache[symbol] = normalizeRegistryRow(row);
      }
    }
  } catch (err) {
    dynamicCache = {};
  }

  // Merge current-session saves made by /api/upsert-natal when Supabase is
  // unavailable. A just-saved runtime entry must override an older persistent
  // row for the remainder of this server session.
  dynamicCache = mergeRuntimeMemoryEntries(dynamicCache, getMemoryNatalEntries());

  dynamicCacheAt = now;
  return dynamicCache;
}

function companyFromStockOverride(stock) {
  if (!stock) {
    return null;
  }

  const incorporationDate =
    stock.natal_incorporation_date ||
    stock.incorporation_date ||
    stock.natal_birth_date ||
    stock.birth_date;

  const listingDate =
    stock.natal_listing_date ||
    stock.listing_date ||
    stock.listingDate;

  if (!incorporationDate && !listingDate) {
    return null;
  }

  return normalizeRegistryRow({
    symbol: stock.name || stock.symbol || stock.ticker,
    company_name: stock.company_name || stock.companyName || stock.name || stock.symbol,
    incorporation_date: incorporationDate,
    listing_date: listingDate,
    birth_time: stock.natal_birth_time || stock.birth_time || stock.birthTime || stock.time,
    chart_type: stock.natal_chart_type || stock.chart_type || stock.chartType,
    city: stock.natal_city || stock.city || "",
    country: stock.natal_country || stock.country || "India",
    timezone: stock.natal_timezone || stock.timezone || "Asia/Kolkata",
    confidence: stock.natal_confidence || stock.confidence || "medium",
    source_note: stock.natal_source || "stock row natal override"
  });
}

function companyFromRegistrySnapshot(stock) {
  if (!stock?.natal_registry_row) return null;
  const snapshot = stock.natal_registry_snapshot || stock;
  const normalized = normalizeRegistryRow({
    ...snapshot,
    symbol: snapshot.symbol || stock.name || stock.symbol || stock.ticker
  });
  if (!normalized?.incorporationDate && !normalized?.listingDate && !normalized?.birthDate) return null;
  return normalized;
}

async function resolveCompany(ticker, stockOverride = null, options = {}) {
  const symbol = normalizeTicker(ticker);

  if (!symbol) {
    return {
      found: false,
      symbol,
      error: "Ticker required"
    };
  }

  const staticCompany = lookupStatic(symbol);

  // Built-in/code natal registry is intentionally protected.
  // It takes precedence over row-level overrides so core charts cannot be
  // changed accidentally through the app or the stocks table.
  if (staticCompany?.incorporationDate || staticCompany?.listingDate || staticCompany?.birthDate) {
    return {
      found: true,
      symbol,
      registrySource: "built-in-registry",
      registryType: "CORE",
      locked: true,
      ...applyPreferredChart(staticCompany, options.chartId, options)
    };
  }

  // /api/get-stocks has already read natal_registry for this exact response.
  // Use that request-local snapshot before any module cache or second database
  // read. This is the authoritative editable source for user-added stocks and
  // prevents a newly saved High/Final chart from being masked by an older
  // Research-Only cache entry in another serverless function instance.
  const registrySnapshot = companyFromRegistrySnapshot(stockOverride);
  if (registrySnapshot) {
    return {
      found: true,
      symbol,
      registrySource: "supabase-natal-registry",
      registryType: "USER",
      locked: false,
      ...applyPreferredChart(registrySnapshot, options.chartId, options)
    };
  }

  // The dedicated natal registry is the authoritative editable source for
  // user-added stocks. It must win over stale natal columns that may remain on
  // the generic stocks row after a user edits or replaces a chart.
  const dynamicRegistry = await loadDynamicRegistry();
  const dynamicCompany = dynamicRegistry[symbol] || dynamicRegistry[ALIASES[symbol]];

  if (dynamicCompany?.incorporationDate || dynamicCompany?.listingDate || dynamicCompany?.birthDate) {
    return {
      found: true,
      symbol,
      registrySource: "supabase-natal-registry",
      registryType: "USER",
      locked: false,
      ...applyPreferredChart(dynamicCompany, options.chartId, options)
    };
  }

  const override = companyFromStockOverride(stockOverride);

  if (override?.incorporationDate || override?.listingDate || override?.birthDate) {
    return {
      found: true,
      symbol,
      registrySource: "stock-row-override",
      registryType: "USER",
      locked: false,
      ...applyPreferredChart(override, options.chartId, options)
    };
  }

  return {
    found: false,
    symbol,
    error: "Company not found in built-in or dynamic natal registry"
  };
}

export {
  resolveCompany,
  normalizeTicker,
  normalizeRegistryRow,
  mergeRuntimeMemoryEntries,
  companyFromRegistrySnapshot,
  isBuiltInRegistrySymbol,
  clearDynamicRegistryCache
};

export default resolveCompany;
