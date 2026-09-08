"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import Link from "next/link";

import { ENGINE_SUPPORTED_SYMBOLS } from "./engine-supported-symbols";

type Tone = "break" | "pressure" | "forming-pressure" | "contested" | "forming-expansion" | "expansion" | "durable";
type View = "combined" | "positional" | "investor";
type Stock = { ticker:string; name:string; reading:string; tone:Tone; e:number; p:number; phase:string; window:string; nearPath:string[]; nextInflection:string; pressure:string; potential:string; score:number; episodes:number; forward:number; interruption:string; renewal:string; chart:string; confidence:number; story:string; skyDate?:string; engineVersion?:string; natalFingerprint?:string; cacheState?:"publication"|"browser"|"fresh"; model?:EngineModel };
type MacroTone = "neutral" | "expansion" | "pressure" | "watch";
type MacroEvent = { name:string; date:string; tone:MacroTone; meaning:string; day?:string; month?:string };
type EngineEvent = { label?:string; state?:string; phase?:string; start?:string; end?:string };
type EngineModel = any;
type EnginePayload = { symbol?:string;skyDate?:string;engineVersion?:string;natalFingerprint?:string;chartBasisLabel?:string;chartConfidence?:number;row?:{name?:string;symbol?:string;company_name?:string;natal_chart_type?:string;natal_reliability?:number;astro_model?:EngineModel} };
type AdmissionRequest = { id:number;symbol:string;companyName:string;exchange:string;status:"preparing-evidence"|"candidate-ready"|"owner-review"|"needs-evidence";classification:string;evidenceStage:string;requestCount:number;lastRequestedAt:string;isin?:string|null;listingDate?:string|null;candidateDate?:string|null;sourceLabel?:string|null;historyFlags?:string[] };
type AddResult = { status:string;message:string;stock?:Stock;request?:AdmissionRequest };

