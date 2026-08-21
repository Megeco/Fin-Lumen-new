import { astroEngine } from "../../../lib/astroEngine.js";

function cleanTicker(value) {
  return String(value || "").trim().toUpperCase().replace(/\.(NS|BO)$/i, "").replace(/[^A-Z0-9&-]/g, "");
}

function istDate() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const ticker = cleanTicker(req.query.query || req.query.symbol);
  if (!ticker) return res.status(400).json({ success: false, status: "identity-needed", error: "Enter an NSE ticker." });

  try {
    const row = await astroEngine({ name: `${ticker}.NS`, symbol: `${ticker}.NS`, asOfDate: istDate(), includeResearchContext: false });
    if (!row?.computed_from_natal || !row?.astro_model) {
      return res.status(404).json({ success: false, status: "not-approved", symbol: ticker, reason: "No approved natal record is available for this company." });
    }
    const model = row.astro_model;
    return res.status(200).json({
      success: true,
      status: "verified-engine-reading",
      symbol: ticker,
      skyDate: istDate(),
      engineVersion: model.version || row.production_model_version || "v37.9.14",
      natalFingerprint: row.natal_chart_id || model.natal?.primaryChartId || `${ticker}-approved-chart`,
      chartBasisLabel: model.natal?.chartAuthority || row.natal_chart_type || "Approved natal chart",
      chartConfidence: model.natal?.reliability ?? row.natal_reliability ?? 50,
      row: { ...row, name: ticker, symbol: `${ticker}.NS`, company_name: row.natal_company_name || model.natal?.companyName || ticker }
    });
  } catch (error) {
    return res.status(500).json({ success: false, status: "engine-unreachable", error: error instanceof Error ? error.message : "The Astro engine could not calculate this company." });
  }
}
