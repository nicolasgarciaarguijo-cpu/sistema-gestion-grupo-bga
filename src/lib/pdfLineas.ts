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

export async function lineasDelPdf(file: File): Promise<string[]> {
  await ensureScript(PDFJS_CDN);
  const pdfjs: any = (window as any).pdfjsLib;
  if (!pdfjs) throw new Error("No se pudo cargar el lector de PDF");
  pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  const data = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(...lineasDeItems(tc.items as Item[]));
  }
  return out;
}
