// Minimalt IndexedDB-lager för stora JSON-cachar (parkeringsdata, föreskrifter).
// localStorage slår i taket vid ~5–10 MB och kastar QuotaExceededError när t.ex.
// Trafikkontorets alla gaturegler cachas – IndexedDB rymmer i praktiken obegränsat.
// Allt är defensivt: saknas stöd (privat läge m.m.) blir anropen tysta no-ops och
// anroparen faller tillbaka till nätet. Inget externt beroende behövs.

const DB_NAME = "parksthlm-cache";
const STORE_NAME = "kv";
const META_KEY = "__meta-version";
// Höjs när cacheformatet ändras – då rensas hela lagret en gång i stället för att
// gamla poster ska behöva tolkas om.
export const IDB_CACHE_VERSION = 2;

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === "undefined") {
        resolve(null);
        return;
      }
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE_NAME)) {
          request.result.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        // Annan version vill uppgradera: släpp anslutningen och öppna om vid nästa anrop.
        db.onversionchange = () => {
          db.close();
          dbPromise = null;
        };
        resolve(db);
      };
      // Nollställ så nästa anrop får försöka igen i stället för att cacha felet för alltid.
      request.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
      request.onblocked = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function runRequest<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) {
          resolve(null);
          return;
        }
        try {
          const transaction = db.transaction(STORE_NAME, mode);
          transaction.onabort = () => resolve(null);
          const request = run(transaction.objectStore(STORE_NAME));
          request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
          request.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      }),
  );
}

export async function idbGet<T>(key: string): Promise<T | null> {
  try {
    return await runRequest<T>("readonly", (store) => store.get(key));
  } catch {
    return null;
  }
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  try {
    const result = await runRequest<unknown>("readwrite", (store) => store.put(value, key));
    return result !== null;
  } catch {
    return false;
  }
}

export async function idbDel(key: string): Promise<void> {
  try {
    await runRequest("readwrite", (store) => store.delete(key));
  } catch {
    // Cachen är valfri – ett misslyckat borttag stör inte appen.
  }
}

// Rensar allt utom offline-kartrutor (prefix "tile:"), som ska överleva en formatbyte.
async function idbClearExceptTiles(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => resolve();
      transaction.onerror = () => resolve();
      const cursorRequest = transaction.objectStore(STORE_NAME).openCursor();
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) return;
        if (!String(cursor.key).startsWith("tile:")) cursor.delete();
        cursor.continue();
      };
    } catch {
      resolve();
    }
  });
}

// Rensar lagret en gång när formatet ändrats. Anropas vid appstart.
export async function ensureIdbVersion(): Promise<void> {
  try {
    const stored = await idbGet<number>(META_KEY);
    if (stored === IDB_CACHE_VERSION) return;
    await idbClearExceptTiles();
    await idbSet(META_KEY, IDB_CACHE_VERSION);
  } catch {
    // Cachen är valfri – appen fungerar utan den.
  }
}
