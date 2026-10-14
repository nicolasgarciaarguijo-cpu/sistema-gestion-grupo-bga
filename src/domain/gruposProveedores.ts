// PAGOS A PROVEEDORES EN EL CASH FLOW POR GRUPO DE COSTOS (Nicolas, 2026-10-14).
//
// En el Calendario, los pagos a proveedores van a dos secciones: EGRESOS · PROVEEDORES y EGRESOS ·
// CUENTAS CORRIENTES (segun el proveedor tenga o no cuenta corriente). Adentro, los RENGLONES son los
// GRUPOS DE COSTOS (los del bloque "Grupos de costos" de Compras), cada uno con su TIPO: fijo o
// variable. Puede haber dos grupos con el mismo nombre y distinto tipo ("fijo · Administrativos" y
// "variable · Administrativos"): por eso la clave del grupo es "tipo|nombre". Debajo de cada grupo va
// cada proveedor con su nombre.
//
// El grupo de un pago sale, en este orden: de la factura que paga, del pago mismo, o del proveedor
// (su ficha). Lo que estaba cargado en los renglones viejos (logistica, administracion, comerciales,
// insumos, materiales) se muestra en el grupo equivalente: no se pierde ni se migra nada.

export type TipoGrupo = "fijo" | "variable";

export const SECCION_PROVEEDORES = "proveedores_out";
export const SECCION_CTACTE = "ctacte_out";
export type SeccionProv = typeof SECCION_PROVEEDORES | typeof SECCION_CTACTE;

export const claveGrupo = (tipo: TipoGrupo, nombre: string) => `${tipo}|${String(nombre || "").trim()}`;
export function parseClaveGrupo(clave: string | undefined): { tipo: TipoGrupo; nombre: string } | null {
  if (!clave) return null;
  const i = clave.indexOf("|");
  if (i < 0) return null;
  const tipo = clave.slice(0, i) === "fijo" ? "fijo" : "variable";
  const nombre = clave.slice(i + 1).trim();
  return nombre ? { tipo, nombre } : null;
}
export const etiquetaGrupo = (clave: string) => {
  const g = parseClaveGrupo(clave);
  return g ? `${g.tipo === "fijo" ? "Fijo" : "Variable"} · ${g.nombre}` : "Sin grupo";
};

// conceptKey de la planilla para un pago a proveedor: "prov:<seccion>:<tipo>|<nombre>".
export const renglonProveedor = (seccion: SeccionProv, grupo: string) => `prov:${seccion}:${grupo || "|Sin grupo"}`;
export function parseRenglonProveedor(ck: string | undefined): { seccion: SeccionProv; grupo: string } | null {
  if (!ck || !ck.startsWith("prov:")) return null;
  const rest = ck.slice(5);
  const i = rest.indexOf(":");
  if (i < 0) return null;
  const seccion = rest.slice(0, i) === SECCION_CTACTE ? SECCION_CTACTE : SECCION_PROVEEDORES;
  return { seccion, grupo: rest.slice(i + 1) };
}

// Secciones viejas del Calendario que se reemplazan, y el grupo al que va lo que ya tenian cargado.
export const SECCIONES_REEMPLAZADAS: Record<string, string> = {
  gastos_admin: "fijo|Administrativos",
  gastos_comerciales: "fijo|Comerciales",
  logistica: "fijo|Operativos",
  compras_insumos: "variable|Compras y materiales",
  compra_materiales: "variable|Compras y materiales",
  // Bancos, tarjetas y seguros tambien son PROVEEDORES (Nicolas, 2026-10-14): el banco o la
  // aseguradora es el proveedor.
  bancos: "fijo|Financieros",
  seguros: "fijo|Seguros",
  // La asignacion de un fondo de caja chica y los gastos de RRHH (medicina laboral, capacitaciones...).
  caja_chica: "variable|Caja chica",
  gastos_rrhh: "fijo|Personal",
};

export type EntradaParaProveedores = {
  id: string;
  kind: string;
  title: string;
  conceptKey?: string;
};

// Lo que se necesita saber de cada pago (CostEntry) y de su proveedor / factura.
export type ContextoPago = {
  proveedor: string;
  // Candado del proveedor: si esta, TODO lo de ese proveedor va a este grupo (le gana a la factura).
  grupoBloqueado?: string;
  grupoDeFactura?: string;
  grupoDelPago?: string;
  grupoDelProveedor?: string;
  cuentaCorriente: boolean;
};

// Nuevo conceptKey y titulo de una entrada del Calendario, o null si no va a las secciones de proveedores.
export function aRenglonDeProveedores(
  e: EntradaParaProveedores,
  seccionDeRenglon: (ck: string) => string | undefined,
  contextoPago?: ContextoPago
): { conceptKey: string; title: string } | null {
  const ck = e.conceptKey || "";
  const seccionVieja = ck ? (ck.startsWith("custom:") ? ck.slice(7).split(":")[0] : seccionDeRenglon(ck)) : undefined;
  const reemplazada = seccionVieja ? SECCIONES_REEMPLAZADAS[seccionVieja] : undefined;
  if (ck.startsWith("prov:")) return null; // ya esta
  // El debito del banco que ARMA un fondo de caja chica no es un gasto: ya cuenta la asignacion del fondo.
  if (e.kind === "banco" && ck === "cc_caja_chica") return null;
  // CAJA CHICA (Nicolas, 2026-10-14): asignar un fondo o devolver el sobrante es plata que se mueve
  // dentro de la empresa (a la caja de una persona): NO va al cash flow. Lo que va es cada GASTO
  // rendido, como pago a proveedor (con contexto).
  if (e.kind === "caja-chica-fondo") return { conceptKey: "__fuera__", title: e.title };
  // Comisiones de los trabajos: van a Comerciales, con el trabajo como nombre.
  if (e.kind === "comision") {
    return { conceptKey: renglonProveedor(SECCION_PROVEEDORES, SECCIONES_REEMPLAZADAS.gastos_comerciales), title: `Comisión · ${e.title}` };
  }
  // Un PAGO A PROVEEDOR: si su renglon es de otra seccion (impuestos, bancos, seguros...), queda ahi.
  if (contextoPago) {
    if (ck && !reemplazada) return null;
    const grupo =
      contextoPago.grupoBloqueado ||
      contextoPago.grupoDeFactura ||
      contextoPago.grupoDelPago ||
      contextoPago.grupoDelProveedor ||
      reemplazada ||
      "|Sin grupo";
    return {
      conceptKey: renglonProveedor(contextoPago.cuentaCorriente ? SECCION_CTACTE : SECCION_PROVEEDORES, grupo),
      title: contextoPago.proveedor || e.title,
    };
  }
  // Lo cargado en los renglones viejos (banco, planilla): a su grupo equivalente. Un movimiento del
  // banco se titula "Banco · concepto": en Financieros el proveedor es el BANCO.
  if (reemplazada) {
    const title = seccionVieja === "bancos" && e.kind === "banco" ? (e.title.split(" · ")[0] || e.title) : e.title;
    return { conceptKey: renglonProveedor(SECCION_PROVEEDORES, reemplazada), title };
  }
  return null;
}
