const DB_NAME = "lifevault-local-v1";
const DB_VERSION = 1;

type AccountRecord = {
  email: string;
  salt: string;
  iterations: number;
  wrappedDek: string;
  createdAt: string;
};

type ItemRecord = {
  key: string;
  email: string;
  id: string;
  type: string;
  ciphertext: string;
  revision: number;
  deleted: boolean;
  updatedAt: string;
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("المتصفح لا يدعم التخزين المحلي الآمن."));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("accounts")) {
          db.createObjectStore("accounts", { keyPath: "email" });
        }
        if (!db.objectStoreNames.contains("items")) {
          const store = db.createObjectStore("items", { keyPath: "key" });
          store.createIndex("byEmail", "email", { unique: false });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("تعذّر فتح قاعدة البيانات المحلية."));
    });
  }
  return dbPromise;
}

function run<T>(storeName: "accounts" | "items", mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then((db) => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const request = action(tx.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("فشلت عملية التخزين المحلي."));
    tx.onabort = () => reject(tx.error ?? new Error("تم إلغاء عملية التخزين المحلي."));
  }));
}

export const getLocalAccount = (email: string) =>
  run<AccountRecord | undefined>("accounts", "readonly", (s) => s.get(email));

export const createLocalAccount = (account: AccountRecord) =>
  run<IDBValidKey>("accounts", "readwrite", (s) => s.add(account));

export const saveLocalItem = (item: ItemRecord) =>
  run<IDBValidKey>("items", "readwrite", (s) => s.put(item));

export async function listLocalItems(email: string): Promise<ItemRecord[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("items", "readonly");
    const request = tx.objectStore("items").index("byEmail").getAll(IDBKeyRange.only(email));
    request.onsuccess = () => resolve(request.result as ItemRecord[]);
    request.onerror = () => reject(request.error ?? new Error("تعذّر قراءة البيانات المحلية."));
  });
}