const DEFAULT_TICKERS = ["BHARTIARTL","HDFCBANK","TCS","PFC","TITAN","RELIANCE","NEWGEN","LT","ICICIBANK","IFCI"];
function todayIST(){return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Kolkata",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())}
const WATCHLIST_KEY="finlumen-personal-watchlist-v1";
function displayDate(date?:string){return date?new Date(date+"T12:00:00Z").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric",timeZone:"Asia/Kolkata"}):"Loading…"}
function shiftDate(date:string,days:number){const d=new Date(date+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}
function cleanTicker(value:string){return value.trim().toUpperCase().replace(/\.(NS|BO)$/i,"").replace(/[^A-Z0-9&-]/g,"")}
function labelFromTicker(ticker:string){return ticker.replace(/&/g," & ").replace(/-/g," ")}
function plain(value:string){return String(value||"").replace(/_/g," ").toLowerCase().replace(/^./,x=>x.toUpperCase())}
function rangeLabel(windowValue?:EngineEvent|null){if(!windowValue)return "No separate window mapped";const label=plain(windowValue.label||windowValue.state||windowValue.phase||"Mapped window");const dates=[windowValue.start,windowValue.end].filter(Boolean).join("–");return dates?`${label} · ${dates}`:label}
function toneFromState(state:string,direction:string):Tone{const text=`${state} ${direction}`.toUpperCase();if(text.includes("BREAK"))return "break";if(text.includes("PRESSURE")&&text.includes("FORM"))return "forming-pressure";if(text.includes("PRESSURE"))return "pressure";if(text.includes("DURABLE"))return "durable";if(text.includes("EXPANSION")||text.includes("RERATING"))return "expansion";return "contested"}
function adaptEngineReading(payload:EnginePayload):Stock|null{
 const raw=payload?.row;const m=raw?.astro_model;if(!raw||!m?.current||!m?.scores)return null;
 const ticker=cleanTicker(raw.name||raw.symbol||payload.symbol||"");const date=payload.skyDate||m.asOfDate;
 const near=(m.paths?.tactical||[]).filter((x:any)=>x.start<=shiftDate(date,45)&&(!x.end||x.end>=date));
 const active=near.find((x:any)=>x.start<=date&&(!x.end||x.end>=date));
 const next=(m.paths?.all||[]).find((x:any)=>x.start>date);
 const renewal=(m.paths?.all||[]).find((x:any)=>x.start>date&&/EXPANSION|RERATING|RECOVER/i.test(x.label||x.state||""));
 return {ticker,name:raw.company_name||labelFromTicker(ticker),reading:plain(m.current.state),tone:toneFromState(m.current.state,m.current.direction),e:m.scores.expansion,p:m.scores.pressure,phase:plain(m.current.expansionStage||m.current.state),window:rangeLabel(active),nearPath:near.slice(0,3).map(rangeLabel),nextInflection:rangeLabel(next),pressure:rangeLabel(m.windows?.breakRisk||m.windows?.pressure),potential:`${plain(m.cycle.level)} long-cycle structure`,score:m.cycle.score,episodes:m.cycle.episodes.length,forward:m.scores.forwardLeadership,interruption:rangeLabel(m.windows?.breakRisk||m.windows?.pressure),renewal:rangeLabel(renewal),chart:plain(m.natal.roleCharts?.[0]?.chart?.chartType||m.natal.primaryChartId||"Company-event")+" · "+plain(m.natal.timePrecision),confidence:m.natal.reliability,story:m.current.story,skyDate:date,engineVersion:m.version,cacheState:"fresh",model:m};
}
async function fetchApprovedReading(value:string,date?:string){
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),65000);
 try{const response=await fetch(`/api/engine/stock?query=${encodeURIComponent(value.trim())}${date?`&date=${encodeURIComponent(date)}`:""}`,{signal:controller.signal,headers:{accept:"application/json"}});const payload=await response.json();return {response,payload:payload as EnginePayload&{status?:string;reason?:string;error?:string}}}finally{clearTimeout(timer)}
}

const toneLabel: Record<Tone,string> = { break:"Break-Risk", pressure:"Pressure", "forming-pressure":"Pressure forming", contested:"Contested", "forming-expansion":"Expansion forming", expansion:"Expansion", durable:"Durable expansion" };

function ScorePair({e,p}:{e:number;p:number}) { return <div className="score-pair" aria-label={`Expansion ${e} out of 100; pressure ${p} out of 100`}><span className="e-score">E {e}</span><span className="p-score">P {p}</span></div> }
function TonePill({tone,children}:{tone:Tone;children?:React.ReactNode}) { return <span className={`tone tone-${tone}`}><i />{children || toneLabel[tone]}</span> }
function StockCell({s}:{s:Stock}) { return <div className="stock-cell"><span className="stock-avatar">{s.ticker.slice(0,2)}</span><span><b>{s.name}</b><small>{s.ticker}.NS</small></span></div> }
function Path({items}:{items:string[]}) { return <div className="path">{items.map((item,i)=><span key={item}><i className={i===0?"now":""}/>{item}</span>)}</div> }
function RowButton({s,onSelect,children}:{s:Stock;onSelect:(s:Stock)=>void;children:React.ReactNode}) { return <tr onClick={()=>onSelect(s)} tabIndex={0} onKeyDown={e=>{if(e.key==="Enter")onSelect(s)}}>{children}</tr> }

export default function Dashboard() {
  const [view,setView] = useState<View>("combined"); const [defaultView,setDefaultView] = useState<View>("combined");
  const [sort,setSort] = useState("score"); const [query,setQuery] = useState(""); const [selected,setSelected] = useState<Stock|null>(null);
  const [addOpen,setAddOpen] = useState(false); const [fullStock,setFullStock] = useState<Stock|null>(null);
  const [allStocks,setAllStocks] = useState<Stock[]>([]);
  const [watchlist,setWatchlist] = useState<string[]>([]);
  const [skyDate,setSkyDate]=useState("");const [loading,setLoading]=useState(false);const [errors,setErrors]=useState<string[]>([]);const [storageError,setStorageError]=useState("");const [refreshKey,setRefreshKey]=useState(0);
  const watchRef=useRef<string[]>([]);const loadGeneration=useRef(0);
  useEffect(()=>{let tickers=DEFAULT_TICKERS;try{const saved=localStorage.getItem(WATCHLIST_KEY);if(saved!==null){const parsed=JSON.parse(saved);if(Array.isArray(parsed))tickers=[...new Set(parsed.filter(x=>typeof x==="string").map(cleanTicker).filter(Boolean))].slice(0,100)}const v=localStorage.getItem("finlumen-default-view");if(v&&["combined","positional","investor"].includes(v)){setView(v as View);setDefaultView(v as View)}}catch{setStorageError("Browser storage is unavailable. Your table will last for this visit only.")}
    watchRef.current=tickers;setWatchlist(tickers);setSkyDate(todayIST());
    const update=()=>setSkyDate(todayIST());const timer=setInterval(update,60000);window.addEventListener("focus",update);
    const storage=(e:StorageEvent)=>{if(e.key===WATCHLIST_KEY){try{const t=JSON.parse(e.newValue||"[]");if(Array.isArray(t)){watchRef.current=t;setWatchlist(t);setRefreshKey(k=>k+1)}}catch{}}};window.addEventListener("storage",storage);
    return()=>{clearInterval(timer);window.removeEventListener("focus",update);window.removeEventListener("storage",storage)};
  },[]);
  useEffect(()=>{if(!skyDate)return;const generation=++loadGeneration.current;let cancelled=false;setLoading(true);setErrors([]);setAllStocks([]);setSelected(null);setFullStock(null);
    const params=new URLSearchParams(window.location.search);const card=params.get("view")==="card"?cleanTicker(params.get("stock")||""):"";const queue=[...new Set([...watchRef.current,...(card?[card]:[])])];
    const worker=async()=>{while(queue.length&&!cancelled){const ticker=queue.shift()!;try{const {response,payload}=await fetchApprovedReading(ticker,skyDate);if(!response.ok)throw Error(payload.error||payload.reason||"Calculation failed");const stock=adaptEngineReading(payload);if(!stock)throw Error("No model returned");if(!cancelled&&generation===loadGeneration.current){setAllStocks(rows=>[...rows.filter(r=>r.ticker!==stock.ticker),stock]);if(card===stock.ticker)setFullStock(stock)}}catch(error){if(!cancelled)setErrors(es=>[...es,`${ticker}: ${error instanceof Error?error.message:"Calculation failed"}`])}}};
    Promise.all([worker(),worker()]).finally(()=>{if(!cancelled)setLoading(false)});return()=>{cancelled=true};
  },[skyDate,refreshKey]);
  const visible=useMemo(()=>allStocks.filter(s=>watchlist.includes(s.ticker)).filter(s=>`${s.name} ${s.ticker}`.toLowerCase().includes(query.toLowerCase())).sort((a,b)=>sort==="score"?b.score-a.score:sort==="expansion"?b.e-a.e:sort==="pressure"?b.p-a.p:sort==="confidence"?b.confidence-a.confidence:a.name.localeCompare(b.name)),[allStocks,watchlist,query,sort]);
  const persist=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{setStorageError("Browser storage is unavailable. Changes will last for this visit only.")}};
  const makeDefault=()=>{persist("finlumen-default-view",view);setDefaultView(view)};
  const saveWatchlist=(next:string[])=>{watchRef.current=next;setWatchlist(next);persist(WATCHLIST_KEY,JSON.stringify(next))};
  const removeTicker=(ticker:string)=>saveWatchlist(watchRef.current.filter(item=>item!==ticker));
  const requestAdd=async(value:string)=>{
    if(watchRef.current.length>=100)return {status:"error",message:"Your 100-stock table is full."};
    const requested=cleanTicker(value);
    if(!ENGINE_SUPPORTED_SYMBOLS.includes(requested as (typeof ENGINE_SUPPORTED_SYMBOLS)[number]))return {status:"unavailable",message:`${requested||"This company"} is not yet in Fin-Lumen’s reviewed natal registry. No reading was created.`};
    const {response,payload}=await fetchApprovedReading(value,skyDate||todayIST());if(!response.ok)return {status:"unavailable",message:payload.error||payload.reason||"No bundled natal chart is available for this company."};
    const stock=adaptEngineReading(payload);if(!stock)return {status:"error",message:"The engine returned no reading."};
    setAllStocks(current=>[...current.filter(item=>item.ticker!==stock.ticker),stock]);saveWatchlist([...new Set([...watchRef.current,stock.ticker])]);return {status:"added",stock,message:`${stock.name} is in your personal table.`};
  };
  if(fullStock)return <FullStockPage stock={fullStock}/>;
  return <main>
    <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">FL</span><span><strong>FIN–LUMEN</strong><small>PURE ASTRO RESEARCH</small></span></a><div className="header-right"><span className="asof"><b>Sky date</b> {displayDate(skyDate)} · IST</span><button className="icon-button" onClick={()=>setRefreshKey(k=>k+1)} disabled={loading} aria-label="Refresh readings">↻</button></div></header>
    <div className="shell" id="top">
      <section className="welcome"><div><span className="eyebrow">Personal research <i className="private-beta">Friends & family</i></span><h1>Financial astrology,<br/><em>clearly mapped.</em></h1><p>A structured view of market conditions and company-specific astrological cycles.</p></div><div className="watch-count"><span>MY STOCKS</span><strong>{watchlist.length} <small>/ 100</small></strong><button onClick={()=>setAddOpen(true)}>＋ Add stock</button></div></section>
      <MacroPanels date={skyDate} refreshKey={refreshKey}/>
      <p className="personal-note">Your table is saved in this browser. Other people’s additions do not change it. Use a separate browser profile on a shared device.</p>
      {storageError&&<p role="alert">{storageError}</p>}
      {loading&&<p role="status">Calculating {allStocks.length} of {watchlist.length} readings for {displayDate(skyDate)}…</p>}
      {!!errors.length&&<div className="load-errors" role="alert"><b>Some readings could not be calculated.</b>{errors.map(e=><p key={e}>{e} <button onClick={()=>{removeTicker(cleanTicker(e.split(":")[0]));setErrors(es=>es.filter(x=>x!==e))}}>Remove from my table</button></p>)}<button onClick={()=>setRefreshKey(k=>k+1)}>Retry readings</button></div>}
      <section className="workspace">
        <div className="workspace-head"><div><span className="eyebrow">My astro watchlist</span><h2>Read the horizon that matters to you.</h2></div><div className="controls"><label className="search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a stock" aria-label="Find a stock"/></label><select value={sort} onChange={e=>setSort(e.target.value)} aria-label="Sort stocks"><option value="score">Highest 24m potential</option><option value="expansion">Highest expansion</option><option value="pressure">Highest pressure</option><option value="confidence">Highest confidence</option><option value="name">Alphabetical</option></select></div></div>
        <div className="viewbar"><div className="view-tabs" role="tablist">{(["combined","positional","investor"] as View[]).map(v=><button role="tab" aria-selected={view===v} className={view===v?"active":""} onClick={()=>setView(v)} key={v}>{v==="combined"?"Combined overview":v==="positional"?"Positional · 45 days":"Investor · 24 months"}</button>)}</div><button className={`default-button ${defaultView===view?"saved":""}`} onClick={makeDefault}>{defaultView===view?"✓ Default view":"Make this my default"}</button></div>
        {!loading&&!watchlist.length&&<p className="personal-note">Your table is empty. Add a stock to begin.</p>}<div className="table-wrap">{view==="combined"&&<CombinedTable stocks={visible} onSelect={setSelected}/>} {view==="positional"&&<PositionalTable stocks={visible} onSelect={setSelected}/>} {view==="investor"&&<InvestorTable stocks={visible} onSelect={setSelected}/>}</div>
        <div className="table-foot"><span>Showing {visible.length} of {watchlist.length} readings</span><span>Swiss Ephemeris · Lahiri · Personal build 37.9.14.4</span><span>Scores describe astrological structure and intensity; they are not financial forecasts.</span></div>
        <nav className="below-table-tabs" aria-label="Table resources"><a href="#replay">↺ Historical Replay</a><a href="#reading-guide">? Reading guide</a></nav>
      </section>
      <ReplaySection stocks={allStocks.filter(stock=>watchlist.includes(stock.ticker))}/>

      <ReadingGuide />
      <footer className="disclaimer"><b>Important:</b> Fin-Lumen presents astrological research derived from a fixed methodology. It does not provide personalised investment advice, technical analysis, financial forecasts or guaranteed outcomes. Scores compare astrological structure and intensity within the model; they are not probabilities. Use independent financial judgement and professional advice where appropriate.</footer>
    </div>
    {selected&&<StockDrawer stock={selected} onClose={()=>setSelected(null)} onRemove={()=>{removeTicker(selected.ticker);setSelected(null)}}/>}
    {addOpen&&<AddStockModal stocks={allStocks} watchlist={watchlist} onRequestAdd={requestAdd} onClose={()=>setAddOpen(false)}/>}
  </main>
}

