import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("renders the completed private-beta shell", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  const html = await response.text();
  assert.match(html, /<title>Fin-Lumen Subscriber Dashboard<\/title>/i);
  assert.match(html, /Private beta/i);
  assert.match(html, /Replay Lab/i);
  assert.match(html, /Historical Sky Replay/i);
  assert.match(html, /Run v37\.9\.14 under a past sky/i);
  assert.match(html, /Reading guide/i);
  assert.match(html, /\/ 100/i);
  assert.match(html, /Cache-first/i);
  assert.doesNotMatch(html, /name=["']codex-preview["']/i);
  assert.doesNotMatch(html, /ready for the sealed historical snapshot/i);

  const dashboardSource = await readFile(
    new URL("../app/dashboard.tsx", import.meta.url),
    "utf8",
  );
  assert.match(dashboardSource, /RESEARCH VIEW · v37\.9\.14/i);
  assert.match(dashboardSource, /fetchHistoricalReplay/i);
});
