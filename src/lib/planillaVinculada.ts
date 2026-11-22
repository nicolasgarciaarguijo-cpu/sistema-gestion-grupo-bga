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

// ---------------------------------------------------------------------------------------------------------------
// ESCRIBIR LA PLANILLA (22/11/2026). SheetJS (el lector de arriba) al guardar pierde colores, anchos y formatos; por
// eso para escribir se usa ExcelJS, que los conserva. Probado contra la planilla real de costos: leerla y volver a
// guardarla sin tocar nada deja las 8.512 celdas con el mismo valor y la misma formula.
export const EXCELJS_CDN = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";

const valorDeCelda = (v: any): any => {
  if (v == null) return "";
  if (typeof v !== "object" || v instanceof Date) return v;
  if (Array.isArray(v.richText)) return v.richText.map((t: any) => t?.text ?? "").join("");
  if ("formula" in v || "sharedFormula" in v) return valorDeCelda(v.result);
  if ("text" in v) return valorDeCelda(v.text);
  return ""; // errores (#N/A) y lo que no se entiende
};

/** Abre el Excel para leerlo Y poder escribirlo. Las filas quedan alineadas con el archivo: filas[0] es la fila 1. */
export async function abrirLibro(file: File): Promise<{ libro: any; hojas: HojaPlanilla[] }> {
  await ensureScript(EXCELJS_CDN);
  const ExcelJS = (window as any).ExcelJS;
  if (!ExcelJS?.Workbook) throw new Error("No se pudo cargar el editor de Excel.");
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(await file.arrayBuffer());
  const hojas: HojaPlanilla[] = [];
  libro.eachSheet((ws: any) => {
    const filas: any[][] = [];
    for (let r = 1; r <= ws.rowCount; r++) {
      const fila: any[] = [];
      const row = ws.getRow(r);
      for (let c = 1; c <= ws.columnCount; c++) fila.push(valorDeCelda(row.getCell(c).value));
      filas.push(fila);
    }
    hojas.push({ nombre: ws.name, filas });
  });
  return { libro, hojas };
}

const ENCABEZADO_NUEVO = { font: { bold: true, color: { argb: "FFFFFFFF" } }, fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F3864" } }, alignment: { horizontal: "center", vertical: "middle" } };

/** Escribe en el libro las celdas del plan y devuelve el archivo. Una celda nueva copia el formato de su vecina. */
export async function escribirPlan(libro: any, plan: { celdas: Array<{ hoja: string; fila: number; col: number; valor: string | number }>; hojasNuevas: string[] }): Promise<ArrayBuffer> {
  plan.hojasNuevas.forEach((nombre) => {
    const ws = libro.addWorksheet(nombre, { views: [{ state: "frozen", ySplit: 1 }] });
    ws.columns = [{ width: 12 }, { width: 72 }, { width: 10 }, { width: 16 }, { width: 18 }, { width: 12 }, { width: 18 }];
  });
  plan.celdas.forEach((c) => {
    const ws = libro.getWorksheet(c.hoja);
    if (!ws) return;
    const esNueva = plan.hojasNuevas.includes(c.hoja);
    const row = ws.getRow(c.fila + 1);
    const cell = row.getCell(c.col + 1);
    const sinFormato = !cell.style || Object.keys(cell.style).length === 0;
    if (sinFormato) {
      if (esNueva && c.fila === 0) cell.style = ENCABEZADO_NUEVO;
      else if (!esNueva) {
        // Columna agregada: el titulo copia al titulo de al lado; el dato copia a la primera celda de su fila
        // (el codigo: texto con su borde), sin arrastrar un formato de plata.
        const vecina = c.col > 0 ? row.getCell(c.col) : null;
        const primera = row.getCell(1);
        const modelo = typeof c.valor === "string" && vecina?.style?.fill?.pattern === "solid" ? vecina : primera;
        if (modelo?.style) cell.style = { ...modelo.style, numFmt: undefined };
        const columna = ws.getColumn(c.col + 1);
        if (!columna.width) columna.width = 16;
      }
    }
    cell.value = c.valor;
  });
  return libro.xlsx.writeBuffer();
}

/** Guarda sobre el mismo archivo vinculado. Pide el permiso de escritura (solo desde un click). */
export async function guardarEnPlanilla(handle: any, contenido: ArrayBuffer): Promise<void> {
  if (!handle?.createWritable) throw new Error("Este navegador no puede escribir el archivo.");
  const opts = { mode: "readwrite" };
  let estado = handle.queryPermission ? await handle.queryPermission(opts) : "granted";
  if (estado !== "granted" && handle.requestPermission) estado = await handle.requestPermission(opts);
  if (estado !== "granted") throw new Error("No se dio permiso para escribir la planilla.");
  let salida: any;
  try {
    salida = await handle.createWritable();
  } catch (e: any) {
    // Windows no deja escribir un archivo que esta abierto en Excel.
    throw new Error("No se pudo escribir la planilla. Si está abierta en Excel, cerrala y probá de nuevo.");
  }
  await salida.write(contenido);
  await salida.close();
}

/** Sin acceso al archivo (otros navegadores): la planilla actualizada se descarga. */
export function descargarPlanilla(nombre: string, contenido: ArrayBuffer) {
  const url = URL.createObjectURL(new Blob([contenido], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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
