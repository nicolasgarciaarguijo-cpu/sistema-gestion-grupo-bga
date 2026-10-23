// CONTROL DEL RESUMEN DE TARJETA (Nicolas, 2026-10-23): "al elegir pago con tarjeta que me deje elegir la
// tarjeta, y cuando carguemos el resumen que el pago sea el dia del pago de la tarjeta. El control deberia
// asegurarse que todo lo cargado en el sistema como compra con tarjeta + los impuestos de la misma
// contabilicen el monto a pagar. Y ver un listado de los renglones del resumen por cada tarjeta con un tilde
// si todo esta bien, y si hay algun error que me marque lo que falta para buscarlo y que todo cierre."
//
// - Una compra con tarjeta (un pago con medio tarjeta de credito y su tarjeta) se carga por el TOTAL con la
//   cantidad de cuotas. Cada cuota (total / cuotas) cae en un resumen: la 1.a en el primero que cierra el dia
//   de la compra o despues, la 2.a en el siguiente, etc.
// - La cuota descuenta de la cuenta del banco de la tarjeta el dia del VENCIMIENTO de ese resumen (no el dia
//   de la compra). Sin resumen cargado todavia, queda en la tarjeta (no baja ninguna cuenta).
// - Control: cada renglon del resumen se busca entre las cuotas esperadas (misma tarjeta, mismo monto con
//   $1 de tolerancia, fecha de la compra cerca); los cargos (impuestos, comisiones, intereses) van a su deuda
//   de impuestos. Lo que sobra de un lado o del otro es lo que hay que buscar.
// Funciones puras.
import { categoriaDeLineaTarjeta } from "./costoBancosTarjetas";

export type CompraTarjeta = {
  id: number; // CostEntry
  company: string;
  tarjetaId: number;
  date: string; // dia de la compra
  amount: number; // total
  cuotas?: number;
  description: string;
  supplier: string;
};
export type ResumenCtrl = { id: number; company: string; cardId: number; closingDate: string; dueDate: string; totalArs: number; paid?: boolean };
export type LineaCtrl = { id: number; cardId: number; statementId?: number; date: string; description: string; amount: number; currency: "ARS" | "USD" };

export type CuotaEsperada = { compraId: number; cuota: number; de: number; monto: number; fechaCompra: string; descripcion: string; statementId: number | null; dueDate: string | null };

const r2 = (n: number) => Math.round(n * 100) / 100;
const TOL = 1;

// Las cuotas de cada compra, cada una en su resumen (por orden de cierre de la tarjeta).
export function cuotasEsperadas(compras: CompraTarjeta[], resumenes: ResumenCtrl[]): CuotaEsperada[] {
  const porTarjeta = new Map<number, ResumenCtrl[]>();
  resumenes.forEach((s) => porTarjeta.set(s.cardId, [...(porTarjeta.get(s.cardId) || []), s]));
  porTarjeta.forEach((l) => l.sort((a, b) => a.closingDate.localeCompare(b.closingDate)));
  const out: CuotaEsperada[] = [];
  compras.forEach((c) => {
    const n = Math.max(1, Math.floor(Number(c.cuotas) || 1));
    const monto = r2(Number(c.amount || 0) / n);
    const lista = porTarjeta.get(c.tarjetaId) || [];
    const primero = lista.findIndex((s) => s.closingDate >= c.date);
    for (let k = 0; k < n; k++) {
      const s = primero >= 0 ? lista[primero + k] : undefined;
      out.push({
        compraId: c.id,
        cuota: k + 1,
        de: n,
        monto,
        fechaCompra: c.date,
        descripcion: [c.supplier, c.description].filter(Boolean).join(" · ") || "Compra con tarjeta",
        statementId: s ? s.id : null,
        dueDate: s ? s.dueDate || s.closingDate : null,
      });
    }
  });
  return out;
}

const diasEntre = (a: string, b: string) => Math.abs(Math.round((new Date(`${a}T12:00:00`).getTime() - new Date(`${b}T12:00:00`).getTime()) / 86400000));

export type RenglonControl = {
  linea: LineaCtrl;
  estado: "ok" | "cargo" | "falta"; // ok = esta en el sistema; cargo = impuesto/comision (va a la deuda); falta = no esta cargado
  cuota?: CuotaEsperada;
};
export type ControlResumen = {
  resumen: ResumenCtrl;
  renglones: RenglonControl[];
  // Cuotas cargadas en el sistema que deberian estar en este resumen y no aparecen.
  noAparecen: CuotaEsperada[];
  totalSistema: number; // cuotas del sistema en este resumen + cargos
  totalRenglones: number;
  totalResumen: number;
  cierra: boolean;
};

export function controlarResumen(resumen: ResumenCtrl, lineas: LineaCtrl[], cuotas: CuotaEsperada[]): ControlResumen {
  const deEste = lineas.filter((l) => l.statementId === resumen.id && (l.currency || "ARS") === "ARS");
  // Cuotas candidatas: las de este resumen y, por si el cierre corrio, las de la misma tarjeta sin resumen.
  const candidatas = cuotas.filter((q) => q.statementId === resumen.id);
  const usadas = new Set<CuotaEsperada>();
  const renglones: RenglonControl[] = deEste.map((l) => {
    if (categoriaDeLineaTarjeta(l.description) !== "consumos") return { linea: l, estado: "cargo" as const };
    const match = candidatas
      .filter((q) => !usadas.has(q) && Math.abs(q.monto - Number(l.amount || 0)) <= TOL)
      .sort((a, b) => diasEntre(a.fechaCompra, l.date) - diasEntre(b.fechaCompra, l.date))[0];
    if (match && diasEntre(match.fechaCompra, l.date) <= 10) {
      usadas.add(match);
      return { linea: l, estado: "ok" as const, cuota: match };
    }
    return { linea: l, estado: "falta" as const };
  });
  const noAparecen = candidatas.filter((q) => !usadas.has(q));
  const cargos = renglones.filter((r) => r.estado === "cargo").reduce((a, r) => a + Number(r.linea.amount || 0), 0);
  const totalSistema = r2(candidatas.reduce((a, q) => a + q.monto, 0) + cargos);
  const totalRenglones = r2(deEste.reduce((a, l) => a + Number(l.amount || 0), 0));
  const totalResumen = r2(Number(resumen.totalArs || 0));
  const cierra =
    renglones.every((r) => r.estado !== "falta") && noAparecen.length === 0 && Math.abs(totalSistema - totalResumen) <= TOL;
  return { resumen, renglones, noAparecen, totalSistema, totalRenglones, totalResumen, cierra };
}
