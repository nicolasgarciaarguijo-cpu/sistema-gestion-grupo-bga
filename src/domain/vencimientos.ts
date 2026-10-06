// VENCIMIENTOS: las fechas que no se pueden fallar (pedido de Nicolas, 2026-10-05).
//
// Un vencimiento es un recordatorio con una VENTANA ("entre el 18 y el 22 vence el IVA"). Se repite
// todos los meses, una vez por año o una sola vez. Cuando se sabe la fecha exacta de una ocurrencia
// se la CONFIRMA, y recien ahi baja al Calendario anual como PREVISION en su renglon: va por el carril
// de previsiones (el mismo de Seguros), que NO suma al neto -- el neto lo mueve el pago real. Si
// sumara, el mismo pago se contaria dos veces: una como prevision y otra cuando cae el banco.
//
// Se da por PAGADO solo (cuando en el mes cae plata real en su renglon que cubre lo previsto) o a mano.
// Mientras no este pagado, avisa: "faltan 2 dias", "vence hoy", "vencido hace 1 dia".
// Funciones puras y testeadas: sin React ni estado.

export type VencimientoRecurrencia = "mensual" | "anual" | "unica";
export type VencimientoTipo = "deuda" | "impuesto" | "servicio" | "sueldos" | "otro";

export type VencimientoOcurrenciaDato = {
  fecha?: string; // fecha exacta confirmada (yyyy-mm-dd)
  monto?: number; // monto de ESTA ocurrencia, si difiere del habitual
  pagado?: boolean; // marcado a mano
  pagadoEl?: string;
};

export type Vencimiento = {
  id: number;
  company: string;
  titulo: string;
  tipo: VencimientoTipo;
  monto: number; // monto habitual (estimado)
  currency?: "ARS" | "USD";
  administration: "blanco" | "negro";
  conceptKey?: string; // renglon del Calendario anual donde cae el pago
  recurrencia: VencimientoRecurrencia;
  // Ventana. Mensual: dia desde/hasta de cada mes. Anual: ademas el mes (1-12). Unica: fechas ISO.
  diaDesde?: number;
  diaHasta?: number;
  mes?: number;
  fechaDesde?: string;
  fechaHasta?: string;
  avisoDias: number; // con cuantos dias de anticipacion empieza a avisar
  activo: boolean;
  // Datos por ocurrencia. Clave: "yyyy-mm" (mensual), "yyyy" (anual) o "unica".
  ocurrencias?: Record<string, VencimientoOcurrenciaDato>;
  notas: string;
  createdAt?: string;
  updatedAt?: string;
};

export type Ocurrencia = {
  vencimientoId: number;
  key: string;
  company: string;
  titulo: string;
  tipo: VencimientoTipo;
  conceptKey: string;
  administration: "blanco" | "negro";
  currency: "ARS" | "USD";
  ventanaDesde: string; // ISO
  ventanaHasta: string; // ISO
  fechaConfirmada?: string;
  // La fecha que manda para avisar: la confirmada, o si no, el ULTIMO dia de la ventana (el limite).
  fechaLimite: string;
  monto: number;
  pagadoAMano: boolean;
  avisoDias: number;
};

