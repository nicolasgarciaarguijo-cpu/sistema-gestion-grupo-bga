// CARGA DEL EXTRACTO DESDE LA APP (Nicolas, 25/11/2026):
//   "cuando cargamos los resumenes o extractos bancarios necesito que solo prepare la ficha y ahi me pida linkear lo que
//    no este linkeado. No hace eso, simplemente hace un listado de lo que lee [...] necesito que me cargue la informacion
//    que me cargaste cuando te comparti los extractos. La idea es poder, si quiero, cargarlos a diario para mantener el
//    linkeo a diario y que reconozca los impuestos, comisiones y tasas para que sugiera la carga."
//
// Lo que hacia la carga a mano del 23/11 y el importador de la app no:
//   - ORDEN: el banco exporta del mas nuevo al mas viejo. Se da vuelta y se agrega AL FINAL de lo ya cargado, asi la
//     cadena de saldos de la ficha queda en el orden real (antes se ponia adelante y el dia repetido cortaba la cadena).
//   - REPETIDOS: al cargar a diario los archivos se pisan. Un movimiento es el mismo si coincide tambien el SALDO; sin el
//     saldo, dos impuestos iguales del mismo dia se tomaban por uno solo y se perdia uno.
//   - CARGOS DEL BANCO: los impuestos, comisiones e intereses quedan marcados con su renglon, para que la ficha los sume
//     en el control de comisiones y ofrezca cargarlos.
//   - ENCADENA: avisa si entre lo que ya estaba y lo nuevo falta un tramo (el saldo no continua).
// Puro: el App le pasa los movimientos y los ids.
import { suggestCalendarConcept } from "./calendarBankRules";
import { categoriaDeDebito } from "./impuestosBancarios";

export type LeidoDelExtracto = { date: string; concept: string; amount: number; movementType: "credito" | "debito"; balance: number };
export type ExistenteDelExtracto = LeidoDelExtracto & { company: string; bank?: string; currency?: string };
export type NuevoDelExtracto = LeidoDelExtracto & { conceptKey?: string };

const r2 = (n: number) => Math.round(n * 100) / 100;
const signo = (m: { movementType: string; amount: number }) => (m.movementType === "credito" ? 1 : -1) * Math.abs(Number(m.amount || 0));
// Un movimiento es el mismo si coinciden fecha, tipo, importe y SALDO. El concepto no entra: el mismo movimiento puede venir
// escrito distinto segun como se leyo el archivo (espacios, acentos, con o sin referencia) y se cargaria dos veces. Solo
// cuando el archivo no trae saldo (queda en 0) se compara tambien el concepto, sin espacios de mas ni acentos.
const textoPlano = (t: string) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const clave = (m: LeidoDelExtracto) => {
  const saldo = Math.round(Number(m.balance || 0) * 100);
  return [m.date, m.movementType, Math.round(Number(m.amount || 0) * 100), saldo, saldo === 0 ? textoPlano(m.concept) : ""].join("|");
};

/** El archivo en orden cronologico: si viene del mas nuevo al mas viejo (lo habitual), se da vuelta. */
export function ordenCronologico<T extends { date: string }>(leidos: T[]): T[] {
  if (leidos.length < 2) return leidos.slice();
  const primera = leidos[0].date;
  const ultima = leidos[leidos.length - 1].date;
  if (primera > ultima) return leidos.slice().reverse();
  if (primera < ultima) return leidos.slice();
  // Todo del mismo dia: no se puede saber por la fecha. Se mira si la cadena de saldos cierra al derecho; si no, al reves.
  const cierra = (l: T[]) => l.every((m: any, i) => i === 0 || Math.abs(r2(Number((l[i - 1] as any).balance || 0) + signo(m)) - Number(m.balance || 0)) <= 0.01);
  return cierra(leidos) ? leidos.slice() : leidos.slice().reverse();
}

export type CargaDeExtracto = {
  nuevos: NuevoDelExtracto[]; // en orden cronologico: van AL FINAL de lo ya cargado
  repetidos: number;
  cargos: { cantidad: number; total: number }; // impuestos, comisiones e intereses reconocidos entre los nuevos
  // null = no habia nada de esta cuenta para comparar. false = entre lo cargado y lo nuevo falta un tramo.
  encadena: boolean | null;
  mes: string; // el mes mas nuevo de lo cargado ("2026-11"), para abrir la ficha ahi
};

