// RETIROS SOCIETARIOS (Nicolas, 2026-10-14): la plata que sacan los socios. No es un gasto de
// funcionamiento (no entra al analisis de gastos): es lo que se retira del resultado. Va al Calendario en
// EGRESOS · RETIROS SOCIETARIOS y tiene su bloque en Balance y estado de resultados. Tambien nace del
// ARQUEO del cierre de ejercicio, cuando la plata contada es menor que la del sistema y el motivo es un
// retiro. Blanco y negro separados; pesos y dolares nunca se suman.

export const RENGLON_RETIROS = "rs_retiros";

export type RetiroLike = {
  id: number;
  company: string;
  fecha: string;
  socio: string;
  monto: number;
  moneda?: "ARS" | "USD";
  administration: "blanco" | "negro";
  cuentaId?: string;
  motivo?: string;
};

export function entradasRetiros(retiros: RetiroLike[]) {
  return retiros
    .filter((r) => r.fecha && Number(r.monto || 0) > 0)
    .map((r) => ({
      id: `retiro-${r.id}`,
      date: r.fecha,
      company: r.company,
      title: `Retiro · ${r.socio || "socio"}${r.motivo ? ` · ${r.motivo}` : ""}`,
      kind: "retiro" as const,
      amount: Number(r.monto || 0),
      statusLabel: "debito" as const,
      conceptKey: RENGLON_RETIROS,
      administration: r.administration === "negro" ? ("negro" as const) : ("blanco" as const),
      currency: r.moneda === "USD" ? ("USD" as const) : ("ARS" as const),
    }));
}

export type ResumenRetiros = Array<{
  company: string;
  socio: string;
  blanco: number;
  negro: number;
  total: number;
  usd: number;
  cantidad: number;
}>;

// Totales por empresa y socio en un periodo [desde, hasta] (inclusive).
export function resumenRetiros(retiros: RetiroLike[], desde: string, hasta: string): ResumenRetiros {
  const m = new Map<string, ResumenRetiros[number]>();
  retiros
    .filter((r) => r.fecha >= desde && r.fecha <= hasta && Number(r.monto || 0) > 0)
    .forEach((r) => {
      const socio = (r.socio || "Sin socio").trim();
      const k = `${r.company}|${socio.toLowerCase()}`;
      if (!m.has(k)) m.set(k, { company: r.company, socio, blanco: 0, negro: 0, total: 0, usd: 0, cantidad: 0 });
      const x = m.get(k)!;
      const monto = Number(r.monto || 0);
      if (r.moneda === "USD") x.usd += monto;
      else {
        x[r.administration === "negro" ? "negro" : "blanco"] += monto;
        x.total += monto;
      }
      x.cantidad += 1;
    });
  return Array.from(m.values()).sort((a, b) => a.company.localeCompare(b.company) || b.total - a.total);
}
