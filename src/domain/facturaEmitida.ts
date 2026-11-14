// FACTURA EMITIDA (Nicolas, 14/11/2026).
//
// La factura emitida se carga EN LA FICHA DEL TRABAJO APROBADO: ese es el dato. El listado de ARCA es
// SOLO CONTROL: propone las facturas que todavia no estan cargadas. Para que ese cruce funcione, la ficha
// del trabajo tiene que tener la MISMA informacion que trae ARCA: tipo de comprobante (con el codigo),
// punto de venta, numero, fecha, CUIT del cliente y moneda. Lo que falte, la ficha lo avisa.
//
// Nada de esto reescribe lo ya cargado: los tipos viejos ("A", "B", "A 352/365") se interpretan para poder
// cruzar, y la ficha muestra que hay que completar.

import { arcaInvoiceKey } from "../lib/arcaInvoices";

// LOS TIPOS DE COMPROBANTE DE AFIP (Nicolas, 14/11/2026: "estan todos los tipos ahora para seleccionar?
// los que propone la AFIP?"). Esta es la tabla de AFIP de los comprobantes que una S.R.L. responsable
// inscripto puede EMITIR, con el codigo que usa ARCA adelante. Quedan afuera a proposito los tiques de
// controlador fiscal y las liquidaciones de regimenes que el grupo no usa; si alguna vez aparece uno en el
// listado de ARCA, la ficha conserva lo que vino cargado y se agrega aca.
export const COMPROBANTES_AFIP: Array<{ codigo: number; label: string }> = [
  { codigo: 1, label: "Factura A" },
  { codigo: 2, label: "Nota de Débito A" },
  { codigo: 3, label: "Nota de Crédito A" },
  { codigo: 4, label: "Recibo A" },
  { codigo: 6, label: "Factura B" },
  { codigo: 7, label: "Nota de Débito B" },
  { codigo: 8, label: "Nota de Crédito B" },
  { codigo: 9, label: "Recibo B" },
  { codigo: 11, label: "Factura C" },
  { codigo: 12, label: "Nota de Débito C" },
  { codigo: 13, label: "Nota de Crédito C" },
  { codigo: 15, label: "Recibo C" },
  { codigo: 19, label: "Factura E (exportación)" },
  { codigo: 20, label: "Nota de Débito E" },
  { codigo: 21, label: "Nota de Crédito E" },
  { codigo: 51, label: "Factura M" },
  { codigo: 52, label: "Nota de Débito M" },
  { codigo: 53, label: "Nota de Crédito M" },
  { codigo: 54, label: "Recibo M" },
  { codigo: 39, label: "Otros comprobantes A que cumplen con la R.G." },
  { codigo: 40, label: "Otros comprobantes B que cumplen con la R.G." },
  { codigo: 201, label: "Factura de Crédito Electrónico MiPyME A" },
  { codigo: 202, label: "Nota de Débito Electrónica MiPyME A" },
  { codigo: 203, label: "Nota de Crédito Electrónica MiPyME A" },
  { codigo: 206, label: "Factura de Crédito Electrónico MiPyME B" },
  { codigo: 207, label: "Nota de Débito Electrónica MiPyME B" },
  { codigo: 208, label: "Nota de Crédito Electrónica MiPyME B" },
  { codigo: 211, label: "Factura de Crédito Electrónico MiPyME C" },
  { codigo: 212, label: "Nota de Débito Electrónica MiPyME C" },
  { codigo: 213, label: "Nota de Crédito Electrónica MiPyME C" },
];

// Como se nombra cada uno en la ficha y en el listado de ARCA: "1 - Factura A".
export const nombreDeComprobante = (codigo: number, label: string) => `${codigo} - ${label}`;
export const TIPOS_FACTURA_EMITIDA = COMPROBANTES_AFIP.map((c) => nombreDeComprobante(c.codigo, c.label));

// Lo que emite el sistema por AFIP ya viene con el codigo del comprobante.
export const TIPO_POR_CODIGO_AFIP: Record<number, string> = Object.fromEntries(
  COMPROBANTES_AFIP.map((c) => [c.codigo, nombreDeComprobante(c.codigo, c.label)])
);

