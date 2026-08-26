import { createClient } from "@supabase/supabase-js";
import { isBuiltInRegistrySymbol, clearDynamicRegistryCache } from "../../lib/companyResolver.js";
import { setMemoryNatalEntry } from "../../lib/natalMemoryRegistry.js";

function clean(value) { return String(value || "").trim(); }
function normalizeSymbol(value) { return clean(value).toUpperCase(); }
function normalizeDateInput(value) {
  const raw = clean(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (m) {
    // Fin-Lumen UI users are India-first; treat 03-02-2017 as 3 Feb 2017.
    const dd = String(m[1]).padStart(2, "0");
    const mm = String(m[2]).padStart(2, "0");
    return `${m[3]}-${mm}-${dd}`;
  }
  return raw;
}

function getSupabaseConfig() {
  const url = clean(
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_PROJECT_URL
  ).replace(/\/+$/, "");

  const key = clean(
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  if (!url || !key) return { url: "", key: "", error: "Supabase URL/key environment variables are not configured." };
  if (!/^https?:\/\//i.test(url)) return { url, key, error: "Supabase URL is invalid. It must start with https://" };
  return { url, key, error: "" };
}

async function fetchWithTimeout(resource, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function memorySuccess(res, payload, chart, warning, status = 200) {
  const saved = setMemoryNatalEntry(payload.symbol, payload);
  clearDynamicRegistryCache?.();
  globalThis.__FINLUMEN_CACHE__ = {};
  return res.status(status).json({
    success: true,
    saved: saved || payload,
    resolvedChart: chart,
    storage: "runtime-memory",
    warning,
    note: "Saved for the current server session because Supabase persistence is unavailable. Check Vercel/Supabase environment variables for permanent saves.",
    createTableSql: CREATE_TABLE_SQL,
    migrationSql: MIGRATION_SQL
  });
}

function defaultsFor(chartType) {
  const type = String(chartType || "incorporation").toLowerCase();
  if (type.includes("listing") || type.includes("record-date")) {
    return { time: "09:15", city: "Mumbai", country: "India", timezone: "Asia/Kolkata" };
  }
  return { time: "11:00", city: "", country: "India", timezone: "Asia/Kolkata" };
}

const CREATE_TABLE_SQL = `create table if not exists natal_registry (
  symbol text primary key,
  company_name text,
  chart_type text not null default 'incorporation',
  chart_id text not null default 'incorporation',
  birth_date date not null,
  birth_time text not null,
  city text,
  country text default 'India',
  timezone text default 'Asia/Kolkata',
  confidence text default 'low',
  source_note text,
  audit_status text default 'manual-entry',
  source_verification text default 'unverified',
  anchor_validation text default 'untested',
  time_precision text default 'event-time-assumed',
  capital_authority_ceiling text default 'RESEARCH_ONLY',
  production_status text default 'RESEARCH',
  user_finalized boolean default false,
  charts jsonb,
  preferred_chart_id text,
  incorporation_date date,
  listing_date date,
  updated_at timestamptz default now()
);`;

const MIGRATION_SQL = `alter table natal_registry add column if not exists chart_type text default 'incorporation';
alter table natal_registry add column if not exists chart_id text default 'incorporation';
alter table natal_registry add column if not exists birth_date date;
alter table natal_registry add column if not exists birth_time text;
alter table natal_registry add column if not exists audit_status text default 'manual-entry';
alter table natal_registry add column if not exists source_verification text default 'unverified';
alter table natal_registry add column if not exists anchor_validation text default 'untested';
alter table natal_registry add column if not exists time_precision text default 'event-time-assumed';
alter table natal_registry add column if not exists capital_authority_ceiling text default 'RESEARCH_ONLY';
alter table natal_registry add column if not exists production_status text default 'RESEARCH';
alter table natal_registry add column if not exists user_finalized boolean default false;
alter table natal_registry add column if not exists charts jsonb;
alter table natal_registry add column if not exists preferred_chart_id text;
alter table natal_registry add column if not exists listing_date date;
alter table natal_registry alter column incorporation_date drop not null;
update natal_registry set birth_date = coalesce(birth_date, incorporation_date) where birth_date is null;
update natal_registry set birth_time = coalesce(birth_time, '11:00') where birth_time is null;`;

function sourceNoteWithMeta(chart, rawSource, authority = {}) {
  const safe = value => String(value || '').replace(/[;\n\r]/g, ' ').trim();
  return [
    `chart_type=${safe(chart.chartType)}`,
    `chart_id=${safe(chart.id)}`,
    `birth_time=${safe(chart.time)}`,
    `birth_date=${safe(chart.date)}`,
    `confidence=${safe(chart.confidence)}`,
    `audit_status=${safe(authority.audit_status)}`,
    `source_verification=${safe(authority.source_verification)}`,
    `anchor_validation=${safe(authority.anchor_validation)}`,
    `time_precision=${safe(authority.time_precision)}`,
    `capital_authority_ceiling=${safe(authority.capital_authority_ceiling)}`,
    `production_status=${safe(authority.production_status)}`,
    `user_finalized=${authority.user_finalized ? "true" : "false"}`,
    `source=${safe(rawSource || chart.source)}`
  ].join('; ');
}

function legacyPayloadForExistingSchema(payload, chart) {
  return {
    symbol: payload.symbol,
    company_name: payload.company_name,
    incorporation_date: payload.birth_date,
    city: payload.city,
    country: payload.country,
    timezone: payload.timezone,
    confidence: payload.confidence,
    source_note: sourceNoteWithMeta(chart, payload.source_note, payload),
    updated_at: payload.updated_at
  };
}

// The user's established natal_registry schema contains the complete chart
// fields, but older deployments may not yet contain the six explicit v36.9.6
// authority columns. Preserve the full chart and encode those authority fields
// in source_note so a High-confidence final inclusion survives a refresh.
function schemaCompatiblePayloadForExistingSchema(payload, chart) {
  return {
    symbol: payload.symbol,
    company_name: payload.company_name,
    incorporation_date: payload.incorporation_date,
    listing_date: payload.listing_date,
    birth_date: payload.birth_date,
    birth_time: payload.birth_time,
    city: payload.city,
    country: payload.country,
    timezone: payload.timezone,
    chart_type: payload.chart_type,
    chart_id: payload.chart_id,
    confidence: payload.confidence,
    audit_status: payload.audit_status,
    source_note: sourceNoteWithMeta(chart, payload.source_note, payload),
    charts: payload.charts,
    preferred_chart_id: payload.preferred_chart_id,
    updated_at: payload.updated_at
  };
}

function isSchemaCompatibilityError(error) {
  const message = String(error?.message || error || "");
  return /schema cache|column|PGRST204|birth_date|birth_time|chart_type|chart_id|audit_status|charts|preferred_chart_id|listing_date|source_verification|anchor_validation|time_precision|capital_authority_ceiling|production_status|user_finalized/i.test(message);
}

async function directRestRequest({ url, key, payload, method, query = "" }) {
  const response = await fetchWithTimeout(`${url}/rest/v1/natal_registry${query}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation"
    },
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }

  if (!response.ok) {
    const message = body?.message || body?.error || text || `Supabase REST HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function directRestPersist({ url, key, payload }) {
  const symbolFilter = `?symbol=eq.${encodeURIComponent(payload.symbol)}`;
  const updated = await directRestRequest({ url, key, payload, method: "PATCH", query: symbolFilter });
  if (Array.isArray(updated) && updated.length) return { mode: "update", rows: updated };
  const inserted = await directRestRequest({ url, key, payload, method: "POST" });
  return { mode: "insert", rows: inserted };
}

async function sdkPersistWithoutUniqueConstraint(supabase, payload) {
  const update = await supabase
    .from("natal_registry")
    .update(payload)
    .eq("symbol", payload.symbol)
    .select("symbol");
  if (!update.error && Array.isArray(update.data) && update.data.length) {
    return { ok: true, mode: "update", rows: update.data };
  }
  if (update.error) return { ok: false, error: update.error };

  const insert = await supabase.from("natal_registry").insert([payload]).select("symbol");
  return insert.error
    ? { ok: false, error: insert.error }
    : { ok: true, mode: "insert", rows: insert.data || [] };
}

async function persistCompatibleNatal({ supabase, url, key, variants }) {
  let lastError = null;
  for (const variant of variants) {
    try {
      const result = await sdkPersistWithoutUniqueConstraint(supabase, variant.payload);
      if (result.ok) return { ...result, ...variant };
      lastError = result.error;
      if (!isSchemaCompatibilityError(result.error)) break;
    } catch (err) {
      lastError = err;
      try {
        const result = await directRestPersist({ url, key, payload: variant.payload });
        return { ok: true, ...result, ...variant };
      } catch (restErr) {
        lastError = restErr;
        if (!isSchemaCompatibilityError(restErr)) break;
      }
    }
  }
  return { ok: false, error: lastError };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST required" });

  const body = req.body || {};
  const symbol = normalizeSymbol(body.symbol || body.ticker || body.name);
  const chartType = clean(body.chartType || body.chart_type || "incorporation");
  const defaults = defaultsFor(chartType);
  const birthDate = normalizeDateInput(body.birthDate || body.birth_date || body.incorporationDate || body.incorporation_date || body.listingDate || body.listing_date);
  const birthTime = clean(body.birthTime || body.birth_time || defaults.time);
  const chartId = clean(body.chartId || body.chart_id || chartType);

  if (!symbol || !birthDate || !birthTime) return res.status(400).json({ success: false, error: "symbol, natal date and natal time are required", createTableSql: CREATE_TABLE_SQL, migrationSql: MIGRATION_SQL });
  if (isBuiltInRegistrySymbol(symbol)) return res.status(403).json({ success: false, locked: true, error: "Core registry stock is locked. Edit audited chart candidates in the code registry." });

  const city = clean(body.city || defaults.city);
  if (!city) return res.status(400).json({ success: false, error: "Place/city is required for the selected chart", createTableSql: CREATE_TABLE_SQL, migrationSql: MIGRATION_SQL });

  const chart = {
    id: chartId,
    chartType,
    date: birthDate,
    time: birthTime,
    city,
    country: clean(body.country || defaults.country),
    timezone: clean(body.timezone || defaults.timezone),
    confidence: clean(body.confidence || "low"),
    source: clean(body.source || body.sourceNote || "manual entry from Fin-Lumen UI")
  };
  const userFinalized = chart.confidence.toLowerCase() === "high";
  const authority = userFinalized ? {
    auditStatus: "user-confirmed-final",
    sourceVerification: "user-confirmed",
    anchorValidation: "definitive-user-confirmed",
    capitalAuthorityCeiling: "FULL_BUILD_ELIGIBLE",
    productionStatus: "FINAL"
  } : {
    auditStatus: clean(body.auditStatus || "manual-entry"),
    sourceVerification: "unverified",
    anchorValidation: "untested",
    capitalAuthorityCeiling: "RESEARCH_ONLY",
    productionStatus: "RESEARCH"
  };

  const payload = {
    symbol,
    company_name: clean(body.companyName || body.company_name || symbol),
    chart_type: chartType,
    chart_id: chartId,
    birth_date: birthDate,
    birth_time: birthTime,
    city: chart.city,
    country: chart.country,
    timezone: chart.timezone,
    confidence: chart.confidence,
    source_note: chart.source,
    audit_status: authority.auditStatus,
    source_verification: authority.sourceVerification,
    anchor_validation: authority.anchorValidation,
    time_precision: "user-supplied-or-chart-default",
    capital_authority_ceiling: authority.capitalAuthorityCeiling,
    production_status: authority.productionStatus,
    user_finalized: userFinalized,
    charts: [chart],
    preferred_chart_id: chartId,
    incorporation_date: chartType === "incorporation" ? birthDate : null,
    listing_date: chartType.includes("listing") ? birthDate : null,
    updated_at: new Date().toISOString()
  };

  const compatiblePayload = schemaCompatiblePayloadForExistingSchema(payload, chart);
  const legacyPayload = legacyPayloadForExistingSchema(payload, chart);

  const config = getSupabaseConfig();
  if (config.error) {
    return memorySuccess(res, payload, chart, `${config.error} Saved to current-session fallback instead.`);
  }

  const supabase = createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: fetchWithTimeout }
  });

  const persisted = await persistCompatibleNatal({
    supabase,
    url: config.url,
    key: config.key,
    variants: [
      { payload, storage: "supabase", warning: null },
      {
        payload: compatiblePayload,
        storage: "supabase-compatible-schema",
        warning: "Saved permanently using the current natal_registry schema; final/research authority is preserved in the registry metadata."
      },
      {
        payload: legacyPayload,
        storage: "supabase-legacy-schema",
        warning: "Saved permanently using the legacy natal_registry schema; chart and authority metadata are preserved in source_note."
      }
    ]
  });

  if (!persisted.ok) {
    return memorySuccess(
      res,
      payload,
      chart,
      `Supabase persistence unavailable (${persisted.error?.message || persisted.error || "unknown error"}). Saved to current-session fallback instead.`
    );
  }
  clearDynamicRegistryCache?.();
  globalThis.__FINLUMEN_CACHE__ = {};
  return res.status(200).json({
    success: true,
    saved: persisted.payload,
    resolvedChart: chart,
    storage: persisted.storage,
    persistenceMode: persisted.mode,
    warning: persisted.warning,
    createTableSql: CREATE_TABLE_SQL,
    migrationSql: MIGRATION_SQL
  });
}

export { schemaCompatiblePayloadForExistingSchema, isSchemaCompatibilityError, sdkPersistWithoutUniqueConstraint };