function CombinedTable({stocks,onSelect}:{stocks:Stock[];onSelect:(s:Stock)=>void}) { return <table><thead><tr><th>Stock</th><th>Current reading</th><th>E / P</th><th>Phase & active window</th><th>Near-term path</th><th>24-month astro potential</th><th>Score</th><th>Principal risk</th><th>Chart confidence</th></tr></thead><tbody>{stocks.map(s=><RowButton s={s} onSelect={onSelect} key={s.ticker}><td><StockCell s={s}/></td><td><TonePill tone={s.tone}>{s.reading}</TonePill></td><td><ScorePair e={s.e} p={s.p}/></td><td><b>{s.phase}</b><small>{s.window}</small></td><td><Path items={s.nearPath}/></td><td><b>{s.potential}</b><small>{s.episodes} productive episode{s.episodes===1?"":"s"}</small></td><td><span className={`potential-score ${s.score>=85?"high":s.score>=75?"good":"moderate"}`}>{s.score}<small>/100</small></span></td><td><b>{s.pressure}</b></td><td><b>{s.chart}</b><small>{s.confidence}/100 reliability</small></td></RowButton>)}</tbody></table> }
function PositionalTable({stocks,onSelect}:{stocks:Stock[];onSelect:(s:Stock)=>void}) { return <table><thead><tr><th>Stock</th><th>Current reading</th><th>E / P</th><th>Phase maturity</th><th>Current window</th><th>Ordered 45-day path</th><th>Next material turning point</th><th>Pressure character</th><th>Confidence</th></tr></thead><tbody>{stocks.map(s=><RowButton s={s} onSelect={onSelect} key={s.ticker}><td><StockCell s={s}/></td><td><TonePill tone={s.tone}>{s.reading}</TonePill></td><td><ScorePair e={s.e} p={s.p}/></td><td><b>{s.phase}</b></td><td><b>{s.window}</b></td><td><Path items={s.nearPath}/></td><td><b>{s.nextInflection}</b></td><td><b>{s.pressure}</b></td><td><span className="confidence-score">{s.confidence}<small>/100</small></span><small>{s.chart}</small></td></RowButton>)}</tbody></table> }
function InvestorTable({stocks,onSelect}:{stocks:Stock[];onSelect:(s:Stock)=>void}) { return <table><thead><tr><th>Stock</th><th>Current cycle position</th><th>24-month astro potential</th><th>Score</th><th>Expansion episodes</th><th>Forward leadership</th><th>Major interruption</th><th>Next renewal</th><th>Chart confidence</th></tr></thead><tbody>{stocks.map(s=><RowButton s={s} onSelect={onSelect} key={s.ticker}><td><StockCell s={s}/></td><td><TonePill tone={s.tone}>{s.phase}</TonePill><small>{s.reading}</small></td><td><b>{s.potential}</b></td><td><span className={`potential-score ${s.score>=85?"high":s.score>=75?"good":"moderate"}`}>{s.score}<small>/100</small></span></td><td><b>{s.episodes}</b><small>productive phases</small></td><td><span className="confidence-score">{s.forward}<small>/100</small></span></td><td><b>{s.interruption}</b></td><td><b>{s.renewal}</b></td><td><b>{s.chart}</b><small>{s.confidence}/100 reliability</small></td></RowButton>)}</tbody></table> }

