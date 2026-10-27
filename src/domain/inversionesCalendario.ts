// INVERSIONES -> CALENDARIO ANUAL (Nicolas, 2026-10-14: "se debe vincular con la solapa de
// inversiones"). La solapa es la duena del dato:
//
//  - COLOCACION: al empezar la inversion (fecha de inicio + capital) la plata SALE de su cuenta ->
//    EGRESOS · INVERSIONES. No es un gasto: es plata que se pone a trabajar (el analisis de gastos la
//    deja afuera, como los movimientos internos).
//  - RESCATE: al cerrarla (fecha de fin + lo que volvio) la plata ENTRA -> INGRESOS · INVERSIONES, en el
//    renglon de su tipo (plazo fijo, FCI, cauciones u otra). Rescate - colocacion = la ganancia.
//
// Pesos y dolares nunca se mezclan; cada inversion es blanco o negro.

export const RENGLON_COLOCACION = "inv_colocacion";
export const RENGLONES_RESCATE = ["rescate_plazo_fijo", "rescate_fci_mix", "rescate_fci_plus", "rescate_cauciones", "rescate_otra"];

export type InversionLike = {
  id: number;
  company: string;
  tipo: string;
  descripcion: string;
  moneda: "ARS" | "USD";
  montoInvertido: number;
  valorActual: number;
  fechaInicio: string;
  fechaFin: string;
  estado: "activa" | "cerrada";
  administration?: "blanco" | "negro";
  cuentaId?: string;
  montoRescatado?: number;
  renglonRescate?: string;
};

const sinAcentos = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Renglon del rescate: el elegido, o el que corresponde al tipo.
export function renglonDeRescate(inv: Pick<InversionLike, "tipo" | "descripcion" | "renglonRescate">): string {
  if (inv.renglonRescate && RENGLONES_RESCATE.includes(inv.renglonRescate)) return inv.renglonRescate;
  const t = sinAcentos(`${inv.tipo} ${inv.descripcion}`);
  if (/plazo fijo/.test(t)) return "rescate_plazo_fijo";
  if (/caucion/.test(t)) return "rescate_cauciones";
  if (/fci|fondo comun/.test(t)) return /mix/.test(t) ? "rescate_fci_mix" : "rescate_fci_plus";
  return "rescate_otra";
}

// Lo que volvio: lo cargado como rescate; si no, la ultima valuacion.
export const montoDeRescate = (inv: InversionLike) =>
  Number(inv.montoRescatado != null && inv.montoRescatado > 0 ? inv.montoRescatado : inv.valorActual || 0);

export type EntradaInversion = {
  id: string;
  date: string;
  company: string;
  title: string;
  kind: "inversion";
  amount: number;
  statusLabel: "credito" | "debito";
  conceptKey: string;
  administration: "blanco" | "negro";
  currency: "ARS" | "USD";
};

export function entradasInversiones(inversiones: InversionLike[]): EntradaInversion[] {
  const out: EntradaInversion[] = [];
  inversiones.forEach((inv) => {
    const nombre = [inv.tipo, inv.descripcion].filter(Boolean).join(" · ") || "Inversión";
    const adm = inv.administration === "negro" ? "negro" : "blanco";
    const currency = inv.moneda === "USD" ? "USD" : "ARS";
    const colocado = Number(inv.montoInvertido || 0);
    if (inv.fechaInicio && colocado > 0) {
      out.push({
        id: `inv-coloc-${inv.id}`,
        date: inv.fechaInicio,
        company: inv.company,
        title: `Colocación · ${nombre}`,
        kind: "inversion",
        amount: colocado,
        statusLabel: "debito",
        conceptKey: RENGLON_COLOCACION,
        administration: adm,
        currency,
      });
    }
    const rescatado = montoDeRescate(inv);
    if (inv.estado === "cerrada" && inv.fechaFin && rescatado > 0) {
      out.push({
        id: `inv-rescate-${inv.id}`,
        date: inv.fechaFin,
        company: inv.company,
        title: `Rescate · ${nombre}`,
        kind: "inversion",
        amount: rescatado,
        statusLabel: "credito",
        conceptKey: renglonDeRescate(inv),
        administration: adm,
        currency,
      });
    }
  });
  return out;
}

// Al cargar desde la planilla en un renglon de inversiones: que se hace en la solapa.
export function destinoInversion(conceptKey: string): "colocacion" | "rescate" | null {
  if (conceptKey === RENGLON_COLOCACION) return "colocacion";
  if (RENGLONES_RESCATE.includes(conceptKey)) return "rescate";
  return null;
}

// RESCATE PREVISTO (Nicolas, 2026-10-27): una inversion activa con fecha de fin se ve en la planilla como "≈" en
// INGRESOS · INVERSIONES el dia que vence, por su ultima valuacion (o el capital si no se valuo). Va por el carril de
// previsiones: no suma. Al rescatarla (cerrada) la prevision desaparece y manda el rescate real.
// Solo pesos: el carril de previsiones no lleva moneda y un monto en dolares se leeria como pesos.
export type PrevisionRescate = {
  conceptKey: string;
  company: string;
  date: string;
  amount: number;
  tipo: string;
  descripcion: string;
  administration: "blanco" | "negro";
  cuentaId?: string;
};
export function previsionesDeRescate(inversiones: InversionLike[]): PrevisionRescate[] {
  return inversiones
    .filter((inv) => inv.estado === "activa" && inv.fechaFin && inv.moneda !== "USD")
    .map((inv) => ({ inv, monto: Number(inv.valorActual) > 0 ? Number(inv.valorActual) : Number(inv.montoInvertido || 0) }))
    .filter(({ monto }) => monto > 0)
    .map(({ inv, monto }) => ({
      conceptKey: renglonDeRescate(inv),
      company: inv.company,
      date: inv.fechaFin,
      amount: monto,
      tipo: inv.tipo,
      descripcion: inv.descripcion,
      administration: inv.administration === "negro" ? "negro" : "blanco",
      ...(inv.cuentaId ? { cuentaId: inv.cuentaId } : {}),
    }));
}
