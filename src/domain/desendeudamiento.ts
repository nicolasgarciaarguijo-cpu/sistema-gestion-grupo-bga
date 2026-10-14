// DESENDEUDAMIENTO (Nicolas, 2026-10-14): todo lo que la empresa DEBE y se paga en cuotas — planes de
// pago (AFIP, ABL...), prestamos externos (bancos, terceros), financiacion de equipos — vive en una
// solapa propia. Cada deuda se trata como un PROVEEDOR: tiene un acreedor, un grupo de costo (donde va
// en el cash flow) y sus CUOTAS ESTIPULADAS. Cada cuota se paga con un PAGO de verdad (un CostEntry,
// como el de una factura): ese pago es el que llega al cash flow, en EGRESOS · PROVEEDORES, en el grupo
// de la deuda y con el nombre del acreedor. La cuota pendiente va a la agenda de pagos inamovibles.
//
// Los prestamos entre socios o entre las empresas NO van aca: son movimientos internos.
//
// Compatibilidad: las deudas viejas solo tienen "proxima cuota / cuotas restantes / proximo vencimiento".
// Mientras no se le estipulen cuotas, se generan una por mes con esos datos (lo mismo que se hacia antes).

export type TipoDeuda = "plan_pago" | "prestamo" | "financiacion" | "otra";
export const TIPOS_DEUDA: Array<{ value: TipoDeuda; label: string }> = [
  { value: "plan_pago", label: "Plan de pago (AFIP, ABL, moratoria)" },
  { value: "prestamo", label: "Préstamo externo (banco, tercero)" },
  { value: "financiacion", label: "Financiación de equipo / compra" },
  { value: "otra", label: "Otra deuda" },
];

export type EstadoCuota = "programado" | "estimado" | "inamovible";

export type CuotaDeuda = {
  id: string;
  numero: number;
  fecha: string; // vencimiento yyyy-mm-dd
  monto: number;
  estado?: EstadoCuota;
  // El pago que la salda (CostEntry). Con esto la cuota queda pagada y el pago va al cash flow.
  pagoCostEntryId?: number | null;
};

export type DeudaBase = {
  id: number;
  nextDueDate: string;
  remainingInstallments: number;
  nextInstallmentAmount: number;
  active: boolean;
  cuotas?: CuotaDeuda[];
};

const pad = (n: number) => String(n).padStart(2, "0");

// Suma meses respetando el fin de mes (31/01 + 1 mes = 28 o 29/02).
export function sumarMesesIso(iso: string, n: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const ultimo = new Date(ny, nm, 0).getDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, ultimo))}`;
}

// Arma el cronograma: una cuota por mes desde la primera fecha.
export function generarCuotas(primeraFecha: string, cantidad: number, monto: number, desdeNumero = 1, prefijo = "c"): CuotaDeuda[] {
  const n = Math.max(0, Math.floor(Number(cantidad) || 0));
  if (!primeraFecha || !n) return [];
  return Array.from({ length: n }, (_, i) => ({
    id: `${prefijo}${desdeNumero + i}`,
    numero: desdeNumero + i,
    fecha: sumarMesesIso(primeraFecha, i),
    monto: Number(monto) || 0,
    estado: "programado" as EstadoCuota,
    pagoCostEntryId: null,
  }));
}

// Las cuotas de una deuda: las estipuladas, o (deuda vieja) las que salen de proxima cuota x restantes.
export function cuotasDeDeuda(d: DeudaBase): CuotaDeuda[] {
  if (d.cuotas && d.cuotas.length) return [...d.cuotas].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.numero - b.numero);
  return generarCuotas(d.nextDueDate, d.remainingInstallments, d.nextInstallmentAmount, 1, `${d.id}-`);
}

export const cuotaPagada = (c: CuotaDeuda) => c.pagoCostEntryId != null;

export function cuotasPendientes(d: DeudaBase): CuotaDeuda[] {
  if (!d.active) return [];
  return cuotasDeDeuda(d).filter((c) => !cuotaPagada(c));
}

export type ResumenDeuda = {
  total: number;
  pagado: number;
  pendiente: number;
  cuotas: number;
  cuotasPagadas: number;
  cuotasPendientes: number;
  proxima?: CuotaDeuda;
  vencidas: number; // cuotas impagas con fecha anterior a hoy
};

export function resumenDeuda(d: DeudaBase, hoy: string): ResumenDeuda {
  const todas = cuotasDeDeuda(d);
  const pagadas = todas.filter(cuotaPagada);
  const pend = todas.filter((c) => !cuotaPagada(c));
  const suma = (xs: CuotaDeuda[]) => xs.reduce((a, c) => a + Number(c.monto || 0), 0);
  return {
    total: suma(todas),
    pagado: suma(pagadas),
    pendiente: suma(pend),
    cuotas: todas.length,
    cuotasPagadas: pagadas.length,
    cuotasPendientes: pend.length,
    proxima: pend[0],
    vencidas: pend.filter((c) => c.fecha < hoy).length,
  };
}

// Al estipular / pagar cuotas, los campos viejos siguen sirviendo a quien los lee (excedente, Balance):
// proxima cuota, cuotas que quedan y proximo vencimiento salen de las cuotas pendientes.
export function camposLegacy(cuotas: CuotaDeuda[]): { nextDueDate: string; remainingInstallments: number; nextInstallmentAmount: number } {
  const pend = [...cuotas].filter((c) => !cuotaPagada(c)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  return {
    nextDueDate: pend[0]?.fecha || "",
    remainingInstallments: pend.length,
    nextInstallmentAmount: Number(pend[0]?.monto || 0),
  };
}
