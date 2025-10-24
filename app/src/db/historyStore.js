const DB_NAME = 'zbarWasmScanner';
const STORE_NAME = 'scanHistory';
const DB_VERSION = 1;

let dbPromise;

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export function initHistoryStore() {
  if (!dbPromise) {
    dbPromise = openDatabase();
  }
  return dbPromise;
}

export async function addScanRecord(entry) {
  const db = await initHistoryStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const timestamp = entry.createdAt ?? Date.now();
    const payload = {
      type: entry.type,
      typeName: entry.typeName,
      data: entry.data,
      createdAt: timestamp,
      source: entry.source ?? 'camera'
    };
    const request = store.add(payload);

    request.onsuccess = () => {
      resolve({ ...payload, id: request.result });
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAllRecords() {
  const db = await initHistoryStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const createdAtIndex = store.index('createdAt');
    const records = [];

    createdAtIndex.openCursor(null, 'prev').onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        records.push(cursor.value);
        cursor.continue();
      } else {
        resolve(records);
      }
    };

    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllRecords() {
  const db = await initHistoryStore();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
