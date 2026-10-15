// CRUCE DEL LISTADO DE ARCA CONTRA LAS FACTURAS YA CARGADAS (Nicolas, 2026-10-15): "una vez que se
// cargue el listado deberia cruzarse con las que estan cargadas para no tener 2 veces la misma factura".
//
// La clave exacta de ARCA (tipo|pto vta|numero|CUIT|fecha) no alcanza: una factura cargada a mano
// tiene la letra aparte, el numero sin punto de venta ("5001"), a veces sin CUIT y con la fecha en que
// se cargo. Entonces se busca la misma factura con reglas mas tolerantes, siempre dentro de la empresa:
//   1. MISMO NUMERO (sin punto de venta ni ceros) y el mismo emisor (CUIT, o nombre parecido, o el
//      mismo total).
//   2. SIN NUMERO cargado: mismo emisor, mismo total (±1 peso) y fecha cercana (±7 dias).
// Puro y testeable.

export type FacturaCargada = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
};

export type FacturaArca = {
  date: string;
  pointOfSale: string;
  number: string;
  counterpartyTaxId: string;
  counterpartyName: string;
  total: number;
};

const digitos = (s: string) => String(s || "").replace(/\D/g, "");
const sinCeros = (s: string) => {
  const d = digitos(s);
  return d ? String(Number(d)) : "";
};

// Numero del comprobante sin el punto de venta: "0003-00005001" -> "5001", "A 5001" -> "5001".
export const numeroSinPuntoDeVenta = (s: string): string => {
  const partes = String(s || "").split(/[-/ ]+/).map(digitos).filter(Boolean);
  if (partes.length === 0) return "";
  // "000300005001" (13 digitos pegados = 4/5 de punto de venta + 8 de numero)
  const ultimo = partes[partes.length - 1];
  if (partes.length === 1 && ultimo.length >= 12) return sinCeros(ultimo.slice(-8));
  return sinCeros(ultimo);
};

const PALABRAS_VACIAS = new Set(["sa", "srl", "sas", "s", "a", "r", "l", "de", "del", "la", "el", "y", "e", "hijos", "cia"]);
const palabras = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 1 && !PALABRAS_VACIAS.has(w));

// Mismo proveedor por nombre: comparten una palabra significativa ("DEL CARRIL" ~ "Del Carril Maderas SRL").
export const nombreParecido = (a: string, b: string): boolean => {
  const pa = palabras(a);
  const pb = new Set(palabras(b));
  return pa.length > 0 && pa.some((w) => pb.has(w));
};

const diasEntre = (a: string, b: string) => {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity;
  return Math.abs(ta - tb) / 86400000;
};

export function buscarFacturaCargada<T extends FacturaCargada>(
  arca: FacturaArca,
  company: string,
  cargadas: T[]
): T | undefined {
  const num = sinCeros(arca.number);
  const cuit = digitos(arca.counterpartyTaxId);
  const mismaEmpresa = cargadas.filter((f) => f.company === company);
  const mismoEmisor = (f: T) => {
    const c = digitos(f.taxId);
    if (c && cuit) return c === cuit; // con los dos CUIT, manda el CUIT
    return nombreParecido(f.supplier, arca.counterpartyName);
  };
  const mismoTotal = (f: T) => Math.abs(Number(f.total || 0) - Number(arca.total || 0)) <= 1;

  // 1. Mismo numero de comprobante.
  if (num) {
    const porNumero = mismaEmpresa.filter((f) => numeroSinPuntoDeVenta(f.invoiceNumber) === num);
    const hit = porNumero.find((f) => mismoEmisor(f)) || porNumero.find((f) => !digitos(f.taxId) && mismoTotal(f));
    if (hit) return hit;
  }
  // 2. Cargada sin numero: mismo emisor, mismo total y fecha cercana.
  return mismaEmpresa.find(
    (f) => !numeroSinPuntoDeVenta(f.invoiceNumber) && mismoEmisor(f) && mismoTotal(f) && diasEntre(f.invoiceDate, arca.date) <= 7
  );
}
