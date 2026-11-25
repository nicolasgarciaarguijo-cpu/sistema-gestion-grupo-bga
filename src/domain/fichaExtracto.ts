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
export type PagoBancoF = { id: number; company: string; date: string; amount: number; supplier: string; description: string; paymentMethod?: string; bankEntryId?: number | null; impuestoBanco?: boolean; cuentaId?: string };
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
  | { tipo: "resumen"; statementId: number; texto: string };
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
function linkDe(m: MovimientoF, pagoLinkeado: PagoBancoF | undefined, resumenes: ResumenTarjetaF[], pases: PaseF[] = []): string | null {
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

export function fichasDeExtracto(movs: MovimientoF[], pagos: PagoBancoF[], resumenes: ResumenTarjetaF[], pases: PaseF[] = []): FichaExtracto[] {
  const pagoPorMov = new Map<number, PagoBancoF>();
  pagos.forEach((p) => {
    if (p.bankEntryId != null) pagoPorMov.set(Number(p.bankEntryId), p);
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
      const link = linkDe(m, pagoPorMov.get(m.id), resumenes, pases);
      if (link) {
        f.movimientos.push({ mov: m, estado: "linkeado", detalle: link, rompe: corta });
        return;
      }
      if (m.movementType === "debito" && categoriaDeDebito(m.conceptKey, m.concept)) {
        const cargado = sugerirImpuestoCargado(m, pagos, new Set([...Array.from(ocupados), ...Array.from(sugeridosPago)]));
        if (cargado?.tipo === "pago") {
          sugeridosPago.add(cargado.pagoId);
          f.movimientos.push({ mov: m, estado: "sugerido", detalle: `Sugerido: ${cargado.texto}`, sugerencia: cargado, rompe: corta });
          return;
        }
        if (m.currency !== "USD") f.comisionesArs = r2(f.comisionesArs + monto);
        f.movimientos.push({ mov: m, estado: "comision", detalle: "Comisiones, tasas e intereses (cuenta)", rompe: corta });
        return;
      }
      const sug = sugerir(m, pagos, new Set([...Array.from(ocupados), ...Array.from(sugeridosPago)]), resumenes, new Set([...Array.from(resumenesOcupados), ...Array.from(sugeridosResumen)]));
      if (sug?.tipo === "pago") sugeridosPago.add(sug.pagoId);
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
