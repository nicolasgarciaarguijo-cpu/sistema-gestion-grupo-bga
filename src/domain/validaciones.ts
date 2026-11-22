// VALIDACION AL CARGAR (Nicolas, 21/11/2026: "me gusta la validacion, hagamoslo").
// El sistema venia tapando datos malos con avisos DESPUES de cargados: fechas con el año mal tipeado ("0026",
// "22026"), comprobantes repetidos, cobros sin fecha. La idea ahora es al reves: que la ficha no deje guardar un
// dato imposible, y diga cual es. Una regla por dato, aca, para que todas las fichas pidan lo mismo.
import { fechaIsoValida } from "./cobrosProgramados";

// Lo que acepta cualquier campo de fecha del sistema. Con minimo y maximo, el navegador ya no deja escribir un
// año de cinco o seis cifras.
export const FECHA_MIN = "2015-01-01";
export const FECHA_MAX = "2100-12-31";

/** Una fecha cargada que no sirve: vacia no es "mala" (eso lo pide cada ficha si es obligatoria). */
export const fechaMala = (iso?: string | null): boolean => !!iso && !fechaIsoValida(iso);

const soloDigitos = (v?: string) => String(v || "").replace(/\D/g, "");
const sinCerosIzq = (v?: string) => soloDigitos(v).replace(/^0+/, "");
const nombreNorm = (v?: string) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?\s?r\.?\s?l|s\.?\s?a|s\.?\s?h|s\.?\s?a\.?\s?s)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "");

export type ComprobanteCargado = { id?: number; company: string; supplier: string; taxId?: string; receiptKind?: string; receiptLetter?: string; invoiceNumber?: string; invoiceDate?: string; total?: number };

// El mismo comprobante: mismo proveedor (por CUIT; si alguno no lo tiene, por nombre), misma letra y mismo numero
// (sin ceros a la izquierda ni guiones: "0001-00012345" y "1-12345" son el mismo). Sin numero no se puede saber.
export const claveDeComprobante = (c: ComprobanteCargado): string => {
  const numero = String(c.invoiceNumber || "")
    .split(/[^0-9]+/)
    .map(sinCerosIzq)
    .filter(Boolean)
    .join("-");
  if (!numero) return "";
  return `${String(c.receiptLetter || "").trim().toUpperCase()}|${numero}`;
};
const mismoProveedor = (a: ComprobanteCargado, b: ComprobanteCargado): boolean => {
  const ca = soloDigitos(a.taxId);
  const cb = soloDigitos(b.taxId);
  if (ca.length === 11 && cb.length === 11) return ca === cb;
  const na = nombreNorm(a.supplier);
  return !!na && na === nombreNorm(b.supplier);
};

/** El comprobante ya cargado que es el mismo que este (otra ficha, misma empresa), si lo hay. */
export function comprobanteRepetido(f: ComprobanteCargado, existentes: ComprobanteCargado[]): ComprobanteCargado | null {
  const clave = claveDeComprobante(f);
  if (!clave) return null;
  return existentes.find((e) => e.id !== f.id && e.company === f.company && claveDeComprobante(e) === clave && mismoProveedor(e, f)) || null;
}

export type FacturaParaValidar = ComprobanteCargado & {
  pagos?: Array<{ fecha?: string; monto?: number }>;
  saldo?: { fechaPrevista?: string };
  net21?: number;
  vat?: number;
  exemptAmount?: number;
  otrosImpuestos?: number;
  iibb?: number;
};

const linda = (iso?: string) => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.split("-").reverse().join("/") : String(iso || ""));

/**
 * Lo que impide guardar una factura de compra (ademas de lo que la ficha ya pedia: proveedor, fecha, total,
 * cuenta de cada pago). Cada texto completa la frase "Falta / hay que corregir: ...".
 */
export function validarFacturaCompra(f: FacturaParaValidar, existentes: ComprobanteCargado[] = []): string[] {
  const out: string[] = [];
  if (fechaMala(f.invoiceDate)) out.push(`la fecha de la factura (${f.invoiceDate} no es una fecha válida)`);
  if ((f.pagos || []).some((p) => fechaMala(p.fecha))) out.push("la fecha de un pago (no es una fecha válida)");
  if (fechaMala(f.saldo?.fechaPrevista)) out.push("la fecha prevista de pago (no es una fecha válida)");
  const negativos = (["net21", "vat", "exemptAmount", "otrosImpuestos", "iibb"] as const).filter((k) => Number(f[k] || 0) < 0);
  if (negativos.length && String(f.receiptKind || "").toLowerCase().indexOf("crédito") < 0) out.push("los importes en negativo (una devolución se carga como nota de crédito)");
  const rep = comprobanteRepetido(f, existentes);
  if (rep) out.push(`el número de comprobante: ${[f.receiptLetter, f.invoiceNumber].filter(Boolean).join(" ")} de ${rep.supplier} ya está cargado${rep.invoiceDate ? ` (factura del ${linda(rep.invoiceDate)}${rep.total ? `, $ ${Math.round(Number(rep.total)).toLocaleString("es-AR")}` : ""})` : ""}`);
  return out;
}

