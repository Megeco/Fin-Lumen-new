export type CachedReading<T> = {
  ticker: string;
  skyDate: string;
  engineVersion: string;
  natalFingerprint: string;
  cachedAt: string;
  reading: T;
};

const DB_NAME = "finlumen-private-beta";
const STORE_NAME = "readings";
const DB_VERSION = 1;

function openCache(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: "ticker" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCachedReadings<T>(): Promise<CachedReading<T>[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as CachedReading<T>[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => db.close();
  });
}

export async function cacheReading<T>(entry: CachedReading<T>): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openCache();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(entry);
    transaction.oncomplete = () => { db.close(); resolve(); };
    transaction.onerror = () => { db.close(); reject(transaction.error); };
  });
}
