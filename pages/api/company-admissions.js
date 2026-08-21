const DEFAULT_ORIGIN = "https://fin-lumen-subscriber.twoopod.chatgpt.site";

export default async function handler(req, res) {
  if (!["GET", "POST"].includes(req.method)) {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const origin = String(process.env.FIN_LUMEN_ADMISSION_ORIGIN || DEFAULT_ORIGIN).replace(/\/$/, "");
  try {
    const upstream = await fetch(`${origin}/api/company-admissions`, {
      method: req.method,
      headers: { accept: "application/json", ...(req.method === "POST" ? { "content-type": "application/json" } : {}) },
      body: req.method === "POST" ? JSON.stringify(req.body || {}) : undefined
    });
    const body = await upstream.text();
    res.status(upstream.status);
    res.setHeader("content-type", upstream.headers.get("content-type") || "application/json");
    return res.send(body);
  } catch (error) {
    return res.status(503).json({ status: "engine-unreachable", error: error instanceof Error ? error.message : "The shared admission queue is temporarily unavailable." });
  }
}
