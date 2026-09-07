import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const manifest = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));

if (manifest.name !== "fin-lumen-pure-astro") {
  throw new Error("Refusing cleanup outside the Fin-Lumen project.");
}

const apiRoot = path.join(projectRoot, "pages", "api");
const allowedApiFiles = new Set([
  "engine/stock.js",
  "macro.js",
  "replay.js",
  "replay-lab.js",
]);

async function collectFiles(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(absolute, relative));
    else if (entry.isFile()) files.push({ absolute, relative });
  }

  return files;
}

let removed = 0;
for (const file of await collectFiles(apiRoot)) {
  if (!allowedApiFiles.has(file.relative)) {
    await rm(file.absolute);
    removed += 1;
  }
}

const obsoleteDb = path.join(projectRoot, "lib", "db.js");
await rm(obsoleteDb, { force: true });

console.log(`Prepared clean Fin-Lumen build; removed ${removed} obsolete API file${removed === 1 ? "" : "s"}.`);
