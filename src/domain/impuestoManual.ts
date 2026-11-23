// IMPUESTOS, TASAS E INTERESES CARGADOS A MANO (Nicolas, 23/11/2026).
// "Por cada transferencia que recibimos el banco nos cobra un impuesto. [...] Dentro de las opciones de pagos sin
// factura quiero que figure pago de impuestos, tasas e intereses. [...] Al cargarlos al dia tenemos la cuenta bancaria
// al dia", y el extracto o el resumen, cuando se suben, se linkean para corroborar.
//
// Es un pago comun (CostEntry) marcado `impuestoBanco`, con el BANCO como proveedor y en el mismo grupo que la deuda
// que arma el extracto. Dos bloques que no se mezclan:
//  - CUENTA: sale de la cuenta del banco el dia que se cobro (medio "debito").
//  - TARJETA: se paga al vencimiento del resumen, no antes (medio "tarjeta_credito", una cuota).
// Funciones puras.

export const GRUPO_IMPUESTOS_BANCO = "Impuestos y comisiones bancarias";
export const TITULO_IMPUESTO_CUENTA = "Impuestos, tasas e intereses (cuenta)";
export const TITULO_IMPUESTO_TARJETA = "Impuestos, tasas e intereses (tarjeta)";

export const TIPOS_IMPUESTO_BANCO = [
  "Impuesto al débito / crédito",
  "Comisión",
  "IVA",
  "Intereses",
  "Sellos",
  "Percepción / retención",
  "Otro",
] as const;

export type ImpuestoManual = { metodo: string; tipo?: string; descripcion?: string };

export const esImpuestoDeTarjeta = (metodo: string) => metodo === "tarjeta_credito";

/** El titulo con que se ve el gasto: bloque (cuenta / tarjeta) · tipo · lo que escribio quien lo cargo. */
export function descripcionDeImpuesto(i: ImpuestoManual): string {
  const titulo = esImpuestoDeTarjeta(i.metodo) ? TITULO_IMPUESTO_TARJETA : TITULO_IMPUESTO_CUENTA;
  return [titulo, String(i.tipo || "").trim(), String(i.descripcion || "").trim()].filter(Boolean).join(" · ");
}

/** Los campos del pago que fija esta opcion (el resto —fecha, monto, cuenta, firma— los pone el formulario). */
export function camposDeImpuesto(i: ImpuestoManual) {
  const tarjeta = esImpuestoDeTarjeta(i.metodo);
  return {
    group: GRUPO_IMPUESTOS_BANCO,
    description: descripcionDeImpuesto(i),
    paymentMethod: (tarjeta ? "tarjeta_credito" : "debito") as "tarjeta_credito" | "debito",
    administration: "blanco" as const,
    aCuenta: false,
    impuestoBanco: true,
    conciliaFinDeMes: true,
    impuestoTipo: String(i.tipo || "").trim() || undefined,
    notes: String(i.descripcion || "").trim(),
  };
}

// CONCILIACION A FIN DE MES: lo que se cargo en el dia y todavia no se linkeo con el extracto (bankEntryId) ni con un
// renglon del resumen de la tarjeta. Sirve para saber que falta subir el extracto o el resumen.
export const TITULO_CONCILIA = "A conciliar a fin de mes";
export type PagoAConciliar = { id: number; amount: number; conciliaFinDeMes?: boolean; bankEntryId?: number | null; paymentMethod?: string };
export function esperanConciliacion<T extends PagoAConciliar>(pagos: T[], linkeadosEnResumen: Set<number>): T[] {
  return pagos.filter((p) => p.conciliaFinDeMes && (p.paymentMethod === "tarjeta_credito" ? !linkeadosEnResumen.has(p.id) : p.bankEntryId == null));
}

// CONSTATACION CONTRA VEP: pagos marcados que todavia no tienen su VEP (la factura de ARCA) vinculado.
export const TITULO_VEP = "Pago a constatar contra VEP";
export type PagoConVep = { id: number; amount: number; esperaVep?: boolean; resolucionSinFactura?: unknown };
export function faltaElVep<T extends PagoConVep>(pagos: T[], pagosConFactura: Set<number>): T[] {
  return pagos.filter((p) => p.esperaVep && !p.resolucionSinFactura && !pagosConFactura.has(p.id));
}

/** Falta algo para guardar: la descripcion es obligatoria, es lo que despues deja reconocer el gasto. */
export const faltaEnImpuesto = (i: ImpuestoManual): string | null => (String(i.descripcion || "").trim() ? null : "Falta la descripción");
