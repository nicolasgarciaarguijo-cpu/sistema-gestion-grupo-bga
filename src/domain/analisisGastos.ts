// ANALISIS DE GASTOS (solapa "Compras y análisis de gastos", Nicolas 2026-10-14).
//
// "Compras = todos los pagos del sistema, separados y clasificados por las solapas que se vinculan a
// egresos." No es una carga nueva: se arma con lo que YA alimenta el Calendario anual (cada egreso
// realizado, con su renglon, empresa y blanco/negro) mas lo que viene en Pagos programados (tarjetas,
// cuotas, seguros, vencimientos). Asi cargue donde cargue, el gasto aparece aca solo y una sola vez.
//
// Reglas:
//  - SOLO lo REALIZADO suma en los totales. Programado / estimado / inamovible se muestran aparte.
//  - Blanco y negro SIEMPRE separados. Pesos y dolares NUNCA se mezclan.
//  - Fijo / variable sale del gasto (costKind); si no lo tiene, queda "sin definir" (no se inventa).
//  - Las facturas (registro) y los movimientos internos (pases, prestamos) NO son gasto.

import { CALENDAR_ITEM_INDEX, CALENDAR_SECTIONS, esCobranzaReal } from "./calendarStructure";

export type GrupoGasto =
  | "personal"
  | "empresariales"
  | "funcionamiento"
  | "materiales"
  | "bancos"
  | "deudas"
  | "seguros"
  | "cajaChica"
  | "otros"
  | "sinClasificar";

export const GRUPOS_GASTO: Array<{ key: GrupoGasto; label: string; detalle: string }> = [
  { key: "personal", label: "Gastos de personal", detalle: "Salarios, aguinaldos, cargas sociales, RRHH" },
  { key: "empresariales", label: "Gastos empresariales", detalle: "IVA (VEP), ganancias, impuestos" },
  { key: "funcionamiento", label: "Gastos de funcionamiento", detalle: "Logística, administración, comerciales" },
  { key: "materiales", label: "Materiales e insumos", detalle: "Compras a proveedores para producir" },
  { key: "bancos", label: "Bancos y tarjetas", detalle: "Comisiones, impuestos bancarios, tarjetas" },
  { key: "deudas", label: "Deudas y créditos", detalle: "Cuotas de créditos y planes" },
  { key: "seguros", label: "Seguros", detalle: "Pólizas" },
  { key: "cajaChica", label: "Caja chica y viáticos", detalle: "Fondos asignados" },
  { key: "otros", label: "Otros egresos", detalle: "Renglones propios" },
  { key: "sinClasificar", label: "Sin clasificar (D)", detalle: "Salió plata y no tiene renglón" },
];

// Seccion del Calendario -> grupo del analisis.
const GRUPO_DE_SECCION: Record<string, GrupoGasto> = {
  haberes: "personal",
  cargas_sociales: "personal",
  gastos_rrhh: "personal",
  impuestos: "empresariales",
  logistica: "funcionamiento",
  gastos_admin: "funcionamiento",
  gastos_comerciales: "funcionamiento",
  compras_insumos: "materiales",
  compra_materiales: "materiales",
  bancos: "bancos",
  seguros: "seguros",
  caja_chica: "cajaChica",
};

export type EstadoGasto = "realizado" | "programado" | "estimado" | "inamovible";

export type Egreso = {
  id: string;
  fecha: string;
  company: string;
  titulo: string;
  grupo: GrupoGasto;
  renglon: string; // nombre del renglon del Calendario
  conceptKey: string;
  administracion: "blanco" | "negro";
  fv: "fijo" | "variable" | null;
  estado: EstadoGasto;
  monto: number;
  moneda: "ARS" | "USD";
  fuente: string; // de que solapa viene
};

// Lo que llega del Calendario (mismas entradas que dibuja la planilla).
export type EntradaCalendario = {
  id: string;
  date: string;
  company: string;
  title: string;
  kind: string;
  amount: number;
  statusLabel?: string;
  conceptKey?: string;
  administration?: "blanco" | "negro";
  currency?: "ARS" | "USD";
  costKind?: "fijo" | "variable";
};

// Lo que llega de Pagos programados (agenda).
export type PrevistoAgenda = {
  clave: string;
  origen: string; // manual | deuda | tarjeta | cashflow | seguro | sueldos
  company: string;
  titulo: string;
  fechaLimite: string;
  fechaConfirmada?: string;
  monto: number;
  currency: "ARS" | "USD";
  administration?: "blanco" | "negro";
  conceptKey?: string;
  pagado: boolean;
  estadoPago?: "programado" | "estimado" | "inamovible";
};

