// MOVIMIENTOS INTERNOS → CALENDARIO ANUAL (Nicolas, 2026-10-13).
//
// "Préstamos entre empresas, préstamos de personas o pases entre cuentas: en cualquier situación son
// ingresos de dinero para cada empresa". La solapa Movimientos internos es la DUEÑA del dato; este
// módulo dice en qué renglón de la planilla cae cada carga:
//
//   - PASE ENTRE CUENTAS: dos patas. Sale de una cuenta (EGRESOS · Movimientos internos) y entra en la
//     otra (INGRESOS · Movimientos internos). Las dos son de la misma empresa, así que el neto no cambia,
//     pero se ve de dónde salió y adónde fue la plata.
//   - APORTE / PRÉSTAMO RECIBIDO: ingreso en el renglón de quien puso la plata.
//   - DEVOLUCIÓN de un préstamo o aporte: egreso.
//
// Funciones puras: App arma la lista con esto y la agrega a las entradas del calendario.

export const FILA_PASE_ENTRA = "iv_pasaje_bga";
export const FILA_PASE_SALE = "mi_out_pase";
export const FILA_PRESTAMO_EMPRESA_ENTRA = "mi_in_prestamo_empresa";
export const FILA_PRESTAMO_EMPRESA_SALE = "mi_out_prestamo_empresa";
export const FILA_APORTE_ENTRA = "mi_in_aporte";
export const FILA_DEVOLUCION_SALE = "mi_out_devolucion_prestamo";

// Renglones de INGRESO que son préstamos (los lee el resumen de préstamos de la solapa).
export const FILAS_PRESTAMO_INGRESO = new Set([
  "prestamo_nicolas",
  "prestamo_gustavo",
  "prestamo_bancario",
  "prestamo_bga_patagonia",
  FILA_PRESTAMO_EMPRESA_ENTRA,
]);

export type PaseInterno = {
  id: number;
  company: string;
  date: string;
  direction: string; // efectivo_a_banco | banco_a_efectivo | banco_a_banco
  currency?: string;
  color?: string; // color del EFECTIVO (el banco es blanco)
  amount: number;
  cuentaId?: string;
  cuentaDestinoId?: string;
  bank?: string;
  description?: string;
};

export type CapitalInterno = {
  id: number;
  company: string;
  date: string;
  origin: string;
  kind: string; // aporte | prestamo
  direction: string; // recibido | devuelto
  color?: string;
  amount: number;
};

export type EntradaMovInterno = {
  id: string;
  date: string;
  company: string;
  title: string;
  kind: "mov-interno";
  amount: number;
  statusLabel: "credito" | "debito";
  conceptKey: string;
  administration: "blanco" | "negro";
  currency: "ARS" | "USD";
};

const norm = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

// ¿El origen es una empresa del grupo? Se compara contra los nombres de las empresas (y sus siglas).
export function esEmpresaDelGrupo(origin: string, empresas: string[]): boolean {
  const o = norm(origin);
  if (!o) return false;
  return empresas.some((e) => {
    const n = norm(e);
    const primera = n.split(/\s+/)[0] || "";
    return n === o || n.includes(o) || o.includes(n) || (primera.length >= 3 && o.includes(primera));
  });
}

// Renglón de la planilla para un aporte / préstamo de la solapa.
export function filaDeCapital(c: CapitalInterno, empresas: string[]): string {
  const devuelto = c.direction === "devuelto";
  const o = norm(c.origin);
  const empresa = esEmpresaDelGrupo(c.origin, empresas.filter((e) => norm(e) !== norm(c.company)));
  if (devuelto) return empresa ? FILA_PRESTAMO_EMPRESA_SALE : FILA_DEVOLUCION_SALE;
  if (c.kind === "aporte") return FILA_APORTE_ENTRA;
  if (empresa) return FILA_PRESTAMO_EMPRESA_ENTRA;
  if (o.includes("nicolas")) return "prestamo_nicolas";
  if (o.includes("gustavo")) return "prestamo_gustavo";
  if (o.includes("banco") || o.includes("bancario")) return "prestamo_bancario";
  // Otra persona: renglón propio dentro de la sección, con su nombre.
  return `custom:prestamos:Préstamo de ${String(c.origin || "").trim() || "otra persona"}`;
}

const lado = (direction: string, punta: "desde" | "hacia"): "efectivo" | "banco" => {
  const [desde, , hacia] = String(direction || "").split("_");
  const t = punta === "desde" ? desde : hacia;
  return t === "efectivo" ? "efectivo" : "banco";
};