// DATOS POR CORREGIR: lo que ya esta cargado y no pasaria la validacion de hoy. Lo usa el resumen del dia.
export type DatoPorCorregir = { clave: string; tipo: "comprobante_repetido" | "fecha_mala"; company: string; texto: string; facturaId?: number };

export function comprobantesRepetidos(facturas: ComprobanteCargado[]): DatoPorCorregir[] {
  const out: DatoPorCorregir[] = [];
  const vistos = new Set<number>();
  facturas.forEach((f) => {
    if (f.id == null || vistos.has(f.id)) return;
    const rep = comprobanteRepetido(f, facturas);
    if (!rep || rep.id == null) return;
    vistos.add(f.id);
    vistos.add(rep.id);
    out.push({
      clave: `rep-${Math.min(f.id, rep.id)}-${Math.max(f.id, rep.id)}`,
      tipo: "comprobante_repetido",
      company: f.company,
      texto: `${f.supplier} · ${[f.receiptLetter, f.invoiceNumber].filter(Boolean).join(" ")} está cargado dos veces`,
      facturaId: f.id,
    });
  });
  return out;
}

export function facturasConFechaMala(facturas: ComprobanteCargado[]): DatoPorCorregir[] {
  return facturas
    .filter((f) => f.id != null && fechaMala(f.invoiceDate))
    .map((f) => ({ clave: `fecha-${f.id}`, tipo: "fecha_mala" as const, company: f.company, texto: `${f.supplier} · factura con la fecha mal (${f.invoiceDate})`, facturaId: f.id }));
}

// FICHAS DE GUARDADO AUTOMATICO (seguros, inversiones, movimientos internos, retiros, facturas emitidas...).
// Estas fichas guardan cada cambio al momento: no tienen un boton "Guardar" que se pueda frenar. La validacion
// ahi es marcar EN LA FICHA lo que falta o esta mal, en rojo y con el motivo, y que el boton de salir lo diga.
export type CampoParaValidar = {
  key: string;
  label: string;
  tipo: string;
  soloLectura?: boolean;
  obligatorio?: boolean;
  // Numero que puede ser negativo (un ajuste). Por defecto un monto negativo es un error de tipeo.
  permiteNegativo?: boolean;
  // Texto que tiene que ser un CUIT de 11 digitos (si se cargo).
  cuit?: boolean;
  // Rango de un numero (ej. el dia del mes: 1 a 31).
  minimo?: number;
  maximo?: number;
  // Un error que solo conoce la solapa (ej. el codigo de stock repetido en otro articulo). Si viene, se marca.
  error?: string;
};
export type ProblemaDeFicha = { key: string; label: string; texto: string };

const vacio = (v: any) => v === undefined || v === null || String(v).trim() === "";

export function problemasDeFicha(campos: CampoParaValidar[], valores: Record<string, any>): ProblemaDeFicha[] {
  const out: ProblemaDeFicha[] = [];
  campos.forEach((c) => {
    if (c.soloLectura || c.tipo === "check" || c.tipo === "area") return;
    const v = valores[c.key];
    const poner = (texto: string) => out.push({ key: c.key, label: c.label, texto });
    if (c.error && !(c.obligatorio && c.tipo !== "numero" && vacio(v))) return poner(c.error);
    if (c.tipo === "numero") {
      const n = Number(v || 0);
      if (c.obligatorio && !(Math.abs(n) > 0)) return poner("falta");
      if (n < 0 && !c.permiteNegativo) return poner("no puede ser negativo");
      if (c.minimo != null && Math.abs(n) > 0 && n < c.minimo) return poner(`tiene que ser ${c.minimo} o más`);
      if (c.maximo != null && n > c.maximo) return poner(`tiene que ser ${c.maximo} o menos`);
      return;
    }
    if (vacio(v)) {
      if (c.obligatorio) poner("falta");
      return;
    }
    if (c.tipo === "fecha" && fechaMala(String(v))) return poner("no es una fecha válida");
    if (c.cuit && soloDigitos(String(v)).length !== 11) return poner("tiene que tener 11 dígitos");
  });
  return out;
}