// FIJO / VARIABLE efectivo de un pago: si el tipo de gasto (renglon) tiene candado, manda el renglon;
// si no, el del pago, y si el pago no tiene, la sugerencia del renglon.
export function fvEfectivo(
  delPago: "fijo" | "variable" | undefined | null,
  conceptKey: string | undefined,
  porRenglon: Record<string, { kind: "fijo" | "variable"; locked: boolean }> | undefined
): "fijo" | "variable" | undefined {
  const r = conceptKey ? porRenglon?.[conceptKey] : undefined;
  if (r?.locked) return r.kind;
  return delPago || r?.kind || undefined;
}

const FUENTE_DE_KIND: Record<string, string> = {
  banco: "Banco",
  gasto: "Pago a proveedores",
  comision: "Comisiones",
  "caja-chica-fondo": "Caja chica",
  "haberes-negro": "Haberes",
  pago: "Cargado en el cash flow",
  cobranza: "Cargado en el cash flow",
};

const fuenteDe = (e: EntradaCalendario): string => {
  if (e.id.startsWith("payroll-")) return "Haberes";
  return FUENTE_DE_KIND[e.kind] || "Cash flow";
};

const seccionDeCustom = (ck: string) => {
  const rest = ck.slice("custom:".length);
  const sep = rest.indexOf(":");
  return { sectionKey: sep >= 0 ? rest.slice(0, sep) : rest, label: sep >= 0 ? rest.slice(sep + 1) : "" };
};

const dirDeSeccion = (sectionKey: string): "in" | "out" | undefined =>
  CALENDAR_SECTIONS.find((s) => s.key === sectionKey)?.dir;

// Una entrada del Calendario -> egreso realizado (o null si no es gasto).
export function egresoDeEntrada(e: EntradaCalendario): Egreso | null {
  const ck = e.conceptKey || "";
  const fuentesCalendario = ["banco", "cobranza", "comision", "gasto", "caja-chica-fondo", "haberes-negro", "pago"];
  if (!fuentesCalendario.includes(e.kind) && !ck) return null;
  if (ck === "__facturacion__" || ck === "__interno__") return null; // registro / pase interno
  if (e.kind === "banco" && ck === "cc_caja_chica") return null; // la extraccion del fondo (ya cuenta la asignacion)
  if (esCobranzaReal(e.kind, ck)) return null;
  // Un pago del cash flow todavia PENDIENTE no es plata que salio: ya figura en Pagos programados, y de
  // ahi lo toma el analisis (como previsto). Contarlo aca tambien seria duplicarlo.
  if (e.statusLabel === "pendiente") return null;
  const monto = Number(e.amount || 0);
  if (!e.date || !(monto > 0)) return null;

  let grupo: GrupoGasto;
  let renglon: string;
  if (e.kind === "comision") {
    grupo = "funcionamiento";
    renglon = "Comisiones";
  } else if (ck.startsWith("custom:")) {
    const { sectionKey, label } = seccionDeCustom(ck);
    if (dirDeSeccion(sectionKey) !== "out") return null;
    if (sectionKey === "mov_internos_out") return null;
    grupo = GRUPO_DE_SECCION[sectionKey] || "otros";
    renglon = label || e.title;
  } else if (ck && CALENDAR_ITEM_INDEX[ck]) {
    const idx = CALENDAR_ITEM_INDEX[ck];
    if (idx.dir !== "out" || idx.sectionKey === "mov_internos_out") return null;
    grupo = GRUPO_DE_SECCION[idx.sectionKey] || "otros";
    renglon = idx.label;
  } else {
    // Sin renglon: solo cuenta si es plata que SALIO.
    const sale = e.statusLabel === "debito" || e.kind === "gasto" || e.kind === "pago" || e.kind === "haberes-negro";
    if (!sale) return null;
    grupo = "sinClasificar";
    renglon = "Sin renglón";
  }
  return {
    id: e.id,
    fecha: e.date,
    company: e.company,
    titulo: (e.title || "—").trim(),
    grupo,
    renglon,
    conceptKey: ck,
    administracion: e.administration === "negro" ? "negro" : "blanco",
    fv: e.costKind || null,
    estado: "realizado",
    monto,
    moneda: e.currency === "USD" ? "USD" : "ARS",
    fuente: fuenteDe(e),
  };
}

// Estado de un pago de la agenda que todavia no se pago. Tarjeta y cuota de deuda no se pueden correr
// (inamovible); el resto esta programado. El estado propio por pago llega en la proxima fase.
const ESTADO_DE_ORIGEN: Record<string, EstadoGasto> = {
  tarjeta: "inamovible",
  deuda: "inamovible",
};
const GRUPO_DE_ORIGEN: Record<string, GrupoGasto> = {
  tarjeta: "bancos",
  deuda: "deudas",
  seguro: "seguros",
  sueldos: "personal",
};
const FUENTE_DE_ORIGEN: Record<string, string> = {
  tarjeta: "Tarjetas",
  deuda: "Deudas",
  seguro: "Seguros",
  sueldos: "Haberes",
  cashflow: "Cargado en el cash flow",
  manual: "Vencimiento",
  factura: "Facturas de proveedores",
};

