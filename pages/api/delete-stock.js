import { createClient } from "@supabase/supabase-js";
import { isBuiltInRegistrySymbol, clearDynamicRegistryCache } from "../../lib/companyResolver.js";
import { clearMemoryNatalEntry } from "../../lib/natalMemoryRegistry.js";

function clean(value) { return String(value || "").trim(); }
function normalizeSymbol(value) { return clean(value).toUpperCase(); }
function isNumericId(value) { return /^\d+$/.test(clean(value)); }
function isCompatibilityError(error) {
  return /column|schema cache|does not exist|PGRST204/i.test(String(error?.message || error || ""));
}

function getConfig() {
  const url = clean(process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_PROJECT_URL).replace(/\/+$/, "");
  const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  return { url, key };
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return res.status(405).json({ success: false, error: "POST required" });
    const body = req.body || {};
    const requestedId = clean(body.id);
    let symbol = normalizeSymbol(body.symbol || body.name || body.ticker);

    if (!symbol && !isNumericId(requestedId)) {
      return res.status(400).json({
        success: false,
        error: "Stock symbol required. Refresh the app and try removing the stock again."
      });
    }

    const { url, key } = getConfig();
    if (!url || !key) return res.status(500).json({ success: false, error: "Supabase environment variables are not configured" });
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    // Backward compatibility for an older browser bundle that still submits a
    // real numeric stocks.id. Synthetic demo-* ids are never sent to bigint.
    if (!symbol && isNumericId(requestedId)) {
      const { data: rows, error } = await supabase.from("stocks").select("*").eq("id", requestedId).limit(1);
      if (error) throw error;
      symbol = normalizeSymbol(rows?.[0]?.name || rows?.[0]?.symbol);
    }
    if (!symbol) return res.status(404).json({ success: false, error: "Stock not found. Refresh the app and try again." });

    if (isBuiltInRegistrySymbol(symbol)) {
      return res.status(403).json({
        success: false,
        locked: true,
        error: "Core registry stock is locked. It can only be removed or changed in code."
      });
    }

    // Delete every persistent representation of the same symbol. This also
    // removes duplicates created by older schemas without unique constraints.
    const stockByName = await supabase.from("stocks").delete().eq("name", symbol);
    if (stockByName.error && !isCompatibilityError(stockByName.error)) throw stockByName.error;

    const stockBySymbol = await supabase.from("stocks").delete().eq("symbol", symbol);
    if (stockBySymbol.error && !isCompatibilityError(stockBySymbol.error)) throw stockBySymbol.error;

    const natalDelete = await supabase.from("natal_registry").delete().eq("symbol", symbol);
    if (natalDelete.error && !isCompatibilityError(natalDelete.error)) throw natalDelete.error;

    clearMemoryNatalEntry(symbol);
    clearDynamicRegistryCache?.();

    globalThis.__FINLUMEN_CACHE__ = {};
    return res.status(200).json({
      success: true,
      removed: symbol
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
