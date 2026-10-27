// PAGOS PROGRAMADOS EN SU RENGLON (Nicolas, 2026-10-20). "Desaparece la seccion nueva de pagos
// programados del fondo que esta toda en violeta, y que se distribuya esa informacion en el resto de la
// planilla. No quiero que se dupliquen los renglones innecesariamente."
//
// Cada vencimiento de la agenda va al renglon donde va a caer su pago real: la factura de un proveedor
// a la fila de ESE proveedor dentro de su grupo, la tarjeta y la cuota de un credito a Financieros, un
// plan de IVA / cargas sociales a Impuestos. Sigue siendo PREVISION: no suma al neto. Cuando el pago
// real del mes se carga en esa misma fila, lo reemplaza (nunca se ven los dos).
//
// Puro: el App le pasa como ubicar la factura (proveedor + grupo) y arma las previsiones.

import { renglonProveedor, SECCION_PROVEEDORES, SECCIONES_REEMPLAZADAS } from "./gruposProveedores";

export type ProgramadoParaRenglon = {
  origen: string;
  refId: number | string;
  company: string;
  titulo: string;
  fechaLimite: string;
  monto: number;
  currency: "ARS" | "USD";
  estado: string;
  administration?: "blanco" | "negro";
};

export type PrevisionDeRenglon = {
  conceptKey: string;
  titulo?: string;
  company: string;
  date: string;
  amount: number;
  estado: string;
  descripcion: string;
  administration: "blanco" | "negro";
  cuentaId?: string;
  // Atada a UN documento (factura, cuota, resumen): desaparece sola cuando se paga ESE documento. No se
  // concilia por mes contra la fila: otro pago al mismo proveedor en el mes no la cubre (Lacapol, 27/10).
  porDocumento?: boolean;
};

const FINANCIEROS = renglonProveedor(SECCION_PROVEEDORES, SECCIONES_REEMPLAZADAS.bancos);
const ES_IMPUESTO = /\b(iva|ccss|afip|arca|ganancias|cargas sociales|seg(uridad)? soc|931|abl|iibb|ingresos brutos)\b/i;

export function programadosEnRenglones(
  items: ProgramadoParaRenglon[],
  // La fila de una factura de proveedor: su renglon (prov:<seccion>:<grupo>) y el nombre del proveedor.
  filaDeFactura: (refId: number | string) => { conceptKey: string; titulo: string; cuentaId?: string } | null,
  // La fila de una CUOTA de Desendeudamiento: la misma que va a tener su pago (el grupo de costo de la
  // deuda y el nombre del acreedor), para que el pago real la reemplace (2026-10-21).
  filaDeDeuda?: (refId: number | string) => { conceptKey: string; titulo: string } | null
): PrevisionDeRenglon[] {
  const out: PrevisionDeRenglon[] = [];
  items.forEach((i) => {
    // Pagado: ya esta el pago real. En dolares: la planilla de pesos no lo suma (se ve en su ficha).
    if (i.estado === "pagado" || i.currency === "USD" || !(Number(i.monto) > 0) || !i.fechaLimite) return;
    let fila: { conceptKey: string; titulo?: string; cuentaId?: string } | null = null;
    if (i.origen === "factura") fila = filaDeFactura(i.refId);
    else if (i.origen === "tarjeta") fila = { conceptKey: FINANCIEROS, titulo: i.titulo };
    else if (i.origen === "deuda")
      fila =
        filaDeDeuda?.(i.refId) ||
        (ES_IMPUESTO.test(i.titulo) ? { conceptKey: `custom:impuestos:${i.titulo}` } : { conceptKey: FINANCIEROS, titulo: i.titulo });
    // Los vencimientos a mano y los seguros ya bajan por su propio carril (con su renglon); los
    // sueldos tienen la ficha de pago de haberes. Ninguno se repite aca.
    if (!fila) return;
    out.push({
      ...fila,
      company: i.company,
      date: i.fechaLimite,
      amount: Number(i.monto) || 0,
      estado: i.estado,
      descripcion: i.titulo,
      administration: i.administration === "negro" ? "negro" : "blanco",
      porDocumento: true,
    });
  });
  return out;
}