function readingMeaning(s:Stock){
  if(s.tone==="pressure"||s.tone==="break")return "Restraining conditions currently have more authority. This can delay, compress or distort expression; it does not automatically mean a price decline.";
  if(s.tone==="forming-pressure")return "Support remains present, but pressure is developing. Treat this as an early-warning phase rather than established pressure.";
  if(s.tone==="durable")return "A mature supportive structure is governing now and has shown resilience through ordinary pressure.";
  if(s.tone==="expansion"||s.tone==="forming-expansion")return "Supportive conditions have more authority than pressure and are strengthening, although the path can still contain pauses.";
  return "Support and pressure are closely balanced, so the next dated change carries more interpretive weight.";
}

function StockReading({s,deep=false}:{s:Stock;deep?:boolean}){
  return <div className="stock-reading">
    <section className="reading-lead"><span className="eyebrow">Current reading</span><TonePill tone={s.tone}>{s.reading}</TonePill><h2>{s.story}</h2><p className="phase-meaning"><b>What this means:</b> {readingMeaning(s)}</p></section>
    <div className="drawer-stats"><div><span>EXPANSION</span><b>{s.e}<small>/100</small></b></div><div><span>PRESSURE</span><b>{s.p}<small>/100</small></b></div><div><span>ACTIVE WINDOW</span><b className="text-stat">{s.window}</b></div><div><span>24M ASTRO POTENTIAL</span><b>{s.score}<small>/100</small></b></div></div>
    <section className="quick-grid"><div><span className="eyebrow">Near-term path</span><Path items={s.nearPath}/></div><div><span className="eyebrow">Long-cycle structure</span><h3>{s.potential}</h3><p>{s.episodes} productive expansion episode{s.episodes===1?"":"s"} in the measured runway.</p></div><div><span className="eyebrow">Principal risk</span><h3>{s.interruption}</h3><p>{s.pressure}</p></div><div><span className="eyebrow">Chart confidence</span><h3>{s.confidence}/100</h3><p>{s.chart}</p></div></section>
    {deep&&<div className="deep-reading">
      <section><div className="section-title"><span className="eyebrow">Positional · 45 days</span><h3>The ordered near-term sequence</h3></div><div className="research-grid"><div><small>PHASE MATURITY</small><b>{s.phase}</b></div><div><small>CURRENT WINDOW</small><b>{s.window}</b></div><div><small>NEXT TURNING POINT</small><b>{s.nextInflection}</b></div><div><small>PRESSURE CHARACTER</small><b>{s.pressure}</b></div></div><Path items={s.nearPath}/></section>
      <section><div className="section-title"><span className="eyebrow">Investor · 24 months</span><h3>{s.potential}</h3></div><div className="research-grid"><div><small>ASTRO POTENTIAL</small><b>{s.score}/100</b></div><div><small>EXPANSION EPISODES</small><b>{s.episodes}</b></div><div><small>FORWARD LEADERSHIP</small><b>{s.forward}/100</b></div><div><small>PRINCIPAL INTERRUPTION</small><b>{s.interruption}</b></div></div><p className="renewal"><b>Next renewal:</b> {s.renewal}</p></section>
      <section><div className="section-title"><span className="eyebrow">Why this reading</span><h3>Astro engine interpretation</h3></div><p>{s.story}</p><p>Expansion and pressure are measured independently; the governing phase reflects their authority, maturity and ordered sequence rather than a simple subtraction of one score from the other.</p></section>
      <section><div className="section-title"><span className="eyebrow">Chart basis</span><h3>{s.chart}</h3></div><p><b>{s.confidence}/100 chart reliability.</b> This measures confidence in the approved natal basis—not confidence that a market outcome must occur.</p></section>
      <details className="astro-basis"><summary><span><small>ASTROLOGICAL BASIS</small><b>See how this reading was formed</b></span><i>＋</i></summary><div className="basis-grid"><div><small>NATAL AUTHORITY</small><b>{s.chart}</b><p>{s.confidence}/100 reliability for the approved company-event chart.</p></div><div><small>CURRENT SKY BALANCE</small><b>Expansion {s.e} · Pressure {s.p}</b><p>The scores are independent intensities; the reading is not produced by simply subtracting one from the other.</p></div><div><small>TEMPORAL EVIDENCE</small><b>{s.phase}</b><p>{s.nearPath.join(" → ")}</p></div><div><small>INTERPRETIVE RULE</small><b>Authority, maturity and sequence</b><p>The Astro engine resolves which force governs now, what is forming next and whether the longer structure survives interruption.</p></div></div><ResearchDetails model={s.model}/></details>
    </div>}
  </div>
}

