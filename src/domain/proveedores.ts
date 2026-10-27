// PROVEEDORES: tipo de gasto con candado y condicion de pago habitual (Nicolas, 2026-10-14).
//
//  - TIPO DE GASTO con candado 🔒: cada factura (y cada pago) de ese proveedor queda clasificada sola
//    en ese renglon del Calendario. Sin candado es solo una sugerencia.
//  - CONDICION DE PAGO habitual (contado / a N dias / el dia X de cada mes): cada factura sin pagar
//    tiene su FECHA DE PAGO prevista sin cargarla. Se la puede pisar factura por factura.
//  - Las facturas sin pagar con fecha prevista bajan a Pagos programados (y de ahi al Calendario y al
//    Analisis de gastos) como pagos que vienen. La factura NO es gasto: el gasto es el pago.
//
// Funciones puras; App las usa al armar la agenda y las entradas del Calendario.

export type CondicionPago =
  | { tipo: "contado" }
  | { tipo: "dias"; dias: number }
  | { tipo: "diaDelMes"; dia: number };

export type ProveedorLike = {
  id: number;
  name: string;
  taxId: string;
  aliases?: string;
  tipoGasto?: string;
  tipoGastoLocked?: boolean;
  condicionPago?: CondicionPago;
  debitoAutomatico?: boolean;
  tarjetaDebitoId?: number | null;
};

const digits = (v: string) => String(v || "").replace(/\D/g, "");
const norm = (v: string) =>
  String(v || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ""); // sin espacios ni puntos: "DAC S.A." == "DAC SA"

// El proveedor de una factura o un pago: el CUIT manda; si no, el nombre o uno de sus alias.
export function buscarProveedor<T extends ProveedorLike>(
  proveedores: T[],
  nombre: string,
  taxId?: string
): T | undefined {
  const cuit = digits(taxId || "");
  if (cuit.length >= 11) {
    const porCuit = proveedores.find((p) => digits(p.taxId) === cuit);
    if (porCuit) return porCuit;
  }
  const n = norm(nombre);
  if (!n) return undefined;
  return proveedores.find(
    (p) =>
      norm(p.name) === n ||
      String(p.aliases || "")
        .split(",")
        .map(norm)
        .filter(Boolean)
        .includes(n)
  );
}

