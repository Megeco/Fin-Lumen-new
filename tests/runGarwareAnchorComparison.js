import { writeFile } from "node:fs/promises";
import { astroEngine } from "../lib/astroEngine.js";

const charts = [
  { chartId: "incorporation", role: "legal-origin-low-source", start: "2022-10-15", end: "2026-06-15" },
  { chartId: "listing", role: "original-market-expression", start: "2022-10-15", end: "2026-06-15" },
  { chartId: "listed-name-change-2022", role: "renamed-market-identity-control", start: "2022-10-15", end: "2026-06-15" }
];

const labelled = [
  ["FORMATION_M6", "2022-10-15"], ["FORMATION_M3", "2023-01-15"], ["FORMATION_W6", "2023-03-01"],
  ["RERATING_IGNITION", "2023-04-15"], ["IGNITION_P6W", "2023-06-01"], ["IGNITION_P3M", "2023-07-15"],
  ["BREAK_M6", "2024-07-15"], ["BREAK_M3", "2024-10-15"], ["BREAK_W6", "2024-12-01"],
  ["BREAK_START", "2025-01-15"], ["BREAK_P6W", "2025-03-01"], ["BREAK_P3M", "2025-04-15"],
  ["DECLINE_MID", "2025-06-15"], ["DECLINE_END", "2025-08-15"], ["RECOVERY_START", "2025-09-15"],
  ["RECOVERY_P6W", "2025-11-01"], ["SECOND_RERATING", "2026-01-15"], ["SECOND_RERATING_P3M", "2026-04-15"]
].map(([type,date]) => ({type,date}));

function monthlyDates(start, end) {
  const out=[]; const d=new Date(`${start}T00:00:00Z`); const z=new Date(`${end}T00:00:00Z`);
  while(d<=z){out.push(d.toISOString().slice(0,10));d.setUTCMonth(d.getUTCMonth()+1);} return out;
}
const contact = c => ({planet:c.planet,target:c.targetPlanet,aspect:c.aspect,orb:c.orb,score:c.score,eclipseDate:c.eclipseDate||null});
function summarise(x){const c=x._researchContext||{},r=c.resonance||{};const contacts=[...(r.transitDetails||[])].sort((a,b)=>Math.abs(b.score||0)-Math.abs(a.score||0));return {
  chart:{id:x.natal_chart_id||c.company?.selectedChartId,type:x.natal_chart_type||c.company?.chartType,date:x.natal_birth_date||c.company?.birthDate,authority:c.company?.validationEligibility||c.company?.confidence},
  stock:{expansion:r.expansionScore,pressure:r.pressureScore,leadership:r.leadershipProbability,volatility:r.volatility,regime:r.regime},
  macro:{environment:c.macro?.environment,expansion:c.macro?.expansion,pressure:c.macro?.pressure,volatility:c.macro?.volatility},
  slowContacts:contacts.filter(v=>["Jupiter","Saturn","Rahu","Ketu","Eclipse"].includes(v.planet)).slice(0,16).map(contact),topContacts:contacts.slice(0,16).map(contact)};}

const dates=[...new Set([...charts.flatMap(c=>monthlyDates(c.start,c.end)),...labelled.map(x=>x.date)])].sort();
const snapshots=[];
for(const c of charts){for(const date of dates){const x=await astroEngine({symbol:"GRWRHITECH.NS",asOfDate:date,chartId:c.chartId,includeResearchContext:true});snapshots.push({...c,date,...summarise(x)});}}
const output={methodology:{engine:"Fin-Lumen Pure Astro v37.7.0 preserved Swiss-backed engine",rule:"anchors read separately; no averaging; labels fixed before replay; proxy-time Moon/angles/houses non-decisive"},labelled,charts,snapshots};
const out=new URL("../../Fin-Lumen-Garware-Anchor-Comparison-Raw.json",import.meta.url);await writeFile(out,`${JSON.stringify(output,null,2)}\n`);console.log(`wrote ${out.pathname}: ${snapshots.length} snapshots`);
