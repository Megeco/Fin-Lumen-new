import assert from 'node:assert/strict';
import fs from 'node:fs';
import { astroEngine } from '../lib/astroEngine.js';
import stockHandler from '../pages/api/engine/stock.js';
import replayHandler from '../pages/api/replay.js';
import { swissRuntimeAudit } from '../lib/swissEphemerisRuntime.js';
async function call(handler,query,method='GET'){
 let code=200,body;const headers={};
 await handler({query,method},{setHeader(k,v){headers[k]=v},status(c){code=c;return this},json(b){body=b;return this}});
 return {code,body,headers};
}
const results=[];
for(const [symbol,date] of [['ICICIBANK.NS','2024-08-15'],['HDFCBANK.NS','2026-09-07'],['NEWGEN.NS','2025-04-02'],['GRWRHITECH.NS','2026-09-07'],['BHARTIARTL.NS','2026-09-07'],['GVT&D.NS','2025-01-15']]){
 const direct=await astroEngine({symbol,asOfDate:date});
 const api=await call(stockHandler,{query:symbol,date});
 assert.equal(api.code,200,JSON.stringify(api.body));
 assert.deepEqual(api.body.row.astro_model,direct.astro_model,symbol+' engine drift');
 const replay=await call(replayHandler,{ticker:symbol,date});
 assert.deepEqual(replay.body.row.astro_model,direct.astro_model,symbol+' replay drift');
 assert.equal(api.body.skyDate,date);assert.equal(api.headers['Cache-Control'],'no-store');
 results.push({symbol,date,state:direct.astro_model.current.state,expansion:direct.astro_model.scores.expansion,pressure:direct.astro_model.scores.pressure});
}
for(const date of ['2025-02-30','2026-13-01','garbage','1899-12-31','2099-01-01'])assert.equal((await call(stockHandler,{query:'TCS',date})).code,400);
assert.equal((await call(stockHandler,{query:'TCS',date:['2024-01-01']})).code,400);
assert.equal((await call(stockHandler,{query:'TCS'},'POST')).code,405);
assert.equal((await call(stockHandler,{query:'THISCOMPANYDOESNOTEXIST'})).code,404);
const unsupported=await call(stockHandler,{query:'BALUFORGE.NS',date:'2026-09-07'});
assert.equal(unsupported.code,404);
assert.match(unsupported.body.error,/reviewed natal registry/);
const source=fs.readFileSync(new URL('../components/dashboard.tsx',import.meta.url),'utf8');
assert(!source.includes('2026-08-20'),'Static publication date survived');
assert(!source.includes('/api/company-admissions'),'Shared request queue survived');
assert(source.includes('drawer-expanded'),'GPT expanded-card state is missing');
assert(source.includes('Open in new tab'),'New-tab card control is missing');
assert(source.includes('Personal build 37.9.14.2'),'Visible deployment marker is missing');
const packageJson=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8'));
assert(!Object.keys(packageJson.dependencies).some(name=>name.toLowerCase().includes('supabase')),'External database dependency survived');
console.table(results);console.log('Swiss runtime:',JSON.stringify(swissRuntimeAudit(new Date('2026-09-07T12:00:00Z'))));
console.log('PASS: six direct/API/replay comparisons, strict input validation, read-only endpoint, no static publication or shared request queue.');
