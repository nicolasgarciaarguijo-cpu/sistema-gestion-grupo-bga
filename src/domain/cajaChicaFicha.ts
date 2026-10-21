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
  empresaImputada?: string;
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
  // DESBALANCE B/N (Nicolas, 2026-10-15). La caja es UNA bolsa de plata: lo que importa es el BRUTO
  // (asignado - utilizado). Pero con plata NEGRA se puede comprar CON FACTURA (y al reves), y eso
  // desbalancea las administraciones:
  //   negroFacturado   = lo gastado con factura (blanco) por encima de lo que entro en blanco: compras
  //                      facturadas pagadas con plata negra.
  //   blancoSinFactura = lo gastado sin factura (negro) por encima de lo que entro en negro: plata blanca
  //                      que se fue sin comprobante.
  // Solo se sabe si la caja tiene cargado de donde salio la plata (blanco/negro); si no, desbalanceConocido = false.
  negroFacturado: number;
  blancoSinFactura: number;
  desbalanceConocido: boolean;
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
    negroFacturado: Math.max(0, utilizadoBlanco - asignadoBlanco),
    blancoSinFactura: Math.max(0, utilizadoNegro - asignadoNegro),
    desbalanceConocido: asignado > 0 && sinClasificar < 0.5,
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

// CONTADOR B/N DE CAJA CHICA (Nicolas, 2026-10-15): "un contador mostrando la situacion de blanco y negro
// para entender si futuras compras hay que hacerlas con factura o sin factura para nivelar".
// Se acumula por EMPRESA de la que sale la plata, sobre TODAS sus cajas (abiertas y cerradas: el
// desbalance de una caja cerrada sigue ahi hasta que se compense). Solo cuentan las cajas con el origen
// B/N cargado; las otras se informan aparte (sinOrigen).
//   neto > 0: se pago con plata NEGRA mas de lo que se gasto sin factura con plata blanca -> para
//             nivelar, las proximas compras por `neto` van SIN factura (con plata blanca).
//   neto < 0: al reves -> las proximas compras por |neto| van CON factura (con plata negra).
export type PosicionCajaChica = {
  company: string;
  entroBlanco: number;
  entroNegro: number;
  gastoBlanco: number; // con factura
  gastoNegro: number; // sin factura
  negroFacturado: number;
  blancoSinFactura: number;
  neto: number;
  recomendacion: "sin_factura" | "con_factura" | "nivelado";
  cajasSinOrigen: number;
  montoSinOrigen: number;
};

export function posicionCajaChica(fondos: FondoLike[], gastos: GastoLike[]): PosicionCajaChica[] {
  const map = new Map<string, PosicionCajaChica>();
  fondos.forEach((f) => {
    const p =
      map.get(f.company) ||
      ({ company: f.company, entroBlanco: 0, entroNegro: 0, gastoBlanco: 0, gastoNegro: 0, negroFacturado: 0, blancoSinFactura: 0, neto: 0, recomendacion: "nivelado", cajasSinOrigen: 0, montoSinOrigen: 0 } as PosicionCajaChica);
    const r = resumenCaja(f, gastos);
    if (!r.desbalanceConocido) {
      if (r.asignado > 0 || r.utilizado > 0) {
        p.cajasSinOrigen += 1;
        p.montoSinOrigen += r.asignado;
      }
    } else {
      p.entroBlanco += r.asignadoBlanco;
      p.entroNegro += r.asignadoNegro;
      p.gastoBlanco += r.utilizadoBlanco;
      p.gastoNegro += r.utilizadoNegro;
      p.negroFacturado += r.negroFacturado;
      p.blancoSinFactura += r.blancoSinFactura;
    }
    map.set(f.company, p);
  });
  return Array.from(map.values())
    .map((p) => {
      const neto = Math.round((p.negroFacturado - p.blancoSinFactura) * 100) / 100;
      return { ...p, neto, recomendacion: (neto > 0.5 ? "sin_factura" : neto < -0.5 ? "con_factura" : "nivelado") as PosicionCajaChica["recomendacion"] };
    })
    .sort((a, b) => a.company.localeCompare(b.company));
}

// FACTURAS PAGADAS CON LA CAJA CHICA (Nicolas, 2026-10-21). Un pago de Compras cuya cuenta es la caja de una
// persona ("persona|<empresa>|<nombre>|<color>") es un gasto de su caja chica: la abierta en esa empresa a la
// fecha del pago (o, si no hay, la ultima). Sin ninguna caja de esa persona, no hay donde colgarlo: el App la
// crea en $0 y el gasto queda como deuda con la persona (caja excedida).
export type PagoConCajaLike = {
  id: number;
  company: string;
  date: string;
  amount: number;
  administration?: string;
  cuentaId?: string;
  employeeId?: number;
  supplier?: string;
  description?: string;
  group?: string;
};

/** La persona de una caja ("persona|empresa|nombre|color" -> nombre normalizado). */
export const personaDeCuenta = (cuentaId?: string): { company: string; persona: string } | null => {
  if (!cuentaId || !cuentaId.startsWith("persona|")) return null;
  const [, company, persona] = cuentaId.split("|");
  return persona ? { company, persona } : null;
};

export function fondoDelPago(pago: PagoConCajaLike, fondos: FondoLike[]): FondoLike | undefined {
  const p = personaDeCuenta(pago.cuentaId);
  if (!p || pago.employeeId != null) return undefined;
  const deLaPersona = fondos
    .filter((f) => String(f.company) === String(pago.company) && normalizarPersona(f.responsible) === normalizarPersona(p.persona))
    .sort((a, b) => (b.deliveredDate || "").localeCompare(a.deliveredDate || ""));
  return (
    deLaPersona.find((f) => (f.deliveredDate || "") <= pago.date && (!f.closed || !f.closedDate || f.closedDate >= pago.date)) || deLaPersona[0]
  );
}

/** Los pagos de Compras hechos con la caja de una persona, como gastos de su caja chica. */
export function pagosComoGastosDeCaja(pagos: PagoConCajaLike[], fondos: FondoLike[]): Array<GastoLike & { company: string }> {
  const out: Array<GastoLike & { company: string }> = [];
  pagos.forEach((ce) => {
    const fondo = fondoDelPago(ce, fondos);
    if (!fondo) return;
    out.push({
      id: ce.id,
      fundId: fondo.id,
      company: String(ce.company),
      date: ce.date,
      amount: Number(ce.amount || 0),
      administration: ce.administration === "negro" ? "negro" : "blanco",
      supplier: ce.supplier,
      description: `${ce.description || "Pago"} · cargada en Compras`,
      costGroup: ce.group || undefined,
    });
  });
  return out;
}
