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
  compra: "compras",
  "facturas de compra": "compras",
  "factura de compra": "compras",
  "facturas compra": "compras",
  facturas: "facturas-emitidas",
  factura: "facturas-emitidas",
  "facturas emitidas": "facturas-emitidas",
  "factura emitida": "facturas-emitidas",
  "facturas realizadas": "facturas-emitidas",
  "factura realizada": "facturas-emitidas",
  "facturacion y cobranzas": "cobranzas",
  "facturacion y cobranza": "cobranzas",
  facturacion: "cobranzas",
  remitos: "remitos",
  remito: "remitos",
  presupuestos: "presupuestos",
  presupuesto: "presupuestos",
  recibos: "recibos",
  recibo: "recibos",
  "recibos de pago": "recibos",
  banco: "banco",
  bancos: "banco",
  cobranzas: "cobranzas",
  cobranza: "cobranzas",
  "caja chica": "caja-chica",
  escalas: "escalas",
  escala: "escalas",
  "escala salarial": "escalas",
  "escalas salarial": "escalas",
  "escala salariales": "escalas",
  "escalas salariales": "escalas",
  documentacion: "documentacion",
  documentos: "documentacion",
  personal: "personal",
};

const MONTH_RE = /^\d{4}-\d{2}$/;
const PERSONAL_SUBAREAS = [
  "documentacion",
  "epp",
  "recibos",
  "seguridad",
  "insumos",
  "examenes",
  "capacitaciones",
  "presentismo",
];
// Subcarpetas dentro de la carpeta de un trabajo (Trabajos aprobados/<cliente>/<trabajo>/<sub>/) y el
// tipo de documento con el que se ingresa lo que el usuario deje ahi. "planos" se maneja aparte (se
// adjunta como plano del trabajo, no como documento suelto).
const JOB_SUBFOLDER_TO_TYPE: Record<string, LinkedDocumentType> = {
  facturas: "facturas-emitidas",
  "pagos y tickets": "recibos",
  pagos: "recibos",
  remitos: "remitos",
};
// Palabras que identifican una carpeta de escalas salariales, en cualquier nivel de la ruta.
const ESCALA_KEYWORDS = [
  "escalas",
  "escala",
  "escala salarial",
  "escalas salariales",
  "escala salariales",
  "escalas salarial",
  "escalas salariales",
];

// Clasifica una ruta relativa (segmentos separados por "/") en tipo/mes/empleado/subArea.
export function classifyPath(relPath: string): PathClassification {
  const segments = relPath.split("/").filter(Boolean);
  if (segments.length === 0) return { docType: null, month: "" };
  const normSegs = segments.map(norm);
  const month = normSegs.find((seg) => MONTH_RE.test(seg)) ?? "";

  // La escala salarial tiene prioridad: si aparece en CUALQUIER segmento (incluso Personal/Escalas...),
  // se clasifica como "escalas" para que el sistema la lea e importe los valores.
  if (normSegs.some((seg) => ESCALA_KEYWORDS.includes(seg))) {
    return { docType: "escalas", month };
  }

  const top = normSegs[0];

  // Trabajos aprobados/<cliente>/<trabajo>/<sub>/archivo: lo que el usuario deja en Facturas / Pagos y
  // tickets / Remitos se ingresa como documento de ese tipo (doble via). Los .html que genera el propio
  // export se ignoran (no se re-suben). "planos" queda en null: lo adjunta el flujo de planos aparte.
  if (top === "trabajos aprobados") {
    const isHtml = /\.html$/.test(normSegs[normSegs.length - 1] || "");
    const sub = normSegs.find((seg) => JOB_SUBFOLDER_TO_TYPE[seg]);
    return { docType: sub && !isHtml ? JOB_SUBFOLDER_TO_TYPE[sub] : null, month };
  }

  const docType = TOP_FOLDER_TO_TYPE[top] ?? null;

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

// Verifica (o pide) permiso de ESCRITURA sobre el handle (para exportar archivos a la carpeta).
export async function ensureWritePermission(handle: any): Promise<boolean> {
  if (!handle || typeof handle.queryPermission !== "function") return false;
  const opts = { mode: "readwrite" };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

// Borra los archivos .html HUERFANOS (que ya no estan en `keep`) dentro de las carpetas indicadas.
// SOLO toca archivos .html (los que genera el export); nunca los archivos cargados por el usuario
// (fotos/PDF/tickets). Devuelve cuantos borro. Pensado para que el export refleje el sistema.
export async function cleanOrphanHtmlFiles(
  rootHandle: any,
  topFolders: string[],
  keep: Set<string>
): Promise<number> {
  let removed = 0;
  const walk = async (dirHandle: any, prefix: string): Promise<void> => {
    const iterator = dirHandle.values();
    const toDelete: string[] = [];
    while (true) {
      const next = await iterator.next();
      if (next.done) break;
      const entry = next.value;
      const path = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.kind === "directory") {
        await walk(entry, path);
      } else if (entry.kind === "file" && /\.html$/i.test(entry.name) && !keep.has(path)) {
        toDelete.push(entry.name);
      }
    }
    for (const name of toDelete) {
      try {
        await dirHandle.removeEntry(name);
        removed += 1;
      } catch {
        // si no se puede borrar, se ignora
      }
    }
  };
  for (const top of topFolders) {
    try {
      const dir = await rootHandle.getDirectoryHandle(top, { create: false });
      await walk(dir, top);
    } catch {
      // la carpeta no existe: nada que limpiar
    }
  }
  return removed;
}

// Crea (si falta) la carpeta en la ruta relativa dada. Ej: ensureFolder(h, "Presupuestos/Juan Perez").
export async function ensureFolder(rootHandle: any, relPath: string): Promise<void> {
  const parts = relPath.split("/").filter(Boolean);
  let dir = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
}

// Escribe un archivo de texto (o Blob) en rootHandle, en la ruta relativa dada, creando las
// subcarpetas que falten. Ej: writeFileToFolder(h, "Manuales/Juan/Manual.html", html).
export async function writeFileToFolder(
  rootHandle: any,
  relPath: string,
  content: string | Blob
): Promise<void> {
  const parts = relPath.split("/").filter(Boolean);
  const fileName = parts.pop();
  if (!fileName) throw new Error("Ruta de archivo invalida.");
  let dir = rootHandle;
  for (const part of parts) {
    dir = await dir.getDirectoryHandle(part, { create: true });
  }
  const fileHandle = await dir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content as any);
  await writable.close();
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