function StockDrawer({stock:s,onClose,onRemove}:{stock:Stock;onClose:()=>void;onRemove:()=>void}) {
  const [expanded,setExpanded]=useState(false); const url=`/?stock=${encodeURIComponent(s.ticker)}&view=card`;
  useEffect(()=>{const previous=document.body.style.overflow;document.body.style.overflow="hidden";const escape=(event:KeyboardEvent)=>{if(event.key==="Escape")onClose()};window.addEventListener("keydown",escape);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape)}},[onClose]);
  return <div className="drawer-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><aside className={`drawer ${expanded?"drawer-expanded":""}`} role="dialog" aria-modal="true" aria-label={`${s.name} stock reading`}><div className="drawer-toolbar"><StockCell s={s}/><div><button onClick={()=>setExpanded(v=>!v)} aria-pressed={expanded}>{expanded?"↙ Summary":"↗ Expand"}</button><a href={url} target="_blank" rel="noreferrer">Open in new tab</a><button className="remove-stock" onClick={onRemove}>Remove</button><button className="close" onClick={onClose} aria-label="Close stock reading">×</button></div></div><StockReading s={s} deep={expanded}/><a className="drawer-replay" href={`/?replayStock=${encodeURIComponent(s.ticker)}#replay`}>Replay {s.ticker}</a></aside></div>
}