const pad = (n: number) => String(n).padStart(2, "0");
const ultimoDia = (y: number, m: number) => new Date(y, m, 0).getDate();
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(Math.min(d, ultimoDia(y, m)))}`;

function base(v: Vencimiento, key: string, desde: string, hasta: string): Ocurrencia {
  const dato = v.ocurrencias?.[key] || {};
  const fechaConfirmada = dato.fecha || undefined;
  return {
    vencimientoId: v.id,
    key,
    company: v.company,
    titulo: v.titulo,
    tipo: v.tipo,
    conceptKey: v.conceptKey || "",
    administration: v.administration === "negro" ? "negro" : "blanco",
    currency: v.currency === "USD" ? "USD" : "ARS",
    ventanaDesde: desde,
    ventanaHasta: hasta,
    fechaConfirmada,
    fechaLimite: fechaConfirmada || hasta,
    monto: Number(dato.monto ?? v.monto ?? 0),
    pagadoAMano: !!dato.pagado,
    avisoDias: Math.max(0, Number(v.avisoDias ?? 5)),
  };
}

/**
 * Ocurrencias del vencimiento cuya ventana (o fecha confirmada) toca el rango [desde, hasta] (ISO).
 * Una ventana con el dia "hasta" menor que el "desde" (ej. 28 al 5) cruza al mes siguiente.
 */
export function ocurrenciasEnRango(v: Vencimiento, desde: string, hasta: string): Ocurrencia[] {
  if (!v.activo) return [];
  const out: Ocurrencia[] = [];
  // Un vencimiento cuenta desde que se cargo: si no, al crear "IVA todos los meses" aparecerian como
  // vencidos los meses anteriores, que se pagaron sin que el sistema lo supiera.
  const desdeAlta = (v.createdAt || "").slice(0, 10);
  const toca = (o: Ocurrencia) => {
    if (desdeAlta && o.fechaLimite < desdeAlta && !o.fechaConfirmada) return false;
    const ini = o.fechaConfirmada && o.fechaConfirmada < o.ventanaDesde ? o.fechaConfirmada : o.ventanaDesde;
    const fin = o.fechaConfirmada && o.fechaConfirmada > o.ventanaHasta ? o.fechaConfirmada : o.ventanaHasta;
    return fin >= desde && ini <= hasta;
  };
  if (v.recurrencia === "unica") {
    const d = v.fechaDesde || v.fechaHasta;
    const h = v.fechaHasta || v.fechaDesde;
    if (!d || !h) return [];
    const o = base(v, "unica", d <= h ? d : h, d <= h ? h : d);
    return toca(o) ? [o] : [];
  }
  const dDesde = Math.min(31, Math.max(1, Math.round(Number(v.diaDesde || 1))));
  const dHasta = Math.min(31, Math.max(1, Math.round(Number(v.diaHasta || dDesde))));
  const [y0] = desde.split("-").map(Number);
  const [y1] = hasta.split("-").map(Number);
  // Un margen de un periodo para atras: una ventana que cruza de mes/año puede empezar antes del rango.
  if (v.recurrencia === "anual") {
    const mes = Math.min(12, Math.max(1, Math.round(Number(v.mes || 1))));
    for (let y = y0 - 1; y <= y1; y++) {
      const ventanaDesde = iso(y, mes, dDesde);
      const cruza = dHasta < dDesde;
      const yH = cruza && mes === 12 ? y + 1 : y;
      const mH = cruza ? (mes === 12 ? 1 : mes + 1) : mes;
      const o = base(v, String(y), ventanaDesde, iso(yH, mH, dHasta));
      if (toca(o)) out.push(o);
    }
    return out;
  }
  // mensual
  const [, m0] = desde.split("-").map(Number);
  let y = y0;
  let m = m0 - 1;
  if (m < 1) { m = 12; y -= 1; }
  for (let guard = 0; guard < 600; guard++) {
    const key = `${y}-${pad(m)}`;
    if (`${key}-01` > hasta) break;
    const cruza = dHasta < dDesde;
    const yH = cruza && m === 12 ? y + 1 : y;
    const mH = cruza ? (m === 12 ? 1 : m + 1) : m;
    const o = base(v, key, iso(y, m, dDesde), iso(yH, mH, dHasta));
    if (toca(o)) out.push(o);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return out;
}

// Dias enteros entre dos fechas ISO (b - a), sin que el horario de verano mueva la cuenta.
export function diasEntre(a: string, b: string): number {
  const ms = (s: string) => {
    const [y, m, d] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((ms(b) - ms(a)) / 86400000);
}

export type EstadoVencimiento = "pagado" | "vencido" | "hoy" | "proximo" | "en_ventana" | "futuro";

export type OcurrenciaConEstado = Ocurrencia & {
  estado: EstadoVencimiento;
  diasRestantes: number; // hasta la fecha limite (negativo = vencido)
  pagadoPorBanco: boolean;
  alerta: boolean; // true = hay que mostrarla en el aviso
  texto: string; // "Faltan 2 días", "Vence hoy", "Vencido hace 1 día", "Pagado"
};

/**
 * Estado de una ocurrencia hoy. `pagadoPorBanco`: si en su renglon y mes cayo plata real que cubre lo
 * previsto (lo calcula `pagadoPorConciliacion`).
 */
export function estadoOcurrencia(o: Ocurrencia, hoy: string, pagadoPorBanco = false): OcurrenciaConEstado {
  const diasRestantes = diasEntre(hoy, o.fechaLimite);
  const pagado = o.pagadoAMano || pagadoPorBanco;
  let estado: EstadoVencimiento;
  if (pagado) estado = "pagado";
  else if (diasRestantes < 0) estado = "vencido";
  else if (diasRestantes === 0) estado = "hoy";
  else if (diasRestantes <= o.avisoDias) estado = "proximo";
  else if (hoy >= o.ventanaDesde) estado = "en_ventana";
  else estado = "futuro";
  const plural = (n: number) => (n === 1 ? "día" : "días");
  const texto =
    estado === "pagado"
      ? pagadoPorBanco && !o.pagadoAMano
        ? "Pagado (cayó en el banco)"
        : "Pagado"
      : estado === "vencido"
      ? `Vencido hace ${-diasRestantes} ${plural(-diasRestantes)}`
      : estado === "hoy"
      ? "Vence hoy"
      : `Faltan ${diasRestantes} ${plural(diasRestantes)}`;
  return {
    ...o,
    estado,
    diasRestantes,
    pagadoPorBanco: pagadoPorBanco && !o.pagadoAMano,
    alerta: estado === "vencido" || estado === "hoy" || estado === "proximo" || estado === "en_ventana",
    texto,
  };
}

// Plata REAL que cayo en un renglon y mes, por empresa: "empresa|renglon|yyyy-mm" -> monto (positivo).
export type RealPorRenglonMes = Map<string, number>;
export const claveReal = (company: string, conceptKey: string, monthKey: string) =>
  `${company}|${conceptKey}|${monthKey}`;

/**
 * Arma el mapa de plata real desde las entradas del calendario. Solo cuenta lo que tiene renglon y
 * esta en pesos (los dolares van aparte y nunca se mezclan).
 */
export function realPorRenglonMes(
  entries: Array<{ date: string; company: string; amount: number; conceptKey?: string; currency?: string }>
): RealPorRenglonMes {
  const out: RealPorRenglonMes = new Map();
  entries.forEach((e) => {
    if (!e.conceptKey || e.conceptKey.startsWith("__") || !e.date) return;
    if (e.currency === "USD") return;
    const k = claveReal(e.company, e.conceptKey, e.date.slice(0, 7));
    out.set(k, (out.get(k) || 0) + Math.abs(Number(e.amount || 0)));
  });
  return out;
}

/**
 * ¿Ya se pago, segun el banco? Solo si la ocurrencia tiene renglon: en el mes de su fecha limite cayo
 * plata real en ese renglon (de esa empresa) que cubre lo previsto, con $1 de tolerancia. Si el
 * monto previsto es 0 (no se sabe), alcanza con que haya caido algo.
 */
export function pagadoPorConciliacion(o: Ocurrencia, real: RealPorRenglonMes, tolerancia = 1): boolean {
  if (!o.conceptKey || o.currency === "USD") return false;
  const r = real.get(claveReal(o.company, o.conceptKey, o.fechaLimite.slice(0, 7))) || 0;
  if (!(r > 0)) return false;
  return o.monto > 0 ? r >= o.monto - tolerancia : true;
}

/** Todas las ocurrencias de un rango con su estado, ordenadas por fecha limite. */
export function agendaDeVencimientos(
  vencimientos: Vencimiento[],
  desde: string,
  hasta: string,
  hoy: string,
  real: RealPorRenglonMes = new Map()
): OcurrenciaConEstado[] {
  return vencimientos
    .flatMap((v) => ocurrenciasEnRango(v, desde, hasta))
    .map((o) => estadoOcurrencia(o, hoy, pagadoPorConciliacion(o, real)))
    .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite) || a.titulo.localeCompare(b.titulo));
}

/**
 * Lo que baja al Calendario anual: SOLO las ocurrencias con fecha CONFIRMADA y renglon asignado, en
 * pesos. Va al carril de previsiones (no suma al neto). Sin fecha confirmada se queda en el panel
 * de vencimientos: la ventana es un aviso, no una fecha de pago.
 */
export function previsionesDeVencimientos(
  vencimientos: Vencimiento[],
  desde: string,
  hasta: string
): Array<{
  conceptKey: string;
  company: string;
  date: string;
  amount: number;
  administration: "blanco" | "negro";
  tipo: string;
  descripcion: string;
}> {
  return vencimientos
    .flatMap((v) => ocurrenciasEnRango(v, desde, hasta))
    .filter((o) => !!o.fechaConfirmada && !!o.conceptKey && o.currency !== "USD" && o.monto > 0)
    .filter((o) => o.fechaConfirmada! >= desde && o.fechaConfirmada! <= hasta)
    .map((o) => ({
      conceptKey: o.conceptKey,
      company: o.company,
      date: o.fechaConfirmada!,
      amount: o.monto,
      administration: o.administration,
      tipo: "Vencimiento",
      descripcion: o.titulo,
    }));
}

/** Texto de la ventana para mostrar: "del 18 al 22 de cada mes", "15/03 al 20/03", etc. */
export function textoVentana(v: Vencimiento): string {
  const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  const fmt = (s?: string) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "?");
  if (v.recurrencia === "unica") {
    return v.fechaDesde && v.fechaHasta && v.fechaDesde !== v.fechaHasta
      ? `del ${fmt(v.fechaDesde)} al ${fmt(v.fechaHasta)}`
      : `el ${fmt(v.fechaDesde || v.fechaHasta)}`;
  }
  const d = Number(v.diaDesde || 1);
  const h = Number(v.diaHasta || d);
  const dias = d === h ? `el ${d}` : `del ${d} al ${h}`;
  if (v.recurrencia === "anual") return `${dias} de ${MESES[Math.min(12, Math.max(1, Number(v.mes || 1))) - 1]}, todos los años`;
  return `${dias} de cada mes`;
}
