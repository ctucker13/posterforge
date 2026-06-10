import type { PosterProject } from "../domain/poster";

const DB_NAME = "posterforge";
const DB_VERSION = 1;

export interface StoredProject {
  id: string;
  name: string;
  poster: PosterProject;
  updatedAt: string;
  createdAt: string;
}

export interface StoredSnapshot {
  id: string;
  projectId: string;
  label: string;
  poster: PosterProject;
  createdAt: string;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("projects")) {
        const store = db.createObjectStore("projects", { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!db.objectStoreNames.contains("snapshots")) {
        const store = db.createObjectStore("snapshots", { keyPath: "id" });
        store.createIndex("projectId", "projectId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  stores: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => IDBRequest<T>,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const req = fn(t);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.onerror = () => reject(t.error);
  });
}

export async function listProjects(): Promise<Omit<StoredProject, "poster">[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction("projects", "readonly");
    const store = t.objectStore("projects");
    const index = store.index("updatedAt");
    const req = index.getAll();
    req.onsuccess = () => {
      // Return lightweight list without the full poster blob; sort newest first
      const items = (req.result as StoredProject[]).map(({ id, name, updatedAt, createdAt }) => ({
        id,
        name,
        updatedAt,
        createdAt,
      }));
      items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function loadProject(id: string): Promise<StoredProject | null> {
  const db = await openDb();
  const result = await tx<StoredProject | undefined>(db, "projects", "readonly", (t) =>
    t.objectStore("projects").get(id),
  );
  return result ?? null;
}

export async function saveProject(id: string, poster: PosterProject): Promise<void> {
  const db = await openDb();
  // Read existing record to preserve createdAt
  const existing = await tx<StoredProject | undefined>(db, "projects", "readonly", (t) =>
    t.objectStore("projects").get(id),
  );
  const now = new Date().toISOString();
  const record: StoredProject = {
    id,
    name: poster.title || "Untitled poster",
    poster,
    updatedAt: now,
    createdAt: existing?.createdAt ?? now,
  };
  await tx<IDBValidKey>(db, "projects", "readwrite", (t) => t.objectStore("projects").put(record));
}

export async function createProject(poster: PosterProject): Promise<string> {
  const id = crypto.randomUUID();
  await saveProject(id, poster);
  return id;
}

export async function deleteProject(id: string): Promise<void> {
  const db = await openDb();
  await tx<undefined>(db, "projects", "readwrite", (t) => t.objectStore("projects").delete(id));
  // Also delete all snapshots for this project
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction("snapshots", "readwrite");
    const index = t.objectStore("snapshots").index("projectId");
    const req = index.openCursor(IDBKeyRange.only(id));
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    req.onerror = () => reject(req.error);
  });
}

export async function snapshotProject(projectId: string, poster: PosterProject, label: string): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: StoredSnapshot = {
    id,
    projectId,
    label,
    poster,
    createdAt: new Date().toISOString(),
  };
  await tx<IDBValidKey>(db, "snapshots", "readwrite", (t) => t.objectStore("snapshots").put(record));
  return id;
}

export async function listSnapshots(projectId: string): Promise<Omit<StoredSnapshot, "poster">[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction("snapshots", "readonly");
    const index = t.objectStore("snapshots").index("projectId");
    const req = index.getAll(IDBKeyRange.only(projectId));
    req.onsuccess = () => {
      const items = (req.result as StoredSnapshot[])
        .map(({ id, projectId: pid, label, createdAt }) => ({ id, projectId: pid, label, createdAt }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Load the most recently updated project id from localStorage (lightweight pointer). */
export function getLastProjectId(): string | null {
  try {
    return localStorage.getItem("posterforge.lastProjectId");
  } catch {
    return null;
  }
}

export function setLastProjectId(id: string): void {
  try {
    localStorage.setItem("posterforge.lastProjectId", id);
  } catch {
    // ignore
  }
}