export function prepararCargaDeExtracto(params: {
  leidos: LeidoDelExtracto[];
  existentes: ExistenteDelExtracto[]; // todos los movimientos ya cargados, en el orden en que estan guardados
  company: string;
  bank: string;
  currency: "ARS" | "USD";
}): CargaDeExtracto {
  const banco = params.bank.trim().toLowerCase();
  const deLaCuenta = params.existentes.filter(
    (e) => String(e.company) === params.company && String(e.bank || "").trim().toLowerCase() === banco && (e.currency === "USD" ? "USD" : "ARS") === params.currency
  );
  const vistos = new Set(deLaCuenta.map(clave));
  const nuevos: NuevoDelExtracto[] = [];
  let repetidos = 0;
  ordenCronologico(params.leidos).forEach((m) => {
    const k = clave(m);
    if (vistos.has(k)) {
      repetidos += 1;
      return;
    }
    vistos.add(k);
    const renglon = suggestCalendarConcept(m.concept || "");
    const esCargo = m.movementType === "debito" && !!categoriaDeDebito(renglon && renglon !== "__interno__" && renglon !== "b_tarjeta_credito" ? renglon : undefined, m.concept);
    nuevos.push({ ...m, ...(esCargo && renglon ? { conceptKey: renglon } : {}) });
  });
  const cargosNuevos = nuevos.filter((m) => m.movementType === "debito" && !!categoriaDeDebito(m.conceptKey, m.concept));
  // El ultimo ya cargado de la cuenta: el de fecha mas nueva y, en esa fecha, el ultimo guardado.
  let ultimo: ExistenteDelExtracto | undefined;
  deLaCuenta.forEach((e) => {
    if (!ultimo || e.date >= ultimo.date) ultimo = e;
  });
  const primero = nuevos[0];
  const encadena = !ultimo || !primero ? null : primero.date >= ultimo.date && Math.abs(r2(Number(ultimo.balance || 0) + signo(primero)) - Number(primero.balance || 0)) <= 0.01;
  const mes = nuevos.reduce((a, m) => (m.date.slice(0, 7) > a ? m.date.slice(0, 7) : a), "");
  return { nuevos, repetidos, cargos: { cantidad: cargosNuevos.length, total: r2(cargosNuevos.reduce((a, m) => a + Number(m.amount || 0), 0)) }, encadena, mes };
}

// DE QUE CUENTA ES EL ARCHIVO (Nicolas, 25/11/2026): "no quiero otra confirmacion [...] quiero que cuando cargue el extracto
// directamente me envie a la ficha con las cosas faltantes cargadas". Para no preguntar empresa y banco, se reconoce la
// cuenta por lo que ya esta cargado: la que ya tiene movimientos de este archivo (al subir a diario siempre se pisan), o
// la unica cuyo ultimo saldo continua con el primer movimiento del archivo. Si no se puede saber, devuelve null y recien
// ahi se pregunta.
export type CuentaDelExtracto = { company: string; bank: string; currency: "ARS" | "USD" };
export function detectarCuentaDelExtracto(leidos: LeidoDelExtracto[], existentes: ExistenteDelExtracto[]): CuentaDelExtracto | null {
  if (!leidos.length) return null;
  const cuentas = new Map<string, { cuenta: CuentaDelExtracto; movs: ExistenteDelExtracto[] }>();
  existentes.forEach((e) => {
    const cuenta: CuentaDelExtracto = { company: String(e.company), bank: String(e.bank || "").trim(), currency: e.currency === "USD" ? "USD" : "ARS" };
    if (!cuenta.bank) return;
    const k = `${cuenta.company}||${cuenta.bank.toLowerCase()}||${cuenta.currency}`;
    if (!cuentas.has(k)) cuentas.set(k, { cuenta, movs: [] });
    cuentas.get(k)!.movs.push(e);
  });
  const claves = new Set(leidos.map(clave));
  let mejor: { cuenta: CuentaDelExtracto; n: number } | null = null;
  let empate = false;
  cuentas.forEach(({ cuenta, movs }) => {
    const n = movs.filter((e) => claves.has(clave(e))).length;
    if (!n) return;
    if (!mejor || n > mejor.n) {
      mejor = { cuenta, n };
      empate = false;
    } else if (n === mejor.n) empate = true;
  });
  if (mejor && !empate) return (mejor as { cuenta: CuentaDelExtracto }).cuenta;
  // Ningun movimiento repetido: la cuenta cuyo ultimo saldo continua con el primero del archivo (si es una sola).
  const primero = ordenCronologico(leidos)[0];
  const continuan: CuentaDelExtracto[] = [];
  cuentas.forEach(({ cuenta, movs }) => {
    let ultimo: ExistenteDelExtracto | undefined;
    movs.forEach((e) => {
      if (!ultimo || e.date >= ultimo.date) ultimo = e;
    });
    if (ultimo && primero.date >= (ultimo as ExistenteDelExtracto).date && Math.abs(r2(Number((ultimo as ExistenteDelExtracto).balance || 0) + signo(primero)) - Number(primero.balance || 0)) <= 0.01) continuan.push(cuenta);
  });
  return continuan.length === 1 ? continuan[0] : null;
}
