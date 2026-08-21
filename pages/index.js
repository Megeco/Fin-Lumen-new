import Head from "next/head";
import Dashboard from "../components/Dashboard.js";

export default function Home() {
  return (
    <>
      <Head>
        <title>Fin-Lumen · Pure Astro Research</title>
        <meta name="description" content="Fin-Lumen v37.9.14 astro-driven phase research, Replay Lab and full research view." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" />
      </Head>
      <Dashboard />
    </>
  );
}
