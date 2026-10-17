// PRE-CIERRE (Nicolas, 2026-10-17): "el punto cero cuando arranquemos de verdad el 1 de noviembre: que lo que
// termino quede guardado y no se vea, y lo que sigue vigente quede, entendiendo los compromisos de cobros y
// pagos". Antes de apretar el boton de Cierre de ejercicio, una foto por empresa de:
//   - lo que PASA al ejercicio nuevo (cobros por venir, pagos por hacer, cuentas corrientes con saldo,
//     cajas chicas abiertas);
//   - lo que QUEDA GUARDADO (terminado dentro del ejercicio).
// Sirve para limpiar antes lo que sea de prueba. Puro y testeable: el App junta los datos.

export type CobroPendiente = { id: string; titulo: string; blanco: number; negro: number; detalle?: string };
export type PagoPendiente = { id: string; origen: string; titulo: string; fecha: string; monto: number; vencido: boolean; currency?: "ARS" | "USD" };
export type SaldoCuenta = { id: string; tipo: "proveedor" | "pago_sin_factura"; nombre: string; saldo: number }; // saldo >0 le debemos, <0 a favor
export type CajaAbierta = { id: string; responsable: string; resta: number };
export type BloqueArchivo = { nombre: string; archivar: number; quedan: number };

export type PreCierre = {
  cobros: CobroPendiente[];
  pagos: PagoPendiente[];
  cuentas: SaldoCuenta[];
  cajas: CajaAbierta[];
  archivo: BloqueArchivo[];
  totales: {
    aCobrarBlanco: number;
    aCobrarNegro: number;
    aPagar: number; // ARS
    aPagarUsd: number;
    vencido: number; // ARS ya vencido y sin pagar
    debemosProveedores: number;
    aFavorProveedores: number;
    enCajas: number;
    seGuarda: number;
    sigue: number;
  };
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function armarPreCierre(input: {
  cobros: CobroPendiente[];
  pagos: PagoPendiente[];
  cuentas: SaldoCuenta[];
  cajas: CajaAbierta[];
  archivo: BloqueArchivo[];
}): PreCierre {
  const cobros = input.cobros
    .filter((c) => c.blanco > 0.5 || c.negro > 0.5)
    .sort((a, b) => b.blanco + b.negro - (a.blanco + a.negro));
  const pagos = input.pagos.filter((p) => p.monto > 0.5).sort((a, b) => (a.fecha || "").localeCompare(b.fecha || ""));
  const cuentas = input.cuentas.filter((c) => Math.abs(c.saldo) > 1).sort((a, b) => Math.abs(b.saldo) - Math.abs(a.saldo));
  const cajas = input.cajas.filter((c) => Math.abs(c.resta) > 0.5).sort((a, b) => b.resta - a.resta);
  const ars = pagos.filter((p) => (p.currency || "ARS") === "ARS");
  return {
    cobros,
    pagos,
    cuentas,
    cajas,
    archivo: input.archivo,
    totales: {
      aCobrarBlanco: r2(cobros.reduce((a, c) => a + c.blanco, 0)),
      aCobrarNegro: r2(cobros.reduce((a, c) => a + c.negro, 0)),
      aPagar: r2(ars.reduce((a, p) => a + p.monto, 0)),
      aPagarUsd: r2(pagos.filter((p) => p.currency === "USD").reduce((a, p) => a + p.monto, 0)),
      vencido: r2(ars.filter((p) => p.vencido).reduce((a, p) => a + p.monto, 0)),
      debemosProveedores: r2(cuentas.filter((c) => c.tipo === "proveedor" && c.saldo > 0).reduce((a, c) => a + c.saldo, 0)),
      aFavorProveedores: r2(cuentas.filter((c) => c.saldo < 0).reduce((a, c) => a - c.saldo, 0)),
      enCajas: r2(cajas.reduce((a, c) => a + c.resta, 0)),
      seGuarda: input.archivo.reduce((a, b) => a + b.archivar, 0),
      sigue: input.archivo.reduce((a, b) => a + b.quedan, 0),
    },
  };
}