export function egresoDePrevisto(p: PrevistoAgenda): Egreso | null {
  if (p.pagado) return null;
  const monto = Number(p.monto || 0);
  if (!(monto > 0)) return null;
  const ck = p.conceptKey || "";
  const idx = ck ? CALENDAR_ITEM_INDEX[ck] : undefined;
  const custom = ck.startsWith("custom:") ? seccionDeCustom(ck) : null;
  const grupo: GrupoGasto =
    GRUPO_DE_ORIGEN[p.origen] ||
    (idx ? GRUPO_DE_SECCION[idx.sectionKey] : custom ? GRUPO_DE_SECCION[custom.sectionKey] : undefined) ||
    (ck ? "otros" : "sinClasificar");
  return {
    id: `prev-${p.clave}`,
    fecha: p.fechaConfirmada || p.fechaLimite,
    company: p.company,
    titulo: p.titulo,
    grupo,
    renglon: idx?.label || custom?.label || p.titulo,
    conceptKey: ck,
    administracion: p.administration === "negro" ? "negro" : "blanco",
    fv: null,
    estado: p.estadoPago || ESTADO_DE_ORIGEN[p.origen] || "programado",
    monto,
    moneda: p.currency === "USD" ? "USD" : "ARS",
    fuente: FUENTE_DE_ORIGEN[p.origen] || "Pagos programados",
  };
}

export type Totales = { blanco: number; negro: number; total: number; fijo: number; variable: number; sinFV: number };
const ceros = (): Totales => ({ blanco: 0, negro: 0, total: 0, fijo: 0, variable: 0, sinFV: 0 });
const sumar = (t: Totales, e: Egreso) => {
  t[e.administracion] += e.monto;
  t.total += e.monto;
  if (e.fv === "fijo") t.fijo += e.monto;
  else if (e.fv === "variable") t.variable += e.monto;
  else t.sinFV += e.monto;
};

export type GrupoAnalizado = {
  key: GrupoGasto;
  label: string;
  detalle: string;
  realizado: Totales; // pesos, solo realizado
  usd: Totales; // dolares, solo realizado (nunca se mezcla)
  previsto: number; // pesos, programado + estimado + inamovible
  renglones: Array<{ renglon: string; realizado: Totales; previsto: number; items: Egreso[] }>;
};

// Arma el analisis de un periodo [desde, hasta] (fechas yyyy-mm-dd inclusive).
export function analizarGastos(egresos: Egreso[], desde: string, hasta: string): {
  grupos: GrupoAnalizado[];
  total: Totales;
  totalUsd: Totales;
  previsto: Record<Exclude<EstadoGasto, "realizado">, number>;
} {
  const enPeriodo = egresos.filter((e) => e.fecha >= desde && e.fecha <= hasta);
  const total = ceros();
  const totalUsd = ceros();
  const previsto = { programado: 0, estimado: 0, inamovible: 0 };
  const grupos: GrupoAnalizado[] = GRUPOS_GASTO.map((g) => {
    const items = enPeriodo.filter((e) => e.grupo === g.key);
    const realizado = ceros();
    const usd = ceros();
    let prev = 0;
    const porRenglon = new Map<string, { realizado: Totales; previsto: number; items: Egreso[] }>();
    items.forEach((e) => {
      if (!porRenglon.has(e.renglon)) porRenglon.set(e.renglon, { realizado: ceros(), previsto: 0, items: [] });
      const r = porRenglon.get(e.renglon)!;
      r.items.push(e);
      if (e.estado === "realizado") {
        if (e.moneda === "USD") {
          sumar(usd, e);
          sumar(totalUsd, e);
        } else {
          sumar(realizado, e);
          sumar(r.realizado, e);
          sumar(total, e);
        }
      } else if (e.moneda === "ARS") {
        prev += e.monto;
        r.previsto += e.monto;
        previsto[e.estado] += e.monto;
      }
    });
    const renglones = Array.from(porRenglon.entries())
      .map(([renglon, r]) => ({ renglon, ...r, items: r.items.sort((a, b) => a.fecha.localeCompare(b.fecha)) }))
      .sort((a, b) => b.realizado.total + b.previsto - (a.realizado.total + a.previsto));
    return { key: g.key, label: g.label, detalle: g.detalle, realizado, usd, previsto: prev, renglones };
  });
  return { grupos, total, totalUsd, previsto };
}
