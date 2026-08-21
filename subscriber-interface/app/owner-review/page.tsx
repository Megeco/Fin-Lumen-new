import Link from "next/link";
import { requireChatGPTUser } from "../chatgpt-auth";
import OwnerReview from "./owner-review";

export const dynamic = "force-dynamic";

export default async function OwnerReviewPage(){const user=await requireChatGPTUser("/owner-review");const owner=String(process.env.FINLUMEN_OWNER_EMAIL||"").trim().toLowerCase();if(!owner||user.email.toLowerCase()!==owner)return <main className="owner-denied"><div><span className="brand-mark">FL</span><h1>Owner access only.</h1><p>This review queue can change natal-admission status and is restricted to the Fin-Lumen owner.</p><Link href="/">Return to dashboard</Link></div></main>;return <main className="owner-page"><header className="topbar"><Link className="brand" href="/"><span className="brand-mark">FL</span><span><strong>FIN–LUMEN</strong><small>NATAL ADMISSION SERVICE</small></span></Link><div className="header-right"><span className="asof"><b>Owner workspace</b> · source evidence before astrology</span></div></header><OwnerReview/></main>}
