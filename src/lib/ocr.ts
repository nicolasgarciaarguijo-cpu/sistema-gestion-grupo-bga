// OCR de tickets/facturas para caja chica. Carga Tesseract.js por CDN (bajo demanda) y lee la imagen;
// parseTicket() extrae monto/fecha/proveedor del texto. Como el OCR de fotos no es 100% preciso, el
// flujo SIEMPRE termina en una confirmacion del usuario (el parser precompleta, el usuario verifica).
import { extractPdfRawText } from "./pdfExtract";

export type TicketData = {
  amount: number;
  date: string; // ISO yyyy-mm-dd o ""
  supplier: string;
  rawText: string;
};

// --- Parser (puro, testeable) ---

// Convierte un numero en formato argentino ("1.234,56", "1234,56", "1234.56") a Number.
export function parseArNumber(raw: string): number {
  const s = raw.replace(/[^\d.,]/g, "");
  if (!s) return 0;
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // el ultimo separador es el decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) return Number(s.replace(/\./g, "").replace(",", "."));
    return Number(s.replace(/,/g, ""));
  }
  if (hasComma) return Number(s.replace(",", "."));
  // solo puntos: si el ultimo tiene 2 decimales es decimal; si son miles, se quitan
  if (/\.\d{2}$/.test(s) && !/\.\d{3}(\.|$)/.test(s)) return Number(s);
  return Number(s.replace(/\./g, ""));
}

const AMOUNT_RE = /(\d{1,3}(?:\.\d{3})+,\d{2}|\d+,\d{2}|\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})/g;

// Extrae el TOTAL: prioriza el importe que sigue a la palabra TOTAL (no SUBTOTAL); si no, el mayor.
export function extractAmount(text: string): number {
  const upper = text.toUpperCase();
  // busca "TOTAL" que no sea "SUBTOTAL" y toma el importe cercano despues
  const totalRe = /TOTAL[^\d]{0,20}(\d[\d.,]*\d)/g;
  let m: RegExpExecArray | null;
  const totalCandidates: number[] = [];
  while ((m = totalRe.exec(upper)) !== null) {
    const before = upper.slice(Math.max(0, m.index - 3), m.index);
    if (before.endsWith("SUB")) continue; // ignora SUBTOTAL
    const n = parseArNumber(m[1]);
    if (n > 0) totalCandidates.push(n);
  }
  if (totalCandidates.length > 0) return Math.max(...totalCandidates);
  // fallback: el importe mas grande del ticket
  const all: number[] = [];
  let a: RegExpExecArray | null;
  while ((a = AMOUNT_RE.exec(text)) !== null) {
    const n = parseArNumber(a[1]);
    if (n > 0) all.push(n);
  }
  return all.length ? Math.max(...all) : 0;
}

// Extrae una fecha dd/mm/aaaa (o con - o .) y la normaliza a ISO.
export function extractDate(text: string): string {
  const m = text.match(/(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return "";
  let [, d, mo, y] = m;
  if (y.length === 2) y = "20" + y;
  const dd = d.padStart(2, "0");
  const mm = mo.padStart(2, "0");
  if (Number(mm) > 12 || Number(dd) > 31) return "";
  return `${y}-${mm}-${dd}`;
}

// Proveedor: primera linea con letras y algo de largo (heuristica; el usuario confirma).
export function extractSupplier(text: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const cand = lines.find((l) => l.length >= 3 && /[a-zA-Z]/.test(l) && !/^\d/.test(l));
  return (cand || "").slice(0, 60);
}

export function parseTicket(text: string): Omit<TicketData, "rawText"> {
  return {
    amount: extractAmount(text),
    date: extractDate(text),
    supplier: extractSupplier(text),
  };
}

// --- OCR en el navegador (no testeado en Jest; requiere el navegador y CDN) ---

const TESSERACT_CDN = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

export function ensureScript(src: string): Promise<void> {
  const w = window as any;
  w.__externalScriptPromises = w.__externalScriptPromises || {};
  if (!w.__externalScriptPromises[src]) {
    w.__externalScriptPromises[src] = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("No se pudo cargar el OCR (" + src + ")."));
      document.head.appendChild(s);
    });
  }
  return w.__externalScriptPromises[src];
}

async function imageToText(file: File | Blob): Promise<string> {
  await ensureScript(TESSERACT_CDN);
  const T = (window as any).Tesseract;
  if (!T?.recognize) throw new Error("OCR no disponible.");
  const result = await T.recognize(file, "spa+eng");
  return result?.data?.text || "";
}

// Lee el texto de un ticket: PDF digital -> texto directo; imagen (o PDF sin texto) -> OCR.
export async function extractTicketText(file: File): Promise<string> {
  const isPdf = /pdf$/i.test(file.type) || /\.pdf$/i.test(file.name);
  if (isPdf) {
    try {
      const text = await extractPdfRawText(file);
      if (text && text.replace(/\s/g, "").length > 40) return text;
    } catch {
      // sigue al OCR
    }
    throw new Error(
      "El PDF parece escaneado (sin texto). Suibi una foto/imagen del ticket para el OCR."
    );
  }
  return imageToText(file);
}

export async function readTicket(file: File): Promise<TicketData> {
  const rawText = await extractTicketText(file);
  return { ...parseTicket(rawText), rawText };
}
