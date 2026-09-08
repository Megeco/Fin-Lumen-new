import { astroEngine } from '../../../lib/astroEngine.js';
import registry from '../../../lib/natalRegistry.js';

export const config = { maxDuration: 60 };
export function todayIST() {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(p=>[p.type,p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function validDate(value) {
  return typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value+'T12:00:00Z')) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value && value>='1900-01-01' && value<=todayIST();
}
function resolveSymbol(query) {
 const input=String(query||'').trim().toUpperCase();
 if (!input || input.length>120) return null;
 const key=Object.keys(registry).find(key=>key.toUpperCase()===input || key.toUpperCase()===input+'.NS' || String(registry[key].companyName||'').toUpperCase()===input);
 if(key)return key;
 return /^[A-Z0-9&-]+(?:\.(NS|BO))?$/.test(input)?(/\.(NS|BO)$/.test(input)?input:input+'.NS'):null;
}
function candidateOverride(value, symbol) {
 const candidate=value&&typeof value==='object'?value:null;
 if(!candidate)return null;
 const date=String(candidate.listingDate||candidate.birthDate||'').trim();
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T12:00:00Z')))return null;
 const companyName=String(candidate.companyName||symbol).trim().slice(0,160)||symbol;
 const source=String(candidate.source||'Official exchange listing record').trim().slice(0,500);
 return {
   name:symbol,
   symbol,
   companyName,
   chartType:'listing',
   birthDate:date,
   listingDate:date,
   birthTime:'09:15',
   city:'Mumbai',
   country:'India',
   timezone:'Asia/Kolkata',
   confidence:'low',
   source,
   sourceNote:source,
   sourceVerification:'verified-primary-source',
   anchorValidation:'untested',
   timePrecision:'exchange-open-default',
   capitalAuthorityCeiling:'RESEARCH_ONLY',
   auditStatus:'automatic-official-listing-proxy',
   validationEligibility:'provisional-listing-research',
   charts:[{id:'listing-proxy',chartType:'listing',date,time:'09:15',city:'Mumbai',country:'India',timezone:'Asia/Kolkata',confidence:'low',source}]
 };
}
const cache=new Map();
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Use GET or POST for research calculations.'});}
 const input=req.method==='POST'?(req.body||{}):req.query;
 const date=input.date===undefined?todayIST():input.date;
 if(!validDate(date))return res.status(400).json({error:'Choose a valid date between 1900-01-01 and today (IST).'});
 if(typeof (input.query||input.ticker||input.symbol)!=='string')return res.status(400).json({error:'A company ticker is required.'});
 const symbol=resolveSymbol(input.query||input.ticker||input.symbol);
 if(!symbol)return res.status(400).json({error:'Enter an exact exchange ticker, for example MARUTI.NS.'});
 const natalCandidate=candidateOverride(input.natalCandidate,symbol);
 const key=`${symbol}:${date}:${natalCandidate?.listingDate||'registry'}`;
 try{
   if(cache.has(key))return res.status(200).json(cache.get(key));
   const row=await astroEngine({symbol,asOfDate:date,...(natalCandidate||{})});
   if(!row.astro_model)return res.status(404).json({status:'natal-unavailable',error:`${symbol} is not yet in Fin-Lumen’s reviewed natal registry. No reading was created.`});
   const m=row.astro_model;
   const result={success:true,symbol,skyDate:date,engineVersion:m.version,chartBasisLabel:natalCandidate?'Official listing-session proxy · provisional':m.natal.chartAuthority,chartConfidence:natalCandidate?Math.min(45,Number(m.natal.reliability||45)):m.natal.reliability,natalFingerprint:m.natal.chartFingerprint,natalCandidate:natalCandidate?{...natalCandidate,charts:undefined}:undefined,row:{...row,name:symbol,symbol,company_name:registry[symbol]?.companyName||natalCandidate?.companyName||symbol}};
   if(cache.size>=24)cache.delete(cache.keys().next().value);
   cache.set(key,result);return res.status(200).json(result);
 }catch(error){console.error('Fin-Lumen calculation failed',symbol,date,error.message);return res.status(500).json({error:'Astrology calculation failed: '+error.message});}
}