export function entradasMovimientosInternos(input: {
  pases: PaseInterno[];
  capital: CapitalInterno[];
  empresas: string[];
  nombreCuenta?: (id: string | undefined, company: string, tipo: "efectivo" | "banco") => string;
}): EntradaMovInterno[] {
  const out: EntradaMovInterno[] = [];
  const nombre = input.nombreCuenta || ((_id, _c, tipo) => (tipo === "efectivo" ? "efectivo" : "banco"));
  input.pases.forEach((t) => {
    const monto = Number(t.amount || 0);
    if (!t.date || !(monto > 0)) return;
    const desde = lado(t.direction, "desde");
    const hacia = lado(t.direction, "hacia");
    const colorEfectivo = t.color === "negro" ? "negro" : "blanco";
    const currency = t.currency === "USD" ? "USD" : "ARS";
    const origen = nombre(t.cuentaId, t.company, desde);
    const destino = nombre(t.cuentaDestinoId, t.company, hacia);
    const detalle = t.description ? ` · ${t.description}` : "";
    out.push({
      id: `movint-pase-${t.id}-sale`,
      date: t.date,
      company: t.company,
      title: `Pase a ${destino}${detalle}`,
      kind: "mov-interno",
      amount: monto,
      statusLabel: "debito",
      conceptKey: FILA_PASE_SALE,
      administration: desde === "efectivo" ? colorEfectivo : "blanco",
      currency,
    });
    out.push({
      id: `movint-pase-${t.id}-entra`,
      date: t.date,
      company: t.company,
      title: `Pase desde ${origen}${detalle}`,
      kind: "mov-interno",
      amount: monto,
      statusLabel: "credito",
      conceptKey: FILA_PASE_ENTRA,
      administration: hacia === "efectivo" ? colorEfectivo : "blanco",
      currency,
    });
  });
  input.capital.forEach((c) => {
    const monto = Number(c.amount || 0);
    if (!c.date || !(monto > 0)) return;
    const devuelto = c.direction === "devuelto";
    out.push({
      id: `movint-cap-${c.id}`,
      date: c.date,
      company: c.company,
      title: `${devuelto ? "Devolución a" : c.kind === "aporte" ? "Aporte de" : "Préstamo de"} ${c.origin || "—"}`,
      kind: "mov-interno",
      amount: monto,
      statusLabel: devuelto ? "debito" : "credito",
      conceptKey: filaDeCapital(c, input.empresas),
      administration: c.color === "negro" ? "negro" : "blanco",
      currency: "ARS",
    });
  });
  return out;
}

// Al CARGAR desde la planilla en un renglón de movimientos internos: qué se crea en la solapa.
//   pase    -> un pase entre cuentas (las dos patas vuelven solas)
//   capital -> un aporte / préstamo recibido o devuelto
//   null    -> renglón común (sigue el camino de siempre)
export function destinoEnSolapa(
  conceptKey: string
):
  | { tipo: "pase" }
  | { tipo: "capital"; kind: "aporte" | "prestamo"; direction: "recibido" | "devuelto"; origin: string }
  | null {
  if (conceptKey === FILA_PASE_ENTRA || conceptKey === FILA_PASE_SALE) return { tipo: "pase" };
  if (conceptKey === FILA_APORTE_ENTRA) return { tipo: "capital", kind: "aporte", direction: "recibido", origin: "" };
  if (conceptKey === "prestamo_nicolas") return { tipo: "capital", kind: "prestamo", direction: "recibido", origin: "Nicolás" };
  if (conceptKey === "prestamo_gustavo") return { tipo: "capital", kind: "prestamo", direction: "recibido", origin: "Gustavo" };
  if (conceptKey === "prestamo_bancario") return { tipo: "capital", kind: "prestamo", direction: "recibido", origin: "Banco" };
  if (conceptKey === FILA_PRESTAMO_EMPRESA_ENTRA || conceptKey === "prestamo_bga_patagonia")
    return { tipo: "capital", kind: "prestamo", direction: "recibido", origin: "" };
  if (conceptKey === FILA_PRESTAMO_EMPRESA_SALE || conceptKey === FILA_DEVOLUCION_SALE)
    return { tipo: "capital", kind: "prestamo", direction: "devuelto", origin: "" };
  if (conceptKey.startsWith("custom:prestamos:Préstamo de "))
    return { tipo: "capital", kind: "prestamo", direction: "recibido", origin: conceptKey.slice("custom:prestamos:Préstamo de ".length) };
  return null;
}