function FullStockPage({stock:s}:{stock:Stock}){
  return <main className="full-stock-page"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">FL</span><span><strong>FIN–LUMEN</strong><small>PURE ASTRO RESEARCH</small></span></Link><div className="header-right"><span className="asof"><b>Sky date</b> {displayDate(s.skyDate)} · IST</span></div></header><div className="full-stock-shell"><div className="full-stock-nav"><Link href="/">← Back to dashboard</Link><span>Full stock reading</span></div><article className="full-stock-card"><div className="full-stock-head"><StockCell s={s}/><TonePill tone={s.tone}>{s.reading}</TonePill></div><StockReading s={s} deep/><Link className="full-replay-link" href={`/?replayStock=${encodeURIComponent(s.ticker)}#replay`}>Historical replay</Link></article><footer className="disclaimer"><b>Important:</b> This is astrological research, not personalised investment advice or a financial forecast. Scores describe structure and intensity within Fin-Lumen’s fixed methodology.</footer></div></main>
}

function ReplaySection({stocks}:{stocks:Stock[]}){
 const [ticker,setTicker]=useState("");const [date,setDate]=useState("2024-08-15");const [result,setResult]=useState<Stock|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState("");const version=useRef(0);
 useEffect(()=>{const requested=cleanTicker(new URLSearchParams(window.location.search).get("replayStock")||"");if(!ticker&&stocks.length)setTicker(stocks.find(s=>s.ticker===requested)?.ticker||stocks[0].ticker)},[stocks,ticker]);
 const reset=()=>{version.current++;setResult(null);setError("");setBusy(false)};
 const replay=async()=>{const current=++version.current;setBusy(true);setResult(null);setError("");try{const {response,payload}=await fetchApprovedReading(ticker,date);if(!response.ok)throw Error(payload.error||"Replay failed");const reading=adaptEngineReading(payload);if(!reading)throw Error("No historical model returned");if(current===version.current)setResult(reading)}catch(e){if(current===version.current)setError(e instanceof Error?e.message:"Replay failed")}finally{if(current===version.current)setBusy(false)}};
 return <section className="replay" id="replay"><div className="replay-copy"><span className="eyebrow">Historical research</span><h2>Replay Lab</h2><p>Recalculate the model under a past sky using the same engine as today’s table.</p><p>This uses today’s bundled natal registry and model rules. It is not an archived prediction or a measurement of investment returns.</p></div><div className="replay-panel"><div className="replay-controls"><label><span>COMPANY</span><select value={ticker} onChange={e=>{reset();setTicker(e.target.value)}}><option value="" disabled>Select a company</option>{stocks.map(s=><option value={s.ticker} key={s.ticker}>{s.name}</option>)}</select></label><label><span>REPLAY DATE</span><input type="date" value={date} min="1900-01-01" max={todayIST()} onChange={e=>{reset();setDate(e.target.value)}}/></label><button disabled={busy||!ticker||!date} onClick={replay}>{busy?"Calculating…":"Run replay"}</button></div>{error&&<p role="alert">{error}</p>}{result&&<article className="replay-result-card"><h3>{result.name} · {displayDate(result.skyDate)}</h3><StockReading s={result} deep/><button onClick={reset}>Close replay</button></article>}</div></section>
}

function MacroPanels({date,refreshKey}:{date:string;refreshKey:number}){
 const [data,setData]=useState<any>(null);const [error,setError]=useState("");
 useEffect(()=>{if(!date)return;let active=true;setData(null);setError("");fetch(`/api/macro?date=${date}`).then(async r=>{const d=await r.json();if(!r.ok)throw Error(d.error||"Macro calculation failed");if(active)setData(d)}).catch(e=>{if(active)setError(e.message)});return()=>{active=false}},[date,refreshKey]);
 const tone=(e:any)=>/pressure|risk|restraint/i.test(e.tone)?"pressure":/expansion|support|opportunity/i.test(e.tone)?"expansion":"watch";
 const events=(list:any[])=>list.map((e:any,i:number)=><div className={`event-row macro-event-${tone(e)}`} key={i}><span className={`event-icon ${tone(e)}`}/><span className="event-copy"><b>{e.label}</b><small>{e.timing||e.date}</small><em>{e.meaning}</em></span></div>);
 return <section className="macro-grid" aria-label="Market astro environment"><article className="macro-card macro-current"><div className="card-kicker">ACTIVE NOW <time>{displayDate(date)}</time></div><h2>{data?.environmentLabel||"Market astro environment"}</h2><p>{error||data?.stateSummary||"Calculating the sky…"}</p>{data&&<><div className="macro-scores"><div><span>PRESSURE</span><b>{data.pressureScore}</b><small>/100</small></div><div><span>EXPANSION</span><b>{data.expansionScore}</b><small>/100</small></div><div><span>TURNING POINT</span><b>{data.inflectionScore}</b><small>/100</small></div><div><span>MOON</span><b className="word-score">{data.moonSign}</b></div></div><div className="event-list">{events(data.macroReadable?.activeNow||[])}</div></>}</article><article className="macro-card macro-next"><div className="card-kicker">NEXT 30 DAYS</div><h2>What develops next</h2><div className="next-events">{data?events(data.macroReadable?.next30Days||[]):<p>{error||"Calculating upcoming events…"}</p>}{data&&!data.macroReadable?.next30Days?.length&&<p>No separate macro event mapped in the next 30 days.</p>}</div></article></section>
}

