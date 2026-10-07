// CUENTAS Y PLATA DISPONIBLE (pedido de Nicolas, 2026-10-06/07).
//
// "Todo lo que se carga en el sistema debe ir actualizando la plata disponible por empresa y banco":
// cada movimiento de plata sale de una CUENTA o entra a una CUENTA. Las cuentas son, por empresa:
//   - cada cuenta BANCARIA (en $ o en U$S),
//   - el EFECTIVO blanco y el efectivo negro,
//   - las CAJAS POR PERSONA (la plata que tiene en mano alguien de la empresa, ej. su caja chica).
// El saldo de una cuenta = saldo de APERTURA + lo que entro - lo que salio, con los movimientos
// posteriores a su fecha de apertura. El extracto del banco ya NO carga: queda como CONTROL (se
// compara el saldo que calcula el sistema contra el del resumen y se marca la diferencia).
//
// Si un movimiento no eligio cuenta, va a la cuenta POR DEFECTO: efectivo (de su color) si se pago en
// efectivo o es negro; si no, la cuenta bancaria principal de la empresa en esa moneda.
// Funciones puras y testeadas.

export type TipoCuenta = "banco" | "efectivo" | "persona";
export type Moneda = "ARS" | "USD";
export type Color = "blanco" | "negro";

export type Cuenta = {
  id: string; // estable, ver idCuenta*
  company: string;
  tipo: TipoCuenta;
  nombre: string;
  banco?: string; // solo banco
  persona?: string; // solo persona
  moneda: Moneda;
  color: Color; // el banco es blanco; efectivo y cajas por persona, el que corresponda
  saldoApertura: number;
  fechaApertura: string; // cuentan los movimientos POSTERIORES a esta fecha
  principal?: boolean; // cuenta bancaria por defecto de la empresa (en su moneda)
  activa: boolean;
};

const norm = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

export const idCuentaBanco = (company: string, banco: string, moneda: Moneda) => `banco|${company}|${norm(banco)}|${moneda}`;
export const idCuentaEfectivo = (company: string, color: Color, moneda: Moneda) => `efectivo|${company}|${color}|${moneda}`;
export const idCajaPersona = (company: string, persona: string, color: Color) => `persona|${company}|${norm(persona)}|${color}`;

/** Un movimiento de plata del sistema, ya normalizado (lo arma App desde cada solapa). */
export type PlataMovida = {
  refId: string; // "cobro-12", "gasto-40", ...
  origen: string; // de que solapa viene, para mostrarlo
  detalle: string;
  company: string;
  date: string;
  amount: number; // siempre positivo
  sentido: "entra" | "sale" | "pase"; // pase = de una cuenta propia a otra
  moneda: Moneda;
  color: Color;
  metodo?: string; // efectivo | transferencia | cheque | debito | otros
  cuentaId?: string; // elegida a mano (para "entra" es el destino; para "sale" y "pase", el origen)
  cuentaDestinoId?: string; // solo pase
  persona?: string; // la plata entra/sale de la caja de esta persona
  personaDestino?: string; // pase hacia la caja de una persona
  // Tipo de cuenta de cada punta cuando no se eligio una (ej. pase efectivo -> banco). Manda sobre la
  // regla "negro va al efectivo": un pase de efectivo negro al banco tiene destino banco igual.
  desde?: "banco" | "efectivo";
  hacia?: "banco" | "efectivo";
};

export type MovimientoCuenta = {
  cuentaId: string;
  date: string;
  amount: number; // + entra, - sale
  refId: string;
  origen: string;
  detalle: string;
};

/** Cuenta bancaria principal de una empresa en una moneda (la marcada; si no, la primera activa). */
export function cuentaBancariaPrincipal(cuentas: Cuenta[], company: string, moneda: Moneda): Cuenta | undefined {
  const bancos = cuentas.filter((c) => c.tipo === "banco" && c.company === company && c.moneda === moneda && c.activa);
  return bancos.find((c) => c.principal) || bancos.sort((a, b) => a.nombre.localeCompare(b.nombre))[0];
}

/**
 * A que cuenta va una punta del movimiento cuando nadie la eligio. Efectivo o negro -> efectivo de su
 * color; si no, el banco principal de la empresa (y si no tiene banco en esa moneda, efectivo).
 */
