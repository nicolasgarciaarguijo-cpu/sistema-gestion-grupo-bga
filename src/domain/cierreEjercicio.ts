// CIERRE DE EJERCICIO. La foto del año fiscal cuando termina, y el arranque del siguiente.
//
// El problema que resuelve (2026-08-27, pedido de Nicolás): hoy el sistema no sabe de dónde arrancó
// el año. La reserva se calcula tomando el ÚLTIMO saldo de cada cuenta del extracto — es robusto a
// los meses que falten cargar, pero significa que el número depende de que el extracto esté al día.
// Al cerrar, ese número queda CLAVADO: el ejercicio siguiente arranca del saldo de cierre y no
// vuelve a depender de nada.
//
// Dos reglas que fijó Nicolás:
//   1. ARRASTRE: lo que queda abierto al cierre (a cobrar, a pagar, cuenta corriente del grupo) pasa
//      como saldo de apertura del ejercicio nuevo. El trabajo se sigue cobrando igual; lo que cambia
//      es que el ejercicio nuevo arranca sabiendo qué le deben y qué debe.
//   2. "TOCAR NO SE PUEDE, REVISAR SÍ": una vez cerrado, lo de ese ejercicio se mira pero no se
//      edita. Sin esto, el número de la foto y lo que el sistema muestra se separan con el primer
//      retoque, y la foto deja de servir.
//   3. EL SISTEMA SE LIMPIA (2026-08-27): el cierre GUARDA TODO EN LAS CARPETAS y despues SACA del
//      sistema lo del ejercicio cerrado. En el sistema queda unicamente lo que sigue PENDIENTE (lo
//      que falta cobrar, lo que falta pagar, la cuenta corriente del grupo) mas la foto. Todo lo
//      demas se revisa en las carpetas, no en el sistema. Asi el sistema no se hace cada vez mas
//      pesado con anos que ya no se tocan.
//
// ORDEN QUE NO SE NEGOCIA: primero se escribe en la carpeta y se verifica, despues se borra. Nunca
// al reves. Ver `particionarCierre`: dice que se queda y que se archiva, y no borra nada por su
// cuenta -- devolver la particion y ejecutarla son dos pasos distintos a proposito.
//
// Todo acá es puro: se le pasan los números ya calculados y arma/lee la foto. Nada de fechas de hoy
// ni de estado global, para poder testearlo.
import { fiscalYearBounds } from "./fiscalYear";

export type CierreCurrency = "ARS" | "USD";
export type CierreLocation = "banco" | "efectivo";
export type CierreColor = "blanco" | "negro";

// Un saldo de billetera al cierre. Son 8: 2 monedas × 2 lugares × 2 colores. Pesos y dólares nunca
// se suman (misma regla que la reserva).
export type CierreBilletera = {
  currency: CierreCurrency;
  location: CierreLocation;
  color: CierreColor;
  amount: number;
};

export type CierreEjercicio = {
  id: number;
  company: string;
  // Ejercicio que se cerró.
  fiscalStartMonth: number;
  fiscalStartYear: number;
  startIso: string;
  endIso: string;
  // Quién y cuándo.
  closedAt: string;
  closedBy: string;
  // --- LA FOTO ---
  billeteras: CierreBilletera[];
  // Arrastre: lo que queda abierto y pasa al ejercicio siguiente.
  aCobrar: number; // saldo de los trabajos aprobados que todavía no se cobró
  aPagar: number; // facturas de compra sin pago vinculado
  cuentaCorrienteGrupo: number; // neto con la otra empresa del grupo (+ le deben, − debe)
  resultado: { ingresos: number; egresos: number; resultado: number };
  iva: { debito: number; credito: number; saldo: number };
  notes: string;
  // Si se reabrió: el cierre deja de bloquear y deja de dar apertura, pero NO se borra (queda el
  // rastro de que existió y de que alguien lo abrió).
  reopenedAt?: string;
  reopenedBy?: string;
};

export const CIERRE_BILLETERAS: Array<{ currency: CierreCurrency; location: CierreLocation }> = [
  { currency: "ARS", location: "banco" },
  { currency: "ARS", location: "efectivo" },
  { currency: "USD", location: "banco" },
  { currency: "USD", location: "efectivo" },
];

// Un cierre reabierto ya no manda: ni bloquea ni da saldo de apertura.
export const cierreActivo = (c: CierreEjercicio): boolean => !c.reopenedAt;

export function cierresActivos(cierres: CierreEjercicio[]): CierreEjercicio[] {
  return (cierres || []).filter(cierreActivo);
}

