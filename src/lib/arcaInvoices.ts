// Lector del export de ARCA/AFIP "Mis Comprobantes Emitidos".
//
// La factura NO suma al resultado (ver la regla del 2026-07-19): es REGISTRO. Sirve para tres cosas:
//   - saber que emitimos y a quien (el listado para el contador),
//   - cruzar las facturas ENTRE las empresas del grupo contra los giros,
//   - alimentar los compromisos (lo que falta cobrar de cada cliente).
//
// El archivo viene siempre con la misma forma: fila 0 el titulo con el CUIT del emisor, fila 1 los
// encabezados, y despues un comprobante por fila. Se lee por NOMBRE de columna, no por posicion, para
// que no se rompa si ARCA agrega o mueve alguna.
//
// Puro: recibe la matriz de celdas ya leida. El que abre el Excel es el caller.

export type ArcaDirection = "emitidas" | "recibidas";

export type ParsedArcaInvoice = {
  date: string; // yyyy-mm-dd
  kind: string; // "1 - Factura A"
  pointOfSale: string;
  number: string;
  counterpartyTaxId: string; // solo digitos (el receptor si emitimos, el emisor si nos emitieron)
  counterpartyName: string;
  currency: string;
  net: number;
  vat: number;
  total: number;
};

export type ArcaParseResult = {
  ownTaxId: string; // CUIT NUESTRO, sacado del titulo del archivo
  direction: ArcaDirection; // lo dice el propio titulo: Emitidos o Recibidos
  invoices: ParsedArcaInvoice[];
};

const norm = (s: string): string =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const digits = (s: string): string => (s || "").replace(/\D/g, "");

// ARCA escribe los montos con coma decimal y a veces punto de miles.
export const parseArcaAmount = (raw: string): number => {
  const s = String(raw ?? "").trim();
  if (!s) return 0;
  const limpio = s.replace(/[^\d,.-]/g, "");
  if (!limpio) return 0;
  // Si tiene coma, la coma es el decimal y el punto son miles.
  const normalizado = limpio.includes(",")
    ? limpio.replace(/\./g, "").replace(",", ".")
    : limpio;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
};

// dd/mm/yyyy -> yyyy-mm-dd. Devuelve "" si no se entiende (la fila se descarta).
export const parseArcaDate = (raw: string): string => {
  const s = String(raw ?? "").trim();
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
};

const HEADER_ALIASES = {
  date: ["fecha"],
  kind: ["tipo"],
  pointOfSale: ["punto de venta"],
  number: ["numero desde", "nro desde"],
  currency: ["moneda"],
  // "Neto Gravado Total" aparece en los Recibidos; "Imp. Neto Gravado" en los Emitidos.
  net: ["imp neto gravado", "neto gravado", "neto gravado total"],
  // "Total IVA" en los Recibidos, "IVA" en los Emitidos.
  vat: ["iva", "imp iva", "total iva"],
  total: ["imp total", "importe total"],
  // La CONTRAPARTE cambia de nombre segun la direccion del archivo.
  counterpartyTaxIdOut: ["nro doc receptor", "numero doc receptor", "nro documento receptor"],
  counterpartyNameOut: ["denominacion receptor"],
  counterpartyTaxIdIn: ["nro doc emisor", "numero doc emisor", "nro documento emisor"],
  counterpartyNameIn: ["denominacion emisor"],
};

// Busca el indice de la columna cuyo encabezado coincide EXACTO con alguno de los alias.
// Exacto y no "contiene" a proposito: "IVA" contendria a "Neto Grav. IVA 21%" y traeria el neto.
const findColumn = (headers: string[], aliases: string[]): number =>
  headers.findIndex((h) => aliases.includes(norm(h)));

export function rowsToArcaInvoices(rows: string[][]): ArcaParseResult {
  const tituloRow = (rows || []).slice(0, 5).find((r) => /comprobantes/i.test(r?.[0] || ""));
  const titulo = tituloRow?.[0] || "";
  const ownTaxId = digits(titulo);
  // El propio titulo dice si son los que emitimos o los que nos emitieron.
  const direction: ArcaDirection = /recibido/i.test(titulo) ? "recibidas" : "emitidas";

  const headerIndex = (rows || []).findIndex(
    (r) =>
      (r || []).some((c) => norm(c) === "fecha") &&
      (r || []).some((c) => norm(c).includes("receptor") || norm(c).includes("emisor"))
  );
  if (headerIndex < 0) return { ownTaxId, direction, invoices: [] };

  const headers = rows[headerIndex] || [];
  // Si nos emitieron, la contraparte es el EMISOR; si emitimos, es el RECEPTOR.
  const esRecibida = direction === "recibidas";
  const col = {
    date: findColumn(headers, HEADER_ALIASES.date),
    kind: findColumn(headers, HEADER_ALIASES.kind),
    pointOfSale: findColumn(headers, HEADER_ALIASES.pointOfSale),
    number: findColumn(headers, HEADER_ALIASES.number),
    counterpartyTaxId: findColumn(
      headers,
      esRecibida ? HEADER_ALIASES.counterpartyTaxIdIn : HEADER_ALIASES.counterpartyTaxIdOut
    ),
    counterpartyName: findColumn(
      headers,
      esRecibida ? HEADER_ALIASES.counterpartyNameIn : HEADER_ALIASES.counterpartyNameOut
    ),
    currency: findColumn(headers, HEADER_ALIASES.currency),
    net: findColumn(headers, HEADER_ALIASES.net),
    vat: findColumn(headers, HEADER_ALIASES.vat),
    total: findColumn(headers, HEADER_ALIASES.total),
  };

  const at = (row: string[], index: number): string =>
    index >= 0 ? String(row?.[index] ?? "").trim() : "";

  const invoices: ParsedArcaInvoice[] = [];
  for (let i = headerIndex + 1; i < (rows || []).length; i += 1) {
    const row = rows[i] || [];
    const date = parseArcaDate(at(row, col.date));
    if (!date) continue; // fila vacia o de totales
    invoices.push({
      date,
      kind: at(row, col.kind),
      pointOfSale: at(row, col.pointOfSale),
      number: at(row, col.number),
      counterpartyTaxId: digits(at(row, col.counterpartyTaxId)),
      counterpartyName: at(row, col.counterpartyName),
      currency: at(row, col.currency) || "$",
      net: parseArcaAmount(at(row, col.net)),
      vat: parseArcaAmount(at(row, col.vat)),
      total: parseArcaAmount(at(row, col.total)),
    });
  }
  return { ownTaxId, direction, invoices };
}

// Clave para no cargar dos veces el mismo comprobante (los export de ARCA se pisan entre si).
// El punto de venta y el numero vienen a veces con ceros a la izquierda ("0001") y a veces sin
// ellos ("1"): se comparan como numero para que sea el mismo comprobante.
const sinCeros = (s: string): string => String(Number(digits(s) || 0));

export const arcaInvoiceKey = (inv: {
  pointOfSale: string;
  number: string;
  kind: string;
  counterpartyTaxId: string;
  date: string;
}): string =>
  [
    norm(inv.kind).split(" ")[0] || norm(inv.kind),
    sinCeros(inv.pointOfSale),
    sinCeros(inv.number),
    inv.counterpartyTaxId,
    inv.date,
  ].join("|");
