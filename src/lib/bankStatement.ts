// Importador de extractos bancarios (Excel / CSV / PDF) para la solapa Costos.
//
// Cada banco arma el extracto distinto, asi que esto es TOLERANTE por diseno: detecta las
// columnas por nombre y, si no puede, deja la fila para revisar a mano. El flujo SIEMPRE
// termina en una confirmacion del usuario (igual que el OCR de tickets y el import de remitos):
// el parser precompleta, el usuario verifica antes de impactar.
//
// El Excel se lee con SheetJS cargado por CDN bajo demanda (mismo patron que Tesseract en ocr.ts):
// no suma dependencias al package.json ni infla el bundle.
import { ensureScript, parseArNumber } from "./ocr";
import { extractPdfRawText } from "./pdfExtract";

export type BankStatementRow = {
  date: string; // ISO yyyy-mm-dd ("" si no se pudo leer)
  concept: string;
  amount: number; // siempre positivo
  movementType: "credito" | "debito";
  balance: number;
};

// --- Parsers puros (testeables) ---

// Normaliza un encabezado para compararlo: sin acentos, minusculas, sin espacios de mas.
export function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Fecha de extracto -> ISO. Acepta dd/mm/aaaa, dd-mm-aa, aaaa-mm-dd.
export function parseStatementDate(raw: string): string {
  const value = (raw || "").trim();
  if (!value) return "";
  // Ya viene ISO
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  const m = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/);
  if (!m) return "";
  let [, d, mo, y] = m;
  if (y.length === 2) y = `20${y}`;
  const dd = Number(d);
  const mm = Number(mo);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return "";
  return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

// Corta texto delimitado en celdas. Autodetecta el separador (;, tab, ,) como ya hace el
// import de remitos, pero respetando comillas.
export function splitDelimitedLine(line: string, separator: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

export function detectSeparator(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 5).join("\n");
  if (sample.includes(";")) return ";";
  if (sample.includes("\t")) return "\t";
  return ",";
}

export function parseDelimitedStatement(text: string): string[][] {
  const separator = detectSeparator(text);
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => splitDelimitedLine(line, separator));
}

type ColumnMap = {
  date: number;
  concept: number;
  amount: number;
  debit: number;
  credit: number;
  balance: number;
};

const findColumn = (headers: string[], candidates: string[]): number =>
  headers.findIndex((h) => candidates.some((c) => h.includes(c)));

// Busca la fila de encabezado y mapea las columnas por nombre. -1 si no la encuentra.
export function detectColumns(rows: string[][]): { headerIndex: number; columns: ColumnMap } | null {
  for (let i = 0; i < Math.min(rows.length, 15); i += 1) {
    const headers = rows[i].map(normalizeHeader);
    const date = findColumn(headers, ["fecha"]);
    const concept = findColumn(headers, ["concepto", "descripcion", "detalle", "movimiento"]);
    if (date === -1 || concept === -1) continue;
    return {
      headerIndex: i,
      columns: {
        date,
        concept,
        amount: findColumn(headers, ["importe", "monto"]),
        debit: findColumn(headers, ["debito", "debe"]),
        credit: findColumn(headers, ["credito", "haber"]),
        balance: findColumn(headers, ["saldo"]),
      },
    };
  }
  return null;
}

const cellAt = (row: string[], index: number): string =>
  index >= 0 && index < row.length ? row[index] || "" : "";

// Convierte la grilla en movimientos. Descarta filas sin fecha o sin importe.
export function rowsToStatementEntries(rows: string[][]): BankStatementRow[] {
  const detected = detectColumns(rows);
  if (!detected) return [];
  const { headerIndex, columns } = detected;

  const entries: BankStatementRow[] = [];
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    const date = parseStatementDate(cellAt(row, columns.date));
    if (!date) continue;
    const concept = cellAt(row, columns.concept).trim();

    let amount = 0;
    let movementType: "credito" | "debito" = "debito";

    const debit = parseArNumber(cellAt(row, columns.debit));
    const credit = parseArNumber(cellAt(row, columns.credit));
    if (debit > 0 || credit > 0) {
      // Columnas separadas debito/credito
      if (debit > 0) {
        amount = debit;
        movementType = "debito";
      } else {
        amount = credit;
        movementType = "credito";
      }
    } else {
      // Columna unica con signo: negativo = salida de plata = debito
      const raw = cellAt(row, columns.amount).trim();
      const parsed = parseArNumber(raw);
      if (!(parsed > 0)) continue;
      amount = parsed;
      movementType = /-/.test(raw) ? "debito" : "credito";
    }

    if (!(amount > 0)) continue;

    entries.push({
      date,
      concept,
      amount,
      movementType,
      balance: parseArNumber(cellAt(row, columns.balance)),
    });
  }
  return entries;
}