export function cuentaPorDefecto(
  cuentas: Cuenta[],
  m: { company: string; moneda: Moneda; color: Color; metodo?: string; persona?: string; tipo?: "banco" | "efectivo" }
): string {
  if (m.persona) return idCajaPersona(m.company, m.persona, m.color);
  if (m.tipo === "efectivo") return idCuentaEfectivo(m.company, m.color, m.moneda);
  if (m.tipo === "banco") {
    const b = cuentaBancariaPrincipal(cuentas, m.company, m.moneda);
    return b ? b.id : idCuentaEfectivo(m.company, m.color, m.moneda);
  }
  const metodo = norm(m.metodo || "");
  if (metodo === "efectivo" || m.color === "negro") return idCuentaEfectivo(m.company, m.color, m.moneda);
  const banco = cuentaBancariaPrincipal(cuentas, m.company, m.moneda);
  return banco ? banco.id : idCuentaEfectivo(m.company, m.color, m.moneda);
}

/** Convierte la plata movida en movimientos por cuenta (un pase genera dos: sale de una, entra a otra). */
export function movimientosPorCuenta(plata: PlataMovida[], cuentas: Cuenta[]): MovimientoCuenta[] {
  const existe = new Set(cuentas.map((c) => c.id));
  const elegida = (id?: string) => (id && existe.has(id) ? id : undefined);
  const out: MovimientoCuenta[] = [];
  plata.forEach((p) => {
    const monto = Math.abs(Number(p.amount || 0));
    if (!(monto > 0) || !p.date) return;
    const base = { date: p.date, refId: p.refId, origen: p.origen, detalle: p.detalle };
    const punta =
      elegida(p.cuentaId) || cuentaPorDefecto(cuentas, { ...p, tipo: p.sentido === "entra" ? p.hacia : p.desde });
    if (p.sentido === "entra") out.push({ ...base, cuentaId: punta, amount: monto });
    else if (p.sentido === "sale") out.push({ ...base, cuentaId: punta, amount: -monto });
    else {
      const destino =
        elegida(p.cuentaDestinoId) ||
        cuentaPorDefecto(cuentas, { ...p, persona: p.personaDestino, tipo: p.hacia });
      if (destino === punta) return;
      out.push({ ...base, cuentaId: punta, amount: -monto });
      out.push({ ...base, cuentaId: destino, amount: monto });
    }
  });
  return out;
}

export type SaldoCuenta = Cuenta & { saldo: number; movimientos: number; ultimoMovimiento: string };

/** Saldo de cada cuenta a una fecha (incluida). Cuentas que aparecen solo por movimientos se crean. */
export function saldosDeCuentas(cuentas: Cuenta[], movimientos: MovimientoCuenta[], hasta?: string): SaldoCuenta[] {
  const porId = new Map<string, SaldoCuenta>(
    cuentas.map((c) => [c.id, { ...c, saldo: Number(c.saldoApertura || 0), movimientos: 0, ultimoMovimiento: "" }])
  );
  movimientos.forEach((m) => {
    if (hasta && m.date > hasta) return;
    let c = porId.get(m.cuentaId);
    if (!c) {
      // Una cuenta que nadie dio de alta pero tiene movimientos (ej. la caja de una persona nueva).
      c = { ...cuentaImplicita(m.cuentaId), saldo: 0, movimientos: 0, ultimoMovimiento: "" };
      porId.set(m.cuentaId, c);
    }
    if (m.date <= c.fechaApertura) return;
    c.saldo += m.amount;
    c.movimientos += 1;
    if (m.date > c.ultimoMovimiento) c.ultimoMovimiento = m.date;
  });
  return Array.from(porId.values()).map((c) => ({ ...c, saldo: Math.round(c.saldo * 100) / 100 }));
}

/** Arma una cuenta a partir de su id (para las que aparecen solo por movimientos). */
export function cuentaImplicita(id: string): Cuenta {
  const [tipo, company, nombre, extra] = id.split("|");
  if (tipo === "efectivo") {
    return { id, company, tipo: "efectivo", nombre: `Efectivo ${nombre}`, moneda: (extra as Moneda) || "ARS", color: nombre as Color, saldoApertura: 0, fechaApertura: "", activa: true };
  }
  if (tipo === "persona") {
    return { id, company, tipo: "persona", nombre: `Caja de ${titulo(nombre)}${extra === "negro" ? " (negro)" : ""}`, persona: titulo(nombre), moneda: "ARS", color: (extra as Color) || "blanco", saldoApertura: 0, fechaApertura: "", activa: true };
  }
  return { id, company, tipo: "banco", nombre: `${titulo(nombre)} ${extra === "USD" ? "U$S" : "$"}`, banco: titulo(nombre), moneda: (extra as Moneda) || "ARS", color: "blanco", saldoApertura: 0, fechaApertura: "", activa: true };
}
const titulo = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Las cuentas de cada empresa: las guardadas (con su apertura y nombre) + las que se deducen solas:
 *   - una cuenta bancaria por cada banco/moneda que aparece en los extractos (apertura = su saldo en el
 *     resumen a la fecha de corte),
 *   - efectivo blanco y negro en pesos y en dolares (apertura = lo que da la reserva a la fecha de corte),
 *   - una caja por cada persona que maneja plata (responsables de caja chica).
 * Lo guardado le gana a lo deducido (es lo que el usuario corrigio).
 */
