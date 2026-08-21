type AdmissionRow = {
  id:number; original_query:string; symbol:string; company_name:string; exchange:string; status:string;
  classification:string; evidence_stage:string; listing_evidence_url:string; corporate_evidence_url:string;
  isin:string|null; listing_date:string|null; candidate_chart_type:string|null; candidate_date:string|null;
  candidate_time:string|null; candidate_city:string|null; candidate_timezone:string|null; source_label:string|null;
  history_flags_json:string; owner_decision:string|null; owner_note:string|null; decided_at:string|null;
  request_count:number; first_requested_at:string; last_requested_at:string;
};

const NSE_SECURITIES = "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";
const NSE_NAME_CHANGES = "https://nsearchives.nseindia.com/content/equities/namechange.csv";
const NSE_SYMBOL_CHANGES = "https://nsearchives.nseindia.com/content/equities/symbolchange.csv";
const MCA_MASTER_DATA = "https://www.mca.gov.in/content/mca/global/en/mca/master-data/MDS.html";
const COMPLEX_SYMBOLS = new Set(["ABB.NS", "JIOFIN.NS", "COCHINSHIP.NS", "ONGC.NS", "HDFCBANK.NS"]);

const schemaSql = `CREATE TABLE IF NOT EXISTS company_admission_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  original_query TEXT NOT NULL,
  symbol TEXT NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  status TEXT NOT NULL,
  classification TEXT NOT NULL,
  evidence_stage TEXT NOT NULL,
  listing_evidence_url TEXT NOT NULL,
  corporate_evidence_url TEXT NOT NULL,
  isin TEXT,
  listing_date TEXT,
  candidate_chart_type TEXT,
  candidate_date TEXT,
  candidate_time TEXT,
  candidate_city TEXT,
  candidate_timezone TEXT,
  source_label TEXT,
  history_flags_json TEXT NOT NULL DEFAULT '[]',
  owner_decision TEXT,
  owner_note TEXT,
  decided_at TEXT,
  request_count INTEGER NOT NULL DEFAULT 1,
  first_requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_requested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
)`;

async function admissionDb():Promise<D1Database>{const runtime=await import("cloudflare:workers");if(!runtime.env.DB)throw new Error("Company admission storage is unavailable.");return runtime.env.DB}
async function ensureSchema(db:D1Database){await db.prepare(schemaSql).run();await db.prepare("CREATE INDEX IF NOT EXISTS admission_status_idx ON company_admission_requests(status, last_requested_at)").run()}

function parseCsvLine(line:string){const values:string[]=[];let value="";let quoted=false;for(let index=0;index<line.length;index+=1){const char=line[index];if(char==='"'){if(quoted&&line[index+1]==='"'){value+='"';index+=1}else quoted=!quoted}else if(char===","&&!quoted){values.push(value.trim());value=""}else value+=char}values.push(value.trim());return values}
function isoDate(value:string){const match=value.trim().toUpperCase().match(/^(\d{1,2})-([A-Z]{3})-(\d{4})$/);if(!match)return "";const months:Record<string,string>={JAN:"01",FEB:"02",MAR:"03",APR:"04",MAY:"05",JUN:"06",JUL:"07",AUG:"08",SEP:"09",OCT:"10",NOV:"11",DEC:"12"};return months[match[2]]?`${match[3]}-${months[match[2]]}-${match[1].padStart(2,"0")}`:""}
async function officialText(url:string){const response=await fetch(url,{headers:{accept:"text/csv,*/*"},signal:AbortSignal.timeout(8000),cf:{cacheTtl:604800,cacheEverything:true}} as RequestInit);if(!response.ok)throw new Error(`Official source returned ${response.status}`);return response.text()}

async function resolveNseCandidate(bare:string){try{const securities=await officialText(NSE_SECURITIES);const rows=securities.split(/\r?\n/).slice(1).map(parseCsvLine);const row=rows.find(columns=>String(columns[0]||"").trim().toUpperCase()===bare);if(!row)return null;const [nameChanges,symbolChanges]=await Promise.allSettled([officialText(NSE_NAME_CHANGES),officialText(NSE_SYMBOL_CHANGES)]);const flags:string[]=[];const nameText=nameChanges.status==="fulfilled"?nameChanges.value.toUpperCase():"";const symbolText=symbolChanges.status==="fulfilled"?symbolChanges.value.toUpperCase():"";if(nameText.split(/\r?\n/).some(line=>parseCsvLine(line)[0]?.trim().toUpperCase()===bare))flags.push("NSE company-name history found");if(symbolText.split(/\r?\n/).some(line=>parseCsvLine(line).some((value,index)=>index>0&&value.trim().toUpperCase()===bare)))flags.push("NSE symbol history found");return {companyName:row[1]||bare,listingDate:isoDate(row[3]||""),isin:row[6]||"",historyFlags:flags}}catch{return null}}

