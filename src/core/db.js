/**
 * Dunne IndexedDB-wrapper (core, briefing 3.3 / 4.1).
 *
 * Bevat geen domein- of moduleweetenschap. Modules geven hun eigen
 * objectstore-definities aan bij het opstarten; deze module bundelt ze in
 * één database-upgrade. Losse requests binnen een transactie worden altijd
 * synchroon (zonder tussenliggende awaits) uitgevoerd, zodat het gedrag
 * consistent is op alle browsers, inclusief oudere WebKit/Safari-versies die
 * een transactie voortijdig konden afsluiten na een microtask.
 */

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * @param {{name: string, version: number, stores: Array<{name: string, keyPath: string, indexes?: Array<{name: string, keyPath: string, options?: object}>}>}} config
 */
export function openDatabase({ name, version, stores }) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of stores) {
        if (!db.objectStoreNames.contains(s.name)) {
          const store = db.createObjectStore(s.name, { keyPath: s.keyPath });
          for (const idx of s.indexes || []) {
            store.createIndex(idx.name, idx.keyPath, idx.options || {});
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () =>
      reject(new Error("De database-upgrade is geblokkeerd: sluit andere open tabs van deze app en probeer opnieuw."));
  });
}

export function getAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readonly");
    const req = t.objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function getAllByIndex(db, storeName, indexName, key) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readonly");
    const req = t.objectStore(storeName).index(indexName).getAll(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function get(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readonly");
    const req = t.objectStore(storeName).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export function put(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readwrite");
    t.objectStore(storeName).put(value);
    t.oncomplete = () => resolve(value);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Transactie afgebroken"));
  });
}

export function putAll(db, storeName, values) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readwrite");
    const store = t.objectStore(storeName);
    for (const v of values) store.put(v);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Transactie afgebroken"));
  });
}

export function del(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readwrite");
    t.objectStore(storeName).delete(key);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Transactie afgebroken"));
  });
}

export function clear(db, storeName) {
  return new Promise((resolve, reject) => {
    const t = db.transaction([storeName], "readwrite");
    t.objectStore(storeName).clear();
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Transactie afgebroken"));
  });
}

/**
 * Vervangt de volledige inhoud van meerdere stores atomair: alles wordt
 * gewist en opnieuw gevuld binnen één IndexedDB-transactie. Mislukt een
 * request, dan breekt de transactie in zijn geheel af en blijft de
 * bestaande data volledig intact (briefing 11.3).
 *
 * @param {IDBDatabase} db
 * @param {Record<string, any[]>} dataByStore
 */
export function bulkReplace(db, dataByStore) {
  const storeNames = Object.keys(dataByStore);
  if (storeNames.length === 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const t = db.transaction(storeNames, "readwrite");
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error || new Error("Transactie afgebroken"));
    for (const name of storeNames) {
      const store = t.objectStore(name);
      store.clear();
      for (const record of dataByStore[name]) {
        store.put(record);
      }
    }
  });
}

/** Wist alle opgegeven stores atomair (gebruikt door "alles verwijderen"). */
export function clearAllStores(db, storeNames) {
  const dataByStore = {};
  for (const name of storeNames) dataByStore[name] = [];
  return bulkReplace(db, dataByStore);
}

export { reqToPromise };