export function armarCuentas(input: {
  companies: string[];
  guardadas: Cuenta[];
  fechaCorte: string;
  bancosExtracto: Array<{ company: string; bank: string; currency: Moneda; balance: number }>;
  efectivoApertura: Array<{ company: string; color: Color; moneda: Moneda; saldo: number }>;
  personas: Array<{ company: string; persona: string; color: Color }>;
}): Cuenta[] {
  const out = new Map<string, Cuenta>();
  const poner = (c: Cuenta) => {
    if (!out.has(c.id)) out.set(c.id, c);
  };
  input.guardadas.forEach((c) => out.set(c.id, { ...c }));
  input.bancosExtracto.forEach((b) => {
    const id = idCuentaBanco(b.company, b.bank, b.currency);
    poner({ ...cuentaImplicita(id), nombre: `${b.bank} ${b.currency === "USD" ? "U$S" : "$"}`, banco: b.bank, saldoApertura: Number(b.balance || 0), fechaApertura: input.fechaCorte });
  });
  input.companies.forEach((company) =>
    (["ARS", "USD"] as Moneda[]).forEach((moneda) =>
      (["blanco", "negro"] as Color[]).forEach((color) => {
        const ap = input.efectivoApertura.find((e) => e.company === company && e.color === color && e.moneda === moneda);
        const id = idCuentaEfectivo(company, color, moneda);
        poner({
          ...cuentaImplicita(id),
          nombre: `Efectivo ${color}${moneda === "USD" ? " U$S" : ""}`,
          saldoApertura: Number(ap?.saldo || 0),
          fechaApertura: input.fechaCorte,
        });
      })
    )
  );
  input.personas.forEach((p) => {
    if (!p.persona.trim()) return;
    const id = idCajaPersona(p.company, p.persona, p.color);
    poner({ ...cuentaImplicita(id), nombre: `Caja de ${p.persona.trim()}${p.color === "negro" ? " (negro)" : ""}`, persona: p.persona.trim(), fechaApertura: input.fechaCorte });
  });
  return Array.from(out.values());
}

/**
 * CONTROL contra el extracto: para cada cuenta bancaria, el saldo que calcula el sistema vs el ultimo
 * saldo del resumen (a la fecha de ese resumen). Diferencia ≠ 0 (con $1 de tolerancia) = algo que se
 * movio en el banco y no esta cargado en el sistema, o al reves.
 */
export function controlContraExtracto(
  cuentas: Cuenta[],
  movimientos: MovimientoCuenta[],
  extracto: Array<{ company: string; bank: string; currency: Moneda; date: string; balance: number }>
): Array<{ cuentaId: string; nombre: string; company: string; fecha: string; saldoExtracto: number; saldoSistema: number; diferencia: number; cierra: boolean }> {
  return extracto
    .map((e) => {
      const id = idCuentaBanco(e.company, e.bank, e.currency);
      const cuenta = cuentas.find((c) => c.id === id);
      if (!cuenta || e.date <= cuenta.fechaApertura) return null;
      const sistema = saldosDeCuentas([cuenta], movimientos.filter((m) => m.cuentaId === id), e.date)[0]?.saldo || 0;
      const diferencia = Math.round((Number(e.balance || 0) - sistema) * 100) / 100;
      return { cuentaId: id, nombre: cuenta.nombre, company: e.company, fecha: e.date, saldoExtracto: Number(e.balance || 0), saldoSistema: sistema, diferencia, cierra: Math.abs(diferencia) <= 1 };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

/** Saldo de cada cuenta dia por dia (para la planilla). */
export function saldosDiarios(
  cuentas: Cuenta[],
  movimientos: MovimientoCuenta[],
  dias: string[]
): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  if (dias.length === 0) return out;
  const ordenados = movimientos.slice().sort((a, b) => a.date.localeCompare(b.date));
  const saldo = new Map<string, number>(cuentas.map((c) => [c.id, Number(c.saldoApertura || 0)]));
  const apertura = new Map(cuentas.map((c) => [c.id, c.fechaApertura]));
  let i = 0;
  dias.forEach((dia) => {
    while (i < ordenados.length && ordenados[i].date <= dia) {
      const m = ordenados[i++];
      if (m.date <= (apertura.get(m.cuentaId) || "")) continue;
      saldo.set(m.cuentaId, (saldo.get(m.cuentaId) || 0) + m.amount);
    }
    out.set(dia, new Map(saldo));
  });
  return out;
}
