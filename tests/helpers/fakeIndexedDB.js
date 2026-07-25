/**
 * Minimale, in-memory nabootsing van de IndexedDB-API voor geautomatiseerde
 * tests (node --test heeft geen ingebouwde IndexedDB en het project mag geen
 * externe testdependency toevoegen). Implementeert alleen het deel van de
 * API dat src/core/db.js daadwerkelijk gebruikt: open (met/zonder versie),
 * onupgradeneeded/onsuccess/onerror, createObjectStore/createIndex,
 * transaction/objectStore en get/getAll/index().getAll()/put/delete/clear.
 * Geen keyranges, cursors of echte transactie-isolatie: voldoende om onze
 * eigen opslaglogica te testen, niet om IndexedDB zelf te testen.
 */

class FakeDOMException extends Error {
  constructor(message, name) {
    super(message);
    this.name = name;
  }
}

class FakeRequest {
  constructor() {
    this.onsuccess = null;
    this.onerror = null;
    this.result = undefined;
    this.error = null;
  }
  _succeed(result) {
    this.result = result;
    queueMicrotask(() => this.onsuccess && this.onsuccess({ target: this }));
  }
  _fail(error) {
    this.error = error;
    queueMicrotask(() => this.onerror && this.onerror({ target: this }));
  }
}

function makeStoreHandle(storeState) {
  return {
    get(key) {
      const req = new FakeRequest();
      req._succeed(storeState.records.get(key));
      return req;
    },
    getAll() {
      const req = new FakeRequest();
      req._succeed(Array.from(storeState.records.values()));
      return req;
    },
    put(value) {
      storeState.records.set(value[storeState.keyPath], value);
      const req = new FakeRequest();
      req._succeed(value[storeState.keyPath]);
      return req;
    },
    delete(key) {
      storeState.records.delete(key);
      const req = new FakeRequest();
      req._succeed(undefined);
      return req;
    },
    clear() {
      storeState.records.clear();
      const req = new FakeRequest();
      req._succeed(undefined);
      return req;
    },
    index(indexName) {
      const idx = storeState.indexes.get(indexName);
      if (!idx) throw new FakeDOMException(`Index '${indexName}' not found`, "NotFoundError");
      return {
        getAll(key) {
          const req = new FakeRequest();
          req._succeed(Array.from(storeState.records.values()).filter((r) => r[idx.keyPath] === key));
          return req;
        },
      };
    },
  };
}

function makeTransaction(dbState, storeNames) {
  for (const name of storeNames) {
    if (!dbState.stores.has(name)) {
      throw new FakeDOMException("One of the specified object stores was not found.", "NotFoundError");
    }
  }
  const tx = { oncomplete: null, onerror: null, onabort: null, error: null };
  tx.objectStore = (name) => {
    if (!storeNames.includes(name)) {
      throw new FakeDOMException(`Store '${name}' not in transaction scope`, "NotFoundError");
    }
    return makeStoreHandle(dbState.stores.get(name));
  };
  queueMicrotask(() => tx.oncomplete && tx.oncomplete());
  return tx;
}

function makeFakeDb(dbState) {
  return {
    get version() {
      return dbState.version;
    },
    get objectStoreNames() {
      return {
        contains: (name) => dbState.stores.has(name),
        get length() {
          return dbState.stores.size;
        },
        [Symbol.iterator]: () => dbState.stores.keys(),
      };
    },
    createObjectStore(name, { keyPath }) {
      const store = { keyPath, records: new Map(), indexes: new Map() };
      dbState.stores.set(name, store);
      return {
        createIndex(indexName, indexKeyPath) {
          store.indexes.set(indexName, { keyPath: indexKeyPath });
        },
      };
    },
    deleteObjectStore(name) {
      dbState.stores.delete(name);
    },
    transaction(storeNames, _mode) {
      return makeTransaction(dbState, storeNames);
    },
    close() {},
  };
}

export function createFakeIndexedDB() {
  const databases = new Map();

  function open(name, version) {
    const req = new FakeRequest();
    queueMicrotask(() => {
      let dbState = databases.get(name);
      if (!dbState) {
        dbState = { version: 0, stores: new Map() };
        databases.set(name, dbState);
      }
      const targetVersion = version == null ? Math.max(dbState.version, 1) : version;
      if (targetVersion < dbState.version) {
        req._fail(
          new FakeDOMException(
            `The requested version (${targetVersion}) is less than the existing version (${dbState.version}).`,
            "VersionError"
          )
        );
        return;
      }
      const fakeDb = makeFakeDb(dbState);
      req.result = fakeDb;
      if (targetVersion > dbState.version) {
        dbState.version = targetVersion;
        if (req.onupgradeneeded) req.onupgradeneeded({ target: req });
      }
      if (req.onsuccess) req.onsuccess({ target: req });
    });
    return req;
  }

  function deleteDatabase(name) {
    const req = new FakeRequest();
    queueMicrotask(() => {
      databases.delete(name);
      req._succeed(undefined);
    });
    return req;
  }

  return { open, deleteDatabase };
}
