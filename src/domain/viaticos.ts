// VIATICOS (solapa "Caja chica y viaticos", Nicolas 2026-10-14).
//
//  - EVENTUAL: un anticipo a una persona por un viaje o un trabajo. Se carga a mano (monto, blanco o
//    negro, de que cuenta sale, motivo) y despues se rinde.
//  - FIJO: forma parte del ACUERDO del empleado (ficha de Personal): un monto mensual en blanco y/o en
//    negro, desde un mes. Sale solo cada mes, el mismo dia que el sueldo (4.o dia habil del mes
//    siguiente), como los haberes.
//
// Los dos van al renglon "Viaticos" (gastos de RRHH) del Calendario, y de ahi a Compras y analisis de
// gastos como gasto de personal. Blanco y negro siempre separados.

export const RENGLON_VIATICOS = "rh_viaticos";

export type ViaticoFijo = { blanco: number; negro: number; desde: string }; // desde = "yyyy-mm"

export type EntradaViatico = {
  id: string;
  date: string;
  company: string;
  title: string;
  kind: "viatico";
  amount: number;
  statusLabel: "debito";
  conceptKey: string;
  administration: "blanco" | "negro";
};

// Meses "yyyy-mm" entre dos meses, inclusive.
export function mesesEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let [y, m] = desde.split("-").map(Number);
  const [yh, mh] = hasta.split("-").map(Number);
  if (!y || !m || !yh || !mh) return out;
  while (y < yh || (y === yh && m <= mh)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

// Viaticos FIJOS ya pagados (fecha de pago <= hoy), desde el mes de alta del acuerdo, mientras el
// empleado no tenga baja. `fechaDePago(periodo)` = el dia de pago del sueldo de ese periodo.
export function viaticosFijos(
  empleados: Array<{ id: number; name: string; company: string; viaticoFijo?: ViaticoFijo; terminationDate?: string }>,
  hoy: string,
  fechaDePago: (periodo: string) => string
): EntradaViatico[] {
  const out: EntradaViatico[] = [];
  empleados.forEach((e) => {
    const v = e.viaticoFijo;
    if (!v || !/^\d{4}-\d{2}$/.test(v.desde || "")) return;
    if (!(Number(v.blanco || 0) > 0) && !(Number(v.negro || 0) > 0)) return;
    const hasta = (e.terminationDate || hoy).slice(0, 7);
    mesesEntre(v.desde, hasta).forEach((periodo) => {
      const fecha = fechaDePago(periodo);
      if (!fecha || fecha > hoy) return;
      (["blanco", "negro"] as const).forEach((adm) => {
        const monto = Number(v[adm] || 0);
        if (!(monto > 0)) return;
        out.push({
          // Prefijo payroll-: la plata sale como la de los haberes (ver plataDelSistema).
          id: `payroll-viatico-${e.id}-${periodo}-${adm}`,
          date: fecha,
          company: e.company,
          title: `Viático fijo · ${e.name} · ${periodo.slice(5, 7)}/${periodo.slice(0, 4)}`,
          kind: "viatico",
          amount: monto,
          statusLabel: "debito",
          conceptKey: RENGLON_VIATICOS,
          administration: adm,
        });
      });
    });
  });
  return out;
}
