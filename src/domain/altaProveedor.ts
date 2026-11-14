// ALTA DE UN PROVEEDOR: UNA SOLA PUERTA (Nicolas, 2026-11-13).
//
// Regla de Nicolas: "toda ficha que se carga desde mas de una solapa tiene que ser LA MISMA". El proveedor
// se daba de alta en siete lugares distintos, cada uno con los campos que tenia a mano: el listado de ARCA,
// las comisiones del banco, la factura de compra, el gasto de caja chica, la ficha del proveedor, el boton
// "Agregar proveedor" de Compras (que agregaba una fila VACIA) y la ficha de Proveedores. Por eso el padron
// terminaba con proveedores repetidos, sin CUIT y sin condicion de pago; y un proveedor sin condicion de pago
// no le pone fecha a sus facturas, asi que no entra ni a Pagos programados ni al cash flow.
//
// Desde ahora:
// - El alta A MANO abre la ficha de Proveedores (la unica que pide todo).
// - El alta AUTOMATICA (ARCA, banco, o la que nace al cargar una factura o un gasto) pasa por `nuevoProveedor`,
//   que completa siempre los mismos campos y deja asentado de donde salio.
// - `faltaDelProveedor` dice que le falta para servir, y el padron lo muestra para completarlo.

import type { CondicionIva, Supplier } from "./types";

export type OrigenAltaProveedor =
  | "ficha" // la ficha de Proveedores (alta a mano, completa)
  | "factura" // nacio al cargar una factura de compra
  | "cajaChica" // nacio al rendir un gasto de caja chica
  | "arca" // listado de ARCA confirmado en la revision
  | "banco" // comisiones, tasas e intereses del banco o de la tarjeta
  | "extracto"; // nombre encontrado en el extracto

export type DatosAltaProveedor = {
  name: string;
  taxId?: string;
  company: string;
  origen: OrigenAltaProveedor;
  detalleOrigen?: string; // ej. "factura A 0001-00012345"
  aliases?: string;
  notes?: string;
  grupoCosto?: string;
  tipoGasto?: string;
  currentAccount?: boolean;
  condicionIva?: CondicionIva;
  direccion?: string;
  contacto?: string;
};

export const NOTA_DE_ORIGEN: Record<OrigenAltaProveedor, string> = {
  ficha: "Alta desde la ficha de Proveedores",
  factura: "Alta desde una factura de compra",
  cajaChica: "Alta desde un gasto de caja chica",
  arca: "Alta desde el listado de ARCA (confirmada en la revisión)",
  banco: "Alta automática: comisiones, tasas e intereses de tarjetas y cuentas",
  extracto: "Alta desde el extracto bancario",
};

const limpio = (v?: string) => String(v || "").trim();

// El unico lugar donde se arma un proveedor nuevo. Los campos que no se piden quedan en su valor por
// defecto SIEMPRE igual, para que dos altas del mismo proveedor no salgan distintas.
export function nuevoProveedor(id: number, d: DatosAltaProveedor): Supplier {
  // En el alta a mano la nota es la que escribio la persona; en las automaticas queda de donde salio.
  const nota =
    d.origen === "ficha"
      ? limpio(d.notes)
      : [NOTA_DE_ORIGEN[d.origen], limpio(d.detalleOrigen), limpio(d.notes)].filter(Boolean).join(" · ");
  const base: Supplier = {
    id,
    company: (d.company || "General") as Supplier["company"],
    name: limpio(d.name),
    taxId: limpio(d.taxId),
    aliases: limpio(d.aliases),
    active: true,
    notes: nota,
  };
  if (d.grupoCosto) base.grupoCosto = d.grupoCosto;
  if (d.tipoGasto) base.tipoGasto = d.tipoGasto;
  if (d.currentAccount) base.currentAccount = true;
  if (d.condicionIva) base.condicionIva = d.condicionIva;
  if (limpio(d.direccion)) base.direccion = limpio(d.direccion);
  if (limpio(d.contacto)) base.contacto = limpio(d.contacto);
  return base;
}

// Lo que le falta al proveedor para que el sistema pueda trabajar con el. El padron lo muestra como
// "falta completar" (no es un error: el alta automatica deja el proveedor usable y a medio llenar).
export function faltaDelProveedor(p: {
  name?: string;
  taxId?: string;
  condicionPago?: unknown;
  grupoCosto?: string;
  debitoAutomatico?: boolean;
}): string[] {
  const falta: string[] = [];
  if (!limpio(p.name)) falta.push("el nombre");
  if (String(p.taxId || "").replace(/\D/g, "").length < 11) falta.push("el CUIT");
  // El debito automatico se paga en el resumen de la tarjeta: no necesita condicion de pago.
  if (!p.condicionPago && !p.debitoAutomatico) falta.push("la condición de pago");
  if (!limpio(p.grupoCosto)) falta.push("el grupo de costo");
  return falta;
}

export const textoFalta = (falta: string[]): string =>
  falta.length === 0
    ? ""
    : `falta ${falta.slice(0, -1).join(", ")}${falta.length > 1 ? " y " : ""}${falta[falta.length - 1]}`;
