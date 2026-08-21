"use client";
import { jsx, jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { cacheReading, readCachedReadings } from "./browser-reading-cache";
import { ENGINE_SUPPORTED_SYMBOLS } from "./engine-supported-symbols";
const starterStocks = [
  { ticker: "BHARTIARTL", name: "Bharti Airtel", reading: "Expansion strengthening", tone: "expansion", e: 72, p: 55, phase: "Strengthening", window: "Active \xB7 20 Aug", nearPath: ["Expansion strengthening", "Rerating established \xB7 11\u201326 Sep", "Continuation pause \xB7 11 Oct"], nextInflection: "11 Sep \xB7 Rerating established", pressure: "No structural pressure sequence", potential: "Exceptional rerating structure", score: 90, episodes: 4, forward: 77, interruption: "No Break-Risk in measured runway", renewal: "Rerating established \xB7 11 Sep", chart: "Verified listing chart", confidence: 77, story: "Expansion is strengthening again. No slow pressure pattern. Forward leadership remains constructive." },
  { ticker: "HDFCBANK", name: "HDFC Bank", reading: "Rerating established", tone: "durable", e: 79, p: 53, phase: "Established", window: "20\u201327 Aug", nearPath: ["Rerating established", "Expansion strengthens \xB7 11 Sep", "Pressure begins forming \xB7 11 Sep\u201311 Oct"], nextInflection: "11 Sep \xB7 Expansion strengthens", pressure: "Pressure begins forming in September", potential: "Exceptional repeated expansion", score: 88, episodes: 3, forward: 74, interruption: "Peak pressure \xB7 26 Oct\u201310 Nov; no Break-Risk", renewal: "Continuation resumes after November pressure", chart: "Verified merger-effective chart", confidence: 75, story: "Rerating is established. Expansion leads, with an early pressure warning beginning in September." },
  { ticker: "TCS", name: "Tata Consultancy Services", reading: "Pressure in control", tone: "pressure", e: 70, p: 66, phase: "Pressure sovereign", window: "Active \xB7 20 Aug", nearPath: ["Pressure in control", "Rerating intact, but pausing \xB7 27 Aug", "Continuation through October"], nextInflection: "27 Aug \xB7 Support reappears", pressure: "Current pressure; no qualified Break-Risk", potential: "Exceptional long-cycle runway", score: 87, episodes: 4, forward: 70, interruption: "Current pressure interrupts expression", renewal: "Rerating pause begins \xB7 27 Aug", chart: "Verified listing chart", confidence: 75, story: "Pressure is governing now, while the measured 24-month structure retains four productive expansion episodes." },
  { ticker: "PFC", name: "Power Finance Corporation", reading: "Expansion strengthening", tone: "expansion", e: 69, p: 56, phase: "Strengthening", window: "Active \xB7 20 Aug", nearPath: ["Expansion strengthening", "Rerating established \xB7 27 Aug\u201326 Sep", "Continuation pause \xB7 11 Oct"], nextInflection: "27 Aug \xB7 Rerating established", pressure: "No structural pressure sequence", potential: "Exceptional repeated expansion", score: 85, episodes: 4, forward: 74, interruption: "No Break-Risk in measured runway", renewal: "Rerating established \xB7 27 Aug", chart: "Verified listing chart", confidence: 75, story: "Expansion is strengthening and develops into an established rerating window across late August and September." },
  { ticker: "TITAN", name: "Titan Company", reading: "Rerating established", tone: "forming-pressure", e: 75, p: 63, phase: "Established \xB7 vulnerability forming", window: "Active \xB7 20 Aug", nearPath: ["Rerating established", "Continuation compresses \xB7 26 Sep", "Early pressure warning develops"], nextInflection: "26 Sep \xB7 Continuation compresses", pressure: "Early vulnerability; expansion still leads", potential: "Exceptional rerating structure", score: 85, episodes: 3, forward: 73, interruption: "High pressure candidate in early 2027; not Break-Risk", renewal: "Three expansion episodes across the runway", chart: "Verified incorporation chart", confidence: 75, story: "Rerating is established. Risk is rising, but expansion still has control; this is an early warning, not active pressure." },
  { ticker: "RELIANCE", name: "Reliance Industries", reading: "Rerating established", tone: "durable", e: 73, p: 56, phase: "Established", window: "Active \xB7 20 Aug", nearPath: ["Rerating established", "Continuation pause \xB7 11 Sep", "Expansion remains intact through October"], nextInflection: "11 Sep \xB7 Continuation compresses", pressure: "No structural pressure sequence", potential: "Strong repeated expansion", score: 83, episodes: 2, forward: 74, interruption: "No Break-Risk in measured runway", renewal: "Two distinct productive episodes", chart: "Verified listing chart", confidence: 95, story: "Rerating is established. The next phase is a pause within expansion rather than a structural pressure sequence." },
  { ticker: "NEWGEN", name: "Newgen Software", reading: "Expansion strengthening", tone: "forming-pressure", e: 71, p: 63, phase: "Strengthening \xB7 vulnerability forming", window: "Active \xB7 20 Aug", nearPath: ["Expansion strengthening", "Pressure activates \xB7 27 Aug", "Rerating established \xB7 by 11 Sep"], nextInflection: "27 Aug \xB7 Pressure activates", pressure: "Early warning; expansion still leads", potential: "Strong role-validated runway", score: 82, episodes: 3, forward: 76, interruption: "Pressure phase \xB7 February 2027; no Break-Risk", renewal: "Rerating renewal \xB7 10 Mar 2027", chart: "Role-validated history", confidence: 95, story: "Expansion is strengthening. Pressure begins to activate before the rerating becomes established; distinct chart roles remain unblended." },
  { ticker: "LT", name: "Larsen & Toubro", reading: "Peak pressure", tone: "pressure", e: 65, p: 73, phase: "Pressure culmination", window: "20\u201327 Aug", nearPath: ["Peak pressure", "Brief support \xB7 27 Aug", "Compressed rerating + early warning \xB7 11 Sep"], nextInflection: "27 Aug \xB7 Brief support", pressure: "Pressure has not yet cleared", potential: "Strong but delayed runway", score: 80, episodes: 1, forward: 96, interruption: "Current pressure precedes the productive episode", renewal: "One long productive expansion episode", chart: "Verified incorporation chart", confidence: 75, story: "Peak pressure is active. A short burst of support does not yet establish recovery, although forward leadership is high." },
  { ticker: "ICICIBANK", name: "ICICI Bank", reading: "Pressure in control", tone: "pressure", e: 66, p: 78, phase: "Pressure sovereign", window: "Active \xB7 20 Aug", nearPath: ["Pressure in control", "Peak pressure \xB7 27 Aug", "Brief support; pressure not cleared"], nextInflection: "27 Aug \xB7 Pressure culmination", pressure: "High structural discipline; no Break-Risk", potential: "Moderate future runway", score: 70, episodes: 2, forward: 75, interruption: "Two severe candidates remain unqualified", renewal: "Expansion strengthens \xB7 6 Sep 2027", chart: "Verified incorporation chart", confidence: 75, story: "Pressure is in control. Brief support does not yet mean recovery; the measured runway contains two later expansion episodes." },
  { ticker: "IFCI", name: "IFCI", reading: "Expansion strengthening", tone: "expansion", e: 80, p: 65, phase: "Strengthening", window: "20\u201327 Aug", nearPath: ["Expansion strengthening", "Rerating established \xB7 11 Sep", "Continuation pauses \xB7 26 Sep"], nextInflection: "11 Sep \xB7 Rerating established", pressure: "Qualified Break-Risk \xB7 Feb 2027", potential: "Moderate \xB7 interrupted runway", score: 66, episodes: 1, forward: 72, interruption: "Break-Risk \xB7 4\u201323 Feb 2027", renewal: "Two post-pressure reformation episodes", chart: "Verified corporatisation chart", confidence: 95, story: "Expansion is strengthening now, but a qualified structural Break-Risk interrupts the longer runway in February 2027." }
];
const PUBLICATION_SKY_DATE = "2026-08-20";
function cleanTicker(value) {
  return value.trim().toUpperCase().replace(/\.(NS|BO)$/i, "").replace(/[^A-Z0-9&-]/g, "");
}
function labelFromTicker(ticker) {
  return ticker.replace(/&/g, " & ").replace(/-/g, " ");
}
function rangeLabel(windowValue) {
  if (!windowValue) return "No separate window mapped";
  const label = windowValue.label || windowValue.state || windowValue.phase || "Mapped window";
  const dates = [windowValue.start, windowValue.end].filter(Boolean).join("\u2013");
  return dates ? `${label} \xB7 ${dates}` : label;
}
function toneFromState(state, direction) {
  const text = `${state} ${direction}`.toUpperCase();
  if (text.includes("BREAK")) return "break";
  if (text.includes("PRESSURE") && text.includes("FORM")) return "forming-pressure";
  if (text.includes("PRESSURE")) return "pressure";
  if (text.includes("DURABLE")) return "durable";
  if (text.includes("EXPANSION") || text.includes("RERATING")) return "expansion";
  return "contested";
}
function adaptEngineReading(payload) {
  const raw = payload?.row;
  const model = raw?.astro_model;
  if (!raw || !model?.current || !model?.scores) return null;
  const currentState = model.current.state || "Current astro state";
  const ticker = cleanTicker(raw.name || raw.symbol || payload.symbol || "");
  if (!ticker) return null;
  const tactical = (model.paths?.tactical || []).slice(0, 3).map((event) => rangeLabel(event));
  const strategic = model.paths?.strategic || [];
  const pressureWindow = model.windows?.pressure || model.windows?.breakRisk;
  const renewalEvent = strategic.find((event) => /EXPANSION|RERATING|SUPPORT|RECOVER/i.test(String(event?.label || event?.state || "")));
  const episodes = Array.isArray(model.cycle?.episodes) ? model.cycle.episodes.length : 0;
  const chartType = raw.natal_chart_type || model.natal?.chartType || model.natal?.chartAuthority || "approved";
  const confidence = Number(payload.chartConfidence ?? model.natal?.reliability ?? raw.natal_reliability ?? 50);
  return { ticker, name: raw.company_name || model.natal?.companyName || labelFromTicker(ticker), reading: currentState, tone: toneFromState(currentState, model.current.direction || ""), e: Number(model.scores.expansion || 0), p: Number(model.scores.pressure || 0), phase: [model.current.expansionStage, model.current.pressureStage].filter(Boolean).join(" \xB7 ") || currentState, window: rangeLabel(model.windows?.rerating || model.windows?.pressure), nearPath: tactical.length ? tactical : [currentState], nextInflection: tactical[1] || "No separate turning point mapped", pressure: rangeLabel(pressureWindow), potential: `${model.cycle?.level || "Measured"} long-cycle structure`, score: Number(model.cycle?.score ?? model.scores.cycleRunway ?? 0), episodes, forward: Number(model.scores.forwardLeadership || 0), interruption: rangeLabel(model.windows?.breakRisk || model.windows?.pressure), renewal: renewalEvent ? rangeLabel(renewalEvent) : "No separate renewal mapped", chart: payload.chartBasisLabel || `Verified ${String(chartType).toLowerCase()} chart`, confidence, story: model.current.story || "The Astro engine returned an approved current reading.", skyDate: payload.skyDate, engineVersion: payload.engineVersion || model.version || "v37.9.14", natalFingerprint: payload.natalFingerprint, cacheState: "fresh" };
}
async function fetchApprovedReading(value) {
  const response = await fetch(`/api/engine/stock?query=${encodeURIComponent(value.trim())}`, { headers: { accept: "application/json" } });
  const payload = await response.json();
  return { response, payload };
}
async function fetchHistoricalReplay(ticker, date) {
  const response = await fetch(`/api/engine/replay?symbol=${encodeURIComponent(ticker)}&date=${encodeURIComponent(date)}&research=1`, { headers: { accept: "application/json" } });
  const payload = await response.json();
  return { response, payload };
}
async function requestCompanyAdmission(value) {
  const response = await fetch("/api/company-admissions", { method: "POST", headers: { "content-type": "application/json", accept: "application/json" }, body: JSON.stringify({ query: value.trim() }) });
  const payload = await response.json();
  return { status: payload.status || "error", message: payload.message || payload.error || "The company request could not be recorded.", request: payload.request };
}
const macroNow = [
  { name: "Lunar eclipse in Aquarius", date: "Applying \xB7 exact 28 Aug", tone: "watch", meaning: "Turning-point and volatility intensity are elevated; natal contacts decide continuation, reversal or rotation." },
  { name: "Solar eclipse in Cancer", date: "Separating \xB7 through 11 Sep", tone: "watch", meaning: "The reset field remains active, but its immediate authority is gradually waning." },
  { name: "Saturn\u2013Venus opposition", date: "Active \xB7 through 25 Aug", tone: "pressure", meaning: "Restraint around liquidity, valuation and confidence can produce delay, compression or selectivity." },
  { name: "Jupiter\u2013Venus sextile", date: "Active \xB7 through 22 Aug", tone: "expansion", meaning: "Supports rerating and preference for quality where the stock\u2019s natal Venus or Jupiter is receptive." }
];
const macroNext = [
  { name: "Mercury\u2013Rahu opposition", date: "25 Aug \xB7 in 4.8 days", tone: "pressure", day: "25", month: "AUG", meaning: "Narrative heat rises; headlines, messaging and expectations can become reactive or produce false signals." },
  { name: "Lunar eclipse in Aquarius", date: "28 Aug \xB7 in 7.7 days", tone: "watch", day: "28", month: "AUG", meaning: "A turning-point field increases volatility; each stock\u2019s natal contacts decide the direction of expression." },
  { name: "Mars\u2013Saturn square", date: "1 Sep \xB7 in 11.9 days", tone: "pressure", day: "01", month: "SEP", meaning: "Force meets restraint, favouring friction, delay or disciplined execution depending on natal response." }
];
const toneLabel = { break: "Break-Risk", pressure: "Pressure", "forming-pressure": "Pressure forming", contested: "Contested", "forming-expansion": "Expansion forming", expansion: "Expansion", durable: "Durable expansion" };
function ScorePair({ e, p }) {
  return /* @__PURE__ */ jsxs("div", { className: "score-pair", "aria-label": `Expansion ${e} out of 100; pressure ${p} out of 100`, children: [
    /* @__PURE__ */ jsxs("span", { className: "e-score", children: [
      "E ",
      e
    ] }),
    /* @__PURE__ */ jsxs("span", { className: "p-score", children: [
      "P ",
      p
    ] })
  ] });
}
function TonePill({ tone, children }) {
  return /* @__PURE__ */ jsxs("span", { className: `tone tone-${tone}`, children: [
    /* @__PURE__ */ jsx("i", {}),
    children || toneLabel[tone]
  ] });
}
function StockCell({ s }) {
  return /* @__PURE__ */ jsxs("div", { className: "stock-cell", children: [
    /* @__PURE__ */ jsx("span", { className: "stock-avatar", children: s.ticker.slice(0, 2) }),
    /* @__PURE__ */ jsxs("span", { children: [
      /* @__PURE__ */ jsx("b", { children: s.name }),
      /* @__PURE__ */ jsxs("small", { children: [
        s.ticker,
        ".NS"
      ] })
    ] })
  ] });
}
function Path({ items }) {
  return /* @__PURE__ */ jsx("div", { className: "path", children: items.map((item, i) => /* @__PURE__ */ jsxs("span", { children: [
    /* @__PURE__ */ jsx("i", { className: i === 0 ? "now" : "" }),
    item
  ] }, item)) });
}
function RowButton({ s, onSelect, children }) {
  return /* @__PURE__ */ jsx("tr", { onClick: () => onSelect(s), tabIndex: 0, onKeyDown: (e) => {
    if (e.key === "Enter") onSelect(s);
  }, children });
}
function Dashboard() {
  const [view, setView] = useState("combined");
  const [defaultView, setDefaultView] = useState("combined");
  const [sort, setSort] = useState("score");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [fullStock, setFullStock] = useState(null);
  const [allStocks, setAllStocks] = useState(starterStocks);
  const [watchlist, setWatchlist] = useState(starterStocks.map((s) => s.ticker));
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void (async () => {
        const saved = window.localStorage.getItem("finlumen-default-view");
        if (saved && ["combined", "positional", "investor"].includes(saved)) {
          setView(saved);
          setDefaultView(saved);
        }
        let savedTickers = starterStocks.map((s) => s.ticker);
        const savedWatchlist = window.localStorage.getItem("finlumen-watchlist");
        if (savedWatchlist) {
          try {
            const parsed = JSON.parse(savedWatchlist);
            if (Array.isArray(parsed)) savedTickers = parsed.filter((ticker) => typeof ticker === "string").slice(0, 100);
          } catch {
          }
        }
        let cachedEntries = [];
        try {
          cachedEntries = await readCachedReadings();
        } catch {
        }
        const cached = cachedEntries.map((entry) => ({ ...entry.reading, cacheState: "browser" }));
        const merged = [...starterStocks, ...cached].reduce((rows, item) => [...rows.filter((row) => row.ticker !== item.ticker), item], []);
        setAllStocks(merged);
        setWatchlist(savedTickers);
        const params = new URLSearchParams(window.location.search);
        if (params.get("view") === "card") {
          const ticker = cleanTicker(params.get("stock") || "");
          setFullStock(merged.find((s) => s.ticker === ticker) || null);
        }
        const stale = cachedEntries.filter((entry) => savedTickers.includes(entry.ticker) && entry.skyDate !== PUBLICATION_SKY_DATE);
        for (const entry of stale) {
          try {
            const { response, payload } = await fetchApprovedReading(entry.ticker);
            if (!response.ok) continue;
            const refreshed = adaptEngineReading(payload);
            if (!refreshed) continue;
            await cacheReading({ ticker: refreshed.ticker, skyDate: refreshed.skyDate || PUBLICATION_SKY_DATE, engineVersion: refreshed.engineVersion || "v37.9.14", natalFingerprint: refreshed.natalFingerprint || refreshed.ticker, cachedAt: (/* @__PURE__ */ new Date()).toISOString(), reading: refreshed });
            setAllStocks((current) => [...current.filter((item) => item.ticker !== refreshed.ticker), refreshed]);
          } catch {
          }
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);
  const visible = useMemo(() => allStocks.filter((s) => watchlist.includes(s.ticker)).filter((s) => `${s.name} ${s.ticker}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === "score" ? b.score - a.score : sort === "expansion" ? b.e - a.e : sort === "pressure" ? b.p - a.p : sort === "confidence" ? b.confidence - a.confidence : a.name.localeCompare(b.name)), [allStocks, watchlist, query, sort]);
  const makeDefault = () => {
    window.localStorage.setItem("finlumen-default-view", view);
    setDefaultView(view);
  };
  const saveWatchlist = (next) => {
    setWatchlist(next);
    window.localStorage.setItem("finlumen-watchlist", JSON.stringify(next));
  };
  const addTicker = (ticker) => {
    if (watchlist.includes(ticker)) return;
    if (watchlist.length >= 100) throw new Error("Your 100-stock table is full.");
    saveWatchlist([...watchlist, ticker]);
  };
  const removeTicker = (ticker) => saveWatchlist(watchlist.filter((item) => item !== ticker));
  const requestAdd = async (value) => {
    const ticker = cleanTicker(value);
    if (!ticker) return { status: "invalid", message: "Enter a valid company name or exchange ticker." };
    const existing = allStocks.find((stock2) => stock2.ticker === ticker || stock2.name.toUpperCase() === value.trim().toUpperCase());
    if (existing) {
      addTicker(existing.ticker);
      return { status: "added", stock: existing, message: `${existing.name} was added from its cached approved reading.` };
    }
    const { response, payload } = await fetchApprovedReading(value);
    if (!response.ok) {
      if (payload.status === "natal-unavailable" || payload.status === "unavailable") return requestCompanyAdmission(value);
      return { status: payload.status || "unavailable", message: payload.reason || payload.error || "No approved natal reading is available." };
    }
    const stock = adaptEngineReading(payload);
    if (!stock) return { status: "unavailable", message: "The engine response did not contain an approved subscriber reading." };
    await cacheReading({ ticker: stock.ticker, skyDate: stock.skyDate || "unknown", engineVersion: stock.engineVersion || "v37.9.14", natalFingerprint: stock.natalFingerprint || stock.ticker, cachedAt: (/* @__PURE__ */ new Date()).toISOString(), reading: stock });
    setAllStocks((current) => [...current.filter((item) => item.ticker !== stock.ticker), stock]);
    addTicker(stock.ticker);
    return { status: "added", stock, message: `${stock.name} was calculated once and cached on this device.` };
  };
  if (fullStock) return /* @__PURE__ */ jsx(FullStockPage, { stock: fullStock });
  return /* @__PURE__ */ jsxs("main", { children: [
    /* @__PURE__ */ jsxs("header", { className: "topbar", children: [
      /* @__PURE__ */ jsxs("a", { className: "brand", href: "#top", children: [
        /* @__PURE__ */ jsx("span", { className: "brand-mark", children: "FL" }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("strong", { children: "FIN\u2013LUMEN" }),
          /* @__PURE__ */ jsx("small", { children: "PURE ASTRO RESEARCH" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "header-right", children: [
        /* @__PURE__ */ jsxs("span", { className: "asof", children: [
          /* @__PURE__ */ jsx("b", { children: "Sky date" }),
          " 20 Aug 2026 \xB7 IST"
        ] }),
        /* @__PURE__ */ jsx("a", { className: "icon-button", href: "https://fin-lumen-subscriber.twoopod.chatgpt.site/owner-review", "aria-label": "Owner review", children: "T" })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "shell", id: "top", children: [
      /* @__PURE__ */ jsxs("section", { className: "welcome", children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("span", { className: "eyebrow", children: [
            "Subscriber dashboard ",
            /* @__PURE__ */ jsx("i", { className: "private-beta", children: "Private beta" })
          ] }),
          /* @__PURE__ */ jsxs("h1", { children: [
            "Financial astrology,",
            /* @__PURE__ */ jsx("br", {}),
            /* @__PURE__ */ jsx("em", { children: "clearly mapped." })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "A structured view of market conditions and company-specific astrological cycles." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "watch-count", children: [
          /* @__PURE__ */ jsx("span", { children: "MY STOCKS" }),
          /* @__PURE__ */ jsxs("strong", { children: [
            watchlist.length,
            " ",
            /* @__PURE__ */ jsx("small", { children: "/ 100" })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: () => setAddOpen(true), children: "\uFF0B Add stock" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "macro-grid", "aria-label": "Market astro environment", children: [
        /* @__PURE__ */ jsxs("article", { className: "macro-card macro-current macro-state-pressure", children: [
          /* @__PURE__ */ jsxs("div", { className: "card-kicker", children: [
            /* @__PURE__ */ jsx("span", { className: "live-dot" }),
            "ACTIVE NOW ",
            /* @__PURE__ */ jsx("span", { className: "panel-state pressure", children: "PRESSURE" }),
            /* @__PURE__ */ jsx("time", { children: "20 AUG 2026" })
          ] }),
          /* @__PURE__ */ jsxs("h2", { children: [
            "High pressure ",
            /* @__PURE__ */ jsx("span", { children: "\xB7 Turning-point field active" })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "High pressure is controlling immediate expression while the market is between a separating and an applying eclipse." }),
          /* @__PURE__ */ jsxs("div", { className: "macro-body", children: [
            /* @__PURE__ */ jsxs("div", { className: "macro-scores", children: [
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "PRESSURE" }),
                /* @__PURE__ */ jsx("b", { children: "39" }),
                /* @__PURE__ */ jsx("small", { children: "/100" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "EXPANSION" }),
                /* @__PURE__ */ jsx("b", { children: "12" }),
                /* @__PURE__ */ jsx("small", { children: "/100" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "TURNING POINT" }),
                /* @__PURE__ */ jsx("b", { children: "22" }),
                /* @__PURE__ */ jsx("small", { children: "/100" })
              ] }),
              /* @__PURE__ */ jsxs("div", { children: [
                /* @__PURE__ */ jsx("span", { children: "MOON" }),
                /* @__PURE__ */ jsx("b", { className: "word-score", children: "Scorpio" }),
                /* @__PURE__ */ jsx("small", { children: "Emotional" })
              ] })
            ] }),
            /* @__PURE__ */ jsx("div", { className: "event-list", children: macroNow.map((event) => /* @__PURE__ */ jsxs("div", { className: `event-row macro-event-${event.tone}`, children: [
              /* @__PURE__ */ jsx("span", { className: `event-icon ${event.tone}` }),
              /* @__PURE__ */ jsxs("span", { className: "event-copy", children: [
                /* @__PURE__ */ jsx("b", { children: event.name }),
                /* @__PURE__ */ jsx("small", { children: event.date }),
                /* @__PURE__ */ jsx("em", { children: event.meaning })
              ] }),
              /* @__PURE__ */ jsx("span", { className: `macro-tag ${event.tone}`, children: event.tone })
            ] }, event.name)) })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("article", { className: "macro-card macro-next macro-state-watch", children: [
          /* @__PURE__ */ jsxs("div", { className: "card-kicker", children: [
            "NEXT 30 DAYS ",
            /* @__PURE__ */ jsx("span", { className: "panel-state watch", children: "WATCH \xB7 PRESSURE DEVELOPING" }),
            /* @__PURE__ */ jsx("time", { children: "WHAT DEVELOPS NEXT" })
          ] }),
          /* @__PURE__ */ jsxs("h2", { children: [
            "Pressure sequence ",
            /* @__PURE__ */ jsx("span", { children: "\xB7 Turning-point field" })
          ] }),
          /* @__PURE__ */ jsx("p", { children: "The next sequence intensifies narrative heat and restraint before the eclipse field begins to separate." }),
          /* @__PURE__ */ jsx("div", { className: "next-events", children: macroNext.map((event) => /* @__PURE__ */ jsxs("div", { className: `next-row macro-event-${event.tone}`, children: [
            /* @__PURE__ */ jsxs("span", { className: `date-box ${event.tone}`, children: [
              event.day,
              /* @__PURE__ */ jsx("small", { children: event.month })
            ] }),
            /* @__PURE__ */ jsxs("span", { className: "event-copy", children: [
              /* @__PURE__ */ jsx("b", { children: event.name }),
              /* @__PURE__ */ jsx("small", { children: event.date }),
              /* @__PURE__ */ jsx("em", { children: event.meaning })
            ] }),
            /* @__PURE__ */ jsx("span", { className: `macro-tag ${event.tone}`, children: event.tone })
          ] }, event.name)) })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "workspace", children: [
        /* @__PURE__ */ jsxs("div", { className: "workspace-head", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "My astro watchlist" }),
            /* @__PURE__ */ jsx("h2", { children: "Read the horizon that matters to you." })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "controls", children: [
            /* @__PURE__ */ jsxs("label", { className: "search", children: [
              /* @__PURE__ */ jsx("span", { children: "\u2315" }),
              /* @__PURE__ */ jsx("input", { value: query, onChange: (e) => setQuery(e.target.value), placeholder: "Find a stock", "aria-label": "Find a stock" })
            ] }),
            /* @__PURE__ */ jsxs("select", { value: sort, onChange: (e) => setSort(e.target.value), "aria-label": "Sort stocks", children: [
              /* @__PURE__ */ jsx("option", { value: "score", children: "Highest 24m potential" }),
              /* @__PURE__ */ jsx("option", { value: "expansion", children: "Highest expansion" }),
              /* @__PURE__ */ jsx("option", { value: "pressure", children: "Highest pressure" }),
              /* @__PURE__ */ jsx("option", { value: "confidence", children: "Highest confidence" }),
              /* @__PURE__ */ jsx("option", { value: "name", children: "Alphabetical" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "viewbar", children: [
          /* @__PURE__ */ jsx("div", { className: "view-tabs", role: "tablist", children: ["combined", "positional", "investor"].map((v) => /* @__PURE__ */ jsx("button", { role: "tab", "aria-selected": view === v, className: view === v ? "active" : "", onClick: () => setView(v), children: v === "combined" ? "Combined overview" : v === "positional" ? "Positional \xB7 45 days" : "Investor \xB7 24 months" }, v)) }),
          /* @__PURE__ */ jsx("button", { className: `default-button ${defaultView === view ? "saved" : ""}`, onClick: makeDefault, children: defaultView === view ? "\u2713 Default view" : "Make this my default" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "table-wrap", children: [
          view === "combined" && /* @__PURE__ */ jsx(CombinedTable, { stocks: visible, onSelect: setSelected }),
          " ",
          view === "positional" && /* @__PURE__ */ jsx(PositionalTable, { stocks: visible, onSelect: setSelected }),
          " ",
          view === "investor" && /* @__PURE__ */ jsx(InvestorTable, { stocks: visible, onSelect: setSelected })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "table-foot", children: [
          /* @__PURE__ */ jsxs("span", { children: [
            "Showing ",
            visible.length,
            " of ",
            watchlist.length,
            " cached readings"
          ] }),
          /* @__PURE__ */ jsx("span", { children: "Cache-first \xB7 one approved calculation per company and sky date \xB7 v37.9.14 unchanged" }),
          /* @__PURE__ */ jsx("span", { children: "Scores describe astrological structure and intensity; they are not financial forecasts." })
        ] }),
        /* @__PURE__ */ jsxs("nav", { className: "below-table-tabs", "aria-label": "Table resources", children: [
          /* @__PURE__ */ jsx("a", { href: "#replay", children: "\u21BA Historical Replay" }),
          /* @__PURE__ */ jsx("a", { href: "#reading-guide", children: "? Reading guide" })
        ] })
      ] }),
      /* @__PURE__ */ jsx(ReplaySection, { stocks: allStocks.filter((stock) => watchlist.includes(stock.ticker)) }),
      /* @__PURE__ */ jsx(AdmissionQueue, {}),
      /* @__PURE__ */ jsx(ReadingGuide, {}),
      /* @__PURE__ */ jsxs("footer", { className: "disclaimer", children: [
        /* @__PURE__ */ jsx("b", { children: "Important:" }),
        " Fin-Lumen presents astrological research derived from a fixed methodology. It does not provide personalised investment advice, technical analysis, financial forecasts or guaranteed outcomes. Scores compare astrological structure and intensity within the model; they are not probabilities. Subscribers should use independent financial judgement and professional advice where appropriate."
      ] })
    ] }),
    selected && /* @__PURE__ */ jsx(StockDrawer, { stock: selected, onClose: () => setSelected(null), onRemove: () => {
      removeTicker(selected.ticker);
      setSelected(null);
    } }),
    addOpen && /* @__PURE__ */ jsx(AddStockModal, { stocks: allStocks, watchlist, onRequestAdd: requestAdd, onClose: () => setAddOpen(false) })
  ] });
}
function CombinedTable({ stocks, onSelect }) {
  return /* @__PURE__ */ jsxs("table", { children: [
    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("th", { children: "Stock" }),
      /* @__PURE__ */ jsx("th", { children: "Current reading" }),
      /* @__PURE__ */ jsx("th", { children: "E / P" }),
      /* @__PURE__ */ jsx("th", { children: "Phase & active window" }),
      /* @__PURE__ */ jsx("th", { children: "Near-term path" }),
      /* @__PURE__ */ jsx("th", { children: "24-month astro potential" }),
      /* @__PURE__ */ jsx("th", { children: "Score" }),
      /* @__PURE__ */ jsx("th", { children: "Principal risk" }),
      /* @__PURE__ */ jsx("th", { children: "Chart confidence" })
    ] }) }),
    /* @__PURE__ */ jsx("tbody", { children: stocks.map((s) => /* @__PURE__ */ jsxs(RowButton, { s, onSelect, children: [
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StockCell, { s }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(TonePill, { tone: s.tone, children: s.reading }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(ScorePair, { e: s.e, p: s.p }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsx("b", { children: s.phase }),
        /* @__PURE__ */ jsx("small", { children: s.window })
      ] }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Path, { items: s.nearPath }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsx("b", { children: s.potential }),
        /* @__PURE__ */ jsxs("small", { children: [
          s.episodes,
          " productive episode",
          s.episodes === 1 ? "" : "s"
        ] })
      ] }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("span", { className: `potential-score ${s.score >= 85 ? "high" : s.score >= 75 ? "good" : "moderate"}`, children: [
        s.score,
        /* @__PURE__ */ jsx("small", { children: "/100" })
      ] }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.pressure }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsx("b", { children: s.chart }),
        /* @__PURE__ */ jsxs("small", { children: [
          s.confidence,
          "/100 reliability"
        ] })
      ] })
    ] }, s.ticker)) })
  ] });
}
function PositionalTable({ stocks, onSelect }) {
  return /* @__PURE__ */ jsxs("table", { children: [
    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("th", { children: "Stock" }),
      /* @__PURE__ */ jsx("th", { children: "Current reading" }),
      /* @__PURE__ */ jsx("th", { children: "E / P" }),
      /* @__PURE__ */ jsx("th", { children: "Phase maturity" }),
      /* @__PURE__ */ jsx("th", { children: "Current window" }),
      /* @__PURE__ */ jsx("th", { children: "Ordered 45-day path" }),
      /* @__PURE__ */ jsx("th", { children: "Next material turning point" }),
      /* @__PURE__ */ jsx("th", { children: "Pressure character" }),
      /* @__PURE__ */ jsx("th", { children: "Confidence" })
    ] }) }),
    /* @__PURE__ */ jsx("tbody", { children: stocks.map((s) => /* @__PURE__ */ jsxs(RowButton, { s, onSelect, children: [
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StockCell, { s }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(TonePill, { tone: s.tone, children: s.reading }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(ScorePair, { e: s.e, p: s.p }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.phase }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.window }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(Path, { items: s.nearPath }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.nextInflection }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.pressure }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsxs("span", { className: "confidence-score", children: [
          s.confidence,
          /* @__PURE__ */ jsx("small", { children: "/100" })
        ] }),
        /* @__PURE__ */ jsx("small", { children: s.chart })
      ] })
    ] }, s.ticker)) })
  ] });
}
function InvestorTable({ stocks, onSelect }) {
  return /* @__PURE__ */ jsxs("table", { children: [
    /* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
      /* @__PURE__ */ jsx("th", { children: "Stock" }),
      /* @__PURE__ */ jsx("th", { children: "Current cycle position" }),
      /* @__PURE__ */ jsx("th", { children: "24-month astro potential" }),
      /* @__PURE__ */ jsx("th", { children: "Score" }),
      /* @__PURE__ */ jsx("th", { children: "Expansion episodes" }),
      /* @__PURE__ */ jsx("th", { children: "Forward leadership" }),
      /* @__PURE__ */ jsx("th", { children: "Major interruption" }),
      /* @__PURE__ */ jsx("th", { children: "Next renewal" }),
      /* @__PURE__ */ jsx("th", { children: "Chart confidence" })
    ] }) }),
    /* @__PURE__ */ jsx("tbody", { children: stocks.map((s) => /* @__PURE__ */ jsxs(RowButton, { s, onSelect, children: [
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx(StockCell, { s }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsx(TonePill, { tone: s.tone, children: s.phase }),
        /* @__PURE__ */ jsx("small", { children: s.reading })
      ] }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.potential }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("span", { className: `potential-score ${s.score >= 85 ? "high" : s.score >= 75 ? "good" : "moderate"}`, children: [
        s.score,
        /* @__PURE__ */ jsx("small", { children: "/100" })
      ] }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsx("b", { children: s.episodes }),
        /* @__PURE__ */ jsx("small", { children: "productive phases" })
      ] }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("span", { className: "confidence-score", children: [
        s.forward,
        /* @__PURE__ */ jsx("small", { children: "/100" })
      ] }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.interruption }) }),
      /* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("b", { children: s.renewal }) }),
      /* @__PURE__ */ jsxs("td", { children: [
        /* @__PURE__ */ jsx("b", { children: s.chart }),
        /* @__PURE__ */ jsxs("small", { children: [
          s.confidence,
          "/100 reliability"
        ] })
      ] })
    ] }, s.ticker)) })
  ] });
}
function readingMeaning(s) {
  if (s.tone === "pressure" || s.tone === "break") return "Restraining conditions currently have more authority. This can delay, compress or distort expression; it does not automatically mean a price decline.";
  if (s.tone === "forming-pressure") return "Support remains present, but pressure is developing. Treat this as an early-warning phase rather than established pressure.";
  if (s.tone === "durable") return "A mature supportive structure is governing now and has shown resilience through ordinary pressure.";
  if (s.tone === "expansion" || s.tone === "forming-expansion") return "Supportive conditions have more authority than pressure and are strengthening, although the path can still contain pauses.";
  return "Support and pressure are closely balanced, so the next dated change carries more interpretive weight.";
}
function showValue(value) {
  if (value === null || value === void 0 || value === "") return "\u2014";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.map(showValue).join(" \xB7 ") || "\u2014";
  return JSON.stringify(value) || String(value);
}
function ResearchEvidence({ payload }) {
  const summary = payload.replaySummary || {};
  const company = payload.resolvedCompany || {};
  const natal = payload.natalReliability || {};
  const macro = payload.macroSnapshot || {};
  const contacts = summary.topContacts || [];
  const model = payload.astroModel;
  return /* @__PURE__ */ jsxs("div", { className: "engine-research-body", children: [
    /* @__PURE__ */ jsxs("div", { className: "research-status", children: [
      /* @__PURE__ */ jsx("span", { className: "live-dot" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: "Fin-Lumen Personal Research 1.0 \xB7 v37.9.14" }),
        /* @__PURE__ */ jsxs("small", { children: [
          "Historical sky ",
          payload.input?.date || showValue(macro.date),
          " \xB7 Lahiri sidereal \xB7 Swiss Ephemeris"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "research-score-grid", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("small", { children: "MODEL EXPANSION" }),
        /* @__PURE__ */ jsxs("b", { children: [
          showValue(summary.expansionScore ?? model?.scores?.expansion),
          /* @__PURE__ */ jsx("i", { children: "/100" })
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Raw ",
          showValue(summary.rawExpansionScore)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("small", { children: "MODEL PRESSURE" }),
        /* @__PURE__ */ jsxs("b", { children: [
          showValue(summary.pressureScore ?? model?.scores?.pressure),
          /* @__PURE__ */ jsx("i", { children: "/100" })
        ] }),
        /* @__PURE__ */ jsxs("span", { children: [
          "Raw ",
          showValue(summary.rawPressureScore)
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("small", { children: "LEADERSHIP" }),
        /* @__PURE__ */ jsxs("b", { children: [
          showValue(summary.leadershipProbability ?? model?.scores?.forwardLeadership),
          /* @__PURE__ */ jsx("i", { children: "/100" })
        ] }),
        /* @__PURE__ */ jsx("span", { children: showValue(summary.regime) })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("small", { children: "EXPRESSION" }),
        /* @__PURE__ */ jsx("strong", { children: showValue(summary.expression || model?.current?.state) }),
        /* @__PURE__ */ jsx("span", { children: showValue(summary.confidence) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "research-sections", children: [
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Natal authority" }),
        /* @__PURE__ */ jsxs("dl", { children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Company" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(company.companyName) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Selected chart" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(payload.natalResearch?.selectedChartId || payload.input?.chartId) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Chart type" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(natal.chartType || company.chartType) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Date and time" }),
            /* @__PURE__ */ jsxs("dd", { children: [
              showValue(natal.birthDate || company.birthDate),
              " \xB7 ",
              showValue(natal.birthTime || company.birthTime)
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Place" }),
            /* @__PURE__ */ jsxs("dd", { children: [
              showValue(natal.city || company.city),
              ", ",
              showValue(company.country)
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Timezone" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(natal.timezone || company.timezone) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Source" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(company.natalSource) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Validation" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(payload.natalResearch?.validationEligibility) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Macro sky" }),
        /* @__PURE__ */ jsxs("dl", { children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Environment" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.environmentLabel || macro.environment) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Dominant force" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.dominantForce) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Pressure / Expansion" }),
            /* @__PURE__ */ jsxs("dd", { children: [
              showValue(macro.pressure),
              " / ",
              showValue(macro.expansion)
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Volatility" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.volatility) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Moon" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.moon) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Headline" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.headline) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Main support" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.mainOpportunity) })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("dt", { children: "Main risk" }),
            /* @__PURE__ */ jsx("dd", { children: showValue(macro.mainRisk) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { className: "contacts-section", children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Strongest transit-to-natal contacts" }),
        contacts.length ? /* @__PURE__ */ jsx("ol", { children: contacts.map((contact, index) => /* @__PURE__ */ jsxs("li", { children: [
          /* @__PURE__ */ jsx("b", { children: contact.text || `${showValue(contact.planet)} ${showValue(contact.aspect)} natal ${showValue(contact.targetPlanet)}` }),
          /* @__PURE__ */ jsxs("span", { children: [
            "Orb ",
            showValue(contact.orb),
            "\xB0 \xB7 score ",
            showValue(contact.score)
          ] })
        ] }, `${contact.planet}-${contact.targetPlanet}-${index}`)) }) : /* @__PURE__ */ jsx("p", { children: "No ranked contact ledger was returned for this sky date." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("details", { className: "research-ledger", children: [
      /* @__PURE__ */ jsxs("summary", { children: [
        "Temporal paths, windows and cycle ledger ",
        /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
      ] }),
      /* @__PURE__ */ jsx("pre", { children: JSON.stringify({ current: model?.current, scores: model?.scores, paths: model?.paths, windows: model?.windows, cycle: model?.cycle, forwardPath: summary.forwardPath, chartValidation: summary.chartValidation }, null, 2) })
    ] }),
    /* @__PURE__ */ jsxs("details", { className: "research-ledger", children: [
      /* @__PURE__ */ jsxs("summary", { children: [
        "Natal candidates and reliability record ",
        /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
      ] }),
      /* @__PURE__ */ jsx("pre", { children: JSON.stringify({ resolvedCompany: payload.resolvedCompany, natalReliability: payload.natalReliability, natalResearch: payload.natalResearch }, null, 2) })
    ] }),
    /* @__PURE__ */ jsxs("details", { className: "research-ledger", children: [
      /* @__PURE__ */ jsxs("summary", { children: [
        "Macro, sector and receptor-fit ledger ",
        /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
      ] }),
      /* @__PURE__ */ jsx("pre", { children: JSON.stringify({ macroSnapshot: payload.macroSnapshot, sectorContext: payload.sectorContext, transitReceptorFit: payload.transitReceptorFit }, null, 2) })
    ] }),
    /* @__PURE__ */ jsxs("details", { className: "research-ledger", children: [
      /* @__PURE__ */ jsxs("summary", { children: [
        "Complete v37.9.14 research payload ",
        /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
      ] }),
      /* @__PURE__ */ jsx("p", { children: "Full natal positions, historical transits, eclipses, contacts, window scan and model output returned by the authoritative engine." }),
      /* @__PURE__ */ jsx("pre", { children: JSON.stringify(payload, null, 2) })
    ] })
  ] });
}
function EngineResearchView({ ticker, date = PUBLICATION_SKY_DATE }) {
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const load = async () => {
    if (payload || loading) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchHistoricalReplay(ticker, date);
      if (!result.response.ok || !result.payload.success) throw new Error(result.payload.error || "The full research record could not be loaded.");
      setPayload(result.payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The full research record could not be loaded.");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("details", { className: "engine-research", onToggle: (event) => {
    if (event.currentTarget.open) void load();
  }, children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsx("small", { children: "RESEARCH VIEW \xB7 v37.9.14" }),
        /* @__PURE__ */ jsx("b", { children: "Open the complete astrology and evidence ledger" })
      ] }),
      /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
    ] }),
    loading && /* @__PURE__ */ jsx("p", { className: "research-loading", children: "Calculating the selected sky and loading the full research record\u2026" }),
    error && /* @__PURE__ */ jsxs("div", { className: "research-error", children: [
      /* @__PURE__ */ jsx("b", { children: "Research record unavailable" }),
      /* @__PURE__ */ jsx("p", { children: error }),
      /* @__PURE__ */ jsx("button", { onClick: () => {
        setError("");
        void load();
      }, children: "Try again" })
    ] }),
    payload && /* @__PURE__ */ jsx(ResearchEvidence, { payload })
  ] });
}
function StockReading({ s, deep = false }) {
  return /* @__PURE__ */ jsxs("div", { className: "stock-reading", children: [
    /* @__PURE__ */ jsxs("section", { className: "reading-lead", children: [
      /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Current reading" }),
      /* @__PURE__ */ jsx(TonePill, { tone: s.tone, children: s.reading }),
      /* @__PURE__ */ jsx("h2", { children: s.story }),
      /* @__PURE__ */ jsxs("p", { className: "phase-meaning", children: [
        /* @__PURE__ */ jsx("b", { children: "What this means:" }),
        " ",
        readingMeaning(s)
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "drawer-stats", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { children: "EXPANSION" }),
        /* @__PURE__ */ jsxs("b", { children: [
          s.e,
          /* @__PURE__ */ jsx("small", { children: "/100" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { children: "PRESSURE" }),
        /* @__PURE__ */ jsxs("b", { children: [
          s.p,
          /* @__PURE__ */ jsx("small", { children: "/100" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { children: "ACTIVE WINDOW" }),
        /* @__PURE__ */ jsx("b", { className: "text-stat", children: s.window })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { children: "24M ASTRO POTENTIAL" }),
        /* @__PURE__ */ jsxs("b", { children: [
          s.score,
          /* @__PURE__ */ jsx("small", { children: "/100" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "quick-grid", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Near-term path" }),
        /* @__PURE__ */ jsx(Path, { items: s.nearPath })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Long-cycle structure" }),
        /* @__PURE__ */ jsx("h3", { children: s.potential }),
        /* @__PURE__ */ jsxs("p", { children: [
          s.episodes,
          " productive expansion episode",
          s.episodes === 1 ? "" : "s",
          " in the measured runway."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Principal risk" }),
        /* @__PURE__ */ jsx("h3", { children: s.interruption }),
        /* @__PURE__ */ jsx("p", { children: s.pressure })
      ] }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Chart confidence" }),
        /* @__PURE__ */ jsxs("h3", { children: [
          s.confidence,
          "/100"
        ] }),
        /* @__PURE__ */ jsx("p", { children: s.chart })
      ] })
    ] }),
    deep && /* @__PURE__ */ jsxs("div", { className: "deep-reading", children: [
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-title", children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Positional \xB7 45 days" }),
          /* @__PURE__ */ jsx("h3", { children: "The ordered near-term sequence" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "research-grid", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "PHASE MATURITY" }),
            /* @__PURE__ */ jsx("b", { children: s.phase })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "CURRENT WINDOW" }),
            /* @__PURE__ */ jsx("b", { children: s.window })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "NEXT TURNING POINT" }),
            /* @__PURE__ */ jsx("b", { children: s.nextInflection })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "PRESSURE CHARACTER" }),
            /* @__PURE__ */ jsx("b", { children: s.pressure })
          ] })
        ] }),
        /* @__PURE__ */ jsx(Path, { items: s.nearPath })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-title", children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Investor \xB7 24 months" }),
          /* @__PURE__ */ jsx("h3", { children: s.potential })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "research-grid", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "ASTRO POTENTIAL" }),
            /* @__PURE__ */ jsxs("b", { children: [
              s.score,
              "/100"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "EXPANSION EPISODES" }),
            /* @__PURE__ */ jsx("b", { children: s.episodes })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "FORWARD LEADERSHIP" }),
            /* @__PURE__ */ jsxs("b", { children: [
              s.forward,
              "/100"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "PRINCIPAL INTERRUPTION" }),
            /* @__PURE__ */ jsx("b", { children: s.interruption })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "renewal", children: [
          /* @__PURE__ */ jsx("b", { children: "Next renewal:" }),
          " ",
          s.renewal
        ] })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-title", children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Why this reading" }),
          /* @__PURE__ */ jsx("h3", { children: "Astro engine interpretation" })
        ] }),
        /* @__PURE__ */ jsx("p", { children: s.story }),
        /* @__PURE__ */ jsx("p", { children: "Expansion and pressure are measured independently; the governing phase reflects their authority, maturity and ordered sequence rather than a simple subtraction of one score from the other." })
      ] }),
      /* @__PURE__ */ jsxs("section", { children: [
        /* @__PURE__ */ jsxs("div", { className: "section-title", children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Chart basis" }),
          /* @__PURE__ */ jsx("h3", { children: s.chart })
        ] }),
        /* @__PURE__ */ jsxs("p", { children: [
          /* @__PURE__ */ jsxs("b", { children: [
            s.confidence,
            "/100 chart reliability."
          ] }),
          " This measures confidence in the approved natal basis\u2014not confidence that a market outcome must occur."
        ] })
      ] }),
      /* @__PURE__ */ jsxs("details", { className: "astro-basis", children: [
        /* @__PURE__ */ jsxs("summary", { children: [
          /* @__PURE__ */ jsxs("span", { children: [
            /* @__PURE__ */ jsx("small", { children: "ASTROLOGICAL BASIS" }),
            /* @__PURE__ */ jsx("b", { children: "See how this reading was formed" })
          ] }),
          /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "basis-grid", children: [
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "NATAL AUTHORITY" }),
            /* @__PURE__ */ jsx("b", { children: s.chart }),
            /* @__PURE__ */ jsxs("p", { children: [
              s.confidence,
              "/100 reliability for the approved company-event chart."
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "CURRENT SKY BALANCE" }),
            /* @__PURE__ */ jsxs("b", { children: [
              "Expansion ",
              s.e,
              " \xB7 Pressure ",
              s.p
            ] }),
            /* @__PURE__ */ jsx("p", { children: "The scores are independent intensities; the reading is not produced by simply subtracting one from the other." })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "TEMPORAL EVIDENCE" }),
            /* @__PURE__ */ jsx("b", { children: s.phase }),
            /* @__PURE__ */ jsx("p", { children: s.nearPath.join(" \u2192 ") })
          ] }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsx("small", { children: "INTERPRETIVE RULE" }),
            /* @__PURE__ */ jsx("b", { children: "Authority, maturity and sequence" }),
            /* @__PURE__ */ jsx("p", { children: "The Astro engine resolves which force governs now, what is forming next and whether the longer structure survives interruption." })
          ] })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "basis-note", children: "This summary contains the approved publication evidence. Open Research View below for the complete v37.9.14 natal, transit, eclipse, window and scoring ledger." })
      ] }),
      /* @__PURE__ */ jsx(EngineResearchView, { ticker: s.ticker, date: s.skyDate || PUBLICATION_SKY_DATE })
    ] })
  ] });
}
function StockDrawer({ stock: s, onClose, onRemove }) {
  const [expanded, setExpanded] = useState(false);
  const url = `/?stock=${s.ticker}&view=card`;
  return /* @__PURE__ */ jsx("div", { className: "drawer-backdrop", onMouseDown: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("aside", { className: `drawer ${expanded ? "drawer-expanded" : ""}`, role: "dialog", "aria-modal": "true", "aria-label": `${s.name} stock reading`, children: [
    /* @__PURE__ */ jsxs("div", { className: "drawer-toolbar", children: [
      /* @__PURE__ */ jsx(StockCell, { s }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("button", { onClick: () => setExpanded((v) => !v), "aria-pressed": expanded, children: expanded ? "\u2199 Summary" : "\u2197 Expand" }),
        /* @__PURE__ */ jsx("a", { href: url, target: "_blank", rel: "noreferrer", children: "Open in new tab" }),
        /* @__PURE__ */ jsx("button", { className: "remove-stock", onClick: onRemove, children: "Remove" }),
        /* @__PURE__ */ jsx("button", { className: "close", onClick: onClose, "aria-label": "Close stock reading", children: "\xD7" })
      ] })
    ] }),
    /* @__PURE__ */ jsx(StockReading, { s, deep: expanded }),
    /* @__PURE__ */ jsxs("a", { className: "drawer-replay", href: `/?replayStock=${s.ticker}#replay`, children: [
      "Replay ",
      s.ticker
    ] })
  ] }) });
}
function FullStockPage({ stock: s }) {
  return /* @__PURE__ */ jsxs("main", { className: "full-stock-page", children: [
    /* @__PURE__ */ jsxs("header", { className: "topbar", children: [
      /* @__PURE__ */ jsxs(Link, { className: "brand", href: "/", children: [
        /* @__PURE__ */ jsx("span", { className: "brand-mark", children: "FL" }),
        /* @__PURE__ */ jsxs("span", { children: [
          /* @__PURE__ */ jsx("strong", { children: "FIN\u2013LUMEN" }),
          /* @__PURE__ */ jsx("small", { children: "PURE ASTRO RESEARCH" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "header-right", children: /* @__PURE__ */ jsxs("span", { className: "asof", children: [
        /* @__PURE__ */ jsx("b", { children: "Sky date" }),
        " 20 Aug 2026 \xB7 IST"
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "full-stock-shell", children: [
      /* @__PURE__ */ jsxs("div", { className: "full-stock-nav", children: [
        /* @__PURE__ */ jsx(Link, { href: "/", children: "\u2190 Back to dashboard" }),
        /* @__PURE__ */ jsx("span", { children: "Full stock reading" })
      ] }),
      /* @__PURE__ */ jsxs("article", { className: "full-stock-card", children: [
        /* @__PURE__ */ jsxs("div", { className: "full-stock-head", children: [
          /* @__PURE__ */ jsx(StockCell, { s }),
          /* @__PURE__ */ jsx(TonePill, { tone: s.tone, children: s.reading })
        ] }),
        /* @__PURE__ */ jsx(StockReading, { s, deep: true }),
        /* @__PURE__ */ jsx(Link, { className: "full-replay-link", href: `/?replayStock=${s.ticker}#replay`, children: "Historical replay" })
      ] }),
      /* @__PURE__ */ jsxs("footer", { className: "disclaimer", children: [
        /* @__PURE__ */ jsx("b", { children: "Important:" }),
        " This is astrological research, not personalised investment advice or a financial forecast. Scores describe structure and intensity within Fin-Lumen\u2019s fixed methodology."
      ] })
    ] })
  ] });
}
function ReplaySection({ stocks }) {
  const [mode, setMode] = useState("sky");
  const [date, setDate] = useState("2025-08-15");
  const [ticker, setTicker] = useState(stocks[0]?.ticker || "");
  const [payload, setPayload] = useState(null);
  const [archiveStock, setArchiveStock] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const requested = new URLSearchParams(window.location.search).get("replayStock")?.replace(".NS", "").toUpperCase();
      if (requested && stocks.some((s) => s.ticker === requested)) setTicker(requested);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [stocks]);
  const company = stocks.find((s) => s.ticker === ticker);
  const clear = () => {
    setPayload(null);
    setArchiveStock(null);
    setError("");
  };
  const run = async () => {
    clear();
    if (!ticker || !date) return;
    setLoading(true);
    try {
      if (mode === "archive") {
        if (date !== PUBLICATION_SKY_DATE || !company) throw new Error("No sealed publication was stored for this company on that date. The private beta archive currently contains the 20 Aug 2026 publication batch.");
        setArchiveStock(company);
        return;
      }
      const result = await fetchHistoricalReplay(ticker, date);
      if (!result.response.ok || !result.payload.success) throw new Error(result.payload.error || "The historical sky could not be calculated.");
      setPayload(result.payload);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The historical sky could not be calculated.");
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("section", { className: "replay", id: "replay", children: [
    /* @__PURE__ */ jsxs("div", { className: "replay-copy", children: [
      /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Historical research" }),
      /* @__PURE__ */ jsx("h2", { children: "Replay Lab" }),
      /* @__PURE__ */ jsx("p", { children: "Run v37.9.14 under a past sky\u2014or retrieve an immutable reading from a stored publication batch." }),
      /* @__PURE__ */ jsxs("ul", { children: [
        /* @__PURE__ */ jsx("li", { children: "Historical transits are calculated for the selected date." }),
        /* @__PURE__ */ jsx("li", { children: "Present-day data cannot rewrite the result." }),
        /* @__PURE__ */ jsx("li", { children: "Price is not used by the astrology engine." })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "replay-panel", children: [
      /* @__PURE__ */ jsxs("div", { className: "replay-tabs", children: [
        /* @__PURE__ */ jsx("button", { className: mode === "sky" ? "active" : "", onClick: () => {
          setMode("sky");
          clear();
        }, children: "Historical Sky Replay" }),
        /* @__PURE__ */ jsx("button", { className: mode === "archive" ? "active" : "", onClick: () => {
          setMode("archive");
          setDate(PUBLICATION_SKY_DATE);
          clear();
        }, children: "Published Archive" })
      ] }),
      /* @__PURE__ */ jsx("p", { children: mode === "sky" ? "Recalculate v37.9.14 using only the selected historical sky and the approved natal chart." : "Open the exact cached reading from an available publication date." }),
      /* @__PURE__ */ jsxs("div", { className: "replay-controls", children: [
        /* @__PURE__ */ jsxs("label", { children: [
          /* @__PURE__ */ jsx("span", { children: "COMPANY" }),
          /* @__PURE__ */ jsx("select", { value: ticker, onChange: (e) => {
            setTicker(e.target.value);
            clear();
          }, children: stocks.map((s) => /* @__PURE__ */ jsx("option", { value: s.ticker, children: s.name }, s.ticker)) })
        ] }),
        /* @__PURE__ */ jsxs("label", { children: [
          /* @__PURE__ */ jsx("span", { children: mode === "sky" ? "REPLAY DATE" : "PUBLICATION DATE" }),
          /* @__PURE__ */ jsx("input", { type: "date", value: date, min: "2023-01-01", max: PUBLICATION_SKY_DATE, onChange: (e) => {
            setDate(e.target.value);
            clear();
          } })
        ] }),
        /* @__PURE__ */ jsx("button", { onClick: () => void run(), disabled: loading || !ticker || !date, children: loading ? "Calculating historical sky\u2026" : `View ${mode === "sky" ? "historical sky" : "published reading"}` })
      ] }),
      error && /* @__PURE__ */ jsxs("div", { className: "replay-error", children: [
        /* @__PURE__ */ jsx("b", { children: "Replay unavailable" }),
        /* @__PURE__ */ jsx("p", { children: error })
      ] }),
      archiveStock && /* @__PURE__ */ jsxs("div", { className: "replay-output", children: [
        /* @__PURE__ */ jsxs("div", { className: "replay-result", children: [
          /* @__PURE__ */ jsx("span", { className: "live-dot" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("b", { children: [
              archiveStock.name,
              " \xB7 Published Archive \xB7 20 Aug 2026"
            ] }),
            /* @__PURE__ */ jsx("small", { children: "Exact private-beta publication reading. It is retrieved rather than recalculated." })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: clear, children: "Close result" })
        ] }),
        /* @__PURE__ */ jsx(StockReading, { s: archiveStock })
      ] }),
      payload && /* @__PURE__ */ jsxs("div", { className: "replay-output", children: [
        /* @__PURE__ */ jsxs("div", { className: "replay-result", children: [
          /* @__PURE__ */ jsx("span", { className: "live-dot" }),
          /* @__PURE__ */ jsxs("div", { children: [
            /* @__PURE__ */ jsxs("b", { children: [
              company?.name,
              " \xB7 Historical Sky Replay \xB7 ",
              (/* @__PURE__ */ new Date(`${date}T12:00:00`)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
            ] }),
            /* @__PURE__ */ jsx("small", { children: "Calculated by v37.9.14 from the selected historical sky. No present-day market information was used." })
          ] }),
          /* @__PURE__ */ jsx("button", { onClick: clear, children: "Return to controls" })
        ] }),
        /* @__PURE__ */ jsx(ResearchEvidence, { payload })
      ] })
    ] })
  ] });
}
function ReadingGuide() {
  const phases = [
    ["Expansion", "Supportive astrological conditions have more authority than pressure. This can improve momentum, participation or opportunity, but it does not promise a price rise."],
    ["Rerating", "Expansion has become persistent or repeated enough to support a more meaningful change in how the stock expresses leadership. It is an astrological structure\u2014not a valuation or return forecast."],
    ["Rerating strengthening", "The rerating structure is gaining authority but has not yet reached its most established phase."],
    ["Rerating established", "The rerating structure is active and mature enough to govern the current reading, subject to any stated pressure or interruption."],
    ["Compressed rerating", "The rerating structure remains intact, but pressure is restricting its expression. Progress may be slower, selective or interrupted rather than absent."],
    ["Volatile expansion", "Support remains stronger than pressure, but volatile contacts can produce an uneven path, rapid reversals or exaggerated reactions."],
    ["Volatile rerating", "A meaningful rerating structure is active, but volatility can disrupt how cleanly it expresses. The supportive structure and the unstable path are both real."],
    ["Pressure", "Restraining conditions have authority. They can delay, compress or distort expression; pressure does not automatically mean that every stock must fall."],
    ["Pressure forming", "A pressure pattern is developing but has not yet taken control. It is an early-warning state, not the same as active pressure."],
    ["Peak pressure", "The pressure sequence is near its strongest measured phase. Relief afterward is possible, but recovery requires a later supportive structure."],
    ["Durable expansion", "Support repeats across the measured runway and remains resilient through ordinary pressure. It describes structural persistence, not guaranteed performance."],
    ["Break-Risk", "A specifically qualified destructive structural-pressure network. It is more serious than ordinary pressure and is never inferred merely from a long quiet period."]
  ];
  const terms = [
    ["E / P", "Expansion and Pressure intensity, each measured independently out of 100."],
    ["Current reading", "The governing astrological condition on the selected sky date."],
    ["Phase maturity", "Whether a condition is forming, strengthening, established, mature or exhausting."],
    ["Active window", "The date range during which the current governing condition remains authoritative."],
    ["Near-term path", "Up to three meaningful changes across the next 45 days; minor events are excluded."],
    ["24-month astro potential", "The measured runway for repeated expansion, leadership durability and survival through pressure."],
    ["Principal risk", "The strongest interruption that could override or delay the otherwise supportive structure."],
    ["Chart confidence", "Reliability of the approved natal basis\u2014not confidence that a market outcome must occur."],
    ["Turning point (inflection)", "A direction-neutral transition field: an existing trend may accelerate, stall, reverse or rotate. Each stock\u2019s natal contacts determine whether it expresses as support or pressure."],
    ["Watch", "A turning-point or volatility field whose direction is not predetermined and depends on each stock\u2019s natal response."]
  ];
  return /* @__PURE__ */ jsxs("details", { className: "reading-guide", id: "reading-guide", children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsx("b", { children: "Reading guide" }),
        /* @__PURE__ */ jsx("small", { children: "Plain-English phase definitions, colour meanings and methodology notes" })
      ] }),
      /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "guide-colours", children: [
      /* @__PURE__ */ jsx("span", { className: "macro-tag neutral", children: "neutral" }),
      /* @__PURE__ */ jsx("p", { children: "Balanced or no dominant force" }),
      /* @__PURE__ */ jsx("span", { className: "macro-tag expansion", children: "expansion" }),
      /* @__PURE__ */ jsx("p", { children: "Supportive or rerating-oriented" }),
      /* @__PURE__ */ jsx("span", { className: "macro-tag pressure", children: "pressure" }),
      /* @__PURE__ */ jsx("p", { children: "Compression, restraint or structural stress" }),
      /* @__PURE__ */ jsx("span", { className: "macro-tag watch", children: "watch" }),
      /* @__PURE__ */ jsx("p", { children: "Turning point or volatility; direction is not predetermined" })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "guide-section", children: [
      /* @__PURE__ */ jsxs("div", { className: "guide-heading", children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "How to read the phases" }),
        /* @__PURE__ */ jsx("h3", { children: "What Fin-Lumen\u2019s recurring terms mean" }),
        /* @__PURE__ */ jsx("p", { children: "Each phrase describes the balance and maturity of astrological structure. It does not predict a financial return." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "phase-grid", children: phases.map(([term, meaning]) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: term }),
        /* @__PURE__ */ jsx("p", { children: meaning })
      ] }, term)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { className: "guide-section guide-reference", children: [
      /* @__PURE__ */ jsxs("div", { className: "guide-heading", children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Table reference" }),
        /* @__PURE__ */ jsx("h3", { children: "Scores, windows and confidence" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "term-grid", children: terms.map(([term, meaning]) => /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: term }),
        /* @__PURE__ */ jsx("p", { children: meaning })
      ] }, term)) })
    ] })
  ] });
}
function AddStockModal({ stocks, watchlist, onRequestAdd, onClose }) {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const normalized = cleanTicker(query);
  const known = stocks.find((s) => s.ticker === normalized || s.name.toUpperCase() === query.trim().toUpperCase());
  const check = async () => {
    setChecked(true);
    setResult(null);
    if (known) return;
    setLoading(true);
    try {
      setResult(await onRequestAdd(query));
    } catch (error) {
      setResult({ status: "error", message: error instanceof Error ? error.message : "The company could not be added." });
    } finally {
      setLoading(false);
    }
  };
  const addKnown = async () => {
    if (!known) return;
    setLoading(true);
    try {
      setResult(await onRequestAdd(known.ticker));
    } catch (error) {
      setResult({ status: "error", message: error instanceof Error ? error.message : "The company could not be added." });
    } finally {
      setLoading(false);
    }
  };
  const reset = (value) => {
    setQuery(value);
    setChecked(false);
    setResult(null);
  };
  return /* @__PURE__ */ jsx("div", { className: "drawer-backdrop modal-backdrop", onMouseDown: (e) => {
    if (e.target === e.currentTarget) onClose();
  }, children: /* @__PURE__ */ jsxs("section", { className: "add-modal", role: "dialog", "aria-modal": "true", "aria-label": "Add a stock", children: [
    /* @__PURE__ */ jsx("button", { className: "close", onClick: onClose, children: "\xD7" }),
    /* @__PURE__ */ jsxs("span", { className: "eyebrow", children: [
      "Add to My Stocks \xB7 ",
      watchlist.length,
      "/100"
    ] }),
    /* @__PURE__ */ jsx("h2", { children: "Enter a company or ticker." }),
    /* @__PURE__ */ jsx("p", { children: "One check searches approved readings first. If none exists, Fin-Lumen automatically pulls the official exchange record and prepares its natal candidate for verification." }),
    /* @__PURE__ */ jsxs("div", { className: "add-search", children: [
      /* @__PURE__ */ jsx("input", { autoFocus: true, value: query, onChange: (e) => reset(e.target.value), onKeyDown: (e) => {
        if (e.key === "Enter") void check();
      }, placeholder: "For example: IRFC.NS or MARUTI.NS" }),
      /* @__PURE__ */ jsx("button", { onClick: () => void check(), disabled: !query.trim() || loading || watchlist.length >= 100, children: loading ? "Checking\u2026" : "Find company" })
    ] }),
    loading && /* @__PURE__ */ jsx("p", { className: "checking-note", children: "Searching approved readings and official exchange evidence. A new company may take a few seconds." }),
    !checked && /* @__PURE__ */ jsxs("div", { className: "suggestions", children: [
      /* @__PURE__ */ jsxs("span", { children: [
        ENGINE_SUPPORTED_SYMBOLS.length,
        " engine-supported symbols \xB7 try:"
      ] }),
      ["MARUTI", "ABB", "HINDUNILVR", "COCHINSHIP"].map((x) => /* @__PURE__ */ jsx("button", { onClick: () => reset(x), children: x }, x))
    ] }),
    checked && known && /* @__PURE__ */ jsxs("div", { className: "availability available", children: [
      /* @__PURE__ */ jsx("span", { children: "\u2713" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: "Approved reading available" }),
        /* @__PURE__ */ jsx("p", { children: watchlist.includes(known.ticker) ? `${known.name} is already in My Stocks.` : `${known.name} can be restored immediately from its cached reading.` }),
        /* @__PURE__ */ jsxs("small", { children: [
          known.chart,
          " \xB7 ",
          known.confidence,
          "/100 reliability",
          known.cacheState === "browser" ? " \xB7 browser cache" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsx("button", { disabled: watchlist.includes(known.ticker) || loading, onClick: () => void addKnown(), children: watchlist.includes(known.ticker) ? "Already added" : loading ? "Adding\u2026" : "Add company" })
    ] }),
    result?.status === "added" && !known && /* @__PURE__ */ jsxs("div", { className: "availability available", children: [
      /* @__PURE__ */ jsx("span", { children: "\u2713" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: "Added to My Stocks" }),
        /* @__PURE__ */ jsx("p", { children: result.message }),
        /* @__PURE__ */ jsx("small", { children: "Its approved reading is now available without recalculating the rest of the table." })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, children: "View table" })
    ] }),
    result && ["preparing-evidence", "candidate-ready", "owner-review"].includes(result.status) && /* @__PURE__ */ jsxs("div", { className: `availability ${result.status === "owner-review" ? "reviewing" : "preparing"}`, children: [
      /* @__PURE__ */ jsx("span", { children: result.status === "owner-review" ? "\u25C7" : result.status === "candidate-ready" ? "\u2713" : "\u25F7" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: result.status === "owner-review" ? "Owner verification required" : result.status === "candidate-ready" ? "Official listing candidate prepared" : "Company request recorded" }),
        /* @__PURE__ */ jsx("p", { children: result.message }),
        /* @__PURE__ */ jsx("small", { children: "No reading will appear until official evidence is checked and a natal basis is approved." })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: onClose, children: "Done" })
    ] }),
    result && !["added", "preparing-evidence", "candidate-ready", "owner-review"].includes(result.status) && /* @__PURE__ */ jsxs("div", { className: `availability ${result.status === "engine-unreachable" || result.status === "error" ? "preparing" : "unavailable"}`, children: [
      /* @__PURE__ */ jsx("span", { children: result.status === "engine-unreachable" ? "\u21BB" : "\u25CB" }),
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("b", { children: result.status === "engine-unreachable" ? "Astro engine temporarily unavailable" : result.status === "identity-needed" ? "Exact ticker needed" : "Official company record not found" }),
        /* @__PURE__ */ jsx("p", { children: result.message }),
        /* @__PURE__ */ jsx("small", { children: result.status === "identity-needed" ? "Use an exchange ticker so the legal company is not guessed." : "Nothing has been added to the approved universe." })
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => {
        setChecked(false);
        setResult(null);
      }, children: result.status === "identity-needed" ? "Enter ticker" : "Try again" })
    ] }),
    watchlist.length >= 100 && /* @__PURE__ */ jsx("p", { className: "capacity-note", children: "Your personal table has reached its 100-company limit. Remove one company before adding another." })
  ] }) });
}
function AdmissionQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const load = async () => {
    if (loaded || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/company-admissions", { headers: { accept: "application/json" } });
      const payload = await response.json();
      setRequests(payload.requests || []);
      setLoaded(true);
    } catch {
    } finally {
      setLoading(false);
    }
  };
  return /* @__PURE__ */ jsxs("details", { className: "admission-queue", onToggle: (event) => {
    if (event.currentTarget.open) void load();
  }, children: [
    /* @__PURE__ */ jsxs("summary", { children: [
      /* @__PURE__ */ jsxs("span", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Universe development" }),
        /* @__PURE__ */ jsx("b", { children: "New company admission queue" }),
        /* @__PURE__ */ jsx("small", { children: "Requested companies remain outside published readings until their natal basis is approved." })
      ] }),
      /* @__PURE__ */ jsx("i", { children: "\uFF0B" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "admission-body", children: [
      loading && /* @__PURE__ */ jsx("p", { children: "Loading company requests\u2026" }),
      loaded && requests.length === 0 && /* @__PURE__ */ jsx("p", { children: "No new companies are awaiting verification." }),
      requests.map((request) => /* @__PURE__ */ jsxs("article", { children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: request.companyName }),
          /* @__PURE__ */ jsxs("small", { children: [
            request.symbol,
            " \xB7 ",
            request.exchange,
            " \xB7 requested ",
            request.requestCount,
            " time",
            request.requestCount === 1 ? "" : "s",
            request.isin ? ` \xB7 ${request.isin}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsx("span", { className: `admission-status ${request.status}`, children: request.status === "owner-review" ? "Owner review" : request.status === "candidate-ready" ? "Candidate ready" : request.status === "needs-evidence" ? "Needs evidence" : "Evidence preparation" }),
        /* @__PURE__ */ jsxs("p", { children: [
          request.evidenceStage,
          request.listingDate ? ` \xB7 Listing ${request.listingDate}` : ""
        ] })
      ] }, request.id))
    ] })
  ] });
}
export {
  Dashboard as default
};