// A qué ejercicio pertenece una fecha: el AÑO DE INICIO del año fiscal que la contiene.
// Ej: inicio en noviembre, fecha 2026-03-15 -> 2025 (el ejercicio arrancó en nov-2025).
export function ejercicioDeFecha(startMonth: number, iso: string): number | null {
  const d = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const sm = Math.min(12, Math.max(1, Math.round(startMonth)));
  const year = Number(d.slice(0, 4));
  const month = Number(d.slice(5, 7));
  return month >= sm ? year : year - 1;
}

/**
 * ¿Hay un cierre que tape esta fecha? Devuelve el cierre que la bloquea, o null.
 *
 * Bloquea todo lo que sea ANTERIOR O IGUAL al fin del último ejercicio cerrado, no solo el ejercicio
 * cerrado en sí: si se cerró nov-25/oct-26, tampoco se puede meter mano en octubre de 2024. Lo viejo
 * está tan cerrado como lo recién cerrado.
 */
export function cierreQueBloquea(
  cierres: CierreEjercicio[],
  company: string,
  iso: string
): CierreEjercicio | null {
  const d = String(iso || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const candidatos = cierresActivos(cierres)
    .filter((c) => c.company === company && d <= c.endIso)
    // El más reciente manda: es el que define hasta dónde llega el candado.
    .sort((a, b) => b.endIso.localeCompare(a.endIso));
  return candidatos[0] || null;
}

export const estaBloqueado = (cierres: CierreEjercicio[], company: string, iso: string): boolean =>
  cierreQueBloquea(cierres, company, iso) !== null;

// El último ejercicio cerrado de una empresa (el de fin más reciente).
export function ultimoCierre(cierres: CierreEjercicio[], company: string): CierreEjercicio | null {
  const propios = cierresActivos(cierres)
    .filter((c) => c.company === company)
    .sort((a, b) => b.endIso.localeCompare(a.endIso));
  return propios[0] || null;
}

/**
 * Saldo de APERTURA del ejercicio que arranca en `startYear`: es el cierre del ejercicio anterior.
 * Si ese ejercicio no se cerró (o se reabrió), no hay apertura y el sistema sigue calculando como
 * hasta ahora (último saldo del extracto).
 */
export function aperturaDeEjercicio(
  cierres: CierreEjercicio[],
  company: string,
  startYear: number
): CierreEjercicio | null {
  return (
    cierresActivos(cierres).find(
      (c) => c.company === company && c.fiscalStartYear === startYear - 1
    ) || null
  );
}

// Total de una moneda al cierre (los dos lugares y los dos colores). Pesos y dólares NUNCA se suman
// entre sí: por eso se pide la moneda.
export function totalDeMoneda(
  billeteras: CierreBilletera[],
  currency: CierreCurrency,
  filtro?: { location?: CierreLocation; color?: CierreColor }
): number {
  return (billeteras || [])
    .filter((b) => b.currency === currency)
    .filter((b) => !filtro?.location || b.location === filtro.location)
    .filter((b) => !filtro?.color || b.color === filtro.color)
    .reduce((acc, b) => acc + Number(b.amount || 0), 0);
}

// Forma de la reserva que necesitamos para armar la foto (la que devuelve aggregateReserva).
export type ReservaParaCierre = {
  wallets: Array<{
    currency: CierreCurrency;
    location: CierreLocation;
    byColor: Record<CierreColor, { closing: number }>;
  }>;
};

// Las 8 billeteras del cierre a partir de la reserva. Siempre las 8, aunque estén en cero: una
// billetera que falta se lee como "no la miramos", y una en cero se lee como "no hay plata ahí".
export function billeterasDesdeReserva(reserva: ReservaParaCierre): CierreBilletera[] {
  const out: CierreBilletera[] = [];
  CIERRE_BILLETERAS.forEach(({ currency, location }) => {
    const w = (reserva?.wallets || []).find(
      (x) => x.currency === currency && x.location === location
    );
    (["blanco", "negro"] as CierreColor[]).forEach((color) => {
      out.push({
        currency,
        location,
        color: color,
        amount: Number(w?.byColor?.[color]?.closing || 0),
      });
    });
  });
  return out;
}

export type ConstruirCierreInput = {
  id: number;
  company: string;
  fiscalStartMonth: number;
  fiscalStartYear: number;
  closedAt: string;
  closedBy: string;
  reserva: ReservaParaCierre;
  aCobrar: number;
  aPagar: number;
  cuentaCorrienteGrupo: number;
  resultado: { ingresos: number; egresos: number; resultado: number };
  iva: { debito: number; credito: number; saldo: number };
  notes?: string;
};

export function construirCierre(input: ConstruirCierreInput): CierreEjercicio {
  const { startIso, endIso } = fiscalYearBounds(input.fiscalStartMonth, input.fiscalStartYear);
  const n = (v: unknown) => {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  };
  return {
    id: input.id,
    company: input.company,
    fiscalStartMonth: input.fiscalStartMonth,
    fiscalStartYear: input.fiscalStartYear,
    startIso,
    endIso,
    closedAt: input.closedAt,
    closedBy: input.closedBy,
    billeteras: billeterasDesdeReserva(input.reserva),
    aCobrar: n(input.aCobrar),
    aPagar: n(input.aPagar),
    cuentaCorrienteGrupo: n(input.cuentaCorrienteGrupo),
    resultado: {
      ingresos: n(input.resultado?.ingresos),
      egresos: n(input.resultado?.egresos),
      resultado: n(input.resultado?.resultado),
    },
    iva: {
      debito: n(input.iva?.debito),
      credito: n(input.iva?.credito),
      saldo: n(input.iva?.saldo),
    },
    notes: String(input.notes || ""),
  };
}

/**
 * ¿Se puede cerrar? Devuelve los motivos por los que NO. Vacío = adelante.
 *
 * No mira si los números "cierran" (eso lo decide Nicolás mirando la foto): mira que no se cierre
 * dos veces, y que no se cierre un ejercicio que todavía no terminó — cerrar en el medio dejaría
 * afuera la plata que falta entrar.
 */
export function motivosParaNoCerrar(input: {
  cierres: CierreEjercicio[];
  company: string;
  fiscalStartMonth: number;
  fiscalStartYear: number;
  hoyIso: string;
}): string[] {
  const motivos: string[] = [];
  const { startIso, endIso } = fiscalYearBounds(input.fiscalStartMonth, input.fiscalStartYear);
  const yaCerrado = cierresActivos(input.cierres).some(
    (c) => c.company === input.company && c.fiscalStartYear === input.fiscalStartYear
  );
  if (yaCerrado) motivos.push("Este ejercicio ya está cerrado.");
  const hoy = String(input.hoyIso || "").slice(0, 10);
  if (hoy && hoy <= endIso) {
    motivos.push(`El ejercicio termina el ${endIso} y todavía no llegó esa fecha.`);
  }
  // Cerrar salteándose un ejercicio dejaría un agujero: el siguiente arrancaría sin apertura.
  const anterior = cierresActivos(input.cierres).find(
    (c) => c.company === input.company && c.fiscalStartYear === input.fiscalStartYear - 1
  );
  const hayAlgoAnterior = cierresActivos(input.cierres).some(
    (c) => c.company === input.company && c.fiscalStartYear < input.fiscalStartYear - 1
  );
  if (!anterior && hayAlgoAnterior) {
    motivos.push("Falta cerrar el ejercicio anterior: se estaría salteando uno.");
  }
  if (startIso > endIso) motivos.push("El ejercicio está mal configurado.");
  return motivos;
}

// ================================================================================================
// LA PARTICIÓN: qué se queda en el sistema y qué se va a las carpetas.
// ================================================================================================
//
// Regla de Nicolás (2026-08-27): en el sistema queda SOLO lo que sigue pendiente; el resto se revisa
// en las carpetas. Entonces, de todo lo que tenga fecha dentro del ejercicio cerrado:
//
//   SE QUEDA                                    SE ARCHIVA (y se saca del sistema)
//   ────────────────────────────────────────    ──────────────────────────────────────────────
//   trabajos con saldo a cobrar o comisión      trabajos cobrados y terminados
//   facturas de compra sin pagar                facturas de compra ya pagadas
//   fondos de caja chica todavía abiertos       fondos cerrados y sus gastos rendidos
//   catálogos (proveedores, grupos, stock,      movimientos del banco, gastos, ítems del
//   empleados, marcadores, tarjetas)            calendario, facturas emitidas, consumos de
//                                               tarjeta, asistencia, presupuestos guardados
//
// Un trabajo pendiente se queda ENTERO, con sus pagos y su historia: si le sacáramos los pagos
// viejos, el saldo a cobrar dejaría de poder calcularse y el arrastre sería un número suelto sin
// respaldo. Lo mismo con el fondo de caja chica abierto y sus gastos.
//
// Nada de esto BORRA: devuelve dos listas. Ejecutar la partición es un paso aparte, y va DESPUÉS de
// que la carpeta confirmó que escribió.

// Lo mínimo que necesitamos saber de cada cosa para decidir. Se usan tipos laxos a propósito: este
// módulo no tiene por qué conocer la forma completa de un trabajo ni de una factura.
export type ConFecha = { date?: string; company?: string };

export type TrabajoParaCierre = {
  id: number;
  company: string;
  // Fecha con la que el trabajo cae en un ejercicio (aprobación o inicio).
  date?: string;
  // Lo que todavía falta cobrar. > 0 = pendiente.
  saldoACobrar: number;
  // Comisión que falta pagar. > 0 = pendiente.
  comisionPendiente?: number;
  // Terminado de fabricar/entregar.
  terminado?: boolean;
};

export type FacturaCompraParaCierre = {
  id: number;
  company: string;
  date?: string;
  // Sin pago vinculado = deuda viva.
  pagada: boolean;
};

export type FondoParaCierre = {
  id: number;
  company: string;
  date?: string;
  closed?: boolean;
};

export type ParticionCierre<T> = { quedan: T[]; archivar: T[] };

const dentroDelEjercicio = (item: ConFecha, company: string, endIso: string): boolean => {
  if (item.company !== company) return false;
  const d = String(item.date || "").slice(0, 10);
  // Sin fecha no se archiva: preferimos que quede en el sistema y se vea, antes que hacerlo
  // desaparecer sin saber a qué año pertenecía.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  return d <= endIso;
};

// Genérico: todo lo que caiga dentro del ejercicio se archiva. Sirve para movimientos del banco,
// gastos, ítems del calendario, facturas emitidas, consumos de tarjeta y presupuestos guardados.
export function particionarPorFecha<T extends ConFecha>(
  items: T[],
  company: string,
  endIso: string
): ParticionCierre<T> {
  const quedan: T[] = [];
  const archivar: T[] = [];
  (items || []).forEach((item) => {
    if (dentroDelEjercicio(item, company, endIso)) archivar.push(item);
    else quedan.push(item);
  });
  return { quedan, archivar };
}

// Un trabajo se queda si le falta cobrar algo, si le falta pagar comisión, o si no está terminado.
export function particionarTrabajos<T extends TrabajoParaCierre>(
  trabajos: T[],
  company: string,
  endIso: string
): ParticionCierre<T> {
  const quedan: T[] = [];
  const archivar: T[] = [];
  (trabajos || []).forEach((t) => {
    if (!dentroDelEjercicio(t, company, endIso)) {
      quedan.push(t);
      return;
    }
    const pendiente =
      Number(t.saldoACobrar || 0) > 0.5 ||
      Number(t.comisionPendiente || 0) > 0.5 ||
      t.terminado === false;
    if (pendiente) quedan.push(t);
    else archivar.push(t);
  });
  return { quedan, archivar };
}

export function particionarFacturasCompra<T extends FacturaCompraParaCierre>(
  facturas: T[],
  company: string,
  endIso: string
): ParticionCierre<T> {
  const quedan: T[] = [];
  const archivar: T[] = [];
  (facturas || []).forEach((f) => {
    if (!dentroDelEjercicio(f, company, endIso)) {
      quedan.push(f);
      return;
    }
    if (f.pagada) archivar.push(f);
    else quedan.push(f);
  });
  return { quedan, archivar };
}

export function particionarFondos<T extends FondoParaCierre>(
  fondos: T[],
  company: string,
  endIso: string
): ParticionCierre<T> {
  const quedan: T[] = [];
  const archivar: T[] = [];
  (fondos || []).forEach((f) => {
    if (!dentroDelEjercicio(f, company, endIso)) {
      quedan.push(f);
      return;
    }
    if (f.closed) archivar.push(f);
    else quedan.push(f);
  });
  return { quedan, archivar };
}

/**
 * Los gastos de un fondo que SE QUEDA tienen que quedarse con él, aunque su fecha caiga dentro del
 * ejercicio cerrado: son su rendición y sin ellos el fondo no cierra.
 */
export function particionarGastosDeCajaChica<T extends ConFecha & { fundId?: number | null }>(
  gastos: T[],
  company: string,
  endIso: string,
  fondosQueQuedan: Array<{ id: number }>
): ParticionCierre<T> {
  const vivos = new Set(fondosQueQuedan.map((f) => f.id));
  const quedan: T[] = [];
  const archivar: T[] = [];
  (gastos || []).forEach((g) => {
    if (!dentroDelEjercicio(g, company, endIso)) {
      quedan.push(g);
      return;
    }
    if (g.fundId != null && vivos.has(g.fundId)) quedan.push(g);
    else archivar.push(g);
  });
  return { quedan, archivar };
}

// Cuánto se saca de encima el cierre, para poder decírselo antes de apretar el botón.
export function resumenDeLaPurga(
  bloques: Array<{ nombre: string; archivar: unknown[]; quedan: unknown[] }>
): { archivados: number; conservados: number; detalle: Array<{ nombre: string; archivar: number; quedan: number }> } {
  const detalle = bloques.map((b) => ({
    nombre: b.nombre,
    archivar: b.archivar.length,
    quedan: b.quedan.length,
  }));
  return {
    archivados: detalle.reduce((a, d) => a + d.archivar, 0),
    conservados: detalle.reduce((a, d) => a + d.quedan, 0),
    detalle,
  };
}
