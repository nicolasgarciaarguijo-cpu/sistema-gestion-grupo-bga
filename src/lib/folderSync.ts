// Carga por carpetas vinculadas (F1). Usa la File System Access API (Chrome/Edge): el usuario vincula
// UNA carpeta raiz ("Sistema de Gestion"), el navegador recuerda el permiso (handle en IndexedDB) y al
// sincronizar se recorren las subcarpetas, se clasifican por tipo/mes y se detectan archivos nuevos.
// La clasificacion (classifyPath) es pura y esta testeada; el resto son wrappers del navegador.

import type { LinkedDocumentType } from "../domain/types";

export type ScannedFile = {
  relPath: string; // ruta relativa dentro de la carpeta raiz
  name: string;
  size: number;
  lastModified: number;
  handle: any; // FileSystemFileHandle (para leer el File al subir)
};

export type PathClassification = {
  docType: LinkedDocumentType | null;
  month: string; // "YYYY-MM" o ""
  employee?: string;
  subArea?: string;
};

// Normaliza un nombre de carpeta: minusculas, sin acentos, sin espacios de mas.
const norm = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// Mapea la carpeta de primer nivel al tipo de documento. Acepta variantes comunes.
const TOP_FOLDER_TO_TYPE: Record<string, LinkedDocumentType> = {
  compras: "compras",
  "facturas de compra": "compras",
  "facturas emitidas": "facturas-emitidas",
  "facturas realizadas": "facturas-emitidas",
  remitos: "remitos",
  banco: "banco",
  bancos: "banco",
  cobranzas: "cobranzas",
  "caja chica": "caja-chica",
  escalas: "escalas",
  "escalas salariales": "escalas",
  documentacion: "documentacion",
  personal: "personal",
};

const MONTH_RE = /^\d{4}-\d{2}$/;
const PERSONAL_SUBAREAS = ["documentacion", "epp", "recibos", "seguridad"];

// Clasifica una ruta relativa (segmentos separados por "/") en tipo/mes/empleado/subArea.
export function classifyPath(relPath: string): PathClassification {
  const segments = relPath.split("/").filter(Boolean);
  if (segments.length === 0) return { docType: null, month: "" };
  const top = norm(segments[0]);
  const docType = TOP_FOLDER_TO_TYPE[top] ?? null;
  const month = segments.map(norm).find((seg) => MONTH_RE.test(seg)) ?? "";

  if (docType === "personal" && segments.length >= 2) {
    const employee = segments[1];
    const subAreaSeg = segments.slice(2).find((seg) => PERSONAL_SUBAREAS.includes(norm(seg)));
    return { docType, month, employee, subArea: subAreaSeg };
  }
  return { docType, month };
}

// ---- Wrappers del navegador (no testeados en Jest; requieren Chrome/Edge) ----

export function isFileSystemAccessSupported(): boolean {
  return typeof window !== "undefined" && typeof (window as any).showDirectoryPicker === "function";
}

const IDB_NAME = "sistema-gestion-fs";
const IDB_STORE = "handles";
const HANDLE_KEY = "documentos-root";

function openIdb(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = (window as any).indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDirHandle(handle: any): Promise<void> {
  const db = await openIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY);
    tx.oncomplete = () => resolve(null);
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadDirHandle(): Promise<any | null> {
  const db = await openIdb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function clearDirHandle(): Promise<void> {
  const db = await openIdb();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).delete(HANDLE_KEY);
    tx.oncomplete = () => resolve(null);
    tx.onerror = () => reject(tx.error);
  });
}

export async function pickDirectory(): Promise<any> {
  return (window as any).showDirectoryPicker({ id: "sistema-gestion", mode: "read" });
}

// Verifica (o pide) permiso de lectura sobre el handle. Devuelve true si quedo concedido.
export async function ensureReadPermission(handle: any): Promise<boolean> {
  if (!handle || typeof handle.queryPermission !== "function") return false;
  const opts = { mode: "read" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

// Recorre recursivamente el directorio y devuelve todos los archivos con su ruta relativa.
export async function scanDirectory(rootHandle: any): Promise<ScannedFile[]> {
  const out: ScannedFile[] = [];
  const walk = async (dirHandle: any, prefix: string): Promise<void> => {
    // Iteracion manual del async iterator para no depender de for-await-of (target ES5).
    const iterator = dirHandle.values();
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      const entry = next.value;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        await walk(entry, path);
      } else if (entry.kind === "file") {
        const file = await entry.getFile();
        out.push({
          relPath: path,
          name: entry.name,
          size: file.size,
          lastModified: file.lastModified,
          handle: entry,
        });
      }
    }
  };
  await walk(rootHandle, "");
  return out;
}