// Tipo de gasto que corresponde: el propio (si lo tiene) o el del proveedor SOLO si tiene candado.
export function tipoGastoEfectivo(propio: string | undefined, proveedor: ProveedorLike | undefined): string | undefined {
  if (propio) return propio;
  return proveedor?.tipoGastoLocked && proveedor.tipoGasto ? proveedor.tipoGasto : undefined;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const diasDelMes = (y: number, m0: number) => new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();

// Fecha de pago segun la condicion, a partir de la fecha de la factura (yyyy-mm-dd).
export function fechaDePago(fechaFactura: string, condicion: CondicionPago | undefined): string | undefined {
  if (!fechaFactura || !condicion) return undefined;
  const [y, m, d] = fechaFactura.split("-").map(Number);
  if (!y || !m || !d) return undefined;
  if (condicion.tipo === "contado") return fechaFactura;
  if (condicion.tipo === "dias") {
    const f = new Date(Date.UTC(y, m - 1, d + Math.max(0, Math.round(condicion.dias || 0))));
    return iso(f);
  }
  // El dia X de cada mes: el primero que cae en o despues de la factura (si el mes no tiene ese dia,
  // el ultimo dia del mes).
  const dia = Math.min(31, Math.max(1, Math.round(condicion.dia || 1)));
  let yy = y;
  let mm = m - 1;
  if (Math.min(dia, diasDelMes(yy, mm)) < d) {
    mm += 1;
    if (mm > 11) {
      mm = 0;
      yy += 1;
    }
  }
  return iso(new Date(Date.UTC(yy, mm, Math.min(dia, diasDelMes(yy, mm)))));
}

export function textoCondicion(c: CondicionPago | undefined): string {
  if (!c) return "sin condición";
  if (c.tipo === "contado") return "contado";
  if (c.tipo === "dias") return `a ${c.dias} días`;
  return `el día ${c.dia} de cada mes`;
}

export type FacturaLike = {
  id: number;
  company: string;
  supplier: string;
  taxId: string;
  invoiceNumber: string;
  invoiceDate: string;
  total: number;
  administration: "blanco" | "negro";
  source?: string;
  conceptKey?: string;
  fechaPagoPrevista?: string;
  paidByCostEntryId?: number | null;
  paidByBankEntryId?: number | null;
  paidByPerson?: string;
};

export type FacturaPorPagar = {
  id: number;
  company: string;
  supplier: string;
  invoiceNumber: string;
  total: number;
  fechaPago: string;
  fechaElegida: boolean; // true = cargada en la factura; false = sale de la condicion del proveedor
  administration: "blanco" | "negro";
  conceptKey?: string;
  // El proveedor la debita de esta tarjeta: se paga con el resumen, no es un pago aparte.
  tarjetaDebitoId?: number;
};

// La tarjeta de la que debita el proveedor (solo si tiene debito automatico con tarjeta).
export function tarjetaDeDebito(prov: ProveedorLike | undefined): number | undefined {
  return prov?.debitoAutomatico && prov.tarjetaDebitoId != null ? prov.tarjetaDebitoId : undefined;
}

// Facturas YA PAGADAS que estaban programadas (Nicolas, 2026-10-23: "cuando realizo un pago no quiero que
// desaparezca el item; quiero que figure tachado para saber que ya lo realice"). Misma fecha que tenian
// programada; Pagos programados las muestra tachadas. Mismas exclusiones que las por pagar.
export function facturasPagadasProgramadas(facturas: FacturaLike[], proveedores: ProveedorLike[]): FacturaPorPagar[] {
  const out: FacturaPorPagar[] = [];
  facturas.forEach((f) => {
    if (f.paidByCostEntryId == null && f.paidByBankEntryId == null) return;
    if (f.source === "caja_chica") return;
    if (String(f.paidByPerson || "").trim()) return;
    if (!(Number(f.total || 0) > 0)) return;
    const prov = buscarProveedor(proveedores, f.supplier, f.taxId);
    const fecha = f.fechaPagoPrevista || fechaDePago(f.invoiceDate, prov?.condicionPago);
    if (!fecha) return;
    out.push({
      id: f.id,
      company: f.company,
      supplier: f.supplier,
      invoiceNumber: f.invoiceNumber,
      total: Number(f.total || 0),
      fechaPago: fecha,
      fechaElegida: !!f.fechaPagoPrevista,
      administration: f.administration === "negro" ? "negro" : "blanco",
      conceptKey: tipoGastoEfectivo(f.conceptKey, prov),
    });
  });
  return out;
}

// Facturas SIN pago con fecha de pago (la de la factura, o la de la condicion del proveedor).
// No entran: las ya pagadas, las de caja chica (se pagan con el fondo) y las que puso una persona
// (son deuda con esa persona, no con el proveedor).
export function facturasPorPagar(facturas: FacturaLike[], proveedores: ProveedorLike[]): FacturaPorPagar[] {
  const out: FacturaPorPagar[] = [];
  facturas.forEach((f) => {
    if (f.paidByCostEntryId != null || f.paidByBankEntryId != null) return;
    if (f.source === "caja_chica") return;
    if (String(f.paidByPerson || "").trim()) return;
    if (!(Number(f.total || 0) > 0)) return;
    const prov = buscarProveedor(proveedores, f.supplier, f.taxId);
    const fecha = f.fechaPagoPrevista || fechaDePago(f.invoiceDate, prov?.condicionPago);
    if (!fecha) return;
    out.push({
      id: f.id,
      company: f.company,
      supplier: f.supplier,
      invoiceNumber: f.invoiceNumber,
      total: Number(f.total || 0),
      fechaPago: fecha,
      fechaElegida: !!f.fechaPagoPrevista,
      administration: f.administration === "negro" ? "negro" : "blanco",
      conceptKey: tipoGastoEfectivo(f.conceptKey, prov),
      ...(tarjetaDeDebito(prov) != null ? { tarjetaDebitoId: tarjetaDeDebito(prov) } : {}),
    });
  });
  return out;
}
