import { createClient } from "@supabase/supabase-js";
import { clearDynamicRegistryCache } from "../../lib/companyResolver.js";

function clean(value) {
  return String(value || "").trim();
}

function normalizeTicker(value) {
  const raw = clean(value).toUpperCase();
  if (!raw) return "";
  // Keep aliases like DIXON INC if user wants a custom test chart, but add .NS for ordinary Indian tickers.
  if (/\s/.test(raw) || raw.includes(".") || raw.includes("_")) return raw;
  return `${raw}.NS`;
}

function inferDefaultProfile(ticker) {
  const symbol = ticker.toUpperCase();

  if (symbol.includes("BANK") || symbol.includes("FIN")) {
    return {
      structural_cycle: "STRUCTURAL LEADER",
      expected_behaviour: "Natal data pending; add a chart before trusting the stock-specific reading.",
      expansion_current: "NATAL_PENDING",
      next_ignition: "Add natal data"
    };
  }

  if (symbol.includes("DEFENCE") || symbol.includes("AIA") || symbol.includes("ENG")) {
    return {
      structural_cycle: "INDUSTRIAL / DEFENCE CANDIDATE",
      expected_behaviour: "Natal data pending; add a chart before trusting the stock-specific reading.",
      expansion_current: "NATAL_PENDING",
      next_ignition: "Add natal data"
    };
  }

  return {
    structural_cycle: "NATAL DATA PENDING",
    expected_behaviour: "Natal data pending; add chart details in the Natal Registry Editor.",
    expansion_current: "NATAL_PENDING",
    next_ignition: "Add natal data"
  };
}

async function tryUpsert(supabase, payload) {
  const variants = [
    { payload, warning: null },
    { payload: { name: payload.name, updated_at: payload.updated_at }, warning: "Saved using the compact stocks schema. Add natal data next." },
    { payload: { name: payload.name }, warning: "Saved only the stock symbol because the stocks table has fewer columns than expected. Add natal data next." }
  ];
  let lastError = null;

  // Do not depend on a unique constraint. Update all old duplicates by the
  // canonical symbol; insert only when no matching row exists.
  for (const variant of variants) {
    const update = await supabase.from("stocks").update(variant.payload).eq("name", payload.name).select("name");
    if (!update.error && Array.isArray(update.data) && update.data.length) {
      return { ok: true, payload: variant.payload, warning: variant.warning };
    }
    if (update.error) lastError = update.error;

    const insert = await supabase.from("stocks").insert([variant.payload]).select("name");
    if (!insert.error) return { ok: true, payload: variant.payload, warning: variant.warning };
    lastError = insert.error;
  }

  return { ok: false, error: lastError };
}

async function persistNatalPlaceholder(supabase, ticker) {
  const existing = await supabase
    .from("natal_registry")
    .select("symbol")
    .eq("symbol", ticker)
    .limit(1);
  if (!existing.error && Array.isArray(existing.data) && existing.data.length) {
    return { ok: true, existing: true };
  }

  const placeholder = {
    symbol: ticker,
    company_name: ticker,
    confidence: "low",
    audit_status: "natal-pending",
    source_note: "Stock added in Fin-Lumen; natal data pending",
    updated_at: new Date().toISOString()
  };
  const result = await supabase.from("natal_registry").insert([placeholder]);
  return result.error ? { ok: false, error: result.error } : { ok: true, payload: placeholder };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST required" });

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
  if (!url || !key) return res.status(500).json({ success: false, error: "Supabase environment variables are not configured" });

  const ticker = normalizeTicker(req.body?.name || req.body?.symbol || req.body?.ticker);
  if (!ticker) return res.status(400).json({ success: false, error: "Stock name required" });

  const profile = inferDefaultProfile(ticker);
  const stockData = {
    name: ticker,
    structural_cycle: profile.structural_cycle,
    current_pressure: "NATAL_PENDING",
    next_pressure: "Natal data required",
    expansion_current: profile.expansion_current,
    next_ignition: profile.next_ignition,
    current_window: "ADD NATAL DATA",
    action: "NATAL DATA PENDING",
    next_event: "Natal data required",
    days_to_event: null,
    expected_behaviour: profile.expected_behaviour,
    updated_at: new Date().toISOString()
  };

  const supabase = createClient(url, key);
  const result = await tryUpsert(supabase, stockData);
  const placeholder = await persistNatalPlaceholder(supabase, ticker);

  if (!result.ok) {
    if (placeholder.ok) {
      clearDynamicRegistryCache?.();
      globalThis.__FINLUMEN_CACHE__ = {};
      return res.status(200).json({
        success: true,
        saved: placeholder.payload || { symbol: ticker },
        storage: "natal-registry-placeholder",
        warning: "Stock saved as Natal Pending. Add natal data to activate the final or research classification."
      });
    }
    return res.status(500).json({
      success: false,
      error: result.error?.message || placeholder.error?.message || "Could not save stock",
      hint: "Check that the Supabase stocks table exists. At minimum it needs a text column named name."
    });
  }

  clearDynamicRegistryCache?.();
  globalThis.__FINLUMEN_CACHE__ = {};
  const warnings = [result.warning, placeholder.ok ? null : "The stock was saved, but the Natal Pending registry placeholder could not be written."].filter(Boolean);
  return res.status(200).json({ success: true, saved: result.payload, warning: warnings.join(" ") || null });
}
