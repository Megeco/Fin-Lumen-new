// Process-local store for manual natal entries used by research tools.
function store() {
  if (!globalThis.__FINLUMEN_NATAL_MEMORY_REGISTRY__) {
    globalThis.__FINLUMEN_NATAL_MEMORY_REGISTRY__ = {};
  }
  return globalThis.__FINLUMEN_NATAL_MEMORY_REGISTRY__;
}

function normalizeSymbol(value) {
  return String(value || "").trim().toUpperCase();
}

export function setMemoryNatalEntry(symbol, row) {
  const key = normalizeSymbol(symbol || row?.symbol || row?.ticker || row?.name);
  if (!key) return null;
  const payload = { ...row, symbol: key, memory_registry: true, updated_at: row?.updated_at || new Date().toISOString() };
  store()[key] = payload;
  return payload;
}

export function getMemoryNatalEntries() {
  return { ...store() };
}

export function clearMemoryNatalEntry(symbol) {
  const key = normalizeSymbol(symbol);
  if (key && store()[key]) delete store()[key];
}
