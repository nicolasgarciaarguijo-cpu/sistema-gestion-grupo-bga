// CAJA CHICA POR RESPONSABLE (Nicolas, 2026-10-14). La solapa muestra solo el LISTADO de las cajas
// asignadas (responsable, tipo, fecha, monto, administracion, utilizado y lo que resta). Todo lo demas
// vive en la FICHA de cada responsable (click derecho sobre su nombre): sus cajas (historial), sus
// rendiciones y en que se gasto. Los viaticos son un TIPO de caja chica, no una seccion aparte.
// Funciones puras.

export type FondoLike = {
  id: number;
  company: string;
  responsible: string;
  description?: string;
  tipo?: string;
  assignedAmount: number;
  assignedWhite?: number;
  assignedBlack?: number;
  deliveredDate: string;
  closed: boolean;
  closedDate?: string;
};

export type GastoLike = {
  id: number;
  fundId: number | null;
  date: string;
  amount: number;
  administration: "blanco" | "negro";
  supplier?: string;
  description?: string;
  costGroup?: string;
  costGroupKind?: "fijo" | "variable";
};

export const TIPOS_CAJA_BASE = ["General", "Viáticos"];

export const normalizarPersona = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const mismaPersona = (a: string, b: string) => !!normalizarPersona(a) && normalizarPersona(a) === normalizarPersona(b);

export type Administracion = "blanco" | "negro" | "mixta" | "sin clasificar";

export type ResumenCaja = {
  asignado: number;
  asignadoBlanco: number;
  asignadoNegro: number;
  sinClasificar: number;
  utilizado: number;
  utilizadoBlanco: number;
  utilizadoNegro: number;
  resta: number;
  administracion: Administracion;
  gastos: number;
};

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

export function resumenCaja(fondo: FondoLike, gastos: GastoLike[]): ResumenCaja {
  const propios = gastos.filter((g) => g.fundId === fondo.id);
  const asignado = n(fondo.assignedAmount);
  const asignadoBlanco = n(fondo.assignedWhite);
  const asignadoNegro = n(fondo.assignedBlack);
  const sinClasificar = Math.max(0, asignado - asignadoBlanco - asignadoNegro);
  const utilizadoBlanco = propios.filter((g) => g.administration === "blanco").reduce((a, g) => a + n(g.amount), 0);
  const utilizadoNegro = propios.filter((g) => g.administration !== "blanco").reduce((a, g) => a + n(g.amount), 0);
  const utilizado = utilizadoBlanco + utilizadoNegro;
  const administracion: Administracion =
    asignadoBlanco > 0 && asignadoNegro > 0 ? "mixta" : asignadoBlanco > 0 ? "blanco" : asignadoNegro > 0 ? "negro" : "sin clasificar";
  return {
    asignado,
    asignadoBlanco,
    asignadoNegro,
    sinClasificar,
    utilizado,
    utilizadoBlanco,
    utilizadoNegro,
    resta: asignado - utilizado,
    administracion,
    gastos: propios.length,
  };
}

// Los responsables, sin repetir (el mismo nombre escrito distinto cuenta una vez), con su total.
export function responsablesDe(fondos: FondoLike[], gastos: GastoLike[]) {
  const map = new Map<string, { nombre: string; cajas: number; abiertas: number; asignado: number; utilizado: number; resta: number }>();
  fondos.forEach((f) => {
    const k = normalizarPersona(f.responsible) || "(sin responsable)";
    const r = resumenCaja(f, gastos);
    const prev = map.get(k) || { nombre: f.responsible.trim() || "Sin responsable", cajas: 0, abiertas: 0, asignado: 0, utilizado: 0, resta: 0 };
    prev.cajas += 1;
    if (!f.closed) prev.abiertas += 1;
    prev.asignado += r.asignado;
    prev.utilizado += r.utilizado;
    prev.resta += r.resta;
    map.set(k, prev);
  });
  return Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

// En que se gasto: por grupo de costo ("Fijo · Administrativos"...). Sin grupo = "Sin grupo".
export function gastosPorGrupo(gastos: GastoLike[]) {
  const map = new Map<string, { grupo: string; blanco: number; negro: number; total: number; cantidad: number }>();
  gastos.forEach((g) => {
    const etiqueta = g.costGroup ? `${g.costGroupKind === "fijo" ? "Fijo" : g.costGroupKind === "variable" ? "Variable" : ""}${g.costGroupKind ? " · " : ""}${g.costGroup}` : "Sin grupo";
    const prev = map.get(etiqueta) || { grupo: etiqueta, blanco: 0, negro: 0, total: 0, cantidad: 0 };
    if (g.administration === "blanco") prev.blanco += n(g.amount);
    else prev.negro += n(g.amount);
    prev.total += n(g.amount);
    prev.cantidad += 1;
    map.set(etiqueta, prev);
  });
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

// Por TIPO de caja chica (General, Viaticos, ...): cuantas cajas, cuanto se asigno y cuanto se gasto.
export function porTipoDeCaja(fondos: FondoLike[], gastos: GastoLike[], tipos: string[]) {
  const nombres = Array.from(new Set([...tipos, ...fondos.map((f) => f.tipo || "General")]));
  return nombres.map((tipo) => {
    const delTipo = fondos.filter((f) => (f.tipo || "General") === tipo);
    const rs = delTipo.map((f) => resumenCaja(f, gastos));
    return {
      tipo,
      cajas: delTipo.length,
      abiertas: delTipo.filter((f) => !f.closed).length,
      asignado: rs.reduce((a, r) => a + r.asignado, 0),
      utilizado: rs.reduce((a, r) => a + r.utilizado, 0),
      resta: rs.reduce((a, r) => a + r.resta, 0),
    };
  });
}