function ReadingGuide(){
  const phases=[
    ["Expansion","Supportive astrological conditions have more authority than pressure. This can improve momentum, participation or opportunity, but it does not promise a price rise."],
    ["Rerating","Expansion has become persistent or repeated enough to support a more meaningful change in how the stock expresses leadership. It is an astrological structure—not a valuation or return forecast."],
    ["Rerating strengthening","The rerating structure is gaining authority but has not yet reached its most established phase."],
    ["Rerating established","The rerating structure is active and mature enough to govern the current reading, subject to any stated pressure or interruption."],
    ["Compressed rerating","The rerating structure remains intact, but pressure is restricting its expression. Progress may be slower, selective or interrupted rather than absent."],
    ["Volatile expansion","Support remains stronger than pressure, but volatile contacts can produce an uneven path, rapid reversals or exaggerated reactions."],
    ["Volatile rerating","A meaningful rerating structure is active, but volatility can disrupt how cleanly it expresses. The supportive structure and the unstable path are both real."],
    ["Pressure","Restraining conditions have authority. They can delay, compress or distort expression; pressure does not automatically mean that every stock must fall."],
    ["Pressure forming","A pressure pattern is developing but has not yet taken control. It is an early-warning state, not the same as active pressure."],
    ["Peak pressure","The pressure sequence is near its strongest measured phase. Relief afterward is possible, but recovery requires a later supportive structure."],
    ["Durable expansion","Support repeats across the measured runway and remains resilient through ordinary pressure. It describes structural persistence, not guaranteed performance."],
    ["Break-Risk","A specifically qualified destructive structural-pressure network. It is more serious than ordinary pressure and is never inferred merely from a long quiet period."]
  ];
  const terms=[
    ["E / P","Expansion and Pressure intensity, each measured independently out of 100."],
    ["Current reading","The governing astrological condition on the selected sky date."],
    ["Phase maturity","Whether a condition is forming, strengthening, established, mature or exhausting."],
    ["Active window","The date range during which the current governing condition remains authoritative."],
    ["Near-term path","Up to three meaningful changes across the next 45 days; minor events are excluded."],
    ["24-month astro potential","The measured runway for repeated expansion, leadership durability and survival through pressure."],
    ["Principal risk","The strongest interruption that could override or delay the otherwise supportive structure."],
    ["Chart confidence","Reliability of the approved natal basis—not confidence that a market outcome must occur."],
    ["Turning point (inflection)","A direction-neutral transition field: an existing trend may accelerate, stall, reverse or rotate. Each stock’s natal contacts determine whether it expresses as support or pressure."],
    ["Watch","A turning-point or volatility field whose direction is not predetermined and depends on each stock’s natal response."]
  ];
  return <details className="reading-guide" id="reading-guide"><summary><span><b>Reading guide</b><small>Plain-English phase definitions, colour meanings and methodology notes</small></span><i>＋</i></summary><div className="guide-colours"><span className="macro-tag neutral">neutral</span><p>Balanced or no dominant force</p><span className="macro-tag expansion">expansion</span><p>Supportive or rerating-oriented</p><span className="macro-tag pressure">pressure</span><p>Compression, restraint or structural stress</p><span className="macro-tag watch">watch</span><p>Turning point or volatility; direction is not predetermined</p></div><section className="guide-section"><div className="guide-heading"><span className="eyebrow">How to read the phases</span><h3>What Fin-Lumen’s recurring terms mean</h3><p>Each phrase describes the balance and maturity of astrological structure. It does not predict a financial return.</p></div><div className="phase-grid">{phases.map(([term,meaning])=><div key={term}><b>{term}</b><p>{meaning}</p></div>)}</div></section><section className="guide-section guide-reference"><div className="guide-heading"><span className="eyebrow">Table reference</span><h3>Scores, windows and confidence</h3></div><div className="term-grid">{terms.map(([term,meaning])=><div key={term}><b>{term}</b><p>{meaning}</p></div>)}</div></section></details>
}