// Lo que el facturador del sistema sabe emitir hoy (el resto se emite en ARCA y se carga aca).
export const CODIGOS_QUE_EMITE_EL_SISTEMA = [1, 6, 11];
export const puedeEmitirloElSistema = (i: FacturaEmitidaF): boolean =>
  CODIGOS_QUE_EMITE_EL_SISTEMA.includes(codigoAfipDeFactura(i));

// Lo cargado a mano antes del 14/11/2026 dice solo la letra ("A", "B", "A 75"): se interpreta para cruzar.
const TIPO_POR_LETRA: Record<string, string> = {
  A: "1 - Factura A",
  B: "6 - Factura B",
  C: "11 - Factura C",
  E: "19 - Factura E (exportación)",
};

export const MONEDAS_FACTURA_EMITIDA = [
  { value: "ARS", label: "Pesos" },
  { value: "USD", label: "Dólares" },
];

export type FacturaEmitidaF = {
  invoiceType?: string;
  pointOfSale?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  taxId?: string;
  businessName?: string;
  currency?: string;
  repartida?: boolean;
  afipCbteTipo?: number;
  afipPtoVta?: number;
  afipCbteNro?: number;
};

const soloDigitos = (s?: string) => String(s || "").replace(/\D/g, "");

// Tipo de comprobante EFECTIVO, como lo nombra ARCA.
export function tipoDeFactura(i: FacturaEmitidaF): string {
  if (i.afipCbteTipo) return TIPO_POR_CODIGO_AFIP[i.afipCbteTipo] || String(i.afipCbteTipo);
  const t = String(i.invoiceType || "").trim();
  if (!t) return "";
  if (/^\d+\s*-\s*\S/.test(t)) return t; // ya esta con el codigo de ARCA
  const letra = (t.match(/^([ABCE])\b/i) || [])[1];
  return letra ? TIPO_POR_LETRA[letra.toUpperCase()] : t;
}

