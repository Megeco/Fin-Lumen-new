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
const cache=new Map();
export default async function handler(req,res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).json({error:'Use GET for research calculations.'});}
 const date=req.query.date===undefined?todayIST():req.query.date;
 if(!validDate(date))return res.status(400).json({error:'Choose a valid date between 1900-01-01 and today (IST).'});
 if(typeof (req.query.query||req.query.ticker)!=='string')return res.status(400).json({error:'A company ticker is required.'});
 const symbol=resolveSymbol(req.query.query||req.query.ticker);
 if(!symbol)return res.status(400).json({error:'Enter an exact exchange ticker, for example MARUTI.NS.'});
 const key=`${symbol}:${date}`;
 try{
   if(cache.has(key))return res.status(200).json(cache.get(key));
   const row=await astroEngine({symbol,asOfDate:date});
   if(!row.astro_model)return res.status(404).json({status:'natal-unavailable',error:'No usable bundled natal chart is available for this company on that date.'});
   const m=row.astro_model;
   const result={success:true,symbol,skyDate:date,engineVersion:m.version,chartBasisLabel:m.natal.chartAuthority,chartConfidence:m.natal.reliability,natalFingerprint:m.natal.chartFingerprint,row:{...row,name:symbol,symbol,company_name:registry[symbol]?.companyName||symbol}};
   if(cache.size>=24)cache.delete(cache.keys().next().value);
   cache.set(key,result);return res.status(200).json(result);
 }catch(error){console.error('Fin-Lumen calculation failed',symbol,date,error.message);return res.status(500).json({error:'Astrology calculation failed: '+error.message});}
}
