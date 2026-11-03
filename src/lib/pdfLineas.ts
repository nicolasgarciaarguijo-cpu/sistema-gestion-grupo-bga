// LINEAS DE UN PDF con pdf.js (por CDN con ensureScript, igual que SheetJS: sin dependencias nuevas). A
// diferencia de lib/pdfExtract.ts (que solo junta strings), pdf.js entiende las fuentes y las posiciones:
// cada renglon visual del PDF vuelve como una linea, con los textos ordenados de izquierda a derecha y dos
// espacios donde hay un hueco de columna. Es lo que consume domain/lectorResumenTarjeta.ts.
import { ensureScript } from "./ocr";

export const PDFJS_CDN = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js";
const PDFJS_WORKER = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

type Item = { str: string; transform: number[]; width: number };

// Agrupa los textos de una hoja en renglones (misma altura, ±2 puntos) y los une.
export function lineasDeItems(items: Item[]): string[] {
  const filas: Array<{ y: number; items: Array<{ x: number; s: string; w: number }> }> = [];
  items.forEach((it) => {
    if (!it.str || !it.str.trim()) return;
    const x = it.transform[4];
    const y = it.transform[5];
    let fila = filas.find((f) => Math.abs(f.y - y) <= 2);
    if (!fila) {
      fila = { y, items: [] };
      filas.push(fila);
    }
    fila.items.push({ x, s: it.str, w: it.width });
  });
  return filas
    .sort((a, b) => b.y - a.y)
    .map((f) => {
      let texto = "";
      let fin: number | null = null;
      f.items
        .sort((a, b) => a.x - b.x)
        .forEach((it) => {
          if (fin !== null) texto += it.x - fin > 8 ? "  " : it.x - fin > 0.5 ? " " : "";
          texto += it.s;
          fin = it.x + it.w;
        });
      return texto.replace(/\s+$/, "");
    });
}

async function abrirPdf(file: File): Promise<any> {
  await ensureScript(PDFJS_CDN);
  const pdfjs: any = (window as any).pdfjsLib;
  if (!pdfjs) throw new Error("No se pudo cargar el lector de PDF");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const data = new Uint8Array(await file.arrayBuffer());
  return pdfjs.getDocument({ data }).promise;
}

export async function lineasDelPdf(file: File): Promise<string[]> {
  const doc = await abrirPdf(file);
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(...lineasDeItems(tc.items as Item[]));
  }
  return out;
}

// LECTOR DE PDF DE TODO EL SISTEMA (03/11/2026: "no lo estoy pudiendo usar ni para facturas, ni para escalas"). El
// lector casero (lib/pdfExtract) no entiende las fuentes de las facturas de ARCA/Tango (devolvia nada o basura y el
// sistema decia "parece escaneado") ni ordena las tablas. pdf.js si: cada renglon del PDF es una linea.
export async function textoDelPdf(file: File): Promise<string> {
  return (await lineasDelPdf(file)).join("\n");
}

// Un texto "de verdad" (no los bytes de una fuente embebida): casi todo letras, numeros y puntuacion comun.
export function pareceTexto(s: string): boolean {
  const limpio = (s || "").replace(/\s/g, "");
  if (limpio.length < 40) return false;
  const buenos = (limpio.match(/[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ.,:;/$%()\-+*#°º'"]/g) || []).length;
  return buenos / limpio.length > 0.9;
}

// La hoja `n` del PDF como imagen PNG, para pasarla por el OCR cuando el PDF es un escaneo (sin texto).
export async function hojaDelPdfComoImagen(file: File, n = 1): Promise<Blob> {
  const doc = await abrirPdf(file);
  const page = await doc.getPage(Math.min(Math.max(1, n), doc.numPages));
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo preparar la imagen del PDF");
  await page.render({ canvasContext: ctx, viewport }).promise;
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo pasar el PDF a imagen"))), "image/png")
  );
}
