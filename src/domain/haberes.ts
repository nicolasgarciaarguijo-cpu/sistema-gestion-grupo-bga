// HABERES DEL MES EN EL CASH FLOW (pedido de Nicolas, 2026-10-06).
//
// Cada empleado tiene su renglon en EGRESOS · HABERES y el pago cae solo el 4to dia habil del mes
// siguiente al periodo (LCT art. 128). Desde que "el banco corrobora, no carga" (29/08/2026) el sueldo
// BLANCO ya no entra por el debito del extracto: tiene que salir del sistema. Este modulo decide CUANTO
// en blanco y en negro, con este orden (el primero que exista manda):
//
//   BLANCO: 1) lo corregido a mano (desde la planilla o la ficha)
//           2) el NETO del recibo oficial cargado en la ficha (el gasto real)
//           3) el neto que calcula la liquidacion del mes (estimado)
//   NEGRO:  1) lo corregido a mano
//           2) lo acordado / premio en negro de la liquidacion
//
// Y la fecha: la corregida a mano, o el 4to dia habil.

export type FuenteHaber = "a mano" | "recibo oficial" | "liquidación" | "acordado en negro";

export type HaberesDelMes = {
  fecha: string;
  blanco: number;
  negro: number;
  fuenteBlanco: FuenteHaber;
  fuenteNegro: FuenteHaber;
};

export function haberesDelMes(input: {
  fechaPorDefecto: string; // 4to dia habil del mes siguiente
  payroll: {
    haberesBlanco?: number | null;
    haberesNegro?: number | null;
    haberesFecha?: string;
    reciboOficial?: { neto?: number | null } | null;
  };
  netoLiquidado: number; // neto blanco que calcula la liquidacion
  negroAcordado: number; // monthlyBlackPay
}): HaberesDelMes {
  const p = input.payroll || {};
  const num = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
  const blancoAMano = num(p.haberesBlanco);
  const reciboNeto = num(p.reciboOficial?.neto);
  const negroAMano = num(p.haberesNegro);
  const blanco =
    blancoAMano !== null && Number.isFinite(blancoAMano)
      ? { v: blancoAMano, f: "a mano" as const }
      : reciboNeto !== null && Number.isFinite(reciboNeto) && reciboNeto > 0
      ? { v: reciboNeto, f: "recibo oficial" as const }
      : { v: Math.max(0, Number(input.netoLiquidado || 0)), f: "liquidación" as const };
  const negro =
    negroAMano !== null && Number.isFinite(negroAMano)
      ? { v: negroAMano, f: "a mano" as const }
      : { v: Math.max(0, Number(input.negroAcordado || 0)), f: "acordado en negro" as const };
  return {
    fecha: p.haberesFecha || input.fechaPorDefecto,
    blanco: Math.max(0, blanco.v),
    negro: Math.max(0, negro.v),
    fuenteBlanco: blanco.f,
    fuenteNegro: negro.f,
  };
}

// Ids de los renglones automaticos del calendario: "payroll-white-<empId>-<yyyy-mm>".
export const idHaberBlanco = (empId: number, month: string) => `payroll-white-${empId}-${month}`;
export const idHaberNegro = (empId: number, month: string) => `payroll-black-${empId}-${month}`;

export function leerIdHaber(id: string): { admin: "blanco" | "negro"; empId: number; month: string } | null {
  const m = /^payroll-(white|black)-(\d+)-(\d{4}-\d{2})$/.exec(id || "");
  if (!m) return null;
  return { admin: m[1] === "white" ? "blanco" : "negro", empId: Number(m[2]), month: m[3] };
}

/**
 * LA CARGA A MANO LE GANA A LA AUTOMATICA. Si en el renglon de Haberes de un empleado ya hay un pago
 * cargado a mano (desde la planilla o Costos) en el MISMO mes y el MISMO circuito que el sueldo
 * automatico, ese pago a mano ES el sueldo de ese mes: el automatico se saca para no pagarlo dos veces.
 * (Hasta el 2026-10-06 los sueldos se cargaban a mano en la planilla; esto evita duplicarlos.)
 */
export function sacarHaberesDuplicados<
  T extends { id: string; date: string; company: string; conceptKey?: string; administration?: string }
>(entries: T[]): T[] {
  const clave = (e: T) =>
    `${e.company}|${e.conceptKey}|${(e.date || "").slice(0, 7)}|${e.administration === "negro" ? "negro" : "blanco"}`;
  const aMano = new Set(
    entries
      .filter((e) => (e.conceptKey || "").startsWith("custom:haberes:") && !e.id.startsWith("payroll-"))
      .map(clave)
  );
  return entries.filter((e) => !(e.id.startsWith("payroll-") && aMano.has(clave(e))));
}
