// FICHA DE TARJETA (Nicolas, 2026-10-31). Una ficha por tarjeta (la CUENTA que emite el resumen, por banco y
// por empresa) y adentro una ficha por resumen. Reglas:
//   - El renglon del resumen es CONTROL, no gasto. Se linkea con el pago que se cargo con esa tarjeta (en la
//     factura, el pago a cuenta o la cuota de una deuda) y con que cuota. Lo que no es una compra (sellos,
//     intereses, comisiones, IVA) va a la deuda "Comisiones, tasas e intereses (tarjeta)" con el banco, que
//     se asienta pagada con la misma tarjeta.
//   - Todos los pagos con esa tarjeta se pagan el dia del VENCIMIENTO del resumen donde aparecen: recien ahi
//     descuentan de la cuenta del banco (domain/controlTarjetas.cuotasEsperadas).
//   - El linkeo es obligatorio desde el ejercicio nuevo (1/11/2026). Lo anterior se puede linkear, no se exige.
//   - El resumen es por banco: adentro vienen varias tarjetas fisicas, cada una con su responsable. Si el
//     banco cambia el plastico, todo sigue sobre el responsable y quedan los dos numeros.
// Funciones puras.
import { categoriaDeLineaTarjeta } from "./costoBancosTarjetas";

export const LINKEO_OBLIGATORIO_DESDE = "2026-11-01";
export const TITULO_COMISIONES_TARJETA = "Comisiones, tasas e intereses (tarjeta)";
export const TITULO_COMISIONES_CUENTA = "Comisiones, tasas e intereses (cuenta)";
export const claveComisionesTarjeta = (statementId: number) => `comisiones-tarjeta:${statementId}`;

