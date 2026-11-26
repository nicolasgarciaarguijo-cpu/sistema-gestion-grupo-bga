// FICHA DEL EXTRACTO (Nicolas, 2026-10-31): "exactamente lo mismo que las tarjetas: poder linkear todo. Cuando
// esta todo linkeado y completo, un tilde verde de 'revisado y linkeado', asi se reconoce si hay algun gasto
// por desconocer. Una ficha por cada resumen o cuenta."
//
// Una ficha por CUENTA y MES (empresa + banco + moneda + yyyy-mm). Cada movimiento tiene que quedar linkeado
// con lo que ya esta en el sistema — el banco constata, no carga (domain/calendarFeeds.ts):
//   - un pago cargado (CostEntry.bankEntryId) o la factura que paga (assignedPurchaseInvoiceId);
//   - el resumen de una tarjeta (assignedCardStatementId): el debito que paga la tarjeta;
//   - un cobro de un trabajo (assignedKind "cobro" + ppto), un movimiento interno, un aporte;
//   - los impuestos, comisiones e intereses van a la deuda "Comisiones, tasas e intereses (cuenta)".
// Lo que no se reconoce se marca DESCONOCIDO (para reclamarlo) y la ficha no queda con el tilde.
// El tilde ademas exige que la cadena de saldos cierre en el mes (domain/verificacionExtracto.ts).
// Obligatorio desde el ejercicio nuevo (1/11/2026). Funciones puras.
import { categoriaDeDebito } from "./impuestosBancarios";
import { signoDelMovimiento } from "./verificacionExtracto";
import { LINKEO_OBLIGATORIO_DESDE } from "./fichaTarjeta";

