import { ENGINE_SUPPORTED_SET } from "../../../engine-supported-symbols";

const ENGINE_ORIGIN = "https://fin-lumen-pure-astro.vercel.app";
const COMPLEX_REVIEW = new Set(["JIOFIN.NS", "COCHINSHIP.NS", "ONGC.NS"]);

function normalizeSymbol(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/\s+(NSE|NS)$/i, ".NS").replace(/\s+(BSE|BO)$/i, ".BO");
  if (!cleaned) return "";
  return cleaned.includes(".") ? cleaned : `${cleaned}.NS`;
}

function comparable(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function resolveOfficialSymbol(query: string): Promise<{ symbol?: string; ambiguous?: string[] }> {
  const direct = normalizeSymbol(query);
  if (/^[A-Z0-9&-]{1,24}\.(NS|BO)$/.test(direct) && !query.trim().includes(" ")) return { symbol: direct };
  const response = await fetch(new URL("/api/natal-registry", ENGINE_ORIGIN), { headers: { accept: "application/json" } });
  if (!response.ok) return {};
  const payload = await response.json() as { rows?: Array<{symbol?:string;companyName?:string}> };
  const needle = comparable(query);
  const matches = (payload.rows || []).filter(row => {
    const symbol = comparable(String(row.symbol || "").replace(/\.(NS|BO)$/i, ""));
    const name = comparable(row.companyName || "");
    return symbol === needle || name === needle || (needle.length >= 5 && name.includes(needle));
  });
  if (matches.length === 1) return { symbol: normalizeSymbol(matches[0].symbol || "") };
  if (matches.length > 1) return { ambiguous: matches.slice(0, 5).map(row => `${row.companyName || row.symbol} · ${row.symbol}`) };
  return {};
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("query") || url.searchParams.get("symbol") || "";
  const resolution = await resolveOfficialSymbol(query);
  if (resolution.ambiguous) return Response.json({ success:false,status:"ambiguous",matches:resolution.ambiguous,error:"More than one official company matches that name. Please enter its exchange ticker." }, { status:409 });
  const symbol = resolution.symbol || "";
  if (!/^[A-Z0-9&-]{1,24}\.(NS|BO)$/.test(symbol)) {
    return Response.json({ success: false, status: "invalid", error: "Enter a valid NSE or BSE ticker." }, { status: 400 });
  }
  const bareSymbol = symbol.replace(/\.(NS|BO)$/i, "");
  if (!ENGINE_SUPPORTED_SET.has(bareSymbol)) {
    return Response.json({ success: false, status: "natal-unavailable", symbol, reason: "This company is not yet in the approved Astro engine registry." }, { status: 422 });
  }

  try {
    const source = new URL("/api/get-stocks", ENGINE_ORIGIN);
    source.searchParams.set("symbols", symbol);
    const response = await fetch(source, { headers: { accept: "application/json" }, signal: AbortSignal.timeout(15000), cf: { cacheTtl: 86400, cacheEverything: true } } as RequestInit);
    if (!response.ok) return Response.json({ success: false, status: "unavailable", symbol }, { status: 404 });
    const payload = await response.json();
    const rows = Array.isArray(payload) ? payload : [];
    const row = rows.find(item => String(item?.name || item?.symbol || "").toUpperCase() === symbol);
    const model = row?.astro_model;
    const natal = model?.natal;
    const safeListingProxy = Boolean(row?.natal_pending && !COMPLEX_REVIEW.has(symbol) && natal?.primaryChartId === "listing" && /SOURCE-VERIFIED/i.test(String(natal?.confidenceLabel || "")));
    const natalPending = !row || (!safeListingProxy && row.natal_pending) || !model || Boolean(row.astro_error);
    if (natalPending) {
      return Response.json({ success: false, status: "natal-unavailable", symbol, reason: row?.astro_error || "No approved natal chart is available." }, { status: 422 });
    }
    return Response.json({
      success: true,
      status: "verified-engine-reading",
      symbol,
      engineVersion: model.version || "v37.9.14",
      computedAt: row.computed_at || new Date().toISOString(),
      skyDate: row.as_of_date || row.sky_date || new Date().toISOString().slice(0, 10),
      natalFingerprint: row.natal_chart_id || model.natal?.primaryChartId || `${symbol}:${model.natal?.chartAuthority || "approved"}`,
      chartBasisLabel: safeListingProxy ? "Official listing-session proxy" : undefined,
      chartConfidence: safeListingProxy ? Number(natal?.reliability || 50) : undefined,
      row,
    });
  } catch {
    return Response.json({ success: false, status: "engine-unreachable", symbol, error: "The astrology engine could not be reached." }, { status: 503 });
  }
}
