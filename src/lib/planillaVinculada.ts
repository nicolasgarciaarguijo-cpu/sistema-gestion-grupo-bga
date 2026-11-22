// LA PLANILLA VINCULADA AL STOCK (necesita navegador; no se testea en Jest).
// En Chrome/Edge el sistema se queda con el "acceso" al archivo elegido (no con una copia): la proxima vez lee
// el mismo archivo de la carpeta, ya actualizado, sin volver a buscarlo. En otros navegadores se elige cada vez.
import { ensureScript } from "./ocr";
import { SHEETJS_CDN } from "./bankStatement";
import type { HojaPlanilla } from "../domain/planillaStock";

const IDB_NAME = "sistema-gestion-planillas";
const IDB_STORE = "handles";
const CLAVE = "planilla-stock";
const CLAVE_LECTURA = "sistema:planilla-stock:ultima-lectura";

export const sePuedeVincular = (): boolean => typeof window !== "undefined" && typeof (window as any).showOpenFilePicker === "function";

function abrir(): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = (window as any).indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function operar(modo: "readonly" | "readwrite", hacer: (store: any) => any): Promise<any> {
  const db = await abrir();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, modo);
    const req = hacer(tx.objectStore(IDB_STORE));
    tx.oncomplete = () => resolve(req?.result ?? null);
    tx.onerror = () => reject(tx.error);
  });
}

export const planillaVinculada = async (): Promise<any | null> => {
  try {
    return await operar("readonly", (s) => s.get(CLAVE));
  } catch {
    return null;
  }
};
export const desvincularPlanilla = () => operar("readwrite", (s) => s.delete(CLAVE));

/** Abre el buscador de archivos y deja vinculada la planilla elegida. */
export async function elegirPlanilla(): Promise<any> {
  const [handle] = await (window as any).showOpenFilePicker({
    id: "planilla-stock",
    types: [{ description: "Planilla de Excel", accept: { "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"], "application/vnd.ms-excel": [".xls"] } }],
  });
  await operar("readwrite", (s) => s.put(handle, CLAVE));
  return handle;
}

/** El archivo de la planilla vinculada. `pedir` = puede preguntar por el permiso (solo desde un click). */
export async function archivoDe(handle: any, pedir: boolean): Promise<File | null> {
  if (!handle?.getFile) return null;
  const opts = { mode: "read" };
  let estado = handle.queryPermission ? await handle.queryPermission(opts) : "granted";
  if (estado !== "granted" && pedir && handle.requestPermission) estado = await handle.requestPermission(opts);
  if (estado !== "granted") return null;
  return handle.getFile();
}

export async function hojasDelExcel(file: File): Promise<HojaPlanilla[]> {
  await ensureScript(SHEETJS_CDN);
  const XLSX = (window as any).XLSX;
  if (!XLSX?.read) throw new Error("No se pudo cargar el lector de Excel.");
  const libro = XLSX.read(await file.arrayBuffer(), { type: "array" });
  return (libro.SheetNames as string[]).map((nombre) => ({
    nombre,
    filas: XLSX.utils.sheet_to_json(libro.Sheets[nombre], { header: 1, blankrows: true, defval: "", raw: true }) as any[][],
  }));
}

// La ultima lectura (por navegador): para avisar cuando el archivo cambio despues.
export type UltimaLectura = { nombre: string; modificado: number; leidaEl: string; aplicados: number };
export const ultimaLectura = (): UltimaLectura | null => {
  try {
    return JSON.parse(window.localStorage.getItem(CLAVE_LECTURA) || "null");
  } catch {
    return null;
  }
};
export const anotarLectura = (l: UltimaLectura) => {
  try {
    window.localStorage.setItem(CLAVE_LECTURA, JSON.stringify(l));
  } catch {
    /* sin almacenamiento: no se recuerda, no rompe nada */
  }
};