const TOL = 1;
const r2 = (n: number) => Math.round(n * 100) / 100;
const diasEntre = (a: string, b: string) => {
  const ta = Date.parse(`${(a || "").slice(0, 10)}T12:00:00Z`);
  const tb = Date.parse(`${(b || "").slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity;
  return Math.abs(Math.round((ta - tb) / 86400000));
};

export type MovimientoF = {
  id: number;
  company: string;
  bank: string;
  currency?: "ARS" | "USD";
  date: string;
  concept: string;
  movementType: "credito" | "debito";
  amount: number;
  balance: number;
  conceptKey?: string;
  // Blanco / negro. Vivia solo en el bloque "Movimientos bancarios"; desde el 18/11/2026 se
  // elige en la ficha de la cuenta, porque ese bloque se escondio.
  administration?: "blanco" | "negro";
  assignmentNote?: string;
  attachmentName?: string;
  assignedKind?: string;
  assignedJobBudget?: string;
  assignedParty?: string;
  assignedPurchaseInvoiceId?: number | null;
  assignedCardStatementId?: number | null;
  // La operacion de Movimientos internos con la que se linkeo (25/11/2026).
  assignedTransferId?: number | null;
  desconocido?: { firmante: string; fecha: string; nota: string } | null;
  // Cerrado sin link por el administrador (25/11/2026): con motivo y firma, deja de contar como pendiente.
  cerradoSinLink?: { firmante: string; fecha: string; motivo: string } | null;
};
// impuestoBanco: un impuesto, tasa o interes cargado a mano el dia que se cobro (23/11/2026). cuentaId dice de que banco.
export type PagoBancoF = { id: number; company: string; date: string; amount: number; supplier: string; description: string; paymentMethod?: string; bankEntryId?: number | null; impuestoBanco?: boolean; cuentaId?: string; haberes?: boolean };
// Un COBRO cargado en un trabajo (Nicolas, 25/11/2026: "que el credito de banco se linkee con cada cobro"). El credito del
// extracto se une con el cobro (o los cobros) que lo forman, igual que el debito con sus pagos.
export type CobroF = { id: number; company: string; date: string; amount: number; trabajo: string; cliente: string; metodo?: string; cuentaId?: string; bankEntryId?: number | null; moneda?: "ARS" | "USD" };
// Una operacion de Movimientos internos (un pase entre cuentas o entre empresas).
export type PaseF = { id: number; date: string; amount: number; description: string };
// MOVIMIENTO INTERNO SIN SU OPERACION (Nicolas, 25/11/2026): "en movimientos internos quiero linkear el movimiento exacto
// que se hizo con la operacion" y "cuando alguien sin autorizacion linkea con alguna solapa que no pueda ver, que quede
// el recordatorio para el admin". Quien no ve Movimientos internos lo marca como interno; queda este aviso para que el
// administrador lo una con la operacion exacta.
export const TEXTO_INTERNO_SIN_OPERACION = "Movimiento interno · falta linkear la operación exacta (administrador)";
export type ResumenTarjetaF = { id: number; company: string; cardId: number; closingDate: string; dueDate: string; totalArs: number; nombre: string };

export type EstadoMovimiento = "linkeado" | "comision" | "sugerido" | "pendiente" | "desconocido" | "cerrado";
export type SugerenciaMov =
  | { tipo: "pago"; pagoId: number; texto: string }
  | { tipo: "resumen"; statementId: number; texto: string }
  // Varios pagos del mismo proveedor que, sumados, dan el movimiento (una transferencia que cancela dos facturas).
  | { tipo: "pagos"; pagoIds: number[]; texto: string }
  // Uno o varios cobros cargados en los trabajos que dan el credito del banco.
  | { tipo: "cobros"; cobroIds: number[]; texto: string };
export type MovimientoFicha = { mov: MovimientoF; estado: EstadoMovimiento; detalle: string; sugerencia?: SugerenciaMov; rompe: boolean };

export type FichaExtracto = {
  clave: string; // empresa||banco||moneda||yyyy-mm
  company: string;
  bank: string;
  currency: "ARS" | "USD";
  mes: string;
  obligatorio: boolean;
  movimientos: MovimientoFicha[];
  pendientes: number;
  desconocidos: number;
  // Marcados como movimiento interno pero sin la operacion exacta: recordatorio para el administrador.
  internosSinOperacion: number;
  comisionesArs: number;
  cadenaCierra: boolean;
  completo: boolean; // el tilde verde: todo linkeado, nada desconocido y la cadena cierra
  creditos: number;
  debitos: number;
};

const ETIQUETA_TIPO: Record<string, string> = {
  cobro: "Cobro",
  pago: "Pago",
  interno: "Movimiento interno",
  aporte: "Aporte",
  impuesto: "Impuesto",
  otro: "Otro",
};

// Por que un movimiento ya esta linkeado (o null si no lo esta).
function linkDe(m: MovimientoF, pagosLinkeados: PagoBancoF[] | undefined, resumenes: ResumenTarjetaF[], pases: PaseF[] = [], cobrosLinkeados?: CobroF[]): string | null {
  const pagoLinkeado = pagosLinkeados && pagosLinkeados.length === 1 ? pagosLinkeados[0] : undefined;
  // VARIOS PAGOS QUE SUMAN EL MOVIMIENTO (25/11/2026): una transferencia que cancela dos facturas del mismo proveedor.
  if (pagosLinkeados && pagosLinkeados.length > 1 && m.assignedTransferId == null) {
    const suma = r2(pagosLinkeados.reduce((a, p) => a + Number(p.amount || 0), 0));
    const nombres = Array.from(new Set(pagosLinkeados.map((p) => p.supplier || p.description || "sin proveedor")));
    // Los sueldos salen en una sola transferencia para todos: no se listan veinte nombres.
    const quien = pagosLinkeados.every((p) => p.haberes) ? "haberes" : nombres.length > 3 ? `${nombres.slice(0, 3).join(", ")} y ${nombres.length - 3} más` : nombres.join(", ");
    const dif = Math.abs(suma - Math.abs(Number(m.amount || 0))) > TOL;
    return `${pagosLinkeados.length} pagos cargados · ${quien}${dif ? ` · ⚠ suman ${suma}, no el importe del movimiento` : ""}`;
  }
  if (m.assignedTransferId != null) {
    const t = pases.find((x) => x.id === m.assignedTransferId);
    if (t) return `Movimiento interno · ${t.description || "pase"} · ${t.date.split("-").reverse().join("/")}`;
  }
  if (pagoLinkeado) return `Pago cargado · ${pagoLinkeado.supplier || pagoLinkeado.description || "sin proveedor"}`;
  if (m.assignedPurchaseInvoiceId != null) return `Paga la factura · ${m.assignedParty || ""}`.trim();
  if (m.assignedCardStatementId != null) {
    const s = resumenes.find((x) => x.id === m.assignedCardStatementId);
    return `Paga el resumen · ${s ? `${s.nombre} cierre ${s.closingDate.split("-").reverse().join("/")}` : "tarjeta"}`;
  }
  if (cobrosLinkeados && cobrosLinkeados.length) {
    const suma = r2(cobrosLinkeados.reduce((a, c) => a + Number(c.amount || 0), 0));
    const quien = Array.from(new Set(cobrosLinkeados.map((c) => [c.trabajo, c.cliente].filter(Boolean).join(" · ")))).slice(0, 3).join(", ");
    const dif = Math.abs(suma - Math.abs(Number(m.amount || 0))) > TOL;
    return `${cobrosLinkeados.length === 1 ? "Cobro cargado" : `${cobrosLinkeados.length} cobros cargados`} · ${quien}${dif ? ` · ⚠ suman ${suma}, no el importe del movimiento` : ""}`;
  }
  const k = m.assignedKind || "";
  if (k === "cobro") return m.assignedJobBudget || m.assignedParty ? `Cobro · ${[m.assignedJobBudget, m.assignedParty].filter(Boolean).join(" · ")}` : null;
  // Un pago necesita su pago cargado o su factura: el banco no carga, constata.
  if (k === "pago") return null;
  if (k === "interno") return TEXTO_INTERNO_SIN_OPERACION;
  if (k) return ETIQUETA_TIPO[k] || k;
  return null;
}

// EL PAGO ES DE ESTA CUENTA (Nicolas, 25/11/2026: "esta mezclando Patagonia BGA y Patagonia De Raiz"). Un pago que dice
// de que cuenta del banco salio solo se ofrece para los movimientos de ESA cuenta: misma empresa, mismo banco y misma
// moneda. Asi un pago de De Raiz no aparece en el extracto de BGA (ni uno de Santander en el de Patagonia), y un pago
// cruzado (gasto de una empresa pagado con la cuenta de la otra) aparece en la cuenta de donde salio de verdad.
// Si el pago no dice cuenta de banco, vale la empresa del pago, como antes.
const soloNombreBanco = (t: string) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/banco/g, "").replace(/[^a-z0-9]+/g, "");
export function pagoEsDeLaCuenta(pago: { company: string; cuentaId?: string }, m: { company: string; bank: string; currency?: string }): boolean {
  const partes = String(pago.cuentaId || "").split("|");
  if (partes[0] !== "banco" || partes.length < 4) return pago.company === m.company;
  const [, company, banco, moneda] = partes;
  const a = soloNombreBanco(banco);
  const b = soloNombreBanco(m.bank);
  return company === m.company && !!a && !!b && (a.includes(b) || b.includes(a)) && moneda === (m.currency === "USD" ? "USD" : "ARS");
}

// El cobro (o los cobros del mismo cliente) que dan un credito: de esta cuenta, no en efectivo y a pocos dias.
export function cobrosQueSuman(m: MovimientoF, cobros: CobroF[], ocupados: Set<number>): CobroF[] | undefined {
  const monto = Math.abs(Number(m.amount || 0));
  if (!(monto > 0)) return undefined;
  const moneda = m.currency === "USD" ? "USD" : "ARS";
  const cand = cobros.filter((c) => pagoEsDeLaCuenta(c, m) && (c.moneda || "ARS") === moneda && c.metodo !== "efectivo" && c.bankEntryId == null && !ocupados.has(c.id) && Number(c.amount || 0) > 0 && diasEntre(c.date, m.date) <= 5);
  const exacto = cand.filter((c) => Math.abs(Number(c.amount || 0) - monto) <= TOL).sort((a, b) => diasEntre(a.date, m.date) - diasEntre(b.date, m.date))[0];
  if (exacto) return [exacto];
  const porCliente = new Map<string, CobroF[]>();
  cand.filter((c) => Number(c.amount || 0) < monto && !!(c.cliente || "").trim()).forEach((c) => {
    const k = soloNombreBanco(c.cliente);
    porCliente.set(k, [...(porCliente.get(k) || []), c]);
  });
  for (const lista of Array.from(porCliente.values())) {
    if (lista.length < 2 || lista.length > 12) continue;
    const buscar = (desde: number, elegidos: CobroF[], suma: number): CobroF[] | undefined => {
      if (elegidos.length >= 2 && Math.abs(suma - monto) <= TOL) return elegidos;
      if (elegidos.length >= 4 || suma > monto + TOL) return undefined;
      for (let i = desde; i < lista.length; i++) {
        const r = buscar(i + 1, [...elegidos, lista[i]], suma + Number(lista[i].amount || 0));
        if (r) return r;
      }
      return undefined;
    };
    const hallado = buscar(0, [], 0);
    if (hallado) return hallado;
  }
  return undefined;
}

function sugerir(m: MovimientoF, pagos: PagoBancoF[], ocupados: Set<number>, resumenes: ResumenTarjetaF[], resumenesOcupados: Set<number>): SugerenciaMov | undefined {
  if (m.movementType !== "debito") return undefined;
  const monto = Math.abs(Number(m.amount || 0));
  // El debito que paga la tarjeta: mismo total que un resumen de la empresa y fecha cerca del vencimiento.
  if (/tarjeta|visa|master|amex/i.test(m.concept || "")) {
    const s = resumenes
      .filter((x) => x.company === m.company && !resumenesOcupados.has(x.id) && Math.abs(Number(x.totalArs || 0) - monto) <= TOL && diasEntre(x.dueDate || x.closingDate, m.date) <= 7)
      .sort((a, b) => diasEntre(a.dueDate, m.date) - diasEntre(b.dueDate, m.date))[0];
    if (s) return { tipo: "resumen", statementId: s.id, texto: `${s.nombre} cierre ${s.closingDate.split("-").reverse().join("/")}` };
  }
  const p = pagos
    .filter((x) => pagoEsDeLaCuenta(x, m) && x.paymentMethod !== "efectivo" && !ocupados.has(x.id) && Math.abs(Number(x.amount || 0) - monto) <= TOL)
    .map((x) => ({ x, d: diasEntre(x.date, m.date) }))
    .filter((y) => y.d <= (y.x.paymentMethod === "cheque" ? 120 : 5))
    .sort((a, b) => a.d - b.d)[0];
  if (p) return { tipo: "pago", pagoId: p.x.id, texto: `${p.x.supplier || p.x.description} · ${p.x.date.split("-").reverse().join("/")}` };
  const varios = pagosQueSuman(m, pagos, ocupados);
  if (varios) return { tipo: "pagos", pagoIds: varios.map((x) => x.id), texto: `${varios.length} pagos de ${varios.every((x) => x.haberes) ? "haberes" : varios[0].supplier || "un proveedor"} que suman el importe` };
  return undefined;
}

// Dos, tres o cuatro pagos del MISMO proveedor, de esta cuenta y a pocos dias, que sumados dan el movimiento.
export function pagosQueSuman(m: MovimientoF, pagos: PagoBancoF[], ocupados: Set<number>): PagoBancoF[] | undefined {
  const monto = Math.abs(Number(m.amount || 0));
  if (!(monto > 0)) return undefined;
  const cand = pagos.filter((x) => pagoEsDeLaCuenta(x, m) && x.paymentMethod !== "efectivo" && !ocupados.has(x.id) && !!(x.supplier || "").trim() && Number(x.amount || 0) > 0 && Number(x.amount || 0) < monto && diasEntre(x.date, m.date) <= 5);
  const porProveedor = new Map<string, PagoBancoF[]>();
  cand.forEach((x) => {
    const k = soloNombreBanco(x.supplier);
    porProveedor.set(k, [...(porProveedor.get(k) || []), x]);
  });
  for (const lista of Array.from(porProveedor.values())) {
    if (lista.length < 2 || lista.length > 12) continue;
    const buscar = (desde: number, elegidos: PagoBancoF[], suma: number): PagoBancoF[] | undefined => {
      if (elegidos.length >= 2 && Math.abs(suma - monto) <= TOL) return elegidos;
      if (elegidos.length >= 4 || suma > monto + TOL) return undefined;
      for (let i = desde; i < lista.length; i++) {
        const r = buscar(i + 1, [...elegidos, lista[i]], suma + Number(lista[i].amount || 0));
        if (r) return r;
      }
      return undefined;
    };
    const hallado = buscar(0, [], 0);
    if (hallado) return hallado;
  }
  // SUELDOS (Nicolas, 25/11/2026): "sale una transferencia aglomerando todos los sueldos". Son pagos de personas
  // distintas, asi que no entran en la busqueda por proveedor: se prueba con todos los haberes de un mismo dia, y con
  // todos los de esos dias juntos.
  const haberes = cand.filter((x) => x.haberes);
  const total = (l: PagoBancoF[]) => l.reduce((a, x) => a + Number(x.amount || 0), 0);
  const porDia = new Map<string, PagoBancoF[]>();
  haberes.forEach((x) => porDia.set(x.date, [...(porDia.get(x.date) || []), x]));
  for (const lista of [...Array.from(porDia.values()), haberes]) {
    if (lista.length >= 2 && Math.abs(total(lista) - monto) <= TOL) return lista;
  }
  return undefined;
}

// El cargo del banco que ya se cargo a mano el dia que se cobro: mismo banco, mismo monto y fecha a <= 5 dias. Se
// SUGIERE (no se linkea solo): al aceptarlo, el cargo deja de sumarse a la deuda de comisiones del extracto.
const soloBanco = (t: string) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/banco/g, "").replace(/[^a-z0-9]+/g, "");
export function sugerirImpuestoCargado(m: MovimientoF, pagos: PagoBancoF[], ocupados: Set<number>): SugerenciaMov | undefined {
  if (m.movementType !== "debito") return undefined;
  const monto = Math.abs(Number(m.amount || 0));
  const banco = soloBanco(m.bank);
  const p = pagos
    .filter((x) => x.impuestoBanco && pagoEsDeLaCuenta(x, m) && !ocupados.has(x.id) && Math.abs(Number(x.amount || 0) - monto) <= TOL)
    .filter((x) => !x.cuentaId || !banco || soloBanco(x.cuentaId).includes(banco))
    .map((x) => ({ x, d: diasEntre(x.date, m.date) }))
    .filter((y) => y.d <= 5)
    .sort((a, b) => a.d - b.d)[0];
  return p ? { tipo: "pago", pagoId: p.x.id, texto: `${p.x.description || p.x.supplier} · cargado el ${p.x.date.split("-").reverse().join("/")}` } : undefined;
}

export function fichasDeExtracto(movs: MovimientoF[], pagos: PagoBancoF[], resumenes: ResumenTarjetaF[], pases: PaseF[] = [], cobros: CobroF[] = []): FichaExtracto[] {
  const cobroPorMov = new Map<number, CobroF[]>();
  cobros.forEach((c) => {
    if (c.bankEntryId != null) cobroPorMov.set(Number(c.bankEntryId), [...(cobroPorMov.get(Number(c.bankEntryId)) || []), c]);
  });
  const sugeridosCobro = new Set<number>();
  const pagoPorMov = new Map<number, PagoBancoF[]>();
  pagos.forEach((p) => {
    if (p.bankEntryId != null) pagoPorMov.set(Number(p.bankEntryId), [...(pagoPorMov.get(Number(p.bankEntryId)) || []), p]);
  });
  const ocupados = new Set(pagos.filter((p) => p.bankEntryId != null).map((p) => p.id));
  const resumenesOcupados = new Set(movs.filter((m) => m.assignedCardStatementId != null).map((m) => Number(m.assignedCardStatementId)));

  // Cadena de saldos por cuenta, en el orden del extracto (fecha y orden de carga).
  const porCuenta = new Map<string, MovimientoF[]>();
  movs.forEach((m) => {
    if (!m || !m.date) return;
    const k = `${m.company || ""}||${m.bank || "Banco"}||${m.currency === "USD" ? "USD" : "ARS"}`;
    porCuenta.set(k, [...(porCuenta.get(k) || []), m]);
  });
  const rompe = new Set<number>();
  porCuenta.forEach((list) => {
    const orden = list
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (a.m.date === b.m.date ? a.i - b.i : a.m.date < b.m.date ? -1 : 1))
      .map((x) => x.m);
    orden.forEach((m, i) => {
      if (i === 0) return;
      const esperado = Number(orden[i - 1].balance || 0) + signoDelMovimiento(m);
      if (Math.abs(Number(m.balance || 0) - esperado) > 0.01) rompe.add(m.id);
    });
  });

  const fichas = new Map<string, FichaExtracto>();
  const sugeridosPago = new Set<number>();
  // LOS CARGOS DEL BANCO YA CARGADOS (Nicolas, 25/11/2026: "no esta reconociendo impuestos que ya existen y solicita cargar y
  // linkearlos sin dejarme simplemente linkearlos"). Dos fallas:
  //   1. Un impuesto cargado como factura del banco en Compras no lleva la marca de impuesto, y no se lo buscaba.
  //   2. Cada cargo tomaba el primer pago del mismo importe: una comision del 30/10 se quedaba con el pago del 03/11 y al
  //      cargo del 03/11, que era el suyo, le decia "falta cargar".
  // Ahora se arma el reparto ANTES: cada cargo sin linkear con cada pago de su cuenta, del mismo importe y a 5 dias o menos;
  // se asignan del mas cercano en fecha al mas lejano (primero los marcados como impuesto), un pago por cargo.
  const reservas = new Map<number, PagoBancoF>();
  {
    const pares: Array<{ m: MovimientoF; p: PagoBancoF; d: number; orden: number }> = [];
    movs.forEach((m) => {
      if (!m || !m.date || m.movementType !== "debito" || m.desconocido || m.cerradoSinLink || pagoPorMov.has(m.id)) return;
      if (m.assignedCardStatementId != null || m.assignedTransferId != null || m.assignedPurchaseInvoiceId != null) return;
      if (!categoriaDeDebito(m.conceptKey, m.concept)) return;
      const monto = Math.abs(Number(m.amount || 0));
      pagos.forEach((p) => {
        if (ocupados.has(p.id) || p.paymentMethod === "efectivo" || !pagoEsDeLaCuenta(p, m) || Math.abs(Number(p.amount || 0) - monto) > TOL) return;
        const d = diasEntre(p.date, m.date);
        if (d <= 5) pares.push({ m, p, d, orden: p.impuestoBanco ? 0 : 1 });
      });
    });
    const usados = new Set<number>();
    pares
      .sort((x, y) => x.d - y.d || x.orden - y.orden)
      .forEach(({ m, p }) => {
        if (reservas.has(m.id) || usados.has(p.id)) return;
        reservas.set(m.id, p);
        usados.add(p.id);
        sugeridosPago.add(p.id);
      });
  }
  const sugeridosResumen = new Set<number>();
  porCuenta.forEach((list, k) => {
    const orden = list
      .map((m, i) => ({ m, i }))
      .sort((a, b) => (a.m.date === b.m.date ? a.i - b.i : a.m.date < b.m.date ? -1 : 1))
      .map((x) => x.m);
    orden.forEach((m) => {
      const [company, bank, currency] = k.split("||");
      const mes = m.date.slice(0, 7);
      const clave = `${k}||${mes}`;
      let f = fichas.get(clave);
      if (!f) {
        f = { clave, company, bank, currency: currency as "ARS" | "USD", mes, obligatorio: `${mes}-01` >= LINKEO_OBLIGATORIO_DESDE, movimientos: [], pendientes: 0, desconocidos: 0, internosSinOperacion: 0, comisionesArs: 0, cadenaCierra: true, completo: false, creditos: 0, debitos: 0 };
        fichas.set(clave, f);
      }
      const monto = Math.abs(Number(m.amount || 0));
      if (m.movementType === "credito") f.creditos = r2(f.creditos + monto);
      else f.debitos = r2(f.debitos + monto);
      const corta = rompe.has(m.id);
      if (m.cerradoSinLink) {
        f.movimientos.push({ mov: m, estado: "cerrado", detalle: `Cerrado sin link · ${m.cerradoSinLink.motivo} (${m.cerradoSinLink.firmante})`, rompe: corta });
        return;
      }
      if (m.desconocido) {
        f.movimientos.push({ mov: m, estado: "desconocido", detalle: `Desconocido${m.desconocido.nota ? ` · ${m.desconocido.nota}` : ""} (${m.desconocido.firmante})`, rompe: corta });
        return;
      }
      const link = linkDe(m, pagoPorMov.get(m.id), resumenes, pases, cobroPorMov.get(m.id));
      if (link) {
        f.movimientos.push({ mov: m, estado: "linkeado", detalle: link, rompe: corta });
        return;
      }
      if (m.movementType === "debito" && categoriaDeDebito(m.conceptKey, m.concept)) {
        // El pago que ya tiene reservado este cargo (ver `reservas` arriba): el mas cercano en fecha, uno por cargo.
        const reservado = reservas.get(m.id);
        if (reservado) {
          const texto = `${reservado.description || reservado.supplier} · cargado el ${reservado.date.split("-").reverse().join("/")}`;
          f.movimientos.push({ mov: m, estado: "sugerido", detalle: `Sugerido: ${texto}`, sugerencia: { tipo: "pago", pagoId: reservado.id, texto }, rompe: corta });
          return;
        }
        if (m.currency !== "USD") f.comisionesArs = r2(f.comisionesArs + monto);
        f.movimientos.push({ mov: m, estado: "comision", detalle: "Comisiones, tasas e intereses (cuenta)", rompe: corta });
        return;
      }
      if (m.movementType === "credito") {
        const hallados = cobrosQueSuman(m, cobros, sugeridosCobro);
        if (hallados) {
          hallados.forEach((c) => sugeridosCobro.add(c.id));
          const texto = hallados.length === 1 ? `cobro de ${[hallados[0].trabajo, hallados[0].cliente].filter(Boolean).join(" · ")} · ${hallados[0].date.split("-").reverse().join("/")}` : `${hallados.length} cobros de ${hallados[0].cliente} que suman el importe`;
          f.movimientos.push({ mov: m, estado: "sugerido", detalle: `Sugerido: ${texto}`, sugerencia: { tipo: "cobros", cobroIds: hallados.map((c) => c.id), texto }, rompe: corta });
          return;
        }
      }
      const sug = sugerir(m, pagos, new Set([...Array.from(ocupados), ...Array.from(sugeridosPago)]), resumenes, new Set([...Array.from(resumenesOcupados), ...Array.from(sugeridosResumen)]));
      if (sug?.tipo === "pago") sugeridosPago.add(sug.pagoId);
      if (sug?.tipo === "pagos") sug.pagoIds.forEach((id) => sugeridosPago.add(id));
      if (sug?.tipo === "resumen") sugeridosResumen.add(sug.statementId);
      f.movimientos.push({ mov: m, estado: sug ? "sugerido" : "pendiente", detalle: sug ? `Sugerido: ${sug.texto}` : "Falta linkear", sugerencia: sug, rompe: corta });
    });
  });
  return Array.from(fichas.values())
    .map((f) => {
      const pendientes = f.movimientos.filter((x) => x.estado === "pendiente" || x.estado === "sugerido").length;
      const desconocidos = f.movimientos.filter((x) => x.estado === "desconocido").length;
      // La primera linea del mes se compara contra el ultimo saldo del mes anterior: si ahi corta, falta algo.
      const cadenaCierra = !f.movimientos.some((x) => x.rompe);
      const internosSinOperacion = f.movimientos.filter((x) => x.estado === "linkeado" && x.detalle === TEXTO_INTERNO_SIN_OPERACION).length;
      return { ...f, pendientes, desconocidos, internosSinOperacion, cadenaCierra, completo: f.movimientos.length > 0 && pendientes === 0 && desconocidos === 0 && cadenaCierra };
    })
    .sort((a, b) => b.mes.localeCompare(a.mes) || a.company.localeCompare(b.company) || a.bank.localeCompare(b.bank));
}

// CONTROL DE COMISIONES DEL MES (Nicolas, 23/11/2026): "al finalizar el resumen sumar todos los valores de comisiones
// y asegurarse que sea el correcto [...] nos muestra un total, no suma 2 veces, y si alguna no se cargo marca que
// falta la carga y brinda el acceso para ir directo a cargarla para poder linkearla y asi la conciliacion cierra".
// El TOTAL es lo que cobro el banco segun el extracto. Cada cargo esta en uno solo de tres estados: cargado y
// linkeado, cargado pero sin linkear (sugerido) o sin cargar. total = linkeadas + sugeridas + faltan, siempre.
export type ControlComisiones = {
  total: number;
  cantidad: number;
  linkeadas: { n: number; monto: number };
  sugeridas: MovimientoFicha[];
  sugeridasMonto: number;
  faltan: MovimientoFicha[];
  faltaMonto: number;
  cierra: boolean; // todas cargadas y linkeadas: lo cargado coincide con lo que cobro el banco
};
export function controlDeComisiones(f: Pick<FichaExtracto, "movimientos">): ControlComisiones {
  const cargos = f.movimientos.filter((x) => x.mov.movementType === "debito" && !x.mov.desconocido && !x.mov.cerradoSinLink && !!categoriaDeDebito(x.mov.conceptKey, x.mov.concept));
  const monto = (l: MovimientoFicha[]) => r2(l.reduce((a, x) => a + Math.abs(Number(x.mov.amount || 0)), 0));
  const linkeadas = cargos.filter((x) => x.estado === "linkeado");
  const sugeridas = cargos.filter((x) => x.estado === "sugerido");
  const faltan = cargos.filter((x) => x.estado !== "linkeado" && x.estado !== "sugerido");
  return {
    total: monto(cargos),
    cantidad: cargos.length,
    linkeadas: { n: linkeadas.length, monto: monto(linkeadas) },
    sugeridas,
    sugeridasMonto: monto(sugeridas),
    faltan,
    faltaMonto: monto(faltan),
    cierra: cargos.length > 0 && sugeridas.length === 0 && faltan.length === 0,
  };
}