function AddStockModal({stocks,watchlist,onRequestAdd,onClose}:{stocks:Stock[];watchlist:string[];onRequestAdd:(value:string)=>Promise<AddResult>;onClose:()=>void}){
  const [query,setQuery]=useState("");const [checked,setChecked]=useState(false);const [loading,setLoading]=useState(false);const [result,setResult]=useState<AddResult|null>(null);
  const normalized=cleanTicker(query);const known=stocks.find(s=>s.ticker===normalized||s.name.toUpperCase()===query.trim().toUpperCase());
  const check=async()=>{setChecked(true);setResult(null);if(known)return;setLoading(true);try{setResult(await onRequestAdd(query))}catch(error){setResult({status:"error",message:error instanceof Error?error.message:"The company could not be added."})}finally{setLoading(false)}};
  const addKnown=async()=>{if(!known)return;setLoading(true);try{setResult(await onRequestAdd(known.ticker))}catch(error){setResult({status:"error",message:error instanceof Error?error.message:"The company could not be added."})}finally{setLoading(false)}};
  const reset=(value:string)=>{setQuery(value);setChecked(false);setResult(null)};
  return <div className="drawer-backdrop modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="add-modal" role="dialog" aria-modal="true" aria-label="Add a stock"><button className="close" onClick={onClose}>×</button><span className="eyebrow">Add to My Stocks · {watchlist.length}/100</span><h2>Enter a company or ticker.</h2><p>Choose from the {ENGINE_SUPPORTED_SYMBOLS.length} companies with a reviewed chart in this build. The addition is saved only in this browser.</p><div className="add-search"><input autoFocus list="finlumen-supported-symbols" value={query} onChange={e=>reset(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void check()}} placeholder="For example: MARUTI.NS or ABB.NS"/><datalist id="finlumen-supported-symbols">{ENGINE_SUPPORTED_SYMBOLS.map(symbol=><option value={`${symbol}.NS`} key={symbol}/>)}</datalist><button onClick={()=>void check()} disabled={!query.trim()||loading||watchlist.length>=100}>{loading?"Calculating…":"Add stock"}</button></div>{loading&&<p className="checking-note">Calculating the current reading from the reviewed natal chart. This can take a few seconds.</p>}{!checked&&<div className="suggestions"><span>Try one of these:</span>{["MARUTI","ABB","TITAN","COCHINSHIP"].map(x=><button key={x} onClick={()=>reset(x)}>{x}</button>)}</div>}
      {checked&&known&&<div className="availability available"><span>✓</span><div><b>Approved reading available</b><p>{watchlist.includes(known.ticker)?`${known.name} is already in My Stocks.`:`${known.name} can be added to your table.`}</p><small>{known.chart} · {known.confidence}/100 reliability{known.cacheState==="browser"?" · browser cache":""}</small></div><button disabled={watchlist.includes(known.ticker)||loading} onClick={()=>void addKnown()}>{watchlist.includes(known.ticker)?"Already added":loading?"Adding…":"Add company"}</button></div>}
      {result?.status==="added"&&!known&&<div className="availability available" aria-live="polite"><span>✓</span><div><b>Added to My Stocks</b><p>{result.message}</p><small>It was added only to this browser’s table.</small></div><button onClick={onClose}>View table</button></div>}
      {result&&result.status!=="added"&&<div className={`availability ${result.status==="error"?"preparing":"unavailable"}`} role="alert"><span>○</span><div><b>{result.status==="unavailable"?"Reviewed chart unavailable":"The reading could not be added"}</b><p>{result.message}</p><small>Nothing was added to your table.</small></div><button onClick={()=>{setChecked(false);setResult(null)}}>Try another</button></div>}
      {watchlist.length>=100&&<p className="capacity-note">Your personal table has reached its 100-company limit. Remove one company before adding another.</p>}
    </section></div>
}


function ResearchDetails({model:m}:{model:EngineModel}){
 if(!m)return null;
 return <div className="research-details"><h3>Astro research details</h3>{[["Supportive contacts",m.research?.supportiveContacts],["Pressuring contacts",m.research?.pressuringContacts],["Volatile contacts",m.research?.volatileContacts],["Transit contacts",m.research?.contacts]].map(([title,items])=><section key={title as string}><b>{title as string}</b>{(items as any[])?.length?<ul>{(items as any[]).map((x,i)=><li key={i}>{typeof x==="string"?x:JSON.stringify(x)}</li>)}</ul>:<p>No separate contact listed.</p>}</section>)}<section><b>Rerating window</b><p>{rangeLabel(m.windows?.rerating)}</p><p>{m.windows?.rerating?.reason}</p></section><section><b>Break-Risk window</b><p>{rangeLabel(m.windows?.breakRisk)}</p></section><section><b>Long-cycle sequence</b><Path items={(m.paths?.all||[]).filter((x:any)=>x.start<=m.cycle.scanEndDate).map(rangeLabel)}/></section><section><b>Chart evidence</b><p>{m.natal?.primaryChartId} · Source: {m.natal?.sourceVerification} · Time precision: {m.natal?.timePrecision} · Anchor validation: {m.natal?.anchorValidation}</p></section><details><summary>Full engine research output</summary><pre>{JSON.stringify(m.research,null,2)}</pre></details></div>
}
