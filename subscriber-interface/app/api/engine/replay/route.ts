const ENGINE_ORIGIN = process.env.FIN_LUMEN_ENGINE_ORIGIN || "https://fin-lumen-pure-astro.vercel.app";

function normalizeSymbol(value: string): string {
  const cleaned = value.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
  return cleaned.replace(/[^A-Z0-9&-]/g, "");
}

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  const today = new Date().toISOString().slice(0, 10);
  return value >= "1990-01-01" && value <= today;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = normalizeSymbol(url.searchParams.get("symbol") || url.searchParams.get("ticker") || "");
  const date = String(url.searchParams.get("date") || "").trim();
  const includeResearch = url.searchParams.get("research") !== "0";

  if (!symbol || !validDate(date)) {
    return Response.json(
      { success: false, error: "A valid approved-company ticker and historical date are required." },
      { status: 400 },
    );
  }

  const source = new URL("/api/replay-lab", ENGINE_ORIGIN);
  source.searchParams.set("ticker", `${symbol}.NS`);
  source.searchParams.set("date", date);
  source.searchParams.set("forwardDays", "730");
  if (includeResearch) source.searchParams.set("raw", "1");

  try {
    const response = await fetch(source, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(55000),
    });
    const payload = await response.json();

    if (!response.ok || !payload?.success) {
      return Response.json(
        {
          success: false,
          status: response.status === 404 ? "natal-unavailable" : "replay-failed",
          error: payload?.error || "The historical sky could not be calculated.",
        },
        { status: response.status || 502 },
      );
    }

    const canonicalPayload = {
      ...payload,
      version: "v37.9.14",
      sourceRouteVersion: payload.version || null,
      engineAuthority: "Fin-Lumen Personal Research 1.0 · v37.9.14",
    };

    return Response.json(canonicalPayload, {
      headers: {
        "cache-control": "public, max-age=3600, s-maxage=86400",
        "x-fin-lumen-engine": "v37.9.14",
      },
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        status: "engine-unreachable",
        error: error instanceof Error ? error.message : "The astrology engine could not be reached.",
      },
      { status: 503 },
    );
  }
}
