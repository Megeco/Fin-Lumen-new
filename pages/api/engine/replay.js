import replayLabHandler from "../replay-lab.js";

function cleanTicker(value) {
  return String(value || "").trim().toUpperCase().replace(/\.(NS|BO)$/i, "").replace(/[^A-Z0-9&-]/g, "");
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }
  const ticker = cleanTicker(req.query.symbol || req.query.ticker);
  if (!ticker || !/^\d{4}-\d{2}-\d{2}$/.test(String(req.query.date || ""))) {
    return res.status(400).json({ success: false, error: "A valid NSE ticker and replay date are required." });
  }
  req.query = { ...req.query, ticker: `${ticker}.NS`, raw: "1", forwardDays: String(req.query.forwardDays || "730") };
  return replayLabHandler(req, res);
}