const TOL = 1;
const r2 = (n: number) => Math.round(n * 100) / 100;
const diasEntre = (a: string, b: string) => {
  const ta = Date.parse(`${(a || "").slice(0, 10)}T12:00:00Z`);
  const tb = Date.parse(`${(b || "").slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(ta) || !Number.isFinite(tb)) return Infinity;
  return Math.abs(Math.round((ta - tb) / 86400000));
};
const digitos = (s: string) => String(s || "").replace(/\D/g, "");
const palabras = (s: string) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z ]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2);

export type TarjetaF = {
  id: number;
  company: string;
  name: string;
  bank: string;
  lastDigits: string;
  active?: boolean;
  cuentaTarjetaId?: number | null;
  numeroCuenta?: string;
  responsable?: string;
  numerosAnteriores?: string;
};
export type ResumenF = { id: number; company: string; cardId: number; closingDate: string; dueDate: string; totalArs: number; totalUsd?: number; saldoAnteriorArs?: number };
export type RenglonF = {
  id: number;
  company: string;
  cardId: number;
  statementId?: number;
  date: string;
  description: string;
  amount: number;
  currency: "ARS" | "USD";
  installments?: string;
  cardDigits?: string;
  holder?: string;
  pagoId?: number | null;
  cuotaNro?: number;
  aComisiones?: boolean;
};
// Un pago cargado con tarjeta de credito (CostEntry con medio tarjeta y su tarjeta).
export type PagoF = {
  id: number;
  company: string;
  tarjetaId: number;
  date: string;
  amount: number;
  cuotas?: number;
  supplier: string;
  description: string;
  impuestosClave?: string;
};

// ---------------------------------------------------------------------------------------------------------
// Tarjeta -> cuenta. Un plastico apunta a su cuenta; sin cuentaTarjetaId, la cuenta es la que tiene los
// resumenes. Si un plastico no tiene resumenes y hay UNA cuenta de la misma empresa y el mismo banco que si
// tiene, se toma esa (asi andan las tarjetas fisicas dadas de alta antes de esta ficha).
export function cuentaDeTarjeta(cardId: number, tarjetas: TarjetaF[], resumenes: ResumenF[]): number {
  const t = tarjetas.find((x) => x.id === cardId);
  if (!t) return cardId;
  if (t.cuentaTarjetaId != null && tarjetas.some((x) => x.id === t.cuentaTarjetaId)) return Number(t.cuentaTarjetaId);
  if (resumenes.some((s) => s.cardId === t.id)) return t.id;
  const banco = palabras(t.bank).join(" ");
  const candidatas = tarjetas.filter(
    (x) => x.id !== t.id && x.company === t.company && x.cuentaTarjetaId == null && resumenes.some((s) => s.cardId === x.id) && banco && palabras(x.bank).join(" ") === banco
  );
  return candidatas.length === 1 ? candidatas[0].id : t.id;
}

// Las cuentas de tarjeta (las que se muestran como ficha): toda tarjeta que no es plastico de otra.
export function cuentasDeTarjeta(tarjetas: TarjetaF[], resumenes: ResumenF[]): TarjetaF[] {
  return tarjetas.filter((t) => cuentaDeTarjeta(t.id, tarjetas, resumenes) === t.id);
}

export const numerosDe = (t: TarjetaF): string[] =>
  [t.lastDigits, ...String(t.numerosAnteriores || "").split(/[,;\s]+/)].map(digitos).filter((d) => d.length >= 4).map((d) => d.slice(-4));

// Mismo responsable: comparten el apellido y otra palabra ("GUSTAVO O GARCIA A" ~ "Gustavo Garcia").
export function mismoResponsable(a: string, b: string): boolean {
  const pa = palabras(a);
  const pb = new Set(palabras(b));
  const comunes = pa.filter((w) => pb.has(w));
  return comunes.length >= 2 || (comunes.length === 1 && Math.min(pa.length, pb.size) === 1);
}

// La tarjeta fisica de un renglon del resumen: por numero (actual o anterior) y, si el numero es nuevo, por el
// responsable (el banco cambio el plastico: es la misma tarjeta de la misma persona).
export type PlasticoEncontrado = { tarjeta: TarjetaF; cambioDeNumero: boolean } | null;
export function plasticoDe(cuentaId: number, digits: string, holder: string, tarjetas: TarjetaF[], resumenes: ResumenF[]): PlasticoEncontrado {
  const d = digitos(digits).slice(-4);
  const deCuenta = tarjetas.filter((t) => t.id === cuentaId || cuentaDeTarjeta(t.id, tarjetas, resumenes) === cuentaId);
  const porNumero = deCuenta.find((t) => d && numerosDe(t).includes(d));
  if (porNumero) return { tarjeta: porNumero, cambioDeNumero: false };
  const porPersona = deCuenta.filter((t) => t.id !== cuentaId && holder && mismoResponsable(t.responsable || t.name, holder));
  if (porPersona.length === 1) return { tarjeta: porPersona[0], cambioDeNumero: true };
  return null;
}

// ---------------------------------------------------------------------------------------------------------
// Cuotas. "06/12" -> { cuota: 6, de: 12 }.
export function cuotaDelTexto(texto?: string): { cuota: number; de: number } | null {
  const m = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(String(texto || ""));
  if (!m) return null;
  const cuota = Number(m[1]);
  const de = Number(m[2]);
  return cuota >= 1 && de >= cuota ? { cuota, de } : null;
}
export const montoCuota = (p: PagoF) => r2(Number(p.amount || 0) / Math.max(1, Math.floor(Number(p.cuotas) || 1)));
export const esPagoDeComisiones = (p: PagoF) => String(p.impuestosClave || "").startsWith("comisiones-tarjeta:");

export type Sugerencia = { pagoId: number; cuota: number; motivo: string };

// Sugerencia para un renglon: un pago con una tarjeta de esta cuenta, cuya cuota sea el monto del renglon y
// cuya fecha de compra este cerca de la del renglon (en las cuotas el resumen repite la fecha de la compra).
// `ocupados` = "pagoId:cuota" ya linkeados en cualquier resumen.
export function sugerirPago(r: RenglonF, cuentaId: number, pagos: PagoF[], tarjetas: TarjetaF[], resumenes: ResumenF[], ocupados: Set<string>): Sugerencia | null {
  if (r.currency !== "ARS" || !(Number(r.amount) > 0)) return null;
  const q = cuotaDelTexto(r.installments);
  const cand = pagos
    .filter((p) => !esPagoDeComisiones(p) && p.company === r.company && cuentaDeTarjeta(p.tarjetaId, tarjetas, resumenes) === cuentaId)
    .map((p) => {
      const n = Math.max(1, Math.floor(Number(p.cuotas) || 1));
      const cuota = q ? q.cuota : 1;
      return { p, n, cuota, dias: diasEntre(p.date, r.date) };
    })
    .filter((x) => x.cuota <= x.n && (!q || q.de === x.n) && !ocupados.has(`${x.p.id}:${x.cuota}`))
    .filter((x) => Math.abs(montoCuota(x.p) - Number(r.amount)) <= TOL && x.dias <= 10)
    .sort((a, b) => a.dias - b.dias);
  if (!cand.length) return null;
  const x = cand[0];
  return { pagoId: x.p.id, cuota: x.cuota, motivo: `mismo monto${x.n > 1 ? ` (cuota ${x.cuota}/${x.n})` : ""} y compra a ${x.dias} día(s)` };
}

export type EstadoRenglon = "linkeado" | "comision" | "sugerido" | "pendiente" | "pago_resumen";
export type RenglonFicha = { renglon: RenglonF; estado: EstadoRenglon; pago?: PagoF; cuota?: number; sugerencia?: Sugerencia };
export type GrupoPlastico = { clave: string; digits: string; holder: string; tarjeta?: TarjetaF; renglones: RenglonFicha[]; total: number };
export type FichaResumen = {
  resumen: ResumenF;
  obligatorio: boolean;
  renglones: RenglonFicha[];
  porPlastico: GrupoPlastico[];
  comisiones: RenglonFicha[];
  comisionesArs: number;
  pendientes: number;
  linkeados: number;
  // Cuotas de pagos con esta tarjeta que deberian estar en este resumen y no tienen renglon.
  cuotasSinRenglon: Array<{ pago: PagoF; cuota: number; de: number; monto: number }>;
  completo: boolean; // todo linkeado o mandado a comisiones (el tilde verde)
};

// Renglones que mueven la deuda del resumen: los "SU PAGO" del resumen anterior no se linkean (ya se ven en el
// banco como el debito que paga la tarjeta).
const esPagoDelResumen = (r: RenglonF) => /\bSU PAGO\b/i.test(r.description || "");
// Cargo del resumen: si el resumen se leyo del PDF, todo lo que no vino debajo de una tarjeta fisica; si se
// cargo a mano (sin tarjetas fisicas), lo que por el texto es un impuesto, comision o interes.
const esCargo = (r: RenglonF, leido: boolean) =>
  !esPagoDelResumen(r) && !r.pagoId && (leido ? !r.cardDigits : categoriaDeLineaTarjeta(r.description) !== "consumos");

export function fichaDelResumen(
  resumen: ResumenF,
  renglones: RenglonF[],
  pagos: PagoF[],
  tarjetas: TarjetaF[],
  resumenes: ResumenF[],
  todosLosRenglones: RenglonF[] = renglones
): FichaResumen {
  const cuentaId = cuentaDeTarjeta(resumen.cardId, tarjetas, resumenes);
  const deEste = renglones.filter((r) => r.statementId === resumen.id);
  const leido = deEste.some((r) => !!r.cardDigits);
  const ocupados = new Set(todosLosRenglones.filter((r) => r.pagoId != null).map((r) => `${r.pagoId}:${r.cuotaNro || 1}`));
  const sugeridos = new Set<string>();
  const filas: RenglonFicha[] = deEste.map((r) => {
    if (esPagoDelResumen(r)) return { renglon: r, estado: "pago_resumen" as const };
    if (r.pagoId != null) {
      const pago = pagos.find((p) => p.id === r.pagoId);
      if (pago) return { renglon: r, estado: "linkeado" as const, pago, cuota: r.cuotaNro || 1 };
    }
    // Sin tarjeta fisica = cargo del resumen; o mandado a mano a comisiones.
    if (r.aComisiones || (esCargo(r, leido) && r.aComisiones !== false)) return { renglon: r, estado: "comision" as const };
    const sug = sugerirPago(r, cuentaId, pagos, tarjetas, resumenes, new Set([...Array.from(ocupados), ...Array.from(sugeridos)]));
    if (sug) {
      sugeridos.add(`${sug.pagoId}:${sug.cuota}`);
      return { renglon: r, estado: "sugerido" as const, sugerencia: sug };
    }
    return { renglon: r, estado: "pendiente" as const };
  });
  const grupos = new Map<string, GrupoPlastico>();
  filas
    .filter((f) => f.renglon.cardDigits)
    .forEach((f) => {
      const digits = String(f.renglon.cardDigits);
      const plastico = plasticoDe(cuentaId, digits, f.renglon.holder || "", tarjetas, resumenes);
      const clave = plastico ? `t${plastico.tarjeta.id}` : `d${digits}`;
      let g = grupos.get(clave);
      if (!g) {
        g = { clave, digits, holder: plastico?.tarjeta.responsable || f.renglon.holder || "", tarjeta: plastico?.tarjeta, renglones: [], total: 0 };
        grupos.set(clave, g);
      }
      if (!g.digits.split(" / ").includes(digits)) g.digits = `${g.digits} / ${digits}`;
      g.renglones.push(f);
      if (f.renglon.currency === "ARS") g.total = r2(g.total + Number(f.renglon.amount || 0));
    });
  const sueltos = filas.filter((f) => !f.renglon.cardDigits && f.estado !== "pago_resumen" && f.estado !== "comision");
  if (sueltos.length) grupos.set("sin", { clave: "sin", digits: "", holder: "Sin tarjeta física", renglones: sueltos, total: r2(sueltos.reduce((a, f) => a + (f.renglon.currency === "ARS" ? Number(f.renglon.amount) : 0), 0)) });
  const comisiones = filas.filter((f) => f.estado === "comision");
  const comisionesArs = r2(comisiones.filter((f) => f.renglon.currency === "ARS").reduce((a, f) => a + Number(f.renglon.amount || 0), 0));
  const pendientes = filas.filter((f) => f.estado === "pendiente" || f.estado === "sugerido").length;
  // Cuotas cargadas que caerian en este resumen (orden de cierres de la cuenta) y nadie linkeo.
  const cierres = resumenes.filter((s) => cuentaDeTarjeta(s.cardId, tarjetas, resumenes) === cuentaId).sort((a, b) => a.closingDate.localeCompare(b.closingDate));
  const idx = cierres.findIndex((s) => s.id === resumen.id);
  const cuotasSinRenglon: FichaResumen["cuotasSinRenglon"] = [];
  pagos
    .filter((p) => !esPagoDeComisiones(p) && p.company === resumen.company && cuentaDeTarjeta(p.tarjetaId, tarjetas, resumenes) === cuentaId)
    .forEach((p) => {
      const n = Math.max(1, Math.floor(Number(p.cuotas) || 1));
      const primero = cierres.findIndex((s) => s.closingDate >= p.date);
      if (primero < 0 || idx < primero) return;
      const cuota = idx - primero + 1;
      if (cuota > n) return;
      const linkeada = todosLosRenglones.some((r) => r.pagoId === p.id && (r.cuotaNro || 1) === cuota);
      const sugerida = filas.some((f) => f.sugerencia?.pagoId === p.id && f.sugerencia.cuota === cuota);
      if (!linkeada && !sugerida) cuotasSinRenglon.push({ pago: p, cuota, de: n, monto: montoCuota(p) });
    });
  return {
    resumen,
    obligatorio: resumen.closingDate >= LINKEO_OBLIGATORIO_DESDE,
    renglones: filas,
    porPlastico: Array.from(grupos.values()),
    comisiones,
    comisionesArs,
    pendientes,
    linkeados: filas.filter((f) => f.estado === "linkeado").length,
    cuotasSinRenglon,
    completo: deEste.length > 0 && pendientes === 0,
  };
}

// Para domain/controlTarjetas.cuotasEsperadas: en que resumen quedo cada cuota linkeada.
export function vinculosDeCuotas(renglones: RenglonF[]): Array<{ pagoId: number; cuota: number; statementId: number }> {
  return renglones
    .filter((r) => r.pagoId != null && r.statementId)
    .map((r) => ({ pagoId: Number(r.pagoId), cuota: r.cuotaNro || 1, statementId: Number(r.statementId) }));
}

// Donde se ve el resumen desde el pago (Pago a proveedores, Compras): los resumenes en que aparece.
export function resumenesDelPago(pagoId: number, renglones: RenglonF[], resumenes: ResumenF[]): ResumenF[] {
  const ids = new Set(renglones.filter((r) => r.pagoId === pagoId && r.statementId).map((r) => Number(r.statementId)));
  return resumenes.filter((s) => ids.has(s.id)).sort((a, b) => a.closingDate.localeCompare(b.closingDate));
}
