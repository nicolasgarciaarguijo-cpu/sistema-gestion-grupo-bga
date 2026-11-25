// EL PAGO DEL IVA, HECHO POR COMPRAS (Nicolas, 17/11/2026: "seguir por Compras").
//
// La posicion de IVA se paga con un VEP, y el tablero lo controla mes por mes (domain/vatBalance). Pero
// Grupo BGA lo registra como una FACTURA DE ARCA en Compras: asi aparecio el IVA de 08/2026 de De Raiz,
// una nota de debito de "ARCA" por $6.940.676 con la nota "Aviso de Ceci". Nicolas eligio seguir asi.
//
// Entonces el tablero tiene que RECONOCER ese pago, o va a decir "sin VEP" para siempre. Para eso la
// factura dice de QUE PERIODO es el IVA que paga (`ivaPeriodoMes`): es lo mismo que el `periodoMes` del
// VEP. Si no se aclara, se toma el mes anterior al de la factura, como ya hace el VEP.
//
// Puro. El que junta las facturas y sus pagos es el App.

export type FacturaDeIva = {
  id: number;
  company: string;
  supplier: string;
  invoiceDate: string;
  total: number;
  ivaPeriodoMes?: string; // "2026-08"
  // Que paga (25/11/2026): ARCA tambien cobra las cargas sociales, que NO son IVA. Vacio = IVA.
  obligacion?: string;
  // Pagada: si no se pago, todavia no es un pago del IVA (es deuda con ARCA).
  pagadaEl?: string;
};

const norm = (v?: string): string =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");

// ARCA (ex AFIP). Es el unico proveedor cuyo comprobante puede ser el pago del IVA.
export const esProveedorDelFisco = (supplier?: string): boolean => {
  const n = norm(supplier);
  return n === "arca" || n === "afip" || n.startsWith("arca") || n.startsWith("afip");
};

const mesValido = (m?: string): boolean => /^\d{4}-\d{2}$/.test(String(m || ""));

const mesAnterior = (iso: string): string => {
  const [y, m] = String(iso).slice(0, 7).split("-").map(Number);
  if (!y || !m) return "";
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
};

// El periodo que paga la factura: el que se aclaro, o el mes anterior al de la factura.
export const periodoDeLaFactura = (f: FacturaDeIva): string =>
  mesValido(f.ivaPeriodoMes) ? String(f.ivaPeriodoMes) : mesAnterior(f.invoiceDate);

// Es un pago del IVA para el tablero: tiene periodo aclarado y esta pagada.
// Solo las del fisco: el campo del periodo lo usa tambien la boleta del sindicato (21/11/2026), que no es IVA.
const esDeIva = (f: FacturaDeIva): boolean => esProveedorDelFisco(f.supplier) && (!f.obligacion || f.obligacion === "iva");
export const esPagoDeIva = (f: FacturaDeIva): boolean => esDeIva(f) && mesValido(f.ivaPeriodoMes) && !!f.pagadaEl;

export type VepDeFactura = { company: string; date: string; amount: number; periodoMes: string };

// Las facturas que son el pago del IVA, con la forma que espera domain/vatBalance.ivaAnual.
export function vepsDesdeFacturas(facturas: FacturaDeIva[]): VepDeFactura[] {
  return facturas.filter(esPagoDeIva).map((f) => ({
    company: f.company,
    date: String(f.pagadaEl || f.invoiceDate).slice(0, 10),
    amount: Number(f.total || 0),
    periodoMes: periodoDeLaFactura(f),
  }));
}

// Una factura de ARCA sin periodo aclarado: puede ser el pago del IVA y el tablero no lo sabe. La ficha
// lo pregunta y Compras lo avisa.
export function facturasDelFiscoSinPeriodo(facturas: FacturaDeIva[]): FacturaDeIva[] {
  return facturas.filter((f) => esDeIva(f) && !mesValido(f.ivaPeriodoMes));
}