function resolveRequestedIdentity(value:string){const raw=value.trim().toUpperCase();if(!raw)return null;const compact=raw.replace(/\s+(NSE|NS)$/i,".NS").replace(/\s+(BSE|BO)$/i,".BO");const symbol=compact.includes(".")?compact:/^[A-Z0-9&-]{1,24}$/.test(compact)?`${compact}.NS`:"";if(!/^[A-Z0-9&-]{1,24}\.(NS|BO)$/.test(symbol))return null;const exchange=symbol.endsWith(".BO")?"BSE":"NSE";const bare=symbol.replace(/\.(NS|BO)$/i,"");return {symbol,exchange,bare,companyName:bare.replace(/&/g," & ").replace(/-/g," "),listingEvidenceUrl:exchange==="NSE"?`https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(bare)}`:"https://www.bseindia.com/stock-share-price/",corporateEvidenceUrl:MCA_MASTER_DATA}}

function publicRow(row:AdmissionRow){let historyFlags:string[]=[];try{historyFlags=JSON.parse(row.history_flags_json||"[]")}catch{}return {id:row.id,symbol:row.symbol,companyName:row.company_name,exchange:row.exchange,status:row.status,classification:row.classification,evidenceStage:row.evidence_stage,requestCount:row.request_count,lastRequestedAt:row.last_requested_at,isin:row.isin,listingDate:row.listing_date,candidateChartType:row.candidate_chart_type,candidateDate:row.candidate_date,candidateTime:row.candidate_time,candidateCity:row.candidate_city,candidateTimezone:row.candidate_timezone,sourceLabel:row.source_label,historyFlags,ownerDecision:row.owner_decision,ownerNote:row.owner_note}}

export async function GET(){const db=await admissionDb();await ensureSchema(db);const result=await db.prepare(`SELECT * FROM company_admission_requests WHERE status IN ('preparing-evidence','candidate-ready','owner-review','needs-evidence') ORDER BY last_requested_at DESC LIMIT 30`).all<AdmissionRow>();return Response.json({success:true,requests:(result.results||[]).map(publicRow)})}

export async function POST(request:Request){let body:{query?:string};try{body=await request.json() as {query?:string}}catch{return Response.json({success:false,status:"invalid",error:"Enter an NSE or BSE ticker."},{status:400})}const identity=resolveRequestedIdentity(body.query||"");if(!identity)return Response.json({success:false,status:"identity-needed",error:"We could not safely identify that company. Please enter its exact NSE or BSE ticker, such as KFINTECH.NS."},{status:400});
  const official=identity.exchange==="NSE"?await resolveNseCandidate(identity.bare):null;const historyFlags=official?.historyFlags||[];const knownComplex=COMPLEX_SYMBOLS.has(identity.symbol);const complex=knownComplex||historyFlags.length>0;const candidateReady=Boolean(official?.listingDate);const status=complex?"owner-review":candidateReady?"candidate-ready":"preparing-evidence";const classification=complex?"complex-history":candidateReady?"standard-listing-candidate":"standard-evidence-check";const evidenceStage=knownComplex?"Existing natal candidate requires a competing-chart validation":historyFlags.length>0?"Identity change detected; competing corporate-event charts must be checked":candidateReady?"Official NSE listing candidate prepared; incorporation and restructuring check pending":"Official listing and corporate-history evidence requested";const companyName=official?.companyName||identity.companyName;const sourceLabel=official?"Official NSE securities master":"Official evidence not yet retrieved";
  const db=await admissionDb();await ensureSchema(db);await db.prepare(`INSERT INTO company_admission_requests (original_query,symbol,company_name,exchange,status,classification,evidence_stage,listing_evidence_url,corporate_evidence_url,isin,listing_date,candidate_chart_type,candidate_date,candidate_time,candidate_city,candidate_timezone,source_label,history_flags_json) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(symbol) DO UPDATE SET original_query=excluded.original_query,company_name=excluded.company_name,status=excluded.status,classification=excluded.classification,evidence_stage=excluded.evidence_stage,isin=excluded.isin,listing_date=excluded.listing_date,candidate_chart_type=excluded.candidate_chart_type,candidate_date=excluded.candidate_date,candidate_time=excluded.candidate_time,candidate_city=excluded.candidate_city,candidate_timezone=excluded.candidate_timezone,source_label=excluded.source_label,history_flags_json=excluded.history_flags_json,request_count=company_admission_requests.request_count+1,last_requested_at=CURRENT_TIMESTAMP`).bind(body.query?.trim()||identity.symbol,identity.symbol,companyName,identity.exchange,status,classification,evidenceStage,identity.listingEvidenceUrl,identity.corporateEvidenceUrl,official?.isin||null,official?.listingDate||null,candidateReady?"listing":null,official?.listingDate||null,candidateReady?"09:15":null,candidateReady?"Mumbai":null,candidateReady?"Asia/Kolkata":null,sourceLabel,JSON.stringify(historyFlags)).run();
  const saved=await db.prepare("SELECT * FROM company_admission_requests WHERE symbol=?").bind(identity.symbol).first<AdmissionRow>();const message=complex?`${companyName} has entered owner review because its exchange history needs a competing-chart check.`:candidateReady?`${companyName} was found in the official NSE securities master. A listing-session candidate has been prepared for owner review.`:`${identity.symbol} has entered official-evidence preparation. It remains outside the approved universe.`;return Response.json({success:true,status:saved?.status||status,message,request:saved?publicRow(saved):null})}