// PDF: no hay grilla, se parsea linea por linea. Busca "fecha ... concepto ... importe".
export function parsePdfStatementText(text: string): BankStatementRow[] {
  const entries: BankStatementRow[] = [];
  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const dateMatch = trimmed.match(/^(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4})\s+(.*)$/);
    if (!dateMatch) return;
    const date = parseStatementDate(dateMatch[1]);
    if (!date) return;
    const rest = dateMatch[2];
    // Los importes son los ultimos numeros de la linea (el ultimo suele ser el saldo).
    const amounts = rest.match(/-?\d{1,3}(?:\.\d{3})*,\d{2}|-?\d+,\d{2}|-?\d+\.\d{2}/g);
    if (!amounts || amounts.length === 0) return;
    const rawAmount = amounts.length > 1 ? amounts[amounts.length - 2] : amounts[0];
    const amount = parseArNumber(rawAmount);
    if (!(amount > 0)) return;
    const concept = rest.slice(0, rest.indexOf(amounts[0])).trim() || rest.trim();
    entries.push({
      date,
      concept,
      amount,
      movementType: /-/.test(rawAmount) ? "debito" : "credito",
      balance: amounts.length > 1 ? parseArNumber(amounts[amounts.length - 1]) : 0,
    });
  });
  return entries;
}

// Sugiere un grupo de costos mirando el concepto del movimiento. Es solo una ayuda:
// el usuario confirma o corrige antes de impactar.
const GROUP_HINTS: Array<{ group: string; words: string[] }> = [
  { group: "Edilicios", words: ["alquiler", "expensas", "luz", "edenor", "edesur", "gas", "agua", "aysa"] },
  { group: "Administrativos", words: ["telefon", "internet", "movistar", "personal ", "claro", "contador", "honorario"] },
  { group: "Financieros", words: ["comision", "interes", "mantenimiento", "sellado", "impuesto", "iva", "afip", "arca", "debito automatico"] },
  { group: "Comerciales", words: ["publicidad", "marketing", "google", "meta", "facebook"] },
  { group: "Operativos", words: ["combustible", "nafta", "ypf", "shell", "seguro", "flete"] },
];

export function suggestGroupForConcept(concept: string, availableGroups: string[]): string {
  const normalized = normalizeHeader(concept);
  for (const hint of GROUP_HINTS) {
    if (!availableGroups.includes(hint.group)) continue;
    if (hint.words.some((word) => normalized.includes(word))) return hint.group;
  }
  return "";
}

// --- Lectura de archivos (necesita navegador; no se testea en Jest) ---

export const SHEETJS_CDN = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";

// Exportada para reusarla con otros Excel (ej. el listado de ARCA de facturas emitidas).
export async function readSpreadsheetRows(file: File): Promise<string[][]> {
  await ensureScript(SHEETJS_CDN);
  const XLSX = (window as any).XLSX;
  if (!XLSX?.read) throw new Error("No se pudo cargar el lector de Excel.");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false, raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("El Excel no tiene hojas.");
  const sheet = workbook.Sheets[firstSheetName];
  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });
  return rows.map((row) => row.map((cell) => String(cell ?? "").trim()));
}

export type BankStatementParseResult = {
  entries: BankStatementRow[];
  sourceType: "excel" | "csv" | "pdf";
};

// Lee un extracto y devuelve los movimientos detectados, para revisar antes de confirmar.
export async function readBankStatement(file: File): Promise<BankStatementParseResult> {
  const name = file.name.toLowerCase();

  if (/\.(xlsx|xls)$/.test(name)) {
    const rows = await readSpreadsheetRows(file);
    const entries = rowsToStatementEntries(rows);
    if (entries.length === 0) {
      throw new Error(
        "Lei el Excel pero no reconoci las columnas. Necesito al menos una columna 'Fecha' y una 'Concepto' (o 'Descripcion'/'Detalle')."
      );
    }
    return { entries, sourceType: "excel" };
  }

  if (/\.pdf$/.test(name) || /pdf$/i.test(file.type)) {
    const text = await extractPdfRawText(file);
    if (!text || text.replace(/\s/g, "").length < 40) {
      throw new Error(
        "El PDF parece escaneado (sin texto). Pedile al banco el extracto en Excel, o carga los movimientos a mano."
      );
    }
    const entries = parsePdfStatementText(text);
    if (entries.length === 0) {
      throw new Error("Lei el PDF pero no encontre movimientos con formato fecha + importe.");
    }
    return { entries, sourceType: "pdf" };
  }

  // csv / tsv / txt
  const text = await file.text();
  const entries = rowsToStatementEntries(parseDelimitedStatement(text));
  if (entries.length === 0) {
    throw new Error(
      "No reconoci las columnas del archivo. Necesito al menos 'Fecha' y 'Concepto' (o 'Descripcion'/'Detalle')."
    );
  }
  return { entries, sourceType: "csv" };
}