// "00001-00000010" trae el punto de venta adentro del numero: se entiende igual.
const partesDelNumero = (raw?: string): { pv: string; nro: string } => {
  const t = String(raw || "").trim();
  if (!t) return { pv: "", nro: "" };
  if (/\//.test(t)) return { pv: "", nro: "" }; // "A 352/365": mas de una factura en el renglon, no se cruza
  const dos = t.match(/(\d+)\s*-\s*(\d+)/);
  if (dos) return { pv: dos[1], nro: dos[2] };
  const uno = t.match(/^[A-Za-z]*\s*(\d+)$/);
  return { pv: "", nro: uno ? uno[1] : "" };
};

export function puntoDeVentaDeFactura(i: FacturaEmitidaF): string {
  if (i.afipPtoVta) return String(i.afipPtoVta);
  if (String(i.pointOfSale || "").trim()) return String(i.pointOfSale).trim();
  return partesDelNumero(i.invoiceNumber).pv;
}

export function numeroDeFactura(i: FacturaEmitidaF): string {
  if (i.afipCbteNro) return String(i.afipCbteNro);
  return partesDelNumero(i.invoiceNumber).nro;
}

// Lo que falta para que la factura sea la misma que ARCA ve. Vacio = se puede cruzar.
export function faltaDeFacturaEmitida(i: FacturaEmitidaF): string[] {
  const falta: string[] = [];
  const tipo = tipoDeFactura(i);
  if (!tipo) falta.push("el tipo de comprobante");
  else if (!/^\d+\s*-\s*\S/.test(tipo)) falta.push("el tipo de comprobante (elegilo de la lista)");
  if (!puntoDeVentaDeFactura(i)) falta.push("el punto de venta");
  if (!numeroDeFactura(i)) falta.push("el número");
  if (!String(i.invoiceDate || "").trim()) falta.push("la fecha");
  if (soloDigitos(i.taxId).length !== 11) falta.push("el CUIT del cliente");
  return falta;
}

export const textoFaltaFactura = (falta: string[]): string =>
  falta.length === 0 ? "" : `⚠ falta ${falta.join(", ")} para cruzarla con ARCA`;

export const sePuedeCruzarConArca = (i: FacturaEmitidaF): boolean => faltaDeFacturaEmitida(i).length === 0;

// La factura del trabajo vista como el comprobante que trae ARCA: con esto se arma la misma clave
// (lib/arcaInvoices.arcaInvoiceKey) y el listado de ARCA deja de proponer lo que ya esta cargado.
export function comoComprobanteArca(i: FacturaEmitidaF): {
  kind: string;
  pointOfSale: string;
  number: string;
  counterpartyTaxId: string;
  date: string;
} | null {
  if (!sePuedeCruzarConArca(i)) return null;
  return {
    kind: tipoDeFactura(i),
    pointOfSale: puntoDeVentaDeFactura(i),
    number: numeroDeFactura(i),
    counterpartyTaxId: soloDigitos(i.taxId),
    date: String(i.invoiceDate || "").slice(0, 10),
  };
}

// ===================== ANTIDUPLICADOS (Nicolas, 14/11/2026) =====================
// "hay que asegurarse de que no haya facturas emitidas duplicadas. el listado de ARCA asegura que no haya
// nada perdido". La factura emitida se carga en DOS lugares: la ficha del trabajo aprobado y, cuando no hay
// trabajo de por medio, la ficha de facturas entre empresas (Movimientos internos). Las dos cargan el mismo
// comprobante, asi que el mismo numero no puede estar dos veces ni en el mismo lugar ni en los dos.

export type FacturaEmitidaRef = FacturaEmitidaF & {
  id: number;
  origen: "trabajo" | "entreEmpresas";
  donde: string; // "trabajo P-3162" / "entre empresas"
  total?: number; // la parte que le toca a este trabajo (para el reparto)
  repartida?: boolean; // marcada a mano: es un comprobante repartido entre varios trabajos
};

// La misma clave que usa el listado de ARCA (lib/arcaInvoices.arcaInvoiceKey): tipo + punto de venta +
// numero + CUIT + fecha. Null = le falta algo, asi que no se puede decir si esta repetida.
export function claveDeFacturaEmitida(i: FacturaEmitidaF): string | null {
  const c = comoComprobanteArca(i);
  return c ? arcaInvoiceKey(c) : null;
}

// Las otras facturas cargadas que son ESTE mismo comprobante (sin contarse a si misma).
export function duplicadasDe(i: FacturaEmitidaRef, todas: FacturaEmitidaRef[]): FacturaEmitidaRef[] {
  const clave = claveDeFacturaEmitida(i);
  if (!clave) return [];
  return todas.filter(
    (x) => !(x.id === i.id && x.origen === i.origen) && claveDeFacturaEmitida(x) === clave
  );
}

// Todos los comprobantes repetidos, agrupados por clave (para avisar de una).
export function duplicadosDeFacturasEmitidas(todas: FacturaEmitidaRef[]): Array<{ clave: string; facturas: FacturaEmitidaRef[] }> {
  const porClave = new Map<string, FacturaEmitidaRef[]>();
  todas.forEach((f) => {
    const clave = claveDeFacturaEmitida(f);
    if (!clave) return;
    if (!porClave.has(clave)) porClave.set(clave, []);
    porClave.get(clave)!.push(f);
  });
  return Array.from(porClave.entries())
    .filter(([, lista]) => lista.length > 1)
    .map(([clave, facturas]) => ({ clave, facturas }));
}

export const textoDuplicada = (otras: FacturaEmitidaRef[]): string =>
  otras.length === 0 ? "" : `⚠ este comprobante ya está cargado en ${otras.map((o) => o.donde).join(" y ")}`;

// ===================== UNA FACTURA, VARIOS TRABAJOS =====================
// Nicolas, 14/11/2026: "son 2 trabajos que se facturaron juntos. el monto de los 2 sumados debe ser el
// monto de la factura". Entonces el mismo comprobante en dos trabajos NO siempre es un error: puede estar
// REPARTIDO. Se marca a mano en la ficha (`repartida`), porque el sistema no puede saber si es eso o un
// numero mal tipeado. Marcada, en vez del aviso rojo muestra el reparto y lo que suman las partes: ese
// total es el que tiene que coincidir con el del listado de ARCA.
export type RepartoDeFactura = {
  partes: Array<{ donde: string; monto: number }>;
  total: number; // lo que suman todas las partes = el total del comprobante
};

export function repartoDeFactura(i: FacturaEmitidaRef, todas: FacturaEmitidaRef[]): RepartoDeFactura | null {
  const clave = claveDeFacturaEmitida(i);
  if (!clave) return null;
  const partes = todas.filter((x) => claveDeFacturaEmitida(x) === clave);
  if (partes.length < 2) return null;
  return {
    partes: partes.map((x) => ({ donde: x.donde, monto: Number(x.total || 0) })),
    total: partes.reduce((a, x) => a + Number(x.total || 0), 0),
  };
}

export const esRepartida = (i: { repartida?: boolean }, otras: Array<{ repartida?: boolean }>): boolean =>
  !!i.repartida || otras.some((o) => !!o.repartida);

export const textoReparto = (r: RepartoDeFactura, money: (n: number) => string): string =>
  `Comprobante repartido en ${r.partes.length} trabajos: ${r.partes
    .map((p) => `${p.donde} ${money(p.monto)}`)
    .join(" + ")} = ${money(r.total)} (ese total es el que tiene que decir ARCA)`;

// ===================== EMISION POR AFIP =====================
// El codigo del comprobante para emitir por AFIP (WSFE) sale del tipo elegido. Antes se deducia de que el
// texto empezara con "A", que con los tipos de ARCA ("1 - Factura A") ya no sirve.
export function codigoAfipDeFactura(i: FacturaEmitidaF): number {
  if (i.afipCbteTipo) return Number(i.afipCbteTipo);
  const tipo = tipoDeFactura(i);
  const cod = Number((tipo.match(/^(\d+)\s*-/) || [])[1] || 0);
  if (cod) return cod;
  return /^\s*A/i.test(String(i.invoiceType || "")) ? 1 : 6;
}

// ===================== IVA Y TOTAL =====================
// Una sola regla para las dos fichas (la del trabajo y la de entre empresas): si hay alicuota cargada, el
// IVA se calcula desde subtotal x alicuota, y el total es subtotal + IVA.
export function conIvaYTotal<T extends { subtotal?: number; vatRate?: number; vat?: number; total?: number }>(
  inv: T,
  campoTocado: string
): T {
  if (campoTocado !== "subtotal" && campoTocado !== "vatRate" && campoTocado !== "vat") return inv;
  const out = { ...inv };
  if (out.vatRate != null && (campoTocado === "subtotal" || campoTocado === "vatRate")) {
    out.vat = Number((Number(out.subtotal || 0) * (Number(out.vatRate) / 100)).toFixed(2));
  }
  out.total = Number(out.subtotal || 0) + Number(out.vat || 0);
  return out;
}

// ===================== LA MISMA FICHA EN LOS DOS LUGARES =====================
// La factura emitida se carga en la ficha del TRABAJO APROBADO o, cuando no hay trabajo de por medio (solo
// para acomodar los movimientos internos), en la ficha de FACTURAS ENTRE EMPRESAS. Es la misma ficha: la
// que guarda el padron de emitidas usa otros nombres de campo, asi que se traduce de una sola forma.
export const CAMPO_EN_EMITIDAS: Record<string, string> = {
  invoiceType: "kind",
  pointOfSale: "pointOfSale",
  invoiceNumber: "number",
  invoiceDate: "date",
  businessName: "counterpartyName",
  taxId: "counterpartyTaxId",
  currency: "currency",
  subtotal: "net",
  vatRate: "vatRate",
  vat: "vat",
  total: "total",
  repartida: "repartida",
};

export type ValoresFacturaEmitida = {
  invoiceType?: string;
  pointOfSale?: string;
  invoiceNumber?: string;
  invoiceDate?: string;
  businessName?: string;
  taxId?: string;
  currency?: string;
  subtotal?: number;
  vatRate?: number;
  vat?: number;
  total?: number;
  repartida?: boolean;
};

// Un comprobante del padron de emitidas, visto con los nombres de la ficha.
export function valoresDeEmitida(inv: {
  kind?: string; pointOfSale?: string; number?: string; date?: string; counterpartyName?: string;
  counterpartyTaxId?: string; currency?: string; net?: number; vatRate?: number; vat?: number; total?: number;
  repartida?: boolean;
}): ValoresFacturaEmitida {
  return {
    invoiceType: inv.kind || "",
    pointOfSale: inv.pointOfSale || "",
    invoiceNumber: inv.number || "",
    invoiceDate: inv.date || "",
    businessName: inv.counterpartyName || "",
    taxId: inv.counterpartyTaxId || "",
    currency: inv.currency || "ARS",
    subtotal: Number(inv.net || 0),
    vatRate: inv.vatRate,
    vat: Number(inv.vat || 0),
    total: Number(inv.total || 0),
    repartida: !!inv.repartida,
  };
}
