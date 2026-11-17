// LA CONDICION DE PAGO QUE SALE DEL HISTORIAL (Nicolas, 16/11/2026: "sí, esos ocho").
//
// Los proveedores sin condicion de pago dejan sus facturas impagas SIN FECHA, asi que no entran al
// Calendario. Cargarla de a uno pide acordarse de los dias de cada proveedor; pero el sistema ya tiene
// como se le pago hasta ahora, asi que puede sugerirla: los dias que pasaron entre cada factura y su pago.
//
// Lo que se sugiere NO se aplica solo: se muestra y Nicolas lo acepta con un boton.

import type { CondicionPago } from "./proveedores";

export type PagoHistorico = {
  invoiceDate: string; // yyyy-mm-dd
  paymentDate: string; // yyyy-mm-dd
};

// Pagos a mas de medio ano de la factura: no son el plazo del proveedor, son cheques a fecha o un plan de
// pago (Dac tiene cheques al 22/01, 22/02, 22/03 y 22/04 de 2027). No se promedian, pero se cuentan para
// mostrarlos: tambien puede ser una fecha mal cargada, y asi se ve.
export const DIAS_MAXIMOS_CREIBLES = 180;

const diasEntre = (desde: string, hasta: string): number | null => {
  const a = Date.parse(`${String(desde).slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${String(hasta).slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
};

// Los plazos que se usan de verdad: el promedio se redondea al mas cercano de estos.
export const PLAZOS_HABITUALES = [7, 15, 21, 30, 45, 60, 75, 90, 120];

const alPlazoHabitual = (dias: number): number =>
  PLAZOS_HABITUALES.reduce((mejor, p) => (Math.abs(p - dias) < Math.abs(mejor - dias) ? p : mejor), PLAZOS_HABITUALES[0]);

const mediana = (ns: number[]): number => {
  const o = [...ns].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
};

export type Sugerencia = {
  condicion: CondicionPago;
  texto: string; // "a 30 días" / "contado" / "el 10 de cada mes"
  muestras: number; // pagos que se usaron
  dias: number[]; // los dias de cada pago, para mostrarlos
  descartados: number; // pagos a mas de 180 dias o anteriores a la factura (no se promediaron)
};

// La condicion que mejor describe como se le viene pagando. null = no hay con que decidir (hace falta al
// menos dos pagos creibles).
export function condicionSugerida(pagos: PagoHistorico[]): Sugerencia | null {
  const todos = pagos
    .map((p) => diasEntre(p.invoiceDate, p.paymentDate))
    .filter((d): d is number => d != null);
  const dias = todos.filter((d) => d >= 0 && d <= DIAS_MAXIMOS_CREIBLES);
  const descartados = todos.length - dias.length;
  if (dias.length < 2) return null;

  // Contado: se le paga el mismo dia o casi.
  if (dias.every((d) => d <= 3)) {
    return { condicion: { tipo: "contado" }, texto: "contado", muestras: dias.length, dias, descartados };
  }

  // Siempre el mismo dia del mes: es un vencimiento fijo, no un plazo.
  const diasDelMes = pagos
    .map((p) => Number(String(p.paymentDate).slice(8, 10)))
    .filter((n) => n >= 1 && n <= 31);
  if (diasDelMes.length >= 2) {
    const conteo = new Map<number, number>();
    diasDelMes.forEach((d) => conteo.set(d, (conteo.get(d) || 0) + 1));
    const [dia, veces] = Array.from(conteo.entries()).sort((a, b) => b[1] - a[1])[0];
    if (veces >= 2 && veces / diasDelMes.length >= 0.7) {
      return {
        condicion: { tipo: "diaDelMes", dia },
        texto: `el ${dia} de cada mes`,
        muestras: diasDelMes.length,
        dias,
        descartados,
      };
    }
  }

  const d = alPlazoHabitual(mediana(dias));
  return { condicion: { tipo: "dias", dias: d }, texto: `a ${d} días`, muestras: dias.length, dias, descartados };
}

export const textoDeCondicion = (c?: CondicionPago): string =>
  !c
    ? "sin condición"
    : c.tipo === "contado"
    ? "contado"
    : c.tipo === "dias"
    ? `a ${c.dias} días`
    : `el ${c.dia} de cada mes`;
